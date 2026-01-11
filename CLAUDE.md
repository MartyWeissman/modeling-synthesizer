# Modeling Synthesizer - Tool Porting Guide

## Project Overview
This is a React-based modeling synthesizer for life sciences education, using a grid-based component system with themed styling. Each tool occupies a structured grid layout with consistent interactions.

## Architecture Patterns

### URL-Based Navigation
- **Direct Tool Access**: `?tool=tool-id` parameter for direct tool links
- **Theme Persistence**: `?theme=dark` parameter preserves theme on reset
- **Universal Reset**: Reset reloads page while preserving theme and tool selection
- **Bookmarkable URLs**: Each tool has a shareable direct link with theme
- **Browser Navigation**: Back/forward buttons work naturally

### Grid System
- **Cell Size**: 100px per grid unit (defined in `src/themes/index.js`)
- **Tool Container**: Use `ToolContainer` wrapper with `canvasWidth` and `canvasHeight`
- **Component Positioning**: All components use `x`, `y`, `w`, `h` for grid placement
- **Coordinate System**: (0,0) is top-left, x increases right, y increases down

## Tool Architecture Types

The Modeling Synthesizer supports three distinct architectural patterns, each suited to different types of biological simulations:

### Pattern A: Canvas-Based Animation (SharkTunaTrajectoryTool)
**Best for**: Phase portraits, vector fields, real-time trajectory simulations

**Key Characteristics**:
- **Separation of Concerns**: UI state (React) vs animation state (pure refs)
- **Canvas Integration**: Custom drawing within GridGraph components
- **Animation Loop**: Independent requestAnimationFrame loop
- **State Management**: `animationStateRef.current` for animation, React state for UI

**Implementation Pattern**:
```jsx
// UI State - triggers React re-renders
const [uiParams, setUiParams] = useState({
  p: 0.03, q: 0.04, beta: 0.6, delta: 0.4, speed: 2
});
const [isAnimating, setIsAnimating] = useState(false);

// Animation State - pure refs, never cause re-renders
const animationStateRef = useRef({
  trajectories: [],
  time: 0,
  animationId: null,
  isRunning: false,
  params: { ...uiParams }
});

// Sync UI to animation only when needed
useEffect(() => {
  animationStateRef.current.params = { ...uiParams };
}, [uiParams]);

// Pure animation functions with no React dependencies
const drawVectorField = useCallback((canvas, ctx) => {
  const { p, q, beta, delta } = animationStateRef.current.params;
  // Canvas drawing logic using current animation parameters
}, []); // No dependencies - uses ref values

// Canvas overlay within GridGraph
<GridGraph ...props>
  <canvas
    ref={vectorFieldCanvasRef}
    className="absolute cursor-crosshair"
    onClick={handleCanvasClick}
  />
</GridGraph>
```

**When to Use**:
- Tools requiring smooth, high-framerate animation
- Vector field visualizations
- Interactive trajectory plotting
- Phase portraits with clickable starting points
- Real-time differential equation solving

### Pattern B: Static Data Visualization (CaffeineMetabolismTool) 
**Best for**: Time-series displays, parameter-driven calculations

**Key Characteristics**:
- **Data Generation**: Pure computational functions with useCallback
- **Canvas Injection**: Dynamically inject canvas into GridGraph
- **Theme Integration**: Colors and styling reactive to theme changes
- **Calculation-Heavy**: Complex mathematical modeling with immediate updates

**Implementation Pattern**:
```jsx
// Pure calculation functions
const generateTimeSeries = useCallback(() => {
  const doses = [/* dose schedule */];
  const dataPoints = [];
  
  for (let t = 0; t <= 72; t += timeStep) {
    let totalLevel = 0;
    doses.forEach(dose => {
      if (hoursElapsed > 0) {
        totalLevel += dose.mg * Math.exp(-metabolicRate * hoursElapsed);
      }
    });
    dataPoints.push({ time: t, level: totalLevel });
  }
  setTimeSeriesData(dataPoints);
}, [dose1Time, dose1Level, dose2Time, dose2Level, /* ... */]);

// Canvas injection after component render
const drawTimeSeries = useCallback(() => {
  setTimeout(() => {
    const graphComponent = document.querySelector('[title="Caffeine in bloodstream"]');
    let canvas = graphComponent.querySelector('canvas');
    
    if (!canvas) {
      canvas = document.createElement('canvas');
      // Style and position canvas within graph bounds
      graphContent.appendChild(canvas);
    }
    
    const ctx = canvas.getContext('2d');
    // Direct canvas coordinate mapping
    timeSeriesData.forEach((point, index) => {
      const x = (point.time / 72) * graphWidth;
      const y = graphHeight - (point.level / 320) * graphHeight;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }, 200);
}, [timeSeriesData, theme]);
```

**When to Use**:
- Time-series data visualization
- Pharmacokinetic modeling
- Multi-parameter calculations
- Static graphs that update on parameter changes
- Mathematical function plotting

### Pattern C: Interactive Simulation (SharkTunaInteractionTool)
**Best for**: Discrete event simulations, spatial modeling, counting/statistics

**Key Characteristics**:
- **Event-Driven**: User actions trigger simulation runs
- **Spatial Layout**: Positioned elements within GridWindow
- **Statistical Analysis**: Counting interactions, proximity detection
- **Delayed Updates**: Visual feedback with timing effects

