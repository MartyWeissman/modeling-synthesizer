// src/components/grid/GridGraph.jsx

import React, { useRef } from "react";
import GridComponent from "./GridComponent";
import { LIGHT_NOISE_TEXTURE, DARK_NOISE_TEXTURE } from "../../themes/textures";
import { getFontStyle } from "../../utils/typography";
import { CELL_SIZE } from "../../themes";

const GridGraph = React.memo(
  ({
    x,
    y,
    w,
    h,
    xLabel = "tuna",
    yLabel = "sharks",
    xUnit = "", // e.g., "hours", "seconds"
    yUnit = "", // e.g., "mg", "units"
    xLabelColor = null, // Optional custom color for x-axis label
    yLabelColor = null, // Optional custom color for y-axis label
    variant = "default", // "default", "time-series-static", "time-series-dynamic"

    xTicks = [], // Array of tick positions for x-axis
    yTicks = [], // Array of tick positions for y-axis
    xRange = [0, 1], // [min, max] for x-axis
    yRange = [0, 1], // [min, max] for y-axis
    tooltip,
    theme,
    children,
  }) => {
    const isDarkMode = theme.component.includes("gray-700");
    const isUnicornMode = theme.text.includes("purple-800");
    const currentTexture = isDarkMode
      ? DARK_NOISE_TEXTURE
      : LIGHT_NOISE_TEXTURE;
    const canvasRef = useRef(null);

    // Theme-adaptive colors
    const graphBg = isDarkMode ? "#1f2937" : "#f9fafb"; // Very dark gray / very light gray
    const axisColor = isDarkMode ? "#ffffff" : "#000000"; // White / black
    const textColor = isDarkMode ? "text-white" : "text-black";

    // Calculate dimensions
    const totalWidth = w * CELL_SIZE;
    const totalHeight = h * CELL_SIZE;
    const padding = 8; // Component padding
    const graphWidth = totalWidth - padding * 2;
    const graphHeight = totalHeight - padding * 2;

    // Calculate dynamic padding based on tick labels
    const calculatePadding = () => {
      // Y-axis padding - depends on longest tick label
      const maxYTickLength = Math.max(
        ...yTicks.map((tick) => tick.toString().length),
      );
      const yTickWidth = Math.max(25, maxYTickLength * 6 + 10); // 6px per character + 10px margin
      const yAxisLabelWidth = 20; // Additional space for rotated y-axis label

      // X-axis padding - needs space for tick labels + axis label
      const xTickHeight = 15; // Space for tick labels
      const xAxisLabelHeight = 20; // Space for axis label

      return {
        left: yTickWidth + yAxisLabelWidth,
        right: 15,
        top: 15,
        bottom: xTickHeight + xAxisLabelHeight,
      };
    };

    const dynamicPadding = calculatePadding();
    const axisWidth = graphWidth - dynamicPadding.left - dynamicPadding.right;
    const axisHeight = graphHeight - dynamicPadding.top - dynamicPadding.bottom;

    // Format axis labels with units
    const formatAxisLabel = (label, unit) => {
      if (unit) {
        return `${label} (${unit})`;
      }
      return label;
    };

    // Convert data coordinates to pixel coordinates
    const dataToPixel = (value, range, pixelRange) => {
      const [dataMin, dataMax] = range;
      const [pixelMin, pixelMax] = pixelRange;
      return (
        pixelMin +
        ((value - dataMin) / (dataMax - dataMin)) * (pixelMax - pixelMin)
      );
    };

    // Render tick marks and labels
    const renderTicks = () => {
      const ticks = [];

      // X-axis ticks
      xTicks.forEach((tickValue, index) => {
        const xPos = dataToPixel(tickValue, xRange, [0, axisWidth]);

        // Major tick line
        ticks.push(
          <div
            key={`x-tick-${index}`}
            className="absolute"
            style={{
              left: `${dynamicPadding.left + xPos}px`,
              bottom: `${dynamicPadding.bottom - 5}px`,
              width: "1px",
              height: "10px",
              backgroundColor: axisColor,
            }}
          />,
        );

        // Tick label
        ticks.push(
          <div
            key={`x-tick-label-${index}`}
            className={`absolute ${textColor}`}
            style={{
              left: `${dynamicPadding.left + xPos - 15}px`,
              bottom: `${dynamicPadding.bottom - 17}px`,
              width: "30px",
              textAlign: "center",
              fontSize: "11px",
              ...getFontStyle("mono", "500"),
            }}
          >
            {tickValue}
          </div>,
        );

        // Grid line extending upward
        if (
          variant === "time-series-static" ||
          variant === "time-series-dynamic"
        ) {
          ticks.push(
            <div
              key={`x-grid-${index}`}
              className="absolute"
              style={{
                left: `${dynamicPadding.left + xPos}px`,
                bottom: `${dynamicPadding.bottom + 1}px`,
                width: "1px",
                height: `${axisHeight - 1}px`,
                backgroundColor: isDarkMode ? "#4b5563" : "#d1d5db",
                opacity: 0.5,
              }}
            />,
          );
        }
      });

      // Y-axis ticks
      yTicks.forEach((tickValue, index) => {
        const yPos = dataToPixel(tickValue, yRange, [0, axisHeight]);

        // Major tick line
        ticks.push(
          <div
            key={`y-tick-${index}`}
            className="absolute"
            style={{
              left: `${dynamicPadding.left - 5}px`,
              bottom: `${dynamicPadding.bottom + yPos}px`,
              width: "10px",
              height: "1px",
              backgroundColor: axisColor,
            }}
          />,
        );

        // Tick label
        ticks.push(
          <div
            key={`y-tick-label-${index}`}
            className={`absolute ${textColor}`}
            style={{
              left: `${dynamicPadding.left - 41}px`,
              bottom: `${dynamicPadding.bottom + yPos - 7}px`,
              width: "35px",
              textAlign: "right",
              fontSize: "11px",
              ...getFontStyle("mono", "500"),
            }}
          >
            {tickValue}
          </div>,
        );

        // Grid line extending rightward
        if (
          variant === "time-series-static" ||
          variant === "time-series-dynamic"
        ) {
          ticks.push(
            <div
              key={`y-grid-${index}`}
              className="absolute"
              style={{
                left: `${dynamicPadding.left + 1}px`,
                bottom: `${dynamicPadding.bottom + yPos}px`,
                width: `${axisWidth - 1}px`,
                height: "1px",
                backgroundColor: isDarkMode ? "#4b5563" : "#d1d5db",
                opacity: 0.5,
              }}
            />,
          );
        }
      });

      return ticks;
    };

    return (
      <GridComponent
        x={x}
        y={y}
        w={w}
        h={h}
        title={tooltip}
        theme={theme}
        className="p-2"
        style={{
          background: isUnicornMode
            ? `linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(251,207,232,0.3) 50%, rgba(196,181,253,0.3) 100%), url(${currentTexture})`
            : `url(${currentTexture})`,
          backgroundSize: "cover, 64px 64px",
          boxShadow: isUnicornMode
            ? `
              inset 0 1px 0 0 rgba(255,255,255,0.3),
              inset 1px 0 0 0 rgba(255,255,255,0.2),
              inset 0 -1px 0 0 rgba(236,72,153,0.1),
              inset -1px 0 0 0 rgba(236,72,153,0.1),
              0 2px 8px rgba(236,72,153,0.2)
            `
            : `
              inset 0 1px 0 0 rgba(255,255,255,0.1),
              inset 1px 0 0 0 rgba(255,255,255,0.05),
              inset 0 -1px 0 0 rgba(0,0,0,0.1),
              inset -1px 0 0 0 rgba(0,0,0,0.05),
              0 2px 4px rgba(0,0,0,0.1)
            `,
          border: isUnicornMode
            ? "1px solid rgba(236,72,153,0.3)"
            : "1px solid rgba(0,0,0,0.1)",
        }}
      >
        {/* Inner graph area */}
        <div
          className="w-full h-full rounded border relative"
          style={{
            backgroundColor: graphBg,
            border: "1px solid rgba(0,0,0,0.2)",
            boxShadow: "inset 0 1px 3px rgba(0,0,0,0.1)",
            padding: `${dynamicPadding.top}px ${dynamicPadding.right}px ${dynamicPadding.bottom}px ${dynamicPadding.left}px`,
          }}
        >
          {/* Graph content area with proper padding */}
          <div
            className="absolute inset-0"
            style={{
              padding: `${dynamicPadding.top}px ${dynamicPadding.right}px ${dynamicPadding.bottom}px ${dynamicPadding.left}px`,
            }}
          >
            {/* Canvas for plotting - positioned within axes bounds */}
            <canvas
              ref={canvasRef}
              className="absolute"
              style={{
                left: `${dynamicPadding.left + 1}px`, // Start just after y-axis
                bottom: `${dynamicPadding.bottom + 1}px`, // Use bottom positioning like axis ticks
                width: `${axisWidth - 1}px`, // End just before arrow
                height: `${axisHeight - 1}px`, // End just above x-axis
                pointerEvents: "none", // Let mouse events pass through to container
              }}
              width={axisWidth - 1} // Canvas internal width
              height={axisHeight - 1} // Canvas internal height
            />

            {/* X-axis (horizontal) */}
            <div
              className="absolute"
              style={{
                left: `${dynamicPadding.left}px`,
                bottom: `${dynamicPadding.bottom}px`,
                width: `${axisWidth}px`,
                height: "1px",
                backgroundColor: axisColor,
              }}
            />

            {/* X-axis arrow tip - 7px long, 5px wide, centered with 1.5px */}
            <div
              className="absolute"
              style={{
                left: `${dynamicPadding.left + axisWidth - 7}px`,
                bottom: `${dynamicPadding.bottom - 1.5}px`, // Your discovered 1.5px offset
                width: 0,
                height: 0,
                borderLeft: "7px solid " + axisColor,
                borderTop: "2px solid transparent",
                borderBottom: "2px solid transparent",
              }}
            />

            {/* Y-axis (vertical) - positioned from bottom like x-axis */}
            <div
              className="absolute"
              style={{
                left: `${dynamicPadding.left}px`,
                bottom: `${dynamicPadding.bottom + 1}px`, // Start 1px above x-axis
                width: "1px",
                height: `${axisHeight}px`,
                backgroundColor: axisColor,
              }}
            />

            {/* Y-axis arrow tip - 7px long, 5px wide, centered with 1.5px */}
            <div
              className="absolute"
              style={{
                left: `${dynamicPadding.left - 1.5}px`, // Your discovered 1.5px offset
                top: `${dynamicPadding.top - 7}px`,
                width: 0,
                height: 0,
                borderBottom: "7px solid " + axisColor,
                borderLeft: "2px solid transparent",
                borderRight: "2px solid transparent",
              }}
            />

            {/* Render ticks and grid lines */}
            {renderTicks()}

            {/* X-axis label - in dedicated bottom region */}
            <div
              className={`absolute ${textColor}`}
              style={{
                left: `${dynamicPadding.left}px`,
                bottom: "0px",
                width: `${axisWidth}px`,
                height: "20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "13px",
                ...getFontStyle("mono", "500"),
                color:
                  xLabelColor ||
                  (theme.text?.includes("gray-100") ? "#ffffff" : "#000000"),
              }}
            >
              {formatAxisLabel(xLabel, xUnit)}
            </div>

            {/* Y-axis label - in dedicated left region */}
            <div
              className={`absolute ${textColor}`}
              style={{
                left: "0px",
                top: `${dynamicPadding.top}px`,
                width: "20px",
                height: `${axisHeight}px`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transform: "rotate(-90deg)",
                fontSize: "13px",
                ...getFontStyle("mono", "500"),
                color:
                  yLabelColor ||
                  (theme.text?.includes("gray-100") ? "#ffffff" : "#000000"),
                whiteSpace: "nowrap",
              }}
            >
              {formatAxisLabel(yLabel, yUnit)}
            </div>

            {/* Custom graph content can go here */}
            {children}
          </div>
        </div>
      </GridComponent>
    );
  },
);

export default GridGraph;
