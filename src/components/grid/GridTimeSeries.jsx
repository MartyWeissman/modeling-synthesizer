// src/components/grid/GridTimeSeries.jsx

import React, { useRef, useEffect, useCallback } from "react";
import GridGraph from "./GridGraph";

const GridTimeSeries = ({
  x,
  y,
  w,
  h,
  xLabel = "Time",
  yLabel = "Population",
  xUnit = "",
  yUnit = "",
  timeRange = [0, 20],
  populationRange = [0, 100],
  series = [], // Array of {name, data, color, visible} objects
  showLegend = true,
  showMarkers = false,
  currentTime = null, // Vertical line at current time
  events = [], // Array of {time, label, color} for special events
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

  const xTicks = generateTicks(timeRange);
  const yTicks = generateTicks(populationRange);

  // Convert data coordinates to canvas coordinates
  const dataToCanvas = useCallback(
    (dataX, dataY, canvasWidth, canvasHeight) => {
      const [xMin, xMax] = timeRange;
      const [yMin, yMax] = populationRange;

      const canvasX = ((dataX - xMin) / (xMax - xMin)) * canvasWidth;
      const canvasY =
        canvasHeight - ((dataY - yMin) / (yMax - yMin)) * canvasHeight;

      return [canvasX, canvasY];
    },
    [timeRange, populationRange],
  );

  // Draw time series
  const draw = useCallback(() => {
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

    // Draw series
    series.forEach((seriesData) => {
      if (
        !seriesData.visible ||
        !seriesData.data ||
        seriesData.data.length < 2
      ) {
        return;
      }

      ctx.strokeStyle = seriesData.color || "#0066cc";
      ctx.lineWidth = seriesData.lineWidth || 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      // Draw the line
      ctx.beginPath();
      let hasStarted = false;

      seriesData.data.forEach((point) => {
        const timeValue = point.t || point.x || point.time || 0;
        const dataValue = point.value || point.y || 0;

        const [canvasX, canvasY] = dataToCanvas(
          timeValue,
          dataValue,
          canvas.width,
          canvas.height,
        );

        // Only draw if within bounds
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

      ctx.stroke();

      // Draw markers if enabled
      if (showMarkers && seriesData.data.length < 100) {
        ctx.fillStyle = seriesData.color || "#0066cc";
        seriesData.data.forEach((point) => {
          const timeValue = point.t || point.x || point.time || 0;
          const dataValue = point.value || point.y || 0;

          const [canvasX, canvasY] = dataToCanvas(
            timeValue,
            dataValue,
            canvas.width,
            canvas.height,
          );

          if (
            canvasX >= 0 &&
            canvasX <= canvas.width &&
            canvasY >= 0 &&
            canvasY <= canvas.height
          ) {
            ctx.beginPath();
            ctx.arc(canvasX, canvasY, 3, 0, 2 * Math.PI);
            ctx.fill();
          }
        });
      }
    });

    // Draw current time indicator
    if (currentTime !== null && currentTime !== undefined) {
      const [canvasX] = dataToCanvas(
        currentTime,
        0,
        canvas.width,
        canvas.height,
      );

      if (canvasX >= 0 && canvasX <= canvas.width) {
        ctx.strokeStyle = "#ff4444";
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(canvasX, 0);
        ctx.lineTo(canvasX, canvas.height);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Draw events
    events.forEach((event) => {
      const [canvasX] = dataToCanvas(
        event.time,
        0,
        canvas.width,
        canvas.height,
      );

      if (canvasX >= 0 && canvasX <= canvas.width) {
        const eventColor = event.color || "#ff6600";

        ctx.strokeStyle = eventColor;
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(canvasX, 0);
        ctx.lineTo(canvasX, canvas.height);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = eventColor;
        ctx.beginPath();
        ctx.arc(canvasX, 10, 4, 0, 2 * Math.PI);
        ctx.fill();

        if (event.label) {
          ctx.fillStyle = theme?.component?.includes("gray-700")
            ? "#ffffff"
            : "#333333";
          ctx.font = "10px Arial";
          ctx.textAlign = "center";
          ctx.fillText(event.label, canvasX, 28);
        }
      }
    });
  }, [series, currentTime, events, showMarkers, dataToCanvas, theme]);

  // Animation loop - NO React dependencies to avoid re-renders
  useEffect(() => {
    const animate = () => {
      draw();
      animationIdRef.current = requestAnimationFrame(animate);
    };

    // Start animation loop
    animationIdRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array intentional for stable animation loop!

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

  // Legend component
  const Legend = () => {
    if (!showLegend || !series.some((s) => s.visible && s.name)) return null;

    const isDarkMode = theme?.component?.includes("gray-700");
    const textColor = isDarkMode ? "text-white" : "text-gray-900";
    const bgColor = isDarkMode ? "bg-gray-800" : "bg-white";

    return (
      <div
        className={`absolute top-2 right-2 p-2 rounded shadow-sm ${bgColor} bg-opacity-90 backdrop-blur-sm`}
      >
        {series
          .filter((s) => s.visible && s.name)
          .map((seriesData, index) => (
            <div
              key={`${seriesData.name}-${index}`}
              className={`flex items-center mb-1 text-xs ${textColor}`}
            >
              <div
                className="w-4 h-0.5 mr-2 rounded"
                style={{ backgroundColor: seriesData.color || "#0066cc" }}
              />
              <span className="font-medium">{seriesData.name}</span>
            </div>
          ))}
      </div>
    );
  };

  return (
    <GridGraph
      x={x}
      y={y}
      w={w}
      h={h}
      xLabel={xLabel}
      yLabel={yLabel}
      xUnit={xUnit}
      yUnit={yUnit}
      xRange={timeRange}
      yRange={populationRange}
      xTicks={xTicks}
      yTicks={yTicks}
      variant="time-series-static"
      theme={theme}
      tooltip={tooltip}
    >
      <canvas
        ref={canvasRef}
        className="absolute"
        style={{
          left: 1,
          bottom: 1,
          width: "calc(100% - 2px)",
          height: "calc(100% - 2px)",
          pointerEvents: "none",
        }}
        width={600}
        height={300}
      />

      <Legend />

      {children}
    </GridGraph>
  );
};

export default GridTimeSeries;
