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
  const [showNullclines, setShowNullclines] = useState(false);

  // Canvas refs - separate static and dynamic layers for performance
  const staticCanvasRef = useRef(null);
  const dynamicCanvasRef = useRef(null);
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
  });

  // Update animation parameters when UI changes
  useEffect(() => {
    animationStateRef.current.params = { ...uiParams };
  }, [uiParams]);

  // Sync UI state to animation state
  useEffect(() => {
    animationStateRef.current.showNullclines = showNullclines;
  }, [showNullclines]);

  // Display constants for X and Y
  const xmin = -3,
    xmax = 3;
  const ymin = -3,
    ymax = 3;

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

    return points;
  }, [uiParams]);

  // Static elements drawing function - only redraws when parameters change
  const drawStaticElements = useCallback(
    (canvas, ctx) => {
      const { width, height } = canvas;
      const { u, a, b, z } = animationStateRef.current.params;

      // Account for graph padding (matching GridGraph calculation)
      const paddingLeft = 45;
      const paddingRight = 15;
      const paddingTop = 15;
      const paddingBottom = 35;

      const plotWidth = width - paddingLeft - paddingRight;
      const plotHeight = height - paddingTop - paddingBottom;

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

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

          const canvasX =
            paddingLeft + ((x - xmin) / (xmax - xmin)) * plotWidth;
          const canvasY =
            paddingTop + plotHeight - ((y - ymin) / (ymax - ymin)) * plotHeight;
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

      // Draw nullclines if enabled
      if (showNullclines) {
        // X-nullcline: -Y + X - X³/3 + z = 0 => Y = X - X³/3 + z
        ctx.strokeStyle = currentTheme === "dark" ? "#60a5fa" : "#3b82f6";
        ctx.lineWidth = 3;
        ctx.beginPath();

        let firstPoint = true;
        for (let x = xmin; x <= xmax; x += 0.01) {
          const y = x - (x * x * x) / 3 + z;
          if (y >= ymin && y <= ymax) {
            const canvasX =
              paddingLeft + ((x - xmin) / (xmax - xmin)) * plotWidth;
            const canvasY =
              paddingTop +
              plotHeight -
              ((y - ymin) / (ymax - ymin)) * plotHeight;
            if (firstPoint) {
              ctx.moveTo(canvasX, canvasY);
              firstPoint = false;
            } else {
              ctx.lineTo(canvasX, canvasY);
            }
          }
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

          const canvasX1 =
            paddingLeft + ((p1.x - xmin) / (xmax - xmin)) * plotWidth;
          const canvasY1 =
            paddingTop +
            plotHeight -
            ((p1.y - ymin) / (ymax - ymin)) * plotHeight;
          const canvasX2 =
            paddingLeft + ((p2.x - xmin) / (xmax - xmin)) * plotWidth;
          const canvasY2 =
            paddingTop +
            plotHeight -
            ((p2.y - ymin) / (ymax - ymin)) * plotHeight;

          ctx.moveTo(canvasX1, canvasY1);
          ctx.lineTo(canvasX2, canvasY2);
          ctx.stroke();
        }
      }

      // Draw equilibrium points
      equilibria.forEach((eq) => {
        const canvasX =
          paddingLeft + ((eq.x - xmin) / (xmax - xmin)) * plotWidth;
        const canvasY =
          paddingTop +
          plotHeight -
          ((eq.y - ymin) / (ymax - ymin)) * plotHeight;

        ctx.fillStyle = "#f59e0b";
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
      });
    },
    [currentTheme, showNullclines, equilibria],
  );

  // Dynamic elements drawing function - redraws every frame
  const drawDynamicElements = useCallback((canvas, ctx) => {
    if (!canvas) return;

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    // Account for graph padding
    const paddingLeft = 45;
    const paddingRight = 15;
    const paddingTop = 15;
    const paddingBottom = 35;

    const plotWidth = width - paddingLeft - paddingRight;
    const plotHeight = height - paddingTop - paddingBottom;

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
          const canvasX =
            paddingLeft + ((point.x - xmin) / (xmax - xmin)) * plotWidth;
          const canvasY =
            paddingTop +
            plotHeight -
            ((point.y - ymin) / (ymax - ymin)) * plotHeight;

          if (index === 0) ctx.moveTo(canvasX, canvasY);
          else ctx.lineTo(canvasX, canvasY);
        });
        ctx.stroke();
        ctx.globalAlpha = 1.0;

        // Draw current position
        if (
          trajectory.isActive &&
          trajectory.x !== undefined &&
          trajectory.y !== undefined
        ) {
          const canvasX =
            paddingLeft + ((trajectory.x - xmin) / (xmax - xmin)) * plotWidth;
          const canvasY =
            paddingTop +
            plotHeight -
            ((trajectory.y - ymin) / (ymax - ymin)) * plotHeight;

          ctx.fillStyle = `hsl(${hue}, 70%, 40%)`;
          ctx.beginPath();
          ctx.arc(canvasX, canvasY, 4, 0, 2 * Math.PI);
          ctx.fill();
        }
      }
    });
  }, []);

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
      const maxVal = Math.max(Math.abs(xmax), Math.abs(ymax));

      const paddingLeft = 45;
      const paddingRight = 15;
      const paddingTop = 15;
      const paddingBottom = 35;
      const plotWidth = width - paddingLeft - paddingRight;
      const plotHeight = height - paddingTop - paddingBottom;

      // Draw X (Membrane Potential)
      ctx.strokeStyle = currentTheme === "dark" ? "#60a5fa" : "#3b82f6";
      ctx.lineWidth = 2;
      ctx.beginPath();
      let firstPoint = true;

      state.timeSeriesData.forEach((point) => {
        if (point.time >= minTime && point.time <= maxTime) {
          const canvasX =
            paddingLeft + ((point.time - minTime) / timeWindow) * plotWidth;
          const canvasY =
            paddingTop +
            plotHeight -
            ((point.x + maxVal) / (2 * maxVal)) * plotHeight;
          if (firstPoint) {
            ctx.moveTo(canvasX, canvasY);
            firstPoint = false;
          } else {
            ctx.lineTo(canvasX, canvasY);
          }
        }
      });
      ctx.stroke();

      // Draw Y (Recovery Variable)
      ctx.strokeStyle = currentTheme === "dark" ? "#f87171" : "#dc2626";
      ctx.lineWidth = 2;
      ctx.beginPath();
      firstPoint = true;

      state.timeSeriesData.forEach((point) => {
        if (point.time >= minTime && point.time <= maxTime) {
          const canvasX =
            paddingLeft + ((point.time - minTime) / timeWindow) * plotWidth;
          const canvasY =
            paddingTop +
            plotHeight -
            ((point.y + maxVal) / (2 * maxVal)) * plotHeight;
          if (firstPoint) {
            ctx.moveTo(canvasX, canvasY);
            firstPoint = false;
          } else {
            ctx.lineTo(canvasX, canvasY);
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

    const { u, a, b, z, speed } = state.params;
    if (speed === 0) {
      state.animationId = requestAnimationFrame(animationLoop);
      return;
    }

    const dt = 0.05 * speed;

    // Update trajectories
    state.trajectories = state.trajectories.map((traj) => {
      if (!traj.isActive) return traj;

      // FitzHugh-Nagumo differential equations
      const computeDerivatives = (x, y) => {
        const dxdt = -y + x - (x * x * x) / 3 + z;
        const dydt = u * (x + a - b * y);
        return [dxdt, dydt];
      };

      const [x_curr, y_curr] = [traj.x, traj.y];

      // RK4 integration
      const k1 = computeDerivatives(x_curr, y_curr);
      const k2 = computeDerivatives(
        x_curr + (dt * k1[0]) / 2,
        y_curr + (dt * k1[1]) / 2,
      );
      const k3 = computeDerivatives(
        x_curr + (dt * k2[0]) / 2,
        y_curr + (dt * k2[1]) / 2,
      );
      const k4 = computeDerivatives(x_curr + dt * k3[0], y_curr + dt * k3[1]);

      let newX = x_curr + (dt / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]);
      let newY = y_curr + (dt / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);

      const isInBounds =
        newX >= xmin && newX <= xmax && newY >= ymin && newY <= ymax;
      const newTrail = [...traj.trail.slice(-150), { x: newX, y: newY }];

      return {
        ...traj,
        x: newX,
        y: newY,
        trail: newTrail,
        isActive: isInBounds,
      };
    });

    state.time += dt;

    // Update React time state periodically
    if (Math.floor(state.time * 10) !== Math.floor((state.time - dt) * 10)) {
      setCurrentTime(state.time);
    }

    // Update time series data
    const activeTraj = state.trajectories.find((t) => t.isActive);
    if (activeTraj) {
      const currentX = activeTraj.x || 0;
      const currentY = activeTraj.y || 0;

      state.timeSeriesData = [
        ...state.timeSeriesData.slice(-500),
        {
          time: state.time,
          x: currentX,
          y: currentY,
        },
      ];
    }

    // Draw only dynamic elements
    const dynamicCanvas = dynamicCanvasRef.current;
    const timeCanvas = timeSeriesCanvasRef.current;

    if (dynamicCanvas) {
      const ctx = dynamicCanvas.getContext("2d");
      drawDynamicElements(dynamicCanvas, ctx);
    }

    if (timeCanvas) {
      const ctx = timeCanvas.getContext("2d");
      drawTimeSeries(timeCanvas, ctx);
    }

    // Continue animation
    state.animationId = requestAnimationFrame(animationLoop);
  }, [drawDynamicElements, drawTimeSeries]);

  // Control functions
  const startAnimation = useCallback(() => {
    if (animationStateRef.current.isRunning) return;
    animationStateRef.current.isRunning = true;
    setIsAnimating(true);
    animationLoop();
  }, [animationLoop]);

  const stopAnimation = useCallback(() => {
    animationStateRef.current.isRunning = false;
    setIsAnimating(false);
    if (animationStateRef.current.animationId) {
      cancelAnimationFrame(animationStateRef.current.animationId);
      animationStateRef.current.animationId = null;
    }
  }, []);

  // Canvas click handler
  const handleCanvasClick = useCallback(
    (event) => {
      const canvas = dynamicCanvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const clickX = event.clientX - rect.left;
      const clickY = event.clientY - rect.top;

      const paddingLeft = 45;
      const paddingRight = 15;
      const paddingTop = 15;
      const paddingBottom = 35;

      const plotWidth = rect.width - paddingLeft - paddingRight;
      const plotHeight = rect.height - paddingTop - paddingBottom;

      if (
        clickX < paddingLeft ||
        clickX > paddingLeft + plotWidth ||
        clickY < paddingTop ||
        clickY > paddingTop + plotHeight
      )
        return;

      const dataX = ((clickX - paddingLeft) / plotWidth) * (xmax - xmin) + xmin;
      const dataY = ymax - ((clickY - paddingTop) / plotHeight) * (ymax - ymin);

      if (dataX < xmin || dataY < ymin || dataX > xmax || dataY > ymax) return;

      const colorHues = [120, 240, 60, 300, 180, 0];
      const hue =
        colorHues[
          animationStateRef.current.trajectories.length % colorHues.length
        ];

      const newTrajectory = {
        id: Date.now() + Math.random(),
        x: dataX,
        y: dataY,
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

  // Reset simulation
  const resetSimulation = useCallback(() => {
    stopAnimation();
    animationStateRef.current.trajectories = [];
    animationStateRef.current.time = 0;
    animationStateRef.current.timeSeriesData = [];
    setCurrentTime(0);

    // Redraw static elements
    if (staticCanvasRef.current) {
      const ctx = staticCanvasRef.current.getContext("2d");
      drawStaticElements(staticCanvasRef.current, ctx);
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
  }, [stopAnimation, drawStaticElements]);

  const updateParam = useCallback((param, value) => {
    setUiParams((prev) => ({ ...prev, [param]: value }));
  }, []);

  // Preset parameter functions
  const loadDefaultPreset = useCallback(() => {
    setUiParams({
      u: 0.1,
      a: 0.7,
      b: 0.8,
      z: 0.0,
      speed: 2,
    });
  }, []);

  const loadVanDerPolPreset = useCallback(() => {
    setUiParams({
      u: 0.1,
      a: 0.0,
      b: 0.0,
      z: 0.0,
      speed: 2,
    });
  }, []);

  // Initialize canvases
  useEffect(() => {
    [staticCanvasRef, dynamicCanvasRef, timeSeriesCanvasRef].forEach((ref) => {
      if (ref.current) {
        const canvas = ref.current;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
      }
    });

    // Draw initial static elements
    if (staticCanvasRef.current) {
      const ctx = staticCanvasRef.current.getContext("2d");
      drawStaticElements(staticCanvasRef.current, ctx);
    }
  }, [drawStaticElements]);

  // Redraw static elements when parameters change
  useEffect(() => {
    if (staticCanvasRef.current) {
      const ctx = staticCanvasRef.current.getContext("2d");
      drawStaticElements(staticCanvasRef.current, ctx);
    }
  }, [uiParams, showNullclines, drawStaticElements]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAnimation();
    };
  }, [stopAnimation]);

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
        {/* Static background layer */}
        <canvas
          ref={staticCanvasRef}
          className="absolute pointer-events-none"
          style={{
            left: 1,
            bottom: 1,
            width: "calc(100% - 2px)",
            height: "calc(100% - 2px)",
          }}
          width={600}
          height={400}
        />
        {/* Dynamic foreground layer */}
        <canvas
          ref={dynamicCanvasRef}
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
        yLabel="X, Y"
        xRange={[Math.max(0, currentTime - 20), Math.max(20, currentTime)]}
        yRange={[-3, 3]}
        xTicks={[]}
        yTicks={[-3, -2, -1, 0, 1, 2, 3]}
        theme={theme}
        tooltip="Dynamics over time"
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
                    X* = {eq.x.toFixed(2)}, Y* = {eq.y.toFixed(2)}
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
          <div style={{ marginTop: "4px", fontSize: "0.85em" }}>
            <div>
              Membrane Potential (X):{" "}
              {animationStateRef.current.trajectories
                .find((t) => t.isActive)
                ?.x?.toFixed(2) || "0.00"}
            </div>
            <div>
              Recovery Variable (Y):{" "}
              {animationStateRef.current.trajectories
                .find((t) => t.isActive)
                ?.y?.toFixed(2) || "0.00"}
            </div>
          </div>
          <div style={{ marginTop: "6px", fontSize: "0.8em", opacity: 0.8 }}>
            <span
              style={{ color: currentTheme === "dark" ? "#60a5fa" : "#3b82f6" }}
            >
              Blue: X (Membrane)
            </span>{" "}
            |{" "}
            <span
              style={{ color: currentTheme === "dark" ? "#f87171" : "#dc2626" }}
            >
              Red: Y (Recovery)
            </span>
          </div>
        </div>
      </GridDisplay>
    </ToolContainer>
  );
};

export default FitzHughNagumoTool;
