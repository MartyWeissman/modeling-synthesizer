// src/components/grid/GridLabel.jsx

import React from "react";
import GridComponent from "./GridComponent";
import { LIGHT_NOISE_TEXTURE, DARK_NOISE_TEXTURE } from "../../themes/textures";

const GridLabel = ({
  x,
  y,
  w = 1,
  h = 1,
  text = "",
  fontSize = "auto", // "auto", "small", "medium", "large", or number in px
  textAlign = "center", // "left", "center", "right"
  verticalAlign = "middle", // "top", "middle", "bottom"

  // Standard props
  tooltip,
  theme,
}) => {
  // Determine theme and texture
  const isDarkMode = theme.component.includes("gray-700");
  const isUnicornMode = theme.text.includes("purple-800");
  const currentTexture = isDarkMode ? DARK_NOISE_TEXTURE : LIGHT_NOISE_TEXTURE;

  // Calculate font size based on component size and text length
  const calculateFontSize = () => {
    if (fontSize !== "auto") {
      if (typeof fontSize === "number") return `${fontSize}px`;

      switch (fontSize) {
        case "small":
          return "10px";
        case "medium":
          return "12px";
        case "large":
          return "16px";
        default:
          return "12px";
      }
    }

    // Auto-size based on component dimensions and text length
    const componentWidth = w * 100; // Each grid unit is ~100px
    const componentHeight = h * 100;
    const textLength = text.length || 1;

    // Base font size calculation
    const maxFontSize = Math.min(componentHeight * 0.3, componentWidth * 0.1);
    const textBasedSize = Math.max(
      12,
      Math.min(maxFontSize, (componentWidth / textLength) * 2.25),
    );

    return `${Math.floor(textBasedSize)}px`;
  };

  // Get alignment classes
  const getAlignmentClasses = () => {
    let classes = "flex ";

    // Horizontal alignment
    switch (textAlign) {
      case "left":
        classes += "justify-start ";
        break;
      case "right":
        classes += "justify-end ";
        break;
      case "center":
      default:
        classes += "justify-center ";
        break;
    }

    // Vertical alignment
    switch (verticalAlign) {
      case "top":
        classes += "items-start ";
        break;
      case "bottom":
        classes += "items-end ";
        break;
      case "middle":
      default:
        classes += "items-center ";
        break;
    }

    return classes;
  };

  return (
    <GridComponent
      x={x}
      y={y}
      w={w}
      h={h}
      title={tooltip}
      theme={theme}
      className="p-1 select-none overflow-hidden"
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
          ? "1px solid rgba(236,72,153,0.2)"
          : "1px solid rgba(0,0,0,0.1)",
      }}
    >
      <div
        className={`w-full h-full ${getAlignmentClasses()}`}
        style={{
          padding: "2px",
        }}
      >
        {text && (
          <div
            className="font-medium leading-tight"
            style={{
              fontSize: calculateFontSize(),
              color: isUnicornMode
                ? "#581c87"
                : isDarkMode
                  ? "#e5e7eb"
                  : "#374151",
              textShadow: isUnicornMode
                ? "0 1px 0 rgba(255,255,255,0.8), 0 -1px 0 rgba(236,72,153,0.2)"
                : isDarkMode
                  ? "0 1px 0 rgba(0,0,0,0.8), 0 -1px 0 rgba(255,255,255,0.1)"
                  : "0 1px 0 rgba(255,255,255,0.8), 0 -1px 0 rgba(0,0,0,0.1)",
              wordWrap: "break-word",
              hyphens: "auto",
              maxWidth: "100%",
              textAlign: textAlign,
            }}
          >
            {text}
          </div>
        )}
      </div>
    </GridComponent>
  );
};

export default GridLabel;
