// src/tools/VisualToolBuilder/utils.js

// Check if component placement is valid (within bounds)
export const isValidPlacement = (
  component,
  canvasWidth = 10,
  canvasHeight = 5,
) => {
  // Check left and top bounds
  if (component.x < 0 || component.y < 0) return false;

  // Check right and bottom bounds
  if (
    component.x + component.w > canvasWidth ||
    component.y + component.h > canvasHeight
  )
    return false;

  return true;
};

// Get overlapping cells for collision highlighting
export const getOverlappingCells = (placedComponents) => {
  const occupiedCells = new Set();
  const collisionCells = new Set();

  placedComponents.forEach((component) => {
    for (let x = component.x; x < component.x + component.w; x++) {
      for (let y = component.y; y < component.y + component.h; y++) {
        const cellKey = `${x},${y}`;
        if (occupiedCells.has(cellKey)) {
          collisionCells.add(cellKey);
        } else {
          occupiedCells.add(cellKey);
        }
      }
    }
  });

  return collisionCells;
};

// Generate tool code
export const generateCode = (placedComponents, toolName) => {
  const imports = `import React, { useState } from 'react';
import {
  GridButton,
  GridSlider,
  GridDisplay,
  GridGraph,
  GridTimePicker,
  GridStaircase
} from '../components/grid';
import ToolContainer from '../components/ui/ToolContainer';
import { useTheme } from '../hooks/useTheme';`;

  const stateVariables = placedComponents
    .map((comp, index) => {
      switch (comp.type) {
        case "button":
          return `  const [button${index}Active, setButton${index}Active] = useState(false);`;
        case "slider":
          return `  const [slider${index}Value, setSlider${index}Value] = useState(0);`;
        case "display":
          return `  const [display${index}Value, setDisplay${index}Value] = useState('${comp.props.value}');`;
        case "timepicker":
          return `  const [time${index}Value, setTime${index}Value] = useState('12:00 PM');`;
        case "staircase":
          return `  const [staircase${index}Level, setStaircase${index}Level] = useState(0);`;
        default:
          return "";
      }
    })
    .filter(Boolean)
    .join("\n");

  const components = placedComponents
    .map((comp, index) => {
      const baseProps = `
        x={${comp.x}} y={${comp.y}}${comp.w > 1 ? ` w={${comp.w}}` : ""}${comp.h > 1 ? ` h={${comp.h}}` : ""}
        tooltip="${comp.props.tooltip}"
        theme={theme}`;

      switch (comp.type) {
        case "button":
          return `      <GridButton${baseProps}
        type="toggle"
        variant="${comp.props.variant}"
        active={button${index}Active}
        onToggle={setButton${index}Active}
      >
        ${comp.props.children}
      </GridButton>`;

        case "slider":
          return `      <GridSlider${baseProps}
        value={slider${index}Value}
        onChange={setSlider${index}Value}
        variant="${comp.props.variant}"
      />`;

        case "display":
          return `      <GridDisplay${baseProps}
        value={display${index}Value}
        variant="${comp.props.variant}"
      />`;

        case "graph":
          return `      <GridGraph${baseProps}
        xLabel="${comp.props.xLabel}"
        yLabel="${comp.props.yLabel}"
      />`;

        case "timepicker":
          return `      <GridTimePicker${baseProps}
        value={time${index}Value}
        onChange={setTime${index}Value}
      />`;

        case "staircase":
          return `      <GridStaircase${baseProps}
        value={staircase${index}Level}
        onChange={setStaircase${index}Level}
      />`;

        default:
          return "";
      }
    })
    .join("\n\n");

  return `${imports}

const ${toolName} = () => {
  const { theme } = useTheme();

${stateVariables}

  return (
    <ToolContainer title="${toolName}">
${components}
    </ToolContainer>
  );
};

export default ${toolName};`;
};
