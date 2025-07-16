// src/tools/MiniatureTest.jsx

import React from "react";
import { useTheme } from "../hooks/useTheme";
import MiniatureComponent from "./VisualToolBuilder/MiniatureComponent";

const MiniatureTest = () => {
  const { theme } = useTheme();

  const components = [
    "button",
    "slider",
    "display",
    "graph",
    "timepicker",
    "staircase",
  ];

  return (
    <div className={`min-h-screen ${theme.bg} p-8`}>
      <div className="max-w-4xl mx-auto">
        <h1 className={`text-3xl font-bold ${theme.text} mb-8`}>
          Miniature Component Test
        </h1>

        <div className="grid grid-cols-3 gap-6">
          {components.map((type) => (
            <div
              key={type}
              className={`${theme.container} p-4 rounded-lg border`}
            >
              <h3 className={`${theme.text} font-semibold mb-4 capitalize`}>
                {type}
              </h3>

              <div className="space-y-4">
                <div>
                  <p className={`${theme.textSecondary} text-sm mb-2`}>
                    Palette Size (0.4x)
                  </p>
                  <div className="flex items-center justify-center h-20 bg-gray-100 rounded">
                    <MiniatureComponent type={type} scale={0.4} theme={theme} />
                  </div>
                </div>

                <div>
                  <p className={`${theme.textSecondary} text-sm mb-2`}>
                    Grid Size (1.0x)
                  </p>
                  <div className="flex items-center justify-center h-32 bg-gray-100 rounded">
                    <MiniatureComponent type={type} scale={1.0} theme={theme} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MiniatureTest;
