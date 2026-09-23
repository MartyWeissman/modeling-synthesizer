// src/tools/GeneralizedLotkaVolterraTool.jsx
// Generalized Lotka-Volterra model: phase portrait with vector field,
// nullclines, classified equilibria, click trajectories and a grid-particle
// flow (Start/Pause).
//
//   P' = αP − γP² + uPQ
//   Q' = βQ − δQ² + vPQ

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
  GridWheelSelector,
} from "../components/grid";
import ToolContainer from "../components/ui/ToolContainer";
import Equation from "../components/Equation";
import { useTheme } from "../hooks/useTheme";
import { useAnimationLoop } from "../hooks/useAnimationLoop";
import { setupCanvas, clearCanvas } from "../utils/canvas";
import { niceTicks } from "../utils/ticks";
import { localPointer } from "../components/grid/pointer";
import { classifyEquilibrium2D } from "../utils/stability";

// Example presets. P is on the horizontal axis, Q on the vertical axis.
const EXAMPLE_PRESETS = {
  Default: {
    alpha: 1.5,
    beta: -2.0,
    gamma: 0.0,
    delta: 0.5,
    u: -1.0,
    v: 1.0,
    pmax: 5.0,
    qmax: 5.0,
  },
  // Classic predator-prey (γ = δ = 0): P is the predator (dies out alone,
  // gains from meeting Q), Q is the prey (grows alone, loses from meeting P).
  // The interior equilibrium (10, 10) is a center: orbits are closed loops.
  "Predator-Prey": {
    alpha: -0.3,
    beta: 0.4,
    gamma: 0.0,
    delta: 0.0,
    u: 0.03,
    v: -0.04,
    pmax: 20.0,
    qmax: 20.0,
  },
  // Competition (u, v < 0). Bistable: (9, 0) and (0, 3.6) are both stable
  // and the coexistence point (1.48, 0.94) is a saddle, so which species
  // wins depends on the starting point. Pmax = 10 so (9, 0) is visible.
  Competition: {
    alpha: 0.9,
    beta: 1.8,
    gamma: 0.1,
    delta: 0.5,
    u: -0.8,
    v: -0.9,
    pmax: 10.0,
    qmax: 5.0,
  },
  // Cooperation (u, v > 0): stable coexistence at (6, 4).
  Cooperation: {
    alpha: 0.2,
    beta: 1.0,
    gamma: 0.1,
    delta: 0.7,
    u: 0.1,
    v: 0.3,
    pmax: 10.0,
    qmax: 10.0,
  },
};

// Model time advanced per 1/60 s at speed 1 (the original per-frame step, so
// the visual speed at 60 Hz is unchanged).
const MODEL_TIME_PER_FRAME = 0.025;
// Largest RK4 sub-step (model time units).
const MAX_SUBSTEP = 0.025;
const GRID_CYCLE_DURATION = 30.0; // model time before the grid is re-seeded
const PARTICLE_GRID_SIZE = 50;
const MAX_CLICK_PARTICLES = 100;
const TIME_WINDOW = 20; // model time shown in the time-series plot
// A click trajectory is considered finished when it has been (almost)
// motionless for this much model time, or has run off to "infinity".
const SETTLE_TIME = 3;
const DIVERGE_FACTOR = 1e6;
// Keep drawing this long (s) after the last motion so trails fade out.
const FADE_OUT_SECONDS = 1.0;

const glvRates = (p, q, { alpha, beta, gamma, delta, u, v }) => [
  alpha * p - gamma * p * p + u * p * q,
  beta * q - delta * q * q + v * p * q,
];

const rk4Step = (p, q, dt, params) => {
  const k1 = glvRates(p, q, params);
  const k2 = glvRates(p + (dt * k1[0]) / 2, q + (dt * k1[1]) / 2, params);
  const k3 = glvRates(p + (dt * k2[0]) / 2, q + (dt * k2[1]) / 2, params);
  const k4 = glvRates(p + dt * k3[0], q + dt * k3[1], params);
  return {
    p: p + (dt / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]),
    q: q + (dt / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]),
  };
};

