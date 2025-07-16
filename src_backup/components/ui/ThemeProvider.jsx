// src/components/ui/ThemeProvider.jsx

import React, { createContext, useContext, useState } from 'react';
import { themes } from '../../themes';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState('minimal');

  const theme = themes[currentTheme];

  const value = {
    currentTheme,
    setCurrentTheme,
    theme,
    themes
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
