// src/components/grid/GridEquationInput.jsx

import React, { useState } from "react";
import GridComponent from "./GridComponent";
import { LIGHT_NOISE_TEXTURE, DARK_NOISE_TEXTURE } from "../../themes/textures";
import { getFontStyle } from "../../utils/typography";
import { CELL_SIZE } from "../../themes";

const GridEquationInput = React.memo(
  ({
    x,
    y,
    w = 4,
    h = 1,
    value = "",
    onChange,
    label = "",
    variable = "",
    placeholder = "Enter equation...",
    tooltip,
    theme,
    fontSize = "sm",
  }) => {
    const [isFocused, setIsFocused] = useState(false);
    const [hasError, setHasError] = useState(false);

    // Determine theme and texture
    const isDarkMode = theme.component.includes("gray-700");
    const isUnicornMode = theme.text.includes("purple-800");
    const currentTexture = isDarkMode
      ? DARK_NOISE_TEXTURE
      : LIGHT_NOISE_TEXTURE;

    // Fixed border dimensions
    const BORDER_SIZE = 8;

    // Calculate total dimensions
    const totalWidth = w * CELL_SIZE;
    const totalHeight = h * CELL_SIZE;

    // Calculate internal content area dimensions (subtracting borders)
    const contentWidth = totalWidth - BORDER_SIZE * 2;
    const contentHeight = totalHeight - BORDER_SIZE * 2;

    // Basic equation validation
    const validateEquation = (equation) => {
      if (!equation.trim()) return true; // Empty is valid

      // Allow letters (for X, Y, sin, cos, tan, sqrt, exp, log, abs, pow, pi, e)
      // numbers, operators, parentheses, underscores (for X_tau), and basic punctuation
      const validPattern = /^[A-Za-z0-9_\+\-\*\/\(\)\.\s\^]+$/;
      return validPattern.test(equation);
    };

    const handleChange = (e) => {
      const newValue = e.target.value;
      const isValid = validateEquation(newValue);

      setHasError(!isValid);
      onChange(newValue);
    };

    // Get colors based on state
    const getInputColors = () => {
      if (hasError) {
        return {
          bgColor: isUnicornMode
            ? "linear-gradient(135deg, rgba(251, 113, 133, 0.2) 0%, rgba(255, 255, 255, 0.9) 100%)"
            : isDarkMode
              ? "rgba(127, 29, 29, 0.3)"
              : "rgba(254, 226, 226, 0.9)",
          borderColor: "#ef4444",
          textColor: isUnicornMode
            ? "text-red-700"
            : isDarkMode
              ? "text-red-400"
              : "text-red-600",
        };
      }

      if (isFocused) {
        return {
          bgColor: isUnicornMode
            ? "linear-gradient(135deg, rgba(196, 181, 253, 0.3) 0%, rgba(255, 255, 255, 0.95) 100%)"
            : isDarkMode
              ? "rgba(59, 130, 246, 0.1)"
              : "rgba(219, 234, 254, 0.9)",
          borderColor: isUnicornMode ? "#a855f7" : "#3b82f6",
          textColor: isUnicornMode
            ? "text-purple-800"
            : isDarkMode
              ? "text-blue-300"
              : "text-blue-800",
        };
      }

      return {
        bgColor: isUnicornMode
          ? "linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(251, 207, 232, 0.2) 100%)"
          : isDarkMode
            ? "rgba(0,0,0,0.7)"
            : "rgba(255,255,255,0.9)",
        borderColor: isUnicornMode
          ? "rgba(236,72,153,0.3)"
          : isDarkMode
            ? "rgba(255,255,255,0.2)"
            : "rgba(0,0,0,0.2)",
        textColor: isUnicornMode
          ? "text-purple-800"
          : isDarkMode
            ? "text-gray-200"
            : "text-gray-800",
      };
    };

    const colors = getInputColors();

    return (
      <GridComponent
        x={x}
        y={y}
        w={w}
        h={h}
        title={tooltip}
        theme={theme}
        className=""
        style={{
          // Fixed outer frame with texture
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
            : "1px solid rgba(0,0,0,0.2)",
        }}
      >
        {/* Fixed 8px border area */}
        <div
          className="absolute inset-0"
          style={{
            padding: `${BORDER_SIZE}px`,
          }}
        >
          {/* Main content area */}
          <div
            className="w-full h-full flex flex-col justify-center"
            style={{
              width: `${contentWidth}px`,
              height: `${contentHeight}px`,
            }}
          >
            {/* Equation layout: Variable = Input */}
            <div className="flex items-center w-full h-full">
              {/* Variable and equals sign */}
              {variable && (
                <div
                  className="flex items-center mr-2"
                  style={{
                    fontSize:
                      fontSize === "sm"
                        ? "14px"
                        : fontSize === "md"
                          ? "16px"
                          : "18px",
                    color: isUnicornMode
                      ? "#7c3aed"
                      : isDarkMode
                        ? "#e5e7eb"
                        : "#374151",
                    ...getFontStyle("serif", "500"),
                    fontStyle: "italic",
                    minWidth: "40px",
                  }}
                >
                  <span>{variable}</span>
                  <span style={{ marginLeft: "4px", fontStyle: "normal" }}>
                    =
                  </span>
                </div>
              )}

              {/* Input field */}
              <div
                className="relative flex-1"
                style={{
                  background: colors.bgColor,
                  border: `1px solid ${colors.borderColor}`,
                  borderRadius: "4px",
                  boxShadow: `
                    inset 2px 2px 4px rgba(0,0,0,0.1),
                    inset -1px -1px 2px rgba(255,255,255,0.1)
                  `,
                  minHeight: "32px",
                }}
              >
                <input
                  type="text"
                  value={value}
                  onChange={handleChange}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  placeholder={placeholder}
                  className={`w-full h-full px-2 py-1 bg-transparent border-none outline-none ${colors.textColor}`}
                  style={{
                    fontSize:
                      fontSize === "sm"
                        ? "12px"
                        : fontSize === "md"
                          ? "14px"
                          : "16px",
                    fontFamily: "Monaco, 'Courier New', monospace",
                    fontWeight: "500",
                  }}
                />

                {/* Error indicator */}
                {hasError && (
                  <div
                    className="absolute right-1 top-1/2 transform -translate-y-1/2"
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      backgroundColor: "#ef4444",
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </GridComponent>
    );
  },
);

export default GridEquationInput;
