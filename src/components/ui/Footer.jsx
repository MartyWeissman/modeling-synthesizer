// src/components/ui/Footer.jsx
// Footer component with copyright and license information

import React from "react";
import { useTheme } from "../../hooks/useTheme";

const Footer = () => {
  const { currentTheme } = useTheme();

  const currentYear = new Date().getFullYear();

  return (
    <footer
      className={`py-4 px-4 text-center text-sm ${
        currentTheme === "dark"
          ? "text-gray-400"
          : currentTheme === "unicorn"
            ? "text-purple-600"
            : "text-gray-600"
      }`}
      style={{ opacity: 0.7 }}
    >
      <div>
        © {currentYear} Martin H. Weissman. Licensed under the{" "}
        <a
          href="https://github.com/MartyWeissman/modeling-synthesizer/blob/main/LICENSE"
          target="_blank"
          rel="noopener noreferrer"
          className={`underline ${
            currentTheme === "dark"
              ? "hover:text-gray-200"
              : currentTheme === "unicorn"
                ? "hover:text-purple-800"
                : "hover:text-gray-800"
          }`}
        >
          MIT License
        </a>
        .
      </div>
    </footer>
  );
};

export default Footer;
