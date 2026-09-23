// src/components/grid/GridTableInput.jsx

import React, { useState, useCallback, useRef, useEffect } from "react";
import GridComponent from "./GridComponent";
import { LIGHT_NOISE_TEXTURE, DARK_NOISE_TEXTURE } from "../../themes/textures";
import { CELL_SIZE } from "../../themes";
import { useThemeMode, noiseBackgroundSize } from "./themeMode";

const GridTableInput = ({
  x,
  y,
  w = 1,
  h = 3, // Height determines number of data rows (3 rows per grid unit)
  data = [],
  onDataChange,
  columns = [
    { key: "x", label: "X", type: "number" },
    { key: "y", label: "Y", type: "number" },
  ],
  title = "Data Table",
  theme,
  maxRows = h * 3, // 3 rows per grid unit
  errorHighlights = [], // Array of {index, field, value} for error indication
  lockedCells = [], // Array of {row, key, value} — display fixed value, non-editable
}) => {
  // Rows are kept in local state so that the layout the student typed stays
  // put: empty rows are NOT compacted while typing (the cleaned, compacted
  // list is only what we report through onDataChange), and a change to
  // `columns` alone (e.g. a theme-dependent column colour) never resets the
  // rows. The table re-initialises from `data` only when `data` really
  // differs from what the student has entered (e.g. Reset or example data).
  const isFilled = (v) => v !== "" && v !== null && v !== undefined;
  const editableKeys = (cols) =>
    cols
      .filter((c) => c.type !== "computed" && c.editable !== false)
      .map((c) => c.key);
  const computedKeys = (cols) =>
    cols
      .filter((c) => c.type === "computed" || c.editable === false)
      .map((c) => c.key);
  const rowSig = (row, keys) =>
    keys.map((k) => (row && isFilled(row[k]) ? String(row[k]) : "")).join("\u0001");
  const hasEditable = (row, keys) => keys.some((k) => row && isFilled(row[k]));

  const buildFromData = (srcData, cols, nRows) => {
    const rows = [];
    const rowToData = [];
    for (let i = 0; i < nRows; i++) {
      const row = {};
      cols.forEach((col) => {
        row[col.key] =
          srcData[i] && srcData[i][col.key] !== undefined ? srcData[i][col.key] : "";
      });
      rows.push(row);
      rowToData.push(i < srcData.length ? i : -1);
    }
    return { rows, rowToData };
  };

  const [table, setTable] = useState(() => buildFromData(data, columns, maxRows));
  const tableData = table.rows;
  const rowToData = table.rowToData;
  const tableRef = useRef(null);
  const columnsRef = useRef(columns);
  columnsRef.current = columns;

  // Sync from external data
  useEffect(() => {
    const cols = columnsRef.current;
    const eKeys = editableKeys(cols);
    const cKeys = computedKeys(cols);
    setTable((prev) => {
      if (prev.rows.length !== maxRows) return buildFromData(data, cols, maxRows);
      const rows = prev.rows;
      const n = rows.length;
      // 1) Same entries row-by-row: keep layout, refresh computed columns
      let positional = data.length <= n;
      for (let i = 0; positional && i < n; i++) {
        if (rowSig(rows[i], eKeys) !== rowSig(data[i], eKeys)) positional = false;
      }
      let mapping = null;
      if (positional) {
        mapping = rows.map((_, i) => (i < data.length ? i : -1));
      } else {
        // 2) Same non-empty entries in the same order (data is the compacted
        //    list we reported): keep layout, map rows to data entries
        const filledRows = [];
        rows.forEach((r, i) => hasEditable(r, eKeys) && filledRows.push(i));
        const filledData = [];
        data.forEach((d, j) => hasEditable(d, eKeys) && filledData.push(j));
        if (
          filledRows.length === filledData.length &&
          filledRows.every(
            (ri, k) => rowSig(rows[ri], eKeys) === rowSig(data[filledData[k]], eKeys),
          )
        ) {
          mapping = rows.map(() => -1);
          filledRows.forEach((ri, k) => (mapping[ri] = filledData[k]));
        }
      }
      if (!mapping) return buildFromData(data, cols, maxRows);

      // Refresh computed (read-only) columns from data; keep editable text
      let changed = mapping.some((m, i) => m !== prev.rowToData[i]);
      const newRows = rows.map((row, i) => {
        const src = mapping[i] >= 0 ? data[mapping[i]] : null;
        let out = row;
        cKeys.forEach((k) => {
          const v = src && src[k] !== undefined ? src[k] : "";
          if (out[k] !== v) {
            if (out === row) out = { ...row };
            out[k] = v;
            changed = true;
          }
        });
        return out;
      });
      return changed ? { rows: newRows, rowToData: mapping } : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, maxRows]);

  // Make sure every row has a key for each current column (columns may change)
  const columnKeySig = columns.map((c) => c.key).join("|");
  useEffect(() => {
    setTable((prev) => {
      const keys = columnsRef.current.map((c) => c.key);
      if (prev.rows.every((r) => keys.every((k) => k in r))) return prev;
      return {
        ...prev,
        rows: prev.rows.map((r) => {
          const out = { ...r };
          keys.forEach((k) => {
            if (!(k in out)) out[k] = "";
          });
          return out;
        }),
      };
    });
  }, [columnKeySig]);

  // Determine theme and texture
  const { isDarkMode } = useThemeMode(theme);
  const currentTexture = isDarkMode ? DARK_NOISE_TEXTURE : LIGHT_NOISE_TEXTURE;

  // Calculate dimensions
  const totalWidth = w * CELL_SIZE;
  const totalHeight = h * CELL_SIZE;
  const BORDER_SIZE = 8;
  const contentWidth = totalWidth - BORDER_SIZE * 2;
  const contentHeight = totalHeight - BORDER_SIZE * 2;

  // Calculate cell dimensions
  const headerHeight = 40;
  const rowHeight = Math.max(20, (contentHeight - headerHeight) / maxRows);
  const colWidth = contentWidth / columns.length;

  // Handle cell value change
  const handleCellChange = useCallback(
    (rowIndex, columnKey, value) => {
      const newRows = [...tableData];
      newRows[rowIndex] = { ...newRows[rowIndex], [columnKey]: value };

      // Report cleaned data (empty rows removed) to the caller, but keep the
      // rows where they are in the table.
      const isRowFilled = (row) => columns.some((col) => isFilled(row[col.key]));
      const cleanedData = [];
      const mapping = newRows.map((row) => {
        if (!isRowFilled(row)) return -1;
        cleanedData.push(row);
        return cleanedData.length - 1;
      });
      setTable({ rows: newRows, rowToData: mapping });
      onDataChange?.(cleanedData);
    },
    [tableData, columns, onDataChange],
  );

  // Check if a cell has an error
  const hasError = useCallback(
    (rowIndex, columnKey) => {
      const dataIndex = rowToData[rowIndex];
      if (dataIndex === undefined || dataIndex < 0) return false;
      return errorHighlights.some(
        (error) => error.index === dataIndex && error.field === columnKey,
      );
    },
    [errorHighlights, rowToData],
  );

  // Check if a computed cell should show error (empty value when it should have content)
  const hasComputedError = useCallback(
    (rowIndex, columnKey, column) => {
      if (column.type !== "computed") return false;

      // For computed log columns, error if value is empty but original value exists
      const dataIndex = rowToData[rowIndex];
      const row = dataIndex >= 0 ? data[dataIndex] : null;
      if (!row) return false;

      if (columnKey === "logX") {
        const x = parseFloat(row.x);
        return !isNaN(x) && x !== "" && x <= 0; // X exists but is non-positive
      }

      if (columnKey === "logY") {
        const y = parseFloat(row.y);
        return !isNaN(y) && y !== "" && y <= 0; // Y exists but is non-positive
      }

      return false;
    },
    [data, rowToData],
  );

  // Get cell input styles with error indication
  const getCellInputStyles = (rowIndex, columnKey, column) => {
    const isError = hasError(rowIndex, columnKey);
    const isComputedError = hasComputedError(rowIndex, columnKey, column);
    const hasAnyError = isError || isComputedError;
    const isComputed = column.type === "computed";

    return {
      width: `${colWidth - 2}px`,
      height: `${rowHeight - 2}px`,
      border: "1px solid",
      borderColor: hasAnyError
        ? "#ef4444" // Red border for errors
        : isDarkMode
          ? "#4a5568"
          : "#cbd5e0",
      backgroundColor: hasAnyError
        ? isDarkMode
          ? "#7f1d1d"
          : "#fee2e2" // Red background for errors
        : isComputed
          ? isDarkMode
            ? "#374151" // Slightly different for computed fields
            : "#f3f4f6"
          : isDarkMode
            ? "#2d3748"
            : "#ffffff",
      color: hasAnyError
        ? "#ef4444" // Red text for errors
        : column.color ?? (isDarkMode ? "#e2e8f0" : "#2d3748"),
      fontSize: "12px",
      fontWeight: isComputed ? "600" : "normal",
      padding: "2px 4px",
      textAlign: "center",
      outline: "none",
      borderRadius: "2px",
      cursor: isComputed ? "default" : "text",
    };
  };

  // Get header cell styles
  const getHeaderStyles = () => ({
    width: `${colWidth}px`,
    height: `${headerHeight}px`,
    backgroundColor: isDarkMode ? "#4a5568" : "#e2e8f0",
    color: isDarkMode ? "#e2e8f0" : "#2d3748",
    fontSize: "13px",
    fontWeight: "600",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    lineHeight: "1.2",
    borderRight: `1px solid ${isDarkMode ? "#2d3748" : "#cbd5e0"}`,
    borderBottom: `2px solid ${isDarkMode ? "#2d3748" : "#a0aec0"}`,
  });

  return (
    <GridComponent x={x} y={y} w={w} h={h} theme={theme} title={title}>
      <div
        style={{
          width: "100%",
          height: "100%",
          padding: `${BORDER_SIZE}px`,
          backgroundImage: `url(${currentTexture})`,
          backgroundSize: noiseBackgroundSize(false),
          overflow: "hidden",
        }}
      >
        {/* Container for table */}
        <div
          ref={tableRef}
          style={{
            width: contentWidth,
            height: contentHeight,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Header Row */}
          <div style={{ display: "flex", flexShrink: 0 }}>
            {columns.map((column, colIndex) => (
              <div
                key={column.key}
                style={{
                  ...getHeaderStyles(),
                  borderRight:
                    colIndex < columns.length - 1
                      ? getHeaderStyles().borderRight
                      : "none",
                }}
              >
                {column.label.split("\n").map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
              </div>
            ))}
          </div>

          {/* Data Rows */}
          <div style={{ flex: 1, overflow: "auto" }}>
            {tableData.map((row, rowIndex) => (
              <div key={rowIndex} style={{ display: "flex" }}>
                {columns.map((column, colIndex) => (
                  <div
                    key={`${rowIndex}-${column.key}`}
                    style={{
                      width: `${colWidth}px`,
                      height: `${rowHeight}px`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRight:
                        colIndex < columns.length - 1
                          ? `1px solid ${isDarkMode ? "#4a5568" : "#cbd5e0"}`
                          : "none",
                      borderBottom: `1px solid ${isDarkMode ? "#4a5568" : "#e2e8f0"}`,
                    }}
                  >
                    {(() => {
                      const lock = lockedCells.find(
                        (lc) => lc.row === rowIndex && lc.key === column.key,
                      );
                      const isLocked = !!lock;
                      const displayValue = isLocked
                        ? String(lock.value)
                        : isFilled(row[column.key])
                          ? String(row[column.key])
                          : "";
                      const lockedColumn = isLocked
                        ? { ...column, type: "computed" }
                        : column;
                      return (
                        <input
                          type="text"
                          value={displayValue}
                          onChange={(e) => {
                            // Store raw text while typing — no clamping yet
                            if (!isLocked && column.editable !== false) {
                              handleCellChange(rowIndex, column.key, e.target.value);
                            }
                          }}
                          onBlur={(e) => {
                            // On blur: parse, clamp, and normalise the value
                            if (!isLocked && column.editable !== false && column.type === "number") {
                              const raw = e.target.value;
                              if (raw === "" || raw === "-" || raw === ".") return;
                              const num = parseFloat(raw);
                              if (isNaN(num)) {
                                handleCellChange(rowIndex, column.key, "");
                                return;
                              }
                              const clamped = Math.min(
                                column.max !== undefined ? column.max : Infinity,
                                Math.max(column.min !== undefined ? column.min : -Infinity, num),
                              );
                              handleCellChange(rowIndex, column.key, clamped.toString());
                            }
                          }}
                          style={getCellInputStyles(rowIndex, column.key, lockedColumn)}
                          placeholder=""
                          readOnly={isLocked || column.editable === false}
                        />
                      );
                    })()}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </GridComponent>
  );
};

export default GridTableInput;
