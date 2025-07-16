// src/components/grid/GridStaircase.jsx

import React from "react";
import GridComponent from "./GridComponent";
import { LIGHT_NOISE_TEXTURE, DARK_NOISE_TEXTURE } from "../../themes/textures";

const GridStaircase = ({
  x,
  y,
  value = 0, // Current level (0-5)
  onChange, // Callback when level changes
  maxLevel = 5, // Maximum level (default 5 for 6 steps: 0-5)
  showValue = true, // Show numeric value at bottom
  customLevels = null, // Array of custom level values [0, 40, 80, 120, 160, 200]

  // Standard props
  tooltip,
  theme,
}) => {
  // Determine theme and texture
  const isDarkMode = theme.component.includes("gray-700");
  const isUnicornMode = theme.text.includes("purple-800");
  const currentTexture = isDarkMode ? DARK_NOISE_TEXTURE : LIGHT_NOISE_TEXTURE;

  // Handle step click
  const handleStepClick = (level) => {
    onChange?.(level);
  };

  // Generate steps (0 through maxLevel)
  const steps = [];
  const stepWidth = 10;
  const stepGap = 2;
  const totalSteps = maxLevel + 1; // 0-5 = 6 steps
  const totalWidth = stepWidth * totalSteps + stepGap * (totalSteps - 1);
  const containerWidth = 70;
  const startX = (containerWidth - totalWidth) / 2; // Center the stairs in container

  for (let i = 0; i <= maxLevel; i++) {
    const stepHeight = i === 0 ? 2 : i * 12; // Step 0 is just a line, others are 12px per level
    const stepX = startX + i * (stepWidth + stepGap);
    const stepY = 60 - stepHeight; // Position from bottom of staircase area
    const isActive = i <= value;

    steps.push({
      level: i,
      x: stepX,
      y: stepY,
      width: stepWidth,
      height: stepHeight,
      isActive,
    });
  }

  return (
    <GridComponent
      x={x}
      y={y}
      w={1}
      h={1}
      title={tooltip}
      theme={theme}
      className="p-1.5 cursor-pointer select-none"
      style={{
        // Outer frame with texture
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
          : "1px solid rgba(0,0,0,0.1)",
      }}
    >
      <div className="w-full h-full flex flex-col">
        {/* Staircase area - top 3/4 (75px) */}
        <div className="relative flex-1" style={{ height: "75px" }}>
          {/* Staircase container - centered */}
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{
              width: "100%",
              height: "100%",
              paddingTop: "5px", // Lower the staircase by 5px
            }}
            onClick={(e) => {
              // Handle more forgiving click for level 0
              const rect = e.currentTarget.getBoundingClientRect();
              const clickY = e.clientY - rect.top;
              const bottomArea = 60 - 10; // 10px allowance from bottom

              if (clickY >= bottomArea) {
                handleStepClick(0);
                return;
              }

              // Let individual step clicks handle other levels
            }}
          >
            <svg width="70" height="60" className="block">
              {steps.map((step) => (
                <g key={step.level}>
                  {/* Main step with fill */}
                  <rect
                    x={step.x}
                    y={step.y}
                    width={step.width}
                    height={step.height}
                    fill={
                      step.isActive
                        ? isUnicornMode
                          ? "#65a30d" // Lime green for unicorn theme
                          : isDarkMode
                            ? "#10b981"
                            : "#059669" // Green when active
                        : isUnicornMode
                          ? "#581c87" // Dark purple for unicorn theme
                          : isDarkMode
                            ? "#4b5563"
                            : "#6b7280" // Neutral when inactive
                    }
                    className="cursor-pointer transition-colors duration-150 hover:brightness-110"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStepClick(step.level);
                    }}
                  />

                  {/* Indentation border effect (only when inactive) */}
                  {!step.isActive && (
                    <g>
                      {/* Dark top and left borders */}
                      <line
                        x1={step.x}
                        y1={step.y}
                        x2={step.x + step.width}
                        y2={step.y}
                        stroke={
                          isUnicornMode
                            ? "#7c3aed"
                            : isDarkMode
                              ? "#1f2937"
                              : "#4b5563"
                        }
                        strokeWidth="1"
                      />
                      <line
                        x1={step.x}
                        y1={step.y}
                        x2={step.x}
                        y2={step.y + step.height}
                        stroke={
                          isUnicornMode
                            ? "#7c3aed"
                            : isDarkMode
                              ? "#1f2937"
                              : "#4b5563"
                        }
                        strokeWidth="1"
                      />

                      {/* Light bottom and right borders */}
                      <line
                        x1={step.x}
                        y1={step.y + step.height}
                        x2={step.x + step.width}
                        y2={step.y + step.height}
                        stroke={
                          isUnicornMode
                            ? "#a3e635"
                            : isDarkMode
                              ? "#9ca3af"
                              : "#e5e7eb"
                        }
                        strokeWidth="1"
                      />
                      <line
                        x1={step.x + step.width}
                        y1={step.y}
                        x2={step.x + step.width}
                        y2={step.y + step.height}
                        stroke={
                          isUnicornMode
                            ? "#a3e635"
                            : isDarkMode
                              ? "#9ca3af"
                              : "#e5e7eb"
                        }
                        strokeWidth="1"
                      />
                    </g>
                  )}
                </g>
              ))}
            </svg>
          </div>
        </div>

        {/* Value display area - bottom 1/4 (25px) */}
        {showValue && (
          <div
            className={`
              flex items-center justify-center
              ${theme.text} text-xs font-normal
            `}
            style={{
              height: "25px",
              paddingTop: "1px", // Move text down 1 pixel
            }}
          >
            {customLevels ? customLevels[value] : value}
          </div>
        )}
      </div>
    </GridComponent>
  );
};

export default GridStaircase;
