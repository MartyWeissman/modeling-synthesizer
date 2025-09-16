// src/components/Equation.jsx
import React, { useEffect, useState } from "react";
import { useTheme } from "../hooks/useTheme";

/**
 * Equation component for rendering MathML equations with theme support
 *
 * @param {string} name - The equation file name (without .mathml extension)
 * @param {string} size - Font size: 'small', 'medium', 'large'
 * @param {Object} style - Additional CSS styles
 */
const Equation = ({ name, size = "medium", style = {}, ...props }) => {
  const { currentTheme } = useTheme();
  const [mathml, setMathml] = useState("");
  const [error, setError] = useState(null);

  // Font size mapping
  const sizeMap = {
    small: "1.0em",
    medium: "1.1em",
    large: "1.3em",
  };

  // Theme-aware styling
  const mathStyles = {
    fontSize: sizeMap[size],
    color: currentTheme === "dark" ? "#ffffff" : "#000000",
    margin: "0",
    padding: "0",
    lineHeight: "1.2",
    ...style,
  };

  useEffect(() => {
    const loadEquation = async () => {
      try {
        // Import the MathML file as raw text
        const response = await import(`../equations/${name}.mathml?raw`);
        setMathml(response.default);
        setError(null);
      } catch (err) {
        console.error(`Failed to load equation: ${name}`, err);
        setError(`Equation "${name}" not found`);
        // Fallback to simple text
        setMathml(`<span style="font-style: italic;">[${name}]</span>`);
      }
    };

    loadEquation();
  }, [name]);

  if (error) {
    return <span style={{ ...mathStyles, color: "#ef4444" }}>{error}</span>;
  }

  return (
    <span
      style={mathStyles}
      dangerouslySetInnerHTML={{ __html: mathml }}
      {...props}
    />
  );
};

export default Equation;
