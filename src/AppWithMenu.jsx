// src/AppWithMenu.jsx
// App shell: tool menu, theme selector, and the currently open tool

import React, { useState, useEffect, Suspense } from "react";
import { ThemeProvider } from "./components/ui/ThemeProvider";
import { useTheme } from "./hooks/useTheme";
import ToolMenu from "./components/ui/ToolMenu";
import Footer from "./components/ui/Footer";

// Import centralized tool system
import { getToolsByVisibility, getToolById } from "./data/tools";

// Theme selector component
const ThemeSelector = () => {
  const { currentTheme, setCurrentTheme, themes } = useTheme();

  return (
    <div className="flex gap-2 items-center mb-6">
      <span
        className={`text-sm font-medium opacity-75 ${
          currentTheme === "dark" ? "text-gray-200" : ""
        }`}
      >
        Theme:
      </span>
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

// Read URL parameters once, synchronously, so the first render already has
// the right tool (no menu flash on direct links).
const readUrlState = () => {
  const urlParams = new URLSearchParams(window.location.search);
  return {
    toolId: urlParams.get("tool"),
    isDevMode: urlParams.get("dev") === "true",
  };
};

const MENU_TITLE =
  "Modeling Synthesizer - Interactive Mathematical Biology Simulations";

// Shown while a tool's code is being downloaded (each tool is its own chunk).
const ToolLoading = () => {
  const { theme } = useTheme();
  return (
    <div className="text-center py-12" role="status" aria-live="polite">
      <p className={`text-lg ${theme.text} opacity-75`}>Loading…</p>
    </div>
  );
};

// Catches a failed chunk download (e.g. offline, or a stale page after a new
// deploy) so the student sees a message instead of a blank page.
class ToolErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    console.error("Tool failed to load:", error);
  }

  render() {
    if (this.state.error) return this.props.fallback;
    return this.props.children;
  }
}

// Main App content
const AppContent = () => {
  const { theme, currentTheme } = useTheme();
  const [{ toolId: currentTool, isDevMode }] = useState(readUrlState);

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

  // Development tools open only with ?dev=true (or on the local dev server).
  const canOpenDevTools = isDevMode || import.meta.env.DEV;
  const currentToolDef = currentTool
    ? getToolById(currentTool, canOpenDevTools ? "dev" : "student")
    : null;
  const CurrentToolComponent = currentToolDef ? currentToolDef.component : null;

  // Browser tab title
  useEffect(() => {
    if (!currentTool) {
      document.title = MENU_TITLE;
    } else if (currentToolDef) {
      document.title = `${currentToolDef.name} – Modeling Synthesizer`;
    } else {
      document.title = "Tool not found – Modeling Synthesizer";
    }
  }, [currentTool, currentToolDef]);

  const secondaryButtonClass = `px-4 py-2 rounded-lg font-medium transition-all border ${
    currentTheme === "unicorn"
      ? "bg-pink-100 border-pink-300 text-pink-800 hover:bg-pink-200"
      : currentTheme === "dark"
        ? "bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600"
        : "bg-white border-gray-300 text-gray-700 hover:bg-gray-100"
  } shadow-sm hover:shadow-md`;

  const renderMessage = (heading, detail) => (
    <div className="text-center py-12">
      <p className={`text-lg ${theme.text} opacity-75 mb-2`}>{heading}</p>
      {detail && (
        <p className={`text-sm ${theme.text} opacity-60 mb-6`}>{detail}</p>
      )}
      <button onClick={handleBackToMenu} className={secondaryButtonClass}>
        ← Back to Tools
      </button>
    </div>
  );

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
                className={secondaryButtonClass}
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
            <ToolErrorBoundary
              fallback={renderMessage(
                "This tool couldn't be loaded.",
                "Check your internet connection and reload the page.",
              )}
            >
              <Suspense fallback={<ToolLoading />}>
                <CurrentToolComponent />
              </Suspense>
            </ToolErrorBoundary>
          </div>
        ) : (
          renderMessage(
            "Tool not found",
            `There is no tool called “${currentTool}”. It may have been renamed; pick it from the list of tools.`,
          )
        )}

        {/* Footer with license */}
        <Footer />

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