**Implementation Pattern**:
```jsx
// Discrete simulation state
const [creatures, setCreatures] = useState([]);
const [interactions, setInteractions] = useState(0);
const [showResults, setShowResults] = useState(false);

// Spatial simulation logic
const runSimulation = useCallback(() => {
  const occupiedPositions = new Set();
  
  // Generate unique spatial positions
  const newSharks = Array.from({ length: numSharks }, (_, i) => ({
    id: i,
    ...getUniquePosition()
  }));
  
  // Interaction detection
  let interactions = 0;
  creatures.forEach(creature => {
    const hasInteraction = otherCreatures.some(other => 
      areAdjacent(creature, other)
    );
    if (hasInteraction) interactions++;
  });
  
  // Immediate state update
  setCreatures(newCreatures);
  setInteractions(interactions);
  
  // Delayed visual effects
  setTimeout(() => {
    setShowResults(true);
  }, 1000);
}, [numSharks, numTuna]);

// Spatial rendering within GridWindow
<GridWindow x={0} y={0} w={4} h={4}>
  <div style={oceanStyle}>
    {creatures.map(creature => (
      <div
        key={creature.id}
        style={{
          position: 'absolute',
          left: `${(creature.x / GRID_SIZE) * 100}%`,
          top: `${(creature.y / GRID_SIZE) * 100}%`,
          transform: 'translate(-50%, -50%)'
        }}
      >
        {creature.emoji}
      </div>
    ))}
  </div>
</GridWindow>
```

**When to Use**:
- Spatial ecology simulations
- Discrete event modeling
- Counting and statistical analysis
- Randomization and probability experiments
- Interactive "run experiment" workflows

### Pattern D: Study Aide (DiscreteModelingPracticeTool)
**Best for**: Educational practice tools, randomized problem generation, step-by-step reveals

**Key Characteristics**:
- **Question Display**: Wide display area for problem description
- **Progressive Reveals**: Multiple hidden answer sections that can be shown individually
- **Randomization**: Generate new problems with random parameters
- **Educational Flow**: Guided discovery with toggle buttons for each section
- **Tight Layout**: Compact spacing with labels to the left of content areas

**Implementation Pattern**:
```jsx
// Study aide state
const [currentProblem, setCurrentProblem] = useState(null);
const [showEquation, setShowEquation] = useState(false);
const [showVariable, setShowVariable] = useState(false);
const [showPrediction, setShowPrediction] = useState(false);
const [showGraph, setShowGraph] = useState(false);

// Problem generation logic
const generateNewProblem = useCallback(() => {
  // Reset all reveals
  setShowEquation(false);
  setShowVariable(false);
  setShowPrediction(false);
  setShowGraph(false);

  // Generate randomized problem parameters
  const containers = ["basket", "house", "bucket"];
  const things = ["apples", "bicycles", "monkeys"];
  const container = getRandomElement(containers);
  const thing = getRandomElement(things);
  
  // Create problem object with description and answers
  setCurrentProblem({
    description: `Problem description...`,
    equation: `Mathematical equation`,
    variable: `Variable definition`,
    prediction: `Predictive equation`
  });
}, []);

// Layout with labels on left, content in middle, buttons on right
<GridLabel
  x={0} y={1} w={1} h={1}
  text="Change Equation"
  textAlign="left"
  fontWeight="bold"
  theme={theme}
/>

<GridDisplay
  x={1} y={1} w={6} h={1}
  variant="info"
  align="left"
  theme={theme}
  style={{ 
    backgroundColor: showEquation ? 'transparent' : (currentTheme === "dark" ? "#374151" : "#f3f4f6"),
    color: showEquation ? 'inherit' : 'transparent'
  }}
>
  <div style={{ padding: "4px", fontFamily: "monospace" }}>
    {currentProblem.equation}
  </div>
</GridDisplay>

<GridButton
  x={8} y={1} w={2} h={1}
  type="toggle"
  active={showEquation}
  onToggle={setShowEquation}
  theme={theme}
>
  <div style={{ fontSize: "14px" }}>
    {showEquation ? "Hide" : "Reveal"}
  </div>
</GridButton>
```

**When to Use**:
- Educational practice and drill tools
- Randomized problem generation
- Step-by-step learning with guided reveals
- Study aides with multiple answer components
- Tools where discovery process is pedagogically important

**Layout Guidelines for Study Aides**:
- **Tight Spacing**: Use consistent padding (8px) and compact layout
- **Consistent Typography**: 
  - GridLabels: `fontSize="large"` for section headers, 2 units wide
  - GridDisplays: `fontSize="large"` with inner `fontSize: "16px"`
  - GridButtons: `fontSize: "14px"` for button text
- **Labels on Left**: Use GridLabel components (w=2) positioned to the left of content
- **Progressive Disclosure**: Hide content with background color, reveal with toggle buttons
- **Toggle Functionality**: Use `type="toggle"`, `active={state}`, `onToggle={setState}` pattern
- **Logical Flow**: Arrange sections in pedagogical order (problem → equation → variable → prediction → graph)

## Architecture Pattern Guidelines

The four patterns above are **examples and starting points**, not rigid templates. Each tool will likely need its own unique combination of techniques. Use these patterns as inspiration:

### When to Consider Each Approach

**Canvas Animation Techniques** (Pattern A inspiration):
- Smooth real-time animation is needed
- Vector fields or phase portraits
- User clicks set initial conditions
- Differential equation trajectories
- Complex mathematical visualizations

**Static Visualization Techniques** (Pattern B inspiration):
- Time-series data display
- Parameter-driven calculations
- Mathematical function plotting
- Pharmacokinetic/kinetic modeling
- Data that updates on parameter changes

**Interactive Simulation Techniques** (Pattern C inspiration):
- Discrete events or experiments
- Spatial positioning important
- "Run experiment" workflows
- Statistical counting/analysis
- Randomization and probability

**Study Aide Techniques** (Pattern D inspiration):
- Educational practice and drill
- Randomized problem generation
- Progressive discovery learning
- Step-by-step answer reveals
- Question-answer format tools

### Mixing Patterns
Most tools will combine techniques from multiple patterns:
- Canvas animation + static visualization for complex dynamics
- Interactive simulation + data visualization for experimental results
- Any pattern + parameter controls and displays

**Key Principle**: Choose the techniques that best serve your specific tool's educational purpose, not the pattern that seems closest.

## Animated Graph State Management ⚡

