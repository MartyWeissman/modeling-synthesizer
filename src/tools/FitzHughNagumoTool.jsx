// src/tools/FitzHughNagumoTool.jsx

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
import { classifyEquilibrium2D } from "../utils/stability";

// Display ranges for X and Y
const xmin = -3,
  xmax = 3;
const ymin = -3,
  ymax = 3;

// Integration step (model time units), fixed; the speed slider changes how
// much model time passes per second, not the step size.
const DT = 0.02;
// Model time per real second at speed 1x. The original loop advanced
// 0.05 x speed per frame at 60 frames/s = 3 x speed per second.
const SIM_RATE = 3;
// Time-series window (model time units)
const TIME_WINDOW = 20;
// Max points kept in a trail
const MAX_TRAIL_POINTS = 2500;
// Keep values finite when a trajectory runs far off-screen
const CAP = 1e6;

const TIME_SERIES_X_COLOR = { dark: "#60a5fa", light: "#3b82f6" };
const TIME_SERIES_Y_COLOR = { dark: "#f87171", light: "#dc2626" };

// Trail length (model time): about one limit cycle. The relaxation cycle's
// period grows roughly like 1/u (about 33.5 at the default u = 0.1).
const trailWindow = (u) => Math.max(20, Math.min(400, 4 / Math.max(u, 1e-3)));

function fhnDerivs(x, y, { u, a, b, z }) {
  return [-y + x - (x * x * x) / 3 + z, u * (x + a - b * y)];
}

function rk4Step(x, y, params, dt) {
  const k1 = fhnDerivs(x, y, params);
  const k2 = fhnDerivs(x + (dt * k1[0]) / 2, y + (dt * k1[1]) / 2, params);
  const k3 = fhnDerivs(x + (dt * k2[0]) / 2, y + (dt * k2[1]) / 2, params);
  const k4 = fhnDerivs(x + dt * k3[0], y + dt * k3[1], params);
  const clamp = (v) => Math.max(-CAP, Math.min(CAP, v));
  return [
    clamp(x + (dt / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0])),
    clamp(y + (dt / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1])),
  ];
}

// Two decimals without "-0.00"
const fmt2 = (v) => (Math.abs(v) < 0.005 ? 0 : v).toFixed(2);

// Color for an equilibrium by stability
const eqColors = (cls) => {
  if (cls.type === "saddle") return { fill: "#f59e0b", stroke: "#d97706" };
  if (cls.stable === true) return { fill: "#10b981", stroke: "#059669" };
  if (cls.stable === false) return { fill: "#ef4444", stroke: "#b91c1c" };
  return { fill: "#a855f7", stroke: "#7e22ce" }; // center / borderline
};

