// src/utils/gridLayoutHelper.js

/**
 * Grid Layout Helper Utilities
 *
 * This file provides utilities to help with grid-based component layout,
 * preventing overlaps and providing visual debugging tools.
 */

export const CELL_SIZE = 100;

/**
 * Convert data coordinates to pixel coordinates
 * This matches GridGraph's internal dataToPixel function
 * @param {number} value - Data value to convert
 * @param {[number, number]} range - Data range [min, max]
 * @param {[number, number]} pixelRange - Pixel range [min, max]
 * @returns {number} Pixel coordinate
 */
export const dataToPixel = (value, range, pixelRange) => {
  const [dataMin, dataMax] = range;
  const [pixelMin, pixelMax] = pixelRange;
  return (
    pixelMin + ((value - dataMin) / (dataMax - dataMin)) * (pixelMax - pixelMin)
  );
};

/**
 * Represents a component placement on the grid
 * @typedef {Object} GridComponent
 * @property {number} x - X position (grid units)
 * @property {number} y - Y position (grid units)
 * @property {number} w - Width (grid units)
 * @property {number} h - Height (grid units)
 * @property {string} [name] - Optional component name for debugging
 * @property {string} [type] - Optional component type
 */

/**
 * Creates a grid component definition
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} w - Width (default: 1)
 * @param {number} h - Height (default: 1)
 * @param {string} [name] - Component name
 * @param {string} [type] - Component type
 * @returns {GridComponent}
 */
export const createComponent = (x, y, w = 1, h = 1, name = "", type = "") => ({
  x,
  y,
  w,
  h,
  name,
  type,
});

/**
 * Checks if a component placement is within canvas bounds
 * @param {GridComponent} component - Component to check
 * @param {number} canvasWidth - Canvas width in grid units
 * @param {number} canvasHeight - Canvas height in grid units
 * @returns {boolean}
 */
export const isWithinBounds = (component, canvasWidth, canvasHeight) => {
  return (
    component.x >= 0 &&
    component.y >= 0 &&
    component.x + component.w <= canvasWidth &&
    component.y + component.h <= canvasHeight
  );
};

/**
 * Checks if two components overlap
 * @param {GridComponent} comp1
 * @param {GridComponent} comp2
 * @returns {boolean}
 */
export const componentsOverlap = (comp1, comp2) => {
  return !(
    comp1.x + comp1.w <= comp2.x ||
    comp2.x + comp2.w <= comp1.x ||
    comp1.y + comp1.h <= comp2.y ||
    comp2.y + comp2.h <= comp1.y
  );
};

/**
 * Finds all overlapping components in a layout
 * @param {GridComponent[]} components - Array of components
 * @returns {Array<{comp1: GridComponent, comp2: GridComponent}>}
 */
export const findOverlaps = (components) => {
  const overlaps = [];

  for (let i = 0; i < components.length; i++) {
    for (let j = i + 1; j < components.length; j++) {
      if (componentsOverlap(components[i], components[j])) {
        overlaps.push({
          comp1: components[i],
          comp2: components[j],
        });
      }
    }
  }

  return overlaps;
};

/**
 * Validates an entire layout
 * @param {GridComponent[]} components - Components to validate
 * @param {number} canvasWidth - Canvas width
 * @param {number} canvasHeight - Canvas height
 * @returns {{valid: boolean, errors: string[]}}
 */
