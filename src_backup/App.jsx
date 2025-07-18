// src/App.jsx

import React, { useState } from 'react';
import { ThemeProvider, useTheme } from './components/ui/ThemeProvider';
import { CaffeineMetabolismTool } from './tools';

// Theme selector component
const ThemeSelector = () => {
  const { currentTheme, setCurrentTheme, themes } = useTheme();

  return (
    <div className="flex gap-2 items-center mb-4">
      <span className="text-sm font-medium">Theme:</span>
      {Object.keys(themes).map((themeKey) => (
        <button
          key={themeKey}
          className={`px-3 py-1 rounded text-sm font-medium transition-all border
            ${currentTheme === themeKey
              ? 'bg-blue-100 border-blue-400 text-blue-800'
              : 'bg-gray-50 border-gray-300 text-gray-800 hover:bg-gray-100'
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
            ${currentTool === tool.id
              ? 'bg-blue-500 border-blue-600 text-white'
              : 'bg-gray-50 border-gray-300 text-gray-800 hover:bg-gray-100'
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
  const [currentTool, setCurrentTool] = useState('caffeine');

  // Available tools registry
  const availableTools = [
    {
      id: 'caffeine',
      name: 'Caffeine Metabolism',
      component: CaffeineMetabolismTool
    }
    // Future tools can be added here:
    // {
    //   id: 'function-grapher',
    //   name: 'Function Grapher',
    //   component: FunctionGrapherTool
    // }
  ];

  const CurrentToolComponent = availableTools.find(tool => tool.id === currentTool)?.component || CaffeineMetabolismTool;

  return (
    <div className={`min-h-screen ${theme.bg}`}>
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className={`text-3xl font-bold ${theme.text} mb-4`}>
            Math Tools Suite
          </h1>

          {/* Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <ToolSelector
              currentTool={currentTool}
              setCurrentTool={setCurrentTool}
              availableTools={availableTools}
            />
            <ThemeSelector />
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
