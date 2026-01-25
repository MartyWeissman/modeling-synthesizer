// src/tools/DynamicalSystemsCalculator.jsx

import React, { useState, useEffect, useCallback, useRef } from "react";
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

  // Dynamical system and error handling
  const [dynamicalSystem, setDynamicalSystem] = useState(null);
  const [equationError, setEquationError] = useState("");

  // Canvas refs - two-canvas optimization
  const staticCanvasRef = useRef(null);
  const dynamicCanvasRef = useRef(null);
  const transformRef = useRef(null);

  // Animation state
  const animationStateRef = useRef({
    animationId: null,
    isRunning: false,
    time: 0,
    params: { xMin, xMax, yMin, yMax, particleGridSize },
  });

  // Sync UI state to animation state
  useEffect(() => {
    animationStateRef.current.params = {
      xMin,
      xMax,
      yMin,
      yMax,
      particleGridSize,
      animationSpeed,
    };
  }, [xMin, xMax, yMin, yMax, particleGridSize, animationSpeed]);

  // Update dynamical system when equations change
  useEffect(() => {
    try {
      const system = new DynamicalSystem(xPrimeEquation, yPrimeEquation);
      setDynamicalSystem(system);

      if (system.isValidSystem()) {
        setEquationError("");
      } else {
        setEquationError(system.getError());
      }
    } catch (error) {
      setEquationError(`Unexpected error: ${error.message}`);
      setDynamicalSystem(null);
    }
  }, [xPrimeEquation, yPrimeEquation]);

  // Static drawing function - vector field and grid (drawable area only)
  const drawStaticElements = useCallback(
    (canvas, ctx) => {
      const transform = transformRef.current;
      if (!transform) return;

      const { xMin, xMax, yMin, yMax } = animationStateRef.current.params;
      const { dataToPixel, plotWidth, plotHeight } = transform;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw background grid (only in drawable area)
      if (showGrid) {
        ctx.strokeStyle =
          currentTheme === "dark" ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)";
        ctx.lineWidth = 1;

        // Vertical lines
        const xStep = (xMax - xMin) / 10;
        for (let x = xMin; x <= xMax; x += xStep) {
          const top = dataToPixel(x, yMax);
          const bottom = dataToPixel(x, yMin);
          ctx.beginPath();
          ctx.moveTo(top.x, top.y);
          ctx.lineTo(bottom.x, bottom.y);
          ctx.stroke();
        }

        // Horizontal lines
        const yStep = (yMax - yMin) / 10;
        for (let y = yMin; y <= yMax; y += yStep) {
          const left = dataToPixel(xMin, y);
          const right = dataToPixel(xMax, y);
          ctx.beginPath();
          ctx.moveTo(left.x, left.y);
          ctx.lineTo(right.x, right.y);
          ctx.stroke();
        }
      }

      // Draw vector field arrows (only in drawable area, HollingTanner style)
      if (showVectorField) {
        ctx.strokeStyle =
          currentTheme === "dark"
            ? "rgba(156, 163, 175, 0.7)"
            : "rgba(107, 114, 128, 0.7)";
        ctx.fillStyle =
          currentTheme === "dark"
            ? "rgba(156, 163, 175, 0.7)"
            : "rgba(107, 114, 128, 0.7)";
        ctx.lineWidth = 1;

        // Create grid of sample points for vector field
        const gridSteps = 15;
        const xStep = (xMax - xMin) / gridSteps;
        const yStep = (yMax - yMin) / gridSteps;

        for (let i = 1; i < gridSteps; i++) {
          for (let j = 1; j < gridSteps; j++) {
            const x = xMin + i * xStep;
            const y = yMin + j * yStep;

            // Calculate vector field values from compiled equations
            let vx, vy;
            if (dynamicalSystem && dynamicalSystem.isValidSystem()) {
              const field = dynamicalSystem.evaluateField(x, y);
              vx = field.vx;
              vy = field.vy;
            } else {
              // Fallback to simple circular field if no valid equations
              vx = y; // X' = Y
              vy = -x; // Y' = -X
            }

            // Skip zero vectors
            const magnitude = Math.sqrt(vx * vx + vy * vy);
            if (magnitude === 0) continue;

            const normalizedDx = vx / magnitude;
            const normalizedDy = vy / magnitude;

            const pos = dataToPixel(x, y);

            // Only draw if within drawable area
            if (
              pos.x >= 0 &&
              pos.x <= plotWidth &&
              pos.y >= 0 &&
              pos.y <= plotHeight
            ) {
              const arrowLength = 18;
              const endX = pos.x + normalizedDx * arrowLength;
              const endY = pos.y - normalizedDy * arrowLength; // Flip Y for canvas

              // Draw arrow shaft
              ctx.beginPath();
              ctx.moveTo(pos.x, pos.y);
              ctx.lineTo(endX, endY);
              ctx.stroke();

              // Draw arrowhead (HollingTanner style)
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
      }
    },
    [currentTheme, showVectorField, showGrid, dynamicalSystem],
  );

  // Wind-js inspired particle system
  const MAX_CLICK_PARTICLES = 100;
  const MAX_GRID_PARTICLES = 1000;

  // Red click particles (persistent until reset)
  const clickParticlesRef = useRef([]);

  // Blue grid particles (cycling with age management)
  const gridParticlesRef = useRef([]);
  const gridCycleTimeRef = useRef(0);
  const GRID_CYCLE_DURATION = 30.0; // 30 seconds - much longer for persistent trails

  // UNIFIED function to initialize/refresh grid particles (exactly 40% beyond viewport)
  const initializeGridParticles = useCallback(() => {
    const { xMin, xMax, yMin, yMax } = animationStateRef.current.params;
    const gridSize = Math.round(particleGridSize);

    // Extend the grid exactly 40% beyond viewport boundaries to avoid sharp edges
    const xRange = xMax - xMin;
    const yRange = yMax - yMin;
    const extension = 0.4; // 40% extension as requested

    const extendedXMin = xMin - xRange * extension;
    const extendedXMax = xMax + xRange * extension;
    const extendedYMin = yMin - yRange * extension;
    const extendedYMax = yMax + yRange * extension;

    const particles = [];

    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        const x =
          extendedXMin + ((i + 0.5) * (extendedXMax - extendedXMin)) / gridSize;
        const y =
          extendedYMin + ((j + 0.5) * (extendedYMax - extendedYMin)) / gridSize;

        particles.push({
          x,
          y,
          xt: x,
          yt: y,
          age: 0,
          id: Date.now() + Math.random() + i * 1000 + j,
        });
      }
    }

    // Always use the same function for both initial and refresh
    gridParticlesRef.current = particles;
    gridCycleTimeRef.current = 0;
  }, [particleGridSize]);

  // Wind-js inspired particle rendering with beautiful trails
  const drawDynamicElements = useCallback(
    (canvas, ctx) => {
      const transform = transformRef.current;
      if (!transform) return;

      const { width, height } = canvas;
      const { xMin, xMax, yMin, yMax } = animationStateRef.current.params;
      const { dataToPixel } = transform;

      // Exact wind-js trail fading technique
      const prevComposite = ctx.globalCompositeOperation;
      ctx.fillStyle =
        currentTheme === "dark"
          ? "rgba(0, 0, 0, 0.85)" // Even slower fade for maximum persistence in dark mode
          : "rgba(255, 255, 255, 0.91)"; // Stronger persistence for light mode too
      ctx.globalCompositeOperation = "destination-in";
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = prevComposite;

      // Continuous intensity rendering - Red click particles
      const clickParticles = clickParticlesRef.current;
      clickParticles.forEach((particle) => {
        if (
          particle.xt !== undefined &&
          particle.yt !== undefined &&
          particle.x >= xMin &&
          particle.x <= xMax &&
          particle.y >= yMin &&
          particle.y <= yMax
        ) {
          // Calculate speed for continuous intensity
          const dx = particle.xt - particle.x;
          const dy = particle.yt - particle.y;
          const speed = Math.sqrt(dx * dx + dy * dy);

          // Continuous intensity mapping (0 to 1)
          const intensity = Math.min(speed * 50, 1.0); // Scale speed to 0-1 range

          // Continuous opacity (80% to 100%)
          const opacity = 0.8 + intensity * 0.2;

          // Continuous color interpolation for red particles
          const baseRed =
            currentTheme === "dark" ? [200, 80, 80] : [180, 30, 30];
          const brightRed =
            currentTheme === "dark" ? [255, 140, 140] : [240, 50, 50];

          const r = Math.round(
            baseRed[0] + intensity * (brightRed[0] - baseRed[0]),
          );
          const g = Math.round(
            baseRed[1] + intensity * (brightRed[1] - baseRed[1]),
          );
          const b = Math.round(
            baseRed[2] + intensity * (brightRed[2] - baseRed[2]),
          );

          // Continuous line width (1.0 to 1.5)
          const lineWidth = 1.0 + intensity * 0.5;

          const startPos = dataToPixel(particle.x, particle.y);
          const endPos = dataToPixel(particle.xt, particle.yt);

          ctx.beginPath();
          ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
          ctx.lineWidth = lineWidth;
          ctx.moveTo(startPos.x, startPos.y);
          ctx.lineTo(endPos.x, endPos.y);
          ctx.stroke();
        }
      });

      // Draw larger, prominent red dots at current particle positions (3x3 pixels)
      clickParticles.forEach((particle) => {
        if (
          particle.x >= xMin &&
          particle.x <= xMax &&
          particle.y >= yMin &&
          particle.y <= yMax
        ) {
          const pos = dataToPixel(particle.x, particle.y);

          ctx.beginPath();
          ctx.fillStyle =
            currentTheme === "dark"
              ? "rgba(255, 100, 100, 0.9)"
              : "rgba(200, 20, 20, 0.9)";
          ctx.arc(pos.x, pos.y, 1.5, 0, 2 * Math.PI); // 3x3 pixel circle (radius 1.5)
          ctx.fill();
        }
      });

      // Continuous intensity rendering - Blue grid particles
      const gridParticles = gridParticlesRef.current;
      gridParticles.forEach((particle) => {
        if (
          particle.xt !== undefined &&
          particle.yt !== undefined &&
          particle.x >= xMin &&
          particle.x <= xMax &&
          particle.y >= yMin &&
          particle.y <= yMax
        ) {
          // Calculate speed for continuous intensity
          const dx = particle.xt - particle.x;
          const dy = particle.yt - particle.y;
          const speed = Math.sqrt(dx * dx + dy * dy);

          // Continuous intensity mapping (0 to 1)
          const intensity = Math.min(speed * 50, 1.0);

          // Continuous opacity (80% to 100%)
          const opacity = 0.8 + intensity * 0.2;

          // Continuous color interpolation for blue particles
          const baseBlue =
            currentTheme === "dark" ? [80, 140, 200] : [40, 100, 180];
          const brightBlue =
            currentTheme === "dark" ? [160, 230, 255] : [80, 160, 240];

          const r = Math.round(
            baseBlue[0] + intensity * (brightBlue[0] - baseBlue[0]),
          );
          const g = Math.round(
            baseBlue[1] + intensity * (brightBlue[1] - baseBlue[1]),
          );
          const b = Math.round(
            baseBlue[2] + intensity * (brightBlue[2] - baseBlue[2]),
          );

          // Continuous line width (0.8 to 1.2)
          const lineWidth = 0.8 + intensity * 0.4;

          const startPos = dataToPixel(particle.x, particle.y);
          const endPos = dataToPixel(particle.xt, particle.yt);

          ctx.beginPath();
          ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
          ctx.lineWidth = lineWidth;
          ctx.moveTo(startPos.x, startPos.y);
          ctx.lineTo(endPos.x, endPos.y);
          ctx.stroke();
        }
      });
    },
    [currentTheme],
  );

  // Wind-js inspired animation loop with unified particle management
  const animationLoop = useCallback(() => {
    const state = animationStateRef.current;
    const clickParticles = clickParticlesRef.current;
    const gridParticles = gridParticlesRef.current;

    // Continue animation if we have red particles OR if blue particles are running
    const shouldContinue = clickParticles.length > 0 || state.isRunning;
    if (!shouldContinue) return;

    // Scale timestep by animation speed (0-100 -> 0-1 multiplier)
    const speedMultiplier =
      animationStateRef.current.params.animationSpeed / 100;
    const dt = 0.016 * speedMultiplier; // Speed-controlled timestep

    // Wind-js technique: Calculate next positions first, then draw trails
    if (dynamicalSystem && dynamicalSystem.isValidSystem()) {
      // ALWAYS update red click particles (independent of Start/Pause)
      clickParticles.forEach((particle) => {
        const newPos = dynamicalSystem.rk4Step(particle.x, particle.y, dt);

        if (isFinite(newPos.x) && isFinite(newPos.y)) {
          // Set next position (wind-js style)
          particle.xt = newPos.x;
          particle.yt = newPos.y;
        } else {
          // Keep current position if calculation fails
          particle.xt = particle.x;
          particle.yt = particle.y;
        }
      });

      // ONLY update blue grid particles when Start is pressed
      if (state.isRunning && gridParticles.length > 0) {
        gridCycleTimeRef.current += dt;

        // Check if we need to restart the grid cycle (UNIFIED REFRESH)
        if (gridCycleTimeRef.current >= GRID_CYCLE_DURATION) {
          initializeGridParticles(); // Use same function for refresh - NO DISRUPTION
        } else {
          // Calculate next positions for existing grid particles (NO individual regeneration)
          gridParticles.forEach((particle) => {
            const newPos = dynamicalSystem.rk4Step(particle.x, particle.y, dt);

            if (isFinite(newPos.x) && isFinite(newPos.y)) {
              particle.xt = newPos.x;
              particle.yt = newPos.y;
            } else {
              particle.xt = particle.x;
              particle.yt = particle.y;
            }
          });
        }
      }
    }

    // Draw dynamic elements with wind-js trails
    const dynamicCanvas = dynamicCanvasRef.current;
    if (dynamicCanvas) {
      const ctx = dynamicCanvas.getContext("2d");
      drawDynamicElements(dynamicCanvas, ctx);
    }

    // Wind-js technique: Move particles to next positions AFTER drawing
    clickParticles.forEach((particle) => {
      if (particle.xt !== undefined && particle.yt !== undefined) {
        particle.x = particle.xt;
        particle.y = particle.yt;
      }
    });

    gridParticles.forEach((particle) => {
      if (particle.xt !== undefined && particle.yt !== undefined) {
        particle.x = particle.xt;
        particle.y = particle.yt;
      }
    });

    state.animationId = requestAnimationFrame(animationLoop);
  }, [drawDynamicElements, dynamicalSystem, initializeGridParticles]);

  // Add red click particle (persistent until reset)
  const addClickParticle = useCallback(
    (x, y) => {
      const clickParticles = clickParticlesRef.current;
      if (clickParticles.length >= MAX_CLICK_PARTICLES) return;

      const newParticle = {
        x,
        y,
        xt: x,
        yt: y,
        age: 0,
        id: Date.now() + Math.random(),
      };

      clickParticles.push(newParticle);

      // Start animation immediately when red particle is added
      const state = animationStateRef.current;
      if (!state.animationId) {
        animationLoop();
      }
    },
    [animationLoop],
  );

  // Start/stop animation (toggle function for GridButton)
  const toggleAnimation = useCallback(
    (newIsRunning) => {
      const state = animationStateRef.current;

      if (newIsRunning) {
        state.isRunning = true;
        setIsRunning(true);
        // Create grid particles when starting (UNIFIED FUNCTION)
        initializeGridParticles();
        animationLoop();
      } else {
        state.isRunning = false;
        if (state.animationId) {
          cancelAnimationFrame(state.animationId);
        }
        setIsRunning(false);
        // Clear grid particles when stopping (keep click particles)
        gridParticlesRef.current = [];
        gridCycleTimeRef.current = 0;
      }
    },
    [animationLoop, initializeGridParticles],
  );

  // Reset simulation - clear both red click particles and blue grid particles
  const resetSimulation = useCallback(() => {
    const state = animationStateRef.current;
    state.time = 0;

    // Stop animation and reset button state
    state.isRunning = false;
    if (state.animationId) {
      cancelAnimationFrame(state.animationId);
      state.animationId = null;
    }
    setIsRunning(false);

    // Clear all particles
    clickParticlesRef.current = [];
    gridParticlesRef.current = [];
    gridCycleTimeRef.current = 0;

    // Redraw static elements
    if (staticCanvasRef.current) {
      const ctx = staticCanvasRef.current.getContext("2d");
      drawStaticElements(staticCanvasRef.current, ctx);
    }

    // Clear dynamic canvas
    if (dynamicCanvasRef.current) {
      const ctx = dynamicCanvasRef.current.getContext("2d");
      ctx.clearRect(
        0,
        0,
        dynamicCanvasRef.current.width,
        dynamicCanvasRef.current.height,
      );
    }
  }, [drawStaticElements]);

  // Handle canvas click to add particle
  const handleCanvasClick = useCallback(
    (event) => {
      const transform = transformRef.current;
      const canvas = dynamicCanvasRef.current;
      if (!canvas || !transform) return;

      const rect = canvas.getBoundingClientRect();
      const { pixelToData, plotWidth, plotHeight } = transform;

      const canvasX = event.clientX - rect.left;
      const canvasY = event.clientY - rect.top;

      // Check if click is within drawable area
      if (
        canvasX >= 0 &&
        canvasX <= plotWidth &&
        canvasY >= 0 &&
        canvasY <= plotHeight
      ) {
        // Convert canvas coordinates to world coordinates
        const worldCoords = pixelToData(canvasX, canvasY);
        addClickParticle(worldCoords.x, worldCoords.y);
      }
    },
    [addClickParticle],
  );

  // Canvas initialization
  useEffect(() => {
    if (transformRef.current) {
      [staticCanvasRef, dynamicCanvasRef].forEach((ref) => {
        if (ref.current) {
          const canvas = ref.current;
          canvas.width = transformRef.current.plotWidth;
          canvas.height = transformRef.current.plotHeight;
        }
      });

      // Draw initial static elements
      if (staticCanvasRef.current) {
        const ctx = staticCanvasRef.current.getContext("2d");
        drawStaticElements(staticCanvasRef.current, ctx);
      }
    }
  }, [drawStaticElements]);

  // Redraw static elements when parameters change
  useEffect(() => {
    if (staticCanvasRef.current) {
      const ctx = staticCanvasRef.current.getContext("2d");
      drawStaticElements(staticCanvasRef.current, ctx);
    }
  }, [
    xMin,
    xMax,
    yMin,
    yMax,
    showVectorField,
    showGrid,
    dynamicalSystem,
    drawStaticElements,
  ]);

  // Cleanup
  useEffect(() => {
    return () => {
      const state = animationStateRef.current;
      if (state.animationId) {
        cancelAnimationFrame(state.animationId);
      }
    };
  }, []);

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
        xLabel="x"
        yLabel="y"
        xTicks={[xMin, 0, xMax]}
        yTicks={[yMin, 0, yMax]}
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
                width={transform.plotWidth}
                height={transform.plotHeight}
              />

              {/* Dynamic foreground - particles, trails */}
              <canvas
                ref={dynamicCanvasRef}
                className="absolute cursor-crosshair"
                style={transform.plotStyle}
                width={transform.plotWidth}
                height={transform.plotHeight}
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
        label={`Particle Grid ${particleGridSize.toFixed(0)}×${particleGridSize.toFixed(0)}`}
        tooltip={`Number of particles: ${(particleGridSize * particleGridSize).toFixed(0)}`}
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
      {!equationError && dynamicalSystem && dynamicalSystem.isValidSystem() && (
        <GridDisplay
          x={6}
          y={5}
          w={4}
          h={1}
          value={`Equations Valid ✓ | ${(particleGridSize * particleGridSize).toFixed(0)} Particles`}
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
