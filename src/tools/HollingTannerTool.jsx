// src/tools/HollingTannerTool.jsx

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
  GridInput,
} from "../components/grid";
import ToolContainer from "../components/ui/ToolContainer";
import { useTheme } from "../hooks/useTheme";

const HollingTannerTool = () => {
  const { theme, currentTheme } = useTheme();

  // UI State - parameters for Holling-Tanner model
  const [uiParams, setUiParams] = useState({
    alpha: 1.0, // α - Shark population growth rate
    beta: 1.0, // β - Tuna population growth rate
    c: 1.0, // c - Predation rate
    h: 1.0, // h - Half-saturation constant
    m: 2.0, // m - Tuna carrying capacity
    q: 2.0, // q - Shark carrying capacity
    speed: 2, // Animation speed
  });

  const [isAnimating, setIsAnimating] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [showNullclines, setShowNullclines] = useState(false);

  // Canvas refs - separate static and dynamic layers for performance
  const staticCanvasRef = useRef(null);
  const dynamicCanvasRef = useRef(null);
  const timeSeriesCanvasRef = useRef(null);

  // Animation state - pure refs, never cause React re-renders
  const animationStateRef = useRef({
    trajectories: [],
    time: 0,
    animationId: null,
    isRunning: false, // Start only when user clicks
    timeSeriesData: [],
    params: { ...uiParams },
    showNullclines: showNullclines,
  });

  // Update animation parameters when UI changes
  useEffect(() => {
    animationStateRef.current.params = { ...uiParams };
  }, [uiParams]);

  // Sync UI state to animation state
  useEffect(() => {
    animationStateRef.current.showNullclines = showNullclines;
  }, [showNullclines]);

  // Display constants for Shark (S) and Tuna (T) populations
  const smin = 0,
    smax = 3;
  const tmin = 0,
    tmax = 3;

  // Equilibrium points for Holling-Tanner model
  const equilibria = useMemo(() => {
    const { alpha, beta, c, h, m, q } = uiParams;
    const points = [];

    // Equilibrium 1: (0, 0) - extinction
    points.push({ x: 0, y: 0, stability: "stable" });

    // Equilibrium 2: (0, m) - predator extinction, prey at carrying capacity
    if (m > 0 && m <= tmax) {
      points.push({ x: 0, y: m, stability: "stable" });
    }

    // Coexistence equilibrium - intersection of non-trivial nullclines
    if (alpha > 0 && beta > 0 && c > 0 && h > 0 && m > 0 && q > 0) {
      // Find intersection of S = qT and S = β(1 - T/m)(h+T)/c
      // Set equal: qT = β(1 - T/m)(h+T)/c
      // Solve: cqT = β(1 - T/m)(h+T)
      // This gives: βT²/m - βT(1 - h/m) - βh + cqT = 0
      const a = beta / m;
      const b = -beta * (1 - h / m) + c * q;
      const cCoeff = -beta * h;

      const discriminant = b * b - 4 * a * cCoeff;

      if (discriminant >= 0) {
        const t1 = (-b + Math.sqrt(discriminant)) / (2 * a);
        const t2 = (-b - Math.sqrt(discriminant)) / (2 * a);

        // Choose the positive, reasonable root
        const tEq =
          t1 > 0 && t1 <= tmax ? t1 : t2 > 0 && t2 <= tmax ? t2 : null;

        if (tEq && tEq > 0) {
          const sEq = q * tEq;
          if (sEq > 0 && sEq <= smax && tEq <= tmax) {
            points.push({ x: sEq, y: tEq, stability: "unstable" });
          }
        }
      }
    }

    return points;
  }, [uiParams]);

  // Static elements drawing function - only redraws when parameters change
  const drawStaticElements = useCallback(
    (canvas, ctx) => {
      const { width, height } = canvas;
      const { alpha, beta, c, h, m, q } = animationStateRef.current.params;

      // Account for graph padding (matching GridGraph calculation)
      const paddingLeft = 45;
      const paddingRight = 15;
      const paddingTop = 15;
      const paddingBottom = 35;

      const plotWidth = width - paddingLeft - paddingRight;
      const plotHeight = height - paddingTop - paddingBottom;

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Draw vector field
      const gridCoords = [0.2, 0.5, 0.8, 1.1, 1.4, 1.7, 2.0, 2.3, 2.6, 2.9];
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
          const s = gridCoords[i];
          const t = gridCoords[j];

          if (s < 0 || t < 0) continue;

          // Holling-Tanner equations
          const dsdt = alpha * s * (1 - s / (q * t));
          const dtdt = beta * t * (1 - t / m) - (c * s * t) / (h + t);
          const magnitude = Math.sqrt(dsdt * dsdt + dtdt * dtdt);

          if (magnitude === 0) continue;

          const normalizedDx = dsdt / magnitude;
          const normalizedDy = dtdt / magnitude;

          const canvasX = paddingLeft + (s / smax) * plotWidth;
          const canvasY = paddingTop + plotHeight - (t / tmax) * plotHeight;
          const arrowLength = 18;
          const endX = canvasX + normalizedDx * arrowLength;
          const endY = canvasY - normalizedDy * arrowLength;

          ctx.beginPath();
          ctx.moveTo(canvasX, canvasY);
          ctx.lineTo(endX, endY);
          ctx.stroke();

          // Arrowhead
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

      // Draw nullclines if enabled
      if (showNullclines) {
        // S-nullcline: αS(1 - S/qT) = 0 => S = 0 or S = qT
        // Non-trivial S-nullcline: S = qT (straight line)
        ctx.strokeStyle = currentTheme === "dark" ? "#60a5fa" : "#3b82f6";
        ctx.lineWidth = 3;
        ctx.beginPath();

        // Draw line S = qT from origin to boundary
        for (let t = 0; t <= tmax; t += 0.01) {
          const s = q * t;
          if (s >= smin && s <= smax) {
            const canvasX = paddingLeft + (s / smax) * plotWidth;
            const canvasY = paddingTop + plotHeight - (t / tmax) * plotHeight;
            if (t === 0) ctx.moveTo(canvasX, canvasY);
            else ctx.lineTo(canvasX, canvasY);
          }
        }
        ctx.stroke();

        // T-nullcline: βT(1 - T/m) = cST/(h+T) = 0 => T = 0 or non-trivial parabola
        // Non-trivial T-nullcline forms a sideways parabola
        ctx.strokeStyle = currentTheme === "dark" ? "#f87171" : "#dc2626";
        ctx.lineWidth = 3;

        // Non-trivial T-nullcline: βT(1 - T/m) = cST/(h+T)
        // Solve for S as a function of T: S = β(1 - T/m)(h+T)/c
        ctx.beginPath();
        let firstPoint = true;
        for (let t = 0.01; t <= tmax; t += 0.05) {
          // For each T, compute: S = β(1 - T/m)(h+T)/c
          const s = (beta * (1 - t / m) * (h + t)) / c;

          if (s > 0 && s <= smax) {
            const canvasX = paddingLeft + (s / smax) * plotWidth;
            const canvasY = paddingTop + plotHeight - (t / tmax) * plotHeight;
            if (firstPoint) {
              ctx.moveTo(canvasX, canvasY);
              firstPoint = false;
            } else {
              ctx.lineTo(canvasX, canvasY);
            }
          }
        }
        ctx.stroke();
      }

      // Draw equilibrium point at intersection of non-trivial nullclines
      if (alpha > 0 && beta > 0 && c > 0 && h > 0 && m > 0 && q > 0) {
        // Find intersection of S = qT and S = β(1 - T/m)(h+T)/c
        // Set equal: qT = β(1 - T/m)(h+T)/c
        // Solve: cqT = β(1 - T/m)(h+T)
        // Expand: cqT = β(h + T - Th/m - T²/m)
        // Rearrange: βT²/m - βT(1 - h/m) - βh + cqT = 0

        const a = beta / m;
        const b = -beta * (1 - h / m) + c * q;
        const cCoeff = -beta * h;

        const discriminant = b * b - 4 * a * cCoeff;

        if (discriminant >= 0) {
          const t1 = (-b + Math.sqrt(discriminant)) / (2 * a);
          const t2 = (-b - Math.sqrt(discriminant)) / (2 * a);

          // Choose the positive, reasonable root
          const tEq =
            t1 > 0 && t1 <= tmax ? t1 : t2 > 0 && t2 <= tmax ? t2 : null;

          if (tEq && tEq > 0) {
            const sEq = q * tEq;

            if (sEq > 0 && sEq <= smax && tEq <= tmax) {
              const canvasX = paddingLeft + (sEq / smax) * plotWidth;
              const canvasY =
                paddingTop + plotHeight - (tEq / tmax) * plotHeight;

              ctx.fillStyle = "#f59e0b"; // Unstable focus for oscillations
              ctx.strokeStyle = "#d97706";
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.arc(canvasX, canvasY, 6, 0, 2 * Math.PI);
              ctx.fill();
              ctx.stroke();

              ctx.fillStyle = "white";
              ctx.beginPath();
              ctx.arc(canvasX, canvasY, 2.5, 0, 2 * Math.PI);
              ctx.fill();
            }
          }
        }
      }
    },
    [currentTheme, showNullclines],
  );

  // Dynamic elements drawing function - redraws every frame
  const drawDynamicElements = useCallback((canvas, ctx) => {
    if (!canvas) return;

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    // Account for graph padding (matching GridGraph calculation)
    const paddingLeft = 45;
    const paddingRight = 15;
    const paddingTop = 15;
    const paddingBottom = 35;

    const plotWidth = width - paddingLeft - paddingRight;
    const plotHeight = height - paddingTop - paddingBottom;

    // Draw trajectories
    const colorHues = [120, 240, 60, 300, 180, 0]; // Green first, then others
    animationStateRef.current.trajectories.forEach((trajectory, trajIndex) => {
      if (trajectory.trail && trajectory.trail.length > 1) {
        const hue = colorHues[trajIndex % colorHues.length];
        ctx.strokeStyle = `hsl(${hue}, 70%, 50%)`;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.8;

        ctx.beginPath();
        trajectory.trail.forEach((point, index) => {
          const x =
            paddingLeft + ((point.x - smin) / (smax - smin)) * plotWidth;
          const y =
            paddingTop +
            plotHeight -
            ((point.y - tmin) / (tmax - tmin)) * plotHeight;

          if (index === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
        ctx.globalAlpha = 1.0;

        // Draw current position
        if (
          trajectory.isActive &&
          trajectory.s !== undefined &&
          trajectory.t !== undefined
        ) {
          const x =
            paddingLeft + ((trajectory.s - smin) / (smax - smin)) * plotWidth;
          const y =
            paddingTop +
            plotHeight -
            ((trajectory.t - tmin) / (tmax - tmin)) * plotHeight;

          ctx.fillStyle = `hsl(${hue}, 70%, 40%)`;
          ctx.beginPath();
          ctx.arc(x, y, 4, 0, 2 * Math.PI);
          ctx.fill();
        }
      }
    });
  }, []);

  // Draw time series
  const drawTimeSeries = useCallback(
    (canvas, ctx) => {
      const { width, height } = canvas;
      const state = animationStateRef.current;
      ctx.clearRect(0, 0, width, height);

      if (state.timeSeriesData.length < 2) return;

      const timeWindow = 20;
      const currentTime = state.time;
      const minTime = Math.max(0, currentTime - timeWindow);
      const maxTime = Math.max(timeWindow, currentTime);
      const maxPop = Math.max(smax, tmax);

      const paddingLeft = 45;
      const paddingRight = 15;
      const paddingTop = 15;
      const paddingBottom = 35;
      const plotWidth = width - paddingLeft - paddingRight;
      const plotHeight = height - paddingTop - paddingBottom;

      // Draw Sharks
      ctx.strokeStyle = currentTheme === "dark" ? "#60a5fa" : "#3b82f6";
      ctx.lineWidth = 2;
      ctx.beginPath();
      let firstPoint = true;

      state.timeSeriesData.forEach((point) => {
        if (point.time >= minTime && point.time <= maxTime) {
          const x =
            paddingLeft + ((point.time - minTime) / timeWindow) * plotWidth;
          const y =
            paddingTop + plotHeight - (point.sharks / maxPop) * plotHeight;
          if (firstPoint) {
            ctx.moveTo(x, y);
            firstPoint = false;
          } else {
            ctx.lineTo(x, y);
          }
        }
      });
      ctx.stroke();

      // Draw Tuna
      ctx.strokeStyle = currentTheme === "dark" ? "#f87171" : "#dc2626";
      ctx.lineWidth = 2;
      ctx.beginPath();
      firstPoint = true;

      state.timeSeriesData.forEach((point) => {
        if (point.time >= minTime && point.time <= maxTime) {
          const x =
            paddingLeft + ((point.time - minTime) / timeWindow) * plotWidth;
          const y =
            paddingTop + plotHeight - (point.tuna / maxPop) * plotHeight;
          if (firstPoint) {
            ctx.moveTo(x, y);
            firstPoint = false;
          } else {
            ctx.lineTo(x, y);
          }
        }
      });
      ctx.stroke();
    },
    [currentTheme],
  );

  // Animation loop
  const animationLoop = useCallback(() => {
    const state = animationStateRef.current;
    if (!state.isRunning) return;

    const { alpha, beta, c, h, m, q, speed } = state.params;
    if (speed === 0) {
      state.animationId = requestAnimationFrame(animationLoop);
      return;
    }

    const dt = 0.05 * speed;

    // Update trajectories
    state.trajectories = state.trajectories.map((traj) => {
      if (!traj.isActive) return traj;

      // Holling-Tanner differential equations
      const computeDerivatives = (s, t) => {
        const dsdt = alpha * s * (1 - s / (q * t));
        const dtdt = beta * t * (1 - t / m) - (c * s * t) / (h + t);
        return [dsdt, dtdt];
      };

      const [s_curr, t_curr] = [traj.s, traj.t];

      // RK4 integration
      const k1 = computeDerivatives(s_curr, t_curr);
      const k2 = computeDerivatives(
        s_curr + (dt * k1[0]) / 2,
        t_curr + (dt * k1[1]) / 2,
      );
      const k3 = computeDerivatives(
        s_curr + (dt * k2[0]) / 2,
        t_curr + (dt * k2[1]) / 2,
      );
      const k4 = computeDerivatives(s_curr + dt * k3[0], t_curr + dt * k3[1]);

      let newS = Math.max(
        0,
        s_curr + (dt / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]),
      );
      let newT = Math.max(
        0,
        t_curr + (dt / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]),
      );

      const isInBounds = newS <= smax && newT <= tmax;
      const newTrail = [...traj.trail.slice(-150), { x: newS, y: newT }];

      return {
        ...traj,
        s: newS,
        t: newT,
        trail: newTrail,
        isActive: isInBounds,
      };
    });

    state.time += dt;

    // Update React time state periodically
    if (Math.floor(state.time * 10) !== Math.floor((state.time - dt) * 10)) {
      setCurrentTime(state.time);
    }

    // Update time series data
    const activeTraj = state.trajectories.find((t) => t.isActive);
    if (activeTraj) {
      const currentS = activeTraj.s || 0;
      const currentT = activeTraj.t || 0;

      state.timeSeriesData = [
        ...state.timeSeriesData.slice(-500),
        {
          time: state.time,
          sharks: currentS,
          tuna: currentT,
        },
      ];
    }

    // Draw only dynamic elements (efficient!)
    const dynamicCanvas = dynamicCanvasRef.current;
    const timeCanvas = timeSeriesCanvasRef.current;

    if (dynamicCanvas) {
      const ctx = dynamicCanvas.getContext("2d");
      drawDynamicElements(dynamicCanvas, ctx);
    }

    if (timeCanvas) {
      const ctx = timeCanvas.getContext("2d");
      drawTimeSeries(timeCanvas, ctx);
    }

    // Continue animation
    state.animationId = requestAnimationFrame(animationLoop);
  }, [drawDynamicElements, drawTimeSeries]);

  // Control functions
  const startAnimation = useCallback(() => {
    if (animationStateRef.current.isRunning) return;
    animationStateRef.current.isRunning = true;
    setIsAnimating(true);
    animationLoop();
  }, [animationLoop]);

  const stopAnimation = useCallback(() => {
    animationStateRef.current.isRunning = false;
    setIsAnimating(false);
    if (animationStateRef.current.animationId) {
      cancelAnimationFrame(animationStateRef.current.animationId);
      animationStateRef.current.animationId = null;
    }
  }, []);

  // Canvas click handler
  const handleCanvasClick = useCallback(
    (event) => {
      const canvas = dynamicCanvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      const paddingLeft = 45;
      const paddingRight = 15;
      const paddingTop = 15;
      const paddingBottom = 35;

      const plotWidth = rect.width - paddingLeft - paddingRight;
      const plotHeight = rect.height - paddingTop - paddingBottom;

      if (
        x < paddingLeft ||
        x > paddingLeft + plotWidth ||
        y < paddingTop ||
        y > paddingTop + plotHeight
      )
        return;

      const dataX = ((x - paddingLeft) / plotWidth) * smax;
      const dataY = tmax - ((y - paddingTop) / plotHeight) * tmax;

      if (dataX < 0 || dataY < 0 || dataX > smax || dataY > tmax) return;

      const colorHues = [120, 240, 60, 300, 180, 0];
      const hue =
        colorHues[
          animationStateRef.current.trajectories.length % colorHues.length
        ];

      const newTrajectory = {
        id: Date.now() + Math.random(),
        s: dataX,
        t: dataY,
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

  // Reset simulation
  const resetSimulation = useCallback(() => {
    stopAnimation();
    animationStateRef.current.trajectories = [];
    animationStateRef.current.time = 0;
    animationStateRef.current.timeSeriesData = [];
    setCurrentTime(0);

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
    [staticCanvasRef, dynamicCanvasRef, timeSeriesCanvasRef].forEach((ref) => {
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
  }, [uiParams, showNullclines, drawStaticElements]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAnimation();
    };
  }, [stopAnimation]);

  return (
    <ToolContainer
      title="Holling-Tanner Predator-Prey Model"
      canvasWidth={10}
      canvasHeight={7}
    >
      {/* Main Phase Portrait */}
      <GridGraph
        x={0}
        y={0}
        w={5}
        h={5}
        xLabel="Sharks (S)"
        yLabel="Tuna (T)"
        xRange={[smin, smax]}
        yRange={[tmin, tmax]}
        xTicks={[0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0]}
        yTicks={[0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0]}
        theme={theme}
        tooltip="Click to start a trajectory from that point"
      >
        {/* Static background layer - vector field, nullclines, equilibrium points */}
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
          height={400}
        />
        {/* Dynamic foreground layer - trajectories and moving particles */}
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
          height={400}
          onClick={handleCanvasClick}
        />
      </GridGraph>

      {/* Time Series Plot */}
      <GridGraph
        x={0}
        y={5}
        w={5}
        h={2}
        xLabel="Time"
        yLabel="Population"
        xRange={[Math.max(0, currentTime - 20), Math.max(20, currentTime)]}
        yRange={[0, Math.max(smax, tmax)]}
        xTicks={[]}
        yTicks={[0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0]}
        theme={theme}
        tooltip="Population dynamics over time"
      >
        <canvas
          ref={timeSeriesCanvasRef}
          className="absolute"
          style={{
            left: 1,
            bottom: 1,
            width: "calc(100% - 2px)",
            height: "calc(100% - 2px)",
          }}
          width={600}
          height={240}
        />
      </GridGraph>

      {/* Parameter Controls - Mix of GridInputs and Sliders */}
      <GridInput
        x={5}
        y={0}
        value={uiParams.alpha}
        onChange={(value) => updateParam("alpha", value)}
        min={0.1}
        max={3.0}
        step={0.1}
        variable="α"
        title="Shark growth rate"
        theme={theme}
      />

      <GridInput
        x={6}
        y={0}
        value={uiParams.beta}
        onChange={(value) => updateParam("beta", value)}
        min={0.1}
        max={3.0}
        step={0.1}
        variable="β"
        title="Tuna growth rate"
        theme={theme}
      />

      <GridInput
        x={5}
        y={1}
        value={uiParams.c}
        onChange={(value) => updateParam("c", value)}
        min={0.1}
        max={3.0}
        step={0.1}
        variable="c"
        title="Predation rate"
        theme={theme}
      />

      <GridInput
        x={6}
        y={1}
        value={uiParams.h}
        onChange={(value) => updateParam("h", value)}
        min={0.1}
        max={3.0}
        step={0.1}
        variable="h"
        title="Half-saturation constant"
        theme={theme}
      />

      <GridInput
        x={5}
        y={2}
        value={uiParams.m}
        onChange={(value) => updateParam("m", value)}
        min={0.5}
        max={5.0}
        step={0.1}
        variable="m"
        title="Tuna carrying capacity"
        theme={theme}
      />

      <GridInput
        x={6}
        y={2}
        value={uiParams.q}
        onChange={(value) => updateParam("q", value)}
        min={0.5}
        max={5.0}
        step={0.1}
        variable="q"
        title="Shark carrying capacity"
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
        onPress={resetSimulation}
        variant="default"
        theme={theme}
      >
        <div style={{ textAlign: "center", lineHeight: "1.1" }}>
          <div>Reset</div>
        </div>
      </GridButton>

      <GridSliderHorizontal
        x={5}
        y={4}
        w={3}
        h={1}
        value={uiParams.speed * 25}
        onChange={(value) => updateParam("speed", value / 25)}
        variant="unipolar"
        label={`Animation Speed: ${uiParams.speed.toFixed(1)}x`}
        theme={theme}
      />

      {/* Equations Display */}
      <GridDisplay
        x={7}
        y={0}
        w={3}
        h={2}
        variant="info"
        align="center"
        fontSize="medium"
        theme={theme}
      >
        <div style={{ textAlign: "center", lineHeight: "1.6" }}>
          <div
            style={{
              fontWeight: "bold",
              marginBottom: "8px",
              color: currentTheme === "dark" ? "#60a5fa" : "#3b82f6",
            }}
          >
            Holling-Tanner Model
          </div>
          <div style={{ marginBottom: "4px", fontFamily: "monospace" }}>
            S' = αS(1 - S/qT)
          </div>
          <div style={{ fontFamily: "monospace" }}>
            T' = βT(1 - T/m) - cST/(h+T)
          </div>
        </div>
      </GridDisplay>

      {/* Equilibrium Display */}
      <GridDisplay
        x={7}
        y={2}
        w={3}
        h={2}
        variant="status"
        align="center"
        fontSize="small"
        theme={theme}
      >
        <div style={{ textAlign: "center", lineHeight: "1.4" }}>
          <div style={{ fontWeight: "bold", marginBottom: "6px" }}>
            Equilibrium Points
          </div>
          {equilibria.length > 0 ? (
            <>
              <div style={{ marginBottom: "4px", fontSize: "0.9em" }}>
                S* = {equilibria[equilibria.length - 1].x.toFixed(2)}
              </div>
              <div style={{ fontSize: "0.9em" }}>
                T* = {equilibria[equilibria.length - 1].y.toFixed(2)}
              </div>
            </>
          ) : (
            <div style={{ fontSize: "0.9em", opacity: 0.7 }}>
              No coexistence equilibrium
            </div>
          )}
        </div>
      </GridDisplay>

      {/* Status Display */}
      <GridDisplay
        x={5}
        y={5}
        w={5}
        h={2}
        variant="info"
        align="left"
        fontSize="small"
        theme={theme}
      >
        <div style={{ padding: "4px" }}>
          <div style={{ fontWeight: "bold", marginBottom: "4px" }}>
            Predator-Prey Simulation Status
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: "8px",
              fontSize: "0.85em",
            }}
          >
            <div>
              Active Trajectories:{" "}
              {
                animationStateRef.current.trajectories.filter((t) => t.isActive)
                  .length
              }
            </div>
            <div>Current Time: {currentTime.toFixed(1)}</div>
            <div>Animation: {isAnimating ? "Running" : "Stopped"}</div>
          </div>
          <div
            style={{
              marginTop: "4px",
              fontSize: "0.85em",
            }}
          >
            <div>
              Sharks:{" "}
              {animationStateRef.current.trajectories
                .find((t) => t.isActive)
                ?.s?.toFixed(2) || "0.00"}
            </div>
            <div>
              Tuna:{" "}
              {animationStateRef.current.trajectories
                .find((t) => t.isActive)
                ?.t?.toFixed(2) || "0.00"}
            </div>
          </div>
          <div style={{ marginTop: "6px", fontSize: "0.8em", opacity: 0.8 }}>
            <span
              style={{ color: currentTheme === "dark" ? "#60a5fa" : "#3b82f6" }}
            >
              Blue: Sharks
            </span>{" "}
            |{" "}
            <span
              style={{ color: currentTheme === "dark" ? "#f87171" : "#dc2626" }}
            >
              Red: Tuna
            </span>
            {showNullclines && " | Red lines: Nullclines"}
          </div>
        </div>
      </GridDisplay>
    </ToolContainer>
  );
};

export default HollingTannerTool;
