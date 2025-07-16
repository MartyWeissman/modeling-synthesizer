// src/tools/VisualToolBuilder/index.jsx

import React, { useState, useRef } from "react";
import { useTheme } from "../hooks/useTheme";
import {
  componentTypes,
  getDefaultProps,
} from "./VisualToolBuilder/componentRegistry.jsx";
import {
  isValidPlacement,
  getOverlappingCells,
} from "./VisualToolBuilder/utils";
import ComponentPalette from "./VisualToolBuilder/ComponentPalette";
import PropertiesPanel from "./VisualToolBuilder/PropertiesPanel";

const VisualToolBuilder = () => {
  const { theme } = useTheme();
  const [placedComponents, setPlacedComponents] = useState([]);
  const [selectedComponent, setSelectedComponent] = useState(null);
  const [draggedComponent, setDraggedComponent] = useState(null);
  const [draggedExisting, setDraggedExisting] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [toolName, setToolName] = useState("MyCustomTool");
  const [canvasWidth, setCanvasWidth] = useState(10);
  const [canvasHeight, setCanvasHeight] = useState(5);
  const [showResizeModal, setShowResizeModal] = useState(false);
  const [tempWidth, setTempWidth] = useState(10);
  const [tempHeight, setTempHeight] = useState(5);
  const gridRef = useRef(null);

  // Handle drag start from palette
  const handleDragStart = (e, componentType) => {
    setDraggedComponent({
      type: componentType,
      ...componentTypes[componentType],
    });
    e.dataTransfer.effectAllowed = "copy";
  };

  // Handle drag start from existing component
  const handleExistingDragStart = (e, component) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;

    setDraggedExisting(component);
    setDragOffset({ x: offsetX, y: offsetY });
    e.dataTransfer.effectAllowed = "move";
    e.stopPropagation();
  };

  // Handle drop on grid
  const handleDrop = (e) => {
    e.preventDefault();
    if (!gridRef.current) return;

    const rect = gridRef.current.getBoundingClientRect();
    const cellSize = 100;

    if (draggedComponent) {
      // Try to get offset data from dataTransfer
      let offsetX = 0;
      let offsetY = 0;

      try {
        const dragData = e.dataTransfer.getData("application/json");
        if (dragData) {
          const data = JSON.parse(dragData);
          offsetX = data.offsetX || 0;
          offsetY = data.offsetY || 0;
        }
      } catch {
        // Fallback to calculating offset
        offsetX = (draggedComponent.defaultSize.w * 100) / 2;
        offsetY = (draggedComponent.defaultSize.h * 100) / 2;
      }

      // Adjust cursor position by the offset to get top-left corner
      const adjustedX = e.clientX - rect.left - offsetX;
      const adjustedY = e.clientY - rect.top - offsetY;

      const x = Math.max(
        0,
        Math.min(
          canvasWidth - draggedComponent.defaultSize.w,
          Math.round(adjustedX / cellSize),
        ),
      );
      const y = Math.max(
        0,
        Math.min(
          canvasHeight - draggedComponent.defaultSize.h,
          Math.round(adjustedY / cellSize),
        ),
      );

      const newComponent = {
        id: Date.now(),
        type: draggedComponent.type,
        x,
        y,
        w: draggedComponent.defaultSize.w,
        h: draggedComponent.defaultSize.h,
        props: getDefaultProps(draggedComponent.type),
      };

      if (isValidPlacement(newComponent, canvasWidth, canvasHeight)) {
        setPlacedComponents((prev) => [...prev, newComponent]);
      }
    } else if (draggedExisting) {
      // Existing component drag logic stays the same
      const mouseX = e.clientX - rect.left - dragOffset.x;
      const mouseY = e.clientY - rect.top - dragOffset.y;

      const x = Math.max(
        0,
        Math.min(
          canvasWidth - draggedExisting.w,
          Math.round(mouseX / cellSize),
        ),
      );
      const y = Math.max(
        0,
        Math.min(
          canvasHeight - draggedExisting.h,
          Math.round(mouseY / cellSize),
        ),
      );

      const updatedComponent = { ...draggedExisting, x, y };

      if (isValidPlacement(updatedComponent, canvasWidth, canvasHeight)) {
        setPlacedComponents((prev) =>
          prev.map((comp) =>
            comp.id === draggedExisting.id ? updatedComponent : comp,
          ),
        );
      }
    }

    setDraggedComponent(null);
    setDraggedExisting(null);
    setDragOffset({ x: 0, y: 0 });
  };

  // Remove component
  const removeComponent = (id) => {
    setPlacedComponents((prev) => prev.filter((comp) => comp.id !== id));
    setSelectedComponent(null);
  };

  // Update component properties
  const updateComponentProps = (id, newProps) => {
    setPlacedComponents((prev) =>
      prev.map((comp) =>
        comp.id === id ? { ...comp, props: newProps } : comp,
      ),
    );

    // Update selected component if it's the one being edited
    if (selectedComponent?.id === id) {
      setSelectedComponent((prev) => ({ ...prev, props: newProps }));
    }
  };

  // Resize component
  const resizeComponent = (id, newW, newH) => {
    setPlacedComponents((prev) =>
      prev.map((comp) => {
        if (comp.id === id) {
          const updatedComp = { ...comp, w: newW, h: newH };
          if (isValidPlacement(updatedComp, canvasWidth, canvasHeight)) {
            return updatedComp;
          }
          return comp;
        }
        return comp;
      }),
    );
  };

  // Handle resize drag
  const handleResizeDrag = (e, component, direction) => {
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startY = e.clientY;
    const startW = component.w;
    const startH = component.h;

    const handleMouseMove = (e) => {
      const deltaX = Math.round((e.clientX - startX) / 100);
      const deltaY = Math.round((e.clientY - startY) / 100);

      let newW = startW;
      let newH = startH;

      if (direction.includes("right")) newW = Math.max(1, startW + deltaX);
      if (direction.includes("bottom")) newH = Math.max(1, startH + deltaY);

      const updatedComp = { ...component, w: newW, h: newH };
      if (isValidPlacement(updatedComp, canvasWidth, canvasHeight)) {
        setPlacedComponents((prev) =>
          prev.map((comp) => (comp.id === component.id ? updatedComp : comp)),
        );
      }
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  // Handle canvas resize
  const handleResizeCanvas = () => {
    setTempWidth(canvasWidth);
    setTempHeight(canvasHeight);
    setShowResizeModal(true);
  };

  const applyCanvasResize = () => {
    const newWidth = Math.max(1, Math.min(12, tempWidth));
    const newHeight = Math.max(1, Math.min(12, tempHeight));

    // Check for components that would be outside new bounds
    const componentsOutOfBounds = placedComponents.filter(
      (comp) => comp.x + comp.w > newWidth || comp.y + comp.h > newHeight,
    );

    if (componentsOutOfBounds.length > 0) {
      const proceed = window.confirm(
        `Resizing to ${newWidth}×${newHeight} will remove ${componentsOutOfBounds.length} component(s) that are outside the new bounds. Continue?`,
      );
      if (!proceed) return;
    }

    // Filter out components that would be outside bounds
    setPlacedComponents((prev) =>
      prev.filter(
        (comp) => comp.x + comp.w <= newWidth && comp.y + comp.h <= newHeight,
      ),
    );

    setCanvasWidth(newWidth);
    setCanvasHeight(newHeight);
    setShowResizeModal(false);
    setSelectedComponent(null);
  };

  // Generate enhanced code export
  const handleGenerateCode = () => {
    const exportData = {
      toolName,
      canvasSize: {
        width: canvasWidth,
        height: canvasHeight,
      },
      components: placedComponents.map((comp) => ({
        id: comp.id,
        type: comp.type,
        position: { x: comp.x, y: comp.y },
        size: { w: comp.w, h: comp.h },
        properties: comp.props,
        description:
          comp.description || `${comp.type} component at (${comp.x},${comp.y})`,
      })),
    };

    const exportText = `// ${toolName} - Visual Tool Builder Export
// Canvas Size: ${canvasWidth}×${canvasHeight}
// Components: ${placedComponents.length}
// Generated: ${new Date().toISOString()}

${JSON.stringify(exportData, null, 2)}`;

    navigator.clipboard
      .writeText(exportText)
      .then(() => {
        alert("Tool configuration copied to clipboard!");
      })
      .catch(() => {
        alert(
          "Could not copy to clipboard. Please copy the text from the console.",
        );
        console.log(exportText);
      });
  };

  const collisionCells = getOverlappingCells(placedComponents);

  return (
    <div className={`min-h-screen ${theme.bg} p-8`}>
      {/* Header - Single Row Layout */}
      <div className="max-w-full mx-auto mb-4">
        <div className="flex items-center justify-between gap-6 mb-2">
          <h1 className={`text-2xl font-bold ${theme.text}`}>
            Visual Tool Builder
          </h1>
          <input
            type="text"
            value={toolName}
            onChange={(e) => setToolName(e.target.value)}
            className={`px-3 py-2 border rounded text-lg font-medium ${theme.bg} ${theme.text} min-w-48`}
            placeholder="Tool Name"
          />
          <button
            onClick={handleGenerateCode}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors font-medium"
          >
            Generate Code
          </button>
        </div>
      </div>

      <div className="flex gap-6 max-w-full mx-auto">
        {/* Component Palette */}
        <ComponentPalette theme={theme} onDragStart={handleDragStart} />

        {/* Properties Panel */}
        <PropertiesPanel
          theme={theme}
          selectedComponent={selectedComponent}
          placedComponents={placedComponents}
          toolName={toolName}
          onRemoveComponent={removeComponent}
          onResizeComponent={resizeComponent}
          onUpdateComponentProps={updateComponentProps}
        />

        {/* Main Grid Canvas - Right */}
        <div
          className={`flex-1 ${theme.container} rounded-xl p-4 border-2 border-gray-400 ${theme.shadow}`}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-lg font-semibold ${theme.text}`}>
              Design Canvas ({canvasWidth}×{canvasHeight})
            </h2>
            <button
              onClick={handleResizeCanvas}
              className={`px-3 py-1 text-sm border rounded ${theme.bg} ${theme.text} hover:bg-gray-100 hover:text-gray-900 transition-colors`}
            >
              Resize Canvas
            </button>
          </div>

          <div
            ref={gridRef}
            className="relative border-2 border-gray-600"
            style={{
              width: `${canvasWidth * 100}px`,
              height: `${canvasHeight * 100}px`,
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => setSelectedComponent(null)} // Unselect when clicking empty grid
          >
            {/* Grid Lines */}
            <svg
              className="absolute inset-0 pointer-events-none"
              width={canvasWidth * 100}
              height={canvasHeight * 100}
            >
              {Array.from({ length: canvasWidth + 1 }, (_, i) => (
                <line
                  key={`v${i}`}
                  x1={i * 100}
                  y1={0}
                  x2={i * 100}
                  y2={canvasHeight * 100}
                  stroke="#666666"
                  strokeWidth="1"
                />
              ))}
              {Array.from({ length: canvasHeight + 1 }, (_, i) => (
                <line
                  key={`h${i}`}
                  x1={0}
                  y1={i * 100}
                  x2={canvasWidth * 100}
                  y2={i * 100}
                  stroke="#666666"
                  strokeWidth="1"
                />
              ))}
            </svg>

            {/* Collision highlighting */}
            {Array.from(collisionCells).map((cellKey) => {
              const [x, y] = cellKey.split(",").map(Number);
              return (
                <div
                  key={cellKey}
                  className="absolute bg-red-500 bg-opacity-50 pointer-events-none"
                  style={{
                    left: x * 100,
                    top: y * 100,
                    width: 100,
                    height: 100,
                    zIndex: 5,
                  }}
                />
              );
            })}

            {/* Placed Components - NO MORE BORDERS */}
            {placedComponents.map((component) => (
              <div
                key={component.id}
                className={`absolute cursor-move flex items-center justify-center ${
                  selectedComponent?.id === component.id
                    ? "ring-4 ring-blue-400"
                    : ""
                }`}
                style={{
                  left: component.x * 100,
                  top: component.y * 100,
                  width: component.w * 100,
                  height: component.h * 100,
                  backgroundColor: "transparent",
                  zIndex: selectedComponent?.id === component.id ? 10 : 1,
                }}
                draggable
                onDragStart={(e) => handleExistingDragStart(e, component)}
                onClick={(e) => {
                  e.stopPropagation(); // Prevent grid deselection
                  setSelectedComponent(component);
                }}
              >
                {/* Render the properly sized grid icon */}
                <div className="flex items-center justify-center w-full h-full">
                  {componentTypes[component.type].gridIcon(
                    theme,
                    component.props,
                    component.w,
                    component.h,
                  )}
                </div>

                {/* Resize handles for resizable components */}
                {componentTypes[component.type].resizable &&
                  selectedComponent?.id === component.id && (
                    <>
                      <div
                        className="absolute right-0 top-0 w-2 h-full bg-blue-400 opacity-75 cursor-e-resize"
                        onMouseDown={(e) =>
                          handleResizeDrag(e, component, "right")
                        }
                      />
                      <div
                        className="absolute bottom-0 left-0 w-full h-2 bg-blue-400 opacity-75 cursor-s-resize"
                        onMouseDown={(e) =>
                          handleResizeDrag(e, component, "bottom")
                        }
                      />
                      <div
                        className="absolute right-0 bottom-0 w-4 h-4 bg-blue-400 cursor-se-resize"
                        onMouseDown={(e) =>
                          handleResizeDrag(e, component, "right bottom")
                        }
                      />
                    </>
                  )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Resize Modal */}
      {showResizeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div
            className={`${theme.container} rounded-xl p-6 border-2 border-gray-400 ${theme.shadow} max-w-sm w-full mx-4`}
          >
            <h3 className={`text-lg font-semibold mb-4 ${theme.text}`}>
              Resize Canvas
            </h3>

            <div className="space-y-4">
              <div>
                <label
                  className={`block text-sm font-medium mb-1 ${theme.text}`}
                >
                  Width (1-12)
                </label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={tempWidth}
                  onChange={(e) => setTempWidth(parseInt(e.target.value) || 1)}
                  className={`w-full px-3 py-2 border rounded ${theme.bg} ${theme.text}`}
                />
              </div>

              <div>
                <label
                  className={`block text-sm font-medium mb-1 ${theme.text}`}
                >
                  Height (1-12)
                </label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={tempHeight}
                  onChange={(e) => setTempHeight(parseInt(e.target.value) || 1)}
                  className={`w-full px-3 py-2 border rounded ${theme.bg} ${theme.text}`}
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={applyCanvasResize}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                Apply
              </button>
              <button
                onClick={() => setShowResizeModal(false)}
                className={`flex-1 px-4 py-2 border rounded ${theme.bg} ${theme.text} hover:bg-gray-100 hover:text-gray-900 transition-colors`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div
        className={`mt-6 max-w-full mx-auto ${theme.container} border border-blue-200 rounded-lg p-4`}
      >
        <h3 className={`font-semibold ${theme.text} mb-2`}>How to use:</h3>
        <ul className={`${theme.text} opacity-70 text-sm space-y-1`}>
          <li>• Drag components from the palette to the grid</li>
          <li>• Click components to select them (blue ring appears)</li>
          <li>• Drag placed components to move them</li>
          <li>• Resize Display and Graph components using blue drag handles</li>
          <li>• Red highlights show overlapping areas</li>
          <li>
            • Click "Generate Code" to copy the complete ToolContainer code
          </li>
        </ul>
      </div>
    </div>
  );
};

export default VisualToolBuilder;
