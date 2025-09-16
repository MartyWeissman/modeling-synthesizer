// src/tools/LinearRegressionLogScalingTool.jsx

import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  GridTableInput,
  GridGraph,
  GridButton,
  GridDisplay,
  GridLabel,
} from "../components/grid";
import ToolContainer from "../components/ui/ToolContainer";
import { useTheme } from "../hooks/useTheme";

const LinearRegressionLogScalingTool = () => {
  const { theme, currentTheme } = useTheme();

  // Canvas ref for data visualization
  const canvasRef = useRef(null);

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

  // Error state for invalid log operations
  const [logErrors, setLogErrors] = useState([]);

  // Regression state
  const [showRegression, setShowRegression] = useState(false);
  const [regressionStats, setRegressionStats] = useState({
    slope: 0,
    intercept: 0,
    rSquared: 0,
  });

  // Process data and check for log errors
  const processedData = useCallback(() => {
    const errors = [];
    const validPoints = [];

    tableData.forEach((row, index) => {
      const x = parseFloat(row.x);
      const y = parseFloat(row.y);

      if (isNaN(x) || isNaN(y)) return; // Skip invalid numbers

      // Check for log scale errors
      let hasError = false;
      if (xScale === "log" && x <= 0) {
        errors.push({ index, field: "x", value: x });
        hasError = true;
      }
      if (yScale === "log" && y <= 0) {
        errors.push({ index, field: "y", value: y });
        hasError = true;
      }

      if (!hasError) {
        const point = { x, y };

        // Add log-transformed values if needed
        if (xScale === "log") {
          point.logX = Math.log10(x); // Using log10 for now
        }
        if (yScale === "log") {
          point.logY = Math.log10(y);
        }

        validPoints.push(point);
      }
    });

    return { validPoints, errors };
  }, [tableData, xScale, yScale]);

  // Calculate axis ranges with 10% buffer
  const axisRanges = useCallback(() => {
    const { validPoints } = processedData();

    if (validPoints.length === 0) {
      return { xRange: [0, 10], yRange: [0, 10] };
    }

    // Get values based on current scaling
    const xValues = validPoints.map((p) => (xScale === "log" ? p.logX : p.x));
    const yValues = validPoints.map((p) => (yScale === "log" ? p.logY : p.y));

    const xMin = Math.min(...xValues);
    const xMax = Math.max(...xValues);
    const yMin = Math.min(...yValues);
    const yMax = Math.max(...yValues);

    // Add 10% buffer to high end, small buffer to low end
    const xRange =
      xMin === xMax
        ? [xMin - 1, xMax + 1]
        : [xMin - (xMax - xMin) * 0.05, xMax + (xMax - xMin) * 0.1];

    const yRange =
      yMin === yMax
        ? [yMin - 1, yMax + 1]
        : [yMin - (yMax - yMin) * 0.05, yMax + (yMax - yMin) * 0.1];

    return { xRange, yRange };
  }, [processedData, xScale, yScale]);

  // Generate nice tick marks for linear scale
  const generateLinearTicks = useCallback((min, max, targetCount = 5) => {
    const range = max - min;
    const rawStep = range / targetCount;

    // Round to nice numbers (1, 2, 5, 10, etc.)
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const normalizedStep = rawStep / magnitude;

    let niceStep;
    if (normalizedStep <= 1) niceStep = magnitude;
    else if (normalizedStep <= 2) niceStep = 2 * magnitude;
    else if (normalizedStep <= 5) niceStep = 5 * magnitude;
    else niceStep = 10 * magnitude;

    // Generate ticks
    const startTick = Math.ceil(min / niceStep) * niceStep;
    const ticks = [];
    for (let tick = startTick; tick <= max; tick += niceStep) {
      ticks.push(Math.round(tick * 1000000) / 1000000); // Avoid floating point errors
    }

    return ticks;
  }, []);

  // Generate tick marks for log scale
  const generateLogTicks = useCallback((min, max) => {
    const ticks = [];
    const minPower = Math.floor(min);
    const maxPower = Math.ceil(max);

    for (let power = minPower; power <= maxPower; power++) {
      ticks.push(power);
    }

    return ticks;
  }, []);

  // Generate axis ticks
  const axisTicks = useCallback(() => {
    const { xRange, yRange } = axisRanges();

    const xTicks =
      xScale === "log"
        ? generateLogTicks(xRange[0], xRange[1])
        : generateLinearTicks(xRange[0], xRange[1]);

    const yTicks =
      yScale === "log"
        ? generateLogTicks(yRange[0], yRange[1])
        : generateLinearTicks(yRange[0], yRange[1]);

    return { xTicks, yTicks };
  }, [axisRanges, xScale, yScale, generateLinearTicks, generateLogTicks]);

  // Handle data changes from table
  const handleDataChange = useCallback((newData) => {
    setTableData(newData);
    // TODO: Recalculate regression when data changes
  }, []);

  // Handle scaling changes with error checking
  const handleXScaleToggle = useCallback(() => {
    const newScale = xScale === "linear" ? "log" : "linear";

    // Check if switching to log would cause errors
    if (newScale === "log") {
      const hasNegative = tableData.some((row) => {
        const x = parseFloat(row.x);
        return !isNaN(x) && x <= 0;
      });

      if (hasNegative) {
        // Don't switch - show error indication
        setLogErrors((prev) => [
          ...prev.filter((e) => e.field !== "x"),
          ...tableData
            .map((row, index) => {
              const x = parseFloat(row.x);
              return !isNaN(x) && x <= 0
                ? { index, field: "x", value: x }
                : null;
            })
            .filter(Boolean),
        ]);
        return;
      }
    }

    setXScale(newScale);
    setLogErrors((prev) => prev.filter((e) => e.field !== "x"));
  }, [xScale, tableData]);

  const handleYScaleToggle = useCallback(() => {
    const newScale = yScale === "linear" ? "log" : "linear";

    // Check if switching to log would cause errors
    if (newScale === "log") {
      const hasNegative = tableData.some((row) => {
        const y = parseFloat(row.y);
        return !isNaN(y) && y <= 0;
      });

      if (hasNegative) {
        // Don't switch - show error indication
        setLogErrors((prev) => [
          ...prev.filter((e) => e.field !== "y"),
          ...tableData
            .map((row, index) => {
              const y = parseFloat(row.y);
              return !isNaN(y) && y <= 0
                ? { index, field: "y", value: y }
                : null;
            })
            .filter(Boolean),
        ]);
        return;
      }
    }

    setYScale(newScale);
    setLogErrors((prev) => prev.filter((e) => e.field !== "y"));
  }, [yScale, tableData]);

  // Handle log base changes
  const handleLogBaseChange = useCallback((base) => {
    setLogBase(base);
  }, []);

  // Handle regression toggle
  const handleRegressionToggle = useCallback(() => {
    setShowRegression((prev) => !prev);
    // TODO: Calculate regression when enabled
  }, []);

  // Draw data points on canvas
  const drawDataPoints = useCallback(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const { validPoints } = processedData();
    const { xRange, yRange } = axisRanges();

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate canvas dimensions (account for axis padding)
    const paddingLeft = 45;
    const paddingRight = 15;
    const paddingTop = 15;
    const paddingBottom = 35;

    const plotWidth = canvas.width - paddingLeft - paddingRight;
    const plotHeight = canvas.height - paddingTop - paddingBottom;

    // Theme-appropriate point color
    const pointColor = currentTheme === "dark" ? "#60a5fa" : "#2563eb"; // Blue-400 / Blue-600

    // Draw data points
    validPoints.forEach((point) => {
      // Get the values to plot based on current scaling
      const plotX = xScale === "log" ? point.logX : point.x;
      const plotY = yScale === "log" ? point.logY : point.y;

      // Convert to canvas coordinates
      const canvasX =
        paddingLeft +
        ((plotX - xRange[0]) / (xRange[1] - xRange[0])) * plotWidth;
      const canvasY =
        paddingTop +
        plotHeight -
        ((plotY - yRange[0]) / (yRange[1] - yRange[0])) * plotHeight;

      // Draw 5px circle
      ctx.fillStyle = pointColor;
      ctx.beginPath();
      ctx.arc(canvasX, canvasY, 5, 0, 2 * Math.PI);
      ctx.fill();

      // Optional: Add stroke for better visibility
      ctx.strokeStyle = currentTheme === "dark" ? "#1e293b" : "#ffffff";
      ctx.lineWidth = 1;
      ctx.stroke();
    });
  }, [processedData, axisRanges, xScale, yScale, currentTheme]);

  // Initialize canvas and draw points when data or scaling changes
  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      drawDataPoints();
    }
  }, [drawDataPoints]);

  // Redraw when window resizes
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        drawDataPoints();
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [drawDataPoints]);

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
    const columns = [];

    // Add Log(X) column first if X is log scale
    if (xScale === "log") {
      columns.push({
        key: "logX",
        label: getXLabel(),
        type: "number",
      });
    }

    // Add X column
    columns.push({ key: "x", label: "X", type: "number" });

    // Add Y column
    columns.push({ key: "y", label: "Y", type: "number" });

    // Add Log(Y) column last if Y is log scale
    if (yScale === "log") {
      columns.push({
        key: "logY",
        label: getYLabel(),
        type: "number",
      });
    }

    return columns;
  };

  return (
    <ToolContainer
      title="Linear Regression with Log Scaling"
      canvasWidth={11}
      canvasHeight={6}
    >
      {/* Main Data Table */}
      <GridTableInput
        x={0}
        y={0}
        w={3}
        h={5}
        data={tableData}
        onDataChange={handleDataChange}
        columns={getTableColumns()}
        title="Data Entry Table"
        theme={theme}
        errorHighlights={logErrors}
      />

      {/* Main Plot */}
      <GridGraph
        x={3}
        y={0}
        w={6}
        h={6}
        title="Data Plot"
        xLabel={getXLabel()}
        yLabel={getYLabel()}
        xRange={axisRanges().xRange}
        yRange={axisRanges().yRange}
        xTicks={axisTicks().xTicks}
        yTicks={axisTicks().yTicks}
        theme={theme}
      >
        {/* Canvas overlay for data points */}
        <canvas
          ref={canvasRef}
          className="absolute cursor-crosshair"
          style={{
            left: 1,
            bottom: 1,
            width: "calc(100% - 2px)",
            height: "calc(100% - 2px)",
            pointerEvents: "none",
          }}
        />
      </GridGraph>

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

      {/* Current Settings Display */}
      <GridDisplay
        x={9}
        y={1}
        w={2}
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
          </div>
        </div>
      </GridDisplay>

      {/* Action Buttons - Packed Tightly */}
      <GridButton
        x={0}
        y={5}
        w={1}
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
        x={1}
        y={5}
        w={1}
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

      {/* Regression Controls */}
      <GridButton
        x={2}
        y={5}
        w={1}
        h={1}
        variant={showRegression ? "pressed" : "default"}
        onPress={handleRegressionToggle}
        theme={theme}
      >
        <div style={{ textAlign: "center", lineHeight: "1.1" }}>
          <div>Fit Linear</div>
          <div>Model</div>
        </div>
      </GridButton>
    </ToolContainer>
  );
};

export default LinearRegressionLogScalingTool;
