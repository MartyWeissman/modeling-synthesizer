// src/tools/GlycolysisTool.jsx

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
} from "../components/grid";
import ToolContainer from "../components/ui/ToolContainer";
import { useTheme } from "../hooks/useTheme";

const GlycolysisTool = () => {
  const { theme, currentTheme } = useTheme();

  // UI State - only for React components
  const [uiParams, setUiParams] = useState({
    v: 1.0, // Glucose input rate
    c: 2.5, // Enzyme rate constant
    k: 1.0, // ADP utilization rate
    speed: 2, // Animation speed
  });

  const [isAnimating, setIsAnimating] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [showNullclines, setShowNullclines] = useState(false);
  const [showPeriod, setShowPeriod] = useState(false);
  const [detectedPeriod, setDetectedPeriod] = useState(null);

  // Canvas refs
  const vectorFieldCanvasRef = useRef(null);
  const timeSeriesCanvasRef = useRef(null);

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
      lastF: null,
      referenceLine: null,
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

  // Display constants for F6P and ADP concentrations
  const fmin = 0,
    fmax = 3;
  const amin = 0,
    amax = 3;

  // Equilibrium points for Higgins-Sel'kov model
  const equilibria = useMemo(() => {
    const { v, c, k } = uiParams;
    const points = [];

    // Intersection of nullclines: cFA² = v and cFA = k
    // From cFA = k: A = k/(cF)
    // Substitute into cFA² = v: cF(k/(cF))² = v => k²/(cF) = v => F = k²/(cv)
    // Then: A = v/k

    if (v > 0 && c > 0 && k > 0) {
      const fEq = (k * k) / (c * v); // F* = k²/(cv)
      const aEq = v / k; // A* = v/k

      if (fEq > 0 && aEq > 0 && fEq <= fmax && aEq <= amax) {
        points.push({ x: fEq, y: aEq, stability: "unstable" }); // Typically unstable for oscillations
      }
    }

    return points;
  }, [uiParams]);

  // Pure animation functions
  const drawVectorField = useCallback(
    (canvas, ctx) => {
      const { width, height } = canvas;
      const { v, c, k } = animationStateRef.current.params;

      // Account for graph padding (matching GridGraph calculation)
      const paddingLeft = 45;
      const paddingRight = 15;
      const paddingTop = 15;
      const paddingBottom = 35;

      const plotWidth = width - paddingLeft - paddingRight;
      const plotHeight = height - paddingTop - paddingBottom;

      // Draw nullclines FIRST (behind everything else) - using animation state
      if (animationStateRef.current.showNullclines) {
        // Compute nullclines dynamically using current animation parameters
        const fNullcline = []; // cFA² = v
        const aNullcline = []; // cFA = k

        // F-nullcline: cFA² = v => A = sqrt(v/(cF))
        for (let f = 0.1; f <= fmax; f += 0.05) {
          if (c * f > 0) {
            const a = Math.sqrt(v / (c * f));
            if (a >= amin && a <= amax) {
              fNullcline.push({ x: f, y: a });
            }
          }
        }

        // A-nullcline: cFA = k => A = k/(cF)
        for (let f = 0.1; f <= fmax; f += 0.05) {
          if (c * f > 0) {
            const a = k / (c * f);
            if (a >= amin && a <= amax) {
              aNullcline.push({ x: f, y: a });
            }
          }
        }

        // Draw F-nullcline: cFA² = v (blue)
        if (fNullcline.length > 0) {
          ctx.strokeStyle = currentTheme === "dark" ? "#60a5fa" : "#3b82f6";
          ctx.lineWidth = 3;
          ctx.beginPath();
          fNullcline.forEach((point, i) => {
            const canvasX = paddingLeft + (point.x / fmax) * plotWidth;
            const canvasY =
              paddingTop + plotHeight - (point.y / amax) * plotHeight;
            if (i === 0) ctx.moveTo(canvasX, canvasY);
            else ctx.lineTo(canvasX, canvasY);
          });
          ctx.stroke();
        }

        // Draw A-nullcline: cFA = k (red)
        if (aNullcline.length > 0) {
          ctx.strokeStyle = currentTheme === "dark" ? "#f87171" : "#dc2626";
          ctx.lineWidth = 3;
          ctx.beginPath();
          aNullcline.forEach((point, i) => {
            const canvasX = paddingLeft + (point.x / fmax) * plotWidth;
            const canvasY =
              paddingTop + plotHeight - (point.y / amax) * plotHeight;
            if (i === 0) ctx.moveTo(canvasX, canvasY);
            else ctx.lineTo(canvasX, canvasY);
          });
          ctx.stroke();
        }
      }

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
          const f = gridCoords[i];
          const a = gridCoords[j];

          if (f < 0 || a < 0) continue;

          // Higgins-Sel'kov equations
          const df = v - c * f * a * a;
          const da = c * f * a * a - k * a;
          const magnitude = Math.sqrt(df * df + da * da);

          if (magnitude === 0) continue;

          const normalizedDx = df / magnitude;
          const normalizedDy = da / magnitude;

          const canvasX = paddingLeft + (f / fmax) * plotWidth;
          const canvasY = paddingTop + plotHeight - (a / amax) * plotHeight;
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

      // Draw period reference line when period detection is active
      if (
        animationStateRef.current.showPeriod &&
        animationStateRef.current.periodData.referenceLine !== null
      ) {
        const fEq = animationStateRef.current.periodData.referenceLine;
        if (fEq >= 0 && fEq <= fmax) {
          const canvasX = paddingLeft + (fEq / fmax) * plotWidth;

          ctx.strokeStyle = currentTheme === "dark" ? "#a78bfa" : "#8b5cf6";
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          ctx.beginPath();
          ctx.moveTo(canvasX, paddingTop);
          ctx.lineTo(canvasX, paddingTop + plotHeight);
          ctx.stroke();
          ctx.setLineDash([]); // Reset line dash
        }
      }

      // Draw equilibrium point - computed dynamically using animation parameters
      if (v > 0 && c > 0 && k > 0) {
        const fEq = (k * k) / (c * v); // F* = k²/(cv)
        const aEq = v / k; // A* = v/k

        if (fEq > 0 && aEq > 0 && fEq <= fmax && aEq <= amax) {
          const canvasX = paddingLeft + (fEq / fmax) * plotWidth;
          const canvasY = paddingTop + plotHeight - (aEq / amax) * plotHeight;

          ctx.fillStyle = "#f59e0b"; // Always unstable for oscillations
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

      // Draw trajectories
      const state = animationStateRef.current;
      state.trajectories.forEach((traj) => {
        if (!traj.trail || traj.trail.length < 2) return;

        ctx.strokeStyle = traj.color;
        ctx.lineWidth = 2;
        ctx.beginPath();

        traj.trail.forEach((point, i) => {
          const x = paddingLeft + (point.x / fmax) * plotWidth;
          const y = paddingTop + plotHeight - (point.y / amax) * plotHeight;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Current position
        if (traj.isActive && traj.f !== undefined && traj.a !== undefined) {
          const currentX = paddingLeft + (traj.f / fmax) * plotWidth;
          const currentY =
            paddingTop + plotHeight - (traj.a / amax) * plotHeight;
          ctx.fillStyle = traj.color;
          ctx.beginPath();
          ctx.arc(currentX, currentY, 4, 0, 2 * Math.PI);
          ctx.fill();
        }
      });
    },
    [currentTheme],
  );

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
      const maxConc = Math.max(fmax, amax);

      const paddingLeft = 45;
      const paddingRight = 15;
      const paddingTop = 15;
      const paddingBottom = 35;

      const plotWidth = width - paddingLeft - paddingRight;
      const plotHeight = height - paddingTop - paddingBottom;

      // Draw F6P concentration
      ctx.strokeStyle = currentTheme === "dark" ? "#60a5fa" : "#3b82f6";
      ctx.lineWidth = 2;
      ctx.beginPath();
      let firstPoint = true;
      state.timeSeriesData.forEach((point) => {
        if (point.time >= minTime && point.time <= maxTime) {
          const x =
            paddingLeft + ((point.time - minTime) / timeWindow) * plotWidth;
          const y =
            paddingTop + plotHeight - (point.f6p / maxConc) * plotHeight;
          if (firstPoint) {
            ctx.moveTo(x, y);
            firstPoint = false;
          } else {
            ctx.lineTo(x, y);
          }
        }
      });
      ctx.stroke();

      // Draw ADP concentration
      ctx.strokeStyle = currentTheme === "dark" ? "#f87171" : "#dc2626";
      ctx.lineWidth = 2;
      ctx.beginPath();
      firstPoint = true;
      state.timeSeriesData.forEach((point) => {
        if (point.time >= minTime && point.time <= maxTime) {
          const x =
            paddingLeft + ((point.time - minTime) / timeWindow) * plotWidth;
          const y =
            paddingTop + plotHeight - (point.adp / maxConc) * plotHeight;
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

    const { v, c, k, speed } = state.params;
    if (speed === 0) {
      state.animationId = requestAnimationFrame(animationLoop);
      return;
    }

    const h = 0.05 * speed;

    // Update trajectories
    state.trajectories = state.trajectories.map((traj) => {
      if (!traj.isActive) return traj;

      const f = (f_val, a_val) => [
        v - c * f_val * a_val * a_val, // dF/dt
        c * f_val * a_val * a_val - k * a_val, // dA/dt
      ];

      const [f_curr, a_curr] = [traj.f, traj.a];

      // RK4 integration
      const k1 = f(f_curr, a_curr);
      const k2 = f(f_curr + (h * k1[0]) / 2, a_curr + (h * k1[1]) / 2);
      const k3 = f(f_curr + (h * k2[0]) / 2, a_curr + (h * k2[1]) / 2);
      const k4 = f(f_curr + h * k3[0], a_curr + h * k3[1]);

      let newF = Math.max(
        0,
        f_curr + (h / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]),
      );
      let newA = Math.max(
        0,
        a_curr + (h / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]),
      );

      const isInBounds = newF <= fmax && newA <= amax;
      const newTrail = [...traj.trail.slice(-150), { x: newF, y: newA }];

      return {
        ...traj,
        f: newF,
        a: newA,
        trail: newTrail,
        isActive: isInBounds,
      };
    });

    state.time += h;

    // Update React time state periodically
    if (Math.floor(state.time * 10) !== Math.floor((state.time - h) * 10)) {
      setCurrentTime(state.time);
    }

    // Update time series data and detect periods
    const activeTraj = state.trajectories.find((t) => t.isActive);
    if (activeTraj) {
      const currentF = activeTraj.f || 0;
      const currentA = activeTraj.a || 0;

      state.timeSeriesData = [
        ...state.timeSeriesData.slice(-500),
        {
          time: state.time,
          f6p: currentF,
          adp: currentA,
        },
      ];

      // Period detection using Poincaré section (F6P crosses equilibrium upward)
      if (state.showPeriod && v > 0 && c > 0 && k > 0) {
        const fEq = (k * k) / (c * v); // Equilibrium F value
        state.periodData.referenceLine = fEq;

        if (state.periodData.lastF !== null) {
          // Detect upward crossing of equilibrium
          if (state.periodData.lastF < fEq && currentF >= fEq) {
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
        state.periodData.lastF = currentF;
      }
    }

    // Draw everything
    const vectorCanvas = vectorFieldCanvasRef.current;
    const timeCanvas = timeSeriesCanvasRef.current;

    if (vectorCanvas) {
      const ctx = vectorCanvas.getContext("2d");
      ctx.clearRect(0, 0, vectorCanvas.width, vectorCanvas.height);
      drawVectorField(vectorCanvas, ctx);
    }

    if (timeCanvas) {
      const ctx = timeCanvas.getContext("2d");
      drawTimeSeries(timeCanvas, ctx);
    }

    state.animationId = requestAnimationFrame(animationLoop);
  }, [drawVectorField, drawTimeSeries]);

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
      const canvas = vectorFieldCanvasRef.current;
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

      const dataX = ((x - paddingLeft) / plotWidth) * fmax;
      const dataY = amax - ((y - paddingTop) / plotHeight) * amax;

      if (dataX < 0 || dataY < 0 || dataX > fmax || dataY > amax) return;

      const colorHues = [0, 120, 240, 60, 300, 180];
      const hue =
        colorHues[
          animationStateRef.current.trajectories.length % colorHues.length
        ];

      const newTrajectory = {
        id: Date.now() + Math.random(),
        f: dataX,
        a: dataY,
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
    setCurrentTime(0);

    // Redraw static elements
    if (vectorFieldCanvasRef.current) {
      const ctx = vectorFieldCanvasRef.current.getContext("2d");
      ctx.clearRect(
        0,
        0,
        vectorFieldCanvasRef.current.width,
        vectorFieldCanvasRef.current.height,
      );
      drawVectorField(vectorFieldCanvasRef.current, ctx);
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
  }, [stopAnimation, drawVectorField]);

  const updateParam = useCallback((param, value) => {
    setUiParams((prev) => ({ ...prev, [param]: value }));
  }, []);

  // Initialize canvases
  useEffect(() => {
    [vectorFieldCanvasRef, timeSeriesCanvasRef].forEach((ref) => {
      if (ref.current) {
        const canvas = ref.current;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
      }
    });

    // Draw initial vector field
    if (vectorFieldCanvasRef.current) {
      const ctx = vectorFieldCanvasRef.current.getContext("2d");
      drawVectorField(vectorFieldCanvasRef.current, ctx);
    }
  }, [drawVectorField]);

  // Redraw vector field when parameters or display options change (whether animating or not)
  useEffect(() => {
    if (vectorFieldCanvasRef.current) {
      const ctx = vectorFieldCanvasRef.current.getContext("2d");
      ctx.clearRect(
        0,
        0,
        vectorFieldCanvasRef.current.width,
        vectorFieldCanvasRef.current.height,
      );
      drawVectorField(vectorFieldCanvasRef.current, ctx);
    }
  }, [uiParams, showNullclines, showPeriod, drawVectorField]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAnimation();
    };
  }, [stopAnimation]);

  return (
    <ToolContainer
      title="Higgins-Sel'kov Glycolysis Model"
      canvasWidth={11}
      canvasHeight={7}
    >
      {/* Main Phase Portrait */}
      <GridGraph
        x={0}
        y={0}
        w={5}
        h={5}
        xLabel="F6P Concentration (F)"
        yLabel="ADP Concentration (A)"
        xRange={[fmin, fmax]}
        yRange={[amin, amax]}
        xTicks={[0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0]}
        yTicks={[0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0]}
        theme={theme}
        tooltip="Click to start a trajectory from that point"
      >
        <canvas
          ref={vectorFieldCanvasRef}
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
        yLabel="Concentration"
        xRange={[Math.max(0, currentTime - 20), Math.max(20, currentTime)]}
        yRange={[0, Math.max(fmax, amax)]}
        xTicks={[]}
        yTicks={[0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0]}
        theme={theme}
        tooltip="Metabolite concentrations over time"
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

      {/* Parameter Controls */}
      <GridSliderHorizontal
        x={5}
        y={0}
        w={3}
        h={1}
        value={uiParams.v * 50}
        onChange={(value) => updateParam("v", value / 50)}
        variant="unipolar"
        label={`Glucose Input (v): ${uiParams.v.toFixed(2)}`}
        theme={theme}
      />

      <GridSliderHorizontal
        x={5}
        y={1}
        w={3}
        h={1}
        value={uiParams.c * 20}
        onChange={(value) => updateParam("c", value / 20)}
        variant="unipolar"
        label={`Enzyme Rate (c): ${uiParams.c.toFixed(2)}`}
        theme={theme}
      />

      <GridSliderHorizontal
        x={5}
        y={2}
        w={3}
        h={1}
        value={uiParams.k * 50}
        onChange={(value) => updateParam("k", value / 50)}
        variant="unipolar"
        label={`ADP Utilization (k): ${uiParams.k.toFixed(2)}`}
        theme={theme}
      />

      <GridSliderHorizontal
        x={5}
        y={3}
        w={3}
        h={1}
        value={uiParams.speed * 25}
        onChange={(value) => updateParam("speed", value / 25)}
        variant="unipolar"
        label={`Animation Speed: ${uiParams.speed.toFixed(1)}x`}
        theme={theme}
      />

      {/* Toggle Controls */}
      <GridButton
        x={5}
        y={4}
        w={1}
        h={1}
        onPress={() => setShowNullclines(!showNullclines)}
        variant={showNullclines ? "pressed" : "default"}
        theme={theme}
      >
        <div style={{ textAlign: "center", lineHeight: "1.1" }}>
          <div>{showNullclines ? "Hide" : "Show"}</div>
          <div>Nullclines</div>
        </div>
      </GridButton>

      <GridButton
        x={6}
        y={4}
        w={1}
        h={1}
        onPress={() => setShowPeriod(!showPeriod)}
        variant={showPeriod ? "pressed" : "default"}
        theme={theme}
      >
        <div style={{ textAlign: "center", lineHeight: "1.1" }}>
          <div>{showPeriod ? "Hide" : "Show"}</div>
          <div>Period</div>
        </div>
      </GridButton>

      <GridButton
        x={7}
        y={4}
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
        x={8}
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
            Higgins-Sel'kov Model
          </div>
          <div style={{ marginBottom: "4px", fontFamily: "monospace" }}>
            F' = v - cFA²
          </div>
          <div style={{ fontFamily: "monospace" }}>A' = cFA² - kA</div>
        </div>
      </GridDisplay>

      {/* Equilibrium Display */}
      <GridDisplay
        x={8}
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
            Equilibrium Point
          </div>
          {equilibria.length > 0 ? (
            <>
              <div style={{ marginBottom: "4px", fontSize: "0.9em" }}>
                F* = {equilibria[0].x.toFixed(2)}
              </div>
              <div style={{ fontSize: "0.9em" }}>
                A* = {equilibria[0].y.toFixed(2)}
              </div>
            </>
          ) : (
            <div style={{ fontSize: "0.9em", opacity: 0.7 }}>
              No equilibrium in range
            </div>
          )}
        </div>
      </GridDisplay>

      {/* Status Display */}
      <GridDisplay
        x={5}
        y={5}
        w={6}
        h={2}
        variant="info"
        align="left"
        fontSize="small"
        theme={theme}
      >
        <div style={{ padding: "4px" }}>
          <div style={{ fontWeight: "bold", marginBottom: "4px" }}>
            Glycolysis Simulation Status
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
          {showPeriod && detectedPeriod !== null && (
            <div
              style={{
                marginTop: "6px",
                fontSize: "0.85em",
                fontWeight: "bold",
              }}
            >
              <span
                style={{
                  color: currentTheme === "dark" ? "#a78bfa" : "#8b5cf6",
                }}
              >
                Detected Period: {detectedPeriod.toFixed(2)} time units
              </span>
            </div>
          )}
          <div style={{ marginTop: "6px", fontSize: "0.8em", opacity: 0.8 }}>
            <span
              style={{ color: currentTheme === "dark" ? "#60a5fa" : "#3b82f6" }}
            >
              Blue: F6P
            </span>{" "}
            |{" "}
            <span
              style={{ color: currentTheme === "dark" ? "#f87171" : "#dc2626" }}
            >
              Red: ADP
            </span>
            {showNullclines &&
              " | Nullclines: F-nullcline (blue), A-nullcline (red)"}
            {showPeriod && " | Purple dashed line: Poincaré section"}
          </div>
        </div>
      </GridDisplay>
    </ToolContainer>
  );
};

export default GlycolysisTool;
