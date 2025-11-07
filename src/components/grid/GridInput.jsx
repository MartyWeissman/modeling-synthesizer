// src/components/grid/GridInput.jsx

import React, { useState, useEffect, useRef, useCallback } from "react";
import GridComponent from "./GridComponent";
import { getFontStyle } from "../../utils/typography";
import { LIGHT_NOISE_TEXTURE, DARK_NOISE_TEXTURE } from "../../themes/textures";

const GridInput = ({
  x,
  y,
  w = 1,
  h = 1,
  value,
  onChange,
  title,
  theme,
  min = 0,
  max = 100,
  step = 0.1,
  variable = "x", // Display name like "p", "alpha", etc.
}) => {
  const [inputValue, setInputValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const componentRef = useRef(null);
  const holdTimeoutRef = useRef(null);
  const holdActionRef = useRef(null);

  // Use refs to avoid stale closures in hold acceleration
  const minRef = useRef(min);
  const maxRef = useRef(max);
  const stepRef = useRef(step);
  const valueRef = useRef(value);

  // Keep refs updated
  minRef.current = min;
  maxRef.current = max;
  stepRef.current = step;
  valueRef.current = value;

  // Determine theme and texture
  const isDarkMode = theme.component.includes("gray-700");
  const isUnicornMode = theme.text.includes("purple-800");
  const currentTexture = isDarkMode ? DARK_NOISE_TEXTURE : LIGHT_NOISE_TEXTURE;

  // Get arrow button colors based on theme
  const arrowColor = isUnicornMode
    ? "#7c3aed"
    : isDarkMode
      ? "#ffffff"
      : "#000000";

  // Calculate appropriate decimal places based on range and step
  const getDecimalPlaces = () => {
    // If step is 1 or greater (integer step), use 0 decimals
    if (step >= 1) return 0;

    const range = max - min;
    if (range >= 100) return 0; // 1-999: no decimals
    if (range >= 10) return 1; // 10-99: 1 decimal
    return 2; // < 10: 2 decimals
  };

  const decimalPlaces = getDecimalPlaces();

  // Format value for display
  const formatValue = useCallback(
    (val) => {
      if (val === null || val === undefined || isNaN(val)) return "";
      return Number(val).toFixed(decimalPlaces);
    },
    [decimalPlaces],
  );

  // Update input when value prop changes
  useEffect(() => {
    if (!isFocused) {
      setInputValue(formatValue(value));
    }
  }, [value, isFocused, decimalPlaces, formatValue]);

  // Handle input changes
  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    const numValue = parseFloat(newValue);
    if (!isNaN(numValue)) {
      // Always call onChange with clamped value, even if out of range
      const clampedValue = Math.max(min, Math.min(max, numValue));
      onChange(clampedValue);
    }
  };

  // Handle increment/decrement
  const handleIncrement = useCallback(() => {
    const newValue = Math.min(max, (value || 0) + step);
    onChange(newValue);
  }, [value, max, step, onChange]);

  const handleDecrement = useCallback(() => {
    const newValue = Math.max(min, (value || 0) - step);
    onChange(newValue);
  }, [value, min, step, onChange]);

  // Mouse hold acceleration logic
  const startHold = useCallback(
    (actionType) => {
      console.log("startHold called with:", actionType); // Debug
      holdActionRef.current = actionType;
      let currentDelay = 300;
      const minDelay = 50;
      const acceleration = 0.8;

      const performAction = () => {
        if (holdTimeoutRef.current === null || !holdActionRef.current) return;
        console.log(
          "performAction called, delay:",
          currentDelay,
          "current value:",
          value,
        ); // Debug

        // Use direct value updates with current value from ref
        if (holdActionRef.current === "increment") {
          const newValue = Math.min(
            maxRef.current,
            (valueRef.current || 0) + stepRef.current,
          );
          onChange(newValue);
        } else if (holdActionRef.current === "decrement") {
          const newValue = Math.max(
            minRef.current,
            (valueRef.current || 0) - stepRef.current,
          );
          onChange(newValue);
        }

        currentDelay = Math.max(minDelay, currentDelay * acceleration);
        holdTimeoutRef.current = setTimeout(performAction, currentDelay);
      };

      holdTimeoutRef.current = setTimeout(performAction, currentDelay);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onChange], // Only onChange needed since we use valueRef for fresh values
  );

  const stopHold = useCallback(() => {
    console.log("stopHold called"); // Debug
    holdActionRef.current = null;
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
  }, []);

  // Simplified mouse event handlers
  const handleIncrementMouseDown = useCallback(
    (e) => {
      e.preventDefault();
      console.log("increment mouse down"); // Debug
      handleIncrement(); // Immediate action
      startHold("increment");
    },
    [handleIncrement, startHold],
  );

  const handleDecrementMouseDown = useCallback(
    (e) => {
      e.preventDefault();
      console.log("decrement mouse down"); // Debug
      handleDecrement(); // Immediate action
      startHold("decrement");
    },
    [handleDecrement, startHold],
  );

  const handleMouseUp = useCallback(() => {
    console.log("mouse up"); // Debug
    stopHold();
  }, [stopHold]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopHold();
    };
  }, [stopHold]);

  // Handle input focus/blur
  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    // Just format the current value, don't change it
    setInputValue(formatValue(value));
  }, [formatValue, value]);

  // Handle keyboard input
  const handleKeyDown = (e) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      handleIncrement();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      handleDecrement();
    }
  };

  // Click outside to blur
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        componentRef.current &&
        !componentRef.current.contains(event.target)
      ) {
        if (isFocused) {
          handleBlur();
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isFocused, handleBlur]);

  return (
    <div ref={componentRef}>
      <GridComponent
        x={x}
        y={y}
        w={w}
        h={h}
        title={title}
        theme={theme}
        className="p-1 select-none"
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
          className="w-full h-full rounded-sm flex flex-col justify-between items-center relative"
          style={{
            background: isUnicornMode
              ? `linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(251,207,232,0.2) 100%), url(${currentTexture})`
              : `url(${currentTexture})`,
            backgroundSize: "cover, 64px 64px",
            boxShadow: isUnicornMode
              ? `
                  inset 2px 2px 4px rgba(236,72,153,0.1),
                  inset -1px -1px 2px rgba(255,255,255,0.3)
                `
              : `
                  inset 2px 2px 4px rgba(0,0,0,0.15),
                  inset -1px -1px 2px rgba(255,255,255,0.1)
                `,
            border: isUnicornMode
              ? "1px solid rgba(236,72,153,0.2)"
              : "1px solid rgba(0,0,0,0.05)",
          }}
        >
          {/* Variable name at top */}
          <div
            className={`text-sm font-medium ${isUnicornMode ? "text-purple-800" : theme.text} mb-1`}
            style={{
              ...getFontStyle("sans", "500"),
              marginTop: "8px", // Move down another 2px
            }}
          >
            {variable}
          </div>

          {/* Input with arrows container */}
          <div className="flex items-center justify-center mb-1">
            {/* Input field */}
            <input
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              className={`w-12 h-6 px-1 text-center text-xs ${isUnicornMode ? "bg-purple-50 text-purple-800 border-purple-200" : `${theme.component} ${theme.text}`} border rounded-l`}
              style={{
                ...getFontStyle("mono", "400"),
                fontSize: "13px", // Increased from 11px by 2 points
                background: isUnicornMode ? "rgba(196,181,253,0.1)" : undefined,
              }}
              maxLength={Math.max(
                max.toString().length,
                decimalPlaces > 0 ? 4 : 3,
              )} // Based on max value
            />

            {/* Up/Down arrows */}
            <div className="flex flex-col">
              <button
                onMouseDown={handleIncrementMouseDown}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                disabled={value >= max}
                className={`w-3 h-3 flex items-center justify-center text-xs ${
                  value >= max
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:opacity-70"
                } border border-l-0 rounded-tr`}
                style={{
                  fontSize: "8px",
                  lineHeight: "1",
                  background: isUnicornMode
                    ? "rgba(196,181,253,0.1)"
                    : theme.component,
                  color: arrowColor,
                  borderColor: isUnicornMode
                    ? "rgba(236,72,153,0.2)"
                    : "rgba(0,0,0,0.1)",
                }}
              >
                ▲
              </button>
              <button
                onMouseDown={handleDecrementMouseDown}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                disabled={value <= min}
                className={`w-3 h-3 flex items-center justify-center text-xs ${
                  value <= min
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:opacity-70"
                } border border-l-0 border-t-0 rounded-br`}
                style={{
                  fontSize: "8px",
                  lineHeight: "1",
                  background: isUnicornMode
                    ? "rgba(196,181,253,0.1)"
                    : theme.component,
                  color: arrowColor,
                  borderColor: isUnicornMode
                    ? "rgba(236,72,153,0.2)"
                    : "rgba(0,0,0,0.1)",
                }}
              >
                ▼
              </button>
            </div>
          </div>

          {/* Range display at bottom */}
          <div
            className={`text-xs ${isUnicornMode ? "text-purple-600" : theme.text} opacity-40`}
            style={{
              fontSize: "9px", // Increased from 7px by 2 points
              marginBottom: "2px", // Move up 2px
            }}
          >
            {min}-{max}
          </div>
        </div>
      </GridComponent>
    </div>
  );
};

export default GridInput;
