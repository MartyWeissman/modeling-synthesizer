// src/components/ui/HelpModal.jsx

import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useTheme } from "../../hooks/useTheme";

// Help files live in public/help/<tool-id>.md, served under the app's base
// path (vite.config.js `base`), e.g. /modeling-synthesizer/help/glycolysis.md.
const helpUrl = (toolId) =>
  `${import.meta.env.BASE_URL}help/${encodeURIComponent(toolId)}.md`;

// react-markdown passes the syntax-tree `node` to custom components; don't
// forward it to the DOM element.
const withoutNode = (props) => {
  const rest = { ...props };
  delete rest.node;
  return rest;
};

const HelpModal = ({ toolId, onClose }) => {
  const { theme, currentTheme } = useTheme();
  const [helpContent, setHelpContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  // null | "missing" (no help file yet) | "network" (couldn't reach server)
  const [error, setError] = useState(null);
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);

  const isDark = currentTheme === "dark";
  const isUnicorn = currentTheme === "unicorn";

  // Load help content from markdown file
  useEffect(() => {
    let cancelled = false;

    const loadHelpContent = async () => {
      let response;
      try {
        response = await fetch(helpUrl(toolId));
      } catch {
        // fetch() rejects only on network failure (offline, DNS, CORS...)
        if (!cancelled) {
          setError("network");
          setIsLoading(false);
        }
        return;
      }

      try {
        if (!response.ok) {
          throw new Error(
            response.status === 404 ? "missing" : `HTTP ${response.status}`,
          );
        }

        // A missing file can come back as the app's HTML page instead of a
        // 404 (e.g. from the dev server's SPA fallback): treat it as missing.
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("text/html")) {
          throw new Error("missing");
        }

        const text = await response.text();
        const start = text.trim().slice(0, 15).toLowerCase();
        if (start.startsWith("<!doctype") || start.startsWith("<html")) {
          throw new Error("missing");
        }

        if (!cancelled) {
          setHelpContent(text);
          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message === "missing" ? "missing" : "network");
          setIsLoading(false);
        }
      }
    };

    loadHelpContent();
    return () => {
      cancelled = true;
    };
  }, [toolId]);

  // Keep a stable reference to onClose so the key handler below doesn't
  // re-register (and lose track of focus) when the parent re-renders.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Move focus into the dialog on open; return it to whatever had focus
  // (usually the ? button) on close. Escape closes; Tab stays in the dialog.
  useEffect(() => {
    const previouslyFocused = document.activeElement;
    closeButtonRef.current?.focus();

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        } else if (!dialogRef.current.contains(document.activeElement)) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (previouslyFocused && typeof previouslyFocused.focus === "function") {
        previouslyFocused.focus();
      }
    };
  }, []);

  // Prevent body scroll when modal is open
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
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
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-modal-title"
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
            id="help-modal-title"
            className={`text-2xl font-medium ${theme.text}`}
            style={{ fontFamily: "'Dancing Script', cursive" }}
          >
            Help
          </h2>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            aria-label="Close help"
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

          {error === "missing" && (
            <div className="text-center">
              <p className={`text-lg mb-2 ${theme.text}`}>
                Help documentation coming soon for this tool
              </p>
              <p className="text-sm opacity-70">
                We're working on creating comprehensive help docs for all tools.
              </p>
            </div>
          )}

          {error === "network" && (
            <div className="text-center" role="alert">
              <p className={`text-lg mb-2 ${theme.text}`}>
                The help page couldn't be loaded
              </p>
              <p className="text-sm opacity-70">
                Check your internet connection, then close this window and
                try again.
              </p>
            </div>
          )}

          {!isLoading && !error && (
            <div
              className="markdown-content [&_li>p]:mb-0 [&_li>p]:mt-0"
              style={{
                lineHeight: "1.6",
              }}
            >
              <ReactMarkdown
                components={{
                  h1: (props) => (
                    <h1
                      className={`text-3xl font-bold mb-4 mt-6 ${theme.text}`}
                      {...withoutNode(props)}
                    />
                  ),
                  h2: (props) => (
                    <h2
                      className={`text-2xl font-semibold mb-3 mt-5 ${theme.text}`}
                      {...withoutNode(props)}
                    />
                  ),
                  h3: (props) => (
                    <h3
                      className={`text-xl font-semibold mb-2 mt-4 ${theme.text}`}
                      {...withoutNode(props)}
                    />
                  ),
                  p: (props) => (
                    <p className={`mb-3 ${theme.text}`} {...withoutNode(props)} />
                  ),
                  ul: (props) => (
                    <ul
                      className={`list-disc list-outside mb-3 ml-5 ${theme.text}`}
                      {...withoutNode(props)}
                    />
                  ),
                  ol: (props) => (
                    <ol
                      className={`list-decimal list-outside mb-3 ml-5 ${theme.text}`}
                      {...withoutNode(props)}
                    />
                  ),
                  li: (props) => (
                    <li className={`mb-1 ${theme.text}`} {...withoutNode(props)} />
                  ),
                  strong: (props) => (
                    <strong className="font-bold" {...withoutNode(props)} />
                  ),
                  code: ({ children, ...props }) => {
                    const isBlock = String(children).includes("\n");
                    const colorClass = isUnicorn
                      ? "bg-pink-100 text-pink-800"
                      : isDark
                        ? "bg-gray-700 text-gray-200"
                        : "bg-gray-200 text-gray-800";
                    return isBlock ? (
                      <code
                        className={`block px-4 py-3 rounded mb-3 ${colorClass}`}
                        {...withoutNode(props)}
                      >
                        {children}
                      </code>
                    ) : (
                      <code
                        className={`px-1 rounded ${colorClass}`}
                        style={{ fontFamily: "monospace", fontSize: "0.9em" }}
                        {...withoutNode(props)}
                      >
                        {children}
                      </code>
                    );
                  },
                  a: (props) => (
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
                      {...withoutNode(props)}
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
