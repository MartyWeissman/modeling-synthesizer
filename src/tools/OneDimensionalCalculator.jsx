// src/tools/OneDimensionalCalculator.jsx

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  GridEquationInput,
  GridSliderHorizontal,
  GridInput,
  GridButton,
  GridGraph,
  GridDisplay,
  GridWindow,
} from "../components/grid";
import ToolContainer from "../components/ui/ToolContainer";
import { useTheme } from "../hooks/useTheme";
import { DynamicalSystem1D } from "../utils/equationParser";
import {
  analyzePhaseLine1D,
  findDegenerateIntervals1D,
  filterEquilibriaFromDegenerateIntervals,
} from "../utils/mathHelpers";
import { randomNormal } from "../utils/random";
import { setupCanvas, clearCanvas, canvasCssSize } from "../utils/canvas";
import { useAnimationLoop } from "../hooks/useAnimationLoop";
import { localPointer } from "../components/grid/pointer";
import {
  DT,
  rk4DelayStep,
  historyValueAt,
} from "./oneDimensionalCalculatorMath";

// Integration step DT = 0.05 time units. One step used to be taken per animation
// frame; at 60 Hz that is 3 time units per second, which is kept as the
// animation speed (now independent of the display's refresh rate).
const SIM_TIME_PER_SECOND = DT * 60;
const T_END = 10; // each run lasts from t = 0 to t = 10

/** Round for display and never show "-0". */
const roundForDisplay = (v, decimals) => {
  const r = parseFloat(v.toFixed(decimals));
  return r === 0 ? 0 : r; // turns -0 into 0
};
/** Short label for an axis value (at most 2 decimals, no "-0"). */
const formatAxisValue = (v) => String(roundForDisplay(v, 2));
/** Equilibrium value for the status box (3 decimals, no "-0.000"). */
const formatEquilibrium = (v) => roundForDisplay(v, 3).toFixed(3);