/**
 * Equilibria of the GLV model inside [0, pmax] × [0, qmax], each classified
 * from its Jacobian. Returns [{ x, y, type, stable }].
 *
 * The P-nullclines are P = 0 and α − γP + uQ = 0; the Q-nullclines are
 * Q = 0 and β − δQ + vP = 0. Equilibria are their pairwise intersections.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function glvEquilibria(params, pmax, qmax) {
  const { alpha, beta, gamma, delta, u, v } = params;
  const eps = 1e-9;
  // Lines a·P + b·Q = c
  const pLines = [
    [1, 0, 0],
    [-gamma, u, -alpha],
  ];
  const qLines = [
    [0, 1, 0],
    [v, -delta, -beta],
  ];
  const points = [];
  for (const [a1, b1, c1] of pLines) {
    for (const [a2, b2, c2] of qLines) {
      if (Math.abs(a1) < eps && Math.abs(b1) < eps) continue;
      if (Math.abs(a2) < eps && Math.abs(b2) < eps) continue;
      const det = a1 * b2 - a2 * b1;
      if (Math.abs(det) < eps) continue; // parallel (or identical) lines
      // Clean up −0 and float noise so (0, 0) prints as 0.00
      const x = (c1 * b2 - c2 * b1) / det + 0;
      const y = (a1 * c2 - a2 * c1) / det + 0;
      const tol = 1e-9 * Math.max(1, pmax, qmax);
      if (x < -tol || y < -tol || x > pmax + tol || y > qmax + tol) continue;
      const px = Math.abs(x) < tol ? 0 : x;
      const py = Math.abs(y) < tol ? 0 : y;
      if (
        points.some(
          (pt) => Math.abs(pt.x - px) < 1e-6 && Math.abs(pt.y - py) < 1e-6,
        )
      )
        continue;
      points.push({ x: px, y: py });
    }
  }
  return points.map(({ x, y }) => {
    // J = [[α − 2γP + uQ, uP], [vQ, β − 2δQ + vP]]
    const J = [
      [alpha - 2 * gamma * x + u * y, u * x],
      [v * y, beta - 2 * delta * y + v * x],
    ];
    const c = classifyEquilibrium2D(J);
    return { x, y, type: c.type, stable: c.stable };
  });
}

// Short, student-facing label for an equilibrium type
const typeLabel = (type) =>
  type === "non-isolated (det = 0)" ? "degenerate (det = 0)" : type;

// "a saddle", "an unstable node", ...
const withArticle = (label) =>
  (/^[aeiou]/i.test(label) ? "an " : "a ") + label;

const GeneralizedLotkaVolterraTool = () => {
  const { theme, currentTheme } = useTheme();

  // UI State - parameters for Generalized Lotka-Volterra model
  const [uiParams, setUiParams] = useState({
    ...EXAMPLE_PRESETS.Default,
    speed: 1,
  });

  const [showNullclines, setShowNullclines] = useState(false);
  const [showVectorField, setShowVectorField] = useState(true);
  const [isRunning, setIsRunning] = useState(false); // grid particles moving
  const [gridState, setGridState] = useState("off"); // "off" | "running" | "paused"
  const [trajectoryCount, setTrajectoryCount] = useState(0); // click trajectories
  const [selectedExample, setSelectedExample] = useState("Default");

  // Canvas refs
  const staticCanvasRef = useRef(null);
  const dynamicCanvasRef = useRef(null);
  const timeSeriesCanvasRef = useRef(null);

  // Transform refs - store coordinate transformations from GridGraph
  const phaseTransformRef = useRef(null);
  const timeSeriesTransformRef = useRef(null);

  // Particle system refs
  const clickParticlesRef = useRef([]); // green trajectories from clicks
  const gridParticlesRef = useRef([]); // orange particles from Start
  const gridCycleTimeRef = useRef(0);

  // Animation state
  const animationStateRef = useRef({
    isRunning: false, // grid particles advancing
    idleTime: 0, // seconds since anything last moved
    timeSeriesData: [], // samples of the first click trajectory
    params: { ...uiParams },
  });

  // Sync UI to animation state
  useEffect(() => {
    animationStateRef.current.params = { ...uiParams };
  }, [uiParams]);

  // Display constants
  const pmin = 0;
  const pmax = uiParams.pmax;
  const qmin = 0;
  const qmax = uiParams.qmax;

  // Tick marks (about 5 per axis, computed by index so no float drift)
  const pTicks = useMemo(() => niceTicks(0, pmax, 5), [pmax]);
  const qTicks = useMemo(() => niceTicks(0, qmax, 5), [qmax]);

  // Equilibria (with type computed from the Jacobian)
  const { alpha, beta, gamma, delta, u, v } = uiParams;
  const equilibria = useMemo(
    () => glvEquilibria({ alpha, beta, gamma, delta, u, v }, pmax, qmax),
    [alpha, beta, gamma, delta, u, v, pmax, qmax],
  );

  const colors = useMemo(() => {
    const dark = currentTheme === "dark";
    return {
      p: dark ? "#60a5fa" : "#3b82f6",
      q: dark ? "#f87171" : "#dc2626",
      equilibrium: dark ? "#c084fc" : "#7e22ce",
      equilibriumHollow: dark ? "#1f2937" : "#ffffff",
    };
  }, [currentTheme]);

  // Static elements (vector field, nullclines, equilibria)
  const drawStaticElements = useCallback(() => {
    const canvas = staticCanvasRef.current;
    const transform = phaseTransformRef.current;
    if (!canvas || !transform) return;

    const { plotWidth, plotHeight, dataToPixel } = transform;
    const { ctx } = setupCanvas(canvas, {
      width: plotWidth,
      height: plotHeight,
    });
    const params = animationStateRef.current.params;
    const {
      alpha,
      beta,
      gamma,
      delta,
      u,
      v,
      pmax: currentPmax,
      qmax: currentQmax,
    } = params;

    ctx.clearRect(0, 0, plotWidth, plotHeight);

    // Map data coordinates to canvas pixels using transform
    const mapXY = (p, q) => dataToPixel(p, q);

    // Draw background grid (at the tick marks) when vector field is hidden
    if (!showVectorField) {
      ctx.strokeStyle =
        currentTheme === "dark"
          ? "rgba(100, 100, 100, 0.2)"
          : "rgba(150, 150, 150, 0.2)";
      ctx.lineWidth = 1;
      niceTicks(0, currentPmax, 5).forEach((p) => {
        const pos = mapXY(p, 0);
        ctx.beginPath();
        ctx.moveTo(pos.x, 0);
        ctx.lineTo(pos.x, plotHeight);
        ctx.stroke();
      });
      niceTicks(0, currentQmax, 5).forEach((q) => {
        const pos = mapXY(0, q);
        ctx.beginPath();
        ctx.moveTo(0, pos.y);
        ctx.lineTo(plotWidth, pos.y);
        ctx.stroke();
      });
    }

    // Draw vector field
    if (showVectorField) {
      const numPoints = 12;
      const stepP = currentPmax / (numPoints + 1);
      const stepQ = currentQmax / (numPoints + 1);
      const arrowColor =
        currentTheme === "dark"
          ? "rgba(156, 163, 175, 0.7)"
          : "rgba(107, 114, 128, 0.7)";
      ctx.strokeStyle = arrowColor;
      ctx.fillStyle = arrowColor;
      ctx.lineWidth = 1;

      for (let i = 1; i <= numPoints; i++) {
        for (let j = 1; j <= numPoints; j++) {
          const p = i * stepP;
          const q = j * stepQ;
          const [dpdt, dqdt] = glvRates(p, q, params);
          const magnitude = Math.sqrt(dpdt * dpdt + dqdt * dqdt);
          if (!(magnitude > 0) || !Number.isFinite(magnitude)) continue;

          const normalizedDx = dpdt / magnitude;
          const normalizedDy = dqdt / magnitude;
          const pos = mapXY(p, q);
          const arrowLength = 18;
          // Note: canvas Y increases downward, so we subtract normalizedDy
          const endX = pos.x + normalizedDx * arrowLength;
          const endY = pos.y - normalizedDy * arrowLength;

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
    }

    // Draw nullclines: lines a·P + b·Q = c clipped to the window
    if (showNullclines) {
      const eps = 1e-9;
      const drawLine = ([a, b, c]) => {
        if (Math.abs(a) < eps && Math.abs(b) < eps) return;
        const pts = [];
        if (Math.abs(b) > eps) {
          const q0 = c / b; // at P = 0
          const q1 = (c - a * currentPmax) / b; // at P = Pmax
          if (q0 >= 0 && q0 <= currentQmax) pts.push({ p: 0, q: q0 });
          if (q1 >= 0 && q1 <= currentQmax) pts.push({ p: currentPmax, q: q1 });
        }
        if (Math.abs(a) > eps) {
          const p0 = c / a; // at Q = 0
          const p1 = (c - b * currentQmax) / a; // at Q = Qmax
          if (p0 >= 0 && p0 <= currentPmax) pts.push({ p: p0, q: 0 });
          if (p1 >= 0 && p1 <= currentPmax) pts.push({ p: p1, q: currentQmax });
        }
        if (pts.length < 2) return;
        pts.sort((m, n) => m.p - n.p || m.q - n.q);
        const s = mapXY(pts[0].p, pts[0].q);
        const e = mapXY(pts[pts.length - 1].p, pts[pts.length - 1].q);
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(e.x, e.y);
        ctx.stroke();
      };

      ctx.lineWidth = 2;
      ctx.strokeStyle =
        currentTheme === "dark"
          ? "rgba(96, 165, 250, 0.8)"
          : "rgba(59, 130, 246, 0.8)";
      drawLine([1, 0, 0]); // P = 0
      drawLine([-gamma, u, -alpha]); // α − γP + uQ = 0

      ctx.strokeStyle =
        currentTheme === "dark"
          ? "rgba(248, 113, 113, 0.8)"
          : "rgba(220, 38, 38, 0.8)";
      drawLine([0, 1, 0]); // Q = 0
      drawLine([v, -delta, -beta]); // β − δQ + vP = 0
    }

    // Draw equilibrium points: filled = stable, hollow = not stable
    equilibria.forEach((eq) => {
      const pos = mapXY(eq.x, eq.y);
      ctx.lineWidth = 2;
      ctx.strokeStyle = colors.equilibrium;
      ctx.fillStyle =
        eq.stable === true ? colors.equilibrium : colors.equilibriumHollow;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 6, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
    });
  }, [currentTheme, showVectorField, showNullclines, equilibria, colors]);

  // Dynamic elements (particles with fading trails)
  const drawDynamicElements = useCallback(
    (dtSeconds) => {
      const canvas = dynamicCanvasRef.current;
      const transform = phaseTransformRef.current;
      if (!canvas || !transform) return;

      const { dataToPixel, plotWidth, plotHeight } = transform;
      const { ctx } = setupCanvas(canvas, {
        width: plotWidth,
        height: plotHeight,
      });
      const mapXY = (p, q) => dataToPixel(p, q);
      const frames = dtSeconds * 60; // frames' worth of time at 60 Hz

      // Fade old trails (same fade per second at any refresh rate)
      const keep = currentTheme === "dark" ? 0.85 : 0.91;
      const prevComposite = ctx.globalCompositeOperation;
      ctx.fillStyle = `rgba(0, 0, 0, ${Math.pow(keep, frames)})`;
      ctx.globalCompositeOperation = "destination-in";
      ctx.fillRect(0, 0, plotWidth, plotHeight);
      ctx.globalCompositeOperation = prevComposite;

      const frameId = animationStateRef.current.frame;
      const drawSegment = (particle, base, bright, widthBase, widthGain) => {
        // Only particles that moved during this frame leave a new segment
        if (particle.frame !== frameId || particle.prevP === undefined) return;
        const a = mapXY(particle.prevP, particle.prevQ);
        const b = mapXY(particle.p, particle.q);
        if (
          ![a.x, a.y, b.x, b.y].every(Number.isFinite) ||
          (a.x === b.x && a.y === b.y)
        )
          return;
        // Colour by on-screen speed (pixels per 60 Hz frame)
        const pixelSpeed = Math.hypot(b.x - a.x, b.y - a.y) / Math.max(frames, 1e-6);
        const intensity = Math.min(pixelSpeed / 5, 1.0);
        const opacity = 0.8 + intensity * 0.2;
        const [r, g, bl] = base.map((c, k) =>
          Math.round(c + intensity * (bright[k] - c)),
        );
        ctx.beginPath();
        ctx.strokeStyle = `rgba(${r}, ${g}, ${bl}, ${opacity})`;
        ctx.lineWidth = widthBase + intensity * widthGain;
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      };

      // Green click trajectories
      const dark = currentTheme === "dark";
      const clickParticles = clickParticlesRef.current;
      clickParticles.forEach((particle) =>
        drawSegment(
          particle,
          dark ? [80, 200, 100] : [30, 180, 50],
          dark ? [140, 255, 160] : [50, 240, 80],
          1.0,
          0.5,
        ),
      );
      ctx.fillStyle = dark ? "rgba(100, 255, 120, 0.9)" : "rgba(20, 200, 40, 0.9)";
      clickParticles.forEach((particle) => {
        if (!particle.diverged) {
          const pos = mapXY(particle.p, particle.q);
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, 1.5, 0, 2 * Math.PI);
          ctx.fill();
        }
      });

      // Orange grid particles (drawn as dots while paused so they stay visible)
      const gridParticles = gridParticlesRef.current;
      const gridMoving = animationStateRef.current.isRunning;
      if (gridMoving) {
        gridParticles.forEach((particle) =>
          drawSegment(
            particle,
            dark ? [200, 140, 80] : [220, 120, 40],
            dark ? [255, 200, 120] : [255, 160, 60],
            0.8,
            0.4,
          ),
        );
      } else if (gridParticles.length > 0) {
        ctx.fillStyle = dark ? "rgba(230, 170, 100, 0.9)" : "rgba(220, 120, 40, 0.9)";
        gridParticles.forEach((particle) => {
          const pos = mapXY(particle.p, particle.q);
          if (pos.x < -2 || pos.x > plotWidth + 2 || pos.y < -2 || pos.y > plotHeight + 2)
            return;
          ctx.fillRect(pos.x - 0.75, pos.y - 0.75, 1.5, 1.5);
        });
      }
    },
    [currentTheme],
  );

  // Initialize grid particles over the window plus a 40% margin
  const initializeGridParticles = useCallback(() => {
    const gridSize = PARTICLE_GRID_SIZE;
    const { pmax: currentPmax, qmax: currentQmax } =
      animationStateRef.current.params;

    const pRange = currentPmax - pmin;
    const qRange = currentQmax - qmin;
    const extension = 0.4;

    const extendedPMin = pmin - pRange * extension;
    const extendedPMax = currentPmax + pRange * extension;
    const extendedQMin = qmin - qRange * extension;
    const extendedQMax = currentQmax + qRange * extension;

    const particles = [];
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        particles.push({
          p: extendedPMin + ((i + 0.5) * (extendedPMax - extendedPMin)) / gridSize,
          q: extendedQMin + ((j + 0.5) * (extendedQMax - extendedQMin)) / gridSize,
        });
      }
    }

    gridParticlesRef.current = particles;
    gridCycleTimeRef.current = 0;
  }, []);

  // Draw time series (tracking the first click trajectory)
  const drawTimeSeries = useCallback(() => {
    const canvas = timeSeriesCanvasRef.current;
    const transform = timeSeriesTransformRef.current;
    if (!canvas || !transform) return;

    const { dataToPixel, plotWidth, plotHeight } = transform;
    const { ctx } = setupCanvas(canvas, {
      width: plotWidth,
      height: plotHeight,
    });
    ctx.clearRect(0, 0, plotWidth, plotHeight);

    const data = animationStateRef.current.timeSeriesData;
    if (data.length < 2) return;

    const currentTime = data[data.length - 1].time;
    const minTime = Math.max(0, currentTime - TIME_WINDOW);

    const drawSeries = (key, color, dash) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.setLineDash(dash);
      ctx.beginPath();
      let first = true;
      data.forEach((point) => {
        if (point.time < minTime) return;
        const pos = dataToPixel(point.time - minTime, point[key]);
        // Keep far-off values drawable (the canvas clips them)
        const y = Math.max(-1e5, Math.min(1e5, pos.y));
        if (first) {
          ctx.moveTo(pos.x, y);
          first = false;
        } else {
          ctx.lineTo(pos.x, y);
        }
      });
      ctx.stroke();
      ctx.setLineDash([]);
    };

    drawSeries("pPop", colors.p, []);
    drawSeries("qPop", colors.q, [6, 4]);
  }, [colors]);

  // Advance one particle by model time h (in n RK4 sub-steps). Returns the
  // distance moved relative to the window size.
  const advanceParticle = (particle, h, n, params, scale) => {
    particle.frame = animationStateRef.current.frame;
    particle.prevP = particle.p;
    particle.prevQ = particle.q;
    let { p, q } = particle;
    const dt = h / n;
    for (let k = 0; k < n; k++) {
      const next = rk4Step(p, q, dt, params);
      if (
        !Number.isFinite(next.p) ||
        !Number.isFinite(next.q) ||
        Math.abs(next.p) > DIVERGE_FACTOR * scale ||
        Math.abs(next.q) > DIVERGE_FACTOR * scale
      ) {
        particle.diverged = true;
        break;
      }
      p = next.p;
      q = next.q;
    }
    particle.p = p;
    particle.q = q;
  };

  // One animation frame (single guarded loop: never runs twice, always uses
  // the latest parameters/theme, advances by real elapsed time).
  const { start: startLoop, stop: stopLoop } = useAnimationLoop((dtSeconds) => {
    const state = animationStateRef.current;
    state.frame = (state.frame || 0) + 1;
    const params = state.params;
    const clickParticles = clickParticlesRef.current;
    const gridParticles = gridParticlesRef.current;
    const scale = Math.max(params.pmax, params.qmax, 1e-9);

    // Model time for this frame (same visual speed at 60 Hz as before)
    const h = MODEL_TIME_PER_FRAME * params.speed * dtSeconds * 60;
    const n = Math.max(1, Math.ceil(h / MAX_SUBSTEP));
    let moving = false;

    if (h > 0) {
      // Click trajectories
      clickParticles.forEach((particle) => {
        if (particle.done) return;
        advanceParticle(particle, h, n, params, scale);
        particle.t += h;
        if (particle.diverged) {
          particle.done = true;
          return;
        }
        const [dp, dq] = glvRates(particle.p, particle.q, params);
        if (Math.hypot(dp, dq) < 1e-4 * scale) {
          particle.stillTime += h;
          if (particle.stillTime > SETTLE_TIME) particle.done = true;
        } else {
          particle.stillTime = 0;
        }
        moving = true;
      });

      // Grid particles (only while Start is active)
      if (state.isRunning && gridParticles.length > 0) {
        gridCycleTimeRef.current += h;
        if (gridCycleTimeRef.current >= GRID_CYCLE_DURATION) {
          initializeGridParticles();
        } else {
          gridParticles.forEach((particle) => {
            if (!particle.diverged) advanceParticle(particle, h, n, params, scale);
          });
        }
        moving = true;
      }

      // Time series of the first click trajectory (trimmed by time)
      const first = clickParticles[0];
      if (first && !first.done) {
        const data = state.timeSeriesData;
        data.push({ time: first.t, pPop: first.p, qPop: first.q });
        const cutoff = first.t - TIME_WINDOW - 1;
        let drop = 0;
        while (drop < data.length && data[drop].time < cutoff) drop++;
        if (drop > 0) data.splice(0, drop);
      }
    }

    drawDynamicElements(dtSeconds);
    drawTimeSeries();

    // Update the trajectory count shown in the status panel
    const active = clickParticles.filter((pt) => !pt.done).length;
    if (active !== state.lastActiveCount) {
      state.lastActiveCount = active;
      setTrajectoryCount(active);
    }

    // Auto-stop once nothing has moved for a moment (trails have faded)
    if (moving) {
      state.idleTime = 0;
      return true;
    }
    state.idleTime += dtSeconds;
    return state.idleTime < FADE_OUT_SECONDS;
  });

  const hasWork = useCallback(() => {
    const state = animationStateRef.current;
    return (
      state.isRunning || clickParticlesRef.current.some((pt) => !pt.done)
    );
  }, []);

  const ensureLoop = useCallback(() => {
    animationStateRef.current.idleTime = 0;
    startLoop();
  }, [startLoop]);

  // Add click particle
  const addClickParticle = useCallback(
    (p, q) => {
      const clickParticles = clickParticlesRef.current;
      if (clickParticles.length >= MAX_CLICK_PARTICLES) return;
      clickParticles.push({ p, q, t: 0, stillTime: 0, done: false });
      if (clickParticles.length === 1) {
        animationStateRef.current.timeSeriesData = [
          { time: 0, pPop: p, qPop: q },
        ];
      }
      ensureLoop();
    },
    [ensureLoop],
  );

  // Start / Pause the grid particles. Pause freezes them in place; Start
  // resumes from where they are (Reset clears them).
  const toggleAnimation = useCallback(
    (newIsRunning) => {
      const state = animationStateRef.current;
      if (newIsRunning) {
        if (gridParticlesRef.current.length === 0) initializeGridParticles();
        state.isRunning = true;
        setIsRunning(true);
        setGridState("running");
        ensureLoop();
      } else {
        state.isRunning = false;
        setIsRunning(false);
        setGridState(gridParticlesRef.current.length > 0 ? "paused" : "off");
        // Keep the loop alive only if click trajectories are still moving;
        // either way draw one more frame so paused particles show as dots.
        ensureLoop();
      }
    },
    [ensureLoop, initializeGridParticles],
  );

  const clearDynamicState = useCallback(() => {
    const state = animationStateRef.current;
    stopLoop();
    state.isRunning = false;
    state.timeSeriesData = [];
    state.lastActiveCount = 0;
    setIsRunning(false);
    setGridState("off");
    clickParticlesRef.current = [];
    gridParticlesRef.current = [];
    gridCycleTimeRef.current = 0;
    setTrajectoryCount(0);
    clearCanvas(dynamicCanvasRef.current);
    clearCanvas(timeSeriesCanvasRef.current);
  }, [stopLoop]);

  // Reset simulation: clear all trajectories and particles
  const resetSimulation = useCallback(() => {
    clearDynamicState();
    drawStaticElements();
  }, [clearDynamicState, drawStaticElements]);

  // Handle canvas click
  const handleCanvasClick = useCallback(
    (event) => {
      const canvas = dynamicCanvasRef.current;
      const transform = phaseTransformRef.current;
      if (!canvas || !transform) return;

      const { pixelToData, plotWidth, plotHeight } = transform;
      const { pmax: currentPmax, qmax: currentQmax } =
        animationStateRef.current.params;

      // CSS-pixel position (correct even when the tool is scaled down)
      const { x: canvasX, y: canvasY } = localPointer(event, canvas);
      if (
        canvasX < 0 ||
        canvasX > plotWidth ||
        canvasY < 0 ||
        canvasY > plotHeight
      )
        return;

      const dataPoint = pixelToData(canvasX, canvasY);
      if (
        dataPoint.x < 0 ||
        dataPoint.y < 0 ||
        dataPoint.x > currentPmax ||
        dataPoint.y > currentQmax
      )
        return;

      addClickParticle(dataPoint.x, dataPoint.y);
    },
    [addClickParticle],
  );

  const updateParam = useCallback((param, value) => {
    setUiParams((prev) => ({ ...prev, [param]: value }));
  }, []);

  // Handle example selection - reset simulation with new parameters
  const handleExampleChange = useCallback(
    (exampleName) => {
      setSelectedExample(exampleName);
      const preset = EXAMPLE_PRESETS[exampleName];
      if (preset) {
        clearDynamicState();
        setUiParams((prev) => ({ ...preset, speed: prev.speed }));
      }
    },
    [clearDynamicState],
  );

  // Redraw static elements when parameters, toggles or theme change
  useEffect(() => {
    drawStaticElements();
  }, [uiParams, showNullclines, showVectorField, drawStaticElements]);

  // When the model changes, finished trajectories start moving again
  // (toward the new equilibria) and the loop restarts if needed.
  useEffect(() => {
    clickParticlesRef.current.forEach((pt) => {
      if (!pt.diverged) {
        pt.done = false;
        pt.stillTime = 0;
      }
    });
    if (hasWork()) ensureLoop();
  }, [alpha, beta, gamma, delta, u, v, uiParams.speed, hasWork, ensureLoop]);

  // When the axes change, old trails are at the wrong scale: clear them and
  // re-seed the grid particles over the new window.
  const firstRangeRef = useRef(true);
  useEffect(() => {
    if (firstRangeRef.current) {
      firstRangeRef.current = false;
      return;
    }
    clearCanvas(dynamicCanvasRef.current);
    if (gridParticlesRef.current.length > 0) initializeGridParticles();
    ensureLoop();
  }, [pmax, qmax, initializeGridParticles, ensureLoop]);

  // Redraw the time series when its axis or colours change
  useEffect(() => {
    drawTimeSeries();
  }, [drawTimeSeries, pmax, qmax]);

  const interiorEq = equilibria.find((eq) => eq.x > 0 && eq.y > 0);
  const timeYMax = Math.max(pmax, qmax);

  return (
    <ToolContainer
      title="Generalized Lotka-Volterra Model"
      canvasWidth={10}
      canvasHeight={7}
    >
      {/* Main Phase Portrait */}
      <GridGraph
        x={0}
        y={0}
        w={5}
        h={5}
        xLabel="Population P"
        yLabel="Population Q"
        xRange={[pmin, pmax]}
        yRange={[qmin, qmax]}
        xTicks={pTicks}
        yTicks={qTicks}
        theme={theme}
        tooltip="Click to start a trajectory from that point"
      >
        {(transform) => {
          phaseTransformRef.current = transform;
          return (
            <>
              <canvas
                ref={staticCanvasRef}
                className="pointer-events-none"
                style={transform.plotStyle}
              />
              <canvas
                ref={dynamicCanvasRef}
                className="cursor-crosshair"
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
        yLabel="Population"
        xRange={[0, TIME_WINDOW]}
        yRange={[0, timeYMax]}
        xTicks={[]}
        yTicks={timeYMax === pmax ? pTicks : qTicks}
        theme={theme}
        tooltip="Populations over time for the first clicked trajectory"
      >
        {(transform) => {
          timeSeriesTransformRef.current = transform;
          return (
            <canvas ref={timeSeriesCanvasRef} style={transform.plotStyle} />
          );
        }}
      </GridGraph>

      {/* Parameter Controls */}
      <GridInput
        x={5}
        y={0}
        value={uiParams.alpha}
        onChange={(value) => updateParam("alpha", value)}
        min={-5.0}
        max={5.0}
        step={0.001}
        variable="α"
        title="P linear growth/decline rate"
        theme={theme}
        compact={true}
      />
      <GridInput
        x={6}
        y={0}
        value={uiParams.beta}
        onChange={(value) => updateParam("beta", value)}
        min={-5.0}
        max={5.0}
        step={0.001}
        variable="β"
        title="Q linear growth/decline rate"
        theme={theme}
        compact={true}
      />
      <GridInput
        x={5}
        y={1}
        value={uiParams.gamma}
        onChange={(value) => updateParam("gamma", value)}
        min={-5.0}
        max={5.0}
        step={0.001}
        variable="γ"
        title="P intraspecific competition"
        theme={theme}
        compact={true}
      />
      <GridInput
        x={6}
        y={1}
        value={uiParams.delta}
        onChange={(value) => updateParam("delta", value)}
        min={-5.0}
        max={5.0}
        step={0.001}
        variable="δ"
        title="Q intraspecific competition"
        theme={theme}
        compact={true}
      />
      <GridInput
        x={5}
        y={2}
        value={uiParams.u}
        onChange={(value) => updateParam("u", value)}
        min={-5.0}
        max={5.0}
        step={0.001}
        variable="u"
        title="Interaction coefficient (effect of Q on P: the uPQ term in P′)"
        theme={theme}
        compact={true}
      />
      <GridInput
        x={6}
        y={2}
        value={uiParams.v}
        onChange={(value) => updateParam("v", value)}
        min={-5.0}
        max={5.0}
        step={0.001}
        variable="v"
        title="Interaction coefficient (effect of P on Q: the vPQ term in Q′)"
        theme={theme}
        compact={true}
      />
      <GridInput
        x={5}
        y={3}
        value={Math.round(uiParams.pmax)}
        onChange={(value) => updateParam("pmax", Math.round(value))}
        min={1}
        max={9999}
        step={1}
        variable="Pmax"
        title="Maximum P value for plot axes"
        theme={theme}
        compact={true}
      />
      <GridInput
        x={6}
        y={3}
        value={Math.round(uiParams.qmax)}
        onChange={(value) => updateParam("qmax", Math.round(value))}
        min={1}
        max={9999}
        step={1}
        variable="Qmax"
        title="Maximum Q value for plot axes"
        theme={theme}
        compact={true}
      />

      {/* Animation Speed Slider */}
      <GridSliderHorizontal
        x={7}
        y={3}
        w={2}
        h={1}
        value={uiParams.speed * 25}
        onChange={(value) => updateParam("speed", value / 25)}
        variant="unipolar"
        label={`Animation Speed: ${uiParams.speed.toFixed(1)}x`}
        theme={theme}
      />

      {/* Start/Pause Button (grid particles) */}
      <GridButton
        x={9}
        y={3}
        w={1}
        h={1}
        type="toggle"
        variant="function"
        active={isRunning}
        onToggle={toggleAnimation}
        theme={theme}
      >
        <div style={{ textAlign: "center", lineHeight: "1.1" }}>
          <div>{isRunning ? "Pause" : "Start"}</div>
        </div>
      </GridButton>

      {/* Reset Button - below Start */}
      <GridButton
        x={9}
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

      {/* Example Selector */}
      <GridWheelSelector
        x={7}
        y={4}
        w={2}
        h={1}
        value={selectedExample}
        onChange={handleExampleChange}
        options={["Default", "Predator-Prey", "Competition", "Cooperation"]}
        title="Examples"
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
        active={showVectorField}
        onToggle={setShowVectorField}
        theme={theme}
      >
        <div style={{ textAlign: "center", lineHeight: "1.1" }}>
          <div>{showVectorField ? "Hide" : "Show"}</div>
          <div>Vectors</div>
        </div>
      </GridButton>

      <GridButton
        x={6}
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
              color: colors.p,
              fontSize: "1.1em",
            }}
          >
            Generalized Lotka-Volterra
          </div>
          <div style={{ marginBottom: "0px", lineHeight: "1.2" }}>
            <Equation name="generalized-lotka-volterra-p" size="medium" />
          </div>
          <div>
            <Equation name="generalized-lotka-volterra-q" size="medium" />
          </div>
        </div>
      </GridDisplay>

      {/* Equilibrium Display: every equilibrium in the window, with its type */}
      <GridDisplay
        x={7}
        y={2}
        w={3}
        h={1}
        variant="status"
        align="center"
        fontSize="xs"
        theme={theme}
      >
        <div style={{ textAlign: "center", lineHeight: "1.2" }}>
          <div style={{ fontWeight: "bold", marginBottom: "2px" }}>
            Equilibrium Points
          </div>
          {equilibria.length > 0 ? (
            <div
              style={{
                fontSize: equilibria.length > 2 ? "0.9em" : "1em",
                display: "grid",
                gridTemplateColumns: equilibria.length > 2 ? "1fr 1fr" : "1fr",
                gap: "0px 6px",
                justifyItems: "center",
              }}
            >
              {equilibria.map((eq, idx) => (
                <div key={idx} style={{ whiteSpace: "nowrap" }}>
                  ({eq.x.toFixed(2)}, {eq.y.toFixed(2)}){" "}
                  {equilibria.length > 2 && <br />}
                  <span style={{ opacity: 0.85 }}>{typeLabel(eq.type)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ opacity: 0.7 }}>None in the window</div>
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
            <div>
              Grid particles:{" "}
              {gridState === "running"
                ? "running"
                : gridState === "paused"
                  ? "paused"
                  : "off"}
            </div>
            <div>
              {trajectoryCount > 0
                ? `${trajectoryCount} moving ${trajectoryCount === 1 ? "trajectory" : "trajectories"}`
                : "No moving trajectories"}
            </div>
            <div>Speed: {uiParams.speed.toFixed(1)}x</div>
          </div>
          {interiorEq && (
            <div style={{ marginTop: "6px", fontSize: "0.85em" }}>
              Equilibrium at ({interiorEq.x.toFixed(2)},{" "}
              {interiorEq.y.toFixed(2)}) is{" "}
              {withArticle(typeLabel(interiorEq.type))}.
            </div>
          )}
          <div style={{ marginTop: "6px", fontSize: "0.8em", opacity: 0.8 }}>
            <span style={{ color: colors.p }}>Blue: Population P</span>
            {" | "}
            <span style={{ color: colors.q }}>Red (dashed): Population Q</span>
            {" | "}
            <span
              style={{ color: currentTheme === "dark" ? "#4ade80" : "#16a34a" }}
            >
              Green: Click trajectories
            </span>
            {" | "}
            <span
              style={{ color: currentTheme === "dark" ? "#fb923c" : "#ea580c" }}
            >
              Orange: Grid particles
            </span>
            {" | "}
            <span style={{ color: colors.equilibrium }}>
              Purple: Equilibria (filled = stable)
            </span>
          </div>
        </div>
      </GridDisplay>
    </ToolContainer>
  );
};

export default GeneralizedLotkaVolterraTool;
