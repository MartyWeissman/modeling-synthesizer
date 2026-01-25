# GridGraph Migration Guide

This guide documents how to update tools from the old GridGraph pattern (hardcoded padding) to the new render prop pattern with centralized coordinate transformations.

---

## ⚠️ CRITICAL: NO PADDING IN TOOLS - EVER ⚠️

**If you find yourself typing `padding`, `paddingLeft`, `paddingTop`, etc. in a tool file - STOP.**

This is the exact anti-pattern that caused all our alignment bugs. The whole point of this migration is to eliminate padding calculations from tools entirely.

### What to do instead:

1. **For positioning elements**: Use `transform.plotStyle` which handles all positioning
2. **For coordinate conversion**: Use `transform.dataToPixel(x, y)` - it returns canvas-relative coordinates
3. **For reverse conversion**: Use `transform.pixelToData(x, y)` for click handling
4. **For drawing lines at data values**: Convert BOTH endpoints with `dataToPixel`

### Example - Drawing a horizontal line at y=100:

```jsx
// ❌ WRONG - using padding
const y = paddingTop + plotHeight - (100 / yMax) * plotHeight;
ctx.moveTo(paddingLeft, y);
ctx.lineTo(paddingLeft + plotWidth, y);

// ✅ CORRECT - using dataToPixel for BOTH endpoints
const leftPoint = dataToPixel(xMin, 100);
const rightPoint = dataToPixel(xMax, 100);
ctx.moveTo(leftPoint.x, leftPoint.y);
ctx.lineTo(rightPoint.x, rightPoint.y);
```

### If you're tempted to use padding, ask yourself:
- Can I use `dataToPixel()` instead? (Almost always YES)
- Can I use `plotStyle` for positioning? (For DOM elements, YES)
- Is there a data coordinate I should be converting? (Probably YES)

**When in doubt, ask the user rather than hacking padding values.**

---

## The Problem

Previously, tools using GridGraph had to duplicate padding calculations:

```jsx
// OLD PATTERN - hardcoded padding that must match GridGraph internals
const paddingLeft = 45;
const paddingRight = 15;
const paddingTop = 15;
const paddingBottom = 35;
const plotWidth = width - paddingLeft - paddingRight;
const plotHeight = height - paddingTop - paddingBottom;

const mapX = (dataX) => paddingLeft + (dataX / xMax) * plotWidth;
const mapY = (dataY) => paddingTop + plotHeight - (dataY / yMax) * plotHeight;
```

This led to alignment issues when GridGraph's dynamic padding changed based on tick label lengths.

## The Solution

GridGraph now provides a `transform` object via render prop that includes all coordinate transformation functions and positioning info.

## Migration Steps

### Step 1: Add a transform ref

```jsx
// Add near other refs
const transformRef = useRef(null);
```

For tools with multiple GridGraphs, add a ref for each:
```jsx
const phaseTransformRef = useRef(null);
const timeSeriesTransformRef = useRef(null);
```

### Step 2: Update GridGraph JSX to use render prop

**Before:**
```jsx
<GridGraph
  x={0} y={0} w={6} h={6}
  xRange={[0, 100]}
  yRange={[0, 50]}
  xTicks={[0, 25, 50, 75, 100]}
  yTicks={[0, 10, 20, 30, 40, 50]}
  theme={theme}
>
  <canvas
    ref={canvasRef}
    className="absolute"
    style={{
      left: 1,
      bottom: 1,
      width: "calc(100% - 2px)",
      height: "calc(100% - 2px)",
      pointerEvents: "none",
    }}
  />
</GridGraph>
```

**After:**
```jsx
<GridGraph
  x={0} y={0} w={6} h={6}
  xRange={[0, 100]}
  yRange={[0, 50]}
  xTicks={[0, 25, 50, 75, 100]}
  yTicks={[0, 10, 20, 30, 40, 50]}
  theme={theme}
>
  {(transform) => {
    transformRef.current = transform;
    return (
      <canvas
        ref={canvasRef}
        style={{
          ...transform.plotStyle,
          pointerEvents: "none",
        }}
        width={transform.plotWidth}
        height={transform.plotHeight}
      />
    );
  }}
</GridGraph>
```

### Step 3: Update drawing functions

