// src/tools/OneDimensionalExplorer.jsx

import React, { useState, useEffect, useCallback, useRef } from "react";
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
import { dataToPixel } from "../utils/gridLayoutHelper";

const OneDimensionalCalculator = () => {
  const { theme, currentTheme } = useTheme();

  // UI State
  const [equation, setEquation] = useState("k*X*(1-X)");
  const [k, setK] = useState(0.5);
  const [xMin, setXMin] = useState(-0.5);
  const [xMax, setXMax] = useState(1.5);
  const [tau, setTau] = useState(0);
  const [showDerivativePlot, setShowDerivativePlot] = useState(false);

  // Dynamical system and analysis
  const [dynamicalSystem, setDynamicalSystem] = useState(null);
  const [equilibriumSystem, setEquilibriumSystem] = useState(null);
  const [phaseLineAnalysis, setPhaseLineAnalysis] = useState(null);
  const [degenerateIntervals, setDegenerateIntervals] = useState([]);
  const [equationError, setEquationError] = useState("");

  // Canvas refs - 2 layers for phase line, plus dynamic ball layer and time series
  const phaseBackgroundCanvasRef = useRef(null);
  const phaseLineCanvasRef = useRef(null);
  const ballCanvasRef = useRef(null);
  const timeSeriesCanvasRef = useRef(null);

  // Animation state - pure refs for smooth performance
  const animationStateRef = useRef({
    balls: [], // Array of {id, x, t, history: [{t, x}], active: boolean}
    animationId: null,
    isRunning: false,
    params: { k, tau },
    nextBallId: 0,
  });

  // Sync UI params to animation state
  useEffect(() => {
    animationStateRef.current.params = { k, tau };
  }, [k, tau]);

  // RK4 integration for 1D system with delay support
  const rk4Step = useCallback(
    (history, dt, params) => {
      if (!dynamicalSystem || !dynamicalSystem.isValidSystem()) {
        return history[history.length - 1].x;
      }

      const currentX = history[history.length - 1].x;
      const tau = params.tau || 0;

      // Helper to get delayed value X(t - tau)
      const getDelayedX = (currentHistory) => {
        if (tau === 0) return currentX;

        // Find the index that's approximately tau seconds ago
        // Since dt = 0.05, we need to look back tau/dt steps
        const stepsBack = Math.round(tau / dt);
        const index = currentHistory.length - 1 - stepsBack;

        if (index < 0) {
          // If we don't have enough history, use the initial value
          return currentHistory[0].x;
        }

        return currentHistory[index].x;
      };

      // For delay equations, we pass X_tau as a separate parameter
      // The equation can use X_tau to refer to X(t - tau)
      const xDelayed = getDelayedX(history);
      const evalParams = { ...params, X_tau: xDelayed };

      const k1 = dynamicalSystem.evaluateDerivative(currentX, evalParams);
      const k2 = dynamicalSystem.evaluateDerivative(
        currentX + 0.5 * dt * k1,
        evalParams,
      );
      const k3 = dynamicalSystem.evaluateDerivative(
        currentX + 0.5 * dt * k2,
        evalParams,
      );
      const k4 = dynamicalSystem.evaluateDerivative(
        currentX + dt * k3,
        evalParams,
      );

      return currentX + (dt / 6) * (k1 + 2 * k2 + 2 * k3 + k4);
    },
    [dynamicalSystem],
  );

  // Draw balls on phase line (only those within extended bounds)
  const drawBalls = useCallback(
    (canvas, ctx) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const { width, height } = canvas;
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

      const state = animationStateRef.current;
      const tau = state.params.tau || 0;
      const dt = 0.05;

      // Draw each ball as a shaded sphere - only if within extended viewport bounds
      state.balls.forEach((ball) => {
        // Draw ghost ball at X(t - tau) position if tau > 0 and ball is active
        if (tau > 0 && ball.active && ball.history.length > 1) {
          const stepsBack = Math.round(tau / dt);
          const delayedIndex = Math.max(0, ball.history.length - 1 - stepsBack);
          const delayedX = ball.history[delayedIndex].x;

          // Only draw ghost if within extended bounds
          if (delayedX >= xMinExtended && delayedX <= xMaxExtended) {
            const ghostPixelX = xToPixel(delayedX);
            const ghostRadius = 10;

            // Light gray ghost ball with subtle gradient
            const ghostGradient = ctx.createRadialGradient(
              ghostPixelX - ghostRadius * 0.3,
              centerY - ghostRadius * 0.3,
              ghostRadius * 0.1,
              ghostPixelX,
              centerY,
              ghostRadius,
            );
            ghostGradient.addColorStop(0, "rgba(200, 200, 200, 0.6)");
            ghostGradient.addColorStop(0.4, "rgba(160, 160, 160, 0.5)");
            ghostGradient.addColorStop(1, "rgba(120, 120, 120, 0.4)");

            ctx.beginPath();
            ctx.arc(ghostPixelX, centerY, ghostRadius, 0, 2 * Math.PI);
            ctx.fillStyle = ghostGradient;
            ctx.fill();
          }
        }

        // Draw main ball - only if within the extended bounds
        if (ball.x < xMinExtended || ball.x > xMaxExtended) return;

        const pixelX = xToPixel(ball.x);
        const radius = 10;

        // Create radial gradient for sphere shading
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
    },
    [xMin, xMax],
  );

  // Draw time series trajectories
  const drawTimeSeries = useCallback(
    (canvas, ctx) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const state = animationStateRef.current;
      if (state.balls.length === 0) return;

      // Get actual canvas dimensions (it's smaller than GridGraph due to 1px offsets)
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;

      // Use EXACT same calculations as GridGraph and equilibrium lines
      const xRange = xMax - xMin;
      const xMinExtended = xMin - 0.1 * xRange;
      const xMaxExtended = xMax + 0.1 * xRange;

      const yTickLabels = [
        xMin.toFixed(1).padStart(4, " "),
        xMax.toFixed(1).padStart(4, " "),
      ];
      if (phaseLineAnalysis && phaseLineAnalysis.equilibria) {
        const filteredEquilibria = filterEquilibriaFromDegenerateIntervals(
          phaseLineAnalysis.equilibria,
          degenerateIntervals,
        );
        filteredEquilibria.forEach((eq) => {
          yTickLabels.push(eq.x.toFixed(1).padStart(4, " "));
        });
      }

      const maxYTickLength = Math.max(...yTickLabels.map((t) => t.length));
      const yTickWidth = Math.max(25, maxYTickLength * 6 + 10);
      const yAxisLabelWidth = 20;

      // These must match GridGraph's calculatePadding() exactly
      const dynamicPadding = {
        left: yTickWidth + yAxisLabelWidth,
        right: 15,
        top: 15,
        bottom: 35,
      };

      const axisWidth =
        canvasWidth - dynamicPadding.left - dynamicPadding.right;
      const axisHeight =
        canvasHeight - dynamicPadding.top - dynamicPadding.bottom + 3; // Stretch vertically by 3px

      const tMax = 10; // Time range from 0 to 10

      // Transform functions - Use GridGraph's exact dataToPixel logic
      // For t-axis (horizontal): simple linear mapping
      const tToPixel = (t) =>
        dynamicPadding.left + dataToPixel(t, [0, tMax], [0, axisWidth]);

      // For x-axis (vertical): Coordinate transformation
      const xToPixel = (x) => {
        const yPos = dataToPixel(
          x,
          [xMinExtended, xMaxExtended],
          [0, axisHeight],
        );
        return canvasHeight - (dynamicPadding.bottom + yPos);
      };

      // Draw trajectories
      state.balls.forEach((ball) => {
        if (ball.history.length < 2) return;

        ctx.strokeStyle = "#4a9eff";
        ctx.lineWidth = 2;
        ctx.beginPath();

        ball.history.forEach((point, index) => {
          const px = tToPixel(point.t);
          const py = xToPixel(point.x);

          if (index === 0) {
            ctx.moveTo(px, py);
          } else {
            ctx.lineTo(px, py);
          }
        });

        ctx.stroke();
      });
    },
    [xMin, xMax, phaseLineAnalysis, degenerateIntervals],
  );

  // Animation loop
  const animationLoop = useCallback(() => {
    const state = animationStateRef.current;
    if (!state.isRunning) return;

    const dt = 0.05;
    const params = state.params;

    // Calculate extended bounds (10% padding on each side)
    const xRange = xMax - xMin;
    const xMinExtended = xMin - 0.1 * xRange;
    const xMaxExtended = xMax + 0.1 * xRange;

    // Update each ball
    state.balls = state.balls.map((ball) => {
      // Skip updating if ball is no longer active
      if (!ball.active) {
        return ball;
      }

      const newX = rk4Step(ball.history, dt, params);
      const newT = ball.t + dt;

      // Check termination conditions
      let stillActive = true;

      // Terminate if time exceeds 10
      if (newT >= 10) {
        stillActive = false;
      }

      // Terminate if X escapes extended bounds [xMinExtended, xMaxExtended]
      if (newX < xMinExtended || newX > xMaxExtended) {
        stillActive = false;
      }

      return {
        ...ball,
        x: newX,
        t: newT,
        history: [...ball.history, { t: newT, x: newX }],
        active: stillActive,
      };
    });

    // Draw updated state
    if (ballCanvasRef.current) {
      const ctx = ballCanvasRef.current.getContext("2d");
      drawBalls(ballCanvasRef.current, ctx);
    }

    if (timeSeriesCanvasRef.current) {
      const ctx = timeSeriesCanvasRef.current.getContext("2d");
      drawTimeSeries(timeSeriesCanvasRef.current, ctx);
    }

    // Stop animation if no active balls remain
    const hasActiveBalls = state.balls.some((ball) => ball.active);
    if (!hasActiveBalls) {
      state.isRunning = false;
      if (state.animationId) {
        cancelAnimationFrame(state.animationId);
        state.animationId = null;
      }
      return;
    }

    state.animationId = requestAnimationFrame(animationLoop);
  }, [rk4Step, drawBalls, drawTimeSeries, xMin, xMax]);

  // Start/stop animation when balls are added/removed
  useEffect(() => {
    const state = animationStateRef.current;

    if (state.balls.length > 0 && !state.isRunning) {
      state.isRunning = true;
      animationLoop();
    }

    return () => {
      if (state.animationId) {
        cancelAnimationFrame(state.animationId);
        state.isRunning = false;
      }
    };
  }, [animationLoop]);

  // Handle canvas click to add ball
  const handlePhaseLineClick = useCallback(
    (event) => {
      if (!dynamicalSystem || !dynamicalSystem.isValidSystem()) return;

      const canvas = phaseLineCanvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const clickX = event.clientX - rect.left;

      const { width } = canvas;
      const xRange = xMax - xMin;
      const xMinExtended = xMin - 0.1 * xRange;
      const xMaxExtended = xMax + 0.1 * xRange;
      const marginLeft = 40;
      const marginRight = 40;
      const drawableWidth = width - marginLeft - marginRight;

      // Convert pixel to x value
      const x =
        xMinExtended +
        ((clickX - marginLeft) / drawableWidth) * (xMaxExtended - xMinExtended);

      // Only add ball if within reasonable bounds
      if (x < xMin - 0.3 * xRange || x > xMax + 0.3 * xRange) return;

      const state = animationStateRef.current;
      const newBall = {
        id: state.nextBallId++,
        x: x,
        t: 0,
        history: [{ t: 0, x: x }],
        active: true,
      };

      state.balls.push(newBall);

      // Start animation if not already running
      if (!state.isRunning) {
        state.isRunning = true;
        animationLoop();
      }

      // Immediate draw
      if (ballCanvasRef.current) {
        const ctx = ballCanvasRef.current.getContext("2d");
        drawBalls(ballCanvasRef.current, ctx);
      }
    },
    [dynamicalSystem, xMin, xMax, animationLoop, drawBalls],
  );

  // Clear all balls and trajectories
  const handleClearPlots = useCallback(() => {
    const state = animationStateRef.current;
    state.balls = [];
    state.isRunning = false;

    if (state.animationId) {
      cancelAnimationFrame(state.animationId);
      state.animationId = null;
    }

    // Clear canvases
    if (ballCanvasRef.current) {
      const ctx = ballCanvasRef.current.getContext("2d");
      ctx.clearRect(
        0,
        0,
        ballCanvasRef.current.width,
        ballCanvasRef.current.height,
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
  }, []);

  // Update dynamical system when equation changes
  useEffect(() => {
    try {
      // Include X_tau as a potential parameter for delay equations
      const system = new DynamicalSystem1D(equation, ["k", "X_tau"]);
      setDynamicalSystem(system);

      if (system.isValidSystem()) {
        setEquationError("");
      } else {
        setEquationError(system.getError());
      }
    } catch (error) {
      setEquationError(`Unexpected error: ${error.message}`);
      setDynamicalSystem(null);
    }
  }, [equation]);

  // Update phase line analysis when system or parameters change
  useEffect(() => {
    if (dynamicalSystem && dynamicalSystem.isValidSystem()) {
      // For equilibrium analysis, replace X_tau with X (equilibrium condition)
      const equilibriumEquation = equation.replace(/X_tau/g, "X");

      try {
        const eqSystem = new DynamicalSystem1D(equilibriumEquation, ["k"]);
        setEquilibriumSystem(eqSystem);

        if (eqSystem.isValidSystem()) {
          const analysis = analyzePhaseLine1D(eqSystem, { k }, xMin, xMax);
          setPhaseLineAnalysis(analysis);

          const intervals = findDegenerateIntervals1D(
            eqSystem,
            { k },
            xMin,
            xMax,
          );
          setDegenerateIntervals(intervals);
        } else {
          setPhaseLineAnalysis(null);
          setDegenerateIntervals([]);
        }
      } catch (error) {
        // If equilibrium system fails, no phase line analysis
        setEquilibriumSystem(null);
        setPhaseLineAnalysis(null);
        setDegenerateIntervals([]);
      }
    } else {
      setEquilibriumSystem(null);
      setPhaseLineAnalysis(null);
      setDegenerateIntervals([]);
    }
  }, [dynamicalSystem, equation, k, xMin, xMax]);

  // Draw background X' plot
  const drawDerivativePlot = useCallback(
    (canvas, ctx) => {
      const { width, height } = canvas;
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
    (canvas, ctx) => {
      const { width, height } = canvas;
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
      ctx.fillText(xMin.toFixed(1), xToPixel(xMin), centerY + 15);
      ctx.fillText(xMax.toFixed(1), xToPixel(xMax), centerY + 15);

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
      dynamicalSystem,
      k,
      xMin,
      xMax,
    ],
  );

  // Canvas initialization
  useEffect(() => {
    // Phase line canvases (6x3 grid)
    [phaseBackgroundCanvasRef, phaseLineCanvasRef, ballCanvasRef].forEach(
      (ref) => {
        if (ref.current) {
          const canvas = ref.current;
          const rect = canvas.getBoundingClientRect();
          canvas.width = rect.width;
          canvas.height = rect.height;
        }
      },
    );

    // Time series canvas - use getBoundingClientRect but draw using JSX dimensions
    if (timeSeriesCanvasRef.current) {
      const canvas = timeSeriesCanvasRef.current;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    }

    if (phaseBackgroundCanvasRef.current) {
      const ctx = phaseBackgroundCanvasRef.current.getContext("2d");
      drawDerivativePlot(phaseBackgroundCanvasRef.current, ctx);
    }

    if (phaseLineCanvasRef.current) {
      const ctx = phaseLineCanvasRef.current.getContext("2d");
      drawPhaseLine(phaseLineCanvasRef.current, ctx);
    }
  }, [drawDerivativePlot, drawPhaseLine]);

  // Redraw background when toggle or parameters change
  useEffect(() => {
    if (phaseBackgroundCanvasRef.current) {
      const ctx = phaseBackgroundCanvasRef.current.getContext("2d");
      drawDerivativePlot(phaseBackgroundCanvasRef.current, ctx);
    }
  }, [drawDerivativePlot]);

  // Redraw phase line when parameters change
  useEffect(() => {
    if (phaseLineCanvasRef.current) {
      const ctx = phaseLineCanvasRef.current.getContext("2d");
      drawPhaseLine(phaseLineCanvasRef.current, ctx);
    }
  }, [drawPhaseLine]);

  // Redraw balls and time series when parameters change or canvases are reinitialized
  useEffect(() => {
    if (ballCanvasRef.current) {
      const ctx = ballCanvasRef.current.getContext("2d");
      drawBalls(ballCanvasRef.current, ctx);
    }

    if (timeSeriesCanvasRef.current) {
      const ctx = timeSeriesCanvasRef.current.getContext("2d");
      drawTimeSeries(timeSeriesCanvasRef.current, ctx);
    }
  }, [drawBalls, drawTimeSeries, showDerivativePlot, k, xMin, xMax, tau]);

  return (
    <ToolContainer
      title="1D Dynamical System Explorer"
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
        yTicks={(() => {
          const ticks = [
            xMin.toFixed(1).padStart(4, " "),
            xMax.toFixed(1).padStart(4, " "),
          ];

          if (phaseLineAnalysis && phaseLineAnalysis.equilibria) {
            const filteredEquilibria = filterEquilibriaFromDegenerateIntervals(
              phaseLineAnalysis.equilibria,
              degenerateIntervals,
            );

            filteredEquilibria.forEach((eq) => {
              ticks.push(eq.x.toFixed(1).padStart(4, " "));
            });
          }

          return ticks;
        })()}
        xRange={[0, 10]}
        yRange={(() => {
          const xRange = xMax - xMin;
          return [xMin - 0.1 * xRange, xMax + 0.1 * xRange];
        })()}
        leftAxisColor={currentTheme === "dark" ? "#ffffff" : "#000000"}
        tooltip="Time Series"
        theme={theme}
      >
        {/* Canvas for trajectory drawing */}
        <canvas
          ref={timeSeriesCanvasRef}
          className="absolute pointer-events-none"
          style={{
            left: 1,
            bottom: 1,
            width: "calc(100% - 2px)",
            height: "calc(100% - 2px)",
          }}
        />

        {/* Equilibrium lines and boundaries */}
        {(() => {
          const xRange = xMax - xMin;
          const xMinExtended = xMin - 0.1 * xRange;
          const xMaxExtended = xMax + 0.1 * xRange;

          const yTickLabels = [
            xMin.toFixed(1).padStart(4, " "),
            xMax.toFixed(1).padStart(4, " "),
          ];
          if (phaseLineAnalysis && phaseLineAnalysis.equilibria) {
            const filteredEquilibria = filterEquilibriaFromDegenerateIntervals(
              phaseLineAnalysis.equilibria,
              degenerateIntervals,
            );
            filteredEquilibria.forEach((eq) => {
              yTickLabels.push(eq.x.toFixed(1).padStart(4, " "));
            });
          }

          const maxYTickLength = Math.max(...yTickLabels.map((t) => t.length));
          const yTickWidth = Math.max(25, maxYTickLength * 6 + 10);
          const yAxisLabelWidth = 20;
          const dynamicPaddingBottom = 35;
          const dynamicPaddingLeft = yTickWidth + yAxisLabelWidth;
          const dynamicPaddingRight = 15;
          const dynamicPaddingTop = 15;

          const graphWidth = 6 * 100 - 16;
          const graphHeight = 3 * 100 - 16;
          const axisWidth =
            graphWidth - dynamicPaddingLeft - dynamicPaddingRight;
          const axisHeight =
            graphHeight - dynamicPaddingTop - dynamicPaddingBottom;

          const lines = [];

          // Boundary lines at xMin and xMax
          [xMin, xMax].forEach((value, idx) => {
            const yPos = dataToPixel(
              value,
              [xMinExtended, xMaxExtended],
              [0, axisHeight],
            );
            lines.push(
              <div
                key={`boundary-${idx}`}
                className="absolute pointer-events-none"
                style={{
                  left: `${dynamicPaddingLeft}px`,
                  bottom: `${dynamicPaddingBottom + yPos}px`,
                  width: `${axisWidth}px`,
                  height: "1px",
                  backgroundColor:
                    currentTheme === "dark"
                      ? "rgba(128, 128, 128, 0.2)"
                      : "rgba(128, 128, 128, 0.3)",
                }}
              />,
            );
          });

          // Equilibrium lines
          if (phaseLineAnalysis && phaseLineAnalysis.equilibria) {
            const filteredEquilibria = filterEquilibriaFromDegenerateIntervals(
              phaseLineAnalysis.equilibria,
              degenerateIntervals,
            );

            filteredEquilibria.forEach((eq) => {
              const yPos = dataToPixel(
                eq.x,
                [xMinExtended, xMaxExtended],
                [0, axisHeight],
              );

              let borderStyle = "solid";
              if (eq.type === "unstable") {
                borderStyle = "dashed";
              } else if (eq.type === "semi-stable") {
                borderStyle = "dotted";
              }

              lines.push(
                <div
                  key={`eq-${eq.x}`}
                  className="absolute pointer-events-none"
                  style={{
                    left: `${dynamicPaddingLeft}px`,
                    bottom: `${dynamicPaddingBottom + yPos}px`,
                    width: `${axisWidth}px`,
                    height: "0px",
                    borderTop: `1.5px ${borderStyle} ${
                      currentTheme === "dark"
                        ? "rgba(128, 128, 128, 0.5)"
                        : "rgba(128, 128, 128, 0.6)"
                    }`,
                  }}
                />,
              );
            });
          }

          // Degenerate interval rectangles
          if (degenerateIntervals && degenerateIntervals.length > 0) {
            degenerateIntervals.forEach((interval, idx) => {
              const yBottom =
                ((interval.xMin - xMinExtended) /
                  (xMaxExtended - xMinExtended)) *
                axisHeight;
              const yTop =
                ((interval.xMax - xMinExtended) /
                  (xMaxExtended - xMinExtended)) *
                axisHeight;
              const rectHeight = yTop - yBottom;

              lines.push(
                <div
                  key={`degenerate-${idx}`}
                  className="absolute pointer-events-none"
                  style={{
                    left: `${dynamicPaddingLeft}px`,
                    bottom: `${dynamicPaddingBottom + yBottom}px`,
                    width: `${axisWidth}px`,
                    height: `${rectHeight}px`,
                    backgroundColor:
                      currentTheme === "dark"
                        ? "rgba(128, 128, 128, 0.2)"
                        : "rgba(128, 128, 128, 0.15)",
                  }}
                />,
              );
            });
          }

          return lines;
        })()}
      </GridGraph>

      {/* Equation Input (3x1) */}
      <GridEquationInput
        x={6}
        y={0}
        w={3}
        h={1}
        value={equation}
        onChange={setEquation}
        label="Equation"
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
        label={`k = ${k.toFixed(2)}`}
        tooltip="Parameter k"
        theme={theme}
      />

      {/* Xmin input */}
      <GridInput
        x={6}
        y={2}
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

      {/* Xmax input */}
      <GridInput
        x={7}
        y={2}
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

      {/* Show/Hide X' toggle button */}
      <GridButton
        x={8}
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

      {/* Time delay tau slider (2x1) - beneath Xmin/Xmax */}
      <GridSliderHorizontal
        x={6}
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

      {/* Clear Plots button */}
      <GridButton
        x={8}
        y={3}
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
          x={6}
          y={4}
          w={3}
          h={1}
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
      {!equationError &&
        dynamicalSystem &&
        dynamicalSystem.isValidSystem() &&
        phaseLineAnalysis && (
          <GridDisplay
            x={6}
            y={4}
            w={3}
            h={2}
            variant="info"
            align="left"
            fontSize="small"
            theme={theme}
          >
            <div style={{ padding: "4px" }}>
              <div style={{ fontWeight: "bold", marginBottom: "4px" }}>
                System Status
              </div>
              {degenerateIntervals.length > 0 ? (
                <div style={{ fontSize: "0.85em" }}>
                  <div>Degenerate interval detected</div>
                  <div style={{ marginTop: "2px" }}>
                    X' = 0 on [{degenerateIntervals[0].xMin.toFixed(2)},{" "}
                    {degenerateIntervals[0].xMax.toFixed(2)}]
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: "0.85em" }}>
                    Equilibria: {phaseLineAnalysis.equilibria.length}
                  </div>
                  {tau > 0 && (
                    <>
                      <div style={{ fontSize: "0.85em", marginTop: "2px" }}>
                        Delay parameter τ = {tau.toFixed(2)}
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
                  <div style={{ fontSize: "0.85em", marginTop: "2px" }}>
                    {phaseLineAnalysis.equilibria.map((eq, i) => (
                      <div key={i}>
                        X* = {eq.x.toFixed(3)} ({eq.type})
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </GridDisplay>
        )}
    </ToolContainer>
  );
};

export default OneDimensionalCalculator;
