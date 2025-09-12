# Grid Layout Helper Guide

A comprehensive guide to using the grid layout system and debugging tools in the Modeling Synthesizer project.

## Overview

The grid layout system provides a consistent way to position components in a 10×5 grid (by default). Each grid cell is 100px × 100px, and components can span multiple cells.

## Quick Start

### 1. Basic Component Placement

```javascript
import { useGridDebug } from '../hooks/useGridDebug';
import GridDebugOverlay from '../components/dev/GridDebugOverlay';

const MyTool = () => {
  // Define your layout
  const gridComponents = [
    { x: 0, y: 0, w: 1, h: 1, name: "Button", type: "button" },
    { x: 1, y: 0, w: 2, h: 1, name: "Display", type: "display" },
    { x: 0, y: 1, w: 4, h: 3, name: "Graph", type: "graph" }
  ];

  // Enable debugging
  const gridDebug = useGridDebug(gridComponents, 10, 5);

  return (
    <ToolContainer title="My Tool">
      <GridDebugOverlay {...gridDebug.debugControls} components={gridComponents} />
      
      <GridButton x={0} y={0} />
      <GridDisplay x={1} y={0} w={2} />
      <GridGraph x={0} y={1} w={4} h={3} />
    </ToolContainer>
  );
};
```

### 2. Visual Layout Planning

Use the ASCII visualization to plan layouts:

```javascript
const gridDebug = useGridDebug(components, 10, 5);
console.log(gridDebug.visualization);

// Output:
//    0123456789
// 0  AB........
// 1  CCCC......
// 2  CCCC......
// 3  CCCC......
// 4  ..........
//
// A = Button (0,0 1x1)
// B = Display (1,0 2x1) 
// C = Graph (0,1 4x3)
```

## Component Size Reference

### Standard Sizes (COMPONENT_SIZES)

```javascript
button: { w: 1, h: 1 }           // Single cell
knob: { w: 1, h: 1 }             // Single cell  
slider: { w: 1, h: 3 }           // Vertical slider
sliderHorizontal: { w: 3, h: 1 } // Horizontal slider
display: { w: 2, h: 1 }          // Text display
input: { w: 2, h: 1 }            // Input field
label: { w: 2, h: 1 }            // Text label
graph: { w: 4, h: 3 }            // Standard graph
graphLarge: { w: 6, h: 4 }       // Large graph
timePicker: { w: 1, h: 1 }       // Time selector
staircase: { w: 1, h: 1 }        // Level selector
screen: { w: 3, h: 2 }           // Display screen
window: { w: 4, h: 4 }           // Viewing window
```

### Canvas Sizes

- **Standard**: 10×5 (1000px × 500px)
- **Large**: 12×6 (1200px × 600px) 
- **Compact**: 8×4 (800px × 400px)

## Grid Debugging Tools

### 1. useGridDebug Hook

```javascript
const gridDebug = useGridDebug(components, canvasWidth, canvasHeight, {
  enableAutoDebug: false,    // Auto-log to console
  logToConsole: false,       // Manual console logging
  debugTitle: 'My Layout'    // Title for debug output
});

// Available properties:
gridDebug.isValid          // boolean
gridDebug.hasOverlaps      // boolean  
gridDebug.errors           // string[]
gridDebug.overlaps         // overlap objects
gridDebug.analysis         // utilization stats
gridDebug.visualization    // ASCII layout
```

### 2. Visual Debug Overlay

Shows grid lines, component boundaries, and overlap detection:

```javascript
<GridDebugOverlay
  components={gridComponents}
  canvasWidth={10}
  canvasHeight={5}
  show={true}
  showGrid={true}        // Grid lines
  showBounds={true}      // Component outlines  
  showOverlaps={true}    // Overlap highlighting
  showLabels={true}      // Component names
/>
```

### 3. Layout Validation

```javascript
// Manual validation
const validation = validateLayout(components, 10, 5);

if (!validation.valid) {
  console.error('Layout errors:', validation.errors);
}

// Auto-validation with debugging
const gridDebug = useGridDebug(components, 10, 5, {
  enableAutoDebug: true  // Logs validation results automatically
});
```

## Common Layout Patterns

### 1. Sidebar + Main Area

```javascript
const sidebarComponents = [
  { x: 0, y: 0, w: 1, h: 1, name: "Btn1", type: "button" },
  { x: 0, y: 1, w: 1, h: 1, name: "Btn2", type: "button" },
  { x: 0, y: 2, w: 1, h: 1, name: "Btn3", type: "button" }
];

const mainComponent = { 
  x: 2, y: 0, w: 6, h: 4, name: "Graph", type: "graph" 
};
```

