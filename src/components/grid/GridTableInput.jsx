// src/components/grid/GridTableInput.jsx

import React, { useState, useCallback, useRef, useEffect } from "react";
import GridComponent from "./GridComponent";
import { LIGHT_NOISE_TEXTURE, DARK_NOISE_TEXTURE } from "../../themes/textures";
import { getFontStyle } from "../../utils/typography";
import { CELL_SIZE } from "../../themes";

const GridTableInput = ({
  x,
  y,
  w = 1,
  h = 3, // Height determines number of data rows (3 rows per grid unit)
  data = [],
  onDataChange,
  columns = [
    { key: "x", label: "X", type: "number" },
    { key: "y", label: "Y", type: "number" }
  ],
  title = "Data Table",
  theme,
  maxRows = h * 3, // 3 rows per grid unit
}) => {
  // Ensure data has the correct structure
  const initializeData = useCallback(() => {
    const initialData = [];
    for (let i = 0; i < maxRows; i++) {
      const row = {};
      columns.forEach(col => {
        row[col.key] = data[i] && data[i][col.key] !== undefined ? data[i][col.key] : "";
      });
      initialData.push(row);
    }
    return initialData;
  }, [data, columns, maxRows]);

  const [tableData, setTableData] = useState(initializeData);
  const tableRef = useRef(null);

  // Update internal data when external data changes
  useEffect(() => {
    setTableData(initializeData());
  }, [initializeData]);

  // Determine theme and texture
  const isDarkMode = theme.component.includes("gray-700");
  const isUnicornMode = theme.text.includes("purple-800");
  const currentTexture = isDarkMode ? DARK_NOISE_TEXTURE : LIGHT_NOISE_TEXTURE;

  // Calculate dimensions
  const totalWidth = w * CELL_SIZE;
  const totalHeight = h * CELL_SIZE;
  const BORDER_SIZE = 8;
  const contentWidth = totalWidth - BORDER_SIZE * 2;
  const contentHeight = totalHeight - BORDER_SIZE * 2;

  // Calculate cell dimensions
  const headerHeight = 28;
  const rowHeight = Math.max(20, (contentHeight - headerHeight) / maxRows);
  const colWidth = contentWidth / columns.length;

  // Handle cell value change
  const handleCellChange = useCallback((rowIndex, columnKey, value) => {
    const newData = [...tableData];
    newData[rowIndex] = { ...newData[rowIndex], [columnKey]: value };
    setTableData(newData);

    // Call external onChange with cleaned data (remove empty rows)
    const cleanedData = newData.filter(row =>
      columns.some(col => row[col.key] !== "" && row[col.key] !== null && row[col.key] !== undefined)
    );
    onDataChange?.(cleanedData);
  }, [tableData, columns, onDataChange]);

  // Validate and format input based on column type
  const formatCellValue = useCallback((value, columnType) => {
    if (columnType === "number") {
      if (value === "" || value === null || value === undefined) return "";
      const num = parseFloat(value);
      return isNaN(num) ? "" : num.toString();
    }
    return value;
  }, []);

  // Get cell input styles
  const getCellInputStyles = () => ({
    width: `${colWidth - 2}px`,
    height: `${rowHeight - 2}px`,
    border: "1px solid",
    borderColor: isDarkMode ? "#4a5568" : "#cbd5e0",
    backgroundColor: isDarkMode ? "#2d3748" : "#ffffff",
    color: isDarkMode ? "#e2e8f0" : "#2d3748",
    fontSize: "12px",
    padding: "2px 4px",
    textAlign: "center",
    outline: "none",
    borderRadius: "2px",
  });

  // Get header cell styles
  const getHeaderStyles = () => ({
    width: `${colWidth}px`,
    height: `${headerHeight}px`,
    backgroundColor: isDarkMode ? "#4a5568" : "#e2e8f0",
    color: isDarkMode ? "#e2e8f0" : "#2d3748",
    fontSize: "13px",
    fontWeight: "600",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRight: `1px solid ${isDarkMode ? "#2d3748" : "#cbd5e0"}`,
    borderBottom: `2px solid ${isDarkMode ? "#2d3748" : "#a0aec0"}`,
  });

  return (
    <GridComponent
      x={x}
      y={y}
      w={w}
      h={h}
      theme={theme}
      title={title}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          padding: `${BORDER_SIZE}px`,
          backgroundImage: `url("data:image/svg+xml,${currentTexture}")`,
          backgroundSize: "40px 40px",
          overflow: "hidden",
        }}
      >
        {/* Container for table */}
        <div
          ref={tableRef}
          style={{
            width: contentWidth,
            height: contentHeight,
            backgroundColor: isDarkMode ? "rgba(45, 55, 72, 0.95)" : "rgba(255, 255, 255, 0.95)",
            border: `1px solid ${isDarkMode ? "#4a5568" : "#cbd5e0"}`,
            borderRadius: "4px",
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
                  borderRight: colIndex < columns.length - 1 ? getHeaderStyles().borderRight : "none",
                }}
              >
                {column.label}
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
                      borderRight: colIndex < columns.length - 1 ? `1px solid ${isDarkMode ? "#4a5568" : "#cbd5e0"}` : "none",
                      borderBottom: `1px solid ${isDarkMode ? "#4a5568" : "#e2e8f0"}`,
                    }}
                  >
                    <input
                      type={column.type === "number" ? "number" : "text"}
                      value={row[column.key]}
                      onChange={(e) => {
                        const formattedValue = formatCellValue(e.target.value, column.type);
                        handleCellChange(rowIndex, column.key, formattedValue);
                      }}
                      style={getCellInputStyles()}
                      placeholder={rowIndex < 5 ? `${column.label}${rowIndex + 1}` : ""}
                    />
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
