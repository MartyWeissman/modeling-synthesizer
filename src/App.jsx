// src/App.jsx

import React, { useState, useEffect } from "react";
import { ThemeProvider } from "./components/ui/ThemeProvider";
import { useTheme } from "./hooks/useTheme";
import ToolMenu from "./components/ui/ToolMenu";
import { getToolsByVisibility, getToolById } from "./data/tools";

// Theme selector component
const ThemeSelector = () => {
  const { currentTheme, setCurrentTheme, themes } = useTheme();

  return (
    <div className="flex gap-2 items-center mb-4">
      {Object.keys(themes).map((themeKey) => (
        <button
          key={themeKey}
          className={`px-3 py-1 rounded text-sm font-medium transition-all border
            ${
              currentTheme === themeKey
                ? "bg-blue-100 border-blue-400 text-blue-800"
                : "bg-gray-50 border-gray-300 text-gray-800 hover:bg-gray-100"
            }`}
          onClick={() => setCurrentTheme(themeKey)}
        >
          {themeKey.charAt(0).toUpperCase() + themeKey.slice(1)}
        </button>
      ))}
    </div>
  );
};

// Tool selector component
const ToolSelector = ({ currentTool, setCurrentTool, availableTools }) => {
  return (
    <div className="flex gap-2 items-center mb-6">
      <span className="text-sm font-medium">Tool:</span>
      {availableTools.map((tool) => (
        <button
          key={tool.id}
          className={`px-4 py-2 rounded font-medium transition-all border
            ${
              currentTool === tool.id
                ? "bg-blue-500 border-blue-600 text-white"
                : "bg-gray-50 border-gray-300 text-gray-800 hover:bg-gray-100"
            }`}
          onClick={() => setCurrentTool(tool.id)}
        >
          {tool.name}
        </button>
      ))}
    </div>
  );
};

// Main app content
const AppContent = () => {
  const { theme } = useTheme();
  const [currentTool, setCurrentTool] = useState("caffeine");
  const [devMode, setDevMode] = useState(false);

  // Check for dev mode on component mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    setDevMode(urlParams.get("dev") === "true");
  }, []);

  // Student-facing tools
  const studentTools = [
    {
      id: "caffeine",
      name: "Caffeine Metabolism",
      component: CaffeineMetabolismTool,
    },
    {
      id: "shark-tuna",
      name: "Shark-Tuna Interactions",
      component: SharkTunaInteractionTool,
    },
    {
      id: "shark-tuna-trajectory",
      name: "Shark-Tuna Trajectories",
      component: SharkTunaTrajectoryTool,
    },
    {
      id: "insulin-glucose",
      name: "Insulin-Glucose Regulation",
      component: InsulinGlucoseTool,
    },
  ];

  // Development tools
  const devTools = [
    {
      id: "test",
      name: "Component Test",
      component: ComponentTestTool,
    },
    {
      id: "label-test",
      name: "GridLabel Test",
      component: GridLabelTest,
    },
    {
      id: "builder",
      name: "Visual Tool Builder",
      component: VisualToolBuilder,
    },
  ];

  // Select available tools based on mode
  const availableTools = devMode
    ? [...studentTools, ...devTools]
    : studentTools;

  // Future tools can be added here:
  // {
  //   id: 'function-grapher',
  //   name: 'Function Grapher',
  //   component: FunctionGrapherTool
  // }

  const CurrentToolComponent =
    availableTools.find((tool) => tool.id === currentTool)?.component ||
    CaffeineMetabolismTool;

  return (
    <div className={`min-h-screen ${theme.bg}`}>
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className={`text-3xl font-bold ${theme.text}`}>
              Modeling Synthesizer{" "}
              {devMode && (
                <span className="text-sm font-normal opacity-60">
                  (Dev Mode)
                </span>
              )}
            </h1>
            <div className="flex items-center gap-4">
              <ThemeSelector />
              {devMode && (
                <a
                  href="?"
                  className="text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  Student View
                </a>
              )}
              {!devMode && (
                <a
                  href="?dev=true"
                  className="text-xs text-gray-300 hover:text-gray-500 no-underline opacity-50 hover:opacity-100 transition-opacity"
                  title="Development tools for building new modeling tools"
                >
                  dev
                </a>
              )}
            </div>
          </div>

          {/* Tool Selection */}
          <div className="flex justify-center">
            <ToolSelector
              currentTool={currentTool}
              setCurrentTool={setCurrentTool}
              availableTools={availableTools}
            />
          </div>
        </div>

        {/* Current Tool */}
        <div className="flex justify-center">
          <CurrentToolComponent />
        </div>
      </div>
    </div>
  );
};

// Main App component with ThemeProvider wrapper
const App = () => {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
};

export default App;
