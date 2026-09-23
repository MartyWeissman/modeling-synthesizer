// src/tools/SimpleHarmonicOscillatorTool.jsx

import React, { useState, useRef, useEffect, useCallback } from "react";
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
import { useAnimationLoop } from "../hooks/useAnimationLoop";
import { localPointer } from "../components/grid/pointer";
import { setupCanvas } from "../utils/canvas";
import { classifyEquilibrium2D } from "../utils/stability";

// Integration step (model time units). Fixed for accuracy.
const DT = 0.01;
// Model time advanced per real second at speed 1×. The original loop took
// 2 steps of DT per frame at 60 frames/s, i.e. 1.2 time units per second; we
// keep that visual speed but advance by real elapsed time.
const SIM_RATE = 1.2;
// Time-series window (model time units).
const TIME_WINDOW = 20;
// Trails keep (about) one full orbit, but never more than this much time.
const MAX_TRAIL_TIME = 150;
// Store a trail point every this many integration steps.
const TRAIL_EVERY = 2;

// Display ranges for X and P
const xmin = -3,
  xmax = 3;
const pmin = -3,
  pmax = 3;

// One RK4 step of X' = uP, P' = -kX.
function rk4Step(x, p, u, k, dt) {
  const f = (xv, pv) => [u * pv, -k * xv];
  const k1 = f(x, p);
  const k2 = f(x + (dt * k1[0]) / 2, p + (dt * k1[1]) / 2);
  const k3 = f(x + (dt * k2[0]) / 2, p + (dt * k2[1]) / 2);
  const k4 = f(x + dt * k3[0], p + dt * k3[1]);
  return [
    x + (dt / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]),
    p + (dt / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]),
  ];
}

const emptyPeriodData = () => ({ crossingTimes: [], lastX: null });

