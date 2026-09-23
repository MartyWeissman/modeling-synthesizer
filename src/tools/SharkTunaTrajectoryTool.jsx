// src/tools/SharkTunaTrajectoryTool.jsx

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
import { setupCanvas } from "../utils/canvas";
import { linearTicks } from "../utils/ticks";
import {
  lotkaVolterraRHS,
  lotkaVolterraRate,
  lotkaVolterraEquilibria,
  advanceState,
  equilibriumColors,
} from "./predatorPreyModels";

// Display window
const SMIN = 0;
const SMAX = 50;
const TMIN = 0;
const TMAX = 50;

// Model time advanced per real second at speed 1. The original loop stepped
// 0.05·speed per frame; at 60 frames/s that is 3·speed per second, so the
// visual speed at 60 Hz is unchanged, but it no longer depends on frame rate.
const MODEL_TIME_PER_SECOND = 3;
const TIME_SERIES_WINDOW = 20; // time units shown in the time series
const TRAIL_WINDOW = 60; // time units of trail kept in the phase portrait
const MAX_TRAIL_POINTS = 5000;
const SETTLED_SPEED = 1e-6; // |(S', T')| below this counts as at rest
const TRAJECTORY_HUES = [0, 120, 240, 60, 300, 180];

// Keep canvas coordinates sane for points far outside the window.
const clampPx = (v) => Math.max(-1e4, Math.min(1e4, v));

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

