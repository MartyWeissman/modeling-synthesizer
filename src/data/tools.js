// src/data/tools.js
// Centralized tool metadata for the Modeling Synthesizer

import InsulinGlucoseTool from "../tools/InsulinGlucoseTool";
import CaffeineMetabolismTool from "../tools/CaffeineMetabolismTool";
import GentamicinDosageTool from "../tools/GentamicinDosageTool";
import GlycolysisTool from "../tools/GlycolysisTool";
import HollingTannerTool from "../tools/HollingTannerTool";
import SharkTunaInteractionTool from "../tools/SharkTunaInteractionTool";
import SharkTunaTrajectoryTool from "../tools/SharkTunaTrajectoryTool";
import DynamicalSystemsCalculator from "../tools/DynamicalSystemsCalculator";
import ComponentTestTool from "../tools/ComponentTestTool";
import GridLabelTest from "../tools/GridLabelTest";
import VisualToolBuilder from "../tools/VisualToolBuilder";

/**
 * Complete tool definitions with all metadata
 * Single source of truth for tool information
 */
export const toolDefinitions = {
  "insulin-glucose": {
    name: "Insulin-Glucose Regulation",
    description:
      "Explore glucose homeostasis and insulin response dynamics with customizable parameters and meal challenges.",
    component: InsulinGlucoseTool,
    categories: {
      topics: ["physiology"],
      toolType: "simulation",
      lab: "lab1",
    },
    visibility: "student",
  },

  "caffeine-metabolism": {
    name: "Caffeine Metabolism",
    description:
      "Model exponential decay of caffeine in the bloodstream with multiple daily doses and adjustable metabolic rates.",
    component: CaffeineMetabolismTool,
    categories: {
      topics: ["physiology"],
      toolType: "simulation",
      lab: "lab1",
    },
    visibility: "student",
  },

  "gentamicin-dosage": {
    name: "Gentamicin Dosage Simulator",
    description:
      "Pharmacokinetic modeling of gentamicin antibiotic levels with dosing parameters, therapeutic ranges, and toxicity thresholds.",
    component: GentamicinDosageTool,
    categories: {
      topics: ["physiology"],
      toolType: "simulation",
      lab: "lab2",
    },
    visibility: "student",
  },

  glycolysis: {
    name: "Higgins-Sel'kov Glycolysis Model",
    description:
      "Interactive biochemical simulation of glycolytic oscillations with vector fields, nullclines, and metabolite trajectory analysis.",
    component: GlycolysisTool,
    categories: {
      topics: ["molecular"],
      toolType: "simulation",
      lab: "lab4",
    },
    visibility: "student",
  },

  "holling-tanner": {
    name: "Holling-Tanner Predator-Prey Model",
    description:
      "Advanced predator-prey dynamics with Holling Type II functional response, showing complex population interactions between sharks and tuna.",
    component: HollingTannerTool,
    categories: {
      topics: ["ecology"],
      toolType: "simulation",
      lab: "lab4",
    },
    visibility: "student",
  },

  "shark-tuna-interaction": {
    name: "Shark-Tuna Interactions",
    description:
      "Spatial predator-prey simulation showing real-time predation events in an ocean ecosystem.",
    component: SharkTunaInteractionTool,
    categories: {
      topics: ["ecology"],
      toolType: "explorer",
      lab: "lab1",
    },
    visibility: "student",
  },

  "shark-tuna-trajectory": {
    name: "Shark-Tuna Trajectories",
    description:
      "Phase space visualization of predator-prey dynamics with vector fields and trajectory plotting.",
    component: SharkTunaTrajectoryTool,
    categories: {
      topics: ["ecology"],
      toolType: "simulation",
      lab: "lab1",
    },
    visibility: "student",
  },

  "dynamical-systems-calculator": {
    name: "Dynamical Systems Calculator",
    description:
      "General-purpose calculator for exploring vector fields and particle trajectories with custom differential equations.",
    component: DynamicalSystemsCalculator,
    categories: {
      topics: [],
      toolType: "calculator",
      lab: ["lab1", "lab2", "lab3", "lab4"],
    },
    visibility: "student",
  },

  "component-test": {
    name: "Component Test",
    description: "Test individual grid components and their interactions.",
    component: ComponentTestTool,
    categories: {
      topics: [],
      toolType: "development",
      lab: null,
    },
    visibility: "dev",
  },

  "grid-label-test": {
    name: "Grid Label Test",
    description: "Typography and labeling system testing interface.",
    component: GridLabelTest,
    categories: {
      topics: [],
      toolType: "development",
      lab: null,
    },
    visibility: "dev",
  },

  "visual-tool-builder": {
    name: "Visual Tool Builder",
    description: "Drag-and-drop interface for creating new modeling tools.",
    component: VisualToolBuilder,
    categories: {
      topics: [],
      toolType: "development",
      lab: null,
    },
    visibility: "dev",
  },
};