const SimpleHarmonicOscillatorTool = () => {
  const { theme, currentTheme } = useTheme();

  // UI State - only for React components
  const [uiParams, setUiParams] = useState({
    u: 1.0, // Momentum coefficient
    k: 1.0, // Spring constant
    speed: 1, // Animation speed (default 1x for real-time)
  });

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
    stepAccumulator: 0,
    stepCount: 0,
    timeSeriesData: [],
    params: { ...uiParams },
    showPeriod: showPeriod,
    periodData: emptyPeriodData(),
  });

  // Update animation parameters when UI changes. When u or k change, a
  // period measured with the old values no longer applies: start over.
  useEffect(() => {
    const state = animationStateRef.current;
    const old = state.params;
    state.params = { ...uiParams };
    if (old.u !== uiParams.u || old.k !== uiParams.k) {
      state.periodData = emptyPeriodData();
      setDetectedPeriod(null);
    }
  }, [uiParams]);

  // Sync UI state to animation state; (re)start period detection fresh.
  useEffect(() => {
    const state = animationStateRef.current;
    state.showPeriod = showPeriod;
    state.periodData = emptyPeriodData();
    setDetectedPeriod(null);
  }, [showPeriod]);

  const clearAndSetup = (canvas) => {
    const setup = setupCanvas(canvas);
    if (!setup) return null;
    setup.ctx.clearRect(0, 0, setup.width, setup.height);
    return setup;
  };

  // Static elements drawing function - only redraws when parameters change
  const drawStaticElements = useCallback(() => {
    const canvas = staticCanvasRef.current;
    const transform = phaseTransformRef.current;
    if (!canvas || !transform) return;
    const setup = clearAndSetup(canvas);
    if (!setup) return;
    const { ctx } = setup;

    const { dataToPixel } = transform;
    const { u, k } = animationStateRef.current.params;

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

    // Equilibrium point at the origin; its type comes from the Jacobian
    // [[0, u], [-k, 0]] (a center for all u, k > 0).
    const eqType = classifyEquilibrium2D([
      [0, u],
      [-k, 0],
    ]).type;
    const eqPixel = dataToPixel(0, 0);

    ctx.fillStyle = "#10b981";
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

    ctx.font = "12px Arial";
    ctx.textAlign = "left";
    ctx.textBaseline = "bottom";
    ctx.fillStyle = currentTheme === "dark" ? "#6ee7b7" : "#047857";
    ctx.fillText(eqType, eqPixel.x + 9, eqPixel.y - 6);
  }, [currentTheme, showNullclines, showPeriod]);

  // Dynamic elements drawing function - redraws every animation frame
  const drawDynamicElements = useCallback(() => {
    const canvas = dynamicCanvasRef.current;
    const transform = phaseTransformRef.current;
    if (!canvas || !transform) return;
    const setup = clearAndSetup(canvas);
    if (!setup) return;
    const { ctx } = setup;
    const { dataToPixel } = transform;

    // Trajectories keep moving even when they leave the window; the canvas
    // simply clips whatever is drawn outside it.
    const state = animationStateRef.current;
    state.trajectories.forEach((traj) => {
      if (traj.trail.length >= 2) {
        ctx.strokeStyle = traj.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        traj.trail.forEach((point, i) => {
          const pixel = dataToPixel(point.x, point.y);
          if (i === 0) ctx.moveTo(pixel.x, pixel.y);
          else ctx.lineTo(pixel.x, pixel.y);
        });
        const head = dataToPixel(traj.x, traj.p);
        ctx.lineTo(head.x, head.y);
        ctx.stroke();
      }

      // Current position
      const pixel = dataToPixel(traj.x, traj.p);
      ctx.fillStyle = traj.color;
      ctx.beginPath();
      ctx.arc(pixel.x, pixel.y, 4, 0, 2 * Math.PI);
      ctx.fill();
    });
  }, []);

  // Draw spring-mass system (at rest before the first trajectory)
  const drawSpringMass = useCallback(() => {
    const canvas = springCanvasRef.current;
    if (!canvas) return;
    const setup = clearAndSetup(canvas);
    if (!setup) return;
    const { ctx, width, height } = setup;
    const state = animationStateRef.current;

    // The time series and spring follow the first trajectory
    const tracked = state.trajectories[0];
    const currentX = tracked ? tracked.x : 0;
    const { u } = state.params;

    // Map X position (-3 to 3) to vertical position in window; positive X
    // raises the ball (compresses the spring).
    const centerY = height / 2;
    const amplitude = height * 0.35;

    // Ball radius inversely proportional to u
    const ballRadius = 20 / (1 + u);
    const clampedX = Math.max(-3.5, Math.min(3.5, currentX));
    const ballY = centerY - (clampedX / 3) * amplitude;

    // Draw 3D helix spring
    const springCenterX = width / 2;
    const springTop = 10;
    const springRadius = 15; // Radius of the helix
    const springCoils = 10;
    const springLength = ballY - springTop - ballRadius;
    const pointsPerCoil = 20; // Resolution
    const totalPoints = springCoils * pointsPerCoil;

    // Draw helix with depth-based coloring
    for (let i = 1; i <= totalPoints; i++) {
      const t = i / pointsPerCoil; // Parameter along helix
      const y = springTop + (springLength * i) / totalPoints;
      const angle = t * 2 * Math.PI;
      const x = springCenterX + springRadius * Math.cos(angle);
      const z = springRadius * Math.sin(angle); // Depth component

      // Front of helix (z > 0) is thicker and more opaque
      const depthFactor = (z / springRadius + 1) / 2; // 0 to 1
      const lineWidth = 1.5 + depthFactor * 2; // 1.5 to 3.5
      const opacity = 0.4 + depthFactor * 0.6; // 0.4 to 1.0

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
  }, [currentTheme]);

  // Draw time series
  const drawTimeSeries = useCallback(() => {
    const canvas = timeSeriesCanvasRef.current;
    const transform = timeSeriesTransformRef.current;
    if (!canvas || !transform) return;
    const setup = clearAndSetup(canvas);
    if (!setup) return;
    const { ctx, width: plotWidth, height: plotHeight } = setup;
    const state = animationStateRef.current;

    const xColor = currentTheme === "dark" ? "#60a5fa" : "#3b82f6";
    const pColor = currentTheme === "dark" ? "#f87171" : "#dc2626";

    if (state.timeSeriesData.length >= 2) {
      const minTime = Math.max(0, state.time - TIME_WINDOW);
      const maxVal = 3;
      const minVal = -3;

      // Local helper for sliding time window (axes change dynamically)
      const toPixel = (t, val) => ({
        x: ((t - minTime) / TIME_WINDOW) * plotWidth,
        y: plotHeight - ((val - minVal) / (maxVal - minVal)) * plotHeight,
      });

      const drawSeries = (key, color, dash) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.setLineDash(dash);
        ctx.beginPath();
        let first = true;
        for (const point of state.timeSeriesData) {
          if (point.time < minTime) continue;
          const pixel = toPixel(point.time, point[key]);
          if (first) {
            ctx.moveTo(pixel.x, pixel.y);
            first = false;
          } else {
            ctx.lineTo(pixel.x, pixel.y);
          }
        }
        ctx.stroke();
        ctx.setLineDash([]);
      };

      drawSeries("position", xColor, []);
      drawSeries("momentum", pColor, [6, 4]);
    }

    // Compact one-row legend in the top-right corner of the plot
    ctx.font = "12px Arial";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    const labelX = "Position (X)";
    const labelP = "Momentum (P)";
    const sampleLen = 20;
    const gap = 4;
    const pad = 8;
    const wX = ctx.measureText(labelX).width;
    const wP = ctx.measureText(labelP).width;
    const legendWidth = pad + sampleLen + gap + wX + 12 + sampleLen + gap + wP + pad;
    const legendHeight = 20;
    const legendX = plotWidth - legendWidth - 4;
    const legendY = 4;

    ctx.fillStyle =
      currentTheme === "dark"
        ? "rgba(31, 41, 55, 0.85)"
        : "rgba(255, 255, 255, 0.85)";
    ctx.fillRect(legendX, legendY, legendWidth, legendHeight);
    ctx.strokeStyle =
      currentTheme === "dark" ? "rgba(255, 255, 255, 0.3)" : "rgba(0, 0, 0, 0.3)";
    ctx.lineWidth = 1;
    ctx.strokeRect(legendX, legendY, legendWidth, legendHeight);

    const midY = legendY + legendHeight / 2;
    const textColor = currentTheme === "dark" ? "#ffffff" : "#000000";

    let cx = legendX + pad;
    ctx.lineWidth = 2;
    ctx.strokeStyle = xColor;
    ctx.beginPath();
    ctx.moveTo(cx, midY);
    ctx.lineTo(cx + sampleLen, midY);
    ctx.stroke();
    cx += sampleLen + gap;
    ctx.fillStyle = textColor;
    ctx.fillText(labelX, cx, midY);
    cx += wX + 12;

    ctx.strokeStyle = pColor;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(cx, midY);
    ctx.lineTo(cx + sampleLen, midY);
    ctx.stroke();
    ctx.setLineDash([]);
    cx += sampleLen + gap;
    ctx.fillText(labelP, cx, midY);
  }, [currentTheme]);

  const drawAnimated = useCallback(() => {
    drawDynamicElements();
    drawTimeSeries();
    drawSpringMass();
  }, [drawDynamicElements, drawTimeSeries, drawSpringMass]);

  // Advance the model by one integration step
  const stepOnce = () => {
    const state = animationStateRef.current;
    const { u, k } = state.params;
    const prevTime = state.time;
    state.time += DT;
    state.stepCount += 1;
    const keepTrail = state.stepCount % TRAIL_EVERY === 0;

    // Trail length: about one orbit (the orbit is closed), capped.
    const orbitTime = (2 * Math.PI) / Math.sqrt(u * k);
    const trailWindow = Math.min(MAX_TRAIL_TIME, 1.02 * orbitTime);

    for (const traj of state.trajectories) {
      const [newX, newP] = rk4Step(traj.x, traj.p, u, k, DT);
      traj.x = newX;
      traj.p = newP;
      if (keepTrail) {
        traj.trail.push({ t: state.time, x: newX, y: newP });
        const cutoff = state.time - trailWindow;
        if (traj.trail.length > 1 && traj.trail[0].t < cutoff) {
          let n = 0;
          while (n < traj.trail.length - 1 && traj.trail[n].t < cutoff) n++;
          traj.trail.splice(0, n);
        }
      }
    }

    const tracked = state.trajectories[0];
    if (!tracked) return;

    // Time series: keep only what the time window can show
    state.timeSeriesData.push({
      time: state.time,
      position: tracked.x,
      momentum: tracked.p,
    });
    const tsCutoff = state.time - TIME_WINDOW - 0.5;
    if (state.timeSeriesData[0].time < tsCutoff) {
      let n = 0;
      while (
        n < state.timeSeriesData.length - 1 &&
        state.timeSeriesData[n].time < tsCutoff
      )
        n++;
      state.timeSeriesData.splice(0, n);
    }

    // Period detection: upward crossings of X = 0 (with P > 0). The crossing
    // time is interpolated within the step, so the period does not jitter
    // with the step size.
    if (state.showPeriod) {
      const pd = state.periodData;
      const x = tracked.x;
      if (pd.lastX !== null && pd.lastX < 0 && x >= 0 && tracked.p > 0) {
        const frac = -pd.lastX / (x - pd.lastX);
        pd.crossingTimes.push(prevTime + frac * DT);
        if (pd.crossingTimes.length > 10)
          pd.crossingTimes = pd.crossingTimes.slice(-10);
        if (pd.crossingTimes.length >= 2) {
          const [a, b] = pd.crossingTimes.slice(-2);
          setDetectedPeriod(b - a);
        }
      }
      pd.lastX = x;
    }
  };

  // Animation loop: advances model time in proportion to real elapsed time
  const loop = useAnimationLoop((dtSeconds) => {
    const state = animationStateRef.current;
    const { speed } = state.params;
    if (state.trajectories.length === 0 || speed <= 0) {
      drawAnimated();
      return false; // nothing to animate: stop until restarted
    }

    state.stepAccumulator += dtSeconds * SIM_RATE * speed;
    const oldTime = state.time;
    let steps = 0;
    // Guard against huge catch-up bursts (dt is already clamped by the hook)
    while (state.stepAccumulator >= DT && steps < 2000) {
      stepOnce();
      state.stepAccumulator -= DT;
      steps++;
    }

    // Update React time state periodically
    if (Math.floor(state.time * 10) !== Math.floor(oldTime * 10)) {
      setCurrentTime(state.time);
    }

    drawAnimated();
    return true;
  });
  const { start: startLoop, stop: stopLoop } = loop;

  // Restart the loop when speed goes back above zero
  useEffect(() => {
    if (uiParams.speed > 0 && animationStateRef.current.trajectories.length) {
      startLoop();
    }
  }, [uiParams.speed, startLoop]);

  // Canvas click handler
  const handleCanvasClick = useCallback(
    (event) => {
      const canvas = dynamicCanvasRef.current;
      const transform = phaseTransformRef.current;
      if (!canvas || !transform) return;

      const { pixelToData, plotWidth, plotHeight } = transform;

      // Pointer position in the canvas's own CSS pixels (stays correct when
      // ToolContainer scales the tool down to fit a narrow window)
      const { x: clickX, y: clickY } = localPointer(event, canvas);

      // Check bounds
      if (clickX < 0 || clickX > plotWidth || clickY < 0 || clickY > plotHeight)
        return;

      const dataPoint = pixelToData(clickX, clickY);
      const dataX = dataPoint.x;
      const dataY = dataPoint.y;

      if (dataX < xmin || dataY < pmin || dataX > xmax || dataY > pmax) return;

      const state = animationStateRef.current;
      const colorHues = [120, 240, 60, 300, 180, 0];
      const hue = colorHues[state.trajectories.length % colorHues.length];

      state.trajectories.push({
        id: Date.now() + Math.random(),
        x: dataX,
        p: dataY,
        color: `hsl(${hue}, 70%, 50%)`,
        trail: [{ t: state.time, x: dataX, y: dataY }],
      });

      if (state.trajectories.length === 1) {
        state.time = 0;
        state.stepAccumulator = 0;
        state.stepCount = 0;
        state.trajectories[0].trail[0].t = 0;
        state.timeSeriesData = [{ time: 0, position: dataX, momentum: dataY }];
        state.periodData = emptyPeriodData();
        setDetectedPeriod(null);
        setCurrentTime(0);
      }

      drawAnimated();
      startLoop();
    },
    [startLoop, drawAnimated],
  );

  const resetSimulation = useCallback(() => {
    stopLoop();
    const state = animationStateRef.current;
    state.trajectories = [];
    state.time = 0;
    state.stepAccumulator = 0;
    state.stepCount = 0;
    state.timeSeriesData = [];
    state.periodData = emptyPeriodData();
    setCurrentTime(0);
    setDetectedPeriod(null);

    drawStaticElements();
    drawAnimated();
  }, [stopLoop, drawStaticElements, drawAnimated]);

  const updateParam = useCallback((param, value) => {
    setUiParams((prev) => ({ ...prev, [param]: value }));
  }, []);

  // Redraw static elements when parameters or display options change
  useEffect(() => {
    drawStaticElements();
  }, [uiParams, showNullclines, showPeriod, drawStaticElements]);

  // Redraw animated layers (e.g. on theme change or u change while paused)
  useEffect(() => {
    drawAnimated();
  }, [uiParams.u, drawAnimated]);

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
              />

              {/* Dynamic foreground layer - trajectories and moving particles */}
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
      <GridWindow
        x={5}
        y={5}
        w={2}
        h={2}
        theme={theme}
        tooltip="Mass on a spring: its height follows X"
      >
        <canvas
          ref={springCanvasRef}
          className="absolute"
          style={{
            left: 0,
            top: 0,
            width: "100%",
            height: "100%",
          }}
        />
      </GridWindow>
    </ToolContainer>
  );
};

export default SimpleHarmonicOscillatorTool;