export const validateLayout = (components, canvasWidth, canvasHeight) => {
  const errors = [];

  // Check bounds
  components.forEach((comp, i) => {
    if (!isWithinBounds(comp, canvasWidth, canvasHeight)) {
      errors.push(
        `Component ${i} (${comp.name || comp.type || "unnamed"}) is out of bounds: ${comp.x},${comp.y} ${comp.w}x${comp.h}`,
      );
    }
  });

  // Check overlaps
  const overlaps = findOverlaps(components);
  overlaps.forEach(({ comp1, comp2 }) => {
    const name1 = comp1.name || comp1.type || "unnamed";
    const name2 = comp2.name || comp2.type || "unnamed";
    errors.push(
      `Overlap detected between "${name1}" at ${comp1.x},${comp1.y} and "${name2}" at ${comp2.x},${comp2.y}`,
    );
  });

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Creates a visual ASCII representation of the grid layout
 * @param {GridComponent[]} components - Components to visualize
 * @param {number} canvasWidth - Canvas width
 * @param {number} canvasHeight - Canvas height
 * @returns {string}
 */
export const visualizeLayout = (components, canvasWidth, canvasHeight) => {
  // Create empty grid
  const grid = Array(canvasHeight)
    .fill(null)
    .map(() => Array(canvasWidth).fill("."));

  // Place components on grid
  components.forEach((comp, index) => {
    const char =
      index < 26
        ? String.fromCharCode(65 + index)
        : String.fromCharCode(97 + (index - 26));

    for (let y = comp.y; y < comp.y + comp.h && y < canvasHeight; y++) {
      for (let x = comp.x; x < comp.x + comp.w && x < canvasWidth; x++) {
        if (y >= 0 && x >= 0) {
          // Mark overlaps with 'X'
          if (grid[y][x] !== ".") {
            grid[y][x] = "X";
          } else {
            grid[y][x] = char;
          }
        }
      }
    }
  });

  // Convert to string with coordinates
  let result = "   ";
  for (let x = 0; x < canvasWidth; x++) {
    result += String(x % 10);
  }
  result += "\n";

  for (let y = 0; y < canvasHeight; y++) {
    result += String(y % 10).padStart(2) + " " + grid[y].join("") + "\n";
  }

  // Add legend
  result += "\nLegend:\n";
  result += ". = empty\n";
  result += "X = overlap\n";
  components.forEach((comp, index) => {
    const char =
      index < 26
        ? String.fromCharCode(65 + index)
        : String.fromCharCode(97 + (index - 26));
    const name = comp.name || comp.type || "unnamed";
    result += `${char} = ${name} (${comp.x},${comp.y} ${comp.w}x${comp.h})\n`;
  });

  return result;
};

/**
 * Finds the next available position for a component
 * @param {GridComponent[]} existingComponents - Already placed components
 * @param {number} width - Desired component width
 * @param {number} height - Desired component height
 * @param {number} canvasWidth - Canvas width
 * @param {number} canvasHeight - Canvas height
 * @param {boolean} [rowFirst=true] - Search row-first vs column-first
 * @returns {{x: number, y: number} | null}
 */
export const findNextAvailablePosition = (
  existingComponents,
  width,
  height,
  canvasWidth,
  canvasHeight,
  rowFirst = true,
) => {
  const testComponent = { w: width, h: height, name: "test" };

  if (rowFirst) {
    // Search row by row
    for (let y = 0; y <= canvasHeight - height; y++) {
      for (let x = 0; x <= canvasWidth - width; x++) {
        testComponent.x = x;
        testComponent.y = y;

        if (isWithinBounds(testComponent, canvasWidth, canvasHeight)) {
          const hasOverlap = existingComponents.some((comp) =>
            componentsOverlap(testComponent, comp),
          );
          if (!hasOverlap) {
            return { x, y };
          }
        }
      }
    }
  } else {
    // Search column by column
    for (let x = 0; x <= canvasWidth - width; x++) {
      for (let y = 0; y <= canvasHeight - height; y++) {
        testComponent.x = x;
        testComponent.y = y;

        if (isWithinBounds(testComponent, canvasWidth, canvasHeight)) {
          const hasOverlap = existingComponents.some((comp) =>
            componentsOverlap(testComponent, comp),
          );
          if (!hasOverlap) {
            return { x, y };
          }
        }
      }
    }
  }

  return null; // No space available
};

/**
 * Auto-layout components in a reasonable arrangement
 * @param {GridComponent[]} components - Components to layout (will be modified)
 * @param {number} canvasWidth - Canvas width
 * @param {number} canvasHeight - Canvas height
 * @param {Object} options - Layout options
 * @param {boolean} [options.rowFirst=true] - Layout row-first vs column-first
 * @param {number} [options.padding=0] - Padding between components
 * @returns {{success: boolean, arranged: GridComponent[], failed: GridComponent[]}}
 */
export const autoLayout = (
  components,
  canvasWidth,
  canvasHeight,
  options = {},
) => {
  const { rowFirst = true, padding = 0 } = options;
  const arranged = [];
  const failed = [];

  // Sort by size (largest first) for better packing
  const sortedComponents = [...components].sort((a, b) => {
    return b.w * b.h - a.w * a.h;
  });

  sortedComponents.forEach((comp) => {
    const position = findNextAvailablePosition(
      arranged,
      comp.w + padding * 2,
      comp.h + padding * 2,
      canvasWidth,
      canvasHeight,
      rowFirst,
    );

    if (position) {
      arranged.push({
        ...comp,
        x: position.x + padding,
        y: position.y + padding,
      });
    } else {
      failed.push(comp);
    }
  });

  return {
    success: failed.length === 0,
    arranged,
    failed,
  };
};

/**
 * Common component size presets
 */
export const COMPONENT_SIZES = {
  button: { w: 1, h: 1 },
  knob: { w: 1, h: 1 },
  slider: { w: 1, h: 3 },
  sliderHorizontal: { w: 3, h: 1 },
  display: { w: 2, h: 1 },
  input: { w: 2, h: 1 },
  label: { w: 2, h: 1 },
  graph: { w: 4, h: 3 },
  graphLarge: { w: 6, h: 4 },
  timePicker: { w: 1, h: 1 },
  staircase: { w: 1, h: 1 },
  screen: { w: 3, h: 2 },
  window: { w: 4, h: 4 },
};

/**
 * Layout helper class for fluent interface
 */
export class LayoutBuilder {
  constructor(canvasWidth = 10, canvasHeight = 5) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.components = [];
  }

  /**
   * Add a component to the layout
   */
  add(x, y, w = 1, h = 1, name = "", type = "") {
    this.components.push(createComponent(x, y, w, h, name, type));
    return this;
  }

  /**
   * Add a component with preset size
   */
  addPreset(x, y, type, name = "") {
    const size = COMPONENT_SIZES[type] || { w: 1, h: 1 };
    this.components.push(createComponent(x, y, size.w, size.h, name, type));
    return this;
  }

  /**
   * Validate the current layout
   */
  validate() {
    return validateLayout(this.components, this.canvasWidth, this.canvasHeight);
  }

  /**
   * Get ASCII visualization
   */
  visualize() {
    return visualizeLayout(
      this.components,
      this.canvasWidth,
      this.canvasHeight,
    );
  }

  /**
   * Get the components array
   */
  build() {
    return this.components;
  }

  /**
   * Auto-arrange components
   */
  autoArrange(options = {}) {
    const result = autoLayout(
      this.components,
      this.canvasWidth,
      this.canvasHeight,
      options,
    );
    this.components = result.arranged;
    return result;
  }
}

/**
 * Quick layout validation function for development
 * Logs results to console for easy debugging
 */
export const debugLayout = (
  components,
  canvasWidth,
  canvasHeight,
  title = "Layout",
) => {
  console.group(`🔧 ${title} Debug`);

  const validation = validateLayout(components, canvasWidth, canvasHeight);

  if (validation.valid) {
    console.log("✅ Layout is valid!");
  } else {
    console.error("❌ Layout has errors:");
    validation.errors.forEach((error) => console.error("  -", error));
  }

  console.log("\n📋 Layout visualization:");
  console.log(visualizeLayout(components, canvasWidth, canvasHeight));

  console.groupEnd();

  return validation;
};

export default {
  dataToPixel,
  createComponent,
  isWithinBounds,
  componentsOverlap,
  findOverlaps,
  validateLayout,
  visualizeLayout,
  findNextAvailablePosition,
  autoLayout,
  COMPONENT_SIZES,
  LayoutBuilder,
  debugLayout,
  CELL_SIZE,
};
