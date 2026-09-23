// src/tools/DynamicalSystemsCalculator.jsx

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  GridSliderHorizontal,
  GridButton,
  GridGraph,
  GridInput,
  GridEquationInput,
  GridDisplay,
} from "../components/grid";
import ToolContainer from "../components/ui/ToolContainer";
import { useTheme } from "../hooks/useTheme";
import { DynamicalSystem } from "../utils/equationParser";
import { localPointer } from "../components/grid/pointer";
import { useAnimationLoop } from "../hooks/useAnimationLoop";
import { setupCanvas, clearCanvas } from "../utils/canvas";

// Simulated time advanced per real second at 100% speed. The tool used to
// step 0.016 time units per animation frame; at 60 Hz that is 0.96 per
// second, so this keeps the same visual speed while making it independent
// of the display's refresh rate.
const SIM_TIME_PER_SECOND = 0.96;
// Largest RK4 step (the old per-frame step); bigger frame times are split.
const MAX_RK4_STEP = 0.016;
// Fraction of the trail kept per 60 Hz frame (wind-js style fading).
const TRAIL_KEEP_DARK = 0.85;
const TRAIL_KEEP_LIGHT = 0.91;
// After everything stops moving, keep drawing this long so trails fade out.
const FADE_OUT_SECONDS = 1.5;
// A red particle moving slower than this (plot pixels per unit of time) has
// settled at an equilibrium and no longer needs animating.
const REST_SPEED_PX = 1e-3;
// Particles farther than this many window-widths away are treated as having
// escaped to infinity (avoids overflow; they are off-screen anyway).
const ESCAPE_WINDOWS = 1e6;

// Blue grid: extend the grid 40% beyond the viewport on every side so that
// particles flow in from outside and there are no sharp edges.
const GRID_EXTENSION = 0.4;
const GRID_CYCLE_DURATION = 30.0; // time units before the blue grid restarts
const MAX_CLICK_PARTICLES = 100;

/** Grid coordinate i (0..n-1) along one axis, in units of the window [0, 1]. */
const gridFraction = (i, n) =>
  -GRID_EXTENSION + ((i + 0.5) * (1 + 2 * GRID_EXTENSION)) / n;

/** Number of blue grid particles that start inside the viewport. */
const gridParticlesInView = (n) => {
  let perAxis = 0;
  for (let i = 0; i < n; i++) {
    const f = gridFraction(i, n);
    if (f >= 0 && f <= 1) perAxis++;
  }
  return perAxis * perAxis;
};

/** Ticks at the window edges and at 0 (if 0 is inside), without duplicates. */
const edgeTicks = (min, max) =>
  min < 0 && max > 0 ? [min, 0, max] : [min, max];

