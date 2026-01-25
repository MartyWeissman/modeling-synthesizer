// src/tools/SimpleHarmonicOscillatorTool.jsx

import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import {
  GridSliderHorizontal,
  GridButton,
  GridDisplay,
  GridGraph,
  GridWindow,
  GridInput,
} from "../components/grid";
import ToolContainer from "../components/ui/ToolContainer";
import Equation from "../components/Equation";
import { useTheme } from "../hooks/useTheme";

const SimpleHarmonicOscillatorTool = () => {
  const { theme, currentTheme } = useTheme();

  // UI State - only for React components
  const [uiParams, setUiParams] = useState({
    u: 1.0, // Momentum coefficient
    k: 1.0, // Spring constant
    speed: 1, // Animation speed (default 1x for real-time)
  });

  const [isAnimating, setIsAnimating] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [showNullclines, setShowNullclines] = useState(false);
  const [showPeriod, setShowPeriod] = useState(false);
  const [detectedPeriod, setDetectedPeriod] = useState(null);

  // Canvas refs - separate static and dynamic layers for performance
  const staticCanvasRef = useRef(null);
  const dynamicCanvasRef = useRef(null);
  const timeSeriesCanvasRef = useRef(null);
  const springCanvasRef = useRef(null);

  // Transform refs for coordinate conversion
  const phaseTransformRef = useRef(null);
  const timeSeriesTransformRef = useRef(null);

  // Animation state - pure refs, never cause React re-renders
  const animationStateRef = useRef({
    trajectories: [],
    time: 0,
    animationId: null,
    isRunning: false,
    timeSeriesData: [],
    params: { ...uiParams },
    showNullclines: showNullclines,
    showPeriod: showPeriod,
    periodData: {
      crossingTimes: [],
      lastX: null,
      referenceLine: 0,
      currentPeriod: null,
    },
  });

  // Update animation parameters when UI changes
  useEffect(() => {
    animationStateRef.current.params = { ...uiParams };
  }, [uiParams]);

  // Sync UI state to animation state
  useEffect(() => {
    animationStateRef.current.showNullclines = showNullclines;
    animationStateRef.current.showPeriod = showPeriod;
  }, [showNullclines, showPeriod]);

  // Display constants for X and P
  const xmin = -3,
    xmax = 3;
  const pmin = -3,
    pmax = 3;

  // Equilibrium point - always at origin for simple harmonic oscillator
  const equilibria = useMemo(() => {
    return [{ x: 0, y: 0, stability: "center" }];
  }, []);

  // Static elements drawing function - only redraws when parameters change
  const drawStaticElements = useCallback(
    (canvas, ctx) => {
      const transform = phaseTransformRef.current;
      if (!transform) return;

      const { dataToPixel, plotWidth, plotHeight } = transform;
      const { u, k } = animationStateRef.current.params;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw nullclines if enabled
      if (showNullclines) {
        // X-nullcline: X' = uP = 0 => P = 0 (horizontal line through origin)
        ctx.strokeStyle = currentTheme === "dark" ? "#60a5fa" : "#3b82f6";
        ctx.lineWidth = 3;
        const nullclineLeft = dataToPixel(xmin, 0);
        const nullclineRight = dataToPixel(xmax, 0);
        ctx.beginPath();
        ctx.moveTo(nullclineLeft.x, nullclineLeft.y);
        ctx.lineTo(nullclineRight.x, nullclineRight.y);
        ctx.stroke();

        // P-nullcline: P' = -kX = 0 => X = 0 (vertical line through origin)
        ctx.strokeStyle = currentTheme === "dark" ? "#f87171" : "#dc2626";
        ctx.lineWidth = 3;
        const nullclineTop = dataToPixel(0, pmax);
        const nullclineBottom = dataToPixel(0, pmin);
        ctx.beginPath();
        ctx.moveTo(nullclineTop.x, nullclineTop.y);
        ctx.lineTo(nullclineBottom.x, nullclineBottom.y);
        ctx.stroke();
      }

      // Draw vector field
      const gridCoords = [
        -2.5, -2.0, -1.5, -1.0, -0.5, 0, 0.5, 1.0, 1.5, 2.0, 2.5,
      ];
      ctx.strokeStyle =
        currentTheme === "dark"
          ? "rgba(156, 163, 175, 0.7)"
          : "rgba(107, 114, 128, 0.7)";
      ctx.fillStyle =
        currentTheme === "dark"
          ? "rgba(156, 163, 175, 0.7)"
          : "rgba(107, 114, 128, 0.7)";
      ctx.lineWidth = 1;

      for (let i = 0; i < gridCoords.length; i++) {
        for (let j = 0; j < gridCoords.length; j++) {
          const x = gridCoords[i];
          const p = gridCoords[j];

          // Simple harmonic oscillator equations
          const dx = u * p;
          const dp = -k * x;
          const magnitude = Math.sqrt(dx * dx + dp * dp);

          if (magnitude === 0) continue;

          const normalizedDx = dx / magnitude;
          const normalizedDy = dp / magnitude;

          const pixel = dataToPixel(x, p);
          const arrowLength = 18;
          const endX = pixel.x + normalizedDx * arrowLength;
          const endY = pixel.y - normalizedDy * arrowLength;

          ctx.beginPath();
          ctx.moveTo(pixel.x, pixel.y);
          ctx.lineTo(endX, endY);
          ctx.stroke();

          // Arrowhead
          const angle = Math.atan2(endY - pixel.y, endX - pixel.x);
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

      // Draw equilibrium point at origin
      const eqPixel = dataToPixel(0, 0);

      ctx.fillStyle = "#10b981"; // Green for center (stable)
      ctx.strokeStyle = "#059669";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(eqPixel.x, eqPixel.y, 6, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "white";
      ctx.beginPath();
      ctx.arc(eqPixel.x, eqPixel.y, 2.5, 0, 2 * Math.PI);
      ctx.fill();

      // Draw period reference line when period detection is active
      if (showPeriod) {
        const refTop = dataToPixel(0, pmax);
        const refBottom = dataToPixel(0, pmin);

        ctx.strokeStyle = currentTheme === "dark" ? "#a78bfa" : "#8b5cf6";
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(refTop.x, refTop.y);
        ctx.lineTo(refBottom.x, refBottom.y);
        ctx.stroke();
        ctx.setLineDash([]); // Reset line dash
      }
    },
    [currentTheme, showNullclines, showPeriod],
  );

  // Dynamic elements drawing function - redraws every animation frame
  const drawDynamicElements = useCallback((canvas, ctx) => {
    const transform = phaseTransformRef.current;
    if (!transform) return;

    const { dataToPixel } = transform;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw trajectories only
    const state = animationStateRef.current;
    state.trajectories.forEach((traj) => {
      if (!traj.trail || traj.trail.length < 2) return;

      ctx.strokeStyle = traj.color;
      ctx.lineWidth = 2;
      ctx.beginPath();

      traj.trail.forEach((point, i) => {
        const pixel = dataToPixel(point.x, point.y);
        if (i === 0) ctx.moveTo(pixel.x, pixel.y);
        else ctx.lineTo(pixel.x, pixel.y);
      });
      ctx.stroke();

      // Current position
      if (traj.isActive && traj.x !== undefined && traj.p !== undefined) {
        const pixel = dataToPixel(traj.x, traj.p);
        ctx.fillStyle = traj.color;
        ctx.beginPath();
        ctx.arc(pixel.x, pixel.y, 4, 0, 2 * Math.PI);
        ctx.fill();
      }
    });
  }, []);

  // Draw spring-mass system
  const drawSpringMass = useCallback(
    (canvas, ctx) => {
      const { width, height } = canvas;
      const state = animationStateRef.current;

      ctx.clearRect(0, 0, width, height);

      // Get current position and u parameter
      const activeTraj = state.trajectories.find((t) => t.isActive);
      if (!activeTraj) return;

      const currentX = activeTraj.x || 0;
      const { u } = state.params;

      // Map X position (-3 to 3) to vertical position in window
      const centerY = height / 2;
      const amplitude = height * 0.35;

      // Ball radius inversely proportional to u
      const ballRadius = 20 / (1 + u);
      const ballY = centerY - (currentX / 3) * amplitude;

      // Draw 3D helix spring
      const springCenterX = width / 2;
      const springTop = 10;
      const springRadius = 15; // Radius of the helix
      const springCoils = 10;
      const springLength = ballY - springTop - ballRadius;
      const pointsPerCoil = 20; // Resolution
      const totalPoints = springCoils * pointsPerCoil;

      // Draw helix with depth-based coloring
      for (let i = 0; i <= totalPoints; i++) {
        const t = i / pointsPerCoil; // Parameter along helix
        const y = springTop + (springLength * i) / totalPoints;
        const angle = t * 2 * Math.PI;
        const x = springCenterX + springRadius * Math.cos(angle);
        const z = springRadius * Math.sin(angle); // Depth component

        // Calculate line width and opacity based on depth (z)
        // Front of helix (z > 0) is thicker and more opaque
        const depthFactor = (z / springRadius + 1) / 2; // 0 to 1
        const lineWidth = 1.5 + depthFactor * 2; // 1.5 to 3.5
        const opacity = 0.4 + depthFactor * 0.6; // 0.4 to 1.0

        // Draw segment
        if (i > 0) {
          const prevT = (i - 1) / pointsPerCoil;
          const prevY = springTop + (springLength * (i - 1)) / totalPoints;
          const prevAngle = prevT * 2 * Math.PI;
          const prevX = springCenterX + springRadius * Math.cos(prevAngle);

          ctx.strokeStyle =
            currentTheme === "dark"
              ? `rgba(156, 163, 175, ${opacity})`
              : `rgba(75, 85, 99, ${opacity})`;
          ctx.lineWidth = lineWidth;
          ctx.beginPath();
          ctx.moveTo(prevX, prevY);
          ctx.lineTo(x, y);
          ctx.stroke();
        }
      }

      // Draw ball with gradient
      const gradient = ctx.createRadialGradient(
        springCenterX - ballRadius / 3,
        ballY - ballRadius / 3,
        0,
        springCenterX,
        ballY,
        ballRadius,
      );
      gradient.addColorStop(0, currentTheme === "dark" ? "#60a5fa" : "#93c5fd");
      gradient.addColorStop(1, currentTheme === "dark" ? "#1e40af" : "#3b82f6");

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(springCenterX, ballY, ballRadius, 0, 2 * Math.PI);
      ctx.fill();

      // Ball outline
      ctx.strokeStyle = currentTheme === "dark" ? "#1e3a8a" : "#1e40af";
      ctx.lineWidth = 2;
      ctx.stroke();
    },
    [currentTheme],
  );

  // Draw time series
  const drawTimeSeries = useCallback(
    (canvas, ctx) => {
      const transform = timeSeriesTransformRef.current;
      if (!transform) return;

      const { plotWidth, plotHeight } = transform;
      const state = animationStateRef.current;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (state.timeSeriesData.length < 2) return;

      const timeWindow = 20;
      const currentTime = state.time;
      const minTime = Math.max(0, currentTime - timeWindow);
      const maxVal = 3;
      const minVal = -3;

      // Local helper for sliding time window (axes change dynamically)
      const toPixel = (t, val) => ({
        x: ((t - minTime) / timeWindow) * plotWidth,
        y: plotHeight - ((val - minVal) / (maxVal - minVal)) * plotHeight,
      });

      // Draw position X
      ctx.strokeStyle = currentTheme === "dark" ? "#60a5fa" : "#3b82f6";
      ctx.lineWidth = 2;
      ctx.beginPath();
      let firstPoint = true;
      state.timeSeriesData.forEach((point) => {
        if (point.time >= minTime && point.time <= minTime + timeWindow) {
          const pixel = toPixel(point.time, point.position);
          if (firstPoint) {
            ctx.moveTo(pixel.x, pixel.y);
            firstPoint = false;
          } else {
            ctx.lineTo(pixel.x, pixel.y);
          }
        }
      });
      ctx.stroke();

      // Draw momentum P
      ctx.strokeStyle = currentTheme === "dark" ? "#f87171" : "#dc2626";
      ctx.lineWidth = 2;
      ctx.beginPath();
      firstPoint = true;
      state.timeSeriesData.forEach((point) => {
        if (point.time >= minTime && point.time <= minTime + timeWindow) {
          const pixel = toPixel(point.time, point.momentum);
          if (firstPoint) {
            ctx.moveTo(pixel.x, pixel.y);
            firstPoint = false;
          } else {
            ctx.lineTo(pixel.x, pixel.y);
          }
        }
      });
      ctx.stroke();

      // Legend in top-center of graph
      const legendCenterX = plotWidth / 2;
      const legendWidth = 180;
      const legendHeight = 35;
      const legendX = legendCenterX - legendWidth / 2;
      const legendY = -10; // Near top of canvas

      // Legend background - match graph background
      ctx.fillStyle =
        currentTheme === "dark"
          ? "rgba(31, 41, 55, 0.9)"
          : "rgba(255, 255, 255, 0.9)";
      ctx.fillRect(legendX, legendY, legendWidth, legendHeight);
      ctx.strokeStyle =
        currentTheme === "dark"
          ? "rgba(255, 255, 255, 0.3)"
          : "rgba(0, 0, 0, 0.3)";
      ctx.lineWidth = 1;
      ctx.strokeRect(legendX, legendY, legendWidth, legendHeight);

      // Legend items
      ctx.font = "12px Arial";
      ctx.textAlign = "left";

      // Blue line for position
      ctx.strokeStyle = currentTheme === "dark" ? "#60a5fa" : "#3b82f6";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(legendX + 10, legendY + 12);
      ctx.lineTo(legendX + 30, legendY + 12);
      ctx.stroke();

      ctx.fillStyle = currentTheme === "dark" ? "#ffffff" : "#000000";
      ctx.fillText("Position (X)", legendX + 35, legendY + 16);

      // Red line for momentum
      ctx.strokeStyle = currentTheme === "dark" ? "#f87171" : "#dc2626";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(legendX + 10, legendY + 27);
      ctx.lineTo(legendX + 30, legendY + 27);
      ctx.stroke();

      ctx.fillStyle = currentTheme === "dark" ? "#ffffff" : "#000000";
      ctx.fillText("Momentum (P)", legendX + 35, legendY + 31);
    },
    [currentTheme],
  );

  // Animation loop
  const animationLoop = useCallback(() => {
    const state = animationStateRef.current;
    if (!state.isRunning) return;

    const { u, k, speed } = state.params;
    if (speed === 0) {
      state.animationId = requestAnimationFrame(animationLoop);
      return;
    }

    const dt = 0.01; // Fixed timestep for accuracy
    const stepsPerFrame = Math.max(1, Math.round(2 * speed)); // 2 steps at 1x speed for visible speed

    // Run multiple computation steps per frame for speed without losing accuracy
    for (let step = 0; step < stepsPerFrame; step++) {
      // Update trajectories
      state.trajectories = state.trajectories.map((traj) => {
        if (!traj.isActive) return traj;

        const f = (x_val, p_val) => [
          u * p_val, // dX/dt = uP
          -k * x_val, // dP/dt = -kX
        ];

        const [x_curr, p_curr] = [traj.x, traj.p];

        // RK4 integration
        const k1 = f(x_curr, p_curr);
        const k2 = f(x_curr + (dt * k1[0]) / 2, p_curr + (dt * k1[1]) / 2);
        const k3 = f(x_curr + (dt * k2[0]) / 2, p_curr + (dt * k2[1]) / 2);
        const k4 = f(x_curr + dt * k3[0], p_curr + dt * k3[1]);

        let newX = x_curr + (dt / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]);
        let newP = p_curr + (dt / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);

        const isInBounds =
          newX >= xmin && newX <= xmax && newP >= pmin && newP <= pmax;
        const newTrail = [...traj.trail.slice(-150), { x: newX, y: newP }];

        return {
          ...traj,
          x: newX,
          p: newP,
          trail: newTrail,
          isActive: isInBounds,
        };
      });

      state.time += dt;
    }

    // Update React time state periodically
    const totalTimeStep = dt * stepsPerFrame;
    if (
      Math.floor(state.time * 10) !==
      Math.floor((state.time - totalTimeStep) * 10)
    ) {
      setCurrentTime(state.time);
    }

    // Update time series data and detect periods
    const activeTraj = state.trajectories.find((t) => t.isActive);
    if (activeTraj) {
      const currentX = activeTraj.x || 0;
      const currentP = activeTraj.p || 0;

      state.timeSeriesData = [
        ...state.timeSeriesData.slice(-500),
        {
          time: state.time,
          position: currentX,
          momentum: currentP,
        },
      ];

      // Period detection using Poincaré section (X crosses 0 upward, i.e., P > 0)
      if (state.showPeriod) {
        const xEq = 0; // Equilibrium X value
        state.periodData.referenceLine = xEq;

        if (state.periodData.lastX !== null) {
          // Detect upward crossing of X = 0 (when P > 0)
          if (state.periodData.lastX < xEq && currentX >= xEq && currentP > 0) {
            state.periodData.crossingTimes.push(state.time);

            // Keep only last 10 crossings
            if (state.periodData.crossingTimes.length > 10) {
              state.periodData.crossingTimes =
                state.periodData.crossingTimes.slice(-10);
            }

            // Calculate period from last two crossings
            if (state.periodData.crossingTimes.length >= 2) {
              const lastTwo = state.periodData.crossingTimes.slice(-2);
              const period = lastTwo[1] - lastTwo[0];
              state.periodData.currentPeriod = period;

              // Update React state on every crossing for real-time period display
              setDetectedPeriod(period);
            }
          }
        }
        state.periodData.lastX = currentX;
      }
    }

    // Draw only dynamic elements (efficient!)
    const dynamicCanvas = dynamicCanvasRef.current;
    const timeCanvas = timeSeriesCanvasRef.current;
    const springCanvas = springCanvasRef.current;

    if (dynamicCanvas) {
      const ctx = dynamicCanvas.getContext("2d");
      drawDynamicElements(dynamicCanvas, ctx);
    }

    if (timeCanvas) {
      const ctx = timeCanvas.getContext("2d");
      drawTimeSeries(timeCanvas, ctx);
    }

    if (springCanvas) {
      const ctx = springCanvas.getContext("2d");
      drawSpringMass(springCanvas, ctx);
    }

    state.animationId = requestAnimationFrame(animationLoop);
  }, [drawDynamicElements, drawTimeSeries, drawSpringMass]);

  // Control functions
  const startAnimation = useCallback(() => {
    if (animationStateRef.current.isRunning) return;
    animationStateRef.current.isRunning = true;
    setIsAnimating(true);
    animationLoop();
  }, [animationLoop]);

  // Canvas click handler
  const handleCanvasClick = useCallback(
    (event) => {
      const canvas = dynamicCanvasRef.current;
      const transform = phaseTransformRef.current;
      if (!canvas || !transform) return;

      const { pixelToData, plotWidth, plotHeight } = transform;

      const rect = canvas.getBoundingClientRect();
      const clickX = event.clientX - rect.left;
      const clickY = event.clientY - rect.top;

      // Check bounds
      if (clickX < 0 || clickX > plotWidth || clickY < 0 || clickY > plotHeight)
        return;

      const dataPoint = pixelToData(clickX, clickY);
      const dataX = dataPoint.x;
      const dataY = dataPoint.y;

      if (dataX < xmin || dataY < pmin || dataX > xmax || dataY > pmax) return;

      const colorHues = [120, 240, 60, 300, 180, 0];
      const hue =
        colorHues[
          animationStateRef.current.trajectories.length % colorHues.length
        ];

      const newTrajectory = {
        id: Date.now() + Math.random(),
        x: dataX,
        p: dataY,
        isActive: true,
        color: `hsl(${hue}, 70%, 50%)`,
        trail: [{ x: dataX, y: dataY }],
      };

      animationStateRef.current.trajectories.push(newTrajectory);

      if (animationStateRef.current.trajectories.length === 1) {
        animationStateRef.current.time = 0;
        animationStateRef.current.timeSeriesData = [];
      }

      startAnimation();
    },
    [startAnimation],
  );

  const stopAnimation = useCallback(() => {
    animationStateRef.current.isRunning = false;
    setIsAnimating(false);
    if (animationStateRef.current.animationId) {
      cancelAnimationFrame(animationStateRef.current.animationId);
      animationStateRef.current.animationId = null;
    }
  }, []);

  const resetSimulation = useCallback(() => {
    stopAnimation();
    animationStateRef.current.trajectories = [];
    animationStateRef.current.time = 0;
    animationStateRef.current.timeSeriesData = [];
    animationStateRef.current.periodData = {
      crossingTimes: [],
      lastX: null,
      referenceLine: 0,
      currentPeriod: null,
    };
    setCurrentTime(0);
    setDetectedPeriod(null);

    // Redraw static elements
    if (staticCanvasRef.current) {
      const ctx = staticCanvasRef.current.getContext("2d");
      drawStaticElements(staticCanvasRef.current, ctx);
    }

    if (timeSeriesCanvasRef.current) {
      const ctx = timeSeriesCanvasRef.current.getContext("2d");
      ctx.clearRect(
        0,
        0,
        timeSeriesCanvasRef.current.width,
        timeSeriesCanvasRef.current.height,
      );
    }
  }, [stopAnimation, drawStaticElements]);

  const updateParam = useCallback((param, value) => {
    setUiParams((prev) => ({ ...prev, [param]: value }));
  }, []);

  // Initialize canvases
  useEffect(() => {
    // Set canvas sizes from transforms
    if (staticCanvasRef.current && phaseTransformRef.current) {
      staticCanvasRef.current.width = phaseTransformRef.current.plotWidth;
      staticCanvasRef.current.height = phaseTransformRef.current.plotHeight;
    }
    if (dynamicCanvasRef.current && phaseTransformRef.current) {
      dynamicCanvasRef.current.width = phaseTransformRef.current.plotWidth;
      dynamicCanvasRef.current.height = phaseTransformRef.current.plotHeight;
    }
    if (timeSeriesCanvasRef.current && timeSeriesTransformRef.current) {
      timeSeriesCanvasRef.current.width =
        timeSeriesTransformRef.current.plotWidth;
      timeSeriesCanvasRef.current.height =
        timeSeriesTransformRef.current.plotHeight;
    }
    // Spring canvas uses GridWindow, set from bounding rect
    if (springCanvasRef.current) {
      const rect = springCanvasRef.current.getBoundingClientRect();
      springCanvasRef.current.width = rect.width;
      springCanvasRef.current.height = rect.height;
    }

    // Draw initial static elements
    if (staticCanvasRef.current && phaseTransformRef.current) {
      const ctx = staticCanvasRef.current.getContext("2d");
      drawStaticElements(staticCanvasRef.current, ctx);
    }
  }, [drawStaticElements]);

  // Redraw static elements when parameters or display options change
  useEffect(() => {
    if (staticCanvasRef.current && phaseTransformRef.current) {
      const ctx = staticCanvasRef.current.getContext("2d");
      drawStaticElements(staticCanvasRef.current, ctx);
    }
  }, [uiParams, showNullclines, showPeriod, drawStaticElements]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAnimation();
    };
  }, [stopAnimation]);

  return (
    <ToolContainer
      title="Simple Harmonic Oscillator"
      canvasWidth={8}
      canvasHeight={7}
    >
      {/* Main Phase Portrait */}
      <GridGraph
        x={0}
        y={0}
        w={5}
        h={5}
        xLabel="Position (X)"
        yLabel="Momentum (P)"
        xRange={[xmin, xmax]}
        yRange={[pmin, pmax]}
        xTicks={[-3, -2, -1, 0, 1, 2, 3]}
        yTicks={[-3, -2, -1, 0, 1, 2, 3]}
        theme={theme}
        tooltip="Click to start a trajectory from that point"
      >
        {(transform) => {
          phaseTransformRef.current = transform;
          return (
            <>
              {/* Static background layer - vector field, nullclines, equilibrium point */}
              <canvas
                ref={staticCanvasRef}
                className="absolute pointer-events-none"
                style={transform.plotStyle}
                width={transform.plotWidth}
                height={transform.plotHeight}
              />

              {/* Dynamic foreground layer - trajectories and moving particles */}
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

      {/* Time Series Plot */}
      <GridGraph
        x={0}
        y={5}
        w={5}
        h={2}
        xLabel="Time"
        yLabel="Value"
        xRange={[Math.max(0, currentTime - 20), Math.max(20, currentTime)]}
        yRange={[-3, 3]}
        xTicks={[]}
        yTicks={[-3, -2, -1, 0, 1, 2, 3]}
        theme={theme}
        tooltip="Position and momentum over time"
      >
        {(transform) => {
          timeSeriesTransformRef.current = transform;
          return (
            <canvas
              ref={timeSeriesCanvasRef}
              className="absolute"
              style={transform.plotStyle}
              width={transform.plotWidth}
              height={transform.plotHeight}
            />
          );
        }}
      </GridGraph>

      {/* Parameter Controls */}
      <GridInput
        x={5}
        y={0}
        value={uiParams.u}
        onChange={(value) => updateParam("u", value)}
        min={0.01}
        max={3.0}
        step={0.01}
        variable="u"
        title="Momentum coefficient"
        theme={theme}
      />

      <GridInput
        x={5}
        y={1}
        value={uiParams.k}
        onChange={(value) => updateParam("k", value)}
        min={0.01}
        max={3.0}
        step={0.01}
        variable="k"
        title="Spring constant"
        theme={theme}
      />

      <GridSliderHorizontal
        x={5}
        y={2}
        w={3}
        h={1}
        value={uiParams.speed * 50}
        onChange={(value) => updateParam("speed", value / 50)}
        variant="unipolar"
        label={`Animation Speed: ${uiParams.speed.toFixed(1)}x`}
        theme={theme}
      />

      {/* Toggle Controls */}
      <GridButton
        x={5}
        y={3}
        w={1}
        h={1}
        type="toggle"
        variant="function"
        active={showNullclines}
        onToggle={setShowNullclines}
        theme={theme}
      >
        <div style={{ textAlign: "center", lineHeight: "1.1" }}>
          <div>{showNullclines ? "Hide" : "Show"}</div>
          <div>Nullclines</div>
        </div>
      </GridButton>

      <GridButton
        x={6}
        y={3}
        w={1}
        h={1}
        type="toggle"
        variant="function"
        active={showPeriod}
        onToggle={setShowPeriod}
        theme={theme}
      >
        <div style={{ textAlign: "center", lineHeight: "1.1" }}>
          <div>{showPeriod ? "Hide" : "Show"}</div>
          <div>Period</div>
        </div>
      </GridButton>

      <GridButton
        x={7}
        y={3}
        w={1}
        h={1}
        onPress={resetSimulation}
        variant="default"
        theme={theme}
      >
        <div style={{ textAlign: "center", lineHeight: "1.1" }}>
          <div>Reset</div>
        </div>
      </GridButton>

      {/* Equations Display */}
      <GridDisplay
        x={6}
        y={0}
        w={2}
        h={2}
        variant="info"
        align="center"
        fontSize="small"
        theme={theme}
      >
        <div style={{ textAlign: "center", padding: "4px" }}>
          <div
            style={{
              fontWeight: "bold",
              fontSize: "1.0em",
              lineHeight: "1.3",
              marginBottom: "15px",
              color: currentTheme === "dark" ? "#60a5fa" : "#3b82f6",
            }}
          >
            Simple Harmonic
            <br />
            Oscillator
          </div>
          <div style={{ marginBottom: "2px", lineHeight: "1.2" }}>
            <Equation name="harmonic-oscillator-x" size="small" />
          </div>
          <div>
            <Equation name="harmonic-oscillator-p" size="small" />
          </div>
        </div>
      </GridDisplay>

      {/* Period Display */}
      <GridDisplay
        x={5}
        y={4}
        w={3}
        h={1}
        variant="info"
        align="center"
        fontSize="small"
        theme={theme}
      >
        <div style={{ padding: "2px", lineHeight: "1.4" }}>
          <div style={{ fontSize: "0.85em" }}>
            Time: {currentTime.toFixed(1)}
          </div>
          <div style={{ fontSize: "0.85em" }}>
            {showPeriod && detectedPeriod !== null ? (
              <span
                style={{
                  color: currentTheme === "dark" ? "#a78bfa" : "#8b5cf6",
                  fontWeight: "bold",
                }}
              >
                Period: {detectedPeriod.toFixed(2)}
              </span>
            ) : (
              <span style={{ opacity: 0.5 }}>
                {showPeriod ? "Detecting period..." : "Period off"}
              </span>
            )}
          </div>
        </div>
      </GridDisplay>

      {/* Spring-Mass Animation */}
      <GridWindow x={5} y={5} w={2} h={2} theme={theme}>
        <canvas
          ref={springCanvasRef}
          className="absolute"
          style={{
            left: 0,
            top: 0,
            width: "100%",
            height: "100%",
          }}
          width={200}
          height={200}
        />
      </GridWindow>
    </ToolContainer>
  );
};

export default SimpleHarmonicOscillatorTool;
