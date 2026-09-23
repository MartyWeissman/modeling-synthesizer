// src/components/grid/GridSliderHorizontal.jsx

import React, { useState, useRef, useCallback } from "react";
import GridComponent from "./GridComponent";
import { LIGHT_NOISE_TEXTURE, DARK_NOISE_TEXTURE } from "../../themes/textures";
import { formatMathText, getFontStyle } from "../../utils/typography";
import { useThemeMode, noiseBackgroundSize } from "./themeMode";

// Geometry of the track and knob (px, relative to the slider area)
const TRACK_LEFT = 16; // left end of the channel track
const KNOB_SIZE = 24; // knob diameter (w-6)

const GridSliderHorizontal = React.memo(
  ({
    x,
    y,
    w = 2, // Default width of 2 for horizontal layout
    h = 1, // Default height of 1
    value,
    onChange,
    variant = "bipolar", // 'bipolar' or 'unipolar'
    // Optional value range. If omitted: bipolar -100..100, unipolar 0..100
    // (the historical behavior, with integer steps).
    min: minProp,
    max: maxProp,
    step: stepProp, // Optional; default 1 without min/max, else (max-min)/100
    label = "", // Text label above the slider
    tooltip,
    ariaLabel, // Optional accessible name (defaults to the label)
    ariaValueText, // Optional human-readable value for screen readers
    theme,
  }) => {
    const [isDragging, setIsDragging] = useState(false);
    const sliderRef = useRef(null);
    const { isDarkMode, isUnicornMode } = useThemeMode(theme);

    // Value range in the caller's units
    const hasRange =
      Number.isFinite(minProp) && Number.isFinite(maxProp) && maxProp > minProp;
    const min = hasRange ? minProp : variant === "bipolar" ? -100 : 0;
    const max = hasRange ? maxProp : 100;
    const step =
      Number.isFinite(stepProp) && stepProp > 0
        ? stepProp
        : hasRange
          ? (max - min) / 100
          : 1;

    // Snap to the step grid and clamp to [min, max]
    const snap = useCallback(
      (v) => {
        const n = Math.round((v - min) / step);
        const snapped = min + n * step;
        const clamped = Math.max(min, Math.min(max, snapped));
        return parseFloat(clamped.toPrecision(12));
      },
      [min, max, step],
    );

    // Fraction of the way from min to max (0..1)
    const fraction = Math.max(
      0,
      Math.min(1, ((Number(value) || 0) - min) / (max - min)),
    );
    // Value on the internal -100..100 (bipolar) / 0..100 (unipolar) scale used
    // for the colors below
    const scaled = variant === "bipolar" ? fraction * 200 - 100 : fraction * 100;
    const currentTexture = isDarkMode
      ? DARK_NOISE_TEXTURE
      : LIGHT_NOISE_TEXTURE;

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

    // Knob position as a percentage of the knob's travel
    const getSliderPosition = () => fraction * 100;

    // Get channel glow color based on value and variant
    const getChannelGlow = () => {
      if (variant === "bipolar") {
        const color = getBipolarColor(scaled);
        const intensity = (Math.abs(scaled) / 100) * 0.5; // Max 50% intensity
        return `0 0 ${intensity * 20}px rgba(${color[0]}, ${color[1]}, ${color[2]}, ${intensity})`;
      } else {
        const color = isUnicornMode
          ? getUnicornColor(scaled)
          : getYlOrRedColor(scaled);
        const intensity = (scaled / 100) * 0.5; // Max 50% intensity
        return `0 0 ${intensity * 20}px rgba(${color[0]}, ${color[1]}, ${color[2]}, ${intensity})`;
      }
    };

    // Get slider knob color based on value and variant (always use light colors)
    const getKnobColor = () => {
      // Always use light texture for knobs regardless of theme
      const lightTexture = LIGHT_NOISE_TEXTURE;

      if (variant === "bipolar") {
        const color = getBipolarColor(scaled);
        const intensity = (Math.abs(scaled) / 100) * 0.6; // Max 60% intensity
        return `linear-gradient(135deg,
        rgba(${color[0]}, ${color[1]}, ${color[2]}, ${0.3 + intensity * 0.5}) 0%,
        rgba(${Math.round(color[0] * 0.8)}, ${Math.round(color[1] * 0.8)}, ${Math.round(color[2] * 0.8)}, ${0.4 + intensity * 0.4}) 100%),
        url(${lightTexture})`;
      } else {
        // Unipolar - use unicorn colors if in unicorn mode, otherwise YlOrRed
        const color = isUnicornMode
          ? getUnicornColor(scaled)
          : getYlOrRedColor(scaled);
        const intensity = (scaled / 100) * 0.6; // Max 60% intensity
        return `linear-gradient(135deg,
        rgba(${color[0]}, ${color[1]}, ${color[2]}, ${0.3 + intensity * 0.5}) 0%,
        rgba(${Math.round(color[0] * 0.8)}, ${Math.round(color[1] * 0.8)}, ${Math.round(color[2] * 0.8)}, ${0.4 + intensity * 0.4}) 100%),
        url(${lightTexture})`;
      }
    };

    // Calculate track width based on component width (accounting for padding)
    const getTrackWidth = useCallback(() => {
      // Approximate calculation: w * 100px - padding
      return w * 100 - 32; // 16px padding on each side
    }, [w]);

    // Convert a pointer x-coordinate to a value. The knob centre travels from
    // TRACK_LEFT + KNOB_SIZE/2 to TRACK_LEFT + trackWidth - KNOB_SIZE/2 (the
    // same range the knob is drawn over), so clicking on the knob leaves the
    // value unchanged.
    const valueFromClientX = useCallback(
      (clientX) => {
        const el = sliderRef.current;
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        // Undo any CSS scale applied by an ancestor (e.g. ToolContainer)
        const scale = el.offsetWidth > 0 ? rect.width / el.offsetWidth : 1;
        const relativeX = (clientX - rect.left) / (scale || 1);
        const travel = getTrackWidth() - KNOB_SIZE;
        const start = TRACK_LEFT + KNOB_SIZE / 2;
        const f = Math.max(0, Math.min(1, (relativeX - start) / travel));
        return snap(min + f * (max - min));
      },
      [getTrackWidth, snap, min, max],
    );

    const emit = useCallback(
      (newValue) => {
        if (newValue === null || newValue === undefined || isNaN(newValue))
          return;
        onChange?.(newValue);
      },
      [onChange],
    );

    // Pointer handling (mouse, touch and pen) for horizontal movement
    const handlePointerDown = useCallback(
      (e) => {
        if (e.pointerType === "mouse" && e.button !== 0) return; // Only left mouse button

        e.preventDefault();
        e.stopPropagation();
        const el = e.currentTarget;
        el.focus?.({ preventScroll: true });
        try {
          el.setPointerCapture?.(e.pointerId);
        } catch {
          // ignore (e.g. synthetic events)
        }
        setIsDragging(true);

        emit(valueFromClientX(e.clientX));

        const handleMove = (ev) => {
          if (ev.pointerId !== e.pointerId) return;
          emit(valueFromClientX(ev.clientX));
        };
        const handleUp = (ev) => {
          if (ev.pointerId !== e.pointerId) return;
          setIsDragging(false);
          el.removeEventListener("pointermove", handleMove);
          el.removeEventListener("pointerup", handleUp);
          el.removeEventListener("pointercancel", handleUp);
        };

        el.addEventListener("pointermove", handleMove);
        el.addEventListener("pointerup", handleUp);
        el.addEventListener("pointercancel", handleUp);
      },
      [emit, valueFromClientX],
    );

    // Keyboard: arrows = one step, PageUp/PageDown = 10 steps, Home/End = ends
    const handleKeyDown = useCallback(
      (e) => {
        const current = Number(value) || 0;
        let next = null;
        switch (e.key) {
          case "ArrowRight":
          case "ArrowUp":
            next = current + step;
            break;
          case "ArrowLeft":
          case "ArrowDown":
            next = current - step;
            break;
          case "PageUp":
            next = current + 10 * step;
            break;
          case "PageDown":
            next = current - 10 * step;
            break;
          case "Home":
            next = min;
            break;
          case "End":
            next = max;
            break;
          default:
            return;
        }
        e.preventDefault();
        emit(snap(next));
      },
      [value, step, min, max, snap, emit],
    );

    const sliderPosition = getSliderPosition();
    const trackWidth = getTrackWidth();

    return (
      <GridComponent
        x={x}
        y={y}
        w={w}
        h={h}
        title={tooltip}
        theme={theme}
        className="p-2 select-none"
        style={{
          backgroundImage: isUnicornMode
            ? `linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(251,207,232,0.2) 50%, rgba(196,181,253,0.2) 100%), url(${currentTexture})`
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
        <div className="w-full h-full flex flex-col">
          {/* Label area */}
          {label && (
            <div className="flex-shrink-0 mb-2" style={{ marginTop: "10px" }}>
              <div
                className={`text-sm font-medium text-center ${theme.text} truncate`}
              >
                {formatMathText(label).map((segment, index) => (
                  <span
                    key={index}
                    style={
                      segment.type === "greek"
                        ? getFontStyle("greek", "500")
                        : getFontStyle("sans", "500")
                    }
                    className={segment.type === "greek" ? "italic" : ""}
                  >
                    {segment.text}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Slider area */}
          <div className="flex-1 relative">
            <div
              ref={sliderRef}
              className="w-full h-full relative flex items-center cursor-pointer rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              style={{ touchAction: "none" }}
              onPointerDown={handlePointerDown}
              onKeyDown={handleKeyDown}
              role="slider"
              tabIndex={0}
              aria-valuemin={min}
              aria-valuemax={max}
              aria-valuenow={parseFloat((Number(value) || 0).toPrecision(10))}
              aria-valuetext={ariaValueText || label || undefined}
              aria-label={ariaLabel || label || tooltip || undefined}
              aria-orientation="horizontal"
            >
              {/* Channel track */}
              <div
                className="absolute h-6 rounded-full pointer-events-none"
                style={{
                  left: "16px",
                  width: `${trackWidth}px`,
                  top: "50%",
                  transform: "translateY(-50%)",
                  backgroundImage: `
                  linear-gradient(to right,
                    rgba(0,0,0,0.3) 0%,
                    rgba(0,0,0,0.1) 50%,
                    rgba(0,0,0,0.3) 100%
                  ),
                  url(${currentTexture})
                `,
                  backgroundSize: "cover, 32px 32px",
                  boxShadow: `
                  inset 0 0 8px rgba(0,0,0,0.4),
                  inset 0 2px 4px rgba(0,0,0,0.2),
                  inset 0 -2px 4px rgba(0,0,0,0.2),
                  ${getChannelGlow()}
                `,
                  border: "1px solid rgba(0,0,0,0.3)",
                }}
              />

              {/* Slider knob */}
              <div
                className="absolute w-6 h-6 rounded-full pointer-events-none"
                style={{
                  left: `${TRACK_LEFT + (sliderPosition / 100) * (trackWidth - KNOB_SIZE)}px`, // Knob spans the track ends
                  top: "50%",
                  backgroundImage: getKnobColor(),
                  backgroundSize: "cover, 32px 32px",
                  backgroundBlendMode:
                    (variant === "bipolar" && scaled !== 0) ||
                    (variant === "unipolar" && scaled > 5)
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
                    ? "translateY(-50%) scale(1.05)"
                    : "translateY(-50%) scale(1)",
                  transition: isDragging ? "none" : "transform 0.1s ease",
                  zIndex: 10,
                }}
              />

              {/* Center line for bipolar */}
              {variant === "bipolar" && (
                <div
                  className={`absolute w-0.5 h-8 ${isDarkMode ? "bg-white" : "bg-gray-600"} opacity-30 pointer-events-none`}
                  style={{
                    left: `${16 + trackWidth / 2}px`,
                    top: "50%",
                    transform: "translateY(-50%)",
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </GridComponent>
    );
  },
);

export default GridSliderHorizontal;
