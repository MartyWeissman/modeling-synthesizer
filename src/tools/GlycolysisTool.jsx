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
import Equation from "../components/Equation";
import { useTheme } from "../hooks/useTheme";
import { localPointer } from "../components/grid/pointer";
import { useAnimationLoop } from "../hooks/useAnimationLoop";
import { setupCanvas, clearCanvas } from "../utils/canvas";
import { classifyEquilibrium2D } from "../utils/stability";
import { linearTicks } from "../utils/ticks";

// Integration and animation constants.
// The model advances 0.05·speed time units per 1/60 s (the same visual speed
// as before at 60 Hz), in RK4 steps of at most MAX_STEP.
const TIME_PER_SECOND_PER_SPEED = 0.05 * 60;
const MAX_STEP = 0.1;
const TRAIL_TIME = 15; // time units of trail kept behind each trajectory
const SERIES_WINDOW = 20; // time units shown in the time series
// A trajectory stops (and no longer keeps the animation running) when it has
// escaped far outside the plot (F or A above ESCAPE_LIMIT) or has come to rest.
const ESCAPE_LIMIT = 30;
const REST_SPEED = 1e-6;

const GlycolysisTool = () => {
  const { theme, currentTheme } = useTheme();

  // UI State - only for React components
  const [uiParams, setUiParams] = useState({
    v: 1.0, // Glucose input rate
    c: 1.0, // Enzyme rate constant
    k: 1.0, // ADP utilization rate
    speed: 2, // Animation speed
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

  // Transform refs for coordinate conversion
  const phaseTransformRef = useRef(null);
  const timeSeriesTransformRef = useRef(null);

  // Animation state - pure refs, never cause React re-renders
  const animationStateRef = useRef({
    trajectories: [],
    time: 0,
    // Time series of ONE trajectory (trackedId); it restarts if tracking
    // switches, so data from different trajectories is never mixed.
    timeSeriesData: [],
    trackedId: null,
    params: { ...uiParams },
    showNullclines: showNullclines,
    showPeriod: showPeriod,
  });

  // Update animation parameters when UI changes. Period crossings recorded
  // with the old parameters (old equilibrium line) are discarded.
  useEffect(() => {
    const state = animationStateRef.current;
    state.params = { ...uiParams };
    state.trajectories.forEach((traj) => {
      traj.crossings = [];
      traj.lastF = null;
    });
    setDetectedPeriod(null);
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
        // Jacobian of (v − cFA², cFA² − kA) at the equilibrium.
        const J = [
          [-c * aEq * aEq, -2 * c * fEq * aEq],
          [c * aEq * aEq, 2 * c * fEq * aEq - k],
        ];
        const cls = classifyEquilibrium2D(J);
        points.push({ x: fEq, y: aEq, type: cls.type });
      }
    }

    return points;
  }, [uiParams]);

  // Static elements drawing function - only redraws when parameters change
  const drawStaticElements = useCallback(
    (canvas, ctx) => {
      const transform = phaseTransformRef.current;
      if (!transform) return;

      const { plotWidth, plotHeight, dataToPixel } = transform;
      const { v, c, k } = animationStateRef.current.params;
      ({ ctx } = setupCanvas(canvas, { width: plotWidth, height: plotHeight }));

      // Clear canvas
      ctx.clearRect(0, 0, plotWidth, plotHeight);

      // Draw nullclines FIRST (behind everything else) - using UI state for immediate response
      if (showNullclines) {
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
            const pos = dataToPixel(point.x, point.y);
            if (i === 0) ctx.moveTo(pos.x, pos.y);
            else ctx.lineTo(pos.x, pos.y);
          });
          ctx.stroke();
        }

        // Draw A-nullcline: cFA = k (red)
        if (aNullcline.length > 0) {
          ctx.strokeStyle = currentTheme === "dark" ? "#f87171" : "#dc2626";
          ctx.lineWidth = 3;
          ctx.setLineDash([9, 5]); // dashed, so it doesn't rely on color alone
          ctx.beginPath();
          aNullcline.forEach((point, i) => {
            const pos = dataToPixel(point.x, point.y);
            if (i === 0) ctx.moveTo(pos.x, pos.y);
            else ctx.lineTo(pos.x, pos.y);
          });
          ctx.stroke();
          ctx.setLineDash([]);
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

          const pos = dataToPixel(f, a);
          const arrowLength = 18;
          const endX = pos.x + normalizedDx * arrowLength;
          const endY = pos.y - normalizedDy * arrowLength;

          ctx.beginPath();
          ctx.moveTo(pos.x, pos.y);
          ctx.lineTo(endX, endY);
          ctx.stroke();

          // Arrowhead
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

      // Draw period reference line when period detection is active
      if (showPeriod && v > 0 && c > 0 && k > 0) {
        const fEq = (k * k) / (c * v);
        if (fEq >= 0 && fEq <= fmax) {
          const topPos = dataToPixel(fEq, amax);
          const bottomPos = dataToPixel(fEq, amin);

          ctx.strokeStyle = currentTheme === "dark" ? "#a78bfa" : "#8b5cf6";
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          ctx.beginPath();
          ctx.moveTo(topPos.x, topPos.y);
          ctx.lineTo(bottomPos.x, bottomPos.y);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      // Draw equilibrium point
      if (v > 0 && c > 0 && k > 0) {
        const fEq = (k * k) / (c * v);
        const aEq = v / k;

        if (fEq > 0 && aEq > 0 && fEq <= fmax && aEq <= amax) {
          const pos = dataToPixel(fEq, aEq);

          ctx.fillStyle = "#f59e0b";
          ctx.strokeStyle = "#d97706";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, 6, 0, 2 * Math.PI);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = "white";
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, 2.5, 0, 2 * Math.PI);
          ctx.fill();
        }
      }
    },
    [currentTheme, showNullclines, showPeriod],
  );

  // Dynamic elements drawing function - redraws every animation frame
  const drawDynamicElements = useCallback((canvas) => {
    const transform = phaseTransformRef.current;
    if (!canvas || !transform) return;

    const { plotWidth, plotHeight, dataToPixel } = transform;
    const { ctx } = setupCanvas(canvas, {
      width: plotWidth,
      height: plotHeight,
    });

    // Clear canvas
    ctx.clearRect(0, 0, plotWidth, plotHeight);

    // Draw trajectories only. Points outside the box are still integrated;
    // the canvas simply clips what lies outside it.
    const state = animationStateRef.current;
    state.trajectories.forEach((traj) => {
      if (!traj.trail || traj.trail.length < 2) return;

      ctx.strokeStyle = traj.color;
      ctx.lineWidth = 2;
      ctx.beginPath();

      traj.trail.forEach((point, i) => {
        const pos = dataToPixel(point.x, point.y);
        if (i === 0) ctx.moveTo(pos.x, pos.y);
        else ctx.lineTo(pos.x, pos.y);
      });
      ctx.stroke();

      // Current position
      if (traj.isActive) {
        const pos = dataToPixel(traj.f, traj.a);
        ctx.fillStyle = traj.color;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 4, 0, 2 * Math.PI);
        ctx.fill();
      }
    });
  }, []);

  // Draw time series (uses the time-series graph's own axis transform)
  const drawTimeSeries = useCallback(
    (canvas) => {
      const transform = timeSeriesTransformRef.current;
      if (!canvas || !transform) return;

      const { plotWidth, plotHeight, dataToPixel } = transform;
      const { ctx } = setupCanvas(canvas, {
        width: plotWidth,
        height: plotHeight,
      });
      const state = animationStateRef.current;

      ctx.clearRect(0, 0, plotWidth, plotHeight);

      if (state.timeSeriesData.length < 2) return;

      const drawSeries = (key, color, dash) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.setLineDash(dash);
        ctx.beginPath();
        state.timeSeriesData.forEach((point, i) => {
          const pos = dataToPixel(point.time, point[key]);
          if (i === 0) ctx.moveTo(pos.x, pos.y);
          else ctx.lineTo(pos.x, pos.y);
        });
        ctx.stroke();
        ctx.setLineDash([]);
      };

      // F6P (blue, solid) and ADP (red, dashed)
      drawSeries("f6p", currentTheme === "dark" ? "#60a5fa" : "#3b82f6", []);
      drawSeries("adp", currentTheme === "dark" ? "#f87171" : "#dc2626", [
        7, 4,
      ]);
    },
    [currentTheme],
  );

  const redrawDynamic = useCallback(() => {
    drawDynamicElements(dynamicCanvasRef.current);
    drawTimeSeries(timeSeriesCanvasRef.current);
  }, [drawDynamicElements, drawTimeSeries]);

  // One RK4 step of the Higgins-Sel'kov equations
  const rk4Step = (fv, av, h, v, c, k) => {
    const rhs = (F, A) => [v - c * F * A * A, c * F * A * A - k * A];
    const k1 = rhs(fv, av);
    const k2 = rhs(fv + (h * k1[0]) / 2, av + (h * k1[1]) / 2);
    const k3 = rhs(fv + (h * k2[0]) / 2, av + (h * k2[1]) / 2);
    const k4 = rhs(fv + h * k3[0], av + h * k3[1]);
    return [
      Math.max(0, fv + (h / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0])),
      Math.max(0, av + (h / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1])),
    ];
  };

  // Animation frame: advance by real elapsed time; stop when nothing moves.
  const loop = useAnimationLoop((dt) => {
    const state = animationStateRef.current;
    const { v, c, k, speed } = state.params;

    if (speed > 0) {
      const advance = TIME_PER_SECOND_PER_SPEED * speed * dt;
      const n = Math.max(1, Math.ceil(advance / MAX_STEP - 1e-9));
      const h = advance / n;
      const fEq = v > 0 && c > 0 && k > 0 ? (k * k) / (c * v) : null;

      for (let step = 0; step < n; step++) {
        state.time += h;
        state.trajectories.forEach((traj) => {
          if (!traj.isActive) return;
          const [newF, newA] = rk4Step(traj.f, traj.a, h, v, c, k);
          traj.f = newF;
          traj.a = newA;
          traj.trail.push({ x: newF, y: newA, t: state.time });

          // Period detection (Poincaré section: F crosses F* upward), kept
          // separately for each trajectory.
          if (fEq !== null) {
            if (traj.lastF !== null && traj.lastF < fEq && newF >= fEq) {
              traj.crossings.push(state.time);
              if (traj.crossings.length > 10) traj.crossings.shift();
            }
            traj.lastF = newF;
          }

          const dF = v - c * newF * newA * newA;
          const dA = c * newF * newA * newA - k * newA;
          if (newF > ESCAPE_LIMIT || newA > ESCAPE_LIMIT) {
            traj.isActive = false; // escaped to infinity
          } else if (Math.abs(dF) + Math.abs(dA) < REST_SPEED) {
            traj.isActive = false; // came to rest at an equilibrium
          }
        });
      }

      // Trim trails by time, not by number of points.
      const trailStart = state.time - TRAIL_TIME;
      state.trajectories.forEach((traj) => {
        let i = 0;
        while (i < traj.trail.length - 2 && traj.trail[i].t < trailStart) i++;
        if (i > 0) traj.trail.splice(0, i);
      });

      // Time series follows one trajectory; switch (and restart the series)
      // only when the tracked one stops.
      let tracked = state.trajectories.find((t) => t.id === state.trackedId);
      if (!tracked || !tracked.isActive) {
        const next = state.trajectories.find((t) => t.isActive);
        if (next && next !== tracked) {
          tracked = next;
          state.trackedId = next.id;
          state.timeSeriesData = [];
        }
      }
      if (tracked && tracked.isActive) {
        state.timeSeriesData.push({
          time: state.time,
          f6p: tracked.f,
          adp: tracked.a,
        });
        const seriesStart = state.time - SERIES_WINDOW - 1;
        let i = 0;
        while (
          i < state.timeSeriesData.length - 2 &&
          state.timeSeriesData[i].time < seriesStart
        )
          i++;
        if (i > 0) state.timeSeriesData.splice(0, i);
      }

      // Detected period of the tracked trajectory
      if (state.showPeriod && tracked && tracked.crossings.length >= 2) {
        const cr = tracked.crossings;
        const period = cr[cr.length - 1] - cr[cr.length - 2];
        setDetectedPeriod((prev) =>
          prev !== null && Math.abs(prev - period) < 1e-9 ? prev : period,
        );
      }

      setCurrentTime(state.time);
    }

    redrawDynamic();

    const anyActive = state.trajectories.some((t) => t.isActive);
    if (!anyActive) {
      setIsAnimating(false);
      setCurrentTime(state.time);
      return false;
    }
    return true;
  });

  const startAnimation = useCallback(() => {
    setIsAnimating(true);
    loop.start(); // never starts a second loop
  }, [loop]);

  // Canvas click handler
  const handleCanvasClick = useCallback(
    (event) => {
      const canvas = dynamicCanvasRef.current;
      const transform = phaseTransformRef.current;
      if (!canvas || !transform) return;

      // Pointer position in the canvas's own CSS pixels (stays correct when
      // ToolContainer scales the tool down to fit a narrow window)
      const { x, y } = localPointer(event, canvas);

      const { plotWidth, plotHeight, pixelToData } = transform;

      if (x < 0 || x > plotWidth || y < 0 || y > plotHeight) return;

      const data = pixelToData(x, y);

      if (data.x < 0 || data.y < 0 || data.x > fmax || data.y > amax) return;

      const state = animationStateRef.current;
      const colorHues = [120, 240, 60, 300, 180, 0];
      const hue = colorHues[state.trajectories.length % colorHues.length];

      if (state.trajectories.length === 0) {
        state.time = 0;
        state.timeSeriesData = [];
        state.trackedId = null;
        setCurrentTime(0);
      }

      state.trajectories.push({
        id: Date.now() + Math.random(),
        f: data.x,
        a: data.y,
        isActive: true,
        color: `hsl(${hue}, 70%, 50%)`,
        trail: [{ x: data.x, y: data.y, t: state.time }],
        crossings: [],
        lastF: null,
      });

      startAnimation();
    },
    [startAnimation],
  );

  const resetSimulation = useCallback(() => {
    loop.stop();
    setIsAnimating(false);
    const state = animationStateRef.current;
    state.trajectories = [];
    state.time = 0;
    state.timeSeriesData = [];
    state.trackedId = null;
    setCurrentTime(0);
    setDetectedPeriod(null);

    // Redraw static elements, clear the trajectory and time-series canvases
    if (staticCanvasRef.current) {
      const ctx = staticCanvasRef.current.getContext("2d");
      drawStaticElements(staticCanvasRef.current, ctx);
    }
    clearCanvas(dynamicCanvasRef.current);
    clearCanvas(timeSeriesCanvasRef.current);
  }, [loop, drawStaticElements]);

  const updateParam = useCallback((param, value) => {
    setUiParams((prev) => ({ ...prev, [param]: value }));
  }, []);

  // Draw static elements when transform becomes available
  useEffect(() => {
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

  // Redraw trajectories and time series when the theme changes (also while
  // stopped)
  useEffect(() => {
    redrawDynamic();
  }, [redrawDynamic]);

  // Time-series x-axis: the sliding 20-unit window, with ticks every 5 units
  const seriesMin = Math.max(0, currentTime - SERIES_WINDOW);
  const seriesMax = Math.max(SERIES_WINDOW, currentTime);
  const seriesTicks = linearTicks(seriesMin, seriesMax, 5);

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
        {(transform) => {
          phaseTransformRef.current = transform;
          const { plotStyle } = transform;
          return (
            <>
              {/* Static background layer - vector field, nullclines, equilibrium points */}
              <canvas
                ref={staticCanvasRef}
                className="absolute pointer-events-none"
                style={plotStyle}
              />

              {/* Dynamic foreground layer - trajectories and moving particles */}
              <canvas
                ref={dynamicCanvasRef}
                className="absolute cursor-crosshair"
                style={plotStyle}
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
        yLabel="Concentration"
        xRange={[seriesMin, seriesMax]}
        yRange={[0, Math.max(fmax, amax)]}
        xTicks={seriesTicks}
        yTicks={[0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0]}
        theme={theme}
        tooltip="Metabolite concentrations over time"
      >
        {(transform) => {
          timeSeriesTransformRef.current = transform;
          const { plotStyle } = transform;
          return (
            <canvas
              ref={timeSeriesCanvasRef}
              style={plotStyle}
            />
          );
        }}
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
        y={4}
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
        <div style={{ textAlign: "center", lineHeight: "2.0" }}>
          <div
            style={{
              fontWeight: "bold",
              marginBottom: "15px",
              color: currentTheme === "dark" ? "#60a5fa" : "#3b82f6",
              fontSize: "1.1em",
            }}
          >
            Higgins-Sel'kov Model
          </div>
          <div style={{ marginBottom: "0px", lineHeight: "1.2" }}>
            <Equation name="higgins-selkov-f6p" size="medium" />
          </div>
          <div>
            <Equation name="higgins-selkov-adp" size="medium" />
          </div>
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
              <div
                style={{
                  marginBottom: "4px",
                  fontSize: "0.9em",
                  whiteSpace: "nowrap",
                }}
              >
                <Equation
                  name="equilibrium-f"
                  size="small"
                  style={{ marginRight: "4px" }}
                />
                {equilibria[0].x.toFixed(2)}
              </div>
              <div style={{ fontSize: "0.9em", whiteSpace: "nowrap" }}>
                <Equation
                  name="equilibrium-a"
                  size="small"
                  style={{ marginRight: "4px" }}
                />
                {equilibria[0].y.toFixed(2)}
              </div>
              <div style={{ fontSize: "0.85em", marginTop: "2px" }}>
                Type (linearization): {equilibria[0].type}
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
              Red (dashed): ADP
            </span>
            {showNullclines &&
              " | Nullclines: F-nullcline (blue), A-nullcline (red, dashed)"}
            {showPeriod && " | Purple dashed line: Poincaré section"}
          </div>
        </div>
      </GridDisplay>
    </ToolContainer>
  );
};

export default GlycolysisTool;
