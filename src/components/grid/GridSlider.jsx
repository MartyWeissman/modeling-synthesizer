// src/components/grid/GridSlider.jsx

import React, { useState, useRef, useCallback } from "react";
import GridComponent from "./GridComponent";
import { LIGHT_NOISE_TEXTURE, DARK_NOISE_TEXTURE } from "../../themes/textures";

const GridSlider = ({
  x,
  y,
  value,
  onChange,
  variant = "bipolar", // 'bipolar' or 'unipolar'
  tooltip,
  theme,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const sliderRef = useRef(null);
  const isDarkMode = theme.component.includes("gray-700");
  const isUnicornMode = theme.text.includes("purple-800");
  const currentTexture = isDarkMode ? DARK_NOISE_TEXTURE : LIGHT_NOISE_TEXTURE;

  // Linear interpolation between two colors
  const lerpColor = (color1, color2, factor) => {
    const result = color1.slice();
    for (let i = 0; i < 3; i++) {
      result[i] = Math.round(result[i] + factor * (color2[i] - result[i]));
    }
    return result;
  };

  // Get interpolated color for bipolar (smooth linear blend)
  const getBipolarColor = (value) => {
    const gray = [180, 180, 180]; // Neutral gray
    const warmRed = [239, 68, 68]; // Warm red for POSITIVE
    const coolBlue = [59, 130, 246]; // Cool blue for NEGATIVE

    const absValue = Math.abs(value);
    const factor = absValue / 100; // 0 to 1

    if (value > 0) {
      // Positive: interpolate from gray to warm red
      return lerpColor(gray, warmRed, factor);
    } else if (value < 0) {
      // Negative: interpolate from gray to cool blue
      return lerpColor(gray, coolBlue, factor);
    } else {
      return gray;
    }
  };

  // Get YlOrRed color for unipolar (Yellow-Orange-Red)
  const getYlOrRedColor = (value) => {
    const factor = value / 100; // 0 to 1

    if (factor <= 0.5) {
      // 0-50%: Yellow [255,247,188] to Orange [254,196,79]
      const localFactor = factor / 0.5;
      return lerpColor([255, 247, 188], [254, 196, 79], localFactor);
    } else {
      // 50-100%: Orange [254,196,79] to Red [217,95,14]
      const localFactor = (factor - 0.5) / 0.5;
      return lerpColor([254, 196, 79], [217, 95, 14], localFactor);
    }
  };

  // Get unicorn rainbow color
  const getUnicornColor = (value) => {
    const factor = value / 100; // 0 to 1

    if (factor <= 0.16) {
      // Pink to Purple
      const localFactor = factor / 0.16;
      return lerpColor([236, 72, 153], [147, 51, 234], localFactor);
    } else if (factor <= 0.33) {
      // Purple to Blue
      const localFactor = (factor - 0.16) / 0.17;
      return lerpColor([147, 51, 234], [59, 130, 246], localFactor);
    } else if (factor <= 0.5) {
      // Blue to Teal
      const localFactor = (factor - 0.33) / 0.17;
      return lerpColor([59, 130, 246], [20, 184, 166], localFactor);
    } else if (factor <= 0.66) {
      // Teal to Green
      const localFactor = (factor - 0.5) / 0.16;
      return lerpColor([20, 184, 166], [34, 197, 94], localFactor);
    } else if (factor <= 0.83) {
      // Green to Yellow
      const localFactor = (factor - 0.66) / 0.17;
      return lerpColor([34, 197, 94], [234, 179, 8], localFactor);
    } else {
      // Yellow to Orange
      const localFactor = (factor - 0.83) / 0.17;
      return lerpColor([234, 179, 8], [249, 115, 22], localFactor);
    }
  };

  // Calculate slider position based on variant
  const getSliderPosition = () => {
    if (variant === "bipolar") {
      // -100 to +100 maps to 0% to 100% position (50% = center)
      return ((value + 100) / 200) * 100;
    } else {
      // 0 to 100 maps to 0% to 100% position
      return value;
    }
  };

  // Get channel glow color based on value and variant
  const getChannelGlow = () => {
    if (variant === "bipolar") {
      const color = getBipolarColor(value);
      const intensity = (Math.abs(value) / 100) * 0.5; // Max 50% intensity
      return `0 0 ${intensity * 20}px rgba(${color[0]}, ${color[1]}, ${color[2]}, ${intensity})`;
    } else {
      const color = isUnicornMode
        ? getUnicornColor(value)
        : getYlOrRedColor(value);
      const intensity = (value / 100) * 0.5; // Max 50% intensity
      return `0 0 ${intensity * 20}px rgba(${color[0]}, ${color[1]}, ${color[2]}, ${intensity})`;
    }
  };

  // Get slider knob color based on value and variant (always use light colors)
  const getKnobColor = () => {
    // Always use light texture for knobs regardless of theme
    const lightTexture = LIGHT_NOISE_TEXTURE;

    if (variant === "bipolar") {
      const color = getBipolarColor(value);
      const intensity = (Math.abs(value) / 100) * 0.6; // Max 60% intensity
      return `linear-gradient(135deg,
        rgba(${color[0]}, ${color[1]}, ${color[2]}, ${0.3 + intensity * 0.5}) 0%,
        rgba(${Math.round(color[0] * 0.8)}, ${Math.round(color[1] * 0.8)}, ${Math.round(color[2] * 0.8)}, ${0.4 + intensity * 0.4}) 100%),
        url(${lightTexture})`;
    } else {
      // Unipolar - use unicorn colors if in unicorn mode, otherwise YlOrRed
      const color = isUnicornMode
        ? getUnicornColor(value)
        : getYlOrRedColor(value);
      const intensity = (value / 100) * 0.6; // Max 60% intensity
      return `linear-gradient(135deg,
        rgba(${color[0]}, ${color[1]}, ${color[2]}, ${0.3 + intensity * 0.5}) 0%,
        rgba(${Math.round(color[0] * 0.8)}, ${Math.round(color[1] * 0.8)}, ${Math.round(color[2] * 0.8)}, ${0.4 + intensity * 0.4}) 100%),
        url(${lightTexture})`;
    }
  };

  // Corrected mouse handling with proper positioning
  const handleMouseDown = useCallback(
    (e) => {
      if (e.button !== 0) return; // Only left mouse button

      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);

      const updateValue = (clientY) => {
        if (!sliderRef.current) return;

        const rect = sliderRef.current.getBoundingClientRect();
        const relativeY = clientY - rect.top;

        // Convert to position within the usable track (where knob center can be)
        const knobCenterY = relativeY;
        const trackPosition = knobCenterY - 10; // Subtract track start position
        const clampedPosition = Math.max(0, Math.min(260, trackPosition)); // Clamp to track bounds

        // Convert to percentage
        const percentage = 1 - clampedPosition / 260; // Flip Y axis

        let newValue;
        if (variant === "bipolar") {
          newValue = (percentage - 0.5) * 200; // -100 to +100
          newValue = Math.round(Math.max(-100, Math.min(100, newValue)));
        } else {
          newValue = percentage * 100; // 0 to 100
          newValue = Math.round(Math.max(0, Math.min(100, newValue)));
        }

        onChange(newValue);
      };

      // Update immediately
      updateValue(e.clientY);

      const handleMouseMove = (e) => {
        updateValue(e.clientY);
      };

      const handleMouseUp = () => {
        setIsDragging(false);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [onChange, variant],
  );

  const sliderPosition = getSliderPosition();

  return (
    <GridComponent
      x={x}
      y={y}
      w={1}
      h={3}
      title={tooltip}
      theme={theme}
      className="p-2 select-none"
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
      {/* Slider Channel */}
      <div
        ref={sliderRef}
        className="w-full h-full relative flex items-center justify-center cursor-pointer"
        onMouseDown={handleMouseDown}
      >
        {/* Channel track */}
        <div
          className="absolute w-6 h-full rounded-full pointer-events-none"
          style={{
            background: `
              linear-gradient(to bottom,
                rgba(0,0,0,0.3) 0%,
                rgba(0,0,0,0.1) 50%,
                rgba(0,0,0,0.3) 100%
              ),
              url(${currentTexture})
            `,
            backgroundSize: "cover, 32px 32px",
            boxShadow: `
              inset 0 0 8px rgba(0,0,0,0.4),
              inset 2px 0 4px rgba(0,0,0,0.2),
              inset -2px 0 4px rgba(0,0,0,0.2),
              ${getChannelGlow()}
            `,
            border: "1px solid rgba(0,0,0,0.3)",
          }}
        />

        {/* Slider knob - corrected positioning */}
        <div
          className="absolute w-6 h-6 rounded-full pointer-events-none"
          style={{
            // Knob top = knob center position - knob radius
            top: `${-2 + (1 - sliderPosition / 100) * 260}px`,
            left: "50%",
            background: getKnobColor(),
            backgroundSize: "cover, 32px 32px",
            backgroundBlendMode:
              (variant === "bipolar" && value !== 0) ||
              (variant === "unipolar" && value > 5)
                ? "multiply, normal"
                : "normal",
            boxShadow: isDragging
              ? `
                  0 2px 8px rgba(0,0,0,0.3),
                  inset -2px -2px 4px rgba(0,0,0,0.2),
                  inset 2px 2px 4px rgba(255,255,255,0.4)
                `
              : `
                  0 4px 8px rgba(0,0,0,0.2),
                  inset -2px -2px 4px rgba(0,0,0,0.1),
                  inset 2px 2px 6px rgba(255,255,255,0.3)
                `,
            border: "1px solid rgba(0,0,0,0.1)",
            transform: isDragging
              ? "translateX(-50%) scale(1.05)"
              : "translateX(-50%) scale(1)",
            transition: isDragging ? "none" : "transform 0.1s ease",
            zIndex: 10,
          }}
        />

        {/* Center line for bipolar */}
        {variant === "bipolar" && (
          <div
            className={`absolute w-8 h-0.5 ${isDarkMode ? "bg-white" : "bg-gray-600"} opacity-30 pointer-events-none`}
            style={{ top: "50%", transform: "translateY(-50%)" }}
          />
        )}
      </div>
    </GridComponent>
  );
};

export default GridSlider;
