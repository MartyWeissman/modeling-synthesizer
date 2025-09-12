// src/utils/layoutPlanner.js

/**
 * Layout Planning Utilities
 *
 * This file provides simple text-based layout planning tools that can be used
 * in comments to visualize and plan grid layouts before implementing them.
 */

/**
 * Generate a blank grid template for planning
 * @param {number} width - Grid width (default 10)
 * @param {number} height - Grid height (default 5)
 * @returns {string} - ASCII grid template
 */
export const blankGrid = (width = 10, height = 5) => {
  let result = '   ';
  for (let x = 0; x < width; x++) {
    result += String(x % 10);
  }
  result += '\n';

  for (let y = 0; y < height; y++) {
    result += String(y % 10).padStart(2) + ' ';
    for (let x = 0; x < width; x++) {
      result += '.';
    }
    result += '\n';
  }

  return result;
};

/**
 * Component layout planner - returns a template for planning
 */
export const layoutTemplate = `
/**
 * LAYOUT PLANNING TEMPLATE
 *
 * 1. Start with blank grid:
 *
 *    0123456789
 * 0  ..........
 * 1  ..........
 * 2  ..........
 * 3  ..........
 * 4  ..........
 *
 * 2. Mark your components with letters:
 *
 *    0123456789
 * 0  AABBCC....
 * 1  ..DDDDDD..
 * 2  ..DDDDDD..
 * 3  ..DDDDDD..
 * 4  ....EEE...
 *
 * 3. Define component array:
 */

const gridComponents = [
  { x: 0, y: 0, w: 2, h: 1, name: "Component A", type: "display" },    // A
  { x: 2, y: 0, w: 2, h: 1, name: "Component B", type: "input" },      // B
  { x: 4, y: 0, w: 2, h: 1, name: "Component C", type: "button" },     // C
  { x: 2, y: 1, w: 6, h: 3, name: "Main Graph", type: "graph" },       // D
  { x: 4, y: 4, w: 3, h: 1, name: "Controls", type: "slider" },        // E
];

/**
 * 4. Validate with debugging:
 */
const gridDebug = useGridDebug(gridComponents, 10, 5);
console.log(gridDebug.visualization);
`;

/**
 * Common layout patterns as templates
 */
export const layoutPatterns = {

  sidebar: `
/**
 * SIDEBAR LAYOUT PATTERN
 * Left controls + main display area
 *
 *    0123456789
 * 0  AABBBBBBBB
 * 1  CCBBBBBBBB
 * 2  DDBBBBBBBB
 * 3  EEBBBBBBBBB
 * 4  FFBBBBBBBB
 *
 * A,C,D,E,F = sidebar controls
 * B = main display/graph area
 */`,

  dashboard: `
/**
 * DASHBOARD LAYOUT PATTERN
 * Multiple display areas with controls
 *
 *    0123456789
 * 0  AABBCCCCCC
 * 1  DDEECCCCCC
 * 2  FFGGCCCCCC
 * 3  HHIICCCCCC
 * 4  ..JJCCCCCC
 *
 * A,B,D,E,F,G,H,I,J = various controls/displays
 * C = large main display
 */`,

  matrix: `
/**
 * MATRIX LAYOUT PATTERN
 * Grid of similar components
 *
 *    0123456789
 * 0  AABBCCDDEE
 * 1  AABBCCDDEE
 * 2  FFGGHHIIJJ
 * 3  FFGGHHIIJJ
 * 4  ..........
 *
 * Each letter = 2x2 component
 */`,

  flow: `
/**
 * FLOW LAYOUT PATTERN
 * Sequential process visualization
 *
 *    0123456789
 * 0  AA->BB->CC
 * 1  DDDDDDDDDD
 * 2  DDDDDDDDDD
 * 3  EEEE  FFFF
 * 4  EEEE  FFFF
 *
 * A,B,C = input/control sequence
 * D = main visualization
 * E,F = output displays
 */`,

  split: `
/**
 * SPLIT LAYOUT PATTERN
 * Two main areas side by side
 *
 *    0123456789
 * 0  AAAAABBBBB
 * 1  AAAAABBBBB
 * 2  AAAAABBBBB
 * 3  CCCCCDDDDD
 * 4  CCCCCDDDDD
 *
 * A,C = left panels
 * B,D = right panels
 */`
};

/**
 * Quick layout checker - paste your ASCII layout to validate
 * @param {string} asciiLayout - ASCII representation of layout
 * @returns {Object} - Analysis of the layout
 */
