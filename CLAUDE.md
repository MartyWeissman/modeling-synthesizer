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

## Architecture Pattern Guidelines

The three patterns above are **examples and starting points**, not rigid templates. Each tool will likely need its own unique combination of techniques. Use these patterns as inspiration:

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

### Mixing Patterns
Most tools will combine techniques from multiple patterns:
- Canvas animation + static visualization for complex dynamics
- Interactive simulation + data visualization for experimental results
- Any pattern + parameter controls and displays

**Key Principle**: Choose the techniques that best serve your specific tool's educational purpose, not the pattern that seems closest.

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
- **Sliders**: Use `GridSliderHorizontal` for parameters
- **Buttons**: Use `GridButton` with `type="momentary"` for actions
- **Graphs**: Use `GridGraphDualY` for dual-axis, `GridGraph` for single-axis
- **Text**: Use `GridLabel` for equations/info, `GridDisplay` for values
- **Status**: Use `GridDisplay` with `variant="status"` for mode indicators

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
- **Sliders (Horizontal)**: `w={3}`, `h={1}` (parameter controls)
- **Buttons**: `w={1-3}`, `h={1}` (actions - single buttons w=1, wide buttons w=3)
- **Displays (Status)**: `w={2-6}`, `h={1-2}` (values, results, multi-line info)
- **Labels**: `w={1-4}`, `h={1}` (text, equations - narrow labels w=1, equations w=2-4)
- **Windows**: `w={4}`, `h={4}` (interactive containers, spatial simulations)
- **Time Pickers**: Default size (typically 1x1)
- **Staircases**: Default size (discrete value selectors)
- **Info Displays**: `w={3}`, `h={2}` (detailed information panels)

## Component Design Rules

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