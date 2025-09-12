// src/hooks/useGridDebug.js

import { useState, useEffect, useMemo } from 'react';
import {
  validateLayout,
  visualizeLayout,
  findOverlaps,
  debugLayout,
  COMPONENT_SIZES
} from '../utils/gridLayoutHelper';

/**
 * React hook for grid layout debugging and validation
 *
 * @param {Array} components - Array of grid components
 * @param {number} canvasWidth - Canvas width in grid units
 * @param {number} canvasHeight - Canvas height in grid units
 * @param {Object} options - Debug options
 * @returns {Object} Debug utilities and state
 */
export const useGridDebug = (
  components = [],
  canvasWidth = 10,
  canvasHeight = 5,
  options = {}
) => {
  const {
    enableAutoDebug = false,
    logToConsole = false,
    debugTitle = 'Grid Layout'
  } = options;

  // Debug overlay state
  const [debugVisible, setDebugVisible] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [showBounds, setShowBounds] = useState(true);
  const [showOverlaps, setShowOverlaps] = useState(true);
  const [showLabels, setShowLabels] = useState(true);

  // Memoized validation results
  const validation = useMemo(() => {
    return validateLayout(components, canvasWidth, canvasHeight);
  }, [components, canvasWidth, canvasHeight]);

  // Memoized overlaps
  const overlaps = useMemo(() => {
    return findOverlaps(components);
  }, [components]);

  // Memoized ASCII visualization
  const visualization = useMemo(() => {
    return visualizeLayout(components, canvasWidth, canvasHeight);
  }, [components, canvasWidth, canvasHeight]);

  // Auto-debug to console when enabled
  useEffect(() => {
    if (enableAutoDebug || logToConsole) {
      debugLayout(components, canvasWidth, canvasHeight, debugTitle);
    }
  }, [components, canvasWidth, canvasHeight, enableAutoDebug, logToConsole, debugTitle]);

  // Helper to create component definitions with validation
  const createComponent = (x, y, w = 1, h = 1, name = '', type = '') => {
    const component = { x, y, w, h, name, type };

    // Validate individual component
    if (x < 0 || y < 0) {
      console.warn(`Component "${name || type}" has negative position: ${x},${y}`);
    }
    if (x + w > canvasWidth || y + h > canvasHeight) {
      console.warn(`Component "${name || type}" exceeds canvas bounds: ${x + w - 1},${y + h - 1} (max: ${canvasWidth - 1},${canvasHeight - 1})`);
    }

    return component;
  };

  // Helper to create component with preset size
  const createPresetComponent = (x, y, type, name = '') => {
    const size = COMPONENT_SIZES[type] || { w: 1, h: 1 };
    return createComponent(x, y, size.w, size.h, name, type);
  };

  // Helper to validate a new component against existing ones
  const validateNewComponent = (newComponent) => {
    const testLayout = [...components, newComponent];
    return validateLayout(testLayout, canvasWidth, canvasHeight);
  };

  // Helper to find next available position
  const findAvailablePosition = (width, height) => {
    for (let y = 0; y <= canvasHeight - height; y++) {
      for (let x = 0; x <= canvasWidth - width; x++) {
        const testComponent = { x, y, w: width, h: height };
        const hasOverlap = components.some(comp => {
          return !(testComponent.x + testComponent.w <= comp.x ||
                   comp.x + comp.w <= testComponent.x ||
                   testComponent.y + testComponent.h <= comp.y ||
                   comp.y + comp.h <= testComponent.y);
        });

        if (!hasOverlap) {
          return { x, y };
        }
      }
    }
    return null;
  };

  // Layout analysis
  const analysis = useMemo(() => {
    const totalCells = canvasWidth * canvasHeight;
    const occupiedCells = components.reduce((sum, comp) => sum + (comp.w * comp.h), 0);
    const utilization = (occupiedCells / totalCells) * 100;

    return {
      totalCells,
      occupiedCells,
      emptyCells: totalCells - occupiedCells,
      utilization: Math.round(utilization * 10) / 10,
      componentCount: components.length,
      overlapCount: overlaps.length,
      hasErrors: !validation.valid,
      density: components.length / totalCells
    };
  }, [components, canvasWidth, canvasHeight, overlaps, validation]);

  // Debug overlay controls
  const debugControls = {
    visible: debugVisible,
    toggleVisible: () => setDebugVisible(!debugVisible),
    showGrid,
    toggleGrid: () => setShowGrid(!showGrid),
    showBounds,
    toggleBounds: () => setShowBounds(!showBounds),
    showOverlaps,
    toggleOverlaps: () => setShowOverlaps(!showOverlaps),
    showLabels,
    toggleLabels: () => setShowLabels(!showLabels)
  };

  // Quick layout presets
  const layoutPresets = {
    // Single column layout
    singleColumn: (componentTypes) => {
      return componentTypes.map((type, index) => {
        const size = COMPONENT_SIZES[type] || { w: 1, h: 1 };
        return createComponent(0, index * size.h, size.w, size.h, `${type}${index}`, type);
      });
    },

    // Grid layout (fills available space)
    grid: (componentTypes, columns = 3) => {
      return componentTypes.map((type, index) => {
        const size = COMPONENT_SIZES[type] || { w: 1, h: 1 };
        const col = (index % columns) * size.w;
        const row = Math.floor(index / columns) * size.h;
        return createComponent(col, row, size.w, size.h, `${type}${index}`, type);
      });
    },

    // Left panel + main area
    sidebar: (sidebarTypes, mainComponent) => {
      const sidebar = sidebarTypes.map((type, index) => {
        const size = COMPONENT_SIZES[type] || { w: 1, h: 1 };
        return createComponent(0, index * size.h, size.w, size.h, `${type}${index}`, type);
      });

      const sidebarWidth = Math.max(...sidebar.map(c => c.x + c.w));
      const mainSize = COMPONENT_SIZES[mainComponent.type] || { w: 4, h: 3 };
      const main = createComponent(
        sidebarWidth,
        0,
        canvasWidth - sidebarWidth,
        Math.min(mainSize.h, canvasHeight),
        mainComponent.name || 'main',
        mainComponent.type
      );

      return [...sidebar, main];
    }
  };

  // Console logging methods
  const log = {
    validation: () => console.table(validation),
    overlaps: () => console.table(overlaps),
    analysis: () => console.table(analysis),
    visualization: () => console.log(visualization),
    components: () => console.table(components),
    all: () => {
      console.group(`🔧 ${debugTitle} - Full Debug Report`);
      console.log('📊 Analysis:', analysis);
      console.log('✅ Validation:', validation);
      if (overlaps.length > 0) {
        console.log('❌ Overlaps:', overlaps);
      }
      console.log('📋 Layout:');
      console.log(visualization);
      console.groupEnd();
    }
  };

  return {
    // Validation results
    validation,
    isValid: validation.valid,
    errors: validation.errors,
    overlaps,
    analysis,
    visualization,

    // Debug controls
    debugControls,

    // Helper functions
    createComponent,
    createPresetComponent,
    validateNewComponent,
    findAvailablePosition,

    // Layout presets
    layoutPresets,

    // Console logging
    log,

    // Quick status
    hasOverlaps: overlaps.length > 0,
    utilization: analysis.utilization,
    componentCount: analysis.componentCount
  };
};

export default useGridDebug;
