// src/components/grid/GridVectorField.jsx

import React, { useRef, useEffect, useCallback } from "react";
import GridGraph from "./GridGraph";

const GridVectorField = ({
  x,
  y,
  w,
  h,
  xLabel = "State Variable 1",
  yLabel = "State Variable 2",
  xRange = [0, 50],
  yRange = [0, 50],
  vectorField = [], // Array of {x, y, dx, dy, normalizedDx, normalizedDy, magnitude}
  trajectories = [], // Array of trajectory objects
  equilibria = [], // Array of equilibrium points {x, y, stability}
  onCanvasClick = null, // Callback for canvas clicks
  showVectorField = true,
  showTrajectories = true,
  showEquilibria = true,
  arrowScale = 1.0,
  arrowColor = "rgba(150, 150, 150, 0.7)",
  trajectoryColors = [
    "#ff6b35",
    "#00d4aa",
    "#4a90e2",
    "#f5a623",
    "#bd10e0",
    "#b8e986",
  ],
  theme,
  tooltip,
  children,
}) => {
  const canvasRef = useRef(null);
  const animationIdRef = useRef(null);

  // Generate tick marks based on ranges
  const generateTicks = (range, numTicks = 6) => {
    const [min, max] = range;
    const step = (max - min) / (numTicks - 1);
    return Array.from(
      { length: numTicks },
      (_, i) => Math.round((min + i * step) * 100) / 100,
    );
  };

  const xTicks = generateTicks(xRange);
  const yTicks = generateTicks(yRange);

  // Store current props in refs for animation access
  const propsRef = useRef({
    vectorField,
    trajectories,
    equilibria,
    showVectorField,
    showTrajectories,
    showEquilibria,
    arrowScale,
    arrowColor,
    trajectoryColors,
    xRange,
    yRange,
  });

  // Update refs when props change
  useEffect(() => {
    propsRef.current = {
      vectorField,
      trajectories,
      equilibria,
      showVectorField,
      showTrajectories,
      showEquilibria,
      arrowScale,
      arrowColor,
      trajectoryColors,
      xRange,
      yRange,
    };
  }, [
    vectorField,
    trajectories,
    equilibria,
    showVectorField,
    showTrajectories,
    showEquilibria,
    arrowScale,
    arrowColor,
    trajectoryColors,
    xRange,
    yRange,
  ]);

  // Main drawing function using refs
  const draw = useRef(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();

    // Set canvas size to match display size
    if (canvas.width !== rect.width || canvas.height !== rect.height) {
      canvas.width = rect.width;
      canvas.height = rect.height;
    }

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Get current data from refs
    const {
      vectorField: currentVectorField,
      trajectories: currentTrajectories,
      equilibria: currentEquilibria,
      showVectorField: currentShowVectorField,
      showTrajectories: currentShowTrajectories,
      showEquilibria: currentShowEquilibria,
      arrowScale: currentArrowScale,
      arrowColor: currentArrowColor,
      trajectoryColors: currentTrajectoryColors,
      xRange: currentXRange,
      yRange: currentYRange,
    } = propsRef.current;

    // Coordinate conversion functions
    const dataToCanvas = (dataX, dataY) => {
      const [xMin, xMax] = currentXRange;
      const [yMin, yMax] = currentYRange;
      const canvasX = ((dataX - xMin) / (xMax - xMin)) * canvas.width;
      const canvasY =
        canvas.height - ((dataY - yMin) / (yMax - yMin)) * canvas.height;
      return [canvasX, canvasY];
    };

    // Draw vector field arrows
    if (currentShowVectorField && currentVectorField.length > 0) {
      ctx.strokeStyle = currentArrowColor;
      ctx.fillStyle = currentArrowColor;
      ctx.lineWidth = 1;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      const arrowLength = 10 * currentArrowScale;
      const arrowHeadSize = 3 * currentArrowScale;

      currentVectorField.forEach(
        ({ x: dataX, y: dataY, normalizedDx, normalizedDy, magnitude }) => {
          if (magnitude < 1e-6) return;

          const [canvasX, canvasY] = dataToCanvas(dataX, dataY);

          // Only draw if within bounds
          if (
            canvasX >= 0 &&
            canvasX <= canvas.width &&
            canvasY >= 0 &&
            canvasY <= canvas.height
          ) {
            // Draw arrow shaft
            const endX = canvasX + normalizedDx * arrowLength;
            const endY = canvasY - normalizedDy * arrowLength;

            ctx.beginPath();
            ctx.moveTo(canvasX, canvasY);
            ctx.lineTo(endX, endY);
            ctx.stroke();

            // Draw arrow head
            const angle = Math.atan2(-normalizedDy, normalizedDx);

            ctx.beginPath();
            ctx.moveTo(endX, endY);
            ctx.lineTo(
              endX - arrowHeadSize * Math.cos(angle - Math.PI / 6),
              endY + arrowHeadSize * Math.sin(angle - Math.PI / 6),
            );
            ctx.lineTo(
              endX - arrowHeadSize * Math.cos(angle + Math.PI / 6),
              endY + arrowHeadSize * Math.sin(angle + Math.PI / 6),
            );
            ctx.closePath();
            ctx.fill();
          }
        },
      );
    }

    // Draw trajectories
    if (currentShowTrajectories && currentTrajectories.length > 0) {
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      currentTrajectories.forEach((trajectory, trajIndex) => {
        if (!trajectory.points || trajectory.points.length < 2) return;

        const color =
          trajectory.color ||
          currentTrajectoryColors[trajIndex % currentTrajectoryColors.length];

        // Draw trajectory path if more than one point
        if (trajectory.points.length > 1) {
          ctx.strokeStyle = color;
          ctx.lineWidth = trajectory.lineWidth || 2;

          ctx.beginPath();
          let hasStarted = false;

          trajectory.points.forEach((point) => {
            const [canvasX, canvasY] = dataToCanvas(point.x, point.y);

            // Only draw points that are visible
            if (
              canvasX >= 0 &&
              canvasX <= canvas.width &&
              canvasY >= 0 &&
              canvasY <= canvas.height
            ) {
              if (!hasStarted) {
                ctx.moveTo(canvasX, canvasY);
                hasStarted = true;
              } else {
                ctx.lineTo(canvasX, canvasY);
              }
            }
          });

          if (hasStarted) {
            ctx.stroke();
          }
        }

        // Draw current position for active trajectories
        if (
          trajectory.s !== undefined &&
          trajectory.t !== undefined &&
          trajectory.isActive
        ) {
          const [currentX, currentY] = dataToCanvas(trajectory.s, trajectory.t);

          if (
            currentX >= 0 &&
            currentX <= canvas.width &&
            currentY >= 0 &&
            currentY <= canvas.height
          ) {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(currentX, currentY, 4, 0, 2 * Math.PI);
            ctx.fill();
          }
        }

        // Draw starting point with distinctive style
        if (trajectory.points.length > 0) {
          const startPoint = trajectory.points[0];
          const [startX, startY] = dataToCanvas(startPoint.x, startPoint.y);

          if (
            startX >= 0 &&
            startX <= canvas.width &&
            startY >= 0 &&
            startY <= canvas.height
          ) {
            // Outer circle
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(startX, startY, 4, 0, 2 * Math.PI);
            ctx.fill();

            // Inner white dot
            ctx.fillStyle = "white";
            ctx.beginPath();
            ctx.arc(startX, startY, 2, 0, 2 * Math.PI);
            ctx.fill();
          }
        }
      });
    }

    // Draw equilibrium points
    if (currentShowEquilibria && currentEquilibria.length > 0) {
      currentEquilibria.forEach(({ x: dataX, y: dataY, stability }) => {
        const [canvasX, canvasY] = dataToCanvas(dataX, dataY);

        // Only draw if visible
        if (
          canvasX >= 0 &&
          canvasX <= canvas.width &&
          canvasY >= 0 &&
          canvasY <= canvas.height
        ) {
          // Choose colors based on stability
          let fillColor = "#666666";
          let strokeColor = "#333333";

          switch (stability) {
            case "stable":
              fillColor = "#2563eb";
              strokeColor = "#1d4ed8";
              break;
            case "unstable":
              fillColor = "#dc2626";
              strokeColor = "#b91c1c";
              break;
            case "saddle":
              fillColor = "#f59e0b";
              strokeColor = "#d97706";
              break;
            default:
              break;
          }

          // Draw equilibrium point
          ctx.fillStyle = fillColor;
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = 2;

          ctx.beginPath();
          ctx.arc(canvasX, canvasY, 6, 0, 2 * Math.PI);
          ctx.fill();
          ctx.stroke();

          // Center dot
          ctx.fillStyle = "white";
          ctx.beginPath();
          ctx.arc(canvasX, canvasY, 2.5, 0, 2 * Math.PI);
          ctx.fill();
        }
      });
    }
  });

  // Handle canvas click
  const handleCanvasClick = useCallback(
    (event) => {
      if (!onCanvasClick) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const canvasX = event.clientX - rect.left;
      const canvasY = event.clientY - rect.top;

      // Convert to internal canvas coordinates
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const scaledX = canvasX * scaleX;
      const scaledY = canvasY * scaleY;

      const { xRange: currentXRange, yRange: currentYRange } = propsRef.current;
      const [xMin, xMax] = currentXRange;
      const [yMin, yMax] = currentYRange;
      const dataX = xMin + (scaledX / canvas.width) * (xMax - xMin);
      const dataY = yMax - (scaledY / canvas.height) * (yMax - yMin);

      onCanvasClick(dataX, dataY, scaledX, scaledY);
    },
    [onCanvasClick],
  );

  // Animation loop - NO React dependencies to avoid re-renders
  useEffect(() => {
    const animate = () => {
      draw.current();
      animationIdRef.current = requestAnimationFrame(animate);
    };

    // Start animation loop
    animationIdRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, []); // Empty dependency array!

  // Handle window resize - NO React dependencies
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []); // Empty dependency array!

  // Initial draw - NO React dependencies
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }, 100);
    return () => clearTimeout(timeoutId);
  }, []); // Empty dependency array!

  return (
    <GridGraph
      x={x}
      y={y}
      w={w}
      h={h}
      xLabel={xLabel}
      yLabel={yLabel}
      xRange={xRange}
      yRange={yRange}
      xTicks={xTicks}
      yTicks={yTicks}
      theme={theme}
      tooltip={tooltip}
    >
      <canvas
        ref={canvasRef}
        className={`absolute ${onCanvasClick ? "cursor-crosshair" : "cursor-default"}`}
        style={{
          left: 1,
          bottom: 1,
          width: "calc(100% - 2px)",
          height: "calc(100% - 2px)",
          pointerEvents: onCanvasClick ? "auto" : "none",
        }}
        width={400}
        height={300}
        onClick={handleCanvasClick}
      />

      {children}
    </GridGraph>
  );
};

export default GridVectorField;
