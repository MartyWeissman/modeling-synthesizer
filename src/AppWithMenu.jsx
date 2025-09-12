// src/AppWithMenu.jsx
// Alternative App component with clean tool menu instead of cards

import React, { useState, useEffect } from "react";
import { ThemeProvider } from "./components/ui/ThemeProvider";
import { useTheme } from "./hooks/useTheme";
import ToolMenu from "./components/ui/ToolMenu";

// Import tools
import { CaffeineMetabolismTool } from "./tools";
import { ComponentTestTool } from "./tools";
import { GridLabelTest } from "./tools";
import { SharkTunaInteractionTool } from "./tools";
import { SharkTunaTrajectoryTool } from "./tools";
import { InsulinGlucoseTool } from "./tools";
import VisualToolBuilder from "./tools/VisualToolBuilder";

// Theme selector component
const ThemeSelector = () => {
  const { currentTheme, setCurrentTheme, themes } = useTheme();

  return (
    <div className="flex gap-2 items-center mb-6">
      <span className="text-sm font-medium opacity-75">Theme:</span>
      {Object.keys(themes).map((themeKey) => (
        <button
          key={themeKey}
          className={`px-3 py-1 rounded-lg text-sm font-medium transition-all border ${
            currentTheme === themeKey
              ? currentTheme === "unicorn"
                ? "bg-pink-200 border-pink-400 text-pink-800"
                : currentTheme === "dark"
                  ? "bg-gray-600 border-gray-500 text-white"
                  : "bg-blue-100 border-blue-400 text-blue-800"
              : currentTheme === "unicorn"
                ? "bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100"
                : currentTheme === "dark"
                  ? "bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"
                  : "bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100"
          }`}
          onClick={() => setCurrentTheme(themeKey)}
        >
          {themeKey.charAt(0).toUpperCase() + themeKey.slice(1)}
        </button>
      ))}
    </div>
  );
};

// Main App content
const AppContent = () => {
  const { theme, currentTheme } = useTheme();
  const [currentTool, setCurrentTool] = useState(null);
  const [isDevMode, setIsDevMode] = useState(false);

  // Check for dev mode in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    setIsDevMode(urlParams.get("dev") === "true");
  }, []);

  // Available tools with metadata
  const availableTools = [
    {
      id: "insulin-glucose",
      name: "Insulin-Glucose Regulation",
      description: "Explore glucose homeostasis and insulin response dynamics with customizable parameters and meal challenges.",
      component: InsulinGlucoseTool,
      studentTool: true,
    },
    {
      id: "caffeine-metabolism",
      name: "Caffeine Metabolism",
      description: "Model exponential decay of caffeine in the bloodstream with multiple daily doses and adjustable metabolic rates.",
      component: CaffeineMetabolismTool,
      studentTool: true,
    },
    {
      id: "shark-tuna-interaction",
      name: "Shark-Tuna Interactions",
      description: "Spatial predator-prey simulation showing real-time predation events in an ocean ecosystem.",
      component: SharkTunaInteractionTool,
      studentTool: true,
    },
    {
      id: "shark-tuna-trajectory",
      name: "Shark-Tuna Trajectories",
      description: "Phase space visualization of predator-prey dynamics with vector fields and trajectory plotting.",
      component: SharkTunaTrajectoryTool,
      studentTool: true,
    },
    {
      id: "component-test",
      name: "Component Test",
      description: "Test individual grid components and their interactions.",
      component: ComponentTestTool,
      studentTool: false,
      devTool: true,
    },
    {
      id: "grid-label-test",
      name: "Grid Label Test",
      description: "Typography and labeling system testing interface.",
      component: GridLabelTest,
      studentTool: false,
      devTool: true,
    },
    {
      id: "visual-tool-builder",
      name: "Visual Tool Builder",
      description: "Drag-and-drop interface for creating new modeling tools.",
      component: VisualToolBuilder,
      studentTool: false,
      devTool: true,
    },
  ];

  // Filter tools based on dev mode
  const filteredTools = availableTools.filter((tool) => {
    if (isDevMode) return true; // Show all tools in dev mode
    return tool.studentTool; // Only show student tools in normal mode
  });

  // Get current tool component
  const getCurrentToolComponent = () => {
    const tool = availableTools.find((t) => t.id === currentTool);
    return tool ? tool.component : null;
  };

  const CurrentToolComponent = getCurrentToolComponent();

  return (
    <div
      className="min-h-screen transition-all duration-300"
      style={{
        background: currentTheme === "unicorn"
          ? "linear-gradient(135deg, #fef7ff 0%, #fce7f3 50%, #f3e8ff 100%)"
          : currentTheme === "dark"
            ? "linear-gradient(135deg, #111827 0%, #1f2937 50%, #374151 100%)"
            : "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)"
      }}
    >
      <div className="container mx-auto px-4 py-8">
        {/* Header with theme selector */}
        <div className="flex justify-between items-center mb-8">
          <div>
            {currentTool && (
              <button
                onClick={() => setCurrentTool(null)}
                className={`px-4 py-2 rounded-lg font-medium transition-all border ${
                  currentTheme === "unicorn"
                    ? "bg-pink-100 border-pink-300 text-pink-800 hover:bg-pink-200"
                    : currentTheme === "dark"
                      ? "bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600"
                      : "bg-white border-gray-300 text-gray-700 hover:bg-gray-100"
                } shadow-sm hover:shadow-md`}
              >
                ← Back to Tools
              </button>
            )}
          </div>
          <ThemeSelector />
        </div>

        {/* Main content */}
        {!currentTool ? (
          <ToolMenu
            onToolSelect={setCurrentTool}
            availableTools={filteredTools}
            currentTool={currentTool}
          />
        ) : CurrentToolComponent ? (
          <div className="flex justify-center">
            <CurrentToolComponent />
          </div>
        ) : (
          <div className="text-center py-12">
            <p className={`text-lg ${theme.text} opacity-75`}>
              Tool not found
            </p>
          </div>
        )}

        {/* Dev mode indicator */}
        {isDevMode && (
          <div className="fixed bottom-4 right-4">
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
              currentTheme === "unicorn"
                ? "bg-pink-200 text-pink-800"
                : currentTheme === "dark"
                  ? "bg-gray-700 text-gray-300"
                  : "bg-gray-200 text-gray-700"
            }`}>
              Dev Mode
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Main App component
const AppWithMenu = () => {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
};

export default AppWithMenu;
