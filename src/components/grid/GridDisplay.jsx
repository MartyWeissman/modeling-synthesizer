// src/components/grid/GridDisplay.jsx

import React from "react";
import GridComponent from "./GridComponent";
import { LIGHT_NOISE_TEXTURE, DARK_NOISE_TEXTURE } from "../../themes/textures";
import { CELL_SIZE } from "../../themes";

const GridDisplay = ({
  x,
  y,
  w = 2,
  h = 1, // Default to 2x1 size for readability
  value = "",

  // Display variants
  variant = "default", // 'default', 'numeric', 'alpha', 'status'
  align = "center", // 'left', 'center', 'right'

  // Styling
  fontSize = "auto", // 'auto', 'sm', 'md', 'lg', 'xl'

  // Standard props
  tooltip,
  theme,
}) => {
  // Determine theme and texture
  const isDarkMode = theme.component.includes("gray-700");
  const currentTexture = isDarkMode ? DARK_NOISE_TEXTURE : LIGHT_NOISE_TEXTURE;

  // Fixed border dimensions
  const BORDER_SIZE = 8;

  // Calculate total dimensions
  const totalWidth = w * CELL_SIZE;
  const totalHeight = h * CELL_SIZE;

  // Calculate internal content area dimensions (subtracting borders)
  const contentWidth = totalWidth - BORDER_SIZE * 2;
  const contentHeight = totalHeight - BORDER_SIZE * 2;

  // Get variant-specific styles
  const getVariantStyles = () => {
    switch (variant) {
      case "numeric":
        return {
          textColor: isDarkMode ? "text-green-400" : "text-green-600",
          bgColor: isDarkMode ? "rgba(0,0,0,0.8)" : "rgba(0,0,0,0.9)",
          fontFamily: "font-mono",
          fontWeight: "font-bold",
        };

      case "alpha":
        return {
          textColor: isDarkMode ? "text-blue-400" : "text-blue-600",
          bgColor: isDarkMode ? "rgba(0,0,0,0.8)" : "rgba(0,0,0,0.9)",
          fontFamily: "font-sans",
          fontWeight: "font-semibold",
        };

      case "status":
        return {
          textColor: isDarkMode ? "text-orange-400" : "text-orange-600",
          bgColor: isDarkMode ? "rgba(0,0,0,0.8)" : "rgba(0,0,0,0.9)",
          fontFamily: "font-sans",
          fontWeight: "font-medium",
        };

      default:
        return {
          textColor: isDarkMode ? "text-gray-200" : "text-gray-800",
          bgColor: isDarkMode ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.9)",
          fontFamily: "font-sans",
          fontWeight: "font-medium",
        };
    }
  };

  // Auto-calculate font size based on content area dimensions
  const getFontSize = () => {
    if (fontSize !== "auto") return fontSize;

    const contentArea = contentWidth * contentHeight;
    if (contentArea >= 40000) return "text-4xl"; // Very large displays
    if (contentArea >= 20000) return "text-3xl"; // Large displays
    if (contentArea >= 10000) return "text-2xl"; // Medium displays
    if (contentArea >= 5000) return "text-xl"; // Small displays
    return "text-lg"; // Minimum readable size
  };

  // Get text alignment class
  const getAlignClass = () => {
    switch (align) {
      case "left":
        return "text-left justify-start";
      case "right":
        return "text-right justify-end";
      default:
        return "text-center justify-center";
    }
  };

  const variantStyles = getVariantStyles();

  return (
    <GridComponent
      x={x}
      y={y}
      w={w}
      h={h}
      title={tooltip}
      theme={theme}
      className=""
      style={{
        // Fixed outer frame with texture - this never changes size
        background: `url(${currentTexture})`,
        backgroundSize: "64px 64px",
        boxShadow: `
          inset 0 1px 0 0 rgba(255,255,255,0.1),
          inset 1px 0 0 0 rgba(255,255,255,0.05),
          inset 0 -1px 0 0 rgba(0,0,0,0.1),
          inset -1px 0 0 0 rgba(0,0,0,0.05),
          0 2px 4px rgba(0,0,0,0.1)
        `,
        border: "1px solid rgba(0,0,0,0.2)",
      }}
    >
      {/* Fixed 8px border area - never resizes */}
      <div
        className="absolute inset-0"
        style={{
          padding: `${BORDER_SIZE}px`,
        }}
      >
        {/* Resizable internal content area */}
        <div
          className={`w-full h-full rounded-sm flex items-center ${getAlignClass()} ${variantStyles.textColor} ${variantStyles.fontFamily} ${variantStyles.fontWeight} ${getFontSize()}`}
          style={{
            // This is the resizable part - scales with w/h
            width: `${contentWidth}px`,
            height: `${contentHeight}px`,
            background: variantStyles.bgColor,
            boxShadow: `
              inset 2px 2px 4px rgba(0,0,0,0.3),
              inset -1px -1px 2px rgba(255,255,255,0.1)
            `,
            border: "1px solid rgba(0,0,0,0.3)",
            letterSpacing: variant === "numeric" ? "0.05em" : "normal",
            overflow: "hidden",
            padding: "4px 8px",
          }}
        >
          <div
            className="w-full"
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: contentWidth < 120 ? "nowrap" : "normal", // Allow wrapping in wider displays
              wordBreak: "break-word",
            }}
          >
            {value}
          </div>
        </div>
      </div>
    </GridComponent>
  );
};

export default GridDisplay;
