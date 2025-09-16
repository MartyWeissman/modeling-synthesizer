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
  const [particleGridSize, setParticleGridSize] = useState(10);
  const [showVectorField, setShowVectorField] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [isRunning, setIsRunning] = useState(false);

  // Dynamical system and error handling
  const [dynamicalSystem, setDynamicalSystem] = useState(null);
  const [equationError, setEquationError] = useState("");

  // Canvas refs - two-canvas optimization
  const staticCanvasRef = useRef(null);
  const dynamicCanvasRef = useRef(null);

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
    };
  }, [xMin, xMax, yMin, yMax, particleGridSize]);

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
      const { xMin, xMax, yMin, yMax } = animationStateRef.current.params;
      const { width, height } = canvas;

      // Account for graph padding (matching GridGraph calculation)
      const paddingLeft = 45;
      const paddingRight = 15;
      const paddingTop = 15;
      const paddingBottom = 35;
      const plotWidth = width - paddingLeft - paddingRight;
      const plotHeight = height - paddingTop - paddingBottom;

      ctx.clearRect(0, 0, width, height);

      // Coordinate mapping functions for drawable area only
      const mapX = (x) =>
        paddingLeft + ((x - xMin) / (xMax - xMin)) * plotWidth;
      const mapY = (y) =>
        paddingTop + plotHeight - ((y - yMin) / (yMax - yMin)) * plotHeight;

      // Draw background grid (only in drawable area)
      if (showGrid) {
        ctx.strokeStyle =
          currentTheme === "dark" ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)";
        ctx.lineWidth = 1;

        // Vertical lines
        const xStep = (xMax - xMin) / 10;
        for (let x = xMin; x <= xMax; x += xStep) {
          const canvasX = mapX(x);
          if (canvasX >= paddingLeft && canvasX <= width - paddingRight) {
            ctx.beginPath();
            ctx.moveTo(canvasX, paddingTop);
            ctx.lineTo(canvasX, height - paddingBottom);
            ctx.stroke();
          }
        }

        // Horizontal lines
        const yStep = (yMax - yMin) / 10;
        for (let y = yMin; y <= yMax; y += yStep) {
          const canvasY = mapY(y);
          if (canvasY >= paddingTop && canvasY <= height - paddingBottom) {
            ctx.beginPath();
            ctx.moveTo(paddingLeft, canvasY);
            ctx.lineTo(width - paddingRight, canvasY);
            ctx.stroke();
          }
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

            const canvasX = mapX(x);
            const canvasY = mapY(y);

            // Only draw if within drawable area
            if (
              canvasX >= paddingLeft &&
              canvasX <= width - paddingRight &&
              canvasY >= paddingTop &&
              canvasY <= height - paddingBottom
            ) {
              const arrowLength = 18;
              const endX = canvasX + normalizedDx * arrowLength;
              const endY = canvasY - normalizedDy * arrowLength; // Flip Y for canvas

              // Draw arrow shaft
              ctx.beginPath();
              ctx.moveTo(canvasX, canvasY);
              ctx.lineTo(endX, endY);
              ctx.stroke();

              // Draw arrowhead (HollingTanner style)
              const angle = Math.atan2(endY - canvasY, endX - canvasX);
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
    const extension = 0.40; // 40% extension as requested

    const extendedXMin = xMin - xRange * extension;
    const extendedXMax = xMax + xRange * extension;
    const extendedYMin = yMin - yRange * extension;
    const extendedYMax = yMax + yRange * extension;

    const particles = [];

    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        const x = extendedXMin + ((i + 0.5) * (extendedXMax - extendedXMin)) / gridSize;
        const y = extendedYMin + ((j + 0.5) * (extendedYMax - extendedYMin)) / gridSize;

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
      const { width, height } = canvas;
      const { xMin, xMax, yMin, yMax } = animationStateRef.current.params;

      // Account for graph padding
      const paddingLeft = 45;
      const paddingRight = 15;
      const paddingTop = 15;
      const paddingBottom = 35;
      const plotWidth = width - paddingLeft - paddingRight;
      const plotHeight = height - paddingTop - paddingBottom;

      // Coordinate mapping functions
      const mapX = (x) =>
        paddingLeft + ((x - xMin) / (xMax - xMin)) * plotWidth;
      const mapY = (y) =>
        paddingTop + plotHeight - ((y - yMin) / (yMax - yMin)) * plotHeight;

      // Exact wind-js trail fading technique
      const prevComposite = ctx.globalCompositeOperation;
      ctx.fillStyle =
        currentTheme === "dark"
          ? "rgba(0, 0, 0, 0.85)" // Even slower fade for maximum persistence in dark mode
          : "rgba(255, 255, 255, 0.91)"; // Stronger persistence for light mode too
      ctx.globalCompositeOperation = "destination-in";
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = prevComposite;

      // Create particle buckets by intensity (exact wind-js technique)
      const redBuckets = [[], [], [], []]; // 4 intensity levels
      const blueBuckets = [[], [], [], []];

      // Sort red click particles into buckets
      const clickParticles = clickParticlesRef.current;
      clickParticles.forEach((particle) => {
        if (particle.xt !== undefined && particle.yt !== undefined &&
            particle.x >= xMin && particle.x <= xMax &&
            particle.y >= yMin && particle.y <= yMax) {

          // Calculate speed for intensity bucketing
          const dx = particle.xt - particle.x;
          const dy = particle.yt - particle.y;
          const speed = Math.sqrt(dx * dx + dy * dy);
          const bucketIndex = Math.min(Math.floor(speed * 40), 3); // 0-3

          redBuckets[bucketIndex].push({
            x: mapX(particle.x),
            y: mapY(particle.y),
            xt: mapX(particle.xt),
            yt: mapY(particle.yt)
          });
        }
      });

      // Sort blue grid particles into buckets
      const gridParticles = gridParticlesRef.current;
      gridParticles.forEach((particle) => {
        if (particle.xt !== undefined && particle.yt !== undefined &&
            particle.x >= xMin && particle.x <= xMax &&
            particle.y >= yMin && particle.y <= yMax) {

          const dx = particle.xt - particle.x;
          const dy = particle.yt - particle.y;
          const speed = Math.sqrt(dx * dx + dy * dy);
          const bucketIndex = Math.min(Math.floor(speed * 40), 3);

          blueBuckets[bucketIndex].push({
            x: mapX(particle.x),
            y: mapY(particle.y),
            xt: mapX(particle.xt),
            yt: mapY(particle.yt)
          });
        }
      });

      // High opacity (80%+) with color variation for intensity - Red particles
      const redColors = [
        currentTheme === "dark"
          ? "rgba(200, 80, 80, 0.8)"    // Darker red, 80% opacity
          : "rgba(180, 30, 30, 0.8)",
        currentTheme === "dark"
          ? "rgba(230, 90, 90, 0.85)"   // Medium red, 85% opacity
          : "rgba(200, 35, 35, 0.85)",
        currentTheme === "dark"
          ? "rgba(255, 110, 110, 0.9)"  // Bright red, 90% opacity
          : "rgba(220, 40, 40, 0.9)",
        currentTheme === "dark"
          ? "rgba(255, 140, 140, 1.0)"  // Very bright red, 100% opacity
          : "rgba(240, 50, 50, 1.0)",
      ];

      redBuckets.forEach((bucket, i) => {
        if (bucket.length > 0) {
          ctx.beginPath();
          ctx.strokeStyle = redColors[i];
          ctx.lineWidth = i === 3 ? 1.5 : 1; // Thicker lines for highest intensity
          bucket.forEach((particle) => {
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(particle.xt, particle.yt);
          });
          ctx.stroke();
        }
      });

      // High opacity (80%+) with color variation for intensity - Blue particles
      const blueColors = [
        currentTheme === "dark"
          ? "rgba(80, 140, 200, 0.8)"    // Darker blue, 80% opacity
          : "rgba(40, 100, 180, 0.8)",
        currentTheme === "dark"
          ? "rgba(100, 170, 230, 0.85)"  // Medium blue, 85% opacity
          : "rgba(50, 120, 200, 0.85)",
        currentTheme === "dark"
          ? "rgba(120, 200, 255, 0.9)"   // Bright blue, 90% opacity
          : "rgba(60, 140, 220, 0.9)",
        currentTheme === "dark"
          ? "rgba(160, 230, 255, 1.0)"   // Very bright cyan, 100% opacity
          : "rgba(80, 160, 240, 1.0)",
      ];

      blueBuckets.forEach((bucket, i) => {
        if (bucket.length > 0) {
          ctx.beginPath();
          ctx.strokeStyle = blueColors[i];
          ctx.lineWidth = i === 3 ? 1.2 : 0.8; // Thicker lines for highest intensity
          bucket.forEach((particle) => {
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(particle.xt, particle.yt);
          });
          ctx.stroke();
        }
      });

      ctx.globalAlpha = 1;
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

    const dt = 0.016; // ~60fps timestep

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
  const addClickParticle = useCallback((x, y) => {
    const clickParticles = clickParticlesRef.current;
    if (clickParticles.length >= MAX_CLICK_PARTICLES) return;

    const newParticle = {
      x, y, xt: x, yt: y, age: 0, id: Date.now() + Math.random()
    };

    clickParticles.push(newParticle);

    // Start animation immediately when red particle is added
    const state = animationStateRef.current;
    if (!state.animationId) {
      animationLoop();
    }
  }, [animationLoop]);

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
      if (!staticCanvasRef.current) return;

      const canvas = staticCanvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const { width, height } = canvas;

      // Account for graph padding
      const paddingLeft = 45;
      const paddingRight = 15;
      const paddingTop = 15;
      const paddingBottom = 35;
      const plotWidth = width - paddingLeft - paddingRight;
      const plotHeight = height - paddingTop - paddingBottom;

      const canvasX = event.clientX - rect.left;
      const canvasY = event.clientY - rect.top;

      // Check if click is within drawable area
      if (
        canvasX >= paddingLeft &&
        canvasX <= width - paddingRight &&
        canvasY >= paddingTop &&
        canvasY <= height - paddingBottom
      ) {
        // Convert canvas coordinates to world coordinates
        const { xMin, xMax, yMin, yMax } = animationStateRef.current.params;
        const worldX =
          xMin + ((canvasX - paddingLeft) / plotWidth) * (xMax - xMin);
        const worldY =
          yMax - ((canvasY - paddingTop) / plotHeight) * (yMax - yMin);

        addClickParticle(worldX, worldY);
      }
    },
    [addClickParticle],
  );

  // Canvas initialization
  useEffect(() => {
    [staticCanvasRef, dynamicCanvasRef].forEach((ref) => {
      if (ref.current) {
        const canvas = ref.current;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
      }
    });

    // Draw initial static elements
    if (staticCanvasRef.current) {
      const ctx = staticCanvasRef.current.getContext("2d");
      drawStaticElements(staticCanvasRef.current, ctx);
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
        {/* Static background - vector field, grid */}
        <canvas
          ref={staticCanvasRef}
          className="absolute pointer-events-none"
          style={{
            left: 1,
            bottom: 1,
            width: "calc(100% - 2px)",
            height: "calc(100% - 2px)",
          }}
          width={600}
          height={600}
        />

        {/* Dynamic foreground - particles, trails */}
        <canvas
          ref={dynamicCanvasRef}
          className="absolute cursor-crosshair"
          style={{
            left: 1,
            bottom: 1,
            width: "calc(100% - 2px)",
            height: "calc(100% - 2px)",
          }}
          width={600}
          height={600}
          onClick={handleCanvasClick}
        />
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

      {/* Row 4: Particle Grid Size Slider */}
      <GridSliderHorizontal
        x={6}
        y={4}
        w={4}
        h={1}
        value={particleGridSize * 2} // Scale to 0-100 range (max 50)
        onChange={(value) => setParticleGridSize(value / 2)}
        variant="unipolar"
        label={`Particle Grid Size = ${particleGridSize.toFixed(0)}`}
        tooltip={`Number of particles: ${(particleGridSize * particleGridSize).toFixed(0)}`}
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
          w={3}
          h={1}
          value="Equations Valid ✓"
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