For tools with animated visualizations (vector fields, trajectories, particles), use the **proven two-canvas optimization pattern**. This provides 10-100x performance improvement for complex animations.

### The Gold Standard: Two-Canvas Architecture

**Problem**: Traditional single-canvas approach recalculates static elements (vector fields, nullclines, equilibrium points) 60 times per second during animation, causing performance issues.

**Solution**: Layer two canvases - static background + dynamic foreground.

```jsx
const YourAnimatedTool = () => {
  const { currentTheme } = useTheme();
  
  // UI State - React state for controls
  const [uiParams, setUiParams] = useState({
    v: 1.0, c: 1.0, k: 1.0, speed: 2
  });
  const [showNullclines, setShowNullclines] = useState(false);
  
  // Canvas refs - separate layers for performance
  const staticCanvasRef = useRef(null);
  const dynamicCanvasRef = useRef(null);

  // Animation state - pure refs for smooth performance
  const animationStateRef = useRef({
    trajectories: [], time: 0, params: { ...uiParams }
  });

  // Sync UI changes to animation (unidirectional)
  useEffect(() => {
    animationStateRef.current.params = { ...uiParams };
  }, [uiParams]);
```

### Static vs Dynamic Drawing Functions

**Key Insight**: Split drawing into two functions with different performance characteristics.

```jsx
// Static elements - only recompute when parameters change
const drawStaticElements = useCallback((canvas, ctx) => {
  const { v, c, k } = animationStateRef.current.params;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Vector field (expensive calculation - do once per parameter change)
  if (showVectorField) {
    for (let i = 0; i < gridCoords.length; i++) {
      for (let j = 0; j < gridCoords.length; j++) {
        // ... expensive vector field computation
        // ... draw arrow with trigonometry calculations
      }
    }
  }
  
  // Nullclines (expensive - do once per parameter change)
  if (showNullclines) {
    // ... expensive nullcline calculations
    // ... curve drawing
  }
  
  // Equilibrium points (cheap but static)
  // ... equilibrium calculations and drawing
}, [currentTheme, showNullclines, showVectorField]);

// Dynamic elements - recompute every animation frame
const drawDynamicElements = useCallback((canvas, ctx) => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Trajectories (must update every frame)
  animationStateRef.current.trajectories.forEach(traj => {
    // ... draw trajectory path and current position
  });
}, []);
```

### Efficient Animation Loop

**Performance**: Only dynamic elements redraw each frame (60 FPS).

```jsx
const animationLoop = useCallback(() => {
  const state = animationStateRef.current;
  if (!state.isRunning) return;

  // Update physics (trajectories, particles)
  state.trajectories = state.trajectories.map(traj => {
    // ... RK4 integration or physics update
    return { ...traj, /* updated position */ };
  });

  // Draw ONLY dynamic elements (efficient!)
  const dynamicCanvas = dynamicCanvasRef.current;
  if (dynamicCanvas) {
    const ctx = dynamicCanvas.getContext('2d');
    drawDynamicElements(dynamicCanvas, ctx);
  }

  state.animationId = requestAnimationFrame(animationLoop);
}, [drawDynamicElements]); // Minimal dependencies
```

### Parameter Change Handling

**Smart Redraws**: Static elements redraw immediately when sliders change, whether animating or not.

```jsx
// Redraw static elements when parameters change (responsive to sliders)
useEffect(() => {
  if (staticCanvasRef.current) {
    const ctx = staticCanvasRef.current.getContext('2d');
    drawStaticElements(staticCanvasRef.current, ctx);
  }
}, [uiParams, showNullclines, drawStaticElements]);
```

### Layered Canvas JSX

**Implementation**: Two overlaid canvases within GridGraph.

```jsx
<GridGraph x={0} y={0} w={5} h={5} /* ... */>
  {/* Static background - vector field, nullclines, equilibria */}
  <canvas
    ref={staticCanvasRef}
    className="absolute pointer-events-none"
    style={{ left: 1, bottom: 1, width: "calc(100% - 2px)", height: "calc(100% - 2px)" }}
    width={600} height={400}
  />
  
  {/* Dynamic foreground - trajectories, moving particles */}
  <canvas
    ref={dynamicCanvasRef}
    className="absolute cursor-crosshair"
    style={{ left: 1, bottom: 1, width: "calc(100% - 2px)", height: "calc(100% - 2px)" }}
    width={600} height={400}
    onClick={handleCanvasClick}
  />
</GridGraph>
```

### Toggle Button Fix

**Important**: Use UI state directly in drawStaticElements to avoid timing bugs.

```jsx
// ❌ Wrong - uses stale ref state
if (animationStateRef.current.showNullclines) { ... }

// ✅ Correct - uses fresh UI state
if (showNullclines) { ... }
```

### Performance Benchmarks

**Real Results from GlycolysisTool and SharkTunaTrajectoryTool**:

| Element | Before (Single Canvas) | After (Two Canvas) |
|---------|------------------------|-------------------|
| Vector Field | 60 calculations/sec | 1 calculation/param change |
| Nullclines | 60 calculations/sec | 1 calculation/param change |
| Equilibria | 60 calculations/sec | 1 calculation/param change |
| Trajectories | 60 calculations/sec | 60 calculations/sec ✓ |

**Result**: 10-100x performance improvement for complex visualizations.

### Complete Example Template

