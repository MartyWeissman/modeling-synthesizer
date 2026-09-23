// src/components/grid/GridInput.jsx

import React, { useState, useEffect, useRef, useCallback } from "react";
import GridComponent from "./GridComponent";
import { getFontStyle } from "../../utils/typography";
import { LIGHT_NOISE_TEXTURE, DARK_NOISE_TEXTURE } from "../../themes/textures";
import { useThemeMode, noiseBackgroundSize } from "./themeMode";
import { cleanNumber, decimalsForStep } from "../../utils/ticks";

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
  compact = false, // When true, removes arrows and allows wider input (8 chars)
}) => {
  const [inputValue, setInputValue] = useState("");
  // True while the text box holds typed text that has not been committed yet
  const [isDirty, setIsDirty] = useState(false);
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
  const { isDarkMode, isUnicornMode } = useThemeMode(theme);
  const currentTexture = isDarkMode ? DARK_NOISE_TEXTURE : LIGHT_NOISE_TEXTURE;

  // Get arrow button colors based on theme
  const arrowColor = isUnicornMode
    ? "#7c3aed"
    : isDarkMode
      ? "#ffffff"
      : "#000000";

  // An integer step means the quantity is an integer (e.g. a count)
  const isIntegerStep = Number.isInteger(step);

  // Calculate appropriate decimal places based on range and step
  const getDecimalPlaces = () => {
    // In compact mode, don't round - allow full precision
    if (compact) return null;

    // If step is an integer, use 0 decimals
    if (isIntegerStep) return 0;

    const range = max - min;
    let fromRange;
    if (range >= 100) fromRange = 0; // 1-999: no decimals
    else if (range >= 10) fromRange = 1; // 10-99: 1 decimal
    else fromRange = 2; // < 10: 2 decimals

    // ...but always enough decimals to show one step (e.g. step 0.1 -> 1)
    return Math.min(4, Math.max(fromRange, decimalsForStep(step)));
  };

  const decimalPlaces = getDecimalPlaces();

  // Format value for display
  const formatValue = useCallback(
    (val) => {
      if (val === null || val === undefined || isNaN(val)) return "";
      // In compact mode, return the value as-is without rounding
      if (decimalPlaces === null) return val.toString();
      return Number(val).toFixed(decimalPlaces);
    },
    [decimalPlaces],
  );

  // Clamp to [min, max], round integer quantities, and remove float noise
  const normalize = useCallback((num) => {
    let v = Math.max(minRef.current, Math.min(maxRef.current, num));
    if (Number.isInteger(stepRef.current)) v = Math.round(v);
    return cleanNumber(v, stepRef.current || 1);
  }, []);

  // Show the current value whenever it changes, unless the student is in the
  // middle of typing a new one
  useEffect(() => {
    if (!isDirty) {
      setInputValue(formatValue(value));
    }
  }, [value, isDirty, formatValue]);

  // Typing only edits the text; the value is committed on Enter or blur
  const handleInputChange = (e) => {
    setInputValue(e.target.value);
    setIsDirty(true);
  };

  // Commit the typed text (if it is a number); otherwise revert to the value
  const commit = useCallback(() => {
    if (!isDirty) return;
    setIsDirty(false);
    const numValue = parseFloat(String(inputValue).replace("\u2212", "-"));
    if (isNaN(numValue)) {
      setInputValue(formatValue(valueRef.current));
      return;
    }
    const newValue = normalize(numValue);
    setInputValue(formatValue(newValue));
    if (newValue !== valueRef.current) onChange(newValue);
  }, [isDirty, inputValue, formatValue, normalize, onChange]);

  // Value to step from: the typed number if there is one, else the value
  const currentNumber = useCallback(() => {
    if (isDirty) {
      const typed = parseFloat(String(inputValue).replace("\u2212", "-"));
      if (!isNaN(typed)) return typed;
    }
    return valueRef.current || 0;
  }, [isDirty, inputValue]);

  const applyStep = useCallback(
    (direction) => {
      const newValue = normalize(currentNumber() + direction * stepRef.current);
      setIsDirty(false);
      setInputValue(formatValue(newValue));
      onChange(newValue);
    },
    [normalize, currentNumber, formatValue, onChange],
  );

  // Handle increment/decrement
  const handleIncrement = useCallback(() => applyStep(1), [applyStep]);
  const handleDecrement = useCallback(() => applyStep(-1), [applyStep]);

  // Mouse hold acceleration logic
  const startHold = useCallback(
    (actionType) => {
      holdActionRef.current = actionType;
      let currentDelay = 300;
      const minDelay = 50;
      const acceleration = 0.8;

      const performAction = () => {
        if (holdTimeoutRef.current === null || !holdActionRef.current) return;

        // Use direct value updates with current value from ref
        const direction = holdActionRef.current === "increment" ? 1 : -1;
        const newValue = normalize(
          (valueRef.current || 0) + direction * stepRef.current,
        );
        onChange(newValue);

        currentDelay = Math.max(minDelay, currentDelay * acceleration);
        holdTimeoutRef.current = setTimeout(performAction, currentDelay);
      };

      holdTimeoutRef.current = setTimeout(performAction, currentDelay);
    },
    [onChange, normalize], // valueRef supplies fresh values
  );

  const stopHold = useCallback(() => {
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
      handleIncrement(); // Immediate action
      startHold("increment");
    },
    [handleIncrement, startHold],
  );

  const handleDecrementMouseDown = useCallback(
    (e) => {
      e.preventDefault();
      handleDecrement(); // Immediate action
      startHold("decrement");
    },
    [handleDecrement, startHold],
  );

  const handleMouseUp = useCallback(() => {
    stopHold();
  }, [stopHold]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopHold();
    };
  }, [stopHold]);

  const handleBlur = useCallback(() => {
    commit();
  }, [commit]);

  // Handle keyboard input
  const handleKeyDown = (e) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      handleIncrement();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      handleDecrement();
    } else if (e.key === "Enter") {
      e.preventDefault();
      commit();
    } else if (e.key === "Escape") {
      // Discard the typed text
      setIsDirty(false);
      setInputValue(formatValue(value));
    }
  };

  // Click outside commits the typed value (in case the blur event is
  // swallowed, e.g. by a canvas that prevents default on mousedown)
  useEffect(() => {
    if (!isDirty) return undefined;
    const handleClickOutside = (event) => {
      if (
        componentRef.current &&
        !componentRef.current.contains(event.target)
      ) {
        commit();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isDirty, commit]);

  // Range label, e.g. "−2 to 2" (with a real minus sign)
  const formatBound = (v) => String(v).replace(/^-/, "\u2212");
  const rangeLabel = `${formatBound(min)} to ${formatBound(max)}`;

  // Longest text a student needs to type (formatted min / max)
  const typedLength = Math.max(
    3,
    formatValue(min).length,
    formatValue(max).length,
    decimalPlaces > 0 ? 4 : 3,
  );

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
          backgroundImage: isUnicornMode
            ? `linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(251,207,232,0.3) 50%, rgba(196,181,253,0.3) 100%), url(${currentTexture})`
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
            ? "1px solid rgba(236,72,153,0.2)"
            : "1px solid rgba(0,0,0,0.1)",
        }}
      >
        <div
          className="w-full h-full rounded-sm flex flex-col justify-between items-center relative"
          style={{
            backgroundImage: isUnicornMode
              ? `linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(251,207,232,0.2) 100%), url(${currentTexture})`
              : `url(${currentTexture})`,
            backgroundSize: noiseBackgroundSize(isUnicornMode),
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
              onBlur={handleBlur}
              inputMode="decimal"
              aria-label={title || (typeof variable === "string" ? variable : undefined)}
              onKeyDown={handleKeyDown}
              className={`${compact ? "w-20" : "w-12"} h-6 px-1 text-center text-xs ${isUnicornMode ? "bg-purple-50 text-purple-800 border-purple-200" : `${theme.component} ${theme.text}`} border ${compact ? "rounded" : "rounded-l"}`}
              style={{
                ...getFontStyle("mono", "400"),
                fontSize: "13px", // Increased from 11px by 2 points
                background: isUnicornMode ? "rgba(196,181,253,0.1)" : undefined,
              }}
              maxLength={compact ? 8 : typedLength} // 8 chars for compact, else fits min/max
            />

            {/* Up/Down arrows (hidden in compact mode) */}
            {!compact && (
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
            )}
          </div>

          {/* Range display at bottom */}
          <div
            className={`text-xs ${isUnicornMode ? "text-purple-600" : theme.text} opacity-40`}
            style={{
              fontSize: "9px", // Increased from 7px by 2 points
              marginBottom: "2px", // Move up 2px
            }}
          >
            {rangeLabel}
          </div>
        </div>
      </GridComponent>
    </div>
  );
};

export default GridInput;
