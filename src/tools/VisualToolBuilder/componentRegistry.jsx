// src/tools/VisualToolBuilder/componentRegistry.js

import React from "react";
import MiniatureComponent from "./MiniatureComponent";
import { GridDisplay, GridGraph, GridLabel } from "../../components/grid";
import { LIGHT_NOISE_TEXTURE, DARK_NOISE_TEXTURE } from "../../themes/textures";

export const componentTypes = {
  button: {
    name: "Button",
    defaultSize: { w: 1, h: 1 },
    resizable: false,
    color: "#8B4513",
    paletteIcon: (theme) => (
      <MiniatureComponent type="button" scale={0.6} theme={theme} />
    ),
    gridIcon: (theme, props) => (
      <MiniatureComponent
        type="button"
        scale={1.0}
        theme={theme}
        props={props}
      />
    ),
    properties: {
      type: {
        type: "select",
        options: ["momentary", "toggle"],
        default: "momentary",
        label: "Button Type",
      },
      text: { type: "text", default: "BTN", label: "Button Text" },
      description: {
        type: "text",
        default: "Interactive button for user input",
        label: "Description",
      },
    },
  },
  slider: {
    name: "Slider",
    defaultSize: { w: 1, h: 3 },
    resizable: false,
    color: "#228B22",
    paletteIcon: (theme) => (
      <MiniatureComponent type="slider" scale={0.6} theme={theme} />
    ),
    gridIcon: (theme, props) => (
      <MiniatureComponent
        type="slider"
        scale={1.0}
        theme={theme}
        props={props}
      />
    ),
    properties: {
      variant: {
        type: "select",
        options: ["unipolar", "bipolar"],
        default: "unipolar",
        label: "Slider Type",
      },
      description: {
        type: "text",
        default: "Adjustable slider for numeric input",
        label: "Description",
      },
    },
  },
  display: {
    name: "Display",
    defaultSize: { w: 2, h: 1 },
    resizable: true,
    color: "#8A2BE2",
    paletteIcon: (theme) => (
      <div
        style={{
          width: "120px",
          height: "60px",
          overflow: "hidden",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "flex-start",
        }}
      >
        <div
          style={{
            transform: "scale(0.6)",
            transformOrigin: "top left",
            width: "200px",
            height: "100px",
            pointerEvents: "none",
          }}
        >
          <GridDisplay
            x={0}
            y={0}
            w={2}
            h={1}
            value="Display"
            variant="default"
            theme={theme}
          />
        </div>
      </div>
    ),
    gridIcon: (theme, props, w = 2, h = 1) => (
      <GridDisplay
        x={0}
        y={0}
        w={w}
        h={h}
        value={props.text || props.value || "Display"}
        variant="default"
        theme={theme}
        style={{
          backgroundColor:
            props.background === "white"
              ? "#ffffff"
              : props.background === "black"
                ? "#000000"
                : "transparent",
        }}
      />
    ),
    properties: {
      text: { type: "text", default: "Display", label: "Default Text" },
      background: {
        type: "select",
        options: ["white", "black", "none"],
        default: "none",
        label: "Background Color",
      },
      description: {
        type: "text",
        default: "Text display area for showing values",
        label: "Description",
      },
    },
  },
  graph: {
    name: "Graph",
    defaultSize: { w: 4, h: 3 },
    resizable: true,
    color: "#FF8C00",
    paletteIcon: (theme) => (
      <div
        style={{
          width: "240px",
          height: "180px",
          overflow: "hidden",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "flex-start",
        }}
      >
        <div style={{ transform: "scale(0.6)", transformOrigin: "top left" }}>
          <GridGraph
            x={0}
            y={0}
            w={4}
            h={3}
            xLabel="x"
            yLabel="y"
            theme={theme}
          />
        </div>
      </div>
    ),
    gridIcon: (theme, props, w = 4, h = 3) => (
      <GridGraph
        x={0}
        y={0}
        w={w}
        h={h}
        xLabel={props.xLabel || "x"}
        yLabel={props.yLabel || "y"}
        theme={theme}
      />
    ),
    properties: {
      xLabel: { type: "text", default: "x", label: "X-Axis Label" },
      yLabel: { type: "text", default: "y", label: "Y-Axis Label" },
      description: {
        type: "text",
        default: "Interactive graph for plotting data",
        label: "Description",
      },
    },
  },
  timepicker: {
    name: "Time Picker",
    defaultSize: { w: 1, h: 1 },
    resizable: false,
    color: "#20B2AA",
    paletteIcon: (theme) => (
      <MiniatureComponent type="timepicker" scale={0.6} theme={theme} />
    ),
    gridIcon: (theme, props) => (
      <MiniatureComponent
        type="timepicker"
        scale={1.0}
        theme={theme}
        props={props}
      />
    ),
    properties: {
      defaultTime: { type: "text", default: "12:00 PM", label: "Default Time" },
      description: {
        type: "text",
        default: "Time selection component",
        label: "Description",
      },
    },
  },
  staircase: {
    name: "Staircase",
    defaultSize: { w: 1, h: 1 },
    resizable: false,
    color: "#DC143C",
    paletteIcon: (theme) => (
      <MiniatureComponent type="staircase" scale={0.6} theme={theme} />
    ),
    gridIcon: (theme, props) => (
      <MiniatureComponent
        type="staircase"
        scale={1.0}
        theme={theme}
        props={props}
      />
    ),
    properties: {
      units: { type: "text", default: "mg", label: "Units" },
      level0: { type: "number", default: 0, label: "Level 0" },
      level1: { type: "number", default: 40, label: "Level 1" },
      level2: { type: "number", default: 80, label: "Level 2" },
      level3: { type: "number", default: 120, label: "Level 3" },
      level4: { type: "number", default: 160, label: "Level 4" },
      level5: { type: "number", default: 200, label: "Level 5" },
      description: {
        type: "text",
        default: "Multi-level selector with stepped values",
        label: "Description",
      },
    },
  },
  label: {
    name: "Label",
    defaultSize: { w: 1, h: 1 },
    resizable: true,
    color: "#808080",
    paletteIcon: (theme) => (
      <div
        style={{
          width: "60px",
          height: "60px",
          overflow: "hidden",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "flex-start",
        }}
      >
        <div
          style={{
            transform: "scale(0.6)",
            transformOrigin: "top left",
            width: "100px",
            height: "100px",
            pointerEvents: "none",
          }}
        >
          <GridLabel x={0} y={0} w={1} h={1} text="Label" theme={theme} />
        </div>
      </div>
    ),
    gridIcon: (theme, props, w = 1, h = 1) => (
      <GridLabel
        x={0}
        y={0}
        w={w}
        h={h}
        text={props.text || "Label"}
        fontSize={props.fontSize || "auto"}
        textAlign={props.textAlign || "center"}
        verticalAlign={props.verticalAlign || "middle"}
        theme={theme}
      />
    ),
    properties: {
      text: { type: "text", default: "Label", label: "Label Text" },
      fontSize: {
        type: "select",
        options: ["auto", "small", "medium", "large"],
        default: "auto",
        label: "Font Size",
      },
      textAlign: {
        type: "select",
        options: ["left", "center", "right"],
        default: "center",
        label: "Text Alignment",
      },
      verticalAlign: {
        type: "select",
        options: ["top", "middle", "bottom"],
        default: "middle",
        label: "Vertical Alignment",
      },
      description: {
        type: "text",
        default: "Static text label for interface organization",
        label: "Description",
      },
    },
  },
};

export const getDefaultProps = (type) => {
  const componentType = componentTypes[type];
  if (!componentType || !componentType.properties) {
    return { tooltip: componentType?.name || "Component" };
  }

  const defaultProps = { tooltip: componentType.name };

  // Set default values from property definitions
  Object.entries(componentType.properties).forEach(([key, propDef]) => {
    defaultProps[key] = propDef.default;
  });

  // Legacy mappings for component-specific props
  switch (type) {
    case "button":
      defaultProps.children = defaultProps.text;
      defaultProps.variant = "default";
      break;
    case "display":
      defaultProps.value = defaultProps.text;
      defaultProps.variant = "default";
      break;
  }

  return defaultProps;
};
