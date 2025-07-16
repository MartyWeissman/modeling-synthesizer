// src/components/grid/GridGraph.jsx

import React, { useRef } from "react";
import GridComponent from "./GridComponent";
import { LIGHT_NOISE_TEXTURE, DARK_NOISE_TEXTURE } from "../../themes/textures";
import { CELL_SIZE } from "../../themes";

const GridGraph = ({
  x,
  y,
  w,
  h,
  xLabel = "tuna",
  yLabel = "sharks",
  tooltip,
  theme,
  children,
}) => {
  const isDarkMode = theme.component.includes("gray-700");
  const currentTexture = isDarkMode ? DARK_NOISE_TEXTURE : LIGHT_NOISE_TEXTURE;
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

  // Axis positioning with 25px padding
  const axisPadding = 25;
  const axisWidth = graphWidth - 2 * axisPadding;
  const axisHeight = graphHeight - 2 * axisPadding;

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
        background: `url(${currentTexture})`,
        backgroundSize: "64px 64px",
        boxShadow: `
          inset 0 1px 0 0 rgba(255,255,255,0.1),
          inset 1px 0 0 0 rgba(255,255,255,0.05),
          inset 0 -1px 0 0 rgba(0,0,0,0.1),
          inset -1px 0 0 0 rgba(0,0,0,0.05),
          0 2px 4px rgba(0,0,0,0.1)
        `,
        border: "1px solid rgba(0,0,0,0.1)",
      }}
    >
      {/* Inner graph area */}
      <div
        className="w-full h-full rounded border relative"
        style={{
          backgroundColor: graphBg,
          border: "1px solid rgba(0,0,0,0.2)",
          boxShadow: "inset 0 1px 3px rgba(0,0,0,0.1)",
          padding: `${axisPadding}px`,
        }}
      >
        {/* Graph content area with proper padding */}
        <div
          className="absolute inset-0"
          style={{ padding: `${axisPadding}px` }}
        >
          {/* Canvas for plotting - positioned within axes bounds */}
          <canvas
            ref={canvasRef}
            className="absolute"
            style={{
              left: `${axisPadding + 1}px`, // Start just after y-axis
              top: `${axisPadding}px`, // Start at top
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
              left: `${axisPadding}px`,
              bottom: `${axisPadding}px`,
              width: `${axisWidth}px`,
              height: "1px",
              backgroundColor: axisColor,
            }}
          />

          {/* X-axis arrow tip - 7px long, 5px wide, centered with 1.5px */}
          <div
            className="absolute"
            style={{
              left: `${axisPadding + axisWidth - 7}px`,
              bottom: `${axisPadding - 1.5}px`, // Your discovered 1.5px offset
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
              left: `${axisPadding}px`,
              bottom: `${axisPadding + 1}px`, // Start 1px above x-axis
              width: "1px",
              height: `${axisHeight}px`,
              backgroundColor: axisColor,
            }}
          />

          {/* Y-axis arrow tip - 7px long, 5px wide, centered with 1.5px */}
          <div
            className="absolute"
            style={{
              left: `${axisPadding - 1.5}px`, // Your discovered 1.5px offset
              top: `${axisPadding - 7}px`,
              width: 0,
              height: 0,
              borderBottom: "7px solid " + axisColor,
              borderLeft: "2px solid transparent",
              borderRight: "2px solid transparent",
            }}
          />

          {/* X-axis label - properly centered in bottom padding area */}
          <div
            className={`absolute text-sm font-medium ${textColor}`}
            style={{
              left: `${axisPadding}px`,
              bottom: "0px",
              width: `${axisWidth}px`,
              height: `${axisPadding}px`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {xLabel}
          </div>

          {/* Y-axis label - properly centered in left padding area */}
          <div
            className={`absolute text-sm font-medium ${textColor}`}
            style={{
              left: "0px",
              top: `${axisPadding}px`,
              width: `${axisPadding}px`,
              height: `${axisHeight}px`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transform: "rotate(-90deg)",
            }}
          >
            {yLabel}
          </div>

          {/* Custom graph content can go here */}
          {children}
        </div>
      </div>
    </GridComponent>
  );
};

export default GridGraph;
