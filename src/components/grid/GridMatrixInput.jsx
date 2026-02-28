// src/components/grid/GridMatrixInput.jsx
// Minimalist matrix input inspired by GridTimePicker:
// - Textured background, no white boxes
// - Click a number to activate it (blinks), then type to replace or use arrow keys
// - Large typeset parentheses rendered with SVG
// - Supports decimals, negative numbers, up to 6 chars wide

import React, { useState, useRef, useEffect, useCallback } from "react";
import GridComponent from "./GridComponent";
import { LIGHT_NOISE_TEXTURE, DARK_NOISE_TEXTURE } from "../../themes/textures";
import { CELL_SIZE } from "../../themes";

const GridMatrixInput = ({
  x,
  y,
  w = 2,
  h = 2,
  rows = 2,
  cols = 2,
  values = [],
  onChange,
  label = "",
  readOnly = false,
  theme,
  tooltip,
}) => {
  // activeCell: { r, c } or null
  const [activeCell, setActiveCell] = useState(null);
  const [blinkState, setBlinkState] = useState(true);
  // rawInput: what the user is currently typing for the active cell
  const [rawInput, setRawInput] = useState("");
  // pendingReplace: true right after activating a cell; first edit keystroke clears existing content
  const pendingReplaceRef = useRef(false);
  const componentRef = useRef(null);

  const isDarkMode = theme.component.includes("gray-700");
  const isUnicornMode = theme.text.includes("purple-800");
  const currentTexture = isDarkMode ? DARK_NOISE_TEXTURE : LIGHT_NOISE_TEXTURE;

  // ── Colors ────────────────────────────────────────────────────────────────
  const textColor = isUnicornMode
    ? "#4c1d95"
    : isDarkMode
      ? "#e2e8f0"
      : "#1f2937";

  const activeColor = isUnicornMode
    ? "#7c3aed"
    : isDarkMode
      ? "#60a5fa"
      : "#2563eb";

  const bracketColor = isUnicornMode
    ? "#7c3aed"
    : isDarkMode
      ? "#9ca3af"
      : "#374151";

  const labelColor = isUnicornMode
    ? "#7c3aed"
    : isDarkMode
      ? "#d1d5db"
      : "#374151";

  // ── Blink effect when a cell is active ───────────────────────────────────
  useEffect(() => {
    if (activeCell) {
      const interval = setInterval(() => {
        setBlinkState((prev) => !prev);
      }, 530);
      return () => clearInterval(interval);
    } else {
      setBlinkState(true);
    }
  }, [activeCell]);

  // ── Click outside to commit + deactivate ─────────────────────────────────
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (componentRef.current && !componentRef.current.contains(e.target)) {
        commitRaw();
        setActiveCell(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  });

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getValue = useCallback(
    (r, c) => {
      if (r < values.length && c < (values[r] || []).length) {
        return values[r][c];
      }
      return 0;
    },
    [values],
  );

  const formatDisplay = (val) => {
    if (val === "" || val === null || val === undefined) return "0";
    const num = typeof val === "number" ? val : parseFloat(val);
    if (isNaN(num)) return "0";
    // Show up to 4 decimal places, trim trailing zeros
    const str = parseFloat(num.toFixed(4)).toString();
    return str;
  };

  const commitRaw = useCallback(() => {
    if (!activeCell || !onChange) return;
    const { r, c } = activeCell;
    const parsed = parseFloat(rawInput);
    const num = isNaN(parsed) ? 0 : parsed;
    const newValues = values.map((row) => [...row]);
    while (newValues.length <= r) newValues.push(Array(cols).fill(0));
    while (newValues[r].length <= c) newValues[r].push(0);
    newValues[r][c] = num;
    onChange(newValues);
  }, [activeCell, rawInput, values, cols, onChange]);

  const activateCell = useCallback(
    (r, c) => {
      if (readOnly) return;
      // Commit previous cell first
      if (activeCell) commitRaw();
      setActiveCell({ r, c });
      setBlinkState(true);
      // Pre-fill raw with current value; first keystroke will replace it
      const cur = getValue(r, c);
      setRawInput(formatDisplay(cur));
      pendingReplaceRef.current = true;
    },
    [activeCell, commitRaw, getValue, readOnly],
  );

  // ── Keyboard handling ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!activeCell || readOnly) return;

    const { r, c } = activeCell;

    const moveTo = (nr, nc) => {
      commitRaw();
      // clamp
      const tr = Math.max(0, Math.min(rows - 1, nr));
      const tc = Math.max(0, Math.min(cols - 1, nc));
      setActiveCell({ r: tr, c: tc });
      setBlinkState(true);
      const cur = getValue(tr, tc);
      setRawInput(formatDisplay(cur));
      pendingReplaceRef.current = true;
    };

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setRawInput(formatDisplay(getValue(r, c)));
        setActiveCell(null);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        // Tab: move right then down; Enter: move down
        if (e.key === "Tab") {
          const nc = c + 1;
          if (nc < cols) moveTo(r, nc);
          else moveTo(r + 1, 0);
        } else {
          const nr = r + 1;
          if (nr < rows) moveTo(nr, c);
          else moveTo(0, c);
        }
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        moveTo(r, c + 1);
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        moveTo(r, c - 1);
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        moveTo(r + 1, c);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        moveTo(r - 1, c);
        return;
      }

      if (e.key === "Backspace") {
        if (pendingReplaceRef.current) {
          pendingReplaceRef.current = false;
          setRawInput("");
        } else {
          setRawInput((prev) => prev.slice(0, -1) || "");
        }
        return;
      }

      // Allow digits, minus, decimal point
      if (/^[0-9]$/.test(e.key)) {
        if (pendingReplaceRef.current) {
          pendingReplaceRef.current = false;
          setRawInput(e.key);
        } else {
          setRawInput((prev) => (prev === "0" ? e.key : prev + e.key));
        }
        return;
      }
      if (e.key === "-") {
        if (pendingReplaceRef.current) {
          pendingReplaceRef.current = false;
          setRawInput("-");
        } else {
          setRawInput((prev) =>
            prev.startsWith("-") ? prev.slice(1) : "-" + prev,
          );
        }
        return;
      }
      if (e.key === ".") {
        if (pendingReplaceRef.current) {
          pendingReplaceRef.current = false;
          setRawInput("0.");
        } else {
          setRawInput((prev) => (prev.includes(".") ? prev : prev + "."));
        }
        return;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [activeCell, rawInput, rows, cols, getValue, commitRaw, readOnly]);

  // ── Layout math ───────────────────────────────────────────────────────────
  const BORDER = 6;
  const LABEL_HEIGHT = label ? 22 : 0;
  const BRACKET_W = 10; // px width for each bracket
  const totalW = w * CELL_SIZE;
  const totalH = h * CELL_SIZE;

  // Shrink the matrix content to ~80% of the available space
  const SCALE = 0.8;
  const innerW = (totalW - BORDER * 2) * SCALE;
  const innerH = (totalH - BORDER * 2) * SCALE;
  const matrixH = innerH - LABEL_HEIGHT;
  const matrixW = innerW - BRACKET_W * 2;

  const cellW = matrixW / cols;
  const cellH = matrixH / rows;

  // Font size: aim for ~40% of cell height, capped
  const fontSize = Math.min(Math.max(13, cellH * 0.4), 22);

  // ── SVG parenthesis path (tall bracket shape) ────────────────────────────
  // Drawn as a curved bracket of given height
  const BracketLeft = ({ height, color }) => {
    const w2 = BRACKET_W;
    const h2 = height;
    const cx = w2 * 0.9; // control point x offset
    return (
      <svg
        width={w2}
        height={h2}
        style={{ display: "block", flexShrink: 0 }}
        overflow="visible"
      >
        <path
          d={`M ${w2 * 0.8} 0
              C ${cx - w2 * 1.1} ${h2 * 0.15}, ${cx - w2 * 1.1} ${h2 * 0.85}, ${w2 * 0.8} ${h2}`}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  };

  const BracketRight = ({ height, color }) => {
    const w2 = BRACKET_W;
    const h2 = height;
    return (
      <svg
        width={w2}
        height={h2}
        style={{ display: "block", flexShrink: 0 }}
        overflow="visible"
      >
        <path
          d={`M ${w2 * 0.2} 0
              C ${w2 * 1.2} ${h2 * 0.15}, ${w2 * 1.2} ${h2 * 0.85}, ${w2 * 0.2} ${h2}`}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div ref={componentRef}>
      <GridComponent
        x={x}
        y={y}
        w={w}
        h={h}
        title={tooltip}
        theme={theme}
        className="select-none"
        style={{
          background: isUnicornMode
            ? `linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(251,207,232,0.3) 50%, rgba(196,181,253,0.3) 100%), url("data:image/svg+xml,${currentTexture}")`
            : `url("data:image/svg+xml,${currentTexture}")`,
          backgroundSize: "cover, 64px 64px",
          boxShadow: isUnicornMode
            ? `inset 0 1px 0 0 rgba(255,255,255,0.3),
               inset 1px 0 0 0 rgba(255,255,255,0.2),
               inset 0 -1px 0 0 rgba(236,72,153,0.1),
               inset -1px 0 0 0 rgba(236,72,153,0.1),
               0 2px 8px rgba(236,72,153,0.2)`
            : `inset 0 1px 0 0 rgba(255,255,255,0.1),
               inset 1px 0 0 0 rgba(255,255,255,0.05),
               inset 0 -1px 0 0 rgba(0,0,0,0.1),
               inset -1px 0 0 0 rgba(0,0,0,0.05),
               0 2px 4px rgba(0,0,0,0.1)`,
          border: isUnicornMode
            ? "1px solid rgba(236,72,153,0.2)"
            : "1px solid rgba(0,0,0,0.1)",
          padding: `${BORDER}px`,
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Optional label */}
        {label && (
          <div
            style={{
              height: `${LABEL_HEIGHT}px`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: labelColor,
              fontSize: "15px",
              fontWeight: "700",
              letterSpacing: "0.04em",
              fontFamily: "sans-serif",
              flexShrink: 0,
            }}
          >
            {label}
          </div>
        )}

        {/* Matrix row: [ bracket | cells | bracket ] */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            width: `${innerW}px`,
            height: `${matrixH}px`,
          }}
        >
          <BracketLeft height={matrixH} color={bracketColor} />

          {/* Cell grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${cols}, ${cellW}px)`,
              gridTemplateRows: `repeat(${rows}, ${cellH}px)`,
              flex: 1,
            }}
          >
            {Array.from({ length: rows }, (_, r) =>
              Array.from({ length: cols }, (_, c) => {
                const isActive =
                  activeCell && activeCell.r === r && activeCell.c === c;
                const rawVal = getValue(r, c);
                const displayStr = isActive ? rawInput : formatDisplay(rawVal);
                const isBlinking = isActive && !blinkState;

                return (
                  <div
                    key={`${r}-${c}`}
                    onClick={() => activateCell(r, c)}
                    style={{
                      width: `${cellW}px`,
                      height: `${cellH}px`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: readOnly ? "default" : "pointer",
                      position: "relative",
                    }}
                  >
                    {/* Subtle active highlight — no box, just a soft underline */}
                    {isActive && !readOnly && (
                      <div
                        style={{
                          position: "absolute",
                          bottom: "12%",
                          left: "15%",
                          right: "15%",
                          height: "2px",
                          borderRadius: "1px",
                          background: activeColor,
                          opacity: 0.8,
                        }}
                      />
                    )}

                    <span
                      style={{
                        fontFamily: "Georgia, 'Times New Roman', serif",
                        fontSize: `${fontSize}px`,
                        fontStyle: "italic",
                        color: isActive ? activeColor : textColor,
                        opacity: isBlinking ? 0.15 : 1,
                        transition: "opacity 0.05s",
                        userSelect: "none",
                        letterSpacing: "-0.02em",
                        maxWidth: `${cellW - 4}px`,
                        overflow: "hidden",
                        whiteSpace: "nowrap",
                        textAlign: "center",
                      }}
                    >
                      {displayStr || "0"}
                    </span>
                  </div>
                );
              }),
            )}
          </div>

          <BracketRight height={matrixH} color={bracketColor} />
        </div>
      </GridComponent>
    </div>
  );
};

export default GridMatrixInput;