/**
 * Category metadata - define available categories and their properties
 */
export const categoryMetadata = {
  topics: {
    ecology: { name: "Ecology", icon: "🌿" },
    evolution: { name: "Evolution", icon: "🧬" },
    physiology: { name: "Physiology", icon: "❤️" },
    molecular: { name: "Molecular Biology", icon: "🧪" },
    physical: { name: "Physical Science", icon: "⚛️" },
  },

  toolTypes: {
    simulation: { name: "Simulation", icon: "⚡" },
    explorer: { name: "Explorer", icon: "🔍" },
    calculator: { name: "Calculator", icon: "🧮" },
    study: { name: "Study Aide", icon: "📚" },
    development: { name: "Development", icon: "🔧" },
  },

  labs: {
    lab1: { name: "Lab 1", title: "Lab 1: Flow" },
    lab2: { name: "Lab 2", title: "Lab 2: Growth" },
    lab3: { name: "Lab 3", title: "Lab 3: Equilibrium" },
    lab4: { name: "Lab 4", title: "Lab 4: Oscillation" },
    lab5: { name: "Lab 5", title: "Lab 5: Randomness" },
    lab6: { name: "Lab 6", title: "Lab 6: Order" },
  },
};

/**
 * Helper functions to generate category structures dynamically
 */

export const generateTopicCategories = () => {
  const categories = {};

  // Initialize categories from metadata
  Object.entries(categoryMetadata.topics).forEach(([key, meta]) => {
    categories[key] = {
      ...meta,
      tools: [],
    };
  });

  // Populate tools into categories
  Object.entries(toolDefinitions).forEach(([toolId, tool]) => {
    tool.categories.topics.forEach((topic) => {
      if (categories[topic]) {
        categories[topic].tools.push(toolId);
      }
    });
  });

  return categories;
};

export const generateToolTypeCategories = () => {
  const categories = {};

  // Initialize categories from metadata
  Object.entries(categoryMetadata.toolTypes).forEach(([key, meta]) => {
    categories[key] = {
      ...meta,
      tools: [],
    };
  });

  // Populate tools into categories
  Object.entries(toolDefinitions).forEach(([toolId, tool]) => {
    const toolType = tool.categories.toolType;
    if (categories[toolType]) {
      categories[toolType].tools.push(toolId);
    }
  });

  return categories;
};

export const generateLabCategories = () => {
  const categories = {};

  // Initialize categories from metadata
  Object.entries(categoryMetadata.labs).forEach(([key, meta]) => {
    categories[key] = {
      ...meta,
      tools: [],
    };
  });

  // Populate tools into categories
  Object.entries(toolDefinitions).forEach(([toolId, tool]) => {
    // Handle both single 'lab' and multiple 'labs' properties
    const labs =
      tool.categories.labs ||
      (tool.categories.lab ? [tool.categories.lab] : []);
    labs.forEach((lab) => {
      if (categories[lab]) {
        categories[lab].tools.push(toolId);
      }
    });
  });

  return categories;
};

/**
 * Utility functions for tool filtering and access
 */

export const getToolsByVisibility = (visibility) => {
  return Object.entries(toolDefinitions)
    .filter(([, tool]) => {
      if (visibility === "dev") return true; // Dev mode shows all
      return tool.visibility === "student" || tool.visibility === "both";
    })
    .map(([id, tool]) => ({ id, ...tool }));
};

export const getToolById = (id) => {
  return toolDefinitions[id] || null;
};

export const getAllTools = () => {
  return Object.entries(toolDefinitions).map(([id, tool]) => ({ id, ...tool }));
};

/**
 * Search and filter utilities
 */

export const searchTools = (query, visibility = "student") => {
  const tools = getToolsByVisibility(visibility);
  const lowercaseQuery = query.toLowerCase();

  return tools.filter(
    (tool) =>
      tool.name.toLowerCase().includes(lowercaseQuery) ||
      tool.description.toLowerCase().includes(lowercaseQuery) ||
      tool.categories.topics.some((topic) =>
        topic.toLowerCase().includes(lowercaseQuery),
      ),
  );
};

export const getToolsByCategory = (
  categoryType,
  categoryValue,
  visibility = "student",
) => {
  const tools = getToolsByVisibility(visibility);

  return tools.filter((tool) => {
    switch (categoryType) {
      case "topic":
        return tool.categories.topics.includes(categoryValue);
      case "toolType":
        return tool.categories.toolType === categoryValue;
      case "lab":
        return tool.categories.lab === categoryValue;
      default:
        return false;
    }
  });
};