```jsx
const OptimizedAnimatedTool = () => {
  const { theme, currentTheme } = useTheme();
  
  // UI State
  const [uiParams, setUiParams] = useState({ /* ... */ });
  const [showNullclines, setShowNullclines] = useState(false);
  
  // Canvas refs
  const staticCanvasRef = useRef(null);
  const dynamicCanvasRef = useRef(null);
  
  // Animation state
  const animationStateRef = useRef({
    trajectories: [], params: { ...uiParams }
  });
  
  // Sync UI to animation
  useEffect(() => {
    animationStateRef.current.params = { ...uiParams };
  }, [uiParams]);
  
  // Drawing functions
  const drawStaticElements = useCallback((canvas, ctx) => {
    // Static expensive computations
  }, [currentTheme, showNullclines]);
  
  const drawDynamicElements = useCallback((canvas, ctx) => {
    // Fast trajectory drawing
  }, []);
  
  // Animation loop
  const animationLoop = useCallback(() => {
    // Update physics, draw only dynamic elements
  }, [drawDynamicElements]);
  
  // Parameter change redraws
  useEffect(() => {
    if (staticCanvasRef.current) {
      const ctx = staticCanvasRef.current.getContext('2d');
      drawStaticElements(staticCanvasRef.current, ctx);
    }
  }, [uiParams, showNullclines, drawStaticElements]);
  
  return (
    <ToolContainer>
      <GridGraph>
        <canvas ref={staticCanvasRef} className="absolute pointer-events-none" />
        <canvas ref={dynamicCanvasRef} className="absolute cursor-crosshair" onClick={handleClick} />
      </GridGraph>
    </ToolContainer>
  );
};
```

### When to Use This Pattern

✅ **Always use for**: Vector fields, nullclines, particle systems, phase portraits  
✅ **Benefits**: Smooth 60 FPS animation with complex backgrounds  
✅ **Proven in**: GlycolysisTool, SharkTunaTrajectoryTool

### Advanced Features

**Toggle Buttons**: Use proper toggle pattern for show/hide controls:

```jsx
<GridButton
  type="toggle"
  variant="function"
  active={showNullclines}
  onToggle={setShowNullclines}
  theme={theme}
>
  <div style={{ textAlign: "center", lineHeight: "1.1" }}>
    <div>{showNullclines ? "Hide" : "Show"}</div>
    <div>Nullclines</div>
  </div>
</GridButton>
```

**Canvas Initialization**: Standard setup pattern:

```jsx
useEffect(() => {
  [staticCanvasRef, dynamicCanvasRef, timeSeriesCanvasRef].forEach(ref => {
    if (ref.current) {
      const canvas = ref.current;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    }
  });

  // Draw initial static elements
  if (staticCanvasRef.current) {
    const ctx = staticCanvasRef.current.getContext('2d');
    drawStaticElements(staticCanvasRef.current, ctx);
  }
}, [drawStaticElements]);
```

**Memory Cleanup**: Always clean up animation frames:

```jsx
useEffect(() => {
  return () => {
    const state = animationStateRef.current;
    if (state.animationId) {
      cancelAnimationFrame(state.animationId);
    }
  };
}, []);
```

### Tool Structure Template
```jsx
import React, { useState, useEffect, useCallback } from "react";
import {
  GridSliderHorizontal,
  GridButton, 
  GridGraphDualY, // or GridGraph
  GridLabel,
  GridDisplay,
} from "../components/grid";
import ToolContainer from "../components/ui/ToolContainer";
import { useTheme } from "../hooks/useTheme";

const NewTool = () => {
  const { theme, currentTheme } = useTheme();

  // State management (no DEFAULT_VALUES needed - page reload handles reset)
  const [param1, setParam1] = useState(1.0);
  const [param2, setParam2] = useState(0.5);
  const [simulationData, setSimulationData] = useState([]);
  const [isRunning, setIsRunning] = useState(false);

  // Simulation logic
  const runSimulation = useCallback(() => {
    // Implementation here
  }, [param1, param2]);

  return (
    <ToolContainer
      title="Tool Name"
      canvasWidth={11}  // Adjust based on layout
      canvasHeight={5}  // Adjust based on layout
    >
      {/* Grid components here */}
    </ToolContainer>
  );
};

export default NewTool;
```

## Porting Process

### Step 1: Analysis & Pattern Selection
1. **Extract Parameters**: Identify all sliders, inputs, and controls
2. **Map Interactions**: Note button behaviors and simulation triggers  
3. **Identify Outputs**: Locate graphs, displays, and visual elements
4. **Select Architecture Pattern**: Use decision matrix above to choose Pattern A, B, or C
5. **Determine Grid Size**: Plan layout (typical: 10x5 to 12x6)

### Step 2: Component Selection
- **Parameter Controls**: 
  - Use `GridInput` for tools with **many parameters** (5+ parameters)
  - Use `GridSliderHorizontal` for tools with **few parameters** (≤4 parameters)
  - **Always use `GridSliderHorizontal` for animation speed** regardless of parameter count
- **Buttons**: Use `GridButton` with `type="momentary"` for actions
- **Graphs**: Use `GridGraphDualY` for dual-axis, `GridGraph` for single-axis
- **Text**: Use `GridLabel` for equations/info, `GridDisplay` for values
- **Status**: Use `GridDisplay` with `variant="status"` for mode indicators
  - **Minimize status displays**: Use only **one consolidated status box** with key information
  - Use **small font size** (`fontSize="small"`) to fit more information efficiently

### Step 3: Parameter Mapping
```jsx
// Scale parameters so defaults are at 50% (slider center)
const [param, setParam] = useState(1.0);  // Default value

// In JSX:
<GridSliderHorizontal
  value={param * 50}  // If default is 1.0, shows at 50%
  onChange={(value) => setParam(value / 50)}
  label={`Parameter = ${param.toFixed(1)}`}
/>
```

### Step 4: Theme Integration
- **NEVER use color detection** - always use `currentTheme` string comparison
- Use `currentTheme === "dark"` for dark mode detection
- Use `currentTheme === "unicorn"` for unicorn theme detection  
- Apply theme-reactive colors: `theme.text`, `theme.component`
- For graphs: `leftAxisColor={currentTheme === "dark" ? "#ffffff" : "#000000"}`
- Theme is preserved in URL and survives resets

### Step 5: Simulation Integration
- Convert JavaScript math to React `useCallback` with dependencies
- Use `useEffect` for auto-running simulations
- Handle async updates with `setTimeout` for UI responsiveness

