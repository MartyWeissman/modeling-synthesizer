// src/components/ui/ThemeProvider.jsx

import React, { useState } from "react";
import { themes } from "../../themes";
import { ThemeContext } from "../../contexts/ThemeContext";

// Read ?theme= synchronously so the very first render uses the right theme
// (no white flash for dark-mode users on every navigation or Reset).
const getInitialTheme = () => {
  if (typeof window === "undefined") return "light";
  const urlTheme = new URLSearchParams(window.location.search).get("theme");
  return urlTheme && Object.prototype.hasOwnProperty.call(themes, urlTheme)
    ? urlTheme
    : "light";
};

export const ThemeProvider = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState(getInitialTheme);

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
