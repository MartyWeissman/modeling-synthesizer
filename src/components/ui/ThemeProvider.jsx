// src/components/ui/ThemeProvider.jsx

import React, { useState } from "react";
import { themes } from "../../themes";
import { ThemeContext } from "../../contexts/ThemeContext";

export const ThemeProvider = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState("minimal");

  const theme = themes[currentTheme];

  const value = {
    currentTheme,
    setCurrentTheme,
    theme,
    themes,
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};
