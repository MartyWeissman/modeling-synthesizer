// src/tools/VisualToolBuilder/PropertiesPanel.jsx

import React from "react";
import { componentTypes } from "./componentRegistry.jsx";
import { generateCode } from "./utils";

const PropertiesPanel = ({
  theme,
  selectedComponent,
  placedComponents,
  toolName,
  onRemoveComponent,
  onResizeComponent,
  onUpdateComponentProps,
}) => {
  const handlePropertyChange = (propertyKey, newValue) => {
    if (!selectedComponent) return;

    const updatedProps = {
      ...selectedComponent.props,
      [propertyKey]: newValue,
    };

    // Handle special cases for derived properties
    if (propertyKey === "text" && selectedComponent.type === "button") {
      updatedProps.children = newValue;
    }
    if (propertyKey === "text" && selectedComponent.type === "display") {
      updatedProps.value = newValue;
    }

    onUpdateComponentProps?.(selectedComponent.id, updatedProps);
  };

  const renderPropertyInput = (propertyKey, propertyDef, currentValue) => {
    const inputId = `${selectedComponent.id}-${propertyKey}`;

    switch (propertyDef.type) {
      case "text":
        return (
          <input
            id={inputId}
            type="text"
            value={currentValue ?? propertyDef.default}
            onChange={(e) => handlePropertyChange(propertyKey, e.target.value)}
            onFocus={(e) => e.target.select()}
            className={`w-full px-2 py-1 text-sm border rounded ${theme.bg} ${theme.text}`}
            placeholder={propertyDef.default}
          />
        );

      case "number":
        return (
          <input
            id={inputId}
            type="number"
            value={currentValue ?? propertyDef.default}
            onChange={(e) =>
              handlePropertyChange(propertyKey, parseFloat(e.target.value) || 0)
            }
            className={`w-full px-2 py-1 text-sm border rounded ${theme.bg} ${theme.text}`}
            placeholder={propertyDef.default.toString()}
          />
        );

      case "select":
        return (
          <select
            id={inputId}
            value={currentValue || propertyDef.default}
            onChange={(e) => handlePropertyChange(propertyKey, e.target.value)}
            className={`w-full px-2 py-1 text-sm border rounded ${theme.bg} ${theme.text}`}
          >
            {propertyDef.options.map((option) => (
              <option key={option} value={option}>
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </option>
            ))}
          </select>
        );

      default:
        return (
          <span className={`text-xs ${theme.textSecondary}`}>
            Unsupported property type: {propertyDef.type}
          </span>
        );
    }
  };

  return (
    <div
      className={`w-64 ${theme.container} rounded-xl p-4 border-2 border-gray-400 ${theme.shadow}`}
    >
      <h2 className={`text-lg font-semibold mb-4 ${theme.text}`}>Properties</h2>

      {selectedComponent ? (
        <div className="space-y-4">
          {/* Component Info */}
          <div className={`p-3 rounded border ${theme.bg}`}>
            <h3 className={`font-medium ${theme.text} mb-2`}>
              {componentTypes[selectedComponent.type]?.name || "Component"}
            </h3>
            <div className={`text-xs ${theme.textSecondary} space-y-1`}>
              <div>
                Size: {selectedComponent.w}×{selectedComponent.h}
              </div>
              <div>
                Position: ({selectedComponent.x}, {selectedComponent.y})
              </div>
              <div>ID: {selectedComponent.id}</div>
            </div>
          </div>

          {/* Component Properties */}
          {componentTypes[selectedComponent.type]?.properties && (
            <div className={`p-3 rounded border ${theme.bg}`}>
              <h4 className={`font-medium ${theme.text} mb-3`}>Settings</h4>
              <div className="space-y-3">
                {Object.entries(
                  componentTypes[selectedComponent.type].properties,
                ).map(([propertyKey, propertyDef]) => (
                  <div key={propertyKey}>
                    <label
                      htmlFor={`${selectedComponent.id}-${propertyKey}`}
                      className={`block text-xs font-medium ${theme.text} mb-1`}
                    >
                      {propertyDef.label}
                    </label>
                    {renderPropertyInput(
                      propertyKey,
                      propertyDef,
                      selectedComponent.props[propertyKey],
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Resize Controls */}
          {componentTypes[selectedComponent.type]?.resizable && (
            <div className={`p-3 rounded border ${theme.bg}`}>
              <h4 className={`font-medium ${theme.text} mb-3`}>Size</h4>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label
                    className={`block text-xs font-medium ${theme.text} mb-1`}
                  >
                    Width
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={selectedComponent.w}
                    onChange={(e) =>
                      onResizeComponent(
                        selectedComponent.id,
                        parseInt(e.target.value) || 1,
                        selectedComponent.h,
                      )
                    }
                    className={`w-full px-2 py-1 text-sm border rounded ${theme.bg} ${theme.text}`}
                  />
                </div>
                <div>
                  <label
                    className={`block text-xs font-medium ${theme.text} mb-1`}
                  >
                    Height
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={selectedComponent.h}
                    onChange={(e) =>
                      onResizeComponent(
                        selectedComponent.id,
                        selectedComponent.w,
                        parseInt(e.target.value) || 1,
                      )
                    }
                    className={`w-full px-2 py-1 text-sm border rounded ${theme.bg} ${theme.text}`}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-2">
            <button
              onClick={() => onRemoveComponent(selectedComponent.id)}
              className={`w-full px-3 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded transition-colors`}
            >
              Remove Component
            </button>
          </div>
        </div>
      ) : (
        <div className={`text-center ${theme.textSecondary} py-8`}>
          <p className="text-sm">Select a component to edit its properties</p>
        </div>
      )}
    </div>
  );
};

export default PropertiesPanel;