export const analyzeAsciiLayout = (asciiLayout) => {
  const lines = asciiLayout.trim().split('\n');
  const components = new Map();
  const grid = [];

  // Parse the ASCII layout
  for (let y = 0; y < lines.length; y++) {
    const line = lines[y];
    const row = [];

    for (let x = 0; x < line.length; x++) {
      const char = line[x];
      row.push(char);

      if (char !== '.' && char !== ' ' && char !== '-' && char !== '>') {
        if (!components.has(char)) {
          components.set(char, {
            char,
            positions: [],
            minX: Infinity,
            maxX: -Infinity,
            minY: Infinity,
            maxY: -Infinity
          });
        }

        const comp = components.get(char);
        comp.positions.push({ x, y });
        comp.minX = Math.min(comp.minX, x);
        comp.maxX = Math.max(comp.maxX, x);
        comp.minY = Math.min(comp.minY, y);
        comp.maxY = Math.max(comp.maxY, y);
      }
    }
    grid.push(row);
  }

  // Calculate component dimensions
  const componentList = [];
  for (const [char, comp] of components) {
    const w = comp.maxX - comp.minX + 1;
    const h = comp.maxY - comp.minY + 1;
    const expectedCells = w * h;
    const actualCells = comp.positions.length;

    componentList.push({
      char,
      x: comp.minX,
      y: comp.minY,
      w,
      h,
      expectedCells,
      actualCells,
      isRectangular: expectedCells === actualCells,
      area: actualCells
    });
  }

  // Analysis
  const totalCells = grid.length * (grid[0]?.length || 0);
  const occupiedCells = componentList.reduce((sum, comp) => sum + comp.area, 0);
  const utilization = (occupiedCells / totalCells) * 100;

  return {
    components: componentList,
    totalCells,
    occupiedCells,
    utilization: Math.round(utilization * 10) / 10,
    gridWidth: grid[0]?.length || 0,
    gridHeight: grid.length,
    hasNonRectangular: componentList.some(c => !c.isRectangular)
  };
};

/**
 * Convert ASCII layout to component array
 * @param {string} asciiLayout - ASCII grid layout
 * @returns {Array} - Array of component objects
 */
export const asciiToComponents = (asciiLayout) => {
  const analysis = analyzeAsciiLayout(asciiLayout);

  return analysis.components
    .filter(comp => comp.isRectangular)
    .map(comp => ({
      x: comp.x,
      y: comp.y,
      w: comp.w,
      h: comp.h,
      name: `Component ${comp.char}`,
      type: 'unknown'
    }));
};

/**
 * Layout planning workflow helper
 */
export const planningWorkflow = `
/**
 * GRID LAYOUT PLANNING WORKFLOW
 *
 * Step 1: Plan on paper or in comments
 * =====================================
 *
 *    0123456789
 * 0  AABBCC....
 * 1  ..DDDDDD..
 * 2  ..DDDDDD..
 * 3  ..DDDDDD..
 * 4  ....EEE...
 *
 * Step 2: Convert to component array
 * ==================================
 */
const gridComponents = [
  { x: 0, y: 0, w: 2, h: 1, name: "Input A", type: "input" },
  { x: 2, y: 0, w: 2, h: 1, name: "Button B", type: "button" },
  { x: 4, y: 0, w: 2, h: 1, name: "Display C", type: "display" },
  { x: 2, y: 1, w: 6, h: 3, name: "Main Graph", type: "graph" },
  { x: 4, y: 4, w: 3, h: 1, name: "Slider E", type: "slider" },
];

/**
 * Step 3: Validate layout
 * ========================
 */
const gridDebug = useGridDebug(gridComponents, 10, 5);
if (!gridDebug.isValid) {
  console.error('Layout errors:', gridDebug.errors);
  console.log(gridDebug.visualization);
}

/**
 * Step 4: Implement JSX components
 * =================================
 */
return (
  <ToolContainer title="My Tool">
    <GridInput x={0} y={0} w={2} />      {/* A */}
    <GridButton x={2} y={0} w={2}>B</GridButton>  {/* B */}
    <GridDisplay x={4} y={0} w={2} />    {/* C */}
    <GridGraph x={2} y={1} w={6} h={3} /> {/* D */}
    <GridSlider x={4} y={4} w={3} />     {/* E */}
  </ToolContainer>
);

/**
 * Step 5: Test and refine
 * ========================
 * - Enable visual debug overlay
 * - Check for overlaps and bounds issues
 * - Adjust spacing and sizing as needed
 * - Test on different screen sizes
 */
`;

/**
 * Grid math helpers for manual calculations
 */
export const gridMath = {

  // Check if component fits at position
  fitsAt: (x, y, w, h, canvasW = 10, canvasH = 5) => {
    return x >= 0 && y >= 0 && x + w <= canvasW && y + h <= canvasH;
  },

  // Calculate component bounds
  bounds: (x, y, w, h) => ({
    left: x,
    top: y,
    right: x + w - 1,
    bottom: y + h - 1,
    centerX: x + w / 2,
    centerY: y + h / 2
  }),

  // Check if two components overlap
  overlap: (x1, y1, w1, h1, x2, y2, w2, h2) => {
    return !(x1 + w1 <= x2 || x2 + w2 <= x1 || y1 + h1 <= y2 || y2 + h2 <= y1);
  },

  // Calculate distance between component centers
  distance: (x1, y1, w1, h1, x2, y2, w2, h2) => {
    const cx1 = x1 + w1 / 2;
    const cy1 = y1 + h1 / 2;
    const cx2 = x2 + w2 / 2;
    const cy2 = y2 + h2 / 2;
    return Math.sqrt(Math.pow(cx2 - cx1, 2) + Math.pow(cy2 - cy1, 2));
  },

  // Find next position to the right
  nextRight: (x, y, w, h, spacing = 0) => ({
    x: x + w + spacing,
    y: y
  }),

  // Find next position below
  nextBelow: (x, y, w, h, spacing = 0) => ({
    x: x,
    y: y + h + spacing
  })
};

export default {
  blankGrid,
  layoutTemplate,
  layoutPatterns,
  analyzeAsciiLayout,
  asciiToComponents,
  planningWorkflow,
  gridMath
};