const OneDimensionalCalculator = () => {
  const { theme, currentTheme } = useTheme();

  // UI State
  const [equation, setEquation] = useState("k*X*(1-X)");
  const [k, setK] = useState(0.5);
  const [xMin, setXMin] = useState(-0.5);
  const [xMax, setXMax] = useState(1.5);
  const [tau, setTau] = useState(0);
  const [epsilon, setEpsilon] = useState(0.0);
  const [showDerivativePlot, setShowDerivativePlot] = useState(false);

  // The equation as typed (X_tau = X(t − τ)), and its "same-time" form with
  // X_tau replaced by X, used for equilibria, the X' plot, and τ = 0.
  const dynamicalSystem = useMemo(() => {
    try {
      return new DynamicalSystem1D(equation, ["k", "X_tau"]);
    } catch {
      return null;
    }
  }, [equation]);
  const systemValid = !!dynamicalSystem && dynamicalSystem.isValidSystem();
  const equationError = !dynamicalSystem
    ? "The equation couldn't be read."
    : systemValid
      ? ""
      : dynamicalSystem.getError();

  const equilibriumSystem = useMemo(() => {
    if (!systemValid) return null;
    try {
      const system = new DynamicalSystem1D(equation, ["k"], {
        substitute: { X_tau: "X" },
      });
      return system.isValidSystem() ? system : null;
    } catch {
      return null;
    }
  }, [equation, systemValid]);

  // Phase line analysis (equilibria, stability, degenerate intervals)
  const phaseLineAnalysis = useMemo(
    () =>
      equilibriumSystem
        ? analyzePhaseLine1D(equilibriumSystem, { k }, xMin, xMax)
        : null,
    [equilibriumSystem, k, xMin, xMax],
  );
  const degenerateIntervals = useMemo(
    () =>
      equilibriumSystem
        ? findDegenerateIntervals1D(equilibriumSystem, { k }, xMin, xMax)
        : [],
    [equilibriumSystem, k, xMin, xMax],
  );
  const equilibria = useMemo(
    () =>
      phaseLineAnalysis
        ? filterEquilibriaFromDegenerateIntervals(
            phaseLineAnalysis.equilibria,
            degenerateIntervals,
          )
        : [],
    [phaseLineAnalysis, degenerateIntervals],
  );

  // Canvas refs - 2 layers for phase line, plus dynamic ball layer and time series
  const phaseBackgroundCanvasRef = useRef(null);
  const phaseLineCanvasRef = useRef(null);
  const ballCanvasRef = useRef(null);
  const timeSeriesCanvasRef = useRef(null);
  const timeSeriesTransformRef = useRef(null);

  // Animation state - pure refs for smooth performance
  const animationStateRef = useRef({
    balls: [], // Array of {id, x, t, history: [{t, x}], active: boolean}
    nextBallId: 0,
    simTimeDebt: 0, // simulated time owed to the balls (frame-rate independence)
  });

  // Advance one ball by one step DT (RK4 for the drift plus noise)
  const stepBall = (ball) => {
    const noise = (epsilon / 2) * Math.sqrt(DT) * randomNormal();
    let newX;
    if (systemValid && equilibriumSystem) {
      newX =
        rk4DelayStep(dynamicalSystem, equilibriumSystem, ball.history, DT, k, tau) +
        noise;
    } else {
      newX = ball.x + noise;
    }
    const newT = ball.history.length * DT; // history[i] is at t = i·DT

    // Keep integrating when X leaves the window (it may come back); stop at
    // t = 10, or if X blows up.
    const escape = 1e6 * Math.max(1, xMax - xMin);
    if (!Number.isFinite(newX) || Math.abs(newX) > escape) {
      return { ...ball, active: false };
    }
    ball.history.push({ t: newT, x: newX });
    return { ...ball, x: newX, t: newT, active: newT < T_END - 1e-9 };
  };

  // Map X to phase-line pixels (the line shows 10% beyond the window)
  const phaseLineMapper = useCallback(
    (width) => {
      const xRange = xMax - xMin;
      const xMinExtended = xMin - 0.1 * xRange;
      const xMaxExtended = xMax + 0.1 * xRange;
      const marginLeft = 40;
      const marginRight = 40;
      const drawableWidth = width - marginLeft - marginRight;
      return {
        xMinExtended,
        xMaxExtended,
        toPixel: (x) =>
          marginLeft +
          ((x - xMinExtended) / (xMaxExtended - xMinExtended)) * drawableWidth,
        fromPixel: (px) =>
          xMinExtended +
          ((px - marginLeft) / drawableWidth) * (xMaxExtended - xMinExtended),
      };
    },
    [xMin, xMax],
  );

  // Draw balls on phase line (only those within extended bounds)
  const drawBalls = () => {
    const setup = setupCanvas(ballCanvasRef.current);
    if (!setup) return;
    const { ctx, width, height } = setup;
    ctx.clearRect(0, 0, width, height);

    const { xMinExtended, xMaxExtended, toPixel } = phaseLineMapper(width);
    const centerY = height / 2;
    const radius = 10;
    const state = animationStateRef.current;

    state.balls.forEach((ball) => {
      // Ghost ball at the delayed position X(t − τ) while the ball moves
      if (tau > 0 && ball.active && ball.history.length > 1) {
        const delayedX = historyValueAt(ball.history, ball.t - tau, DT);
        if (delayedX >= xMinExtended && delayedX <= xMaxExtended) {
          const ghostPixelX = toPixel(delayedX);
          const ghostGradient = ctx.createRadialGradient(
            ghostPixelX - radius * 0.3,
            centerY - radius * 0.3,
            radius * 0.1,
            ghostPixelX,
            centerY,
            radius,
          );
          ghostGradient.addColorStop(0, "rgba(200, 200, 200, 0.6)");
          ghostGradient.addColorStop(0.4, "rgba(160, 160, 160, 0.5)");
          ghostGradient.addColorStop(1, "rgba(120, 120, 120, 0.4)");
          ctx.beginPath();
          ctx.arc(ghostPixelX, centerY, radius, 0, 2 * Math.PI);
          ctx.fillStyle = ghostGradient;
          ctx.fill();
        }
      }

      // Main ball - only within the extended bounds
      if (ball.x < xMinExtended || ball.x > xMaxExtended) return;
      const pixelX = toPixel(ball.x);
      const gradient = ctx.createRadialGradient(
        pixelX - radius * 0.3,
        centerY - radius * 0.3,
        radius * 0.1,
        pixelX,
        centerY,
        radius,
      );
      gradient.addColorStop(0, "#6eb5ff");
      gradient.addColorStop(0.4, "#4a9eff");
      gradient.addColorStop(1, "#1e5a9e");
      ctx.beginPath();
      ctx.arc(pixelX, centerY, radius, 0, 2 * Math.PI);
      ctx.fillStyle = gradient;
      ctx.fill();
    });
  };

  // Draw time series trajectories
  const drawTimeSeries = () => {
    const transform = timeSeriesTransformRef.current;
    if (!transform) return;
    const setup = setupCanvas(timeSeriesCanvasRef.current, {
      width: transform.plotWidth,
      height: transform.plotHeight,
    });
    if (!setup) return;
    const { ctx, width, height } = setup;
    ctx.clearRect(0, 0, width, height);

    const { dataToPixel } = transform;

    // Boundary lines at xMin and xMax
    [xMin, xMax].forEach((value) => {
      const leftPos = dataToPixel(0, value);
      const rightPos = dataToPixel(T_END, value);
      ctx.strokeStyle =
        currentTheme === "dark"
          ? "rgba(128, 128, 128, 0.2)"
          : "rgba(128, 128, 128, 0.3)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(leftPos.x, leftPos.y);
      ctx.lineTo(rightPos.x, rightPos.y);
      ctx.stroke();
    });

    // Equilibrium lines: solid = stable, dashed = unstable, dotted = semi-stable
    equilibria.forEach((eq) => {
      const leftPos = dataToPixel(0, eq.x);
      const rightPos = dataToPixel(T_END, eq.x);
      ctx.strokeStyle =
        currentTheme === "dark"
          ? "rgba(128, 128, 128, 0.5)"
          : "rgba(128, 128, 128, 0.6)";
      ctx.lineWidth = 1.5;
      if (eq.type === "unstable") ctx.setLineDash([5, 5]);
      else if (eq.type === "semi-stable") ctx.setLineDash([2, 2]);
      else ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(leftPos.x, leftPos.y);
      ctx.lineTo(rightPos.x, rightPos.y);
      ctx.stroke();
      ctx.setLineDash([]);
    });

    // Degenerate interval bands
    degenerateIntervals.forEach((interval) => {
      const topLeft = dataToPixel(0, interval.xMax);
      const bottomRight = dataToPixel(T_END, interval.xMin);
      ctx.fillStyle =
        currentTheme === "dark"
          ? "rgba(128, 128, 128, 0.2)"
          : "rgba(128, 128, 128, 0.15)";
      ctx.fillRect(
        topLeft.x,
        topLeft.y,
        bottomRight.x - topLeft.x,
        bottomRight.y - topLeft.y,
      );
    });

    // Trajectories (the canvas clips parts outside the window)
    animationStateRef.current.balls.forEach((ball) => {
      if (ball.history.length < 2) return;
      ctx.strokeStyle = "#4a9eff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ball.history.forEach((point, index) => {
        const pos = dataToPixel(point.t, point.x);
        if (index === 0) ctx.moveTo(pos.x, pos.y);
        else ctx.lineTo(pos.x, pos.y);
      });
      ctx.stroke();
    });
  };

  // Animation frame: advance the balls by the real elapsed time (in fixed
  // steps of DT), redraw, and stop when no ball is moving any more.
  const onFrame = (dtReal) => {
    const state = animationStateRef.current;
    state.simTimeDebt += dtReal * SIM_TIME_PER_SECOND;
    while (state.simTimeDebt >= DT - 1e-9) {
      state.simTimeDebt -= DT;
      state.balls = state.balls.map((ball) => (ball.active ? stepBall(ball) : ball));
    }
    drawBalls();
    drawTimeSeries();
    const keepGoing = state.balls.some((ball) => ball.active);
    if (!keepGoing) state.simTimeDebt = 0;
    return keepGoing;
  };
  const { start: loopStart, stop: loopStop } = useAnimationLoop(onFrame);

  // Handle canvas click to add ball
  const handlePhaseLineClick = (event) => {
    if (!systemValid) return;
    const canvas = phaseLineCanvasRef.current;
    if (!canvas) return;

    // Pointer x in the canvas's CSS pixels (correct even when ToolContainer
    // has scaled the tool down)
    const { x: clickX } = localPointer(event, canvas);
    const { width } = canvasCssSize(canvas);
    const x = phaseLineMapper(width).fromPixel(clickX);

    // Only add ball if within reasonable bounds
    const xRange = xMax - xMin;
    if (x < xMin - 0.3 * xRange || x > xMax + 0.3 * xRange) return;

    const state = animationStateRef.current;
    state.balls.push({
      id: state.nextBallId++,
      x,
      t: 0,
      history: [{ t: 0, x }],
      active: true,
    });

    // Draw at the initial position first, then start moving
    drawBalls();
    loopStart();
  };

  // Clear all balls and trajectories
  const handleClearPlots = () => {
    loopStop();
    const state = animationStateRef.current;
    state.balls = [];
    state.simTimeDebt = 0;
    clearCanvas(ballCanvasRef.current);
    clearCanvas(timeSeriesCanvasRef.current);
    drawTimeSeries(); // keep the equilibrium lines
  };

  // Draw background X' plot
  const drawDerivativePlot = useCallback(
    ({ ctx, width, height }) => {
      ctx.clearRect(0, 0, width, height);

      if (!showDerivativePlot) return;
      if (!equilibriumSystem || !equilibriumSystem.isValidSystem()) return;
      if (!phaseLineAnalysis) return;

      const xRange = xMax - xMin;
      const xMinExtended = xMin - 0.1 * xRange;
      const xMaxExtended = xMax + 0.1 * xRange;

      const marginLeft = 40;
      const marginRight = 40;
      const drawableWidth = width - marginLeft - marginRight;
      const centerY = height / 2;

      const xToPixel = (x) =>
        marginLeft +
        ((x - xMinExtended) / (xMaxExtended - xMinExtended)) * drawableWidth;

      // Find max |X'| for scaling
      const numSamples = 200;
      const dx = (xMax - xMin) / numSamples;
      let maxAbsDerivative = 0;
      for (let i = 0; i <= numSamples; i++) {
        const x = xMin + i * dx;
        const derivative = equilibriumSystem.evaluateDerivative(x, { k });
        if (isFinite(derivative)) {
          maxAbsDerivative = Math.max(maxAbsDerivative, Math.abs(derivative));
        }
      }

      if (maxAbsDerivative === 0) return;

      const maxVerticalPixels = 100;
      const yScale = maxVerticalPixels / maxAbsDerivative;

      const filteredEquilibria = filterEquilibriaFromDegenerateIntervals(
        phaseLineAnalysis.equilibria,
        degenerateIntervals,
      );

      const boundaries = [
        xMin,
        ...filteredEquilibria.map((eq) => eq.x),
        xMax,
      ].sort((a, b) => a - b);

      // Draw hump for each region
      for (let i = 0; i < boundaries.length - 1; i++) {
        const regionStart = boundaries[i];
        const regionEnd = boundaries[i + 1];
        const regionSamples = 50;
        const regionDx = (regionEnd - regionStart) / regionSamples;

        const points = [];
        for (let j = 0; j <= regionSamples; j++) {
          const x = regionStart + j * regionDx;
          const derivative = equilibriumSystem.evaluateDerivative(x, { k });
          if (isFinite(derivative)) {
            points.push({ x, derivative });
          }
        }

        if (points.length === 0) continue;

        const avgDerivative =
          points.reduce((sum, p) => sum + p.derivative, 0) / points.length;
        const isPositive = avgDerivative > 0;

        ctx.beginPath();
        ctx.moveTo(xToPixel(regionStart), centerY);

        points.forEach((point) => {
          const px = xToPixel(point.x);
          const py = centerY - point.derivative * yScale;
          ctx.lineTo(px, py);
        });

        ctx.lineTo(xToPixel(regionEnd), centerY);
        ctx.closePath();

        ctx.fillStyle = isPositive
          ? "rgba(0, 255, 0, 0.15)"
          : "rgba(255, 0, 0, 0.15)";
        ctx.fill();
      }
    },
    [
      showDerivativePlot,
      phaseLineAnalysis,
      degenerateIntervals,
      equilibriumSystem,
      k,
      xMin,
      xMax,
    ],
  );

  // Draw phase line (static elements)
  const drawPhaseLine = useCallback(
    ({ ctx, width, height }) => {
      ctx.clearRect(0, 0, width, height);

      const xRange = xMax - xMin;
      const xMinExtended = xMin - 0.1 * xRange;
      const xMaxExtended = xMax + 0.1 * xRange;

      const marginLeft = 40;
      const marginRight = 40;
      const drawableWidth = width - marginLeft - marginRight;
      const centerY = height / 2;

      const xToPixel = (x) =>
        marginLeft +
        ((x - xMinExtended) / (xMaxExtended - xMinExtended)) * drawableWidth;

      // Draw number line
      ctx.strokeStyle = currentTheme === "dark" ? "#ffffff" : "#000000";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(xToPixel(xMinExtended), centerY);
      ctx.lineTo(xToPixel(xMaxExtended), centerY);
      ctx.stroke();

      // Draw viewport boundary markers
      ctx.strokeStyle =
        currentTheme === "dark"
          ? "rgba(128, 128, 128, 0.2)"
          : "rgba(128, 128, 128, 0.3)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(xToPixel(xMin), 0);
      ctx.lineTo(xToPixel(xMin), height);
      ctx.moveTo(xToPixel(xMax), 0);
      ctx.lineTo(xToPixel(xMax), height);
      ctx.stroke();

      // Draw labels
      ctx.fillStyle = currentTheme === "dark" ? "#ffffff" : "#000000";
      ctx.font = "12px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(formatAxisValue(xMin), xToPixel(xMin), centerY + 15);
      ctx.fillText(formatAxisValue(xMax), xToPixel(xMax), centerY + 15);

      // Draw degenerate intervals
      if (degenerateIntervals && degenerateIntervals.length > 0) {
        degenerateIntervals.forEach((interval) => {
          const xLeft = xToPixel(interval.xMin);
          const xRight = xToPixel(interval.xMax);
          const rectHeight = 30;

          ctx.fillStyle =
            currentTheme === "dark"
              ? "rgba(128, 128, 128, 0.4)"
              : "rgba(128, 128, 128, 0.3)";
          ctx.fillRect(
            xLeft,
            centerY - rectHeight / 2,
            xRight - xLeft,
            rectHeight,
          );

          ctx.strokeStyle = currentTheme === "dark" ? "#888888" : "#666666";
          ctx.lineWidth = 2;
          ctx.strokeRect(
            xLeft,
            centerY - rectHeight / 2,
            xRight - xLeft,
            rectHeight,
          );
        });
      }

      // Draw equilibrium points
      if (phaseLineAnalysis && phaseLineAnalysis.equilibria) {
        const circleRadius = 8;
        const filteredEquilibria = filterEquilibriaFromDegenerateIntervals(
          phaseLineAnalysis.equilibria,
          degenerateIntervals,
        );

        filteredEquilibria.forEach((eq) => {
          const pixelX = xToPixel(eq.x);

          if (eq.type === "semi-stable") {
            ctx.beginPath();
            ctx.arc(pixelX, centerY, circleRadius, 0, 2 * Math.PI);
            ctx.fillStyle = currentTheme === "dark" ? "#000000" : "#ffffff";
            ctx.fill();

            ctx.save();
            ctx.beginPath();
            if (eq.flowDirection === "right") {
              ctx.arc(
                pixelX,
                centerY,
                circleRadius,
                Math.PI / 2,
                (3 * Math.PI) / 2,
              );
            } else {
              ctx.arc(pixelX, centerY, circleRadius, -Math.PI / 2, Math.PI / 2);
            }
            ctx.closePath();
            ctx.fillStyle = currentTheme === "dark" ? "#ffffff" : "#000000";
            ctx.fill();
            ctx.restore();

            ctx.beginPath();
            ctx.arc(pixelX, centerY, circleRadius, 0, 2 * Math.PI);
            ctx.strokeStyle = currentTheme === "dark" ? "#ffffff" : "#000000";
            ctx.lineWidth = 3;
            ctx.stroke();
          } else {
            ctx.beginPath();
            ctx.arc(pixelX, centerY, circleRadius, 0, 2 * Math.PI);

            if (eq.stable) {
              ctx.fillStyle = currentTheme === "dark" ? "#ffffff" : "#000000";
              ctx.fill();
            } else {
              ctx.fillStyle = currentTheme === "dark" ? "#000000" : "#ffffff";
              ctx.fill();
            }

            ctx.strokeStyle = currentTheme === "dark" ? "#ffffff" : "#000000";
            ctx.lineWidth = 3;
            ctx.stroke();
          }
        });
      }

      // Draw directional arrows
      if (
        showDerivativePlot &&
        equilibriumSystem &&
        equilibriumSystem.isValidSystem() &&
        phaseLineAnalysis
      ) {
        const filteredEquilibria = filterEquilibriaFromDegenerateIntervals(
          phaseLineAnalysis.equilibria,
          degenerateIntervals,
        );

        const equilibriumXValues = filteredEquilibria
          .map((eq) => eq.x)
          .sort((a, b) => a - b);

        const arrowPositions = [];

        if (equilibriumXValues.length === 0) {
          const midpoint = (xMin + xMax) / 2;
          const derivative = equilibriumSystem.evaluateDerivative(midpoint, {
            k,
          });
          if (isFinite(derivative) && Math.abs(derivative) > 1e-10) {
            arrowPositions.push({
              x: midpoint,
              direction: derivative > 0 ? "right" : "left",
            });
          }
        } else {
          if (equilibriumXValues[0] > xMin) {
            const leftEdge = xMin;
            const derivative = equilibriumSystem.evaluateDerivative(leftEdge, {
              k,
            });
            if (isFinite(derivative) && Math.abs(derivative) > 1e-10) {
              arrowPositions.push({
                x: leftEdge,
                direction: derivative > 0 ? "right" : "left",
              });
            }
          }

          for (let i = 0; i < equilibriumXValues.length - 1; i++) {
            const midpoint =
              (equilibriumXValues[i] + equilibriumXValues[i + 1]) / 2;
            const derivative = equilibriumSystem.evaluateDerivative(midpoint, {
              k,
            });
            if (isFinite(derivative) && Math.abs(derivative) > 1e-10) {
              arrowPositions.push({
                x: midpoint,
                direction: derivative > 0 ? "right" : "left",
              });
            }
          }

          if (equilibriumXValues[equilibriumXValues.length - 1] < xMax) {
            const rightEdge = xMax;
            const derivative = equilibriumSystem.evaluateDerivative(rightEdge, {
              k,
            });
            if (isFinite(derivative) && Math.abs(derivative) > 1e-10) {
              arrowPositions.push({
                x: rightEdge,
                direction: derivative > 0 ? "right" : "left",
              });
            }
          }
        }

        const arrowY = centerY - 10;
        const arrowLength = 15;
        const arrowHeadSize = 5;

        arrowPositions.forEach((arrow) => {
          const arrowX = xToPixel(arrow.x);

          if (arrow.direction === "right") {
            ctx.strokeStyle = currentTheme === "dark" ? "#22c55e" : "#16a34a";
            ctx.fillStyle = currentTheme === "dark" ? "#22c55e" : "#16a34a";
            ctx.lineWidth = 2;

            ctx.beginPath();
            ctx.moveTo(arrowX - arrowLength / 2, arrowY);
            ctx.lineTo(arrowX + arrowLength / 2, arrowY);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(arrowX + arrowLength / 2, arrowY);
            ctx.lineTo(
              arrowX + arrowLength / 2 - arrowHeadSize,
              arrowY - arrowHeadSize / 2,
            );
            ctx.lineTo(
              arrowX + arrowLength / 2 - arrowHeadSize,
              arrowY + arrowHeadSize / 2,
            );
            ctx.closePath();
            ctx.fill();
          } else {
            ctx.strokeStyle = currentTheme === "dark" ? "#ef4444" : "#dc2626";
            ctx.fillStyle = currentTheme === "dark" ? "#ef4444" : "#dc2626";
            ctx.lineWidth = 2;

            ctx.beginPath();
            ctx.moveTo(arrowX - arrowLength / 2, arrowY);
            ctx.lineTo(arrowX + arrowLength / 2, arrowY);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(arrowX - arrowLength / 2, arrowY);
            ctx.lineTo(
              arrowX - arrowLength / 2 + arrowHeadSize,
              arrowY - arrowHeadSize / 2,
            );
            ctx.lineTo(
              arrowX - arrowLength / 2 + arrowHeadSize,
              arrowY + arrowHeadSize / 2,
            );
            ctx.closePath();
            ctx.fill();
          }
        });
      }
    },
    [
      currentTheme,
      phaseLineAnalysis,
      degenerateIntervals,
      showDerivativePlot,
      equilibriumSystem,
      k,
      xMin,
      xMax,
    ],
  );

  // Redraw every layer after each render (cheap; renders happen only on UI
  // changes). This also picks up size changes of the canvases.
  useEffect(() => {
    const background = setupCanvas(phaseBackgroundCanvasRef.current);
    if (background) drawDerivativePlot(background);
    const line = setupCanvas(phaseLineCanvasRef.current);
    if (line) drawPhaseLine(line);
    drawBalls();
    drawTimeSeries();
  });

  // Time-series y ticks: the window edges and the equilibria, placed at their
  // exact values (labels are rounded). Labels that would overlap an
  // equilibrium label are left blank.
  const { yTicks, yTickLabels } = useMemo(() => {
    const span = xMax - xMin;
    const minGap = 0.06 * span;
    const eqValues = equilibria.map((eq) => eq.x);
    const items = [
      ...eqValues.map((v) => ({ v, priority: 0 })),
      { v: xMin, priority: 1 },
      { v: xMax, priority: 1 },
    ];
    const labeled = [];
    const ticks = [];
    const labels = [];
    items
      .sort((a, b) => a.priority - b.priority)
      .forEach(({ v }) => {
        if (ticks.some((t) => Math.abs(t - v) < 1e-9 * Math.max(1, span))) return;
        ticks.push(v);
        const clash = labeled.some((u) => Math.abs(u - v) < minGap);
        labels.push(clash ? "" : formatAxisValue(v));
        if (!clash) labeled.push(v);
      });
    return { yTicks: ticks, yTickLabels: labels };
  }, [equilibria, xMin, xMax]);

  const statusText = { fontSize: "0.85em" };

  return (
    <ToolContainer
      title="1D Dynamical System Calculator"
      canvasWidth={9}
      canvasHeight={6}
    >
      {/* Phase Line (6x3) */}
      <GridWindow x={0} y={0} w={6} h={3} theme={theme}>
        {/* Background layer - X' plot */}
        <canvas
          ref={phaseBackgroundCanvasRef}
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            top: 0,
            left: 0,
            zIndex: 1,
          }}
        />
        {/* Middle layer - static number line and equilibria */}
        <canvas
          ref={phaseLineCanvasRef}
          onClick={handlePhaseLineClick}
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            top: 0,
            left: 0,
            zIndex: 2,
            cursor: "crosshair",
          }}
        />
        {/* Top layer - animated balls */}
        <canvas
          ref={ballCanvasRef}
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            top: 0,
            left: 0,
            zIndex: 3,
            pointerEvents: "none",
          }}
        />
      </GridWindow>

      {/* Time Series Graph (6x3) */}
      <GridGraph
        x={0}
        y={3}
        w={6}
        h={3}
        xLabel="t"
        yLabel="X"
        xTicks={[0, 5, 10]}
        yTicks={yTicks}
        yTickLabels={yTickLabels}
        xRange={[0, T_END]}
        yRange={[xMin - 0.1 * (xMax - xMin), xMax + 0.1 * (xMax - xMin)]}
        leftAxisColor={currentTheme === "dark" ? "#ffffff" : "#000000"}
        tooltip="Time Series"
        theme={theme}
      >
        {(transform) => {
          timeSeriesTransformRef.current = transform;
          return (
            <canvas
              ref={timeSeriesCanvasRef}
              className="absolute pointer-events-none"
              style={transform.plotStyle}
            />
          );
        }}
      </GridGraph>

      {/* Equation Input (3x1) */}
      <GridEquationInput
        x={6}
        y={0}
        w={3}
        h={1}
        value={equation}
        onChange={setEquation}
        label="Change equation for X"
        variable="X'"
        placeholder="e.g., k*X*(1-X)"
        tooltip="Enter equation for X' = f(X, k). Use X_tau for X(t-τ)"
        theme={theme}
        fontSize="sm"
      />

      {/* Parameter k slider (3x1) */}
      <GridSliderHorizontal
        x={6}
        y={1}
        w={3}
        h={1}
        value={k * 100}
        onChange={(value) => setK(value / 100)}
        variant="bipolar"
        label={`Parameter k = ${k.toFixed(2)}`}
        tooltip="Parameter k"
        theme={theme}
      />

      {/* Xmin input */}
      <GridInput
        x={6}
        y={5}
        w={1}
        h={1}
        value={xMin}
        onChange={(value) => {
          const newValue = Math.max(-10, Math.min(10, value));
          if (newValue < xMax) setXMin(newValue);
        }}
        min={-10}
        max={10}
        step={0.1}
        variable="Xmin"
        title="Minimum X value"
        theme={theme}
      />

      {/* Xmax input - above Xmin */}
      <GridInput
        x={6}
        y={3}
        w={1}
        h={1}
        value={xMax}
        onChange={(value) => {
          const newValue = Math.max(-10, Math.min(10, value));
          if (newValue > xMin) setXMax(newValue);
        }}
        min={-10}
        max={10}
        step={0.1}
        variable="Xmax"
        title="Maximum X value"
        theme={theme}
      />

      {/* Noise epsilon slider */}
      <GridSliderHorizontal
        x={7}
        y={2}
        w={2}
        h={1}
        value={epsilon * 100}
        onChange={(value) => setEpsilon(value / 100)}
        variant="unipolar"
        label={`Noise ε = ${epsilon.toFixed(2)}`}
        tooltip="Noise intensity ε (Gaussian noise added each step)"
        theme={theme}
      />

      {/* Time delay tau slider */}
      <GridSliderHorizontal
        x={7}
        y={3}
        w={2}
        h={1}
        value={tau * 100}
        onChange={(value) => setTau(value / 100)}
        variant="unipolar"
        label={`Delay τ = ${tau.toFixed(2)}`}
        tooltip="Time delay τ (0 to 1)"
        theme={theme}
      />

      {/* Show/Hide X' toggle button */}
      <GridButton
        x={6}
        y={2}
        w={1}
        h={1}
        type="toggle"
        variant="function"
        active={showDerivativePlot}
        onToggle={setShowDerivativePlot}
        theme={theme}
      >
        <div style={{ textAlign: "center", lineHeight: "1.1" }}>
          <div>{showDerivativePlot ? "Hide" : "Show"}</div>
          <div>X'</div>
        </div>
      </GridButton>

      {/* Clear Plots button */}
      <GridButton
        x={6}
        y={4}
        w={1}
        h={1}
        onPress={handleClearPlots}
        theme={theme}
      >
        <div style={{ textAlign: "center", lineHeight: "1.1" }}>
          <div>Clear</div>
          <div>Plots</div>
        </div>
      </GridButton>

      {/* Status/Error Display */}
      {equationError && (
        <GridDisplay
          x={7}
          y={4}
          w={2}
          h={2}
          value={equationError}
          variant="status"
          align="left"
          fontSize="xs"
          theme={theme}
          style={{
            color: currentTheme === "dark" ? "#f87171" : "#dc2626",
            backgroundColor:
              currentTheme === "dark"
                ? "rgba(127, 29, 29, 0.3)"
                : "rgba(254, 226, 226, 0.9)",
          }}
        />
      )}

      {/* Valid status display */}
      {!equationError && phaseLineAnalysis && (
        <GridDisplay
          x={7}
          y={4}
          w={2}
          h={2}
          variant="info"
          align="left"
          fontSize="small"
          theme={theme}
        >
          <div style={{ padding: "4px", maxHeight: "100%", overflowY: "auto" }}>
            <div style={{ fontWeight: "bold", marginBottom: "4px" }}>
              System Status
            </div>
            {degenerateIntervals.map((interval, i) => (
              <div key={`d${i}`} style={statusText}>
                X' = 0 on [{formatEquilibrium(interval.xMin)},{" "}
                {formatEquilibrium(interval.xMax)}]
              </div>
            ))}
            <div style={statusText}>Equilibria: {equilibria.length}</div>
            {tau > 0 && (
              <>
                <div style={{ ...statusText, marginTop: "2px" }}>
                  Delay τ = {tau.toFixed(2)}
                </div>
                <div
                  style={{
                    fontSize: "0.75em",
                    marginTop: "2px",
                    fontStyle: "italic",
                    opacity: 0.8,
                  }}
                >
                  Use "X_tau" in formula for delay variable.
                </div>
              </>
            )}
            <div style={{ ...statusText, marginTop: "2px" }}>
              {equilibria.map((eq, i) => (
                <div key={i}>
                  X* = {formatEquilibrium(eq.x)} ({eq.type})
                </div>
              ))}
            </div>
          </div>
        </GridDisplay>
      )}
    </ToolContainer>
  );
};

export default OneDimensionalCalculator;