## Grid Layout Rules

### Standard Layouts
- **10x5 Grid** (1000x500px): Compact tools
- **11x5 Grid** (1100x500px): Standard with main graph
- **12x6 Grid** (1200x600px): Complex tools with multiple sections

### Component Sizing Guidelines
- **Main Graph**: `w={5-8}`, `h={3-5}` (central visualization)
- **Secondary Graph**: `w={5}`, `h={2}` (time series, smaller plots)
- **Parameter Controls**:
  - **GridInput**: `w={1}`, `h={1}` (compact, space-efficient for many parameters)
  - **GridSliderHorizontal**: `w={3}`, `h={1}` (wider for visual feedback)
- **Buttons**: `w={1-3}`, `h={1}` (actions - single buttons w=1, wide buttons w=3)
- **Displays (Status)**: `w={2-6}`, `h={1-2}` (values, results, multi-line info)
  - **Consolidated Status**: `w={5}`, `h={2}` (single comprehensive display)
- **Labels**: `w={1-4}`, `h={1}` (text, equations - narrow labels w=1, equations w=2-4)
- **Windows**: `w={4}`, `h={4}` (interactive containers, spatial simulations)
- **Time Pickers**: Default size (typically 1x1)
- **Staircases**: Default size (discrete value selectors)
- **Info Displays**: `w={3}`, `h={2}` (detailed information panels)

## Component Design Rules

### GridGraph Child Elements for Model Visualization

**Critical Pattern**: Lines, nullclines, equilibrium points, and other model-specific visual elements that align with axes **MUST be GridGraph child elements**, not drawn on canvas with manual coordinate calculations.

**Why This Matters**:
- GridGraph has internal padding calculations that vary based on tick label lengths
- Canvas overlay positioning is complex and error-prone
- GridGraph provides exact coordinate transformation functions
- Alignment issues are nearly impossible to fix with manual canvas calculations

**The Correct Pattern** (LogisticGrowthExplorerTool carrying capacity line):

```jsx
<GridGraph
  x={2} y={0} w={7} h={6}
  xLabel="Time (t)" yLabel="Population (P)"
  xRange={tRange} yRange={PRange}
  xTicks={xTicks} yTicks={yTicks}
  theme={theme}
>
  {/* Model element positioned by GridGraph's coordinate system */}
  {(() => {
    // Calculate GridGraph's internal dimensions (same as GridGraph does)
    const maxYTickLength = Math.max(...yTicks.map(t => t.toString().length));
    const yTickWidth = Math.max(25, maxYTickLength * 6 + 10);
    const yAxisLabelWidth = 20;
    const dynamicPaddingBottom = 35;
    const dynamicPaddingLeft = yTickWidth + yAxisLabelWidth;
    const dynamicPaddingRight = 15;
    const dynamicPaddingTop = 15;
    
    // Graph dimensions (w cells * 100px - 16px for component padding)
    const graphWidth = 7 * 100 - 16;
    const graphHeight = 6 * 100 - 16;
    const axisWidth = graphWidth - dynamicPaddingLeft - dynamicPaddingRight;
    const axisHeight = graphHeight - dynamicPaddingTop - dynamicPaddingBottom;
    
    // Data to pixel transformation (SAME as GridGraph's dataToPixel)
    const [pMin, pMax] = PRange;
    const yPos = ((C - pMin) / (pMax - pMin)) * axisHeight;
    
    return (
      <div
        className="absolute pointer-events-none"
        style={{
          left: `${dynamicPaddingLeft}px`,
          bottom: `${dynamicPaddingBottom + yPos}px`,
          width: `${axisWidth}px`,
          height: '2px',
          borderTop: `2px dashed ${currentTheme === "dark" ? "#4ade80" : "#16a34a"}`,
        }}
      />
    );
  })()}
  
  {/* Canvas for dynamic elements (trajectories, particles, etc.) */}
  <canvas ref={canvasRef} className="absolute" 
    style={{ left: 1, bottom: 1, width: "calc(100% - 2px)", height: "calc(100% - 2px)" }}
  />
</GridGraph>
```

**Key Implementation Details**:

1. **Padding Calculation** - Must match GridGraph exactly:
   ```jsx
   const yTickWidth = Math.max(25, maxYTickLength * 6 + 10);  // 6px per char
   const yAxisLabelWidth = 20;
   const dynamicPaddingBottom = 35;  // 15 tick labels + 20 axis label
   ```

2. **Graph Dimensions** - Account for component padding:
   ```jsx
   const graphWidth = w * 100 - 16;   // 8px padding each side
   const graphHeight = h * 100 - 16;
   ```

3. **Data Transformation** - Same formula as GridGraph's `dataToPixel`:
   ```jsx
   const yPos = ((value - dataMin) / (dataMax - dataMin)) * axisHeight;
   ```

4. **Positioning** - Use GridGraph's coordinate system:
   ```jsx
   left: `${dynamicPaddingLeft}px`,
   bottom: `${dynamicPaddingBottom + yPos}px`,
   ```

**When to Use This Pattern**:
- ✅ Horizontal/vertical lines at specific data values (carrying capacity, thresholds)
- ✅ Nullclines (curves where derivatives equal zero)
- ✅ Equilibrium points (fixed points in phase space)
- ✅ Isoclines or other mathematical curves aligned with axes
- ❌ NOT for dynamic animated elements (use canvas for those)

**Benefits**:
- Perfect pixel-accurate alignment with tick marks
- Automatically adapts to theme changes
- No coordinate transformation bugs
- Cleaner separation: GridGraph positions static model elements, canvas handles animation

### Parameter Control Selection

**GridInput vs GridSlider Decision Matrix**:

✅ **Use GridInput when**:
- Tool has **5 or more parameters** (reduces visual clutter)
- Parameters have wide ranges or need precise values
- Limited grid space requires compact controls
- Example: HollingTannerTool with 6 biological parameters (α, β, c, h, m, q)

