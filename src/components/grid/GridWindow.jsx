// src/components/grid/GridWindow.jsx

import React from "react";
import GridComponent from "./GridComponent";
import { LIGHT_NOISE_TEXTURE, DARK_NOISE_TEXTURE } from "../../themes/textures";

const GridWindow = ({
  x,
  y,
  w = 2,
  h = 2,
  variant = "rectangular", // 'rectangular' or 'circular'
  children,

  // Standard props
  tooltip,
  theme,
}) => {
  // Determine theme and texture
  const isDarkMode = theme.component.includes("gray-700");
  const isUnicornMode = theme.text.includes("purple-800");
  const currentTexture = isDarkMode ? DARK_NOISE_TEXTURE : LIGHT_NOISE_TEXTURE;

  // Calculate window dimensions
  const getWindowClipPath = () => {
    if (variant === "circular") {
      return "circle(45% at 50% 50%)";
    } else {
      return "inset(10% 10% 10% 10% round 8px)";
    }
  };

  // Get glass effect styles
  const getGlassEffectStyles = () => {
    const baseGlow = isUnicornMode
      ? "0 0 20px rgba(236,72,153,0.3), inset 0 0 20px rgba(255,255,255,0.1)"
      : isDarkMode
        ? "0 0 15px rgba(59,130,246,0.3), inset 0 0 15px rgba(255,255,255,0.1)"
        : "0 0 10px rgba(0,0,0,0.1), inset 0 0 10px rgba(255,255,255,0.3)";

    let border;
    if (variant === "circular") {
      if (isUnicornMode) {
        border = "3px solid rgba(236,72,153,0.4)";
      } else if (isDarkMode) {
        border = "3px solid rgba(255,255,255,0.4)";
      } else {
        border = "3px solid rgba(0,0,0,0.6)"; // Dark bevel for Light mode
      }
    } else {
      border = `1px solid ${isUnicornMode ? "rgba(236,72,153,0.3)" : "rgba(255,255,255,0.3)"}`;
    }

    return {
      boxShadow: baseGlow,
      border: border,
    };
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
      {/* Window viewing area */}
      <div
        className="relative w-full h-full overflow-hidden"
        style={{
          background: isDarkMode
            ? "linear-gradient(135deg, #1f2937 0%, #111827 100%)"
            : "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
          clipPath: getWindowClipPath(),
          ...getGlassEffectStyles(),
        }}
      >
        {/* Window content area */}
        <div className="absolute inset-0 overflow-hidden">{children}</div>

        {/* Glass reflection effect */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              variant === "circular"
                ? `radial-gradient(ellipse at 30% 30%, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.1) 40%, transparent 70%)`
                : `linear-gradient(135deg, rgba(255,255,255,0.3) 0%, transparent 50%, rgba(255,255,255,0.1) 100%)`,
            clipPath: getWindowClipPath(),
          }}
        />
      </div>

      {/* Window frame highlight */}
      {variant === "circular" && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            borderRadius: "50%",
            border: isUnicornMode
              ? "2px solid rgba(251,207,232,0.5)"
              : isDarkMode
                ? "2px solid rgba(255,255,255,0.2)"
                : "2px solid rgba(0,0,0,0.3)", // Dark frame for Light mode
            top: "50%",
            left: "50%",
            width: "90%",
            height: "90%",
            transform: "translate(-50%, -50%)",
            boxShadow: isUnicornMode
              ? `inset 0 0 20px rgba(236,72,153,0.2)`
              : isDarkMode
                ? `inset 0 0 20px rgba(255,255,255,0.1)`
                : `inset 0 0 15px rgba(0,0,0,0.2)`, // Dark inset shadow for Light mode
          }}
        />
      )}
    </GridComponent>
  );
};

export default GridWindow;
