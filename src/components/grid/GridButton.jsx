// src/components/grid/GridButton.jsx

import React, { useState } from "react";
import GridComponent from "./GridComponent";
import { LIGHT_NOISE_TEXTURE, DARK_NOISE_TEXTURE } from "../../themes/textures";
import { useThemeMode, noiseBackgroundSize } from "./themeMode";

const GridButton = React.memo(
  ({
    x,
    y,
    w = 1, // Width in grid cells
    h = 1, // Height in grid cells
    children,

    // Button behavior
    type = "momentary", // 'momentary' or 'toggle'
    active = false, // For toggle buttons - controlled state
    onPress, // Called when button is pressed (both types)
    onToggle, // Called when toggle state changes (toggle only)

    // Styling variants
    variant = "default", // 'default', 'number', 'operator', 'function'
    bgColor = null, // Optional solid color override for the button circle

    // Standard props
    tooltip,
    ariaLabel, // Optional accessible name (defaults to the visible text)
    theme,
  }) => {
    const [momentaryPressed, setMomentaryPressed] = useState(false);

    // Determine theme and texture
    const { isDarkMode, isUnicornMode } = useThemeMode(theme);
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

    // Handle pointer events (only for momentary buttons)
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

    // Keyboard: Enter or Space activates the button (like a native <button>).
    const handleKeyDown = (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (e.repeat) return;
        if (type === "momentary") setMomentaryPressed(true);
        handleClick();
      }
    };

    const handleKeyUp = (e) => {
      if (e.key === "Enter" || e.key === " ") {
        if (type === "momentary") setMomentaryPressed(false);
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
        w={w}
        h={h}
        title={tooltip}
        theme={theme}
        className="p-1.5 cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp} // Release if mouse leaves
        onClick={handleClick}
        role="button"
        tabIndex={0}
        ariaPressed={type === "toggle" ? !!active : undefined}
        ariaLabel={ariaLabel}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        style={{
          // Outer frame with texture
          background: isUnicornMode
            ? `linear-gradient(135deg, rgba(255,255,255,0.99) 0%, rgba(251,207,232,0.15) 50%, rgba(196,181,253,0.15) 100%), url(${currentTexture})`
            : `url(${currentTexture})`,
          backgroundSize: noiseBackgroundSize(isUnicornMode),
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
            background: bgColor
              ? isPressed
                ? `linear-gradient(135deg, ${bgColor}cc 0%, ${bgColor}b3 100%), url(${currentTexture})`
                : `linear-gradient(135deg, ${bgColor}55 0%, ${bgColor}44 100%), url(${currentTexture})`
              : isPressed
                ? `${variantStyles.activeGradient}, url(${currentTexture})`
                : isUnicornMode
                  ? `linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(251,207,232,0.3) 50%, rgba(196,181,253,0.3) 100%), url(${currentTexture})`
                  : `url(${currentTexture})`,
            // Every branch above has a gradient layer except the plain texture
            backgroundSize: noiseBackgroundSize(
              !!bgColor || isPressed || isUnicornMode,
            ),
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
