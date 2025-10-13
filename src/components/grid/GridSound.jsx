// src/components/grid/GridSound.jsx
// 1x1 Grid component for sound control with concave speaker and toggle button

import React, { useState, useEffect } from "react";
import GridComponent from "./GridComponent";
import { LIGHT_NOISE_TEXTURE, DARK_NOISE_TEXTURE } from "../../themes/textures";

const GridSound = ({
  x,
  y,
  w = 1,
  h = 1,
  theme,
  onVolumeChange,
  onEnabledChange,
  initialVolume = 0.5,
  initialEnabled = false,
  title = "Sound controls",
}) => {
  const [isEnabled, setIsEnabled] = useState(initialEnabled);

  // Determine theme and texture
  const isDarkMode = theme.component.includes("gray-700");
  const isUnicornMode = theme.text.includes("purple-800");
  const currentTexture = isDarkMode ? DARK_NOISE_TEXTURE : LIGHT_NOISE_TEXTURE;

  // Notify parent of changes
  useEffect(() => {
    onEnabledChange?.(isEnabled);
  }, [isEnabled, onEnabledChange]);

  const handleToggle = () => {
    setIsEnabled(!isEnabled);
  };

  return (
    <GridComponent
      x={x}
      y={y}
      w={w}
      h={h}
      theme={theme}
      title={title}
      className="p-1 select-none"
      style={{
        // Outer frame with texture (matching GridButton)
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
        className="w-full h-full flex flex-col items-center justify-center"
        style={{
          background: isUnicornMode
            ? `linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(251,207,232,0.3) 50%, rgba(196,181,253,0.3) 100%), url(${currentTexture})`
            : `url(${currentTexture})`,
          backgroundSize: "cover, 64px 64px",
        }}
      >
        {/* Concave speaker (75% of component size) */}
        <div
          style={{
            width: "75%",
            height: "75%",
            maxWidth: "70px",
            maxHeight: "70px",
            borderRadius: "50%",
            background: isUnicornMode
              ? `radial-gradient(circle at 30% 30%, rgba(251,207,232,0.4), rgba(147,51,234,0.3)), url(${currentTexture})`
              : `radial-gradient(circle at 30% 30%, ${isDarkMode ? "rgba(55,65,81,0.6)" : "rgba(209,213,219,0.6)"}, ${isDarkMode ? "rgba(17,24,39,0.9)" : "rgba(107,114,128,0.7)"}), url(${currentTexture})`,
            backgroundSize: "cover, 64px 64px",
            // Concave/inset shadow (opposite of button)
            boxShadow: isUnicornMode
              ? `
                inset 3px 3px 6px rgba(147,51,234,0.3),
                inset -2px -2px 4px rgba(255,255,255,0.2)
              `
              : isDarkMode
                ? `
                inset 3px 3px 6px rgba(0,0,0,0.5),
                inset -2px -2px 4px rgba(255,255,255,0.05)
              `
                : `
                inset 3px 3px 6px rgba(0,0,0,0.25),
                inset -2px -2px 4px rgba(255,255,255,0.4)
              `,
            border: isDarkMode
              ? "1px solid rgba(0,0,0,0.3)"
              : "1px solid rgba(0,0,0,0.15)",
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gridTemplateRows: "repeat(4, 1fr)",
            gap: "6%",
            padding: "16%",
            marginBottom: "8px",
          }}
        >
          {/* 16 speaker holes in 4x4 grid */}
          {[...Array(16)].map((_, i) => (
            <div
              key={i}
              style={{
                width: "100%",
                height: "100%",
                borderRadius: "50%",
                background: isDarkMode ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0.4)",
                // Deeper inset for holes
                boxShadow: isDarkMode
                  ? `
                    inset 1px 1px 2px rgba(0,0,0,0.8),
                    inset -0.5px -0.5px 1px rgba(255,255,255,0.02)
                  `
                  : `
                    inset 1px 1px 2px rgba(0,0,0,0.5),
                    inset -0.5px -0.5px 1px rgba(255,255,255,0.2)
                  `,
                opacity: isEnabled ? 0.9 : 0.4,
                transition: "opacity 0.3s",
              }}
            />
          ))}
        </div>

        {/* Wide short ON/OFF toggle button with green glow */}
        <button
          onClick={handleToggle}
          style={{
            width: "80%",
            height: "20%",
            minHeight: "16px",
            maxHeight: "24px",
            fontSize: "10px",
            fontWeight: "bold",
            borderRadius: "4px",
            border: isEnabled
              ? "1px solid rgba(34,197,94,0.6)"
              : isDarkMode
                ? "1px solid rgba(75,85,99,0.5)"
                : "1px solid rgba(156,163,175,0.5)",
            background: isEnabled
              ? // Green glow when ON
                isUnicornMode
                ? `linear-gradient(135deg, rgba(134,239,172,0.9) 0%, rgba(34,197,94,0.8) 100%), url(${currentTexture})`
                : isDarkMode
                  ? `linear-gradient(135deg, rgba(34,197,94,0.7) 0%, rgba(22,163,74,0.8) 100%), url(${currentTexture})`
                  : `linear-gradient(135deg, rgba(134,239,172,0.8) 0%, rgba(74,222,128,0.9) 100%), url(${currentTexture})`
              : // Neutral when OFF (not pressed in)
                isUnicornMode
                ? `linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(243,232,255,0.6) 100%), url(${currentTexture})`
                : `url(${currentTexture})`,
            backgroundSize: "cover, 64px 64px",
            boxShadow: isEnabled
              ? // Glowing and pressed-in when ON
                isDarkMode
                ? `
                  inset 2px 2px 3px rgba(0,0,0,0.3),
                  inset -1px -1px 2px rgba(34,197,94,0.2),
                  0 0 8px rgba(34,197,94,0.4)
                `
                : `
                  inset 2px 2px 3px rgba(0,0,0,0.2),
                  inset -1px -1px 2px rgba(255,255,255,0.3),
                  0 0 8px rgba(34,197,94,0.5)
                `
              : // Flat when OFF
                isDarkMode
                ? `
                inset -1px -1px 2px rgba(255,255,255,0.03),
                inset 1px 1px 2px rgba(0,0,0,0.2)
              `
                : `
                inset -1px -1px 2px rgba(255,255,255,0.2),
                inset 1px 1px 2px rgba(0,0,0,0.1)
              `,
            color: isEnabled
              ? isDarkMode
                ? "#ffffff"
                : "#065f46"
              : isUnicornMode
                ? "#9333ea"
                : isDarkMode
                  ? "#9ca3af"
                  : "#6b7280",
            cursor: "pointer",
            transition: "all 0.2s",
            transform: isEnabled ? "translateY(1px)" : "translateY(0)",
          }}
        >
          {isEnabled ? "ON" : "OFF"}
        </button>
      </div>
    </GridComponent>
  );
};

export default GridSound;
