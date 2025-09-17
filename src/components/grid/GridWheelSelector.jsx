// src/components/grid/GridWheelSelector.jsx

import React, { useRef, useCallback, useState, useEffect } from "react";
import GridComponent from "./GridComponent";
import { getFontStyle } from "../../utils/typography";
import { LIGHT_NOISE_TEXTURE, DARK_NOISE_TEXTURE } from "../../themes/textures";

const GridWheelSelector = ({
  x,
  y,
  w = 2,
  h = 1,
  value,
  onChange,
  options = [],
  title,
  theme,
}) => {
  const componentRef = useRef(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationDirection, setAnimationDirection] = useState(null); // 'up' or 'down'
  const [animatingFrom, setAnimatingFrom] = useState(null);
  const [animatingTo, setAnimatingTo] = useState(null);
  const [displayValue, setDisplayValue] = useState(value);

  // Determine theme and texture
  const isDarkMode = theme.component.includes("gray-700");
  const isUnicornMode = theme.text.includes("purple-800");
  const currentTexture = isDarkMode ? DARK_NOISE_TEXTURE : LIGHT_NOISE_TEXTURE;

  // Update display value when external value changes (but not during animation)
  useEffect(() => {
    if (!isAnimating) {
      setDisplayValue(value);
    }
  }, [value, isAnimating]);

  // Find current index based on display value
  const currentIndex = options.indexOf(displayValue);

  // Handle increment/decrement with animation and cycling
  const handleIncrement = useCallback(() => {
    if (!isAnimating && options.length > 1) {
      const fromIndex = currentIndex;
      const toIndex = (fromIndex + 1) % options.length; // Wrap around to start
      const fromValue = options[fromIndex];
      const toValue = options[toIndex];

      setIsAnimating(true);
      setAnimationDirection("up");
      setAnimatingFrom(fromValue);
      setAnimatingTo(toValue);

      // Update display immediately for animation
      setDisplayValue(toValue);

      // Call onChange after a short delay to let animation start
      setTimeout(() => {
        onChange(toValue);
      }, 50);

      // End animation after duration
      setTimeout(() => {
        setIsAnimating(false);
        setAnimationDirection(null);
        setAnimatingFrom(null);
        setAnimatingTo(null);
      }, 400);
    }
  }, [currentIndex, options, onChange, isAnimating]);

  const handleDecrement = useCallback(() => {
    if (!isAnimating && options.length > 1) {
      const fromIndex = currentIndex;
      const toIndex = fromIndex === 0 ? options.length - 1 : fromIndex - 1; // Wrap around to end
      const fromValue = options[fromIndex];
      const toValue = options[toIndex];

      setIsAnimating(true);
      setAnimationDirection("down");
      setAnimatingFrom(fromValue);
      setAnimatingTo(toValue);

      // Update display immediately for animation
      setDisplayValue(toValue);

      // Call onChange after a short delay to let animation start
      setTimeout(() => {
        onChange(toValue);
      }, 50);

      // End animation after duration
      setTimeout(() => {
        setIsAnimating(false);
        setAnimationDirection(null);
        setAnimatingFrom(null);
        setAnimatingTo(null);
      }, 400);
    }
  }, [currentIndex, options, onChange, isAnimating]);

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

  return (
    <div ref={componentRef} tabIndex={0} onKeyDown={handleKeyDown}>
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
          className="w-full h-full rounded-sm flex flex-col relative"
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
          {/* Title area */}
          {title && (
            <div
              className={`text-sm font-medium text-center px-2 py-2 ${isUnicornMode ? "text-purple-800" : theme.text}`}
              style={{
                ...getFontStyle("sans", "600"),
                fontSize: "13px",
                marginTop: "2px",
              }}
            >
              {title}
            </div>
          )}
          {/* Main content container */}
          <div className="flex items-center justify-between w-full px-2 flex-1">
            {/* Text display area with animation */}
            <div
              className={`flex-1 mr-3 px-3 py-1 text-center text-sm ${isUnicornMode ? "bg-purple-50 text-purple-800 border-purple-200" : `${theme.component} ${theme.text}`} border rounded relative overflow-hidden`}
              style={{
                ...getFontStyle("sans", "500"),
                fontSize: "13px",
                background: isUnicornMode
                  ? `linear-gradient(to bottom, rgba(196,181,253,0.05) 0%, rgba(196,181,253,0.15) 50%, rgba(196,181,253,0.05) 100%)`
                  : isDarkMode
                    ? `linear-gradient(to bottom, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 100%)`
                    : `linear-gradient(to bottom, rgba(0,0,0,0.02) 0%, rgba(0,0,0,0.05) 50%, rgba(0,0,0,0.02) 100%)`,
                minHeight: "24px",
                boxShadow: isUnicornMode
                  ? "inset 0 1px 3px rgba(236,72,153,0.1)"
                  : "inset 0 1px 3px rgba(0,0,0,0.1)",
              }}
            >
              {/* Static text when not animating */}
              {!isAnimating && (
                <div
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {displayValue || "Select..."}
                </div>
              )}

              {/* Rolling animation with both old and new text */}
              {isAnimating && (
                <>
                  {/* Old text rolling out */}
                  <div
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%, -50%)",
                      animation: `rollOut${animationDirection === "up" ? "Up" : "Down"} 0.4s ease-out forwards`,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {animatingFrom}
                  </div>

                  {/* New text rolling in */}
                  <div
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%, -50%)",
                      animation: `rollIn${animationDirection === "up" ? "Up" : "Down"} 0.4s ease-out forwards`,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {animatingTo}
                  </div>

                  {/* Horizontal separator line */}
                  <div
                    style={{
                      position: "absolute",
                      left: "10%",
                      right: "10%",
                      height: "1px",
                      background: isUnicornMode
                        ? "rgba(236,72,153,0.4)"
                        : isDarkMode
                          ? "rgba(255,255,255,0.3)"
                          : "rgba(0,0,0,0.3)",
                      animation: `separatorRoll${animationDirection === "up" ? "Up" : "Down"} 0.4s ease-out forwards`,
                    }}
                  />
                </>
              )}
            </div>

            {/* Up/Down arrows on the right - ALWAYS ACTIVE */}
            <div className="flex flex-col gap-1">
              {/* Up arrow */}
              <button
                onClick={handleIncrement}
                disabled={isAnimating || options.length <= 1}
                className={`w-6 h-3 flex items-center justify-center text-xs ${
                  isAnimating || options.length <= 1
                    ? "opacity-30 cursor-not-allowed"
                    : "hover:opacity-70 cursor-pointer"
                } rounded-sm`}
                style={{
                  fontSize: "10px",
                  lineHeight: "1",
                  background: isUnicornMode
                    ? "rgba(196,181,253,0.2)"
                    : theme.component,
                  color: isUnicornMode
                    ? "#7c3aed"
                    : isDarkMode
                      ? "#ffffff"
                      : "#000000",
                  border: isUnicornMode
                    ? "1px solid rgba(236,72,153,0.3)"
                    : "1px solid rgba(0,0,0,0.1)",
                  boxShadow: isUnicornMode
                    ? "0 1px 2px rgba(236,72,153,0.1)"
                    : "0 1px 2px rgba(0,0,0,0.1)",
                }}
              >
                ▲
              </button>

              {/* Down arrow */}
              <button
                onClick={handleDecrement}
                disabled={isAnimating || options.length <= 1}
                className={`w-6 h-3 flex items-center justify-center text-xs ${
                  isAnimating || options.length <= 1
                    ? "opacity-30 cursor-not-allowed"
                    : "hover:opacity-70 cursor-pointer"
                } rounded-sm`}
                style={{
                  fontSize: "10px",
                  lineHeight: "1",
                  background: isUnicornMode
                    ? "rgba(196,181,253,0.2)"
                    : theme.component,
                  color: isUnicornMode
                    ? "#7c3aed"
                    : isDarkMode
                      ? "#ffffff"
                      : "#000000",
                  border: isUnicornMode
                    ? "1px solid rgba(236,72,153,0.3)"
                    : "1px solid rgba(0,0,0,0.1)",
                  boxShadow: isUnicornMode
                    ? "0 1px 2px rgba(236,72,153,0.1)"
                    : "0 1px 2px rgba(0,0,0,0.1)",
                }}
              >
                ▼
              </button>
            </div>
          </div>
        </div>
      </GridComponent>

      {/* CSS animations */}
      <style jsx>{`
        @keyframes rollOutUp {
          from {
            transform: translate(-50%, -50%) translateY(0%);
            opacity: 1;
          }
          to {
            transform: translate(-50%, -50%) translateY(-100%);
            opacity: 0;
          }
        }

        @keyframes rollOutDown {
          from {
            transform: translate(-50%, -50%) translateY(0%);
            opacity: 1;
          }
          to {
            transform: translate(-50%, -50%) translateY(100%);
            opacity: 0;
          }
        }

        @keyframes rollInUp {
          from {
            transform: translate(-50%, -50%) translateY(100%);
            opacity: 0;
          }
          to {
            transform: translate(-50%, -50%) translateY(0%);
            opacity: 1;
          }
        }

        @keyframes rollInDown {
          from {
            transform: translate(-50%, -50%) translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translate(-50%, -50%) translateY(0%);
            opacity: 1;
          }
        }

        @keyframes separatorRollUp {
          from {
            top: 100%;
          }
          to {
            top: -1px;
          }
        }

        @keyframes separatorRollDown {
          from {
            top: -1px;
          }
          to {
            top: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default GridWheelSelector;
