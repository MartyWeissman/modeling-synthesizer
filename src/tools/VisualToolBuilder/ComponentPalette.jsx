// src/tools/VisualToolBuilder/ComponentPalette.jsx

import React from "react";
import { componentTypes } from "./componentRegistry.jsx";

const ComponentPalette = ({ theme, onDragStart }) => {
  const handleDragStart = (e, type) => {
    const config = componentTypes[type];

    // Calculate the offset from cursor to top-left of the full-size component
    const dragOffsetX = (config.defaultSize.w * 100) / 2;
    const dragOffsetY = (config.defaultSize.h * 100) / 2;

    // Create drag preview at full grid size
    const preview = document.createElement("div");
    preview.style.width = `${config.defaultSize.w * 100}px`;
    preview.style.height = `${config.defaultSize.h * 100}px`;
    preview.style.backgroundColor = config.color;
    preview.style.border = "2px solid #333";
    preview.style.borderRadius = "4px";
    preview.style.display = "flex";
    preview.style.alignItems = "center";
    preview.style.justifyContent = "center";
    preview.style.color = "white";
    preview.style.fontWeight = "bold";
    preview.style.fontSize = "14px";
    preview.style.position = "absolute";
    preview.style.top = "-1000px";
    preview.style.pointerEvents = "none";
    preview.style.zIndex = "1000";
    preview.textContent = config.name;

    document.body.appendChild(preview);

    // Set the drag image centered on cursor
    e.dataTransfer.setDragImage(preview, dragOffsetX, dragOffsetY);

    // Store the offset in the dataTransfer for use in drop handler
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({
        type: type,
        offsetX: dragOffsetX,
        offsetY: dragOffsetY,
      }),
    );

    // Clean up preview
    setTimeout(() => {
      if (preview && preview.parentNode) {
        preview.parentNode.removeChild(preview);
      }
    }, 100);

    // Call parent handler
    onDragStart(e, type);
  };

  // Organize components: 1x1 components first, then larger ones
  const oneByOneComponents = Object.entries(componentTypes).filter(
    ([, config]) => config.defaultSize.w === 1 && config.defaultSize.h === 1,
  );

  const largerComponents = Object.entries(componentTypes).filter(
    ([, config]) => !(config.defaultSize.w === 1 && config.defaultSize.h === 1),
  );

  const allComponents = [...oneByOneComponents, ...largerComponents];

  // Calculate grid cell size at 60% scale + 1px spacing
  const baseCellSize = 100;
  const scale = 0.6;
  const cellSize = baseCellSize * scale + 1; // 61px

  // Grid dimensions: 4 columns, 8 rows
  const gridCols = 4;
  const gridRows = 8;
  const gridWidth = gridCols * cellSize;
  const gridHeight = gridRows * cellSize;

  // Smart positioning to avoid overlaps
  const getComponentPositions = () => {
    const positions = [];
    const occupied = new Set(); // Track occupied cells as "x,y"

    // Helper to check if a position is available
    const isPositionAvailable = (x, y, w, h) => {
      for (let dx = 0; dx < w; dx++) {
        for (let dy = 0; dy < h; dy++) {
          if (occupied.has(`${x + dx},${y + dy}`)) {
            return false;
          }
        }
      }
      return x + w <= gridCols && y + h <= gridRows;
    };

    // Helper to mark cells as occupied
    const markOccupied = (x, y, w, h) => {
      for (let dx = 0; dx < w; dx++) {
        for (let dy = 0; dy < h; dy++) {
          occupied.add(`${x + dx},${y + dy}`);
        }
      }
    };

    // Place each component
    allComponents.forEach(([type, config]) => {
      const w = config.defaultSize.w;
      const h = config.defaultSize.h;

      // Special handling for graph component - place at left edge
      if (type === "graph") {
        // Try to place at x=0 first
        let placed = false;
        for (let y = 0; y <= gridRows - h && !placed; y++) {
          if (isPositionAvailable(0, y, w, h)) {
            positions.push({
              type,
              config,
              x: 0 * cellSize,
              y: y * cellSize,
              gridX: 0,
              gridY: y,
            });
            markOccupied(0, y, w, h);
            placed = true;
          }
        }
        return;
      }

      // Special handling for blank component - place at x=2, y=1
      if (type === "blank") {
        if (isPositionAvailable(2, 1, w, h)) {
          positions.push({
            type,
            config,
            x: 2 * cellSize,
            y: 1 * cellSize,
            gridX: 2,
            gridY: 1,
          });
          markOccupied(2, 1, w, h);
        }
        return;
      }

      // Find first available position for other components
      let placed = false;
      for (let y = 0; y <= gridRows - h && !placed; y++) {
        for (let x = 0; x <= gridCols - w && !placed; x++) {
          if (isPositionAvailable(x, y, w, h)) {
            positions.push({
              type,
              config,
              x: x * cellSize,
              y: y * cellSize,
              gridX: x,
              gridY: y,
            });
            markOccupied(x, y, w, h);
            placed = true;
          }
        }
      }
    });

    return positions;
  };

  const componentPositions = getComponentPositions();

  return (
    <div
      className={`w-72 ${theme.container} rounded-xl p-4 border-2 border-gray-400 ${theme.shadow}`}
    >
      <h2 className={`text-lg font-semibold mb-4 ${theme.text}`}>
        Component Palette
      </h2>

      {/* 4x8 Grid Container */}
      <div
        className="relative border border-gray-300 rounded"
        style={{
          width: gridWidth + "px",
          height: gridHeight + "px",
          backgroundColor: theme.bg === "bg-gray-100" ? "#f8f9fa" : "#374151",
        }}
      >
        {/* Grid lines for visual reference */}
        <svg
          className="absolute inset-0 pointer-events-none opacity-20"
          width={gridWidth}
          height={gridHeight}
        >
          {/* Vertical lines */}
          {Array.from({ length: gridCols + 1 }, (_, i) => (
            <line
              key={`v${i}`}
              x1={i * cellSize}
              y1={0}
              x2={i * cellSize}
              y2={gridHeight}
              stroke="#666666"
              strokeWidth="0.5"
            />
          ))}
          {/* Horizontal lines */}
          {Array.from({ length: gridRows + 1 }, (_, i) => (
            <line
              key={`h${i}`}
              x1={0}
              y1={i * cellSize}
              x2={gridWidth}
              y2={i * cellSize}
              stroke="#666666"
              strokeWidth="0.5"
            />
          ))}
        </svg>

        {/* Component slots */}
        {componentPositions.map(({ type, config, x, y }) => {
          const componentWidth = config.defaultSize.w * cellSize;
          const componentHeight = config.defaultSize.h * cellSize;

          return (
            <div
              key={type}
              draggable
              onDragStart={(e) => handleDragStart(e, type)}
              title={config.name} // Tooltip
              className="absolute cursor-move hover:opacity-80 transition-opacity flex items-center justify-center"
              style={{
                left: x + "px",
                top: y + "px",
                width: componentWidth + "px",
                height: componentHeight + "px",
                zIndex: 1,
              }}
            >
              {/* Hover background */}
              <div
                className="absolute inset-0 rounded bg-blue-100 opacity-0 hover:opacity-30 transition-opacity"
                style={{ margin: "1px" }}
              />

              {/* Component miniature */}
              <div className="relative z-10 flex items-center justify-center">
                {config.paletteIcon(theme)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Instructions */}
      <div className={`mt-4 text-xs ${theme.textSecondary}`}>
        <p>Drag components to the canvas</p>
        <p>Hover for component names</p>
      </div>
    </div>
  );
};

export default ComponentPalette;