✅ **Use GridSliderHorizontal when**:
- Tool has **4 or fewer parameters** (visual feedback is valuable)
- **Always for animation speed controls** (immediate visual feedback essential)
- Parameters benefit from real-time visual adjustment
- Sufficient grid space available

**GridInput Best Practices**:
```jsx
<GridInput
  x={5} y={0}
  value={uiParams.alpha}
  onChange={(value) => updateParam("alpha", value)}
  min={0.1} max={3.0} step={0.1}
  variable="α"  // Greek letters and symbols encouraged
  title="Biological parameter description"
  theme={theme}
/>
```

**Animation Speed Exception**:
```jsx
// Always use slider for speed - immediate feedback crucial
<GridSliderHorizontal
  x={5} y={4} w={3} h={1}
  value={uiParams.speed * 25}
  onChange={(value) => updateParam("speed", value / 25)}
  variant="unipolar"
  label={`Animation Speed: ${uiParams.speed.toFixed(1)}x`}
  theme={theme}
/>
```

### Status Display Design

**Single Consolidated Status Box Principle**:
- Use **only one status display** per tool instead of multiple separate boxes
- Consolidate all key information (current values, simulation state, legend)
- Use **small font size** (`fontSize="small"`) to fit more content efficiently
- Group related information with proper spacing and hierarchy

**Effective Status Display Pattern**:
```jsx
<GridDisplay
  x={5} y={5} w={5} h={2}
  variant="info"
  align="left"
  fontSize="small"  // Small font enables more information
  theme={theme}
>
  <div style={{ padding: "4px" }}>
    <div style={{ fontWeight: "bold", marginBottom: "4px" }}>
      Simulation Status
    </div>
    <div style={{
      display: "grid",
      gridTemplateColumns: "1fr 1fr 1fr",
      gap: "8px",
      fontSize: "0.85em"
    }}>
      <div>Active Trajectories: {trajectoryCount}</div>
      <div>Current Time: {currentTime.toFixed(1)}</div>
      <div>Animation: {isAnimating ? "Running" : "Stopped"}</div>
    </div>
    <div style={{ marginTop: "4px", fontSize: "0.85em" }}>
      <div>Current Values: S={currentS.toFixed(2)}, T={currentT.toFixed(2)}</div>
    </div>
    <div style={{ marginTop: "6px", fontSize: "0.8em", opacity: 0.8 }}>
      <span style={{ color: "blue" }}>Blue: Species 1</span> | 
      <span style={{ color: "red" }}>Red: Species 2</span>
    </div>
  </div>
</GridDisplay>
```

### Mathematical Equation Display

**Professional MathML Equation Architecture**:

The modeling synthesizer uses a centralized MathML system for displaying mathematical equations with publication-quality typography. This system provides consistent, theme-aware equation rendering across all tools.

**Directory Structure**:
```
src/equations/
├── holling-tanner-predator.mathml     # Individual equation files
├── holling-tanner-prey.mathml
├── equilibrium-s.mathml               # Reusable equation fragments
├── equilibrium-t.mathml
└── [tool-name]-[description].mathml   # Naming convention
```

**Equation Component Usage**:
```jsx
import Equation from "../components/Equation";

// In your tool component:
<Equation name="holling-tanner-predator" size="medium" />
<Equation name="equilibrium-s" size="small" style={{ marginRight: "4px" }} />
```

**MathML Best Practices**:

✅ **Individual Display Equations** (Recommended):
```mathml
<math xmlns="http://www.w3.org/1998/Math/MathML" display="block">
  <mi mathvariant="bold-italic">S</mi>
  <mo>′</mo>
  <mo>=</mo>
  <!-- equation content -->
</math>
```

❌ **Aligned Equation Systems** (Avoid):
MathML alignment is poorly supported across browsers. Use separate beautiful equations instead.

**Scaling Parentheses Pattern**:
```mathml
<mrow>
  <mo stretchy="true" symmetric="true" largeop="false" movablelimits="false">(</mo>
  <!-- content with fractions -->
  <mo stretchy="true" symmetric="true" largeop="false" movablelimits="false">)</mo>
</mrow>
```
*Equivalent to LaTeX `\left(` and `\right)` - parentheses scale to content height*

**Fractions Pattern**:
```mathml
<mfrac>
  <mrow><!-- numerator --></mrow>
  <mrow><!-- denominator --></mrow>
</mfrac>
```
*Display block automatically creates spacious, readable fractions*

**Multiple Equation Display**:
```jsx
<div style={{ marginBottom: "0px", lineHeight: "1.2" }}>
  <Equation name="predator-equation" size="medium" />
</div>
<div>
  <Equation name="prey-equation" size="medium" />
</div>
```
*Tight spacing between related equations in a system*

**Equilibrium Point Integration**:
```jsx
// Prevent line wrapping of "S* = value"
<div style={{ fontSize: "0.9em", whiteSpace: "nowrap" }}>
  <Equation name="equilibrium-s" size="small" style={{ marginRight: "4px" }} />
  {equilibriumValue.toFixed(2)}
</div>
```

**Variable Typography Standards**:
- **State Variables**: `mathvariant="bold-italic"` (S, T, x, y)
- **Parameters**: `mathvariant="italic"` (α, β, c, h, m, q)  
- **Numbers**: `<mn>` element (1, 2, 0.5)
- **Operators**: `<mo>` element (=, +, −, ′)

**Theme Integration**:
- Equation component automatically adapts colors for dark/light themes
- No manual color management needed
- Consistent with tool's theme switching

**Size Guidelines**:
- **`size="large"`**: Main display equations, prominent formulas
- **`size="medium"`**: Standard equation systems, tool equations
- **`size="small"`**: Equilibrium points, inline mathematical expressions

**Common Equation Patterns**:

*Differential Equations*:
```mathml
<mi mathvariant="bold-italic">x</mi>
<mo>′</mo>
<mo>=</mo>
```

