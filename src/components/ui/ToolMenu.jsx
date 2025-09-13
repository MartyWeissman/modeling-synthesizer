// src/components/ui/ToolMenu.jsx

import React, { useState } from "react";
import { useTheme } from "../../hooks/useTheme";
import {
  generateTopicCategories,
  generateToolTypeCategories,
  generateLabCategories,
} from "../../data/tools";

const ToolMenu = ({ onToolSelect, availableTools, currentTool }) => {
  const { theme, currentTheme } = useTheme();
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Generate categories dynamically from centralized metadata
  const topicCategories = generateTopicCategories();
  const toolTypeCategories = generateToolTypeCategories();
  const labCategories = generateLabCategories();

  // Removed topicKeys since "all" is now separate
  const toolTypeKeys = Object.keys(toolTypeCategories);
  const labKeys = Object.keys(labCategories);

  const getFilteredTools = () => {
    if (selectedCategory === "all") return availableTools;

    // Check if it's a lab category
    if (labCategories[selectedCategory]) {
      const labTools = labCategories[selectedCategory].tools || [];
      return availableTools.filter((tool) => labTools.includes(tool.id));
    }

    // Check if it's a tool type category
    if (toolTypeCategories[selectedCategory]) {
      const typeTools = toolTypeCategories[selectedCategory].tools || [];
      return availableTools.filter((tool) => typeTools.includes(tool.id));
    }

    // Otherwise it's a topic category
    const categoryTools = topicCategories[selectedCategory]?.tools || [];
    return availableTools.filter((tool) => categoryTools.includes(tool.id));
  };

  const getTagsForTool = (toolId) => {
    const tags = [];

    // Find topic tag
    for (const [topicKey, topicData] of Object.entries(topicCategories)) {
      if (topicData.tools.includes(toolId)) {
        tags.push({ type: "topic", key: topicKey, data: topicData });
        break;
      }
    }

    // Find tool type tag
    for (const [typeKey, typeData] of Object.entries(toolTypeCategories)) {
      if (typeData.tools.includes(toolId)) {
        tags.push({ type: "toolType", key: typeKey, data: typeData });
        break;
      }
    }

    // Find lab tag
    for (const [labKey, labData] of Object.entries(labCategories)) {
      if (labData.tools.includes(toolId)) {
        tags.push({ type: "lab", key: labKey, data: labData });
        break;
      }
    }

    return tags;
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
          Modeling Synthesizer
        </h1>
        <p className={`text-lg ${theme.text} opacity-75`}>
          Interactive modeling tools for life sciences students
        </p>
      </div>

      {/* All Tools - Most Prominent */}
      <div className="mb-8">
        <div className="flex justify-center">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-8 py-3 rounded-lg font-semibold text-lg transition-all duration-200 border-2 ${
              selectedCategory === "all"
                ? currentTheme === "unicorn"
                  ? "bg-pink-200 border-pink-500 text-pink-900 shadow-lg transform scale-105"
                  : currentTheme === "dark"
                    ? "bg-blue-600 border-blue-400 text-white shadow-lg transform scale-105"
                    : "bg-blue-200 border-blue-500 text-blue-900 shadow-lg transform scale-105"
                : currentTheme === "unicorn"
                  ? "bg-purple-50 border-purple-300 text-purple-800 hover:bg-purple-100 hover:transform hover:scale-102"
                  : currentTheme === "dark"
                    ? "bg-gray-700 border-gray-500 text-gray-200 hover:bg-gray-600 hover:transform hover:scale-102"
                    : "bg-white border-gray-400 text-gray-800 hover:bg-gray-50 hover:transform hover:scale-102"
            }`}
          >
            All Tools
          </button>
        </div>
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
              title={labCategories[labKey].title}
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
      <div className="mb-6">
        <h3
          className={`text-lg font-medium ${theme.text} mb-3 text-center opacity-75`}
        >
          By Topic
        </h3>
        <div className="flex flex-wrap justify-center gap-2 mb-4">
          {Object.keys(topicCategories).map((category) => (
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
              <span className="mr-2">{topicCategories[category].icon}</span>
              {topicCategories[category].name}
            </button>
          ))}
        </div>
      </div>

      {/* Tool Type Categories */}
      <div className="mb-8">
        <h3
          className={`text-lg font-medium ${theme.text} mb-3 text-center opacity-75`}
        >
          By Tool Type
        </h3>
        <div className="flex flex-wrap justify-center gap-2">
          {toolTypeKeys.map((typeKey) => (
            <button
              key={typeKey}
              onClick={() => setSelectedCategory(typeKey)}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 border ${
                selectedCategory === typeKey
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
              <span className="mr-2">{toolTypeCategories[typeKey].icon}</span>
              {toolTypeCategories[typeKey].name}
            </button>
          ))}
        </div>
      </div>

      {/* Tools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTools.map((tool) => {
          const tags = getTagsForTool(tool.id);

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
                {tags.find((tag) => tag.type === "topic") && (
                  <span className="text-2xl opacity-60">
                    {tags.find((tag) => tag.type === "topic").data.icon}
                  </span>
                )}
              </div>

              <p className={`text-sm ${theme.text} opacity-75 mb-4`}>
                {tool.description ||
                  "Interactive modeling tool for biological exploration"}
              </p>

              <div className="flex flex-wrap gap-2">
                {tags.map((tag, index) => (
                  <div
                    key={index}
                    className={`text-xs px-2 py-1 rounded-full ${
                      tag.type === "lab"
                        ? currentTheme === "unicorn"
                          ? "bg-purple-100 text-purple-700"
                          : currentTheme === "dark"
                            ? "bg-blue-700 text-blue-300"
                            : "bg-blue-100 text-blue-700"
                        : tag.type === "toolType"
                          ? currentTheme === "unicorn"
                            ? "bg-rose-100 text-rose-700"
                            : currentTheme === "dark"
                              ? "bg-green-700 text-green-300"
                              : "bg-green-100 text-green-700"
                          : currentTheme === "unicorn"
                            ? "bg-pink-100 text-pink-700"
                            : currentTheme === "dark"
                              ? "bg-gray-700 text-gray-300"
                              : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {tag.type === "toolType" && (
                      <span className="mr-1">{tag.data.icon}</span>
                    )}
                    {tag.data.name}
                  </div>
                ))}
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
              : "Tools will be added to this category area soon."}
          </p>
        </div>
      )}
    </div>
  );
};

export default ToolMenu;
