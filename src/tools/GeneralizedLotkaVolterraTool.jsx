// src/tools/GeneralizedLotkaVolterraTool.jsx
// CLEAN VERSION: GLV layout + nullclines + DSC particle system

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

const GeneralizedLotkaVolterraTool = () => {
  const { theme, currentTheme } = useTheme();

  // UI State - parameters for Generalized Lotka-Volterra model
  const [uiParams, setUiParams] = useState({
    alpha: 1.5,
    beta: -2.0,
    gamma: 0.0,
    delta: 0.5,
    u: -1.0,
    v: 1.0,
    pmax: 5.0,
    qmax: 5.0,
    speed: 1,
  });

  const [showNullclines, setShowNullclines] = useState(false);
  const [showVectorField, setShowVectorField] = useState(true);
  const [isRunning, setIsRunning] = useState(false); // Start button state
  const [trajectoryCount, setTrajectoryCount] = useState(0); // Track red particle count
  const [selectedExample, setSelectedExample] = useState("Default");

  // Example presets
  const examplePresets = {
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
    "Predator-Prey": {
      alpha: -0.3, // p parameter from SharkTuna
      beta: 0.4, // q parameter from SharkTuna
      gamma: 0.0,
      delta: 0.0,
      u: 0.03, // -beta from SharkTuna
      v: -0.04, // delta from SharkTuna
      pmax: 20.0,
      qmax: 20.0,
    },
    Competition: {
      alpha: 0.9,
      beta: 1.8,
      gamma: 0.1,
      delta: 0.5,
      u: -0.8,
      v: -0.9,
      pmax: 5.0,
      qmax: 5.0,
    },
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

  // Canvas refs
  const staticCanvasRef = useRef(null);
  const dynamicCanvasRef = useRef(null);
  const timeSeriesCanvasRef = useRef(null);

  // Transform refs - store coordinate transformations from GridGraph
  const phaseTransformRef = useRef(null);
  const timeSeriesTransformRef = useRef(null);

  // Particle system refs (EXACT copy from DSC)
  const clickParticlesRef = useRef([]); // Red particles from clicks
  const gridParticlesRef = useRef([]); // Blue particles from Start button
  const gridCycleTimeRef = useRef(0);
  const GRID_CYCLE_DURATION = 30.0;
  const PARTICLE_GRID_SIZE = 50;
  const MAX_CLICK_PARTICLES = 100;

  // Animation state
  const animationStateRef = useRef({
    animationId: null,
    isRunning: false,
    time: 0,
    timeSeriesData: [],
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

  // Dynamic tick marks based on axis ranges (5-10 ticks per axis)
  const generateNiceTicks = useCallback((maxValue) => {
    const targetTicks = 5;
    const range = maxValue;

    // Calculate raw step size
    const rawStep = range / targetTicks;

    // Find magnitude (power of 10)
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));

    // Normalize to 1-10 range
    const normalized = rawStep / magnitude;

    // Round to nice number (1, 2, 5, or 10)
    let niceStep;
    if (normalized <= 1) {
      niceStep = 1 * magnitude;
    } else if (normalized <= 2) {
      niceStep = 2 * magnitude;
    } else if (normalized <= 5) {
      niceStep = 5 * magnitude;
    } else {
      niceStep = 10 * magnitude;
    }

    // Generate ticks
    const ticks = [];
    for (let i = 0; i <= maxValue; i += niceStep) {
      ticks.push(i);
    }

    // Ensure max value is included if not already
    if (ticks[ticks.length - 1] < maxValue) {
      ticks.push(maxValue);
    }

    return ticks;
  }, []);

  const pTicks = useMemo(
    () => generateNiceTicks(pmax),
    [pmax, generateNiceTicks],
  );
  const qTicks = useMemo(
    () => generateNiceTicks(qmax),
    [qmax, generateNiceTicks],
  );

  // Helper: Create line object for nullclines (aP + bQ = c)
  const createLine = useCallback((a, b, c) => {
    const epsilon = 1e-6;
    return {
      a,
      b,
      c,
      isDegenerate() {
        return Math.abs(this.a) < epsilon && Math.abs(this.b) < epsilon;
      },
      intersectWith(other) {
        const det = this.a * other.b - other.a * this.b;
        if (Math.abs(det) < epsilon) return null;
        return {
          p: (this.c * other.b - other.c * this.b) / det,
          q: (this.a * other.c - other.a * this.c) / det,
        };
      },
      findViewportIntersections(pmax, qmax) {
        const intersections = [];
        if (Math.abs(this.b) > epsilon) {
          const q = this.c / this.b;
          if (q >= 0 && q <= qmax) intersections.push({ p: 0, q });
        }
        if (Math.abs(this.a) > epsilon) {
          const p = this.c / this.a;
          if (p >= 0 && p <= pmax) intersections.push({ p, q: 0 });
        }
        if (Math.abs(this.b) > epsilon) {
          const q = (this.c - this.a * pmax) / this.b;
          if (q >= 0 && q <= qmax) intersections.push({ p: pmax, q });
        }
        if (Math.abs(this.a) > epsilon) {
          const p = (this.c - this.b * qmax) / this.a;
          if (p >= 0 && p <= pmax) intersections.push({ p, q: qmax });
        }
        return intersections;
      },
    };
  }, []);

  // Equilibrium points calculation with stability analysis
  const equilibria = useMemo(() => {
    const { alpha, beta, gamma, delta, u, v } = uiParams;
    const pNullclines = [createLine(1, 0, 0), createLine(-gamma, u, -alpha)];
    const qNullclines = [createLine(0, 1, 0), createLine(v, -delta, -beta)];

    const points = [];
    const eps = 1e-6;
    pNullclines.forEach((pLine) => {
      qNullclines.forEach((qLine) => {
        if (!pLine.isDegenerate() && !qLine.isDegenerate()) {
          const point = pLine.intersectWith(qLine);
          if (
            point &&
            point.p >= 0 &&
            point.q >= 0 &&
            point.p <= pmax &&
            point.q <= qmax
          ) {
            points.push({ x: point.p, y: point.q });
          }
        }
      });
    });

    const uniquePoints = points.filter(
      (point, i, arr) =>
        arr.findIndex(
          (p) => Math.abs(p.x - point.x) < eps && Math.abs(p.y - point.y) < eps,
        ) === i,
    );

    // Add stability classification for interior equilibria
    return uniquePoints.map((point) => {
      let type = null;

      // Only classify interior equilibria (P* > 0, Q* > 0)
      if (point.x > eps && point.y > eps) {
        const P = point.x;
        const Q = point.y;

        // Jacobian matrix at equilibrium:
        // J = [α - 2γP + uQ,  uP     ]
        //     [vQ,            β - 2δQ + vP]
        const j11 = alpha - 2 * gamma * P + u * Q;
        const j12 = u * P;
        const j21 = v * Q;
        const j22 = beta - 2 * delta * Q + v * P;

        // Eigenvalue analysis
        const trace = j11 + j22;
        const det = j11 * j22 - j12 * j21;
        const discriminant = trace * trace - 4 * det;

        if (Math.abs(det) < eps) {
          type = "Degenerate";
        } else if (discriminant > eps) {
          // Real eigenvalues
          if (det > 0) {
            if (trace < -eps) {
              type = "Stable Node";
            } else if (trace > eps) {
              type = "Unstable Node";
            } else {
              type = "Non-hyperbolic";
            }
          } else {
            type = "Saddle";
          }
        } else if (discriminant < -eps) {
          // Complex eigenvalues (spirals)
          if (trace < -eps) {
            type = "Stable Spiral";
          } else if (trace > eps) {
            type = "Unstable Spiral";
          } else {
            type = "Center";
          }
        } else {
          // Discriminant ≈ 0
          type = "Non-hyperbolic";
        }
      }

      return { ...point, type };
    });
  }, [uiParams, createLine]);

  // Static elements (vector field, nullclines, equilibria) - FROM GLV
  const drawStaticElements = useCallback(
    (canvas, ctx) => {
      const transform = phaseTransformRef.current;
      if (!transform) return;

      const { plotWidth, plotHeight, dataToPixel } = transform;
      const {
        alpha,
        beta,
        gamma,
        delta,
        u,
        v,
        pmax: currentPmax,
        qmax: currentQmax,
      } = animationStateRef.current.params;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Map data coordinates to canvas pixels using transform
      const mapXY = (p, q) => dataToPixel(p, q);

      // Draw background grid when vector field is hidden
      if (!showVectorField) {
        ctx.strokeStyle =
          currentTheme === "dark"
            ? "rgba(100, 100, 100, 0.2)"
            : "rgba(150, 150, 150, 0.2)";
        ctx.lineWidth = 1;

        // Vertical lines
        const gridStepP =
          currentPmax <= 5 ? 1.0 : currentPmax <= 10 ? 2.0 : 5.0;
        for (let p = 0; p <= currentPmax; p += gridStepP) {
          const pos = mapXY(p, 0);
          ctx.beginPath();
          ctx.moveTo(pos.x, 0);
          ctx.lineTo(pos.x, plotHeight);
          ctx.stroke();
        }

        // Horizontal lines
        const gridStepQ =
          currentQmax <= 5 ? 1.0 : currentQmax <= 10 ? 2.0 : 5.0;
        for (let q = 0; q <= currentQmax; q += gridStepQ) {
          const pos = mapXY(0, q);
          ctx.beginPath();
          ctx.moveTo(0, pos.y);
          ctx.lineTo(plotWidth, pos.y);
          ctx.stroke();
        }
      }

      // Draw vector field
      if (showVectorField) {
        // Generate dynamic grid based on current axis ranges
        const gridCoords = [];
        const numPoints = 12;
        const stepP = currentPmax / (numPoints + 1);
        const stepQ = currentQmax / (numPoints + 1);
        for (let i = 1; i <= numPoints; i++) {
          gridCoords.push({ p: i * stepP, q: i * stepQ });
        }
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
            const p = gridCoords[i].p;
            const q = gridCoords[j].q;
            if (p < 0 || q < 0 || p > currentPmax || q > currentQmax) continue;

            const dpdt = alpha * p - gamma * p * p + u * p * q;
            const dqdt = beta * q - delta * q * q + v * p * q;
            const magnitude = Math.sqrt(dpdt * dpdt + dqdt * dqdt);
            if (magnitude === 0) continue;

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

      // Draw nullclines
      if (showNullclines) {
        const pNullclines = [
          createLine(1, 0, 0),
          createLine(-gamma, u, -alpha),
        ];
        const qNullclines = [createLine(0, 1, 0), createLine(v, -delta, -beta)];

        ctx.strokeStyle =
          currentTheme === "dark"
            ? "rgba(96, 165, 250, 0.8)"
            : "rgba(59, 130, 246, 0.8)";
        ctx.lineWidth = 2;
        pNullclines.forEach((line) => {
          if (!line.isDegenerate()) {
            const points = line.findViewportIntersections(
              currentPmax,
              currentQmax,
            );
            if (points.length >= 2) {
              points.sort((a, b) => a.p - b.p);
              const startPos = mapXY(points[0].p, points[0].q);
              ctx.beginPath();
              ctx.moveTo(startPos.x, startPos.y);
              for (let i = 1; i < points.length; i++) {
                const pos = mapXY(points[i].p, points[i].q);
                ctx.lineTo(pos.x, pos.y);
              }
              ctx.stroke();
            }
          }
        });

        ctx.strokeStyle =
          currentTheme === "dark"
            ? "rgba(248, 113, 113, 0.8)"
            : "rgba(220, 38, 38, 0.8)";
        ctx.lineWidth = 2;
        qNullclines.forEach((line) => {
          if (!line.isDegenerate()) {
            const points = line.findViewportIntersections(
              currentPmax,
              currentQmax,
            );
            if (points.length >= 2) {
              points.sort((a, b) => a.p - b.p);
              const startPos = mapXY(points[0].p, points[0].q);
              ctx.beginPath();
              ctx.moveTo(startPos.x, startPos.y);
              for (let i = 1; i < points.length; i++) {
                const pos = mapXY(points[i].p, points[i].q);
                ctx.lineTo(pos.x, pos.y);
              }
              ctx.stroke();
            }
          }
        });
      }

      // Draw equilibrium points
      equilibria.forEach((eq) => {
        const pos = mapXY(eq.x, eq.y);
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
      });
    },
    [currentTheme, showVectorField, showNullclines, equilibria, createLine],
  );

  // Dynamic elements (particles with trails) - EXACT copy from DSC
  const drawDynamicElements = useCallback(
    (canvas, ctx) => {
      const transform = phaseTransformRef.current;
      if (!transform) return;

      const { dataToPixel } = transform;
      const { pmax: currentPmax, qmax: currentQmax } =
        animationStateRef.current.params;

      // Map data coordinates to canvas pixels
      const mapXY = (p, q) => dataToPixel(p, q);

      // Wind-js trail fading
      const prevComposite = ctx.globalCompositeOperation;
      ctx.fillStyle =
        currentTheme === "dark"
          ? "rgba(0, 0, 0, 0.85)"
          : "rgba(255, 255, 255, 0.91)";
      ctx.globalCompositeOperation = "destination-in";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = prevComposite;

      // Green click trajectories
      const clickParticles = clickParticlesRef.current;
      clickParticles.forEach((particle) => {
        if (
          particle.pt !== undefined &&
          particle.qt !== undefined &&
          particle.p >= pmin &&
          particle.p <= currentPmax &&
          particle.q >= qmin &&
          particle.q <= currentQmax
        ) {
          const dp = particle.pt - particle.p;
          const dq = particle.qt - particle.q;
          const speed = Math.sqrt(dp * dp + dq * dq);
          const intensity = Math.min(speed * 50, 1.0);
          const opacity = 0.8 + intensity * 0.2;

          const baseGreen =
            currentTheme === "dark" ? [80, 200, 100] : [30, 180, 50];
          const brightGreen =
            currentTheme === "dark" ? [140, 255, 160] : [50, 240, 80];
          const r = Math.round(
            baseGreen[0] + intensity * (brightGreen[0] - baseGreen[0]),
          );
          const g = Math.round(
            baseGreen[1] + intensity * (brightGreen[1] - baseGreen[1]),
          );
          const b = Math.round(
            baseGreen[2] + intensity * (brightGreen[2] - baseGreen[2]),
          );
          const lineWidth = 1.0 + intensity * 0.5;

          const pos = mapXY(particle.p, particle.q);
          const posNext = mapXY(particle.pt, particle.qt);
          ctx.beginPath();
          ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
          ctx.lineWidth = lineWidth;
          ctx.moveTo(pos.x, pos.y);
          ctx.lineTo(posNext.x, posNext.y);
          ctx.stroke();
        }
      });

      // Green dots at current positions
      clickParticles.forEach((particle) => {
        if (
          particle.p >= pmin &&
          particle.p <= currentPmax &&
          particle.q >= qmin &&
          particle.q <= currentQmax
        ) {
          const pos = mapXY(particle.p, particle.q);
          ctx.beginPath();
          ctx.fillStyle =
            currentTheme === "dark"
              ? "rgba(100, 255, 120, 0.9)"
              : "rgba(20, 200, 40, 0.9)";
          ctx.arc(pos.x, pos.y, 1.5, 0, 2 * Math.PI);
          ctx.fill();
        }
      });

      // Orange grid particles
      const gridParticles = gridParticlesRef.current;
      gridParticles.forEach((particle) => {
        if (
          particle.pt !== undefined &&
          particle.qt !== undefined &&
          particle.p >= pmin &&
          particle.p <= currentPmax &&
          particle.q >= qmin &&
          particle.q <= currentQmax
        ) {
          const dp = particle.pt - particle.p;
          const dq = particle.qt - particle.q;
          const speed = Math.sqrt(dp * dp + dq * dq);
          const intensity = Math.min(speed * 50, 1.0);
          const opacity = 0.8 + intensity * 0.2;

          const baseOrange =
            currentTheme === "dark" ? [200, 140, 80] : [220, 120, 40];
          const brightOrange =
            currentTheme === "dark" ? [255, 200, 120] : [255, 160, 60];
          const r = Math.round(
            baseOrange[0] + intensity * (brightOrange[0] - baseOrange[0]),
          );
          const g = Math.round(
            baseOrange[1] + intensity * (brightOrange[1] - baseOrange[1]),
          );
          const b = Math.round(
            baseOrange[2] + intensity * (brightOrange[2] - baseOrange[2]),
          );
          const lineWidth = 0.8 + intensity * 0.4;

          const pos = mapXY(particle.p, particle.q);
          const posNext = mapXY(particle.pt, particle.qt);
          ctx.beginPath();
          ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
          ctx.lineWidth = lineWidth;
          ctx.moveTo(pos.x, pos.y);
          ctx.lineTo(posNext.x, posNext.y);
          ctx.stroke();
        }
      });
    },
    [currentTheme],
  );

  // Initialize grid particles - EXACT copy from DSC
  const initializeGridParticles = useCallback(() => {
    const gridSize = PARTICLE_GRID_SIZE;
    const {
      alpha,
      beta,
      gamma,
      delta,
      u,
      v,
      speed,
      pmax: currentPmax,
      qmax: currentQmax,
    } = animationStateRef.current.params;

    const pRange = currentPmax - pmin;
    const qRange = currentQmax - qmin;
    const extension = 0.4;

    const extendedPMin = pmin - pRange * extension;
    const extendedPMax = currentPmax + pRange * extension;
    const extendedQMin = qmin - qRange * extension;
    const extendedQMax = currentQmax + qRange * extension;

    const particles = [];
    const dt = 0.025 * speed;

    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        const p =
          extendedPMin + ((i + 0.5) * (extendedPMax - extendedPMin)) / gridSize;
        const q =
          extendedQMin + ((j + 0.5) * (extendedQMax - extendedQMin)) / gridSize;

        const dpdt = alpha * p - gamma * p * p + u * p * q;
        const dqdt = beta * q - delta * q * q + v * p * q;

        particles.push({
          p,
          q,
          pt: p + dpdt * dt,
          qt: q + dqdt * dt,
          age: 0,
          id: Date.now() + Math.random() + i * 1000 + j,
        });
      }
    }

    gridParticlesRef.current = particles;
    gridCycleTimeRef.current = 0;
  }, []);

  // Draw time series (tracking red particles)
  const drawTimeSeries = useCallback(
    (canvas, ctx) => {
      const transform = timeSeriesTransformRef.current;
      if (!transform) return;

      const { dataToPixel, plotWidth, plotHeight } = transform;
      const state = animationStateRef.current;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (state.timeSeriesData.length < 2) return;

      const timeWindow = 20;
      const currentTime = state.time;
      const minTime = Math.max(0, currentTime - timeWindow);

      // Draw P population
      ctx.strokeStyle = currentTheme === "dark" ? "#60a5fa" : "#3b82f6";
      ctx.lineWidth = 2;
      ctx.beginPath();
      let firstPoint = true;

      state.timeSeriesData.forEach((point) => {
        if (point.time >= minTime && point.time <= minTime + timeWindow) {
          // Map time to x position (0-20 window maps to 0-plotWidth)
          const normalizedTime = (point.time - minTime) / timeWindow;
          const pos = dataToPixel(normalizedTime * 20, point.pPop);
          if (firstPoint) {
            ctx.moveTo(pos.x, pos.y);
            firstPoint = false;
          } else {
            ctx.lineTo(pos.x, pos.y);
          }
        }
      });
      ctx.stroke();

      // Draw Q population
      ctx.strokeStyle = currentTheme === "dark" ? "#f87171" : "#dc2626";
      ctx.lineWidth = 2;
      ctx.beginPath();
      firstPoint = true;

      state.timeSeriesData.forEach((point) => {
        if (point.time >= minTime && point.time <= minTime + timeWindow) {
          const normalizedTime = (point.time - minTime) / timeWindow;
          const pos = dataToPixel(normalizedTime * 20, point.qPop);
          if (firstPoint) {
            ctx.moveTo(pos.x, pos.y);
            firstPoint = false;
          } else {
            ctx.lineTo(pos.x, pos.y);
          }
        }
      });
      ctx.stroke();
    },
    [currentTheme],
  );

  // RK4 integration
  const rk4Step = useCallback((p, q, dt, alpha, beta, gamma, delta, u, v) => {
    const computeDerivatives = (p, q) => {
      const dpdt = alpha * p - gamma * p * p + u * p * q;
      const dqdt = beta * q - delta * q * q + v * p * q;
      return [dpdt, dqdt];
    };

    const k1 = computeDerivatives(p, q);
    const k2 = computeDerivatives(p + (dt * k1[0]) / 2, q + (dt * k1[1]) / 2);
    const k3 = computeDerivatives(p + (dt * k2[0]) / 2, q + (dt * k2[1]) / 2);
    const k4 = computeDerivatives(p + dt * k3[0], q + dt * k3[1]);

    return {
      p: p + (dt / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]),
      q: q + (dt / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]),
    };
  }, []);

  // Animation loop - EXACT copy from DSC
  const animationLoop = useCallback(() => {
    const state = animationStateRef.current;
    const clickParticles = clickParticlesRef.current;
    const gridParticles = gridParticlesRef.current;

    // Continue if we have red particles OR blue particles are running
    const shouldContinue = clickParticles.length > 0 || state.isRunning;
    if (!shouldContinue) return;

    const { alpha, beta, gamma, delta, u, v, speed } = state.params;
    if (speed === 0) {
      state.animationId = requestAnimationFrame(animationLoop);
      return;
    }

    const dt = 0.025 * speed;

    // ALWAYS update red click particles
    clickParticles.forEach((particle) => {
      const newPos = rk4Step(
        particle.p,
        particle.q,
        dt,
        alpha,
        beta,
        gamma,
        delta,
        u,
        v,
      );
      if (isFinite(newPos.p) && isFinite(newPos.q)) {
        particle.pt = newPos.p;
        particle.qt = newPos.q;
      } else {
        particle.pt = particle.p;
        particle.qt = particle.q;
      }
    });

    // ONLY update blue grid particles when Start is pressed
    if (state.isRunning && gridParticles.length > 0) {
      gridCycleTimeRef.current += dt;
      if (gridCycleTimeRef.current >= GRID_CYCLE_DURATION) {
        initializeGridParticles();
      } else {
        gridParticles.forEach((particle) => {
          const newPos = rk4Step(
            particle.p,
            particle.q,
            dt,
            alpha,
            beta,
            gamma,
            delta,
            u,
            v,
          );
          if (isFinite(newPos.p) && isFinite(newPos.q)) {
            particle.pt = newPos.p;
            particle.qt = newPos.q;
          } else {
            particle.pt = particle.p;
            particle.qt = particle.q;
          }
        });
      }
    }

    state.time += dt;

    // Update time series data (track first red particle)
    const firstRedParticle = clickParticles[0];
    if (firstRedParticle) {
      const currentP = firstRedParticle.p || 0;
      const currentQ = firstRedParticle.q || 0;

      state.timeSeriesData = [
        ...state.timeSeriesData.slice(-500),
        {
          time: state.time,
          pPop: currentP,
          qPop: currentQ,
        },
      ];
    }

    // Draw dynamic elements
    const dynamicCanvas = dynamicCanvasRef.current;
    if (dynamicCanvas) {
      const ctx = dynamicCanvas.getContext("2d");
      drawDynamicElements(dynamicCanvas, ctx);
    }

    // Draw time series
    const timeCanvas = timeSeriesCanvasRef.current;
    if (timeCanvas) {
      const ctx = timeCanvas.getContext("2d");
      drawTimeSeries(timeCanvas, ctx);
    }

    // Move particles to next positions AFTER drawing
    clickParticles.forEach((particle) => {
      if (particle.pt !== undefined && particle.qt !== undefined) {
        particle.p = particle.pt;
        particle.q = particle.qt;
      }
    });

    gridParticles.forEach((particle) => {
      if (particle.pt !== undefined && particle.qt !== undefined) {
        particle.p = particle.pt;
        particle.q = particle.qt;
      }
    });

    state.animationId = requestAnimationFrame(animationLoop);
  }, [drawDynamicElements, drawTimeSeries, rk4Step, initializeGridParticles]);

  // Add click particle - EXACT copy from DSC
  const addClickParticle = useCallback(
    (p, q) => {
      const clickParticles = clickParticlesRef.current;
      if (clickParticles.length >= MAX_CLICK_PARTICLES) return;

      clickParticles.push({
        p,
        q,
        pt: p,
        qt: q,
        age: 0,
        id: Date.now() + Math.random(),
      });

      setTrajectoryCount(clickParticles.length); // Update count for display

      const state = animationStateRef.current;
      if (!state.animationId) {
        animationLoop();
      }
    },
    [animationLoop],
  );

  // Toggle animation (Start/Pause) - EXACT copy from DSC
  const toggleAnimation = useCallback(
    (newIsRunning) => {
      const state = animationStateRef.current;

      if (newIsRunning) {
        state.isRunning = true;
        setIsRunning(true);
        initializeGridParticles();
        animationLoop();
      } else {
        state.isRunning = false;
        if (state.animationId) {
          cancelAnimationFrame(state.animationId);
        }
        setIsRunning(false);
        gridParticlesRef.current = [];
        gridCycleTimeRef.current = 0;
      }
    },
    [animationLoop, initializeGridParticles],
  );

  // Reset simulation - EXACT copy from DSC
  const resetSimulation = useCallback(() => {
    const state = animationStateRef.current;
    state.isRunning = false;
    if (state.animationId) {
      cancelAnimationFrame(state.animationId);
      state.animationId = null;
    }
    setIsRunning(false);

    clickParticlesRef.current = [];
    gridParticlesRef.current = [];
    gridCycleTimeRef.current = 0;
    state.time = 0;
    state.timeSeriesData = [];
    setTrajectoryCount(0); // Reset trajectory count

    if (staticCanvasRef.current) {
      const ctx = staticCanvasRef.current.getContext("2d");
      drawStaticElements(staticCanvasRef.current, ctx);
    }
    if (dynamicCanvasRef.current) {
      const ctx = dynamicCanvasRef.current.getContext("2d");
      ctx.clearRect(
        0,
        0,
        dynamicCanvasRef.current.width,
        dynamicCanvasRef.current.height,
      );
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
  }, [drawStaticElements]);

  // Handle canvas click
  const handleCanvasClick = useCallback(
    (event) => {
      const canvas = dynamicCanvasRef.current;
      const transform = phaseTransformRef.current;
      if (!canvas || !transform) return;

      const { pixelToData, plotWidth, plotHeight } = transform;
      const { pmax: currentPmax, qmax: currentQmax } =
        animationStateRef.current.params;

      const rect = canvas.getBoundingClientRect();
      // Convert click position to canvas pixel coordinates
      const canvasX = (event.clientX - rect.left) * (canvas.width / rect.width);
      const canvasY =
        (event.clientY - rect.top) * (canvas.height / rect.height);

      // Check if click is within plot bounds
      if (
        canvasX < 0 ||
        canvasX > plotWidth ||
        canvasY < 0 ||
        canvasY > plotHeight
      )
        return;

      // Convert to data coordinates
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
      const preset = examplePresets[exampleName];
      if (preset) {
        // Reset simulation first
        const state = animationStateRef.current;
        state.isRunning = false;
        if (state.animationId) {
          cancelAnimationFrame(state.animationId);
          state.animationId = null;
        }
        setIsRunning(false);
        clickParticlesRef.current = [];
        gridParticlesRef.current = [];
        gridCycleTimeRef.current = 0;
        state.time = 0;
        state.timeSeriesData = [];
        setTrajectoryCount(0);

        // Apply new parameters
        setUiParams({ ...preset, speed: uiParams.speed });

        // Clear canvases
        if (dynamicCanvasRef.current) {
          const ctx = dynamicCanvasRef.current.getContext("2d");
          ctx.clearRect(
            0,
            0,
            dynamicCanvasRef.current.width,
            dynamicCanvasRef.current.height,
          );
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
      }
    },
    [examplePresets, uiParams.speed],
  );

  // Initial draw of static elements
  useEffect(() => {
    if (staticCanvasRef.current && phaseTransformRef.current) {
      const ctx = staticCanvasRef.current.getContext("2d");
      drawStaticElements(staticCanvasRef.current, ctx);
    }
  }, [drawStaticElements]);

  // Redraw static elements when parameters change
  useEffect(() => {
    if (staticCanvasRef.current && phaseTransformRef.current) {
      const ctx = staticCanvasRef.current.getContext("2d");
      drawStaticElements(staticCanvasRef.current, ctx);
    }
  }, [uiParams, showNullclines, showVectorField, drawStaticElements]);

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
                width={transform.plotWidth}
                height={transform.plotHeight}
              />
              <canvas
                ref={dynamicCanvasRef}
                className="cursor-crosshair"
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
        yLabel="Population"
        xRange={[0, 20]}
        yRange={[0, Math.max(pmax, qmax)]}
        xTicks={[]}
        yTicks={Math.max(pmax, qmax) === pmax ? pTicks : qTicks}
        theme={theme}
        tooltip="Population dynamics over time"
      >
        {(transform) => {
          timeSeriesTransformRef.current = transform;
          return (
            <canvas
              ref={timeSeriesCanvasRef}
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
        title="Interaction coefficient (P effect on P)"
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
        title="Interaction coefficient (Q effect on Q)"
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

      {/* Start Button - to the right of speed slider */}
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
              color: currentTheme === "dark" ? "#60a5fa" : "#3b82f6",
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

      {/* Equilibrium Display */}
      <GridDisplay
        x={7}
        y={2}
        w={3}
        h={1}
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
            <div
              style={{
                fontSize: "0.85em",
                display: "grid",
                gridTemplateColumns: equilibria.length > 2 ? "1fr 1fr" : "1fr",
                gap: "4px 8px",
                justifyItems: "center",
              }}
            >
              {equilibria.map((eq, idx) => (
                <div key={idx}>
                  ({eq.x.toFixed(2)}, {eq.y.toFixed(2)})
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: "0.9em", opacity: 0.7 }}>
              No equilibrium points
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
            <div>Particles: {isRunning ? "Active" : "Inactive"}</div>
            <div>
              {trajectoryCount > 0
                ? `${trajectoryCount} active ${trajectoryCount === 1 ? "trajectory" : "trajectories"}`
                : "No trajectories"}
            </div>
            <div>Speed: {uiParams.speed.toFixed(1)}x</div>
          </div>
          {(() => {
            const interiorEq = equilibria.find((eq) => eq.type !== null);
            if (interiorEq) {
              return (
                <div style={{ marginTop: "6px", fontSize: "0.85em" }}>
                  Equilibrium at ({interiorEq.x.toFixed(2)},{" "}
                  {interiorEq.y.toFixed(2)}) is {interiorEq.type}.
                </div>
              );
            }
            return null;
          })()}
          <div style={{ marginTop: "6px", fontSize: "0.8em", opacity: 0.8 }}>
            <span
              style={{ color: currentTheme === "dark" ? "#60a5fa" : "#3b82f6" }}
            >
              Blue: Population P
            </span>
            {" | "}
            <span
              style={{ color: currentTheme === "dark" ? "#f87171" : "#dc2626" }}
            >
              Red: Population Q
            </span>
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
          </div>
        </div>
      </GridDisplay>
    </ToolContainer>
  );
};

export default GeneralizedLotkaVolterraTool;
