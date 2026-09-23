// src/components/grid/themeMode.js
// Shared helpers for the grid components: which theme is active, and how to
// size the noise-texture background layers.

import { useContext } from "react";
import { ThemeContext } from "../../contexts/ThemeContext";
import { themes } from "../../themes";

/**
 * Which theme is active ("light" | "dark" | "unicorn").
 *
 * Reads `currentTheme` from the ThemeProvider (the same value `useTheme()`
 * returns). If a component is ever rendered outside a ThemeProvider, falls back
 * to matching the `theme` object it was given against the theme table (by
 * identity, not by searching its class strings).
 */
export function useThemeMode(themeProp) {
  const ctx = useContext(ThemeContext);
  let currentTheme = ctx?.currentTheme;
  if (!currentTheme) {
    currentTheme =
      Object.keys(themes).find((k) => themes[k] === themeProp) || "light";
  }
  return {
    currentTheme,
    isDarkMode: currentTheme === "dark",
    isUnicornMode: currentTheme === "unicorn",
  };
}

/**
 * `background-size` for a background made of an optional gradient layer on top
 * of a tiling noise texture. With a single `url()` layer the size must be the
 * tile size only; "cover, 64px 64px" would apply "cover" to the texture and
 * stretch it instead of tiling it.
 */
export function noiseBackgroundSize(hasGradientLayer, tile = "64px 64px") {
  return hasGradientLayer ? `cover, ${tile}` : tile;
}