const DynamicalSystemsCalculator = () => {
  const { theme, currentTheme } = useTheme();

  // Viewport parameters
  const [xMin, setXMin] = useState(-5);
  const [xMax, setXMax] = useState(5);
  const [yMin, setYMin] = useState(-5);
  const [yMax, setYMax] = useState(5);

  // Equation strings
  const [xPrimeEquation, setXPrimeEquation] = useState("Y");
  const [yPrimeEquation, setYPrimeEquation] = useState("-X");

  // Simulation parameters
  const [particleGridSize, setParticleGridSize] = useState(75);
  const [animationSpeed, setAnimationSpeed] = useState(100); // 0-100, default full speed
  const [showVectorField, setShowVectorField] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [isRunning, setIsRunning] = useState(false);

  const gridN = Math.round(particleGridSize);

  // Dynamical system (parsed once per edit) and error message
  const dynamicalSystem = useMemo(() => {
    try {
      return new DynamicalSystem(xPrimeEquation, yPrimeEquation);
    } catch {
      return null;
    }
  }, [xPrimeEquation, yPrimeEquation]);
  const systemValid = !!dynamicalSystem && dynamicalSystem.isValidSystem();
  const equationError = !dynamicalSystem
    ? "The equations couldn't be read."
    : systemValid
      ? ""
      : dynamicalSystem.getError();

  // Canvas refs - two-canvas optimization
  const staticCanvasRef = useRef(null);
  const dynamicCanvasRef = useRef(null);
  const transformRef = useRef(null);

  // Animation state (refs, never cause re-renders)
  const runningRef = useRef(false); // blue grid running (Start pressed)
  const clickParticlesRef = useRef([]); // red particles, persistent until Reset
  const gridParticlesRef = useRef([]); // blue particles, restarted every cycle
  const gridCycleTimeRef = useRef(0);
  const idleTimeRef = useRef(0); // time since anything last moved

  // Static drawing - vector field and background grid (plot area only)
  const drawStaticElements = useCallback(() => {
    const transform = transformRef.current;
    const canvas = staticCanvasRef.current;
    if (!transform || !canvas) return;

    const { dataToPixel, plotWidth, plotHeight } = transform;
    const setup = setupCanvas(canvas, { width: plotWidth, height: plotHeight });
    if (!setup) return;
    const { ctx, width, height } = setup;
    ctx.clearRect(0, 0, width, height);

    // Background grid: 10 divisions each way (index-based, no float drift)
    if (showGrid) {
      ctx.strokeStyle =
        currentTheme === "dark" ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)";
      ctx.lineWidth = 1;
      for (let i = 0; i <= 10; i++) {
        const x = xMin + ((xMax - xMin) * i) / 10;
        const top = dataToPixel(x, yMax);
        const bottom = dataToPixel(x, yMin);
        ctx.beginPath();
        ctx.moveTo(top.x, top.y);
        ctx.lineTo(bottom.x, bottom.y);
        ctx.stroke();
      }
      for (let j = 0; j <= 10; j++) {
        const y = yMin + ((yMax - yMin) * j) / 10;
        const left = dataToPixel(xMin, y);
        const right = dataToPixel(xMax, y);
        ctx.beginPath();
        ctx.moveTo(left.x, left.y);
        ctx.lineTo(right.x, right.y);
        ctx.stroke();
      }
    }

    // Vector field arrows. Nothing is drawn for invalid equations.
    if (showVectorField && systemValid) {
      const arrowColor =
        currentTheme === "dark"
          ? "rgba(156, 163, 175, 0.7)"
          : "rgba(107, 114, 128, 0.7)";
      ctx.strokeStyle = arrowColor;
      ctx.fillStyle = arrowColor;
      ctx.lineWidth = 1;

      // Pixels per data unit: arrows point in the direction of motion ON
      // SCREEN, which differs from the data-space direction when the X and Y
      // ranges have different lengths.
      const sx = plotWidth / (xMax - xMin);
      const sy = plotHeight / (yMax - yMin);

      const gridSteps = 15;
      const arrowLength = 18;
      for (let i = 1; i < gridSteps; i++) {
        for (let j = 1; j < gridSteps; j++) {
          const x = xMin + (i * (xMax - xMin)) / gridSteps;
          const y = yMin + (j * (yMax - yMin)) / gridSteps;
          const { vx, vy } = dynamicalSystem.evaluateField(x, y);
          if (!Number.isFinite(vx) || !Number.isFinite(vy)) continue;

          const px = vx * sx; // screen x grows to the right
          const py = -vy * sy; // screen y grows downward
          const magnitude = Math.hypot(px, py);
          if (magnitude === 0) continue;

          const pos = dataToPixel(x, y);
          const endX = pos.x + (px / magnitude) * arrowLength;
          const endY = pos.y + (py / magnitude) * arrowLength;

          ctx.beginPath();
          ctx.moveTo(pos.x, pos.y);
          ctx.lineTo(endX, endY);
          ctx.stroke();

          const angle = Math.atan2(endY - pos.y, endX - pos.x);
          ctx.save();
          ctx.translate(endX, endY);
          ctx.rotate(angle);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(-6, -2);
          ctx.lineTo(-6, 2);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      }
    }
  }, [
    currentTheme,
    showVectorField,
    showGrid,
    dynamicalSystem,
    systemValid,
    xMin,
    xMax,
    yMin,
    yMax,
  ]);

  // Create (or restart) the blue particle grid over the current viewport
  const initializeGridParticles = useCallback(() => {
    const particles = [];
    for (let i = 0; i < gridN; i++) {
      for (let j = 0; j < gridN; j++) {
        const x = xMin + gridFraction(i, gridN) * (xMax - xMin);
        const y = yMin + gridFraction(j, gridN) * (yMax - yMin);
        particles.push({ x, y, xt: x, yt: y, dead: false });
      }
    }
    gridParticlesRef.current = particles;
    gridCycleTimeRef.current = 0;
  }, [gridN, xMin, xMax, yMin, yMax]);

  // Advance one particle by simulated time `simDt` (in RK4 sub-steps).
  // Sets particle.xt/yt; marks it dead if it blows up or escapes far away.
  const advanceParticle = (particle, simDt, steps) => {
    if (particle.dead) {
      particle.xt = particle.x;
      particle.yt = particle.y;
      return;
    }
    const h = simDt / steps;
    const escape = ESCAPE_WINDOWS * Math.max(xMax - xMin, yMax - yMin);
    let x = particle.x;
    let y = particle.y;
    for (let s = 0; s < steps; s++) {
      const next = dynamicalSystem.rk4Step(x, y, h);
      if (
        !Number.isFinite(next.x) ||
        !Number.isFinite(next.y) ||
        Math.abs(next.x) > escape ||
        Math.abs(next.y) > escape
      ) {
        particle.dead = true;
        break;
      }
      x = next.x;
      y = next.y;
    }
    particle.xt = x;
    particle.yt = y;
  };

  // Draw one frame of trails and dots on the dynamic canvas
  const drawDynamicElements = (dtReal) => {
    const transform = transformRef.current;
    const canvas = dynamicCanvasRef.current;
    if (!transform || !canvas) return;
    const { dataToPixel, plotWidth, plotHeight } = transform;
    const setup = setupCanvas(canvas, { width: plotWidth, height: plotHeight });
    if (!setup) return;
    const { ctx, width, height } = setup;
    const dark = currentTheme === "dark";

    // Fade the existing trails (same fade per second at any frame rate)
    const keepPerFrame = dark ? TRAIL_KEEP_DARK : TRAIL_KEEP_LIGHT;
    const keep = Math.pow(keepPerFrame, Math.max(0, dtReal) * 60);
    const prevComposite = ctx.globalCompositeOperation;
    ctx.fillStyle = `rgba(0, 0, 0, ${keep})`;
    ctx.globalCompositeOperation = "destination-in";
    ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = prevComposite;

    // Segments far outside the plot are skipped (the canvas clips the rest,
    // so trajectories that leave and come back are drawn correctly).
    const far = 10 * Math.max(width, height);
    const visible = (a, b) =>
      !(
        (a.x < -far && b.x < -far) ||
        (a.x > width + far && b.x > width + far) ||
        (a.y < -far && b.y < -far) ||
        (a.y > height + far && b.y > height + far)
      );

    const drawTrails = (particles, base, bright, widthMin, widthRange) => {
      particles.forEach((particle) => {
        if (particle.xt === particle.x && particle.yt === particle.y) return;
        const startPos = dataToPixel(particle.x, particle.y);
        const endPos = dataToPixel(particle.xt, particle.yt);
        if (!visible(startPos, endPos)) return;

        const speed = Math.hypot(
          particle.xt - particle.x,
          particle.yt - particle.y,
        );
        const intensity = Math.min(speed * 50, 1.0);
        const opacity = 0.8 + intensity * 0.2;
        const r = Math.round(base[0] + intensity * (bright[0] - base[0]));
        const g = Math.round(base[1] + intensity * (bright[1] - base[1]));
        const b = Math.round(base[2] + intensity * (bright[2] - base[2]));

        ctx.beginPath();
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
        ctx.lineWidth = widthMin + intensity * widthRange;
        ctx.moveTo(startPos.x, startPos.y);
        ctx.lineTo(endPos.x, endPos.y);
        ctx.stroke();
      });
    };

    // Red click particles: trails, then a dot at the current position
    const clickParticles = clickParticlesRef.current;
    drawTrails(
      clickParticles,
      dark ? [200, 80, 80] : [180, 30, 30],
      dark ? [255, 140, 140] : [240, 50, 50],
      1.0,
      0.5,
    );
    ctx.fillStyle = dark ? "rgba(255, 100, 100, 0.9)" : "rgba(200, 20, 20, 0.9)";
    clickParticles.forEach((particle) => {
      if (particle.dead) return;
      const pos = dataToPixel(particle.x, particle.y);
      if (pos.x < -5 || pos.x > width + 5 || pos.y < -5 || pos.y > height + 5)
        return;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 1.5, 0, 2 * Math.PI);
      ctx.fill();
    });

    // Blue grid particles: trails only
    drawTrails(
      gridParticlesRef.current,
      dark ? [80, 140, 200] : [40, 100, 180],
      dark ? [160, 230, 255] : [80, 160, 240],
      0.8,
      0.4,
    );
  };

  // One animation frame. Called with the real elapsed time in seconds; the
  // loop always calls the latest version of this function, so edited
  // equations, viewport or theme take effect immediately.
  const onFrame = (dtReal) => {
    const running = runningRef.current;
    const clickParticles = clickParticlesRef.current;
    const gridParticles = gridParticlesRef.current;

    const simDt = dtReal * SIM_TIME_PER_SECOND * (animationSpeed / 100);
    const steps = Math.max(1, Math.ceil(simDt / MAX_RK4_STEP - 1e-9));
    const canMove = systemValid && simDt > 0;

    // Pixels per data unit, for deciding when a particle has come to rest
    const transform = transformRef.current;
    const sx = transform ? transform.plotWidth / (xMax - xMin) : 1;
    const sy = transform ? transform.plotHeight / (yMax - yMin) : 1;

    let anyMoving = false;

    // Red particles move whether or not Start was pressed
    clickParticles.forEach((particle) => {
      if (!canMove || particle.resting) {
        particle.xt = particle.x;
        particle.yt = particle.y;
        return;
      }
      advanceParticle(particle, simDt, steps);
      if (particle.dead) return;
      const pxSpeed =
        Math.hypot(
          (particle.xt - particle.x) * sx,
          (particle.yt - particle.y) * sy,
        ) / simDt;
      if (pxSpeed < REST_SPEED_PX) particle.resting = true;
      else anyMoving = true;
    });

    // Blue particles move only while running
    if (running && canMove) {
      anyMoving = true;
      gridCycleTimeRef.current += simDt;
      if (gridCycleTimeRef.current >= GRID_CYCLE_DURATION) {
        initializeGridParticles();
      } else {
        gridParticles.forEach((p) => advanceParticle(p, simDt, steps));
      }
    }

    drawDynamicElements(dtReal);

    // Move particles to their new positions AFTER drawing (wind-js style)
    const commit = (p) => {
      p.x = p.xt;
      p.y = p.yt;
    };
    clickParticles.forEach(commit);
    gridParticlesRef.current.forEach(commit);

    // Stop automatically once nothing has moved for a while (trails faded)
    if (anyMoving) {
      idleTimeRef.current = 0;
      return true;
    }
    idleTimeRef.current += dtReal;
    return idleTimeRef.current < FADE_OUT_SECONDS;
  };

  // (start/stop are stable across renders)
  const { start: loopStart, stop: loopStop } = useAnimationLoop(onFrame);

  const startLoop = useCallback(() => {
    idleTimeRef.current = 0;
    loopStart();
  }, [loopStart]);

  // Add a red click particle (persistent until Reset)
  const addClickParticle = useCallback(
    (x, y) => {
      const clickParticles = clickParticlesRef.current;
      if (clickParticles.length >= MAX_CLICK_PARTICLES) return;
      clickParticles.push({ x, y, xt: x, yt: y, dead: false, resting: false });
      startLoop();
    },
    [startLoop],
  );

  // Start / Pause the blue particle grid
  const toggleAnimation = useCallback(
    (newIsRunning) => {
      runningRef.current = newIsRunning;
      setIsRunning(newIsRunning);
      if (newIsRunning) {
        initializeGridParticles(); // a fresh grid over the current window
      } else {
        // Pause: stop and remove the blue particles (their trails fade out).
        // Red trajectories keep moving.
        gridParticlesRef.current = [];
        gridCycleTimeRef.current = 0;
      }
      startLoop(); // also runs the fade-out after Pause
    },
    [initializeGridParticles, startLoop],
  );

  // Reset - remove all particles and clear the trails
  const resetSimulation = useCallback(() => {
    loopStop();
    runningRef.current = false;
    setIsRunning(false);
    clickParticlesRef.current = [];
    gridParticlesRef.current = [];
    gridCycleTimeRef.current = 0;
    idleTimeRef.current = 0;
    clearCanvas(dynamicCanvasRef.current);
    drawStaticElements();
  }, [loopStop, drawStaticElements]);

  // Handle canvas click to add particle
  const handleCanvasClick = useCallback(
    (event) => {
      const transform = transformRef.current;
      const canvas = dynamicCanvasRef.current;
      if (!canvas || !transform) return;

      const { pixelToData, plotWidth, plotHeight } = transform;

      // Pointer position in the canvas's own CSS pixels (stays correct when
      // ToolContainer scales the tool down to fit a narrow window)
      const { x: canvasX, y: canvasY } = localPointer(event, canvas);

      if (
        canvasX >= 0 &&
        canvasX <= plotWidth &&
        canvasY >= 0 &&
        canvasY <= plotHeight
      ) {
        const worldCoords = pixelToData(canvasX, canvasY);
        addClickParticle(worldCoords.x, worldCoords.y);
      }
    },
    [addClickParticle],
  );

  // Redraw the static layer after every render (cheap: 15×15 arrows). This
  // also catches plot-size changes (the plot area depends on tick labels).
  useEffect(() => {
    drawStaticElements();
  });

  // New equations, viewport or speed: particles that had come to rest may
  // move again, so wake them and make sure the loop is running.
  useEffect(() => {
    let wake = runningRef.current;
    clickParticlesRef.current.forEach((p) => {
      if (p.resting) p.resting = false;
      if (!p.dead) wake = true;
    });
    if (wake) startLoop();
  }, [dynamicalSystem, xMin, xMax, yMin, yMax, animationSpeed, startLoop]);

  // A new grid size or viewport while running: restart the blue grid
  useEffect(() => {
    if (runningRef.current) initializeGridParticles();
  }, [initializeGridParticles]);

  const particlesInView = gridParticlesInView(gridN);

  return (
    <ToolContainer
      title="Dynamical Systems Calculator"
      canvasWidth={10}
      canvasHeight={6}
    >
      {/* Main Vector Field Area (6x6) */}
      <GridGraph
        x={0}
        y={0}
        w={6}
        h={6}
        xLabel="X"
        yLabel="Y"
        xTicks={edgeTicks(xMin, xMax)}
        yTicks={edgeTicks(yMin, yMax)}
        xRange={[xMin, xMax]}
        yRange={[yMin, yMax]}
        leftAxisColor={currentTheme === "dark" ? "#ffffff" : "#000000"}
        tooltip="Vector Field and Particle Visualization"
        theme={theme}
      >
        {(transform) => {
          transformRef.current = transform;
          return (
            <>
              {/* Static background - vector field, grid */}
              <canvas
                ref={staticCanvasRef}
                className="absolute pointer-events-none"
                style={transform.plotStyle}
              />

              {/* Dynamic foreground - particles, trails */}
              <canvas
                ref={dynamicCanvasRef}
                className="absolute cursor-crosshair"
                style={transform.plotStyle}
                onClick={handleCanvasClick}
              />
            </>
          );
        }}
      </GridGraph>

      {/* Input Controls */}
      {/* Row 0: xmin, xmax, ymin, ymax */}
      <GridInput
        x={6}
        y={0}
        w={1}
        h={1}
        value={xMin}
        onChange={(value) => {
          const newValue = Math.max(-50, Math.min(50, value));
          if (newValue < xMax) setXMin(newValue);
        }}
        min={-50}
        max={50}
        step={1}
        variable="Xmin"
        title="Minimum x value for viewport (-50 to 50)"
        tooltip="Minimum x value for viewport"
        theme={theme}
      />

      <GridInput
        x={7}
        y={0}
        w={1}
        h={1}
        value={xMax}
        onChange={(value) => {
          const newValue = Math.max(-50, Math.min(50, value));
          if (newValue > xMin) setXMax(newValue);
        }}
        min={-50}
        max={50}
        step={1}
        variable="Xmax"
        title="Maximum x value for viewport (-50 to 50)"
        tooltip="Maximum x value for viewport"
        theme={theme}
      />

      <GridInput
        x={8}
        y={0}
        w={1}
        h={1}
        value={yMin}
        onChange={(value) => {
          const newValue = Math.max(-50, Math.min(50, value));
          if (newValue < yMax) setYMin(newValue);
        }}
        min={-50}
        max={50}
        step={1}
        variable="Ymin"
        title="Minimum y value for viewport (-50 to 50)"
        tooltip="Minimum y value for viewport"
        theme={theme}
      />

      <GridInput
        x={9}
        y={0}
        w={1}
        h={1}
        value={yMax}
        onChange={(value) => {
          const newValue = Math.max(-50, Math.min(50, value));
          if (newValue > yMin) setYMax(newValue);
        }}
        min={-50}
        max={50}
        step={1}
        variable="Ymax"
        title="Maximum y value for viewport (-50 to 50)"
        tooltip="Maximum y value for viewport"
        theme={theme}
      />

      {/* Row 1: X' equation */}
      <GridEquationInput
        x={6}
        y={1}
        w={4}
        h={1}
        value={xPrimeEquation}
        onChange={setXPrimeEquation}
        label="X derivative"
        variable="X'"
        placeholder="e.g., Y, -X, sin(X)"
        tooltip="Enter equation for X' (dx/dt)"
        theme={theme}
        fontSize="sm"
      />

      {/* Row 2: Y' equation */}
      <GridEquationInput
        x={6}
        y={2}
        w={4}
        h={1}
        value={yPrimeEquation}
        onChange={setYPrimeEquation}
        label="Y derivative"
        variable="Y'"
        placeholder="e.g., -X, cos(Y), X*Y"
        tooltip="Enter equation for Y' (dy/dt)"
        theme={theme}
        fontSize="sm"
      />

      {/* Row 3: Control buttons */}
      <GridButton
        x={6}
        y={3}
        type="toggle"
        variant="function"
        active={isRunning}
        onToggle={toggleAnimation}
        tooltip={isRunning ? "Pause simulation" : "Start simulation"}
        theme={theme}
        fontSize="xs"
      >
        {isRunning ? "Pause" : "Start"}
      </GridButton>

      <GridButton
        x={7}
        y={3}
        type="momentary"
        variant="function"
        onPress={resetSimulation}
        tooltip="Reset simulation"
        theme={theme}
        fontSize="xs"
      >
        Reset
      </GridButton>

      <GridButton
        x={8}
        y={3}
        type="toggle"
        variant="function"
        active={showVectorField}
        onToggle={setShowVectorField}
        tooltip="Toggle vector field display"
        theme={theme}
        fontSize="xs"
      >
        <div style={{ textAlign: "center", lineHeight: "1.1" }}>
          <div>{showVectorField ? "Hide" : "Show"}</div>
          <div>Vectors</div>
        </div>
      </GridButton>

      <GridButton
        x={9}
        y={3}
        type="toggle"
        variant="function"
        active={showGrid}
        onToggle={setShowGrid}
        tooltip="Toggle grid display"
        theme={theme}
        fontSize="xs"
      >
        <div style={{ textAlign: "center", lineHeight: "1.1" }}>
          <div>{showGrid ? "Hide" : "Show"}</div>
          <div>Grid</div>
        </div>
      </GridButton>

      {/* Row 4: Particle Grid Size Slider (2x1) */}
      <GridSliderHorizontal
        x={6}
        y={4}
        w={2}
        h={1}
        value={(particleGridSize - 20) * 1.25} // Scale to 0-100 range (20-100 grid size)
        onChange={(value) => setParticleGridSize(20 + value * 0.8)}
        variant="unipolar"
        label={`Particle Grid ${gridN}×${gridN}`}
        tooltip={`${gridN * gridN} blue particles (${particlesInView} start inside the window; the rest start just outside and flow in)`}
        theme={theme}
      />

      {/* Row 4: Animation Speed Slider (2x1) */}
      <GridSliderHorizontal
        x={8}
        y={4}
        w={2}
        h={1}
        value={animationSpeed}
        onChange={setAnimationSpeed}
        variant="unipolar"
        label={
          animationSpeed === 100
            ? "Animation Speed: Full"
            : `Animation Speed: ${animationSpeed.toFixed(0)}%`
        }
        tooltip="Control animation speed (0% = paused, 100% = full speed)"
        theme={theme}
      />

      {/* Row 5: Error Display */}
      {equationError && (
        <GridDisplay
          x={6}
          y={5}
          w={4}
          h={1}
          value={equationError}
          variant="status"
          align="left"
          fontSize="xs"
          tooltip="Equation validation errors"
          theme={theme}
          style={{
            color: currentTheme === "dark" ? "#f87171" : "#dc2626",
            backgroundColor:
              currentTheme === "dark"
                ? "rgba(127, 29, 29, 0.3)"
                : "rgba(254, 226, 226, 0.9)",
          }}
        />
      )}

      {/* Row 5: System Status (when no errors) */}
      {!equationError && systemValid && (
        <GridDisplay
          x={6}
          y={5}
          w={4}
          h={1}
          value={`Equations Valid ✓ | ${gridN * gridN} particles (${particlesInView} in view)`}
          variant="status"
          align="center"
          fontSize="xs"
          tooltip="Dynamical system is ready for simulation"
          theme={theme}
          style={{
            color: currentTheme === "dark" ? "#4ade80" : "#16a34a",
          }}
        />
      )}
    </ToolContainer>
  );
};

export default DynamicalSystemsCalculator;