**Before:**
```jsx
const drawData = useCallback(() => {
  const canvas = canvasRef.current;
  if (!canvas) return;
  
  const ctx = canvas.getContext("2d");
  const { width, height } = canvas;
  
  // Hardcoded padding
  const paddingLeft = 45;
  const paddingRight = 15;
  const paddingTop = 15;
  const paddingBottom = 35;
  const plotWidth = width - paddingLeft - paddingRight;
  const plotHeight = height - paddingTop - paddingBottom;
  
  ctx.clearRect(0, 0, width, height);
  
  // Manual coordinate mapping
  const mapX = (x) => paddingLeft + (x / xMax) * plotWidth;
  const mapY = (y) => paddingTop + plotHeight - (y / yMax) * plotHeight;
  
  // Draw a point
  ctx.beginPath();
  ctx.arc(mapX(dataX), mapY(dataY), 5, 0, 2 * Math.PI);
  ctx.fill();
}, [dataX, dataY, xMax, yMax]);
```

**After:**
```jsx
const drawData = useCallback(() => {
  const canvas = canvasRef.current;
  const transform = transformRef.current;
  if (!canvas || !transform) return;
  
  const ctx = canvas.getContext("2d");
  const { dataToPixel, plotWidth, plotHeight } = transform;
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Use transform's dataToPixel function
  const pos = dataToPixel(dataX, dataY);
  
  // Draw a point
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, 5, 0, 2 * Math.PI);
  ctx.fill();
}, [dataX, dataY]);
```

### Step 4: Update click handlers (if applicable)

**Before:**
```jsx
const handleCanvasClick = useCallback((event) => {
  const canvas = canvasRef.current;
  if (!canvas) return;
  
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  
  // Hardcoded padding
  const paddingLeft = 45;
  const paddingRight = 15;
  const paddingTop = 15;
  const paddingBottom = 35;
  const plotWidth = rect.width - paddingLeft - paddingRight;
  const plotHeight = rect.height - paddingTop - paddingBottom;
  
  // Check bounds
  if (x < paddingLeft || x > paddingLeft + plotWidth) return;
  if (y < paddingTop || y > paddingTop + plotHeight) return;
  
  // Convert to data coordinates
  const dataX = ((x - paddingLeft) / plotWidth) * xMax;
  const dataY = yMax - ((y - paddingTop) / plotHeight) * yMax;
  
  handleClick(dataX, dataY);
}, [xMax, yMax, handleClick]);
```

**After:**
```jsx
const handleCanvasClick = useCallback((event) => {
  const canvas = canvasRef.current;
  const transform = transformRef.current;
  if (!canvas || !transform) return;
  
  const { pixelToData, plotWidth, plotHeight } = transform;
  
  const rect = canvas.getBoundingClientRect();
  // Convert click position to canvas pixel coordinates
  const canvasX = (event.clientX - rect.left) * (canvas.width / rect.width);
  const canvasY = (event.clientY - rect.top) * (canvas.height / rect.height);
  
  // Check bounds
  if (canvasX < 0 || canvasX > plotWidth || canvasY < 0 || canvasY > plotHeight) return;
  
  // Convert to data coordinates using transform
  const dataPoint = pixelToData(canvasX, canvasY);
  
  handleClick(dataPoint.x, dataPoint.y);
}, [handleClick]);
```

### Step 5: Remove canvas initialization that sets width/height from getBoundingClientRect

**Before:**
```jsx
useEffect(() => {
  const canvas = canvasRef.current;
  if (canvas) {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
  }
}, []);
```

**After:**
Remove this effect entirely - canvas dimensions are now set directly from `transform.plotWidth` and `transform.plotHeight` in the JSX.

### Step 6: Update effects that check for canvas

**Before:**
```jsx
useEffect(() => {
  if (canvasRef.current) {
    const ctx = canvasRef.current.getContext("2d");
    drawSomething(canvasRef.current, ctx);
  }
}, [drawSomething]);
```

**After:**
```jsx
useEffect(() => {
  if (canvasRef.current && transformRef.current) {
    const ctx = canvasRef.current.getContext("2d");
    drawSomething(canvasRef.current, ctx);
  }
}, [drawSomething]);
```

## Transform Object Reference

### GridGraph transform

```typescript
{
  // Convert data coordinates to canvas pixel coordinates
  dataToPixel(dataX: number, dataY: number): { x: number, y: number }
  
  // Convert canvas pixel coordinates to data coordinates
  pixelToData(pixelX: number, pixelY: number): { x: number, y: number }
  
  // Plot area dimensions (inside axes)
  plotWidth: number
  plotHeight: number
  plotStyle: CSSProperties  // Use for canvas positioning
  
  // Background area (full graph interior, behind axes)
  backgroundWidth: number
  backgroundHeight: number
  backgroundStyle: CSSProperties
  
  // Raw padding values (rarely needed)
  padding: { left: number, right: number, top: number, bottom: number }
}
```

