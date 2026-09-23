// src/components/grid/GridTimeSeries.jsx

import React, { useRef, useEffect, useCallback } from "react";
import GridGraph from "./GridGraph";
import { useThemeMode } from "./themeMode";
import { setupCanvas } from "../../utils/canvas";

// Extra canvas margin (px) around the plot area so markers and line caps at
// the edges of the plot are not clipped.
const CANVAS_MARGIN = 6;

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
  xTicks: xTicksProp = null, // Optional explicit x-axis ticks (else 6 evenly spaced)
  yTicks: yTicksProp = null, // Optional explicit y-axis ticks (else 6 evenly spaced)
  xTickLabels = null, // Optional custom x tick labels
  yTickLabels = null, // Optional custom y tick labels
  theme,
  tooltip,
  children,
}) => {
  const canvasRef = useRef(null);
  const { isDarkMode } = useThemeMode(theme);
  // GridGraph's transform (plot area size/position + data->pixel mapping),
  // captured during GridGraph's render so we draw in exactly its plot area.
  const transformRef = useRef(null);

  // Generate tick marks based on ranges with smart formatting
  const generateTicks = (range, numTicks = 6) => {
    const [min, max] = range;
    const step = (max - min) / (numTicks - 1);
    return Array.from({ length: numTicks }, (_, i) => {
      const value = min + i * step;
      // Format to avoid long decimals
      if (Math.abs(value) >= 1000) {
        return Math.round(value);
      } else if (Math.abs(value) >= 100) {
        return Math.round(value * 10) / 10;
      } else if (Math.abs(value) >= 10) {
        return Math.round(value * 10) / 10;
      } else {
        return Math.round(value * 100) / 100;
      }
    });
  };

  const xTicks = xTicksProp || generateTicks(timeRange);
  const yTicks = yTicksProp || generateTicks(populationRange);

  // Draw time series (only when the data, ranges, theme or layout change;
  // there is no animation loop).
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const transform = transformRef.current;
    if (!canvas || !transform) return;

    const { plotWidth, plotHeight, dataToPixel } = transform;
    const M = CANVAS_MARGIN;
    const setup = setupCanvas(canvas, {
      width: plotWidth + 2 * M,
      height: plotHeight + 2 * M,
    });
    if (!setup) return;
    const { ctx, width, height } = setup;
    ctx.clearRect(0, 0, width, height);
    ctx.translate(M, M);

    // A point is drawn if it lies inside the plot area (small tolerance).
    const inPlot = (px, py) =>
      px >= -M && px <= plotWidth + M && py >= -M && py <= plotHeight + M;
    const toPixel = (point) => {
      const timeValue = point.t || point.x || point.time || 0;
      const dataValue = point.value || point.y || 0;
      return dataToPixel(timeValue, dataValue);
    };

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
        const { x: px, y: py } = toPixel(point);
        if (inPlot(px, py)) {
          if (!hasStarted) {
            ctx.moveTo(px, py);
            hasStarted = true;
          } else {
            ctx.lineTo(px, py);
          }
        }
      });

      ctx.stroke();

      // Draw markers if enabled
      if (showMarkers && seriesData.data.length < 100) {
        ctx.fillStyle = seriesData.color || "#0066cc";
        seriesData.data.forEach((point) => {
          const { x: px, y: py } = toPixel(point);
          if (inPlot(px, py)) {
            ctx.beginPath();
            ctx.arc(px, py, 3, 0, 2 * Math.PI);
            ctx.fill();
          }
        });
      }
    });

    // Draw current time indicator
    if (currentTime !== null && currentTime !== undefined) {
      const { x: px } = dataToPixel(currentTime, 0);
      if (px >= 0 && px <= plotWidth) {
        ctx.strokeStyle = "#ff4444";
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(px, 0);
        ctx.lineTo(px, plotHeight);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Draw events
    events.forEach((event) => {
      const { x: px } = dataToPixel(event.time, 0);

      if (px >= 0 && px <= plotWidth) {
        const eventColor = event.color || "#ff6600";

        ctx.strokeStyle = eventColor;
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(px, 0);
        ctx.lineTo(px, plotHeight);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = eventColor;
        ctx.beginPath();
        ctx.arc(px, 10, 4, 0, 2 * Math.PI);
        ctx.fill();

        if (event.label) {
          ctx.fillStyle = isDarkMode ? "#ffffff" : "#333333";
          ctx.font = "10px Arial";
          ctx.textAlign = "center";
          ctx.fillText(event.label, px, 28);
        }
      }
    });
  }, [series, currentTime, events, showMarkers, isDarkMode]);

  // Redraw after a render only if something that affects the picture changed
  // (data, markers, theme, or the plot geometry/ranges).
  const lastDrawRef = useRef({});
  useEffect(() => {
    const t = transformRef.current;
    const geometry = t
      ? `${t.plotWidth}|${t.plotHeight}|${timeRange[0]}|${timeRange[1]}|${populationRange[0]}|${populationRange[1]}`
      : "";
    const last = lastDrawRef.current;
    if (last.draw === draw && last.geometry === geometry) return;
    lastDrawRef.current = { draw, geometry };
    draw();
  });

  // Redraw on window resize / devicePixelRatio change (e.g. moving the window
  // to a Retina screen or zooming the browser).
  useEffect(() => {
    window.addEventListener("resize", draw);
    return () => window.removeEventListener("resize", draw);
  }, [draw]);

  // Legend component
  const Legend = () => {
    if (!showLegend || !series.some((s) => s.visible && s.name)) return null;

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
      xTickLabels={xTickLabels}
      yTickLabels={yTickLabels}
      variant="time-series-static"
      theme={theme}
      tooltip={tooltip}
    >
      {(t) => {
        transformRef.current = t;
        return (
          <>
            <canvas
              ref={canvasRef}
              className="absolute"
              style={{
                left: `${t.padding.left - CANVAS_MARGIN}px`,
                bottom: `${t.padding.bottom - CANVAS_MARGIN}px`,
                width: `${t.plotWidth + 2 * CANVAS_MARGIN}px`,
                height: `${t.plotHeight + 2 * CANVAS_MARGIN}px`,
                pointerEvents: "none",
              }}
            />

            <Legend />

            {typeof children === "function" ? children(t) : children}
          </>
        );
      }}
    </GridGraph>
  );
};

export default GridTimeSeries;