*Equilibrium Points*:
```mathml
<mi mathvariant="bold-italic">x</mi>
<mo>*</mo>
<mo>=</mo>
```

*Subscripts/Superscripts*:
```mathml
<msub>
  <mi>x</mi>
  <mn>0</mn>
</msub>
```

**Benefits of This System**:
✅ **Professional Typography**: Publication-quality mathematical display  
✅ **Maintainable**: Equations in dedicated files, easy to edit  
✅ **Reusable**: Same equation across multiple tools  
✅ **Theme-Aware**: Automatic light/dark mode support  
✅ **Consistent**: Unified mathematical typography across all tools  
✅ **No Dependencies**: Native MathML, no external libraries  

**Usage in Tools**:
Most biological modeling tools will need 2-4 equations. Follow the HollingTannerTool pattern: main system equations plus equilibrium point displays for comprehensive mathematical presentation.

### Button Design Principles

**Text Sizing and Centering**:
- Button text MUST fit within the circular button area, not just the square container
- Always center text both horizontally and vertically
- For long text, use multi-line with small `lineHeight` (e.g., `lineHeight: "1.1"`)
- Prefer short, concise button labels: "Reset" not "Reset Simulation"

```jsx
// ✅ Good - fits in circle, properly centered
<GridButton>
  <div style={{ textAlign: "center", lineHeight: "1.1" }}>
    <div>Reset</div>
  </div>
</GridButton>

// ❌ Bad - text too long for button circle
<GridButton>
  Reset Simulation
</GridButton>
```

**Show/Hide Button Pattern**:
- Use `variant={isVisible ? "pressed" : "default"}` for toggle state
- Text must change dynamically: `{isVisible ? "Hide" : "Show"}`
- Keep button text concise and descriptive

```jsx
<GridButton
  onPress={() => setShowNullclines(!showNullclines)}
  variant={showNullclines ? "pressed" : "default"}
>
  <div style={{ textAlign: "center", lineHeight: "1.1" }}>
    <div>{showNullclines ? "Hide" : "Show"}</div>
    <div>Nullclines</div>
  </div>
</GridButton>
```

### Component Positioning Rules

**Whole Number Positions Only**:
- ALL component positions (`x`, `y`, `w`, `h`) MUST be whole numbers
- NEVER use fractional positions like `x={6.5}` or `w={1.5}`
- Plan layouts to accommodate whole-number grid alignment

```jsx
// ✅ Good - whole number positions
<GridButton x={6} y={4} w={1} h={1} />
<GridButton x={7} y={4} w={1} h={1} />

// ❌ Bad - fractional positions
<GridButton x={6.5} y={4} w={1.5} h={1} />
```

**Layout Planning**:
- Design component arrangements to fit whole-number grid constraints
- Use proper spacing between components (minimum 1 grid unit)
- Consider button grouping for related controls

### Layout Examples

These are **example layouts** from existing tools - use them as inspiration, not rigid templates. Every tool's layout should serve its specific educational purpose.

#### Example A: Dual Graph with Side Controls (SharkTunaTrajectoryTool - 11x7)
*Good for complex dynamics with multiple visualizations*
```
Row 0: [Slider1   ] [  Main Phase Plot   ] [Info Panel ]
Row 1: [Slider2   ] [       (5x5)        ] [   (3x2)   ]
Row 2: [Slider3   ] [                    ] [           ]
Row 3: [Slider4   ] [                    ] [Info Panel ]
Row 4: [SpeedCtrl ] [                    ] [   (3x2)   ]
Row 5: [      Time Series (5x2)         ] [Bt][Bt][Bt]
Row 6: [                                ] [Status(6x2)]
```

#### Example B: Vertical Input + Horizontal Graph (CaffeineMetabolismTool - 10x4)  
*Good for parameter-heavy calculations with single main visualization*
```
Row 0: [L][Time][Dose] [         Main Graph (7x3)        ]
Row 1: [L][Time][Dose] [                                 ]
Row 2: [L][Time][Dose] [                                 ]
Row 3: [Daily][Equation] [        Metabolic Slider       ]
```

#### Example C: Side-by-Side Interactive (SharkTunaInteractionTool - 7x4)
*Good for spatial simulations with simple controls*
```
Row 0: [    Interactive    ] [  Shark Slider    ]
Row 1: [    Window (4x4)   ] [  Tuna Slider     ]
Row 2: [                   ] [  Action Button   ]
Row 3: [                   ] [  Results Display ]
```

#### Example D: Classic Control Panel
*Good for standard parameter exploration tools*
```
Row 0: [Slider 1    ] [     Main Graph      ]
Row 1: [Slider 2    ] [                     ]
Row 2: [Slider 3    ] [                     ]
Row 3: [Slider 4    ] [                     ]
Row 4: [Btn][Btn][St] [Equations   ][Reset ]
```

**Layout Principle**: Arrange components to guide the student's attention in the most pedagogically effective way. Common visualization on the left/center, controls on the right/bottom.

## Tool Registration

### Centralized Metadata System

All tool information is managed in a **single file** for easy maintenance: `src/data/tools.js`

### Adding a New Tool

Add your tool to the `toolDefinitions` object in `src/data/tools.js`:

```jsx
// src/data/tools.js
import NewToolComponent from "../tools/NewToolComponent";

export const toolDefinitions = {
  // ... existing tools

  "new-tool-id": {
    name: "Tool Display Name",
    description: "Biology-focused description for students",
    component: NewToolComponent,
    categories: {
      topics: ["physiology"],           // Can be multiple: ["ecology", "evolution"] 
      toolType: "simulation",           // Exactly one
      lab: "lab3"                       // Exactly one
    },
    visibility: "student"               // "student", "dev", or "both"
  }
};
```

### Multi-Category Tools

Tools can belong to **multiple topic categories** for cross-disciplinary content:

