// src/components/ui/ToolContainer.jsx

import React, { useState, useEffect, useLayoutEffect, lazy, Suspense } from "react";
import { useTheme } from "../../hooks/useTheme";
// Loaded on demand: react-markdown is only needed once the help is opened.
const HelpModal = lazy(() => import("./HelpModal"));
import {
  LIGHT_NOISE_TEXTURE,
  DARK_NOISE_TEXTURE,
  getBackgroundTexture,
} from "../../themes/textures";
import { noiseBackgroundSize } from "../grid/themeMode";

// Horizontal space (px) kept free around a scaled-down tool
const SIDE_GUTTER = 16;

// Is the keyboard focus somewhere the student is typing?
const isTypingTarget = (el) => {
  if (!el) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
};

const ToolContainer = React.memo(
  ({ title, children, canvasWidth = 10, canvasHeight = 5 }) => {
    const { theme, currentTheme } = useTheme();
    const [showHelp, setShowHelp] = useState(false);
    const isDarkMode = currentTheme === "dark";
    const isUnicornMode = currentTheme === "unicorn";
    const currentTexture = isDarkMode
      ? DARK_NOISE_TEXTURE
      : LIGHT_NOISE_TEXTURE;

    // Use cached texture for beveled top
    const beveledTexture = getBackgroundTexture(theme);

    // Get current tool ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const toolId = urlParams.get("tool");

    // Handle keyboard shortcut (?) for help — but not while typing
    useEffect(() => {
      const handleKeyDown = (e) => {
        if (e.key !== "?" || showHelp) return;
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        if (isTypingTarget(e.target) || isTypingTarget(document.activeElement))
          return;
        e.preventDefault();
        setShowHelp(true);
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }, [showHelp]);

    // Calculate dynamic dimensions based on canvas size
    const CELL_SIZE = 100;
    const PADDING = 50;
    const TOP_PANEL_HEIGHT = 48; // 12 * 4 = 48px (h-12)
    const BOTTOM_PADDING = 40;

    const gridWidth = canvasWidth * CELL_SIZE;
    const gridHeight = canvasHeight * CELL_SIZE;
    const containerWidth = gridWidth + PADDING;
    const containerHeight = gridHeight + TOP_PANEL_HEIGHT + BOTTOM_PADDING;

    // Scale the whole tool down (never up) when the window is narrower than
    // the tool, so nothing is cut off on laptops/tablets/split screens. At
    // full width the scale is exactly 1 and no transform is applied.
    const computeScale = () => {
      if (typeof window === "undefined") return 1;
      const available =
        (document.documentElement?.clientWidth || window.innerWidth) -
        SIDE_GUTTER;
      return Math.min(1, Math.max(0.3, available / containerWidth));
    };
    const [scale, setScale] = useState(computeScale);
    useLayoutEffect(() => {
      const update = () => setScale(computeScale());
      update();
      window.addEventListener("resize", update);
      return () => window.removeEventListener("resize", update);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [containerWidth]);
    const isScaled = scale < 1;

    return (
      <div className="flex justify-center">
        {/* Sizer: occupies the scaled size in the page layout */}
        <div
          style={
            isScaled
              ? {
                  width: `${containerWidth * scale}px`,
                  height: `${containerHeight * scale}px`,
                  flexShrink: 0,
                }
              : undefined
          }
        >
        <div
          className={`rounded-xl ${theme.shadow} border-2 ${isUnicornMode ? "border-pink-300" : "border-gray-400"}`}
          data-tool-scale={scale}
          style={{
            width: `${containerWidth}px`,
            height: `${containerHeight}px`,
            ...(isScaled
              ? { transform: `scale(${scale})`, transformOrigin: "top left" }
              : {}),
            backgroundImage: isUnicornMode
              ? `linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(251,207,232,0.3) 100%), url(${currentTexture})`
              : `url(${currentTexture})`,
            backgroundSize: noiseBackgroundSize(isUnicornMode),
            boxShadow: isUnicornMode
              ? `
                inset 0 1px 0 0 rgba(255,255,255,0.3),
                inset 1px 0 0 0 rgba(255,255,255,0.2),
                inset 0 -1px 0 0 rgba(236,72,153,0.1),
                inset -1px 0 0 0 rgba(236,72,153,0.1),
                0 4px 16px rgba(236,72,153,0.2)
              `
              : `
                inset 0 1px 0 0 rgba(255,255,255,0.1),
                inset 1px 0 0 0 rgba(255,255,255,0.05),
                inset 0 -1px 0 0 rgba(0,0,0,0.1),
                inset -1px 0 0 0 rgba(0,0,0,0.05),
                0 4px 8px rgba(0,0,0,0.15)
              `,
          }}
        >
          {/* Beveled top panel */}
          <div
            className="w-full h-12 rounded-t-xl flex items-center justify-between px-6"
            style={{
              backgroundImage: isUnicornMode
                ? `linear-gradient(135deg, rgba(251,207,232,0.8) 0%, rgba(196,181,253,0.6) 100%), url(${beveledTexture})`
                : `url(${beveledTexture})`,
              backgroundSize: noiseBackgroundSize(isUnicornMode),
              boxShadow: isUnicornMode
                ? `
                  inset 0 -2px 4px rgba(236,72,153,0.2),
                  inset 0 1px 2px rgba(255,255,255,0.4)
                `
                : `
                  inset 0 -2px 4px rgba(0,0,0,0.1),
                  inset 0 1px 2px rgba(255,255,255,0.1)
                `,
              borderBottom: isUnicornMode
                ? "1px solid rgba(236,72,153,0.3)"
                : "1px solid rgba(0,0,0,0.2)",
            }}
          >
            {/* Tool title */}
            <h1
              className={`text-xl font-medium ${theme.text}`}
              style={{ fontFamily: "'Dancing Script', cursive" }}
            >
              {title}
            </h1>

            {/* Help and reload buttons */}
            <div className="flex gap-2">
              {/* Help button */}
              <button
                onClick={() => setShowHelp(true)}
                className={`w-8 h-8 flex items-center justify-center text-lg font-bold rounded-full ${
                  isUnicornMode
                    ? "bg-pink-100 hover:bg-pink-200 text-pink-800 border border-pink-300"
                    : isDarkMode
                      ? "bg-gray-600 hover:bg-gray-500 text-gray-100 border border-gray-500"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300"
                } transition-colors duration-150`}
                title="Help (press ?)"
              >
                ?
              </button>

              {/* Universal reset button */}
              <button
                onClick={() => {
                  const urlParams = new URLSearchParams(window.location.search);
                  const currentTool = urlParams.get("tool");
                  const currentTheme = urlParams.get("theme");

                  // Reconstruct URL with preserved theme but fresh tool state
                  const newParams = new URLSearchParams();
                  if (currentTool) newParams.set("tool", currentTool);
                  if (currentTheme) newParams.set("theme", currentTheme);
                  if (urlParams.get("dev") === "true")
                    newParams.set("dev", "true");

                  window.location.search = newParams.toString();
                }}
                className={`w-8 h-8 flex items-center justify-center text-lg font-bold rounded-full ${
                  isUnicornMode
                    ? "bg-pink-100 hover:bg-pink-200 text-pink-800 border border-pink-300"
                    : isDarkMode
                      ? "bg-gray-600 hover:bg-gray-500 text-gray-100 border border-gray-500"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300"
                } transition-colors duration-150`}
                title="Reload tool"
              >
                ↻
              </button>
            </div>
          </div>

          {/* Main content area */}
          <div
            className="relative"
            style={{
              width: `${gridWidth}px`,
              height: `${gridHeight}px`,
              margin: "15px auto 25px auto",
              overflow: "hidden",
            }}
          >
            {children}
          </div>
        </div>
        </div>

        {/* Help modal overlay (outside the scaled box so it stays fixed to the window) */}
        {showHelp && toolId && (
          <Suspense fallback={null}>
            <HelpModal toolId={toolId} onClose={() => setShowHelp(false)} />
          </Suspense>
        )}
      </div>
    );
  },
);

export default ToolContainer;
