// src/components/DiscreteEquation.jsx
import React, { useEffect, useState } from "react";
import { useTheme } from "../hooks/useTheme";

/**
 * DiscreteEquation component for rendering MathML equations with variable substitution
 *
 * @param {string} template - The equation template name (e.g., 'discrete-change-linear')
 * @param {Object} variables - Variables to substitute in the template
 * @param {string} size - Font size: 'small', 'medium', 'large'
 * @param {Object} style - Additional CSS styles
 */
const DiscreteEquation = ({ template, variables = {}, size = "medium", style = {}, ...props }) => {
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
    const loadAndSubstituteEquation = async () => {
      try {
        // Import the MathML template as raw text
        const response = await import(`../equations/${template}.mathml?raw`);
        let templateContent = response.default;

        // Substitute variables in the template
        Object.entries(variables).forEach(([key, value]) => {
          const placeholder = `{${key}}`;
          templateContent = templateContent.replace(new RegExp(placeholder, 'g'), value);
        });

        setMathml(templateContent);
        setError(null);
      } catch (err) {
        console.error(`Failed to load equation template: ${template}`, err);
        setError(`Template "${template}" not found`);
        // Fallback to simple text
        setMathml(`<span style="font-style: italic;">[${template}]</span>`);
      }
    };

    loadAndSubstituteEquation();
  }, [template, variables]);

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

export default DiscreteEquation;
