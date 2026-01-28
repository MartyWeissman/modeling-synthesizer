// src/components/grid/GridTextInput.jsx

import React, { useState, useEffect, useRef, useCallback } from "react";
import GridComponent from "./GridComponent";
import { getFontStyle } from "../../utils/typography";
import { LIGHT_NOISE_TEXTURE, DARK_NOISE_TEXTURE } from "../../themes/textures";

const GridTextInput = ({
  x,
  y,
  w = 1,
  h = 1,
  value,
  onChange,
  title,
  theme,
  label = "", // Label displayed above the input
  placeholder = "",
  maxLength = 12,
}) => {
  const [inputValue, setInputValue] = useState(value || "");
  const [isFocused, setIsFocused] = useState(false);
  const componentRef = useRef(null);

  // Determine theme mode
  const isDarkMode = theme.component.includes("gray-700");
  const isUnicornMode = theme.text.includes("purple-800");
  const currentTexture = isDarkMode ? DARK_NOISE_TEXTURE : LIGHT_NOISE_TEXTURE;

  // Update input when value prop changes
  useEffect(() => {
    if (!isFocused) {
      setInputValue(value || "");
    }
  }, [value, isFocused]);

  // Handle input changes
  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
  };

  // Handle input focus/blur
  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    setInputValue(value || "");
  }, [value]);

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
          className="w-full h-full rounded-sm flex flex-col justify-center items-center relative"
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
          {/* Label at top */}
          {label && (
            <div
              className={`text-xs font-medium ${isUnicornMode ? "text-purple-800" : theme.text} mb-1`}
              style={{
                ...getFontStyle("sans", "500"),
                fontSize: "11px",
                opacity: 0.7,
              }}
            >
              {label}
            </div>
          )}

          {/* Text input field */}
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={placeholder}
            className={`w-full h-7 px-2 text-center text-sm ${isUnicornMode ? "bg-purple-50 text-purple-800 border-purple-200" : `${theme.component} ${theme.text}`} border rounded`}
            style={{
              ...getFontStyle("sans", "500"),
              fontSize: "14px",
              maxWidth: "calc(100% - 16px)",
              background: isUnicornMode ? "rgba(196,181,253,0.1)" : undefined,
            }}
            maxLength={maxLength}
          />
        </div>
      </GridComponent>
    </div>
  );
};

export default GridTextInput;
