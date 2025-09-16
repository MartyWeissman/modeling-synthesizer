// src/tools/DataPlottingTool.jsx

import React, { useState, useCallback } from "react";
import {
  GridTableInput,
  GridGraph,
  GridButton,
  GridDisplay,
  GridLabel,
} from "../components/grid";
import ToolContainer from "../components/ui/ToolContainer";
import { useTheme } from "../hooks/useTheme";

const DataPlottingTool = () => {
  const { theme, currentTheme } = useTheme();

  // Data state
  const [tableData, setTableData] = useState([
    { x: 1, y: 2 },
    { x: 2, y: 4 },
    { x: 3, y: 8 },
    { x: 4, y: 16 },
    { x: 5, y: 32 },
  ]);

  // Scaling options state
  const [xScale, setXScale] = useState("linear"); // "linear" or "log"
  const [yScale, setYScale] = useState("linear"); // "linear" or "log"
  const [logBase, setLogBase] = useState("log10"); // "log10", "log2", "ln"

  // Regression state
  const [showRegression, setShowRegression] = useState(false);
  const [regressionStats, setRegressionStats] = useState({
    slope: 0,
    intercept: 0,
    rSquared: 0,
  });

  // Handle data changes from table
  const handleDataChange = useCallback((newData) => {
    setTableData(newData);
    // TODO: Recalculate regression when data changes
  }, []);

  // Handle scaling changes
  const handleXScaleToggle = useCallback(() => {
    setXScale(prev => prev === "linear" ? "log" : "linear");
  }, []);

  const handleYScaleToggle = useCallback(() => {
    setYScale(prev => prev === "linear" ? "log" : "linear");
  }, []);

  // Handle log base changes
  const handleLogBaseChange = useCallback((base) => {
    setLogBase(base);
  }, []);

  // Handle regression toggle
  const handleRegressionToggle = useCallback(() => {
    setShowRegression(prev => !prev);
    // TODO: Calculate regression when enabled
  }, []);

  // Calculate axis labels based on current settings
  const getXLabel = () => {
    if (xScale === "log") {
      return `${logBase}(X)`;
    }
    return "X";
  };

  const getYLabel = () => {
    if (yScale === "log") {
      return `${logBase}(Y)`;
    }
    return "Y";
  };

  // Define table columns based on current scaling
  const getTableColumns = () => {
    const columns = [
      { key: "x", label: "X", type: "number" },
      { key: "y", label: "Y", type: "number" },
    ];

    if (xScale === "log") {
      columns.push({
        key: "logX",
        label: getXLabel(),
        type: "number"
      });
    }

    if (yScale === "log") {
      columns.push({
        key: "logY",
        label: getYLabel(),
        type: "number"
      });
    }

    return columns;
  };

  return (
    <ToolContainer
      title="Data Plotting with Log Scaling"
      canvasWidth={12}
      canvasHeight={6}
    >
      {/* Main Data Table */}
      <GridTableInput
        x={0}
        y={0}
        w={3}
        h={4}
        data={tableData}
        onDataChange={handleDataChange}
        columns={getTableColumns()}
        title="Data Entry Table"
        theme={theme}
      />

      {/* Main Plot */}
      <GridGraph
        x={3}
        y={0}
        w={6}
        h={4}
        title="Data Plot"
        xLabel={getXLabel()}
        yLabel={getYLabel()}
        theme={theme}
        // TODO: Add actual data points and regression line
      />

      {/* Scaling Controls */}
      <GridButton
        x={9}
        y={0}
        w={1}
        h={1}
        variant={xScale === "log" ? "pressed" : "default"}
        onPress={handleXScaleToggle}
        theme={theme}
      >
        <div style={{ textAlign: "center", lineHeight: "1.1" }}>
          <div>X</div>
          <div>{xScale === "log" ? "Log" : "Linear"}</div>
        </div>
      </GridButton>

      <GridButton
        x={10}
        y={0}
        w={1}
        h={1}
        variant={yScale === "log" ? "pressed" : "default"}
        onPress={handleYScaleToggle}
        theme={theme}
      >
        <div style={{ textAlign: "center", lineHeight: "1.1" }}>
          <div>Y</div>
          <div>{yScale === "log" ? "Log" : "Linear"}</div>
        </div>
      </GridButton>

      {/* Log Base Selection */}
      <GridButton
        x={9}
        y={1}
        w={1}
        h={1}
        variant={logBase === "log10" ? "pressed" : "default"}
        onPress={() => handleLogBaseChange("log10")}
        theme={theme}
      >
        <div style={{ textAlign: "center", lineHeight: "1.1" }}>
          <div>Log</div>
          <div>Base 10</div>
        </div>
      </GridButton>

      <GridButton
        x={10}
        y={1}
        w={1}
        h={1}
        variant={logBase === "log2" ? "pressed" : "default"}
        onPress={() => handleLogBaseChange("log2")}
        theme={theme}
      >
        <div style={{ textAlign: "center", lineHeight: "1.1" }}>
          <div>Log</div>
          <div>Base 2</div>
        </div>
      </GridButton>

      <GridButton
        x={11}
        y={1}
        w={1}
        h={1}
        variant={logBase === "ln" ? "pressed" : "default"}
        onPress={() => handleLogBaseChange("ln")}
        theme={theme}
      >
        <div style={{ textAlign: "center", lineHeight: "1.1" }}>
          <div>Natural</div>
          <div>Log (ln)</div>
        </div>
      </GridButton>

      {/* Regression Controls */}
      <GridButton
        x={9}
        y={2}
        w={2}
        h={1}
        variant={showRegression ? "pressed" : "default"}
        onPress={handleRegressionToggle}
        theme={theme}
      >
        <div style={{ textAlign: "center", lineHeight: "1.1" }}>
          <div>{showRegression ? "Hide" : "Show"}</div>
          <div>Linear Regression</div>
        </div>
      </GridButton>

      {/* Regression Statistics Display */}
      <GridDisplay
        x={9}
        y={3}
        w={3}
        h={1}
        variant="info"
        align="left"
        fontSize="small"
        theme={theme}
      >
        <div style={{ padding: "4px" }}>
          {showRegression ? (
            <div style={{ fontSize: "0.85em" }}>
              <div>Slope (m): {regressionStats.slope.toFixed(3)}</div>
              <div>Intercept (b): {regressionStats.intercept.toFixed(3)}</div>
              <div>R²: {regressionStats.rSquared.toFixed(3)}</div>
            </div>
          ) : (
            <div style={{ fontSize: "0.9em", color: currentTheme === "dark" ? "#a0aec0" : "#718096" }}>
              Enable regression to see statistics
            </div>
          )}
        </div>
      </GridDisplay>

      {/* Instructions/Legend */}
      <GridLabel
        x={0}
        y={4}
        w={6}
        h={1}
        text="Enter data in the table above. Toggle between linear and logarithmic scaling for X and Y axes. Enable linear regression to see the line of best fit and correlation statistics."
        formulaMode={false}
        textAlign="left"
        fontSize="small"
        theme={theme}
      />

      {/* Current Settings Display */}
      <GridDisplay
        x={6}
        y={4}
        w={3}
        h={1}
        variant="status"
        align="center"
        fontSize="small"
        theme={theme}
      >
        <div style={{ padding: "4px" }}>
          <div style={{ fontWeight: "bold", marginBottom: "2px" }}>
            Current Settings
          </div>
          <div style={{ fontSize: "0.85em" }}>
            X-Axis: {xScale} | Y-Axis: {yScale}
            {(xScale === "log" || yScale === "log") && (
              <div>Log Base: {logBase}</div>
            )}
          </div>
        </div>
      </GridDisplay>

      {/* Data Point Count */}
      <GridDisplay
        x={9}
        y={4}
        w={3}
        h={1}
        variant="numeric"
        align="center"
        theme={theme}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "0.8em", opacity: 0.8 }}>Data Points</div>
          <div style={{ fontSize: "1.2em", fontWeight: "bold" }}>
            {tableData.length}
          </div>
        </div>
      </GridDisplay>

      {/* Action Buttons */}
      <GridButton
        x={0}
        y={5}
        w={2}
        h={1}
        onPress={() => {
          // TODO: Clear all data
          setTableData([]);
        }}
        theme={theme}
      >
        <div style={{ textAlign: "center", lineHeight: "1.1" }}>
          <div>Clear</div>
          <div>Data</div>
        </div>
      </GridButton>

      <GridButton
        x={2}
        y={5}
        w={2}
        h={1}
        onPress={() => {
          // TODO: Add sample data
          setTableData([
            { x: 1, y: 2 },
            { x: 2, y: 4 },
            { x: 3, y: 8 },
            { x: 4, y: 16 },
            { x: 5, y: 32 },
          ]);
        }}
        theme={theme}
      >
        <div style={{ textAlign: "center", lineHeight: "1.1" }}>
          <div>Load</div>
          <div>Sample</div>
        </div>
      </GridButton>
    </ToolContainer>
  );
};

export default DataPlottingTool;