```jsx
"population-genetics": {
  name: "Population Genetics",
  // ...
  categories: {
    topics: ["ecology", "evolution"],  // Appears in both categories!
    toolType: "simulation",
    lab: "lab2"
  }
}
```

### Category Guidelines

**Topic Selection** (choose one or more):
- **ecology**: Population dynamics, ecosystems, species interactions
- **physiology**: Metabolism, regulation, homeostasis, pharmacokinetics  
- **evolution**: Selection, genetics, adaptation, inheritance
- **molecular**: Biochemical processes, enzyme kinetics, reactions
- **physical**: Diffusion, mechanics, physics, mathematical models

**Tool Type Selection** (choose exactly one):
- **simulation**: Dynamic models, parameter exploration, "what if" scenarios
- **explorer**: Interactive discovery tools, spatial experiments, counting
- **calculator**: Computational tools, function evaluation, unit conversion
- **study**: Reference materials, guides, educational helpers
- **development**: Testing tools, component demos, debug utilities

**Lab Assignment** (choose exactly one):
- **lab1**: Flow - Dynamic systems, trajectories, time evolution
- **lab2**: Growth - Population changes, exponential processes
- **lab3**: Equilibrium - Steady states, homeostasis, balance
- **lab4**: Oscillation - Periodic behavior, cycles, rhythms
- **lab5**: Randomness - Probability, stochastic processes, variation
- **lab6**: Order - Pattern formation, organization, structure

### Automatic Category Generation

The menu system automatically generates categories from your tool definitions - no manual updating required in multiple files!

### Benefits of Centralized System

✅ **Single source of truth** - All tool metadata in one place  
✅ **Multi-category support** - Tools can appear in multiple topics  
✅ **Future-proof** - Easy to add new categories or change structure  
✅ **Maintainable** - No duplication between files  
✅ **Type-safe** - Consistent structure enforced

## Help File Writing

### When to Write Help Files
**Always use the `/write-help` command** when:
- Creating a new tool (write help after the tool is complete and tested)
- User asks to create or update help documentation for a tool
- Fixing or improving existing help files

**Never write help files manually** - the `/write-help` command enforces a strict workflow that prevents hallucination of features, parameter values, or behaviors that don't exist in the tool.

### Usage
```
/write-help caffeine-metabolism
/write-help insulin-glucose
```

### Help File Location
Help files are stored in `public/help/{tool-id}.md` and are loaded by the HelpModal component when users click the (?) button.

### What the Command Does
1. Reads the tool source code first (mandatory)
2. Extracts actual parameter names, defaults, and ranges from code
3. Documents every UI component with its actual behavior
4. Marks biological interpretations with [VERIFY] for human review
5. Leaves References section empty (user provides if needed)

### Adding References
After the help file is generated, you can add references if the user provides them:
```markdown
## References
- [Paper Title](https://url) - Brief description
```

## Testing Checklist
- [ ] Direct URL access works: `?tool=tool-id`
- [ ] Reset button works (page reload)
- [ ] Back button returns to main menu
- [ ] Theme switching updates all colors (test light/dark modes)
- [ ] Sliders centered at default values
- [ ] Graph axes properly themed
- [ ] Tool appears in correct category and lab
- [ ] Mobile responsive (test grid scaling)
- [ ] Simulation runs on parameter changes
- [ ] No console errors

### Design Compliance Checklist
- [ ] All component positions use whole numbers (no fractional x/y/w/h values)
- [ ] Button text fits within circular button area
- [ ] Button text is properly centered (horizontally and vertically)
- [ ] Show/Hide buttons change text dynamically and use proper variant
- [ ] Multi-line button text uses small lineHeight (1.1) for proper spacing
- [ ] Button labels are concise and descriptive

## Common Patterns

### Dual Y-Axis Graphs
```jsx
<GridGraphDualY
  x={3} y={0} w={8} h={4}
  xLabel="time" xUnit="hours"
  yLabelLeft="concentration" yUnitLeft="mg/L" 
  yLabelRight="response" yUnitRight="units"
  leftAxisColor={currentTheme === "dark" ? "#ffffff" : "#000000"}
  rightAxisColor={currentTheme === "dark" ? "#ffffff" : "#000000"}
  // ... data props
/>
```

### Multi-Line Equations
```jsx
<GridLabel
  text="x' = ax + by|y' = cx + dy"  // Use | for line breaks
  formulaMode={true}
  textAlign="center"
/>
```

### Mode Switching
```jsx
const [currentMode, setCurrentMode] = useState("normal");

const handleMode = (mode) => {
  setCurrentMode(mode);
  runSimulation(mode);
};
```

## Biology Education Focus
- Use physiological parameter ranges and units
- Include biological context in descriptions
- Emphasize real-world applications (drug metabolism, population ecology, etc.)
- Provide educational tooltips explaining biological significance
- Consider lab manual integration with clear learning objectives

## Maintenance Notes
- **No custom reset logic needed** - page reload handles all reset functionality
- **URL-based navigation** enables bookmarkable, shareable tool links
- Theme support is mandatory for accessibility
- Grid system enables consistent scaling across devices  
- Component reuse reduces code duplication
- Simulation callbacks should include all dependencies

## URL Structure
```
/modeling-synthesizer/                              # Main menu
/modeling-synthesizer/?tool=insulin-glucose        # Direct tool access  
/modeling-synthesizer/?tool=insulin-glucose&theme=dark    # Tool with theme
/modeling-synthesizer/?tool=caffeine-metabolism&dev=true&theme=unicorn    # All parameters
```

## Theme Awareness Rules
- **ALWAYS** use `const { currentTheme } = useTheme()` for theme detection
- **NEVER** use color-based detection like `theme.component.includes("gray-700")`
- **Use string comparison**: `currentTheme === "dark"`, `currentTheme === "unicorn"`
- **Theme survives reset**: URL parameters preserve theme across page reloads
- **Future-proof**: New themes won't break existing detection logic