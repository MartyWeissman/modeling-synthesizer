// src/utils/typography.js

/**
 * Typography utilities for consistent font handling across components
 * Provides Greek letter support with Whitney Book Italic for mathematical notation
 */

// Font stacks for different use cases
export const FONT_STACKS = {
  // Main sans-serif font for UI components
  sans: [
    "-apple-system",
    "BlinkMacSystemFont",
    '"Segoe UI"',
    "Roboto",
    '"Helvetica Neue"',
    "Arial",
    "sans-serif",
  ].join(", "),

  // Monospace font for data displays and code
  mono: [
    "ui-monospace",
    "SFMono-Regular",
    "Menlo",
    "Monaco",
    "Consolas",
    '"Liberation Mono"',
    '"Courier New"',
    "monospace",
  ].join(", "),

  // Font for Greek letters and mathematical notation
  greek: [
    '"Whitney Book Italic"',
    '"Times New Roman"',
    '"DejaVu Serif"',
    "Georgia",
    "serif",
  ].join(", "),
};

// Greek letter mappings for mathematical notation
export const GREEK_LETTERS = {
  alpha: "α",
  beta: "β",
  gamma: "γ",
  delta: "δ",
  epsilon: "ε",
  zeta: "ζ",
  eta: "η",
  theta: "θ",
  iota: "ι",
  kappa: "κ",
  lambda: "λ",
  mu: "μ",
  nu: "ν",
  xi: "ξ",
  omicron: "ο",
  pi: "π",
  rho: "ρ",
  sigma: "σ",
  tau: "τ",
  upsilon: "υ",
  phi: "φ",
  chi: "χ",
  psi: "ψ",
  omega: "ω",

  // Capital letters
  Alpha: "Α",
  Beta: "Β",
  Gamma: "Γ",
  Delta: "Δ",
  Epsilon: "Ε",
  Zeta: "Ζ",
  Eta: "Η",
  Theta: "Θ",
  Iota: "Ι",
  Kappa: "Κ",
  Lambda: "Λ",
  Mu: "Μ",
  Nu: "Ν",
  Xi: "Ξ",
  Omicron: "Ο",
  Pi: "Π",
  Rho: "Ρ",
  Sigma: "Σ",
  Tau: "Τ",
  Upsilon: "Υ",
  Phi: "Φ",
  Chi: "Χ",
  Psi: "Ψ",
  Omega: "Ω",
};

/**
 * Get font style object for different text types
 * @param {string} type - 'sans', 'mono', or 'greek'
 * @param {string} weight - CSS font weight (optional)
 * @returns {object} Style object with fontFamily and optional fontWeight
 */
export const getFontStyle = (type = "sans", weight = null) => {
  const style = {
    fontFamily: FONT_STACKS[type] || FONT_STACKS.sans,
  };

  if (weight) {
    style.fontWeight = weight;
  }

  return style;
};

/**
 * Create text with mixed regular text and Greek letters
 * @param {string} text - Text with Greek letter placeholders like {mu}, {alpha}
 * @param {boolean} formulaMode - If true, single letters are italicized as variables
 * @returns {object} Object with text and styling info for rendering
 */
export const formatMathText = (text, formulaMode = false) => {
  // Split text into segments, identifying Greek letter placeholders
  const segments = [];
  let currentIndex = 0;

  // Regex to find {greekLetter} patterns
  const greekPattern = /\{([a-zA-Z]+)\}/g;
  let match;

  while ((match = greekPattern.exec(text)) !== null) {
    // Add text before the Greek letter
    if (match.index > currentIndex) {
      const beforeText = text.slice(currentIndex, match.index);
      if (formulaMode) {
        segments.push(...parseFormulaText(beforeText));
      } else {
        segments.push({
          text: beforeText,
          type: "regular",
        });
      }
    }

    // Add the Greek letter
    const greekKey = match[1];
    const greekChar = GREEK_LETTERS[greekKey];
    if (greekChar) {
      segments.push({
        text: greekChar,
        type: "greek",
      });
    } else {
      // If Greek letter not found, keep the original placeholder
      segments.push({
        text: match[0],
        type: "regular",
      });
    }

    currentIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (currentIndex < text.length) {
    const remainingText = text.slice(currentIndex);
    if (formulaMode) {
      segments.push(...parseFormulaText(remainingText));
    } else {
      segments.push({
        text: remainingText,
        type: "regular",
      });
    }
  }

  return segments;
};

/**
 * Parse text for formula mode, identifying variables (single letters) for italicization
 * @param {string} text - Text to parse
 * @returns {array} Array of segments with type information
 */
const parseFormulaText = (text) => {
  const segments = [];
  let currentIndex = 0;

  // Regex to find single letters that should be variables (not in brackets or operators)
  const variablePattern = /\b([A-Za-z](?:'*)?)\b/g;
  let match;

  while ((match = variablePattern.exec(text)) !== null) {
    // Add text before the variable
    if (match.index > currentIndex) {
      segments.push({
        text: text.slice(currentIndex, match.index),
        type: "regular",
      });
    }

    // Check if this is likely a variable (single letter, optionally with prime marks)
    const variable = match[1];
    if (variable.length === 1 || variable.match(/^[A-Za-z]'+$/)) {
      segments.push({
        text: variable,
        type: "variable",
      });
    } else {
      segments.push({
        text: variable,
        type: "regular",
      });
    }

    currentIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (currentIndex < text.length) {
    segments.push({
      text: text.slice(currentIndex),
      type: "regular",
    });
  }

  return segments;
};

/**
 * Create CSS classes for Tailwind that support mixed typography
 * @param {string} baseSize - Tailwind text size class (e.g., 'text-sm')
 * @returns {object} CSS classes for regular and Greek text
 */
export const getMathTextClasses = (baseSize = "text-sm") => ({
  regular: `${baseSize} font-medium`,
  greek: `${baseSize} font-medium italic`,
});

/**
 * Common font styles used throughout the application
 */
export const COMMON_STYLES = {
  // Component labels
  label: {
    ...getFontStyle("sans", "500"),
    fontSize: "0.875rem", // text-sm equivalent
  },

  // Data displays
  data: {
    ...getFontStyle("mono", "600"),
    fontSize: "0.875rem",
  },

  // Mathematical notation
  math: {
    ...getFontStyle("greek", "500"),
    fontSize: "0.875rem",
    fontStyle: "italic",
  },

  // Graph axis labels
  axis: {
    ...getFontStyle("mono", "500"),
    fontSize: "0.6875rem", // 11px
  },

  // Tooltips
  tooltip: {
    ...getFontStyle("sans", "400"),
    fontSize: "0.75rem", // text-xs equivalent
  },
};

// Export individual Greek letters for convenience
export const {
  mu,
  alpha,
  beta,
  gamma,
  delta,
  epsilon,
  lambda,
  pi,
  sigma,
  theta,
  omega,
} = GREEK_LETTERS;