### GridGraphDualY transform

```typescript
{
  // For left Y-axis
  dataToPixelLeft(dataX: number, dataY: number): { x: number, y: number }
  pixelToDataLeft(pixelX: number, pixelY: number): { x: number, y: number }
  
  // For right Y-axis
  dataToPixelRight(dataX: number, dataY: number): { x: number, y: number }
  pixelToDataRight(pixelX: number, pixelY: number): { x: number, y: number }
  
  // Same as GridGraph
  plotWidth, plotHeight, plotStyle
  backgroundWidth, backgroundHeight, backgroundStyle
  padding
}
```

## Tools Migration Checklist

Tools that need migration (using GridGraph with canvas children):

### Already Migrated
- [x] YuleProcessSimulatorTool.jsx
- [x] GeneralizedLotkaVolterraTool.jsx
- [x] LogisticGrowthExplorerTool.jsx
- [x] HollingTannerTool.jsx
- [x] SharkTunaTrajectoryTool.jsx
- [x] InsulinGlucoseTool.jsx (GridGraphDualY)
- [x] GlycolysisTool.jsx
- [x] LinearRegressionLogScalingTool.jsx
- [x] FitzHughNagumoTool.jsx
- [x] DiscreteLogisticExplorerTool.jsx
- [x] CaffeineMetabolismTool.jsx
- [x] HutchinsonGrowthTool.jsx
- [x] SimpleHarmonicOscillatorTool.jsx
- [x] MuscleTremorSimulatorTool.jsx
- [x] DynamicalSystemsCalculator.jsx
- [x] OneDimensionalCalculator.jsx
- [x] TrajectoryTimeSeriesPracticeTool.jsx
- [x] GentamicinDosageTool.jsx
- [x] RapidCoinFlipperTool.jsx (GridGraphDualY)

### No Migration Needed
- [ ] ComponentTestTool.jsx (test tool)
- [ ] VisualToolBuilder files

## Common Patterns

### Drawing gridlines

**Before:**
```jsx
xMinorTicks.forEach((tick) => {
  const x = paddingLeft + ((tick - xRange[0]) / (xRange[1] - xRange[0])) * plotWidth;
  ctx.beginPath();
  ctx.moveTo(x, paddingTop);
  ctx.lineTo(x, paddingTop + plotHeight);
  ctx.stroke();
});
```

**After:**
```jsx
xMinorTicks.forEach((tick) => {
  const pos = dataToPixel(tick, yMin);
  ctx.beginPath();
  ctx.moveTo(pos.x, 0);
  ctx.lineTo(pos.x, plotHeight);
  ctx.stroke();
});
```

### Drawing trajectories

**Before:**
```jsx
trajectory.forEach((point, i) => {
  const x = paddingLeft + (point.t / tMax) * plotWidth;
  const y = paddingTop + plotHeight - (point.value / yMax) * plotHeight;
  if (i === 0) ctx.moveTo(x, y);
  else ctx.lineTo(x, y);
});
```

**After:**
```jsx
trajectory.forEach((point, i) => {
  const pos = dataToPixel(point.t, point.value);
  if (i === 0) ctx.moveTo(pos.x, pos.y);
  else ctx.lineTo(pos.x, pos.y);
});
```

### Multiple canvases (static + dynamic layers)

```jsx
<GridGraph ...>
  {(transform) => {
    transformRef.current = transform;
    return (
      <>
        <canvas
          ref={staticCanvasRef}
          className="pointer-events-none"
          style={transform.plotStyle}
          width={transform.plotWidth}
          height={transform.plotHeight}
        />
        <canvas
          ref={dynamicCanvasRef}
          className="cursor-crosshair"
          style={transform.plotStyle}
          width={transform.plotWidth}
          height={transform.plotHeight}
          onClick={handleCanvasClick}
        />
      </>
    );
  }}
</GridGraph>
```

## Testing Checklist

After migrating a tool, verify:

1. [ ] Canvas content aligns with tick marks on both axes
2. [ ] Gridlines (if any) align with tick marks
3. [ ] Click interactions convert coordinates correctly
4. [ ] Animation/dynamics still work smoothly
5. [ ] Theme switching doesn't break alignment
6. [ ] Changing parameters that affect axis ranges works correctly