### 2. Control Panel + Display

```javascript
const controlPanel = [
  { x: 0, y: 0, w: 2, h: 1, name: "Input1", type: "input" },
  { x: 0, y: 1, w: 1, h: 1, name: "Knob1", type: "knob" },
  { x: 1, y: 1, w: 1, h: 1, name: "Knob2", type: "knob" },
  { x: 0, y: 2, w: 1, h: 3, name: "Slider", type: "slider" }
];

const display = { 
  x: 3, y: 0, w: 7, h: 5, name: "MainDisplay", type: "graph" 
};
```

### 3. Grid Layout

```javascript
// 3×2 grid of components
const gridLayout = [
  { x: 0, y: 0, w: 3, h: 2, name: "Item1", type: "display" },
  { x: 3, y: 0, w: 3, h: 2, name: "Item2", type: "display" },
  { x: 6, y: 0, w: 4, h: 2, name: "Item3", type: "display" },
  { x: 0, y: 2, w: 3, h: 2, name: "Item4", type: "display" },
  { x: 3, y: 2, w: 3, h: 2, name: "Item5", type: "display" },
  { x: 6, y: 2, w: 4, h: 2, name: "Item6", type: "display" }
];
```

## Troubleshooting Common Issues

### ❌ Overlapping Components

**Problem**: Components placed in the same grid cells

```javascript
// BAD - Both components at (0,0)
{ x: 0, y: 0, w: 2, h: 1, name: "Display1" },
{ x: 0, y: 0, w: 1, h: 1, name: "Button1" }  // OVERLAPS!
```

**Solution**: Use debugging tools to identify and fix overlaps

```javascript
const gridDebug = useGridDebug(components, 10, 5);
if (gridDebug.hasOverlaps) {
  console.log('Overlaps detected:', gridDebug.overlaps);
  console.log(gridDebug.visualization); // Shows 'X' where overlaps occur
}
```

### ❌ Components Outside Bounds

**Problem**: Components extend beyond canvas edges

```javascript
// BAD - Extends beyond 10-width canvas
{ x: 8, y: 0, w: 4, h: 1, name: "TooWide" }  // Goes to x=12!
```

**Solution**: Validate bounds before placement

```javascript
const isValid = isWithinBounds(component, canvasWidth, canvasHeight);
if (!isValid) {
  console.error('Component outside bounds:', component);
}
```

### ❌ Poor Layout Utilization

**Problem**: Wasted space or cramped layout

```javascript
const gridDebug = useGridDebug(components, 10, 5);
console.log(`Utilization: ${gridDebug.analysis.utilization}%`);

// < 30% = Wasted space
// > 80% = Too cramped
```

**Solution**: Use auto-layout or adjust component sizes

```javascript
// Auto-arrange components
const result = autoLayout(components, 10, 5);
if (result.success) {
  components = result.arranged;
}
```

## Advanced Features

### 1. Auto Layout

```javascript
import { autoLayout } from '../utils/gridLayoutHelper';

const result = autoLayout(components, 10, 5, {
  rowFirst: true,    // Fill rows first vs columns
  padding: 1         // Space between components
});

if (result.success) {
  console.log('All components placed:', result.arranged);
} else {
  console.log('Could not place:', result.failed);
}
```

### 2. Finding Available Space

```javascript
const nextPosition = findNextAvailablePosition(
  existingComponents,
  2, 1,        // Want 2×1 space
  10, 5        // Canvas size
);

if (nextPosition) {
  console.log(`Place at: ${nextPosition.x}, ${nextPosition.y}`);
}
```

### 3. Layout Builder (Fluent Interface)

```javascript
import { LayoutBuilder } from '../utils/gridLayoutHelper';

const layout = new LayoutBuilder(10, 5)
  .addPreset(0, 0, 'button', 'Start Button')
  .addPreset(1, 0, 'display', 'Status Display')  
  .add(0, 1, 4, 3, 'Main Graph', 'graph')
  .validate();

if (layout.isValid) {
  const components = layout.build();
} else {
  console.log('Layout errors:', layout.errors);
  console.log(layout.visualize());
}
```

## Best Practices

### ✅ Do

- **Define your layout array first** before writing JSX components
- **Use the visual debugger** during development
- **Validate layouts** with the debugging hook
- **Use consistent naming** for components
- **Plan for different canvas sizes** if needed
- **Group related controls** near each other
- **Leave breathing room** between component groups

### ❌ Don't

- **Guess component positions** - use the visualization
- **Ignore overlap warnings** - they cause visual glitches
- **Make components too small** - maintain readability
- **Overcrowd the layout** - aim for 60-75% utilization
- **Forget to test** on different screen sizes

## Example: Complete Tool Layout

```javascript
import React from 'react';
import { useGridDebug } from '../hooks/useGridDebug';
import GridDebugOverlay from '../components/dev/GridDebugOverlay';

const ExampleTool = () => {
  // Define complete layout
  const gridComponents = [
    // Top row controls
    { x: 0, y: 0, w: 2, h: 1, name: "Input Field", type: "input" },
    { x: 2, y: 0, w: 1, h: 1, name: "Start Btn", type: "button" },
    { x: 3, y: 0, w: 1, h: 1, name: "Reset Btn", type: "button" },
    
    // Left sidebar
    { x: 0, y: 1, w: 1, h: 3, name: "Param Slider", type: "slider" },
    { x: 1, y: 1, w: 1, h: 1, name: "Rate Knob", type: "knob" },
    { x: 1, y: 2, w: 1, h: 1, name: "Gain Knob", type: "knob" },
    
    // Main display area  
    { x: 2, y: 1, w: 6, h: 3, name: "Main Graph", type: "graphLarge" },
    
    // Right status panel
    { x: 8, y: 1, w: 2, h: 1, name: "Status", type: "display" },
    { x: 8, y: 2, w: 2, h: 2, name: "Mini Graph", type: "screen" },
    
    // Bottom row
    { x: 1, y: 4, w: 3, h: 1, name: "Progress", type: "sliderHorizontal" },
    { x: 4, y: 4, w: 2, h: 1, name: "Time Display", type: "display" }
  ];

  // Initialize debugging
  const gridDebug = useGridDebug(gridComponents, 10, 5, {
    debugTitle: 'Example Tool Layout'
  });

  return (
    <ToolContainer title="Example Tool" canvasWidth={10} canvasHeight={5}>
      {/* Debug overlay (only in dev mode) */}
      {process.env.NODE_ENV === 'development' && (
        <GridDebugOverlay
          components={gridComponents}
          canvasWidth={10}
          canvasHeight={5}
          show={gridDebug.debugControls.visible}
          {...gridDebug.debugControls}
        />
      )}

      {/* Actual components match the layout definition */}
      <GridInput x={0} y={0} w={2} h={1} />
      <GridButton x={2} y={0}>START</GridButton>
      <GridButton x={3} y={0}>RESET</GridButton>
      
      <GridSlider x={0} y={1} h={3} />
      <GridKnob x={1} y={1} />
      <GridKnob x={1} y={2} />
      
      <GridGraph x={2} y={1} w={6} h={3} />
      
      <GridDisplay x={8} y={1} w={2} />
      <GridScreen x={8} y={2} w={2} h={2} />
      
      <GridSliderHorizontal x={1} y={4} w={3} />
      <GridDisplay x={4} y={4} w={2} />
      
      {/* Development info */}
      {gridDebug.debugControls.visible && (
        <div style={{ position: 'absolute', bottom: 0, left: 0, fontSize: '12px' }}>
          {gridDebug.isValid ? '✅' : '❌'} Layout | 
          {gridDebug.componentCount} components | 
          {gridDebug.utilization}% utilized
        </div>
      )}
    </ToolContainer>
  );
};
```

This layout achieves:
- ✅ No overlaps
- ✅ All components within bounds  
- ✅ Good utilization (~70%)
- ✅ Logical grouping
- ✅ Visual balance

## Console Commands

When using the debugging hook, you can access these console methods:

```javascript
const gridDebug = useGridDebug(components, 10, 5);

// In browser console:
gridDebug.log.all()          // Complete debug report
gridDebug.log.validation()   // Validation results
gridDebug.log.overlaps()     // Overlap details  
gridDebug.log.analysis()     // Layout statistics
gridDebug.log.visualization() // ASCII layout
gridDebug.log.components()   // Component table
```

## Integration with Development Mode

The grid debugging tools automatically integrate with the app's development mode:

```javascript
// In development mode (?dev=true), show debug controls
const [devMode, setDevMode] = useState(false);

useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search);
  setDevMode(urlParams.get("dev") === "true");
}, []);

// Only show debug tools in dev mode
{devMode && (
  <GridDebugControls {...gridDebug.debugControls} />
)}
```

This provides a comprehensive system for creating, debugging, and maintaining grid-based layouts in the Modeling Synthesizer project.