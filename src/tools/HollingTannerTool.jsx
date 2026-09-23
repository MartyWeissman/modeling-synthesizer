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
import Equation from "../components/Equation";
import { useTheme } from "../hooks/useTheme";
import { localPointer } from "../components/grid/pointer";
import { useAnimationLoop } from "../hooks/useAnimationLoop";
import { setupCanvas } from "../utils/canvas";
import { linearTicks } from "../utils/ticks";
import {
  hollingTannerRHS,
  hollingTannerRate,
  hollingTannerCoexistence,
  advanceState,
  equilibriumColors,
} from "./predatorPreyModels";

// Display window for Shark (S) and Tuna (T) populations
const SMIN = 0;
const SMAX = 6;
const TMIN = 0;
const TMAX = 6;

// Model time advanced per real second at speed 1. The original loop stepped
// 0.05·speed per frame; at 60 frames/s that is 3·speed per second, so the
// visual speed at 60 Hz is unchanged, but it no longer depends on frame rate.
const MODEL_TIME_PER_SECOND = 3;
const TIME_SERIES_WINDOW = 20; // time units shown in the time series
const TRAIL_WINDOW = 200; // time units of trail kept in the phase portrait
const MAX_TRAIL_POINTS = 5000;
const SETTLED_SPEED = 1e-6; // |(S', T')| below this counts as at rest
const TRAJECTORY_HUES = [120, 240, 60, 300, 180, 0]; // green first

// Keep canvas coordinates sane for points far outside the window.
const clampPx = (v) => Math.max(-1e4, Math.min(1e4, v));

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

const HollingTannerTool = () => {
  const { theme, currentTheme } = useTheme();
  const isDark = currentTheme === "dark";
  const sharkColor = isDark ? "#60a5fa" : "#3b82f6";
  const tunaColor = isDark ? "#f87171" : "#dc2626";

  // UI State - parameters for Holling-Tanner model (lab-manual defaults)
  const [uiParams, setUiParams] = useState({
    alpha: 0.1, // α - Shark intrinsic growth rate
    beta: 1.0, // β - Tuna intrinsic growth rate
    c: 0.5, // c - Maximum tuna-eating rate per shark
    h: 1.0, // h - Half-saturation constant
    m: 7.0, // m - Tuna carrying capacity
    q: 1.0, // q - Sharks supported per tuna (shark carrying capacity is qT)
    speed: 2, // Animation speed
  });

  const [isAnimating, setIsAnimating] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [showNullclines, setShowNullclines] = useState(false);
  const [, setStatusTick] = useState(0); // forces a status refresh

  // Canvas refs - separate static and dynamic layers for performance
  const staticCanvasRef = useRef(null);
  const dynamicCanvasRef = useRef(null);
  const timeSeriesCanvasRef = useRef(null);

  // Transform refs for coordinate conversion
  const phaseTransformRef = useRef(null);
  const timeSeriesTransformRef = useRef(null);
  const timeSeriesRangeRef = useRef([0, TIME_SERIES_WINDOW]);

  // Animation state - pure refs, never cause React re-renders
  const animationStateRef = useRef({
    trajectories: [],
    time: 0,
    lastUiUpdate: 0,
    params: { ...uiParams },
  });

  useEffect(() => {
    animationStateRef.current.params = { ...uiParams };
  }, [uiParams]);

  // Coexistence equilibrium, classified from the Jacobian
  const coexistence = useMemo(
    () => hollingTannerCoexistence(uiParams),
    [uiParams],
  );
  const coexistenceInWindow =
    coexistence !== null &&
    coexistence.x >= SMIN &&
    coexistence.x <= SMAX &&
    coexistence.y >= TMIN &&
    coexistence.y <= TMAX;

  // Static layer: vector field, nullclines, equilibrium
  const drawStaticElements = useCallback(() => {
    const canvas = staticCanvasRef.current;
    const transform = phaseTransformRef.current;
    if (!canvas || !transform) return;

    const { plotWidth, plotHeight, dataToPixel } = transform;
    const { ctx } = setupCanvas(canvas, {
      width: plotWidth,
      height: plotHeight,
    });
    const { beta, c, h, m, q } = uiParams;
    const f = hollingTannerRHS(uiParams);

    ctx.clearRect(0, 0, plotWidth, plotHeight);

    // Vector field
    const gridCoords = [
      0.2, 0.6, 1.0, 1.4, 1.8, 2.2, 2.6, 3.0, 3.4, 3.8, 4.2, 4.6, 5.0, 5.4,
      5.8,
    ];
    const arrowColor = isDark
      ? "rgba(156, 163, 175, 0.7)"
      : "rgba(107, 114, 128, 0.7)";
    ctx.strokeStyle = arrowColor;
    ctx.fillStyle = arrowColor;
    ctx.lineWidth = 1;

    for (const s of gridCoords) {
      for (const t of gridCoords) {
        const [dsdt, dtdt] = f(s, t);
        const magnitude = Math.hypot(dsdt, dtdt);
        if (magnitude === 0 || !Number.isFinite(magnitude)) continue;

        const pos = dataToPixel(s, t);
        const arrowLength = 18;
        const endX = pos.x + (dsdt / magnitude) * arrowLength;
        const endY = pos.y - (dtdt / magnitude) * arrowLength;

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

    // Nullclines (dashed, so they are not confused with trajectories)
    if (showNullclines) {
      ctx.save();
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 5]);

      // S-nullcline: S = 0 or S = qT (a line through the origin)
      ctx.strokeStyle = sharkColor;
      ctx.beginPath();
      const p0 = dataToPixel(0, 0);
      const p1 = dataToPixel(q * TMAX, TMAX);
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(clampPx(p1.x), clampPx(p1.y));
      ctx.stroke();

      // T-nullcline: T = 0 or S = β(1 − T/m)(h + T)/c (a parabola in T)
      ctx.strokeStyle = tunaColor;
      ctx.beginPath();
      const tEnd = Math.min(m, TMAX);
      const n = 300;
      for (let i = 0; i <= n; i++) {
        const t = (i / n) * tEnd;
        const s = (beta * (1 - t / m) * (h + t)) / c;
        const pos = dataToPixel(s, t);
        if (i === 0) ctx.moveTo(clampPx(pos.x), clampPx(pos.y));
        else ctx.lineTo(clampPx(pos.x), clampPx(pos.y));
      }
      ctx.stroke();
      ctx.restore();
    }

    // Coexistence equilibrium, colored by its type
    if (coexistence && coexistenceInWindow) {
      const pos = dataToPixel(coexistence.x, coexistence.y);
      const colors = equilibriumColors(coexistence);
      ctx.fillStyle = colors.fill;
      ctx.strokeStyle = colors.stroke;
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
  }, [
    uiParams,
    isDark,
    showNullclines,
    sharkColor,
    tunaColor,
    coexistence,
    coexistenceInWindow,
  ]);

  // Dynamic layer: trajectories
  const drawDynamicElements = useCallback(() => {
    const canvas = dynamicCanvasRef.current;
    const transform = phaseTransformRef.current;
    if (!canvas || !transform) return;

    const { plotWidth, plotHeight, dataToPixel } = transform;
    const { ctx } = setupCanvas(canvas, {
      width: plotWidth,
      height: plotHeight,
    });
    ctx.clearRect(0, 0, plotWidth, plotHeight);

    animationStateRef.current.trajectories.forEach((traj) => {
      if (traj.trail.length > 1) {
        ctx.strokeStyle = `hsl(${traj.hue}, 70%, 50%)`;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        traj.trail.forEach((point, index) => {
          const pos = dataToPixel(point.x, point.y);
          if (index === 0) ctx.moveTo(clampPx(pos.x), clampPx(pos.y));
          else ctx.lineTo(clampPx(pos.x), clampPx(pos.y));
        });
        ctx.stroke();
        ctx.globalAlpha = 1.0;
      }

      // Current position (only drawn when inside the window)
      if (traj.s <= SMAX && traj.t <= TMAX) {
        const pos = dataToPixel(traj.s, traj.t);
        ctx.fillStyle = `hsl(${traj.hue}, 70%, 40%)`;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 4, 0, 2 * Math.PI);
        ctx.fill();
      }
    });
  }, []);

  // Time series of the most recently started trajectory
  const drawTimeSeries = useCallback(() => {
    const canvas = timeSeriesCanvasRef.current;
    const transform = timeSeriesTransformRef.current;
    if (!canvas || !transform) return;

    const { plotWidth, plotHeight } = transform;
    const { ctx } = setupCanvas(canvas, {
      width: plotWidth,
      height: plotHeight,
    });
    ctx.clearRect(0, 0, plotWidth, plotHeight);

    const trajectories = animationStateRef.current.trajectories;
    const traj = trajectories[trajectories.length - 1];
    if (!traj || traj.trail.length < 2) return;

    // Same window as the axes that are currently rendered
    const [minTime, maxTime] = timeSeriesRangeRef.current;
    const span = maxTime - minTime;
    const maxPop = Math.max(SMAX, TMAX);
    const toPixel = (time, value) => ({
      x: ((time - minTime) / span) * plotWidth,
      y: clampPx(plotHeight - (value / maxPop) * plotHeight),
    });

    const drawSeries = (key, color, dash) => {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.setLineDash(dash);
      ctx.beginPath();
      let first = true;
      for (const point of traj.trail) {
        if (point.time < minTime - 1) continue;
        const pos = toPixel(point.time, point[key]);
        if (first) {
          ctx.moveTo(pos.x, pos.y);
          first = false;
        } else {
          ctx.lineTo(pos.x, pos.y);
        }
      }
      ctx.stroke();
      ctx.restore();
    };

    drawSeries("x", sharkColor, []); // sharks: solid
    drawSeries("y", tunaColor, [6, 4]); // tuna: dashed
  }, [sharkColor, tunaColor]);

  // One animation frame: advance every trajectory by real elapsed time
  const {
    start: loopStart,
    stop: loopStop,
    isRunning: loopRunning,
  } = useAnimationLoop((dtSeconds, now) => {
    const state = animationStateRef.current;
    const { speed } = state.params;
    const dtModel = dtSeconds * MODEL_TIME_PER_SECOND * speed;

    let anyMoving = false;
    if (dtModel > 0) {
      const f = hollingTannerRHS(state.params);
      const rate = (s, t) => hollingTannerRate(state.params, s, t);
      const newTime = state.time + dtModel;

      state.trajectories.forEach((traj) => {
        if (!traj.isActive) return;
        const next = advanceState(f, rate, traj.s, traj.t, dtModel);
        traj.s = next.s;
        traj.t = next.t;
        traj.trail.push({ x: next.s, y: next.t, time: newTime });

        // Trim by time, not by sample count
        const cutoff = newTime - TRAIL_WINDOW;
        let drop = 0;
        while (drop < traj.trail.length - 2 && traj.trail[drop].time < cutoff)
          drop++;
        if (traj.trail.length - drop > MAX_TRAIL_POINTS)
          drop = traj.trail.length - MAX_TRAIL_POINTS;
        if (drop > 0) traj.trail.splice(0, drop);

        if (next.blownUp) {
          traj.isActive = false;
          return;
        }
        const [ds, dt] = f(next.s, next.t);
        if (Math.hypot(ds, dt) > SETTLED_SPEED) anyMoving = true;
      });
      state.time = newTime;
    }

    drawDynamicElements();
    drawTimeSeries();

    const keepGoing = dtModel === 0 ? speed > 0 : anyMoving;
    if (!keepGoing || now - state.lastUiUpdate > 50) {
      state.lastUiUpdate = now;
      setCurrentTime(state.time);
    }
    if (!keepGoing) {
      // Nothing left to animate (all trajectories at rest, or speed 0)
      setIsAnimating(false);
      return false;
    }
    return true;
  });

  const startAnimation = useCallback(() => {
    if (!loopRunning()) loopStart();
    setIsAnimating(true);
    setIsPaused(false);
  }, [loopRunning, loopStart]);

  const pauseAnimation = useCallback(() => {
    loopStop();
    setIsAnimating(false);
    setIsPaused(true);
    setCurrentTime(animationStateRef.current.time);
  }, [loopStop]);

  const togglePause = useCallback(() => {
    if (loopRunning()) pauseAnimation();
    else if (animationStateRef.current.trajectories.some((t) => t.isActive))
      startAnimation();
  }, [loopRunning, pauseAnimation, startAnimation]);

  // Restart after the speed slider moves off 0 (or a parameter change sets a
  // settled trajectory moving again)
  useEffect(() => {
    if (
      uiParams.speed > 0 &&
      !isPaused &&
      !loopRunning() &&
      animationStateRef.current.trajectories.some((t) => t.isActive)
    ) {
      startAnimation();
    }
  }, [uiParams, isPaused, loopRunning, startAnimation]);

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
      if (data.x < 0 || data.y < 0 || data.x > SMAX || data.y > TMAX) return;

      const state = animationStateRef.current;
      state.trajectories.push({
        id: Date.now() + Math.random(),
        s: data.x,
        t: data.y,
        isActive: true,
        hue: TRAJECTORY_HUES[state.trajectories.length % TRAJECTORY_HUES.length],
        trail: [{ x: data.x, y: data.y, time: state.time }],
      });

      startAnimation();
    },
    [startAnimation],
  );

  // Reset: clear trajectories, time, and both dynamic canvases
  const resetSimulation = useCallback(() => {
    loopStop();
    const state = animationStateRef.current;
    state.trajectories = [];
    state.time = 0;
    timeSeriesRangeRef.current = [0, TIME_SERIES_WINDOW];
    setIsAnimating(false);
    setIsPaused(false);
    setCurrentTime(0);
    setStatusTick((n) => n + 1);
    drawDynamicElements();
    drawTimeSeries();
  }, [loopStop, drawDynamicElements, drawTimeSeries]);

  const updateParam = useCallback((param, value) => {
    setUiParams((prev) => ({ ...prev, [param]: value }));
  }, []);

  // Redraw the static layer when parameters, nullclines or theme change
  useEffect(() => {
    drawStaticElements();
  }, [drawStaticElements]);

  // Redraw the dynamic layers after renders that move the time axis or
  // change the theme (e.g. after the loop stops, or while paused)
  useEffect(() => {
    drawDynamicElements();
    drawTimeSeries();
  }, [currentTime, drawDynamicElements, drawTimeSeries]);

  // Time-series window, shared by the axes and the canvas
  const tsMin = Math.max(0, currentTime - TIME_SERIES_WINDOW);
  const tsMax = Math.max(TIME_SERIES_WINDOW, currentTime);
  timeSeriesRangeRef.current = [tsMin, tsMax];
  const tsTicks = linearTicks(tsMin, tsMax, 5);

  const trajectories = animationStateRef.current.trajectories;
  const latest = trajectories[trajectories.length - 1];
  const animationStatus = isAnimating
    ? "Running"
    : isPaused
      ? "Paused"
      : "Stopped";

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
        xRange={[SMIN, SMAX]}
        yRange={[TMIN, TMAX]}
        xTicks={[0, 1.0, 2.0, 3.0, 4.0, 5.0, 6.0]}
        yTicks={[0, 1.0, 2.0, 3.0, 4.0, 5.0, 6.0]}
        theme={theme}
        tooltip="Click to start a trajectory from that point"
      >
        {(transform) => {
          phaseTransformRef.current = transform;
          const { plotStyle } = transform;
          return (
            <>
              {/* Static background layer - vector field, nullclines, equilibrium */}
              <canvas
                ref={staticCanvasRef}
                className="absolute pointer-events-none"
                style={plotStyle}
              />
              {/* Dynamic foreground layer - trajectories */}
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
        yLabel="Population"
        xRange={[tsMin, tsMax]}
        yRange={[0, Math.max(SMAX, TMAX)]}
        xTicks={tsTicks}
        yTicks={[0, 2.0, 4.0, 6.0]}
        theme={theme}
        tooltip="Sharks (solid) and tuna (dashed) over time, for the most recent trajectory"
      >
        {(transform) => {
          timeSeriesTransformRef.current = transform;
          const { plotStyle } = transform;
          return (
            <canvas
              ref={timeSeriesCanvasRef}
              className="absolute pointer-events-none"
              style={plotStyle}
            />
          );
        }}
      </GridGraph>

      {/* Parameter Controls */}
      <GridInput
        x={5}
        y={0}
        value={uiParams.alpha}
        onChange={(value) => updateParam("alpha", value)}
        min={0.01}
        max={1.0}
        step={0.01}
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
        title="Maximum tuna-eating rate per shark"
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
        max={10.0}
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
        title="Sharks supported per tuna (shark carrying capacity is qT)"
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

      <GridButton
        x={8}
        y={4}
        w={1}
        h={1}
        onPress={togglePause}
        variant="default"
        tooltip={
          isPaused
            ? "Resume the trajectories"
            : "Pause the trajectories (click the plot to add more)"
        }
        theme={theme}
      >
        <div style={{ textAlign: "center", lineHeight: "1.1" }}>
          <div>{isPaused ? "Resume" : "Pause"}</div>
        </div>
      </GridButton>

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
        <div style={{ textAlign: "center", lineHeight: "2.0" }}>
          <div
            style={{
              fontWeight: "bold",
              marginBottom: "15px",
              color: sharkColor,
              fontSize: "1.1em",
            }}
          >
            Holling-Tanner Model
          </div>
          <div style={{ marginBottom: "0px", lineHeight: "1.2" }}>
            <Equation name="holling-tanner-predator" size="medium" />
          </div>
          <div>
            <Equation name="holling-tanner-prey" size="medium" />
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
            Coexistence Equilibrium
          </div>
          {coexistence ? (
            <>
              <div
                style={{
                  marginBottom: "4px",
                  fontSize: "0.9em",
                  whiteSpace: "nowrap",
                }}
              >
                <Equation
                  name="equilibrium-s"
                  size="small"
                  style={{ marginRight: "4px" }}
                />
                {coexistence.x.toFixed(2)}
              </div>
              <div style={{ fontSize: "0.9em", whiteSpace: "nowrap" }}>
                <Equation
                  name="equilibrium-t"
                  size="small"
                  style={{ marginRight: "4px" }}
                />
                {coexistence.y.toFixed(2)}
              </div>
              <div
                style={{
                  marginTop: "4px",
                  fontSize: "0.9em",
                  fontWeight: "bold",
                  color: equilibriumColors(coexistence).fill,
                }}
              >
                {capitalize(coexistence.type)}
                {!coexistenceInWindow && " (outside the plot)"}
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
            <div>Trajectories: {trajectories.length}</div>
            <div>Current Time: {currentTime.toFixed(1)}</div>
            <div>Animation: {animationStatus}</div>
          </div>
          <div style={{ marginTop: "4px", fontSize: "0.85em" }}>
            Latest trajectory: Sharks {latest ? latest.s.toFixed(2) : "–"},
            Tuna {latest ? latest.t.toFixed(2) : "–"}
          </div>
          <div style={{ marginTop: "6px", fontSize: "0.8em", opacity: 0.8 }}>
            Time series: <span style={{ color: sharkColor }}>Sharks (solid)</span>{" "}
            | <span style={{ color: tunaColor }}>Tuna (dashed)</span>
            {showNullclines && (
              <>
                {" "}
                | Nullclines (dashed):{" "}
                <span style={{ color: sharkColor }}>S′ = 0</span>,{" "}
                <span style={{ color: tunaColor }}>T′ = 0</span>
              </>
            )}
          </div>
        </div>
      </GridDisplay>
    </ToolContainer>
  );
};

export default HollingTannerTool;
