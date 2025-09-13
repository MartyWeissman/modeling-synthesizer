// src/AppWithMenu.jsx
// Alternative App component with clean tool menu instead of cards

import React, { useState, useEffect } from "react";
import { ThemeProvider } from "./components/ui/ThemeProvider";
import { useTheme } from "./hooks/useTheme";
import ToolMenu from "./components/ui/ToolMenu";

// Import centralized tool system
import { getToolsByVisibility, getToolById } from "./data/tools";

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
          onClick={() => {
            const urlParams = new URLSearchParams(window.location.search);
            urlParams.set("theme", themeKey);
            window.history.replaceState(
              {},
              "",
              `${window.location.pathname}?${urlParams.toString()}`,
            );
            setCurrentTheme(themeKey);
          }}
        >
          {themeKey.charAt(0).toUpperCase() + themeKey.slice(1)}
        </button>
      ))}
    </div>
  );
};

// Main App content
const AppContent = () => {
  const { theme, currentTheme, themes, setCurrentTheme } = useTheme();
  const [currentTool, setCurrentTool] = useState(null);
  const [isDevMode, setIsDevMode] = useState(false);

  // Read URL parameters for tool selection, theme, and dev mode
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    setCurrentTool(urlParams.get("tool"));
    setIsDevMode(urlParams.get("dev") === "true");

    // Set theme from URL if provided
    const urlTheme = urlParams.get("theme");
    if (urlTheme && themes[urlTheme]) {
      setCurrentTheme(urlTheme);
    }
  }, [themes, setCurrentTheme]);

  // Handle tool selection by updating URL
  const handleToolSelect = (toolId) => {
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.set("tool", toolId);
    window.location.search = urlParams.toString();
  };

  // Handle back to menu by removing tool parameter
  const handleBackToMenu = () => {
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.delete("tool");
    window.location.search = urlParams.toString();
  };

  // Get tools from centralized metadata system
  const availableTools = getToolsByVisibility(isDevMode ? "dev" : "student");

  // Get current tool component
  const getCurrentToolComponent = () => {
    const tool = getToolById(currentTool);
    return tool ? tool.component : null;
  };

  const CurrentToolComponent = getCurrentToolComponent();

  return (
    <div
      className="min-h-screen transition-all duration-300"
      style={{
        background:
          currentTheme === "unicorn"
            ? "linear-gradient(135deg, #fef7ff 0%, #fce7f3 50%, #f3e8ff 100%)"
            : currentTheme === "dark"
              ? "linear-gradient(135deg, #111827 0%, #1f2937 50%, #374151 100%)"
              : "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)",
      }}
    >
      <div className="container mx-auto px-4 py-8">
        {/* Header with theme selector */}
        <div className="flex justify-between items-center mb-8">
          <div>
            {currentTool && (
              <button
                onClick={handleBackToMenu}
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
            onToolSelect={handleToolSelect}
            availableTools={availableTools}
            currentTool={currentTool}
          />
        ) : CurrentToolComponent ? (
          <div className="flex justify-center">
            <CurrentToolComponent />
          </div>
        ) : (
          <div className="text-center py-12">
            <p className={`text-lg ${theme.text} opacity-75`}>Tool not found</p>
          </div>
        )}

        {/* Dev mode indicator */}
        {isDevMode && (
          <div className="fixed bottom-4 right-4">
            <div
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                currentTheme === "unicorn"
                  ? "bg-pink-200 text-pink-800"
                  : currentTheme === "dark"
                    ? "bg-gray-700 text-gray-300"
                    : "bg-gray-200 text-gray-700"
              }`}
            >
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