const SharkTunaTrajectoryTool = () => {
  const { theme, currentTheme } = useTheme();
  const isDark = currentTheme === "dark";
  const sharkColor = isDark ? "#fb923c" : "#ea580c"; // orange
  const tunaColor = isDark ? "#2dd4bf" : "#0d9488"; // teal

  // UI State - only for React components (lab-manual defaults)
  const [uiParams, setUiParams] = useState({
    p: 0.03,
    q: 0.04,
    beta: 0.6,
    delta: 0.4,
    speed: 2,
  });

  const [isAnimating, setIsAnimating] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
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

  // Equilibria, classified from the Jacobian (origin: saddle; interior: center)
  const equilibria = useMemo(
    () => lotkaVolterraEquilibria(uiParams),
    [uiParams],
  );
  const interior = equilibria.find((e) => e.interior) || null;

  // Static layer: vector field and equilibria
  const drawStaticElements = useCallback(() => {
    const canvas = staticCanvasRef.current;
    const transform = phaseTransformRef.current;
    if (!canvas || !transform) return;

    const { plotWidth, plotHeight, dataToPixel } = transform;
    const { ctx } = setupCanvas(canvas, {
      width: plotWidth,
      height: plotHeight,
    });
    const f = lotkaVolterraRHS(uiParams);

    ctx.clearRect(0, 0, plotWidth, plotHeight);

    // Vector field: 16x16 grid at coordinates 2, 5, 8, ..., 47
    const gridCoords = [
      2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35, 38, 41, 44, 47,
    ];
    ctx.strokeStyle = "rgba(150, 150, 150, 0.7)";
    ctx.fillStyle = "rgba(150, 150, 150, 0.7)";
    ctx.lineWidth = 1;

    for (const s of gridCoords) {
      for (const t of gridCoords) {
        const [ds, dt] = f(s, t);
        const magnitude = Math.hypot(ds, dt);
        if (magnitude === 0) continue;

        const pos = dataToPixel(s, t);
        const arrowLength = 18;
        const endX = pos.x + (ds / magnitude) * arrowLength;
        const endY = pos.y - (dt / magnitude) * arrowLength;

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

    // Equilibria, colored by type
    equilibria.forEach((eq) => {
      if (eq.x < SMIN || eq.x > SMAX || eq.y < TMIN || eq.y > TMAX) return;
      const pos = dataToPixel(eq.x, eq.y);
      const colors = equilibriumColors(eq);
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
    });
  }, [uiParams, equilibria]);

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
      const color = `hsl(${traj.hue}, 70%, 50%)`;
      if (traj.trail.length > 1) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        traj.trail.forEach((point, i) => {
          const pos = dataToPixel(point.x, point.y);
          if (i === 0) ctx.moveTo(clampPx(pos.x), clampPx(pos.y));
          else ctx.lineTo(clampPx(pos.x), clampPx(pos.y));
        });
        ctx.stroke();
      }

      // Current position (only drawn when inside the window)
      if (traj.s <= SMAX && traj.t <= TMAX) {
        const pos = dataToPixel(traj.s, traj.t);
        ctx.fillStyle = color;
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

  // One animation frame: advance every trajectory by real elapsed time.
  // Trajectories keep being integrated when they leave the 0–50 window
  // (only the drawing is clipped), so large orbits still close.
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
      const f = lotkaVolterraRHS(state.params);
      const rate = (s, t) => lotkaVolterraRate(state.params, s, t);
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
      // Nothing left to animate (every trajectory at rest or gone, or speed 0)
      setIsAnimating(false);
      return false;
    }
    return true;
  });

  const startAnimation = useCallback(() => {
    if (!loopRunning()) loopStart();
    setIsAnimating(true);
  }, [loopRunning, loopStart]);

  // Restart when the speed slider moves off 0 or a parameter changes
  useEffect(() => {
    if (
      uiParams.speed > 0 &&
      !loopRunning() &&
      animationStateRef.current.trajectories.some((t) => t.isActive)
    ) {
      startAnimation();
    }
  }, [uiParams, loopRunning, startAnimation]);

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
    setCurrentTime(0);
    setStatusTick((n) => n + 1);
    drawDynamicElements();
    drawTimeSeries();
  }, [loopStop, drawDynamicElements, drawTimeSeries]);

  const updateParam = useCallback((param, value) => {
    setUiParams((prev) => ({ ...prev, [param]: value }));
  }, []);

  const killPopulation = useCallback(
    (species, amount = 10) => {
      const state = animationStateRef.current;
      state.trajectories.forEach((traj) => {
        if (!traj.isActive) return;
        if (species === "sharks") traj.s = Math.max(0, traj.s - amount);
        else traj.t = Math.max(0, traj.t - amount);
        traj.trail.push({ x: traj.s, y: traj.t, time: state.time });
      });
      drawDynamicElements();
      drawTimeSeries();
      if (state.params.speed > 0) startAnimation();
    },
    [drawDynamicElements, drawTimeSeries, startAnimation],
  );

  // Redraw the static layer when parameters change
  useEffect(() => {
    drawStaticElements();
  }, [drawStaticElements]);

  // Redraw the dynamic layers after renders that move the time axis or
  // change the theme
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
  const activeCount = trajectories.filter((t) => t.isActive).length;

  let noInteriorReason = null;
  if (uiParams.p <= 0) noInteriorReason = "p = 0";
  else if (uiParams.q <= 0) noInteriorReason = "q = 0";

  return (
    <ToolContainer
      title="Shark-Tuna Trajectories"
      canvasWidth={11}
      canvasHeight={7}
    >
      {/* Main Phase Portrait */}
      <GridGraph
        x={0}
        y={0}
        w={5}
        h={5}
        xLabel="Shark Population (S)"
        yLabel="Tuna Population (T)"
        xRange={[SMIN, SMAX]}
        yRange={[TMIN, TMAX]}
        xTicks={[0, 10, 20, 30, 40, 50]}
        yTicks={[0, 10, 20, 30, 40, 50]}
        theme={theme}
        tooltip="Click to start a trajectory from that point"
      >
        {(transform) => {
          phaseTransformRef.current = transform;
          const { plotStyle } = transform;
          return (
            <>
              {/* Static background layer - vector field and equilibrium points */}
              <canvas
                ref={staticCanvasRef}
                className="absolute pointer-events-none"
                style={plotStyle}
              />

              {/* Dynamic foreground layer - trajectories and moving points */}
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
        yTicks={[0, 10, 20, 30, 40, 50]}
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
      <GridSliderHorizontal
        x={5}
        y={0}
        w={3}
        h={1}
        value={uiParams.p * 1000}
        onChange={(value) => updateParam("p", value / 1000)}
        variant="unipolar"
        label={`Predation Coefficient (p): ${uiParams.p.toFixed(4)}`}
        tooltip="p: benefit to the sharks from each shark–tuna interaction (the +pST term)"
        theme={theme}
      />

      <GridSliderHorizontal
        x={5}
        y={1}
        w={3}
        h={1}
        value={uiParams.q * 250}
        onChange={(value) => updateParam("q", value / 250)}
        variant="unipolar"
        label={`Consumption Rate (q): ${uiParams.q.toFixed(4)}`}
        tooltip="q: tuna lost to each shark–tuna interaction (the −qST term)"
        theme={theme}
      />

      <GridSliderHorizontal
        x={5}
        y={2}
        w={3}
        h={1}
        value={uiParams.beta * 50}
        onChange={(value) => updateParam("beta", value / 50)}
        variant="unipolar"
        label={`Tuna Growth Rate (β): ${uiParams.beta.toFixed(2)}`}
        theme={theme}
      />

      <GridSliderHorizontal
        x={5}
        y={3}
        w={3}
        h={1}
        value={uiParams.delta * 100}
        onChange={(value) => updateParam("delta", value / 100)}
        variant="unipolar"
        label={`Shark Death Rate (δ): ${uiParams.delta.toFixed(2)}`}
        theme={theme}
      />

      {/* Speed Control */}
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
              color: sharkColor,
              fontSize: "1.1em",
            }}
          >
            Lotka-Volterra Model
          </div>
          <div style={{ marginBottom: "0px", lineHeight: "1.2" }}>
            <Equation name="lotka-volterra-predator" size="medium" />
          </div>
          <div>
            <Equation name="lotka-volterra-prey" size="medium" />
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
          {interior ? (
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
                {interior.x.toFixed(1)}
              </div>
              <div style={{ fontSize: "0.9em", whiteSpace: "nowrap" }}>
                <Equation
                  name="equilibrium-t"
                  size="small"
                  style={{ marginRight: "4px" }}
                />
                {interior.y.toFixed(1)}
              </div>
              <div
                style={{
                  marginTop: "4px",
                  fontSize: "0.9em",
                  fontWeight: "bold",
                  color: isDark
                    ? equilibriumColors(interior).textDark
                    : equilibriumColors(interior).text,
                }}
              >
                {capitalize(interior.type)}
              </div>
            </>
          ) : (
            <div style={{ fontSize: "0.9em", opacity: 0.7 }}>
              {noInteriorReason
                ? `No coexistence equilibrium when ${noInteriorReason}`
                : "Only the origin (0, 0)"}
            </div>
          )}
        </div>
      </GridDisplay>

      {/* Control Buttons */}
      <GridButton
        x={8}
        y={4}
        w={1}
        h={1}
        onPress={resetSimulation}
        variant="default"
        theme={theme}
      >
        Reset
      </GridButton>

      <GridButton
        x={9}
        y={4}
        w={1}
        h={1}
        onPress={() => killPopulation("tuna", 10)}
        variant="default"
        theme={theme}
      >
        <div style={{ textAlign: "center", lineHeight: "1.1" }}>
          <div>Kill</div>
          <div>10</div>
          <div>Tuna</div>
        </div>
      </GridButton>

      <GridButton
        x={10}
        y={4}
        w={1}
        h={1}
        onPress={() => killPopulation("sharks", 10)}
        variant="default"
        theme={theme}
      >
        <div style={{ textAlign: "center", lineHeight: "1.1" }}>
          <div>Kill</div>
          <div>10</div>
          <div>Sharks</div>
        </div>
      </GridButton>

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
            Simulation Status
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: "8px",
              fontSize: "0.85em",
            }}
          >
            <div>Active Trajectories: {activeCount}</div>
            <div>Current Time: {currentTime.toFixed(1)}</div>
            <div>Animation: {isAnimating ? "Running" : "Stopped"}</div>
          </div>
          <div style={{ marginTop: "4px", fontSize: "0.8em", opacity: 0.8 }}>
            Time series (latest trajectory):{" "}
            <span style={{ color: sharkColor, fontWeight: "bold" }}>
              Sharks (solid)
            </span>{" "}
            |{" "}
            <span style={{ color: tunaColor, fontWeight: "bold" }}>
              Tuna (dashed)
            </span>
          </div>
          <div style={{ marginTop: "4px", fontSize: "0.8em", opacity: 0.8 }}>
            Click on the phase portrait to add trajectory starting points.
            Adjust parameters to see different population dynamics.
          </div>
        </div>
      </GridDisplay>
    </ToolContainer>
  );
};

export default SharkTunaTrajectoryTool;
