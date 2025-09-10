// src/components/grid/GridButton.jsx

import React, { useState } from "react";
import GridComponent from "./GridComponent";
import { LIGHT_NOISE_TEXTURE, DARK_NOISE_TEXTURE } from "../../themes/textures";

const GridButton = React.memo(
  ({
    x,
    y,
    children,

    // Button behavior
    type = "momentary", // 'momentary' or 'toggle'
    active = false, // For toggle buttons - controlled state
    onPress, // Called when button is pressed (both types)
    onToggle, // Called when toggle state changes (toggle only)

    // Styling variants
    variant = "default", // 'default', 'number', 'operator', 'function'

    // Standard props
    tooltip,
    theme,
  }) => {
    const [momentaryPressed, setMomentaryPressed] = useState(false);

    // Determine theme and texture
    const isDarkMode = theme.component.includes("gray-700");
    const isUnicornMode = theme.text.includes("purple-800");
    const currentTexture = isDarkMode
      ? DARK_NOISE_TEXTURE
      : LIGHT_NOISE_TEXTURE;

    // For toggle buttons, use the active prop; for momentary, use internal pressed state
    const isPressed = type === "toggle" ? active : momentaryPressed;

    // Handle click based on button type
    const handleClick = () => {
      if (type === "toggle") {
        onToggle?.(!active); // Toggle the state
      }
      onPress?.(); // Always call onPress if provided
    };

    // Handle mouse events (only for momentary buttons)
    const handleMouseDown = () => {
      if (type === "momentary") {
        setMomentaryPressed(true);
      }
    };

    const handleMouseUp = () => {
      if (type === "momentary") {
        setMomentaryPressed(false);
      }
    };

    // Get variant-specific styles
    const getVariantStyles = () => {
      if (isUnicornMode) {
        return {
          textClass: "text-purple-800 text-lg font-bold",
          activeGradient:
            "linear-gradient(135deg, rgba(236,72,153,0.6) 0%, rgba(147,51,234,0.6) 50%, rgba(59,130,246,0.6) 100%)",
        };
      }

      switch (variant) {
        case "number":
          return {
            textClass: "text-lg font-bold",
            activeGradient: isDarkMode
              ? "linear-gradient(135deg, rgba(59,130,246,0.8) 0%, rgba(37,99,235,0.8) 100%)"
              : "linear-gradient(135deg, rgba(191,219,254,0.8) 0%, rgba(147,197,253,0.8) 100%)",
          };

        case "operator":
          return {
            textClass: "text-lg font-bold",
            activeGradient: isDarkMode
              ? "linear-gradient(135deg, rgba(234,88,12,0.8) 0%, rgba(194,65,12,0.8) 100%)"
              : "linear-gradient(135deg, rgba(254,215,170,0.8) 0%, rgba(253,186,116,0.8) 100%)",
          };

        case "function":
          return {
            textClass: "text-xs font-medium",
            activeGradient: isDarkMode
              ? "linear-gradient(135deg, rgba(16,185,129,0.8) 0%, rgba(5,150,105,0.8) 100%)"
              : "linear-gradient(135deg, rgba(167,243,208,0.8) 0%, rgba(110,231,183,0.8) 100%)",
          };

        default:
          return {
            textClass: "text-xs font-medium",
            activeGradient: isDarkMode
              ? "linear-gradient(135deg, rgba(30,58,138,0.8) 0%, rgba(29,78,216,0.8) 100%)"
              : "linear-gradient(135deg, rgba(219,234,254,0.8) 0%, rgba(147,197,253,0.8) 100%)",
          };
      }
    };

    const variantStyles = getVariantStyles();

    return (
      <GridComponent
        x={x}
        y={y}
        w={1}
        h={1}
        title={tooltip}
        theme={theme}
        className="p-1.5 cursor-pointer select-none"
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp} // Release if mouse leaves
        onClick={handleClick}
        style={{
          // Outer frame with texture
          background: isUnicornMode
            ? `linear-gradient(135deg, rgba(255,255,255,0.99) 0%, rgba(251,207,232,0.15) 50%, rgba(196,181,253,0.15) 100%), url(${currentTexture})`
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
        <div
          className={`w-full h-full rounded-full flex items-center justify-center transition-all duration-150 ${isUnicornMode ? variantStyles.textClass : theme.text}`}
          style={{
            background: isPressed
              ? `${variantStyles.activeGradient}, url(${currentTexture})`
              : isUnicornMode
                ? `linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(251,207,232,0.3) 50%, rgba(196,181,253,0.3) 100%), url(${currentTexture})`
                : `url(${currentTexture})`,
            backgroundSize: isPressed ? "cover, 64px 64px" : "cover, 64px 64px",
            backgroundBlendMode: isPressed ? "multiply, normal" : "normal",
            boxShadow: isPressed
              ? `
                inset 2px 2px 4px rgba(0,0,0,0.2),
                inset -1px -1px 2px rgba(255,255,255,0.1)
              `
              : `
                0 2px 4px rgba(0,0,0,0.15),
                inset -2px -2px 4px rgba(0,0,0,0.1),
                inset 2px 2px 4px rgba(255,255,255,0.3)
              `,
            transform: isPressed ? "translateY(1px)" : "translateY(0px)",
            border: "1px solid rgba(0,0,0,0.05)",
          }}
        >
          {children}
        </div>
      </GridComponent>
    );
  },
);

export default GridButton;