const FitzHughNagumoTool = () => {
  const { theme, currentTheme } = useTheme();

  // UI State - parameters for FitzHugh-Nagumo model
  const [uiParams, setUiParams] = useState({
    u: 0.1, // Time-scale separation parameter
    a: 0.7, // X-axis shift
    b: 0.8, // Y feedback coefficient
    z: 0.0, // External input current
    speed: 2, // Animation speed
  });

  const [isAnimating, setIsAnimating] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  // Snapshot of the first trajectory for the status box
  const [statusInfo, setStatusInfo] = useState({ count: 0, x: null, y: null });
  const [showNullclines, setShowNullclines] = useState(false);

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
    stepAccumulator: 0,
    timeSeriesData: [],
    params: { ...uiParams },
  });

  // Update animation parameters when UI changes
  useEffect(() => {
    animationStateRef.current.params = { ...uiParams };
  }, [uiParams]);

  // Equilibrium points for FitzHugh-Nagumo model
  const equilibria = useMemo(() => {
    const { u, a, b, z } = uiParams;
    const points = [];

    // Find equilibrium by solving:
    // X' = 0: -Y + X - X³/3 + z = 0  =>  Y = X - X³/3 + z
    // Y' = 0: u(X + a - bY) = 0  =>  Y = (X + a)/b (if b ≠ 0)

    if (b !== 0) {
      // Substitute Y = (X + a)/b into Y = X - X³/3 + z
      // (X + a)/b = X - X³/3 + z
      // Multiply by b: X + a = bX - bX³/3 + bz
      // Rearrange: bX³/3 + X(1 - b) + (a - bz) = 0
      // Multiply by 3/b: X³ + 3X(1-b)/b + 3(a-bz)/b = 0
      // Standard form: X³ + pX + q = 0

      const p = (3 * (1 - b)) / b;
      const q = (3 * (a - b * z)) / b;

      // Solve using Cardano's formula
      const discriminant = (q * q) / 4 + (p * p * p) / 27;

      if (discriminant > 0) {
        // One real root
        const sqrtDisc = Math.sqrt(discriminant);
        const u1 = Math.cbrt(-q / 2 + sqrtDisc);
        const v1 = Math.cbrt(-q / 2 - sqrtDisc);
        const x1 = u1 + v1;

        if (x1 >= xmin && x1 <= xmax) {
          const y1 = (x1 + a) / b;
          if (y1 >= ymin && y1 <= ymax) {
            points.push({ x: x1, y: y1 });
          }
        }
      } else if (Math.abs(discriminant) < 1e-10) {
        // Two or three real roots (degenerate case)
        const u1 = Math.cbrt(-q / 2);
        const x1 = 2 * u1;
        const x2 = -u1;

        [x1, x2].forEach((x) => {
          if (x >= xmin && x <= xmax) {
            const y = (x + a) / b;
            if (y >= ymin && y <= ymax) {
              // Avoid duplicates
              const isDuplicate = points.some(
                (pt) => Math.abs(pt.x - x) < 0.01,
              );
              if (!isDuplicate) {
                points.push({ x: x, y: y });
              }
            }
          }
        });
      } else {
        // Three distinct real roots
        const r = Math.sqrt((-p * p * p) / 27);
        const phi = Math.acos(-q / (2 * r));
        const rCbrt = Math.cbrt(r);

        for (let k = 0; k < 3; k++) {
          const x = 2 * rCbrt * Math.cos((phi + 2 * Math.PI * k) / 3);
          if (x >= xmin && x <= xmax) {
            const y = (x + a) / b;
            if (y >= ymin && y <= ymax) {
              points.push({ x: x, y: y });
            }
          }
        }
      }
    } else if (a === 0) {
      // Special case: b = 0, a = 0 => Y' = 0 requires X = 0
      // From X' = 0: Y = 0 - 0³/3 + z = z
      if (z >= ymin && z <= ymax) {
        points.push({ x: 0, y: z });
      }
    } else {
      // b = 0, a ≠ 0 => X = -a (vertical line)
      // Substitute into X-nullcline: Y = -a - (-a)³/3 + z
      const x = -a;
      if (x >= xmin && x <= xmax) {
        const y = x - (x * x * x) / 3 + z;
        if (y >= ymin && y <= ymax) {
          points.push({ x: x, y: y });
        }
      }
    }

    // Stability from the Jacobian [[1 - X^2, -1], [u, -u b]]:
    // trace = 1 - X^2 - u b, det = u (1 - b (1 - X^2))
    return points.map((pt) => ({
      ...pt,
      cls: classifyEquilibrium2D([
        [1 - pt.x * pt.x, -1],
        [u, -u * b],
      ]),
    }));
  }, [uiParams]);

  // Static elements drawing function - only redraws when parameters change
  const drawStaticElements = useCallback(
    () => {
      const canvas = staticCanvasRef.current;
      const transform = phaseTransformRef.current;
      if (!canvas || !transform) return;
      const setup = setupCanvas(canvas);
      if (!setup) return;
      const { ctx } = setup;

      const { dataToPixel } = transform;
      const { u, a, b, z } = animationStateRef.current.params;

      // Clear canvas
      ctx.clearRect(0, 0, setup.width, setup.height);

      // Draw vector field
      const gridCoords = [
        -2.8, -2.4, -2.0, -1.6, -1.2, -0.8, -0.4, 0.0, 0.4, 0.8, 1.2, 1.6, 2.0,
        2.4, 2.8,
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
          const y = gridCoords[j];

          // FitzHugh-Nagumo equations
          const dxdt = -y + x - (x * x * x) / 3 + z;
          const dydt = u * (x + a - b * y);
          const magnitude = Math.sqrt(dxdt * dxdt + dydt * dydt);

          if (magnitude === 0) continue;

          const normalizedDx = dxdt / magnitude;
          const normalizedDy = dydt / magnitude;

          const pixel = dataToPixel(x, y);
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

      // Draw nullclines if enabled
      if (showNullclines) {
        // X-nullcline: -Y + X - X³/3 + z = 0 => Y = X - X³/3 + z
        ctx.strokeStyle = currentTheme === "dark" ? "#60a5fa" : "#3b82f6";
        ctx.lineWidth = 3;
        ctx.beginPath();

        // Draw the whole cubic; the canvas clips what lies outside the plot
        const nSamples = 600;
        for (let i = 0; i <= nSamples; i++) {
          const x = xmin + ((xmax - xmin) * i) / nSamples;
          const y = x - (x * x * x) / 3 + z;
          const pixel = dataToPixel(x, y);
          if (i === 0) ctx.moveTo(pixel.x, pixel.y);
          else ctx.lineTo(pixel.x, pixel.y);
        }
        ctx.stroke();

        // Y-nullcline: X + a - bY = 0
        // This is a line through point (-a, 0) with normal vector (1, -b)
        // Direction vector is perpendicular to normal: (b, 1)
        ctx.strokeStyle = currentTheme === "dark" ? "#f87171" : "#dc2626";
        ctx.lineWidth = 3;
        ctx.beginPath();

        // Point on the line
        const x0 = -a;
        const y0 = 0;

        // Direction vector (perpendicular to normal (1, -b))
        const dx = b;
        const dy = 1;

        // Find intersections with plot boundaries
        const intersections = [];

        // Intersection with left edge (x = xmin)
        if (Math.abs(dx) > 1e-10) {
          const t = (xmin - x0) / dx;
          const y = y0 + t * dy;
          if (y >= ymin && y <= ymax) {
            intersections.push({ x: xmin, y: y });
          }
        }

        // Intersection with right edge (x = xmax)
        if (Math.abs(dx) > 1e-10) {
          const t = (xmax - x0) / dx;
          const y = y0 + t * dy;
          if (y >= ymin && y <= ymax) {
            intersections.push({ x: xmax, y: y });
          }
        }

        // Intersection with bottom edge (y = ymin)
        if (Math.abs(dy) > 1e-10) {
          const t = (ymin - y0) / dy;
          const x = x0 + t * dx;
          if (x >= xmin && x <= xmax) {
            intersections.push({ x: x, y: ymin });
          }
        }

        // Intersection with top edge (y = ymax)
        if (Math.abs(dy) > 1e-10) {
          const t = (ymax - y0) / dy;
          const x = x0 + t * dx;
          if (x >= xmin && x <= xmax) {
            intersections.push({ x: x, y: ymax });
          }
        }

        // Draw line between first two valid intersections
        if (intersections.length >= 2) {
          const p1 = intersections[0];
          const p2 = intersections[1];

          const pixel1 = dataToPixel(p1.x, p1.y);
          const pixel2 = dataToPixel(p2.x, p2.y);

          ctx.moveTo(pixel1.x, pixel1.y);
          ctx.lineTo(pixel2.x, pixel2.y);
          ctx.stroke();
        }
      }

      // Draw equilibrium points
      equilibria.forEach((eq) => {
        const pixel = dataToPixel(eq.x, eq.y);
        const colors = eqColors(eq.cls);

        ctx.fillStyle = colors.fill;
        ctx.strokeStyle = colors.stroke;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(pixel.x, pixel.y, 6, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "white";
        ctx.beginPath();
        ctx.arc(pixel.x, pixel.y, 2.5, 0, 2 * Math.PI);
        ctx.fill();
      });
    },
    [currentTheme, showNullclines, equilibria],
  );

  // Dynamic elements drawing function - redraws every frame
  const drawDynamicElements = useCallback(() => {
    const canvas = dynamicCanvasRef.current;
    const transform = phaseTransformRef.current;
    if (!canvas || !transform) return;
    const setup = setupCanvas(canvas);
    if (!setup) return;
    const { ctx } = setup;

    const { dataToPixel } = transform;
    ctx.clearRect(0, 0, setup.width, setup.height);

    // Draw trajectories
    const colorHues = [120, 240, 60, 300, 180, 0];
    animationStateRef.current.trajectories.forEach((trajectory, trajIndex) => {
      if (trajectory.trail && trajectory.trail.length > 1) {
        const hue = colorHues[trajIndex % colorHues.length];
        ctx.strokeStyle = `hsl(${hue}, 70%, 50%)`;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.8;

        ctx.beginPath();
        trajectory.trail.forEach((point, index) => {
          const pixel = dataToPixel(point.x, point.y);
          if (index === 0) ctx.moveTo(pixel.x, pixel.y);
          else ctx.lineTo(pixel.x, pixel.y);
        });
        ctx.stroke();
        ctx.globalAlpha = 1.0;

        // Draw current position (clipped by the canvas if off-screen)
        {
          const pixel = dataToPixel(trajectory.x, trajectory.y);
          ctx.fillStyle = `hsl(${hue}, 70%, 40%)`;
          ctx.beginPath();
          ctx.arc(pixel.x, pixel.y, 4, 0, 2 * Math.PI);
          ctx.fill();
        }
      }
    });
  }, []);

  // Draw time series
  const drawTimeSeries = useCallback(() => {
    const canvas = timeSeriesCanvasRef.current;
    const transform = timeSeriesTransformRef.current;
    if (!canvas || !transform) return;
    const setup = setupCanvas(canvas);
    if (!setup) return;
    const { ctx, width: plotWidth, height: plotHeight } = setup;
    const state = animationStateRef.current;
    ctx.clearRect(0, 0, plotWidth, plotHeight);

    if (state.timeSeriesData.length < 2) return;

    const minTime = Math.max(0, state.time - TIME_WINDOW);
    const maxVal = Math.max(Math.abs(xmax), Math.abs(ymax));

    // Local helper for sliding time window (axes change dynamically)
    const toPixel = (t, val) => ({
      x: ((t - minTime) / TIME_WINDOW) * plotWidth,
      y: plotHeight - ((val + maxVal) / (2 * maxVal)) * plotHeight,
    });

    const mode = currentTheme === "dark" ? "dark" : "light";
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
    drawSeries("x", TIME_SERIES_X_COLOR[mode], []); // X: solid
    drawSeries("y", TIME_SERIES_Y_COLOR[mode], [6, 4]); // Y: dashed
  }, [currentTheme]);

  const drawAnimated = useCallback(() => {
    drawDynamicElements();
    drawTimeSeries();
  }, [drawDynamicElements, drawTimeSeries]);

  const publishStatus = () => {
    const state = animationStateRef.current;
    const first = state.trajectories[0];
    setStatusInfo({
      count: state.trajectories.length,
      x: first ? first.x : null,
      y: first ? first.y : null,
    });
  };

  // Advance every trajectory by one step
  const stepOnce = () => {
    const state = animationStateRef.current;
    const params = state.params;
    state.time += DT;
    const window = trailWindow(params.u);
    const minGap = window / MAX_TRAIL_POINTS;

    for (const traj of state.trajectories) {
      const [newX, newY] = rk4Step(traj.x, traj.y, params, DT);
      traj.x = newX;
      traj.y = newY;
      const last = traj.trail[traj.trail.length - 1];
      if (!last || state.time - last.t >= minGap) {
        traj.trail.push({ t: state.time, x: newX, y: newY });
      }
      const cutoff = state.time - window;
      if (traj.trail.length > 1 && traj.trail[0].t < cutoff) {
        let n = 0;
        while (n < traj.trail.length - 1 && traj.trail[n].t < cutoff) n++;
        traj.trail.splice(0, n);
      }
    }

    // Time series follows the first trajectory; keep only the time window
    const first = state.trajectories[0];
    if (first) {
      state.timeSeriesData.push({ time: state.time, x: first.x, y: first.y });
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
    }
  };

  // Animation loop: model time advances in proportion to real elapsed time
  const loop = useAnimationLoop((dtSeconds) => {
    const state = animationStateRef.current;
    const { speed } = state.params;
    if (state.trajectories.length === 0 || speed <= 0) {
      drawAnimated();
      setIsAnimating(false);
      return false;
    }
    state.stepAccumulator += dtSeconds * SIM_RATE * speed;
    const oldTime = state.time;
    let steps = 0;
    while (state.stepAccumulator >= DT && steps < 5000) {
      stepOnce();
      state.stepAccumulator -= DT;
      steps++;
    }
    if (Math.floor(state.time * 10) !== Math.floor(oldTime * 10)) {
      setCurrentTime(state.time);
      publishStatus();
    }
    drawAnimated();
    return true;
  });
  const { start: startLoop, stop: stopLoop } = loop;

  const startAnimation = useCallback(() => {
    setIsAnimating(true);
    startLoop();
  }, [startLoop]);

  // Restart when the speed goes back above zero
  useEffect(() => {
    if (uiParams.speed > 0 && animationStateRef.current.trajectories.length) {
      startAnimation();
    }
  }, [uiParams.speed, startAnimation]);

  // Canvas click handler
  const handleCanvasClick = useCallback(
    (event) => {
      const canvas = dynamicCanvasRef.current;
      const transform = phaseTransformRef.current;
      if (!canvas || !transform) return;

      // Pointer position in the canvas's own CSS pixels (stays correct when
      // ToolContainer scales the tool down to fit a narrow window)
      const { x: clickX, y: clickY } = localPointer(event, canvas);

      // Use transform's pixelToData for coordinate conversion
      const { pixelToData, plotWidth, plotHeight } = transform;

      // Check if click is within plot bounds
      if (clickX < 0 || clickX > plotWidth || clickY < 0 || clickY > plotHeight)
        return;

      const dataPoint = pixelToData(clickX, clickY);
      const dataX = dataPoint.x;
      const dataY = dataPoint.y;

      if (dataX < xmin || dataY < ymin || dataX > xmax || dataY > ymax) return;

      const state = animationStateRef.current;
      if (state.trajectories.length === 0) {
        state.time = 0;
        state.stepAccumulator = 0;
        state.timeSeriesData = [{ time: 0, x: dataX, y: dataY }];
        setCurrentTime(0);
      }

      state.trajectories.push({
        id: Date.now() + Math.random(),
        x: dataX,
        y: dataY,
        trail: [{ t: state.time, x: dataX, y: dataY }],
      });

      publishStatus();
      drawAnimated();
      startAnimation();
    },
    [startAnimation, drawAnimated],
  );

  // Reset simulation: remove trajectories and clear both graphs
  const resetSimulation = useCallback(() => {
    stopLoop();
    setIsAnimating(false);
    const state = animationStateRef.current;
    state.trajectories = [];
    state.time = 0;
    state.stepAccumulator = 0;
    state.timeSeriesData = [];
    setCurrentTime(0);
    setStatusInfo({ count: 0, x: null, y: null });
    drawAnimated();
  }, [stopLoop, drawAnimated]);

  const updateParam = useCallback((param, value) => {
    setUiParams((prev) => ({ ...prev, [param]: value }));
  }, []);

  // Presets set the model parameters (keeping the animation speed) and
  // clear old trajectories, which belong to the old parameters.
  const loadDefaultPreset = useCallback(() => {
    resetSimulation();
    setUiParams((prev) => ({ ...prev, u: 0.1, a: 0.7, b: 0.8, z: 0.0 }));
  }, [resetSimulation]);

  const loadVanDerPolPreset = useCallback(() => {
    resetSimulation();
    setUiParams((prev) => ({ ...prev, u: 0.1, a: 0.0, b: 0.0, z: 0.0 }));
  }, [resetSimulation]);

  // Redraw static elements when parameters or display options change
  useEffect(() => {
    drawStaticElements();
  }, [uiParams, showNullclines, drawStaticElements]);

  // Redraw animated layers (e.g. after a theme change)
  useEffect(() => {
    drawAnimated();
  }, [drawAnimated]);

  return (
    <ToolContainer
      title="FitzHugh-Nagumo Neuron Model"
      canvasWidth={10}
      canvasHeight={7}
    >
      {/* Main Phase Portrait */}
      <GridGraph
        x={0}
        y={0}
        w={5}
        h={5}
        xLabel="Membrane Potential (X)"
        yLabel="Recovery Variable (Y)"
        xRange={[xmin, xmax]}
        yRange={[ymin, ymax]}
        xTicks={[-3, -2, -1, 0, 1, 2, 3]}
        yTicks={[-3, -2, -1, 0, 1, 2, 3]}
        theme={theme}
        tooltip="Click to start a trajectory from that point"
      >
        {(transform) => {
          phaseTransformRef.current = transform;
          return (
            <>
              {/* Static background layer */}
              <canvas
                ref={staticCanvasRef}
                className="absolute pointer-events-none"
                style={transform.plotStyle}
              />
              {/* Dynamic foreground layer */}
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
        yLabel="X, Y"
        xRange={[Math.max(0, currentTime - 20), Math.max(20, currentTime)]}
        yRange={[-3, 3]}
        xTicks={[]}
        yTicks={[-3, -2, -1, 0, 1, 2, 3]}
        theme={theme}
        tooltip="Dynamics over time"
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

      {/* Preset Buttons */}
      <GridButton
        x={5}
        y={0}
        w={1}
        h={1}
        onPress={loadDefaultPreset}
        variant="default"
        theme={theme}
      >
        <div style={{ textAlign: "center", lineHeight: "1.1" }}>
          <div>Default</div>
        </div>
      </GridButton>

      <GridButton
        x={6}
        y={0}
        w={1}
        h={1}
        onPress={loadVanDerPolPreset}
        variant="default"
        theme={theme}
      >
        <div style={{ textAlign: "center", lineHeight: "1.1" }}>
          <div>van der</div>
          <div>Pol</div>
        </div>
      </GridButton>

      {/* Parameter Controls */}
      <GridInput
        x={5}
        y={1}
        value={uiParams.u}
        onChange={(value) => updateParam("u", value)}
        min={0.01}
        max={1.0}
        step={0.01}
        variable="u"
        title="Time-scale separation"
        theme={theme}
      />

      <GridInput
        x={6}
        y={1}
        value={uiParams.a}
        onChange={(value) => updateParam("a", value)}
        min={-2.0}
        max={2.0}
        step={0.1}
        variable="a"
        title="X-axis shift parameter"
        theme={theme}
      />

      <GridInput
        x={5}
        y={2}
        value={uiParams.b}
        onChange={(value) => updateParam("b", value)}
        min={0.0}
        max={2.0}
        step={0.1}
        variable="b"
        title="Y feedback coefficient"
        theme={theme}
      />

      <GridInput
        x={6}
        y={2}
        value={uiParams.z}
        onChange={(value) => updateParam("z", value)}
        min={-1.0}
        max={1.0}
        step={0.1}
        variable="z"
        title="External input current"
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
        w={2}
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
        <div style={{ textAlign: "center", lineHeight: "2.0" }}>
          <div
            style={{
              fontWeight: "bold",
              marginBottom: "15px",
              color: currentTheme === "dark" ? "#60a5fa" : "#3b82f6",
              fontSize: "1.1em",
            }}
          >
            FitzHugh-Nagumo Model
          </div>
          <div style={{ marginBottom: "0px", lineHeight: "1.2" }}>
            <Equation name="fitzhugh-nagumo-membrane" size="medium" />
          </div>
          <div>
            <Equation name="fitzhugh-nagumo-recovery" size="medium" />
          </div>
        </div>
      </GridDisplay>

      {/* Equilibrium Display */}
      <GridDisplay
        x={7}
        y={2}
        w={3}
        h={3}
        variant="status"
        align="center"
        fontSize="small"
        theme={theme}
      >
        <div style={{ textAlign: "center", lineHeight: "1.4" }}>
          <div style={{ fontWeight: "bold", marginBottom: "6px" }}>
            {equilibria.length === 1
              ? "Equilibrium Point"
              : "Equilibrium Points"}
          </div>
          {equilibria.length > 0 ? (
            <div style={{ fontSize: "0.85em" }}>
              {equilibria.map((eq, index) => (
                <div key={index} style={{ marginBottom: "4px" }}>
                  <div>
                    {equilibria.length > 1 && `${index + 1}. `}
                    X* = {fmt2(eq.x)}, Y* = {fmt2(eq.y)}
                  </div>
                  <div
                    style={{
                      fontSize: "0.9em",
                      color: eqColors(eq.cls).stroke,
                      fontWeight: "bold",
                    }}
                  >
                    {eq.cls.type}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: "0.9em", opacity: 0.7 }}>
              No equilibrium found
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
            Neuron Model Simulation Status
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: "8px",
              fontSize: "0.85em",
            }}
          >
            <div>Trajectories: {statusInfo.count}</div>
            <div>Current Time: {currentTime.toFixed(1)}</div>
            <div>Animation: {isAnimating ? "Running" : "Stopped"}</div>
          </div>
          <div style={{ marginTop: "4px", fontSize: "0.85em" }}>
            <div style={{ opacity: 0.8 }}>First trajectory (shown in the time series):</div>
            <div>
              Membrane Potential (X):{" "}
              {statusInfo.x === null ? "–" : fmt2(statusInfo.x)}
            </div>
            <div>
              Recovery Variable (Y):{" "}
              {statusInfo.y === null ? "–" : fmt2(statusInfo.y)}
            </div>
          </div>
          <div style={{ marginTop: "6px", fontSize: "0.8em", opacity: 0.8 }}>
            <span
              style={{ color: currentTheme === "dark" ? "#60a5fa" : "#3b82f6" }}
            >
              Blue solid: X (Membrane)
            </span>{" "}
            |{" "}
            <span
              style={{ color: currentTheme === "dark" ? "#f87171" : "#dc2626" }}
            >
              Red dashed: Y (Recovery)
            </span>
          </div>
        </div>
      </GridDisplay>
    </ToolContainer>
  );
};

export default FitzHughNagumoTool;
