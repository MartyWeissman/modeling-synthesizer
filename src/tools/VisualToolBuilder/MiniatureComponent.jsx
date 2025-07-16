// src/tools/VisualToolBuilder/MiniatureComponent.jsx

import React from "react";
import {
  GridButton,
  GridSlider,
  GridDisplay,
  GridGraph,
  GridTimePicker,
  GridStaircase,
} from "../../components/grid";
import ScaledGridComponent from "./ScaledGridComponent";

/**
 * MiniatureComponent - Renders actual grid components at reduced scale
 * This ensures perfect visual consistency between palette and actual components
 */
const MiniatureComponent = ({ type, scale = 0.4, theme, props = {} }) => {
  const baseSize = 100; // Base grid cell size

  // Get component dimensions
  const getComponentDimensions = (componentType) => {
    switch (componentType) {
      case "slider":
        return { w: 1, h: 3 };
      case "display":
        return { w: 2, h: 1 };
      case "graph":
        return { w: 4, h: 3 };

      default:
        return { w: 1, h: 1 };
    }
  };

  const dimensions = getComponentDimensions(type);
  const fullWidth = dimensions.w * baseSize;
  const fullHeight = dimensions.h * baseSize;
  const scaledWidth = fullWidth * scale;
  const scaledHeight = fullHeight * scale;

  // Common props for all components
  const commonProps = {
    x: 0,
    y: 0,
    theme,
    tooltip: "",
  };

  // Container style that properly contains the scaled component
  const containerStyle = {
    width: scaledWidth,
    height: scaledHeight,
    overflow: "hidden",
    position: "relative",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "flex-start",
  };

  // Wrapper style for the scaled component
  const scaledWrapperStyle = {
    transform: `scale(${scale})`,
    transformOrigin: "top left",
    width: fullWidth,
    height: fullHeight,
    pointerEvents: "none",
  };

  const renderComponent = () => {
    switch (type) {
      case "button":
        return (
          <div style={scaledWrapperStyle}>
            <GridButton
              {...commonProps}
              variant="default"
              type={props.type || "momentary"}
            >
              {props.text || props.children || "BTN"}
            </GridButton>
          </div>
        );

      case "slider":
        return (
          <div style={scaledWrapperStyle}>
            <GridSlider
              {...commonProps}
              h={3}
              variant={props.variant || "unipolar"}
              value={50}
            />
          </div>
        );

      case "display":
        return (
          <ScaledGridComponent
            type="display"
            scale={scale}
            theme={theme}
            props={props}
            componentProps={commonProps}
          />
        );

      case "graph":
        return (
          <ScaledGridComponent
            type="graph"
            scale={scale}
            theme={theme}
            props={props}
            componentProps={commonProps}
          />
        );

      case "timepicker":
        return (
          <div style={scaledWrapperStyle}>
            <GridTimePicker
              {...commonProps}
              value={props.defaultTime || "12:00 PM"}
            />
          </div>
        );

      case "staircase":
        return (
          <div style={scaledWrapperStyle}>
            <div className="relative">
              <GridStaircase
                {...commonProps}
                value={3}
                tooltip={
                  props.units ? `Units: ${props.units}` : commonProps.tooltip
                }
              />
              {props.units && (
                <div
                  className="absolute bottom-0 right-0 text-xs font-mono bg-black text-white px-1 rounded"
                  style={{ fontSize: "8px", zIndex: 10 }}
                >
                  {props.units}
                </div>
              )}
            </div>
          </div>
        );

      case "blank":
        return (
          <div style={scaledWrapperStyle}>
            <div
              className={`w-full h-full rounded ${theme.component} border border-gray-400`}
            ></div>
          </div>
        );

      default:
        return (
          <div style={scaledWrapperStyle}>
            <div
              className={`w-full h-full rounded border-2 border-gray-400 ${theme.component} flex items-center justify-center text-xs`}
            >
              ?
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex-shrink-0" style={containerStyle}>
      {renderComponent()}
    </div>
  );
};

export default MiniatureComponent;
