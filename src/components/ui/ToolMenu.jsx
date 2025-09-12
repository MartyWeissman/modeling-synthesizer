// src/components/ui/ToolMenu.jsx

import React, { useState } from "react";
import { useTheme } from "../../hooks/useTheme";

const ToolMenu = ({ onToolSelect, availableTools, currentTool }) => {
  const { theme, currentTheme } = useTheme();
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Biology-focused topic categories
  const topicCategories = {
    ecology: {
      name: "Ecology",
      icon: "🌿",
      tools: ["shark-tuna-interaction", "shark-tuna-trajectory"],
    },
    evolution: {
      name: "Evolution",
      icon: "🧬",
      tools: [],
    },
    physiology: {
      name: "Physiology",
      icon: "❤️",
      tools: ["insulin-glucose", "caffeine-metabolism"],
    },
    molecular: {
      name: "Molecular Biology",
      icon: "🧪",
      tools: [],
    },
    physical: {
      name: "Physical Science",
      icon: "⚛️",
      tools: [],
    },
    explorers: {
      name: "Explorers",
      icon: "🔍",
      tools: [],
    },
    calculators: {
      name: "Calculators",
      icon: "🧮",
      tools: [],
    },
    study: {
      name: "Study Tools",
      icon: "📚",
      tools: ["component-test", "grid-label-test"],
    },
    development: {
      name: "Development",
      icon: "🔧",
      tools: ["visual-tool-builder"],
    },
  };

  // Lab manual organization
  const labCategories = {
    lab1: {
      name: "Lab 1",
      tools: [
        "insulin-glucose",
        "caffeine-metabolism",
        "shark-tuna-interaction",
        "shark-tuna-trajectory",
      ],
    },
    lab2: { name: "Lab 2", tools: [] },
    lab3: { name: "Lab 3", tools: [] },
    lab4: { name: "Lab 4", tools: [] },
    lab5: { name: "Lab 5", tools: [] },
    lab6: { name: "Lab 6", tools: [] },
  };

  const topicKeys = ["all", ...Object.keys(topicCategories)];
  const labKeys = Object.keys(labCategories);

  const getFilteredTools = () => {
    if (selectedCategory === "all") return availableTools;

    // Check if it's a lab category
    if (labCategories[selectedCategory]) {
      const labTools = labCategories[selectedCategory].tools || [];
      return availableTools.filter((tool) => labTools.includes(tool.id));
    }

    // Otherwise it's a topic category
    const categoryTools = topicCategories[selectedCategory]?.tools || [];
    return availableTools.filter((tool) => categoryTools.includes(tool.id));
  };

  const getCategoryForTool = (toolId) => {
    // Check topic categories
    for (const [categoryKey, categoryData] of Object.entries(topicCategories)) {
      if (categoryData.tools.includes(toolId)) {
        return { type: "topic", key: categoryKey, data: categoryData };
      }
    }

    // Check lab categories
    for (const [labKey, labData] of Object.entries(labCategories)) {
      if (labData.tools.includes(toolId)) {
        return { type: "lab", key: labKey, data: labData };
      }
    }

    return null;
  };

  const filteredTools = getFilteredTools();

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1
          className={`text-4xl font-bold ${theme.text} mb-2`}
          style={{ fontFamily: "'Dancing Script', cursive" }}
        >
          Mathematical Biology Lab
        </h1>
        <p className={`text-lg ${theme.text} opacity-75`}>
          Interactive modeling tools for life sciences students
        </p>
      </div>

      {/* Lab Manual Categories */}
      <div className="mb-6">
        <h3
          className={`text-lg font-medium ${theme.text} mb-3 text-center opacity-75`}
        >
          Lab Manual
        </h3>
        <div className="flex flex-wrap justify-center gap-2 mb-4">
          {labKeys.map((labKey) => (
            <button
              key={labKey}
              onClick={() => setSelectedCategory(labKey)}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 border ${
                selectedCategory === labKey
                  ? currentTheme === "unicorn"
                    ? "bg-pink-100 border-pink-400 text-pink-800 shadow-md"
                    : currentTheme === "dark"
                      ? "bg-blue-600 border-blue-500 text-white shadow-md"
                      : "bg-blue-100 border-blue-400 text-blue-800 shadow-md"
                  : currentTheme === "unicorn"
                    ? "bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100"
                    : currentTheme === "dark"
                      ? "bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600"
                      : "bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100"
              }`}
            >
              {labCategories[labKey].name}
            </button>
          ))}
        </div>
      </div>

      {/* Topic Categories */}
      <div className="mb-8">
        <h3
          className={`text-lg font-medium ${theme.text} mb-3 text-center opacity-75`}
        >
          By Topic
        </h3>
        <div className="flex flex-wrap justify-center gap-2">
          {topicKeys.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 border ${
                selectedCategory === category
                  ? currentTheme === "unicorn"
                    ? "bg-pink-100 border-pink-400 text-pink-800 shadow-md"
                    : currentTheme === "dark"
                      ? "bg-blue-600 border-blue-500 text-white shadow-md"
                      : "bg-blue-100 border-blue-400 text-blue-800 shadow-md"
                  : currentTheme === "unicorn"
                    ? "bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100"
                    : currentTheme === "dark"
                      ? "bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600"
                      : "bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100"
              }`}
            >
              {category === "all" ? (
                "All Tools"
              ) : (
                <>
                  <span className="mr-2">{topicCategories[category].icon}</span>
                  {topicCategories[category].name}
                </>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTools.map((tool) => {
          const categoryInfo = getCategoryForTool(tool.id);

          return (
            <button
              key={tool.id}
              onClick={() => onToolSelect(tool.id)}
              className={`group p-6 rounded-xl text-left transition-all duration-200 border-2 ${
                currentTool === tool.id
                  ? currentTheme === "unicorn"
                    ? "bg-pink-50 border-pink-300 shadow-lg transform scale-105"
                    : currentTheme === "dark"
                      ? "bg-blue-900 border-blue-400 shadow-lg transform scale-105"
                      : "bg-blue-50 border-blue-300 shadow-lg transform scale-105"
                  : currentTheme === "unicorn"
                    ? "bg-purple-25 border-purple-200 hover:border-pink-300 hover:shadow-md hover:transform hover:scale-102"
                    : currentTheme === "dark"
                      ? "bg-gray-800 border-gray-600 hover:border-gray-400 hover:shadow-md hover:transform hover:scale-102"
                      : "bg-white border-gray-200 hover:border-gray-300 hover:shadow-md hover:transform hover:scale-102"
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className={`text-lg font-semibold ${theme.text}`}>
                  {tool.name}
                </h3>
                {categoryInfo && categoryInfo.type === "topic" && (
                  <span className="text-2xl opacity-60">
                    {categoryInfo.data.icon}
                  </span>
                )}
              </div>

              <p className={`text-sm ${theme.text} opacity-75 mb-4`}>
                {tool.description ||
                  "Interactive modeling tool for biological exploration"}
              </p>

              <div className="flex flex-wrap gap-2">
                {categoryInfo && categoryInfo.type === "topic" && (
                  <div
                    className={`text-xs px-2 py-1 rounded-full ${
                      currentTheme === "unicorn"
                        ? "bg-pink-100 text-pink-700"
                        : currentTheme === "dark"
                          ? "bg-gray-700 text-gray-300"
                          : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {categoryInfo.data.name}
                  </div>
                )}

                {/* Show lab tag if tool is in Lab 1 */}
                {labCategories.lab1.tools.includes(tool.id) && (
                  <div
                    className={`text-xs px-2 py-1 rounded-full ${
                      currentTheme === "unicorn"
                        ? "bg-purple-100 text-purple-700"
                        : currentTheme === "dark"
                          ? "bg-blue-700 text-blue-300"
                          : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    Lab 1
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {filteredTools.length === 0 && (
        <div className="text-center py-12">
          <p className={`text-lg ${theme.text} opacity-50`}>
            No tools available in this category yet.
          </p>
          <p className={`text-sm ${theme.text} opacity-40 mt-2`}>
            {selectedCategory.startsWith("lab") && selectedCategory !== "lab1"
              ? "This lab will be available in future updates."
              : "Tools will be added to this topic area soon."}
          </p>
        </div>
      )}
    </div>
  );
};

export default ToolMenu;
