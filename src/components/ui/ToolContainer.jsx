// src/components/ui/ToolContainer.jsx

import React from "react";
import { useTheme } from "../../hooks/useTheme";
import {
  generateNoiseTexture,
  LIGHT_NOISE_TEXTURE,
  DARK_NOISE_TEXTURE,
} from "../../themes/textures";

const ToolContainer = ({
  title,
  children,
  canvasWidth = 10,
  canvasHeight = 5,
}) => {
  const { theme } = useTheme();
  const isDarkMode = theme.component.includes("gray-700");
  const currentTexture = isDarkMode ? DARK_NOISE_TEXTURE : LIGHT_NOISE_TEXTURE;

  // Get slightly darker color for beveled top
  const getBeveledTopTexture = () => {
    if (isDarkMode) {
      // Darker version for dark theme
      return generateNoiseTexture(true, 0.85); // 85% of base brightness
    } else {
      // Darker version for light theme
      return generateNoiseTexture(false, 0.9); // 90% of base brightness
    }
  };

  const beveledTexture = getBeveledTopTexture();

  // Calculate dynamic dimensions based on canvas size
  const CELL_SIZE = 100;
  const PADDING = 50;
  const TOP_PANEL_HEIGHT = 48; // 12 * 4 = 48px (h-12)
  const BOTTOM_PADDING = 40;

  const gridWidth = canvasWidth * CELL_SIZE;
  const gridHeight = canvasHeight * CELL_SIZE;
  const containerWidth = gridWidth + PADDING;
  const containerHeight = gridHeight + TOP_PANEL_HEIGHT + BOTTOM_PADDING;

  return (
    <div className="flex justify-center">
      <div
        className={`rounded-xl ${theme.shadow} border-2 border-gray-400`}
        style={{
          width: `${containerWidth}px`,
          height: `${containerHeight}px`,
          background: `url(${currentTexture})`,
          backgroundSize: "64px 64px",
          boxShadow: `
            inset 0 1px 0 0 rgba(255,255,255,0.1),
            inset 1px 0 0 0 rgba(255,255,255,0.05),
            inset 0 -1px 0 0 rgba(0,0,0,0.1),
            inset -1px 0 0 0 rgba(0,0,0,0.05),
            0 4px 8px rgba(0,0,0,0.15)
          `,
        }}
      >
        {/* Beveled top panel */}
        <div
          className="w-full h-12 rounded-t-xl flex items-center justify-between px-6"
          style={{
            background: `url(${beveledTexture})`,
            backgroundSize: "64px 64px",
            boxShadow: `
            inset 0 -2px 4px rgba(0,0,0,0.1),
            inset 0 1px 2px rgba(255,255,255,0.1)
          `,
            borderBottom: "1px solid rgba(0,0,0,0.2)",
          }}
        >
          {/* Tool title */}
          <h1
            className={`text-xl font-medium ${theme.text}`}
            style={{ fontFamily: "'Dancing Script', cursive" }}
          >
            {title}
          </h1>

          {/* Remove the entire right controls section */}
        </div>

        {/* Main content area */}
        <div
          className="relative"
          style={{
            width: `${gridWidth}px`,
            height: `${gridHeight}px`,
            margin: "15px auto 25px auto",
            overflow: "hidden",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

export default ToolContainer;
