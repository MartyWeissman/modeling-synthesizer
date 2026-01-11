// src/components/ui/HelpModal.jsx

import React, { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useTheme } from "../../hooks/useTheme";

const HelpModal = ({ toolId, onClose }) => {
  const { theme, currentTheme } = useTheme();
  const [helpContent, setHelpContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  const isDark = currentTheme === "dark";
  const isUnicorn = currentTheme === "unicorn";

  // Load help content from markdown file
  useEffect(() => {
    const loadHelpContent = async () => {
      try {
        const response = await fetch(`/modeling-synthesizer/help/${toolId}.md`);
        if (!response.ok) {
          throw new Error("Help file not found");
        }

        // Check if we got markdown (not HTML 404 page)
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("text/html")) {
          throw new Error("Got HTML instead of markdown");
        }

        const text = await response.text();

        // Additional check: if content starts with <!DOCTYPE or <html, it's not markdown
        if (
          text.trim().startsWith("<!DOCTYPE") ||
          text.trim().startsWith("<html")
        ) {
          throw new Error("Got HTML instead of markdown");
        }

        setHelpContent(text);
        setIsLoading(false);
      } catch (err) {
        setError(true);
        setIsLoading(false);
      }
    };

    loadHelpContent();
  }, [toolId]);

  // Handle ESC key to close
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        backgroundColor: "rgba(0, 0, 0, 0.5)",
      }}
      onClick={onClose}
    >
      {/* Help panel */}
      <div
        className={`relative rounded-xl ${theme.shadow} border-2 ${
          isUnicorn ? "border-pink-300" : "border-gray-400"
        }`}
        style={{
          width: "80%",
          maxWidth: "800px",
          maxHeight: "80vh",
          backgroundColor: isUnicorn
            ? "#fdf2f8"
            : isDark
              ? "#1f2937"
              : "#f9fafb",
          boxShadow: isUnicorn
            ? "0 8px 32px rgba(236,72,153,0.3)"
            : "0 8px 32px rgba(0,0,0,0.3)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className={`rounded-t-xl px-6 py-4 flex items-center justify-between border-b-2 ${
            isUnicorn ? "border-pink-300" : "border-gray-400"
          }`}
          style={{
            backgroundColor: isUnicorn
              ? "#fbcfe8"
              : isDark
                ? "#374151"
                : "#e5e7eb",
          }}
        >
          <h2
            className={`text-2xl font-medium ${theme.text}`}
            style={{ fontFamily: "'Dancing Script', cursive" }}
          >
            Help
          </h2>
          <button
            onClick={onClose}
            className={`w-8 h-8 flex items-center justify-center text-xl font-bold rounded-full ${
              isUnicorn
                ? "bg-pink-100 hover:bg-pink-200 text-pink-800 border border-pink-300"
                : isDark
                  ? "bg-gray-600 hover:bg-gray-500 text-gray-100 border border-gray-500"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300"
            } transition-colors duration-150`}
            title="Close help"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div
          className={`px-8 py-6 overflow-y-auto ${theme.text}`}
          style={{
            maxHeight: "calc(80vh - 80px)",
          }}
        >
          {isLoading && (
            <p className="text-center text-gray-500">Loading help content...</p>
          )}

          {error && (
            <div className="text-center">
              <p className={`text-lg mb-2 ${theme.text}`}>
                Help documentation coming soon for this tool
              </p>
              <p className="text-sm opacity-70">
                We're working on creating comprehensive help docs for all tools.
              </p>
            </div>
          )}

          {!isLoading && !error && (
            <div
              className="markdown-content"
              style={{
                lineHeight: "1.6",
              }}
            >
              <ReactMarkdown
                components={{
                  h1: ({ node, ...props }) => (
                    <h1
                      className={`text-3xl font-bold mb-4 mt-6 ${theme.text}`}
                      {...props}
                    />
                  ),
                  h2: ({ node, ...props }) => (
                    <h2
                      className={`text-2xl font-semibold mb-3 mt-5 ${theme.text}`}
                      {...props}
                    />
                  ),
                  h3: ({ node, ...props }) => (
                    <h3
                      className={`text-xl font-semibold mb-2 mt-4 ${theme.text}`}
                      {...props}
                    />
                  ),
                  p: ({ node, ...props }) => (
                    <p className={`mb-3 ${theme.text}`} {...props} />
                  ),
                  ul: ({ node, ...props }) => (
                    <ul
                      className={`list-disc list-inside mb-3 ml-4 ${theme.text}`}
                      {...props}
                    />
                  ),
                  ol: ({ node, ...props }) => (
                    <ol
                      className={`list-decimal list-inside mb-3 ml-4 ${theme.text}`}
                      {...props}
                    />
                  ),
                  li: ({ node, ...props }) => (
                    <li className={`mb-1 ${theme.text}`} {...props} />
                  ),
                  strong: ({ node, ...props }) => (
                    <strong className="font-bold" {...props} />
                  ),
                  code: ({ node, inline, ...props }) =>
                    inline ? (
                      <code
                        className={`px-1 py-0.5 rounded ${
                          isUnicorn
                            ? "bg-pink-100 text-pink-800"
                            : isDark
                              ? "bg-gray-700 text-gray-200"
                              : "bg-gray-200 text-gray-800"
                        }`}
                        {...props}
                      />
                    ) : (
                      <code
                        className={`block px-4 py-3 rounded mb-3 ${
                          isUnicorn
                            ? "bg-pink-100 text-pink-800"
                            : isDark
                              ? "bg-gray-700 text-gray-200"
                              : "bg-gray-200 text-gray-800"
                        }`}
                        {...props}
                      />
                    ),
                  a: ({ node, ...props }) => (
                    <a
                      className={`underline ${
                        isUnicorn
                          ? "text-pink-600 hover:text-pink-800"
                          : isDark
                            ? "text-blue-400 hover:text-blue-300"
                            : "text-blue-600 hover:text-blue-800"
                      }`}
                      target="_blank"
                      rel="noopener noreferrer"
                      {...props}
                    />
                  ),
                }}
              >
                {helpContent}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HelpModal;
