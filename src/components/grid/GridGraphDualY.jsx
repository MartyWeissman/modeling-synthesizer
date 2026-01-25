// src/components/grid/GridGraphDualY.jsx

import React, { useRef, useMemo } from "react";
import GridComponent from "./GridComponent";
import { LIGHT_NOISE_TEXTURE, DARK_NOISE_TEXTURE } from "../../themes/textures";
import { getFontStyle } from "../../utils/typography";
import { CELL_SIZE } from "../../themes";

const GridGraphDualY = React.memo(
  ({
    x,
    y,
    w,
    h,
    xLabel = "time",
    yLabelLeft = "left axis",
    yLabelRight = "right axis",
    xUnit = "",
    yUnitLeft = "",
    yUnitRight = "",

    xTicks = [],
    yTicksLeft = [],
    yTicksRight = [],
    yTickLabelsRight = null, // Optional custom labels for right axis
    xRange = [0, 1],
    yRangeLeft = [0, 1],
    yRangeRight = [0, 1],

    leftAxisColor = "#ff4444", // Red for glucose
    rightAxisColor = "#4444ff", // Blue for insulin

    tooltip,
    theme,
    children,
  }) => {
    const [xMin, xMax] = xRange;
    const [yMinLeft, yMaxLeft] = yRangeLeft;
    const [yMinRight, yMaxRight] = yRangeRight;
    const isDarkMode = theme.component.includes("gray-700");
    const isUnicornMode = theme.text.includes("purple-800");
    const currentTexture = isDarkMode
      ? DARK_NOISE_TEXTURE
      : LIGHT_NOISE_TEXTURE;
    const canvasRef = useRef(null);

    // Theme-adaptive colors
    const graphBg = isDarkMode ? "#1f2937" : "#f9fafb";
    const axisColor = isDarkMode ? "#ffffff" : "#000000";
    const textColor = isDarkMode ? "text-white" : "text-black";

    // Calculate dimensions
    const totalWidth = w * CELL_SIZE;
    const totalHeight = h * CELL_SIZE;
    const padding = 8;
    const graphWidth = totalWidth - padding * 2;
    const graphHeight = totalHeight - padding * 2;

    // Calculate dynamic padding for dual Y-axes
    const calculatePadding = () => {
      const maxLeftTickLength = Math.max(
        ...yTicksLeft.map((tick) => tick.toString().length),
      );
      // Use custom labels for right tick width calculation if provided
      const rightTickStrings = yTickLabelsRight
        ? yTickLabelsRight
        : yTicksRight.map((tick) => tick.toString());
      const maxRightTickLength = Math.max(
        ...rightTickStrings.map((label) => label.toString().length),
      );

      const leftTickWidth = Math.max(25, maxLeftTickLength * 6 + 10);
      const rightTickWidth = Math.max(25, maxRightTickLength * 6 + 10);
      const yAxisLabelWidth = 20;

      return {
        left: leftTickWidth + yAxisLabelWidth,
        right: rightTickWidth + yAxisLabelWidth,
        top: 15,
        bottom: 35, // Space for x-axis ticks and label
      };
    };

    const dynamicPadding = calculatePadding();
    const axisWidth = graphWidth - dynamicPadding.left - dynamicPadding.right;
    const axisHeight = graphHeight - dynamicPadding.top - dynamicPadding.bottom;

    // Create transformation functions and positioning info for child canvases
    const transform = useMemo(() => {
      const plotWidth = axisWidth;
      const plotHeight = axisHeight;

      // dataToPixelLeft: convert data (x, yLeft) to plot canvas pixel coordinates
      const dataToPixelLeft = (dataX, dataY) => {
        const pixelX = ((dataX - xMin) / (xMax - xMin)) * plotWidth;
        const pixelY =
          plotHeight -
          ((dataY - yMinLeft) / (yMaxLeft - yMinLeft)) * plotHeight;
        return { x: pixelX, y: pixelY };
      };

      // dataToPixelRight: convert data (x, yRight) to plot canvas pixel coordinates
      const dataToPixelRight = (dataX, dataY) => {
        const pixelX = ((dataX - xMin) / (xMax - xMin)) * plotWidth;
        const pixelY =
          plotHeight -
          ((dataY - yMinRight) / (yMaxRight - yMinRight)) * plotHeight;
        return { x: pixelX, y: pixelY };
      };

      // pixelToDataLeft: convert canvas pixels to data (x, yLeft)
      const pixelToDataLeft = (pixelX, pixelY) => {
        const dataX = xMin + (pixelX / plotWidth) * (xMax - xMin);
        const dataY =
          yMinLeft +
          ((plotHeight - pixelY) / plotHeight) * (yMaxLeft - yMinLeft);
        return { x: dataX, y: dataY };
      };

      // pixelToDataRight: convert canvas pixels to data (x, yRight)
      const pixelToDataRight = (pixelX, pixelY) => {
        const dataX = xMin + (pixelX / plotWidth) * (xMax - xMin);
        const dataY =
          yMinRight +
          ((plotHeight - pixelY) / plotHeight) * (yMaxRight - yMinRight);
        return { x: dataX, y: dataY };
      };

      // CSS style for positioning the plot canvas
      const plotStyle = {
        position: "absolute",
        left: `${dynamicPadding.left}px`,
        bottom: `${dynamicPadding.bottom}px`,
        width: `${plotWidth}px`,
        height: `${plotHeight}px`,
      };

      // CSS style for positioning background canvas
      const backgroundStyle = {
        position: "absolute",
        left: 0,
        top: 0,
        width: `${graphWidth}px`,
        height: `${graphHeight}px`,
      };

      return {
        // Transformation functions for left Y-axis
        dataToPixelLeft,
        pixelToDataLeft,
        // Transformation functions for right Y-axis
        dataToPixelRight,
        pixelToDataRight,
        // Plot area dimensions
        plotWidth,
        plotHeight,
        plotStyle,
        // Background area dimensions
        backgroundWidth: graphWidth,
        backgroundHeight: graphHeight,
        backgroundStyle,
        // Raw padding values
        padding: dynamicPadding,
      };
    }, [
      xMin,
      xMax,
      yMinLeft,
      yMaxLeft,
      yMinRight,
      yMaxRight,
      axisWidth,
      axisHeight,
      graphWidth,
      graphHeight,
      dynamicPadding,
    ]);

    // Format axis labels with units
    const formatAxisLabel = (label, unit) => {
      return unit ? `${label} (${unit})` : label;
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

    // Render tick marks and labels for dual Y-axes
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

        // Grid line
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
      });

      // Left Y-axis ticks (e.g., glucose)
      yTicksLeft.forEach((tickValue, index) => {
        const yPos = dataToPixel(tickValue, yRangeLeft, [0, axisHeight]);

        // Major tick line
        ticks.push(
          <div
            key={`y-left-tick-${index}`}
            className="absolute"
            style={{
              left: `${dynamicPadding.left - 5}px`,
              bottom: `${dynamicPadding.bottom + yPos}px`,
              width: "10px",
              height: "1px",
              backgroundColor: leftAxisColor,
            }}
          />,
        );

        // Tick label (colored)
        ticks.push(
          <div
            key={`y-left-tick-label-${index}`}
            className="absolute"
            style={{
              left: `${dynamicPadding.left - 41}px`,
              bottom: `${dynamicPadding.bottom + yPos - 7}px`,
              width: "35px",
              textAlign: "right",
              fontSize: "11px",
              color: leftAxisColor,
              ...getFontStyle("mono", "500"),
            }}
          >
            {tickValue}
          </div>,
        );
      });

      // Right Y-axis ticks (e.g., insulin)
      yTicksRight.forEach((tickValue, index) => {
        const yPos = dataToPixel(tickValue, yRangeRight, [0, axisHeight]);

        // Major tick line
        ticks.push(
          <div
            key={`y-right-tick-${index}`}
            className="absolute"
            style={{
              left: `${dynamicPadding.left + axisWidth - 5}px`,
              bottom: `${dynamicPadding.bottom + yPos}px`,
              width: "10px",
              height: "1px",
              backgroundColor: rightAxisColor,
            }}
          />,
        );

        // Tick label (colored) - use custom label if provided
        const tickLabel =
          yTickLabelsRight && yTickLabelsRight[index] !== undefined
            ? yTickLabelsRight[index]
            : tickValue;
        ticks.push(
          <div
            key={`y-right-tick-label-${index}`}
            className="absolute"
            style={{
              left: `${dynamicPadding.left + axisWidth + 6}px`,
              bottom: `${dynamicPadding.bottom + yPos - 7}px`,
              width: "35px",
              textAlign: "left",
              fontSize: "11px",
              color: rightAxisColor,
              ...getFontStyle("mono", "500"),
            }}
          >
            {tickLabel}
          </div>,
        );
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
            ? `inset 0 1px 0 0 rgba(255,255,255,0.3), inset 1px 0 0 0 rgba(255,255,255,0.2), inset 0 -1px 0 0 rgba(236,72,153,0.1), inset -1px 0 0 0 rgba(236,72,153,0.1), 0 2px 8px rgba(236,72,153,0.2)`
            : `inset 0 1px 0 0 rgba(255,255,255,0.1), inset 1px 0 0 0 rgba(255,255,255,0.05), inset 0 -1px 0 0 rgba(0,0,0,0.1), inset -1px 0 0 0 rgba(0,0,0,0.05), 0 2px 4px rgba(0,0,0,0.1)`,
          border: isUnicornMode
            ? "1px solid rgba(236,72,153,0.3)"
            : "1px solid rgba(0,0,0,0.1)",
        }}
      >
        <div
          className="w-full h-full rounded border relative"
          style={{
            backgroundColor: graphBg,
            border: "1px solid rgba(0,0,0,0.2)",
            boxShadow: "inset 0 1px 3px rgba(0,0,0,0.1)",
            padding: `${dynamicPadding.top}px ${dynamicPadding.right}px ${dynamicPadding.bottom}px ${dynamicPadding.left}px`,
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              padding: `${dynamicPadding.top}px ${dynamicPadding.right}px ${dynamicPadding.bottom}px ${dynamicPadding.left}px`,
            }}
          >
            {/* Canvas for plotting */}
            <canvas
              ref={canvasRef}
              className="absolute"
              style={{
                left: `${dynamicPadding.left + 1}px`,
                bottom: `${dynamicPadding.bottom + 1}px`,
                width: `${axisWidth - 1}px`,
                height: `${axisHeight - 1}px`,
                pointerEvents: "none",
              }}
              width={axisWidth - 1}
              height={axisHeight - 1}
            />

            {/* X-axis */}
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

            {/* Left Y-axis (colored) */}
            <div
              className="absolute"
              style={{
                left: `${dynamicPadding.left}px`,
                bottom: `${dynamicPadding.bottom + 1}px`,
                width: "1px",
                height: `${axisHeight}px`,
                backgroundColor: leftAxisColor,
              }}
            />

            {/* Right Y-axis (colored) */}
            <div
              className="absolute"
              style={{
                left: `${dynamicPadding.left + axisWidth}px`,
                bottom: `${dynamicPadding.bottom + 1}px`,
                width: "1px",
                height: `${axisHeight}px`,
                backgroundColor: rightAxisColor,
              }}
            />

            {/* Arrow tips */}
            <div
              className="absolute"
              style={{
                left: `${dynamicPadding.left + axisWidth - 7}px`,
                bottom: `${dynamicPadding.bottom - 1.5}px`,
                width: 0,
                height: 0,
                borderLeft: "7px solid " + axisColor,
                borderTop: "2px solid transparent",
                borderBottom: "2px solid transparent",
              }}
            />

            <div
              className="absolute"
              style={{
                left: `${dynamicPadding.left - 1.5}px`,
                top: `${dynamicPadding.top - 7}px`,
                width: 0,
                height: 0,
                borderBottom: "7px solid " + leftAxisColor,
                borderLeft: "2px solid transparent",
                borderRight: "2px solid transparent",
              }}
            />

            <div
              className="absolute"
              style={{
                left: `${dynamicPadding.left + axisWidth - 1.5}px`,
                top: `${dynamicPadding.top - 7}px`,
                width: 0,
                height: 0,
                borderBottom: "7px solid " + rightAxisColor,
                borderLeft: "2px solid transparent",
                borderRight: "2px solid transparent",
              }}
            />

            {renderTicks()}

            {/* X-axis label */}
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
                color: theme.text?.includes("gray-100") ? "#ffffff" : "#000000",
              }}
            >
              {formatAxisLabel(xLabel, xUnit)}
            </div>

            {/* Left Y-axis label */}
            <div
              className="absolute"
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
                color: leftAxisColor,
                ...getFontStyle("mono", "500"),
                whiteSpace: "nowrap",
              }}
            >
              {formatAxisLabel(yLabelLeft, yUnitLeft)}
            </div>

            {/* Right Y-axis label */}
            <div
              className="absolute"
              style={{
                right: "0px",
                top: `${dynamicPadding.top}px`,
                width: "20px",
                height: `${axisHeight}px`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transform: "rotate(90deg)",
                fontSize: "13px",
                color: rightAxisColor,
                ...getFontStyle("mono", "500"),
                whiteSpace: "nowrap",
              }}
            >
              {formatAxisLabel(yLabelRight, yUnitRight)}
            </div>

            {/* Custom graph content - supports both regular children and render prop pattern */}
            {typeof children === "function" ? children(transform) : children}
          </div>
        </div>
      </GridComponent>
    );
  },
);

export default GridGraphDualY;
