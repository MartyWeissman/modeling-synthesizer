// src/tools/LinearRegressionLogScalingTool.jsx

import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  GridTableInput,
  GridGraph,
  GridButton,
  GridDisplay,
  GridLabel,
  GridWheelSelector,
} from "../components/grid";
import ToolContainer from "../components/ui/ToolContainer";
import { useTheme } from "../hooks/useTheme";
import {
  calculateLinearRegression,
  generateRegressionLine,
  validateRegressionData,
} from "../utils/mathHelpers";

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
  const [showVariance, setShowVariance] = useState(false);
  const [showRSS, setShowRSS] = useState(false);
  const [regressionStats, setRegressionStats] = useState({
    slope: 0,
    intercept: 0,
    rSquared: 0,
  });

  // Helper function to compute logarithm based on current base
  const computeLog = useCallback(
    (value) => {
      if (logBase === "log10") return Math.log10(value);
      if (logBase === "log2") return Math.log2(value);
      if (logBase === "ln") return Math.log(value);
      return Math.log10(value); // fallback
    },
    [logBase],
  );

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
          point.logX = computeLog(x);
        }
        if (yScale === "log") {
          point.logY = computeLog(y);
        }

        validPoints.push(point);
      }
    });

    return { validPoints, errors };
  }, [tableData, xScale, yScale, computeLog]);

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

  // Generate minor ticks for linear scale
  const generateLinearMinorTicks = useCallback((majorTicks) => {
    if (majorTicks.length < 1) return [];

    const minorTicks = [];

    // Include all major tick positions
    minorTicks.push(...majorTicks);

    if (majorTicks.length >= 2) {
      const stepSize = majorTicks[1] - majorTicks[0];
      const minorStepSize = stepSize / 5; // 5 minor divisions between major ticks

      for (let i = 0; i < majorTicks.length - 1; i++) {
        const start = majorTicks[i];
        const end = majorTicks[i + 1];

        // Add 4 minor ticks between each pair of major ticks
        for (let j = 1; j < 5; j++) {
          const minorTick = start + j * minorStepSize;
          if (minorTick < end) {
            minorTicks.push(minorTick);
          }
        }
      }
    }

    return minorTicks;
  }, []);

  // Generate minor ticks for log scale
  const generateLogMinorTicks = useCallback((majorTicks, min, max) => {
    const minorTicks = [];

    // Include all major tick positions
    minorTicks.push(...majorTicks);

    for (let i = 0; i < majorTicks.length; i++) {
      const power = majorTicks[i];
      const baseValue = Math.pow(10, power);

      // Add minor ticks at 2, 3, 4, 5, 6, 7, 8, 9 times the base value
      for (let multiplier = 2; multiplier <= 9; multiplier++) {
        const minorValue = baseValue * multiplier;
        const logMinorValue = Math.log10(minorValue);

        // Only include if within range
        if (logMinorValue >= min && logMinorValue <= max) {
          minorTicks.push(logMinorValue);
        }
      }
    }

    return minorTicks;
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

    // Generate minor ticks
    const xMinorTicks =
      xScale === "log"
        ? generateLogMinorTicks(xTicks, xRange[0], xRange[1])
        : generateLinearMinorTicks(xTicks);

    const yMinorTicks =
      yScale === "log"
        ? generateLogMinorTicks(yTicks, yRange[0], yRange[1])
        : generateLinearMinorTicks(yTicks);

    return { xTicks, yTicks, xMinorTicks, yMinorTicks };
  }, [
    axisRanges,
    xScale,
    yScale,
    generateLinearTicks,
    generateLogTicks,
    generateLinearMinorTicks,
    generateLogMinorTicks,
  ]);

  // Calculate regression statistics (must be before functions that reference it)
  const calculateRegression = useCallback(() => {
    const { validPoints } = processedData();

    if (validPoints.length < 2) {
      return {
        slope: 0,
        intercept: 0,
        rSquared: 0,
        isValid: false,
      };
    }

    // Create points for regression based on current scaling
    const regressionPoints = validPoints.map((point) => ({
      x: xScale === "log" ? point.logX : point.x,
      y: yScale === "log" ? point.logY : point.y,
    }));

    // Validate and calculate regression
    const validation = validateRegressionData(regressionPoints);
    if (!validation.isValid) {
      console.warn("Regression validation failed:", validation.error);
      return {
        slope: 0,
        intercept: 0,
        rSquared: 0,
        isValid: false,
      };
    }

    return calculateLinearRegression(regressionPoints);
  }, [processedData, xScale, yScale]);

  // Handle data changes from table
  const handleDataChange = useCallback(
    (newData) => {
      setTableData(newData);

      // Recalculate regression if it's currently enabled
      if (showRegression) {
        // Use setTimeout to ensure state has updated before calculating
        setTimeout(() => {
          const regression = calculateRegression();
          setRegressionStats(regression);
        }, 0);
      }
    },
    [showRegression, calculateRegression],
  );

  // Handle scaling changes - toggle off regression when changing scales
  const handleXScaleToggle = useCallback(() => {
    setXScale((prev) => (prev === "linear" ? "log" : "linear"));
    // Turn off regression when changing scales
    setShowRegression(false);
  }, []);

  const handleYScaleToggle = useCallback(() => {
    setYScale((prev) => (prev === "linear" ? "log" : "linear"));
    // Turn off regression when changing scales
    setShowRegression(false);
  }, []);

  // Handle log base changes
  const handleLogBaseChange = useCallback((base) => {
    setLogBase(base);
  }, []);

  // Update errors when data processing changes (including logarithm base changes)
  useEffect(() => {
    const { errors } = processedData();
    setLogErrors(errors);
  }, [processedData]);

  // Recalculate regression when logarithm base changes
  useEffect(() => {
    if (showRegression) {
      const regression = calculateRegression();
      setRegressionStats(regression);
    }
  }, [logBase, showRegression, calculateRegression]);

  // Handle regression toggle
  const handleRegressionToggle = useCallback(() => {
    const newShowRegression = !showRegression;
    setShowRegression(newShowRegression);

    if (newShowRegression) {
      // Calculate and update regression statistics
      const regression = calculateRegression();
      setRegressionStats(regression);
    }
  }, [showRegression, calculateRegression]);

  // Draw data points on canvas
  const drawDataPoints = useCallback(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const { validPoints } = processedData();
    const { xRange, yRange } = axisRanges();
    const { xMinorTicks, yMinorTicks } = axisTicks();

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate canvas dimensions (account for axis padding)
    const paddingLeft = 45;
    const paddingRight = 15;
    const paddingTop = 15;
    const paddingBottom = 35;

    const plotWidth = canvas.width - paddingLeft - paddingRight;
    const plotHeight = canvas.height - paddingTop - paddingBottom;

    // Draw minor grid lines first (so they appear in the background)
    const minorGridColor =
      currentTheme === "dark"
        ? "rgba(100, 116, 139, 0.6)" // Higher contrast gray for dark mode
        : "rgba(148, 163, 184, 0.7)"; // Higher contrast gray for light mode

    ctx.strokeStyle = minorGridColor;
    ctx.lineWidth = 0.5;
    ctx.setLineDash([2, 2]); // Subtle dashed lines

    // Draw vertical minor grid lines
    xMinorTicks.forEach((tick) => {
      const canvasX =
        paddingLeft +
        ((tick - xRange[0]) / (xRange[1] - xRange[0])) * plotWidth;
      ctx.beginPath();
      ctx.moveTo(canvasX, paddingTop);
      ctx.lineTo(canvasX, paddingTop + plotHeight);
      ctx.stroke();
    });

    // Draw horizontal minor grid lines
    yMinorTicks.forEach((tick) => {
      const canvasY =
        paddingTop +
        plotHeight -
        ((tick - yRange[0]) / (yRange[1] - yRange[0])) * plotHeight;
      ctx.beginPath();
      ctx.moveTo(paddingLeft, canvasY);
      ctx.lineTo(paddingLeft + plotWidth, canvasY);
      ctx.stroke();
    });

    // Reset line style for other elements
    ctx.setLineDash([]);

    // Draw regression line first (so it appears behind points)
    if (showRegression && regressionStats.isValid) {
      const regressionLinePoints = generateRegressionLine(
        regressionStats.slope,
        regressionStats.intercept,
        xRange,
        100,
      );

      ctx.strokeStyle = currentTheme === "dark" ? "#ef4444" : "#dc2626"; // Red-400 / Red-600
      ctx.lineWidth = 2;
      ctx.beginPath();

      regressionLinePoints.forEach((point, index) => {
        // Convert to canvas coordinates
        const canvasX =
          paddingLeft +
          ((point.x - xRange[0]) / (xRange[1] - xRange[0])) * plotWidth;
        const canvasY =
          paddingTop +
          plotHeight -
          ((point.y - yRange[0]) / (yRange[1] - yRange[0])) * plotHeight;

        if (index === 0) {
          ctx.moveTo(canvasX, canvasY);
        } else {
          ctx.lineTo(canvasX, canvasY);
        }
      });
      ctx.stroke();
    }

    // Draw TSS visualization if enabled
    if (showVariance) {
      // Calculate mean Y value (based on current scaling)
      const yValues = validPoints.map((p) => (yScale === "log" ? p.logY : p.y));
      const yMean = yValues.reduce((sum, y) => sum + y, 0) / yValues.length;

      // Draw green horizontal line at mean
      const meanY =
        paddingTop +
        plotHeight -
        ((yMean - yRange[0]) / (yRange[1] - yRange[0])) * plotHeight;
      ctx.strokeStyle = currentTheme === "dark" ? "#4ade80" : "#16a34a"; // Green-400 / Green-600
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(paddingLeft, meanY);
      ctx.lineTo(paddingLeft + plotWidth, meanY);
      ctx.stroke();

      // Draw TSS squares
      validPoints.forEach((point) => {
        const plotX = xScale === "log" ? point.logX : point.x;
        const plotY = yScale === "log" ? point.logY : point.y;

        const dataX =
          paddingLeft +
          ((plotX - xRange[0]) / (xRange[1] - xRange[0])) * plotWidth;
        const dataY =
          paddingTop +
          plotHeight -
          ((plotY - yRange[0]) / (yRange[1] - yRange[0])) * plotHeight;

        const varianceHeight = Math.abs(dataY - meanY);
        const squareSize = varianceHeight;

        // Square extends from data point to mean line, then horizontally
        const startX = dataX;
        const startY = plotY < yMean ? meanY : dataY; // Start from mean if below, from data point if above

        // Draw green square
        ctx.fillStyle =
          currentTheme === "dark"
            ? "rgba(74, 222, 128, 0.3)"
            : "rgba(22, 163, 74, 0.3)"; // Green with transparency
        ctx.strokeStyle = currentTheme === "dark" ? "#4ade80" : "#16a34a";
        ctx.lineWidth = 1;

        ctx.fillRect(startX, startY, squareSize, varianceHeight);
        ctx.strokeRect(startX, startY, squareSize, varianceHeight);
      });
    }

    // Draw RSS squares if enabled
    if (showRSS && showRegression && regressionStats.isValid) {
      validPoints.forEach((point) => {
        // Get the values to plot based on current scaling
        const plotX = xScale === "log" ? point.logX : point.x;
        const plotY = yScale === "log" ? point.logY : point.y;

        // Calculate predicted value
        const predictedY =
          regressionStats.slope * plotX + regressionStats.intercept;
        const residual = plotY - predictedY;

        // Convert to canvas coordinates
        const dataX =
          paddingLeft +
          ((plotX - xRange[0]) / (xRange[1] - xRange[0])) * plotWidth;
        const dataY =
          paddingTop +
          plotHeight -
          ((plotY - yRange[0]) / (yRange[1] - yRange[0])) * plotHeight;
        const predY =
          paddingTop +
          plotHeight -
          ((predictedY - yRange[0]) / (yRange[1] - yRange[0])) * plotHeight;

        // Calculate square size based on residual magnitude
        const residualHeight = Math.abs(dataY - predY);
        const squareSize = residualHeight; // Make it a true square

        // Determine direction: left if r*m > 0, right if r*m < 0
        const rm = residual * regressionStats.slope;
        const goLeft = rm > 0;

        // Square extends from data point to regression line, then left/right
        // If point is below line (residual < 0), square goes upward from data point
        // If point is above line (residual > 0), square goes downward from data point
        const startX = goLeft ? dataX - squareSize : dataX;
        const startY = residual < 0 ? predY : dataY;

        // Draw blue square
        ctx.fillStyle =
          currentTheme === "dark"
            ? "rgba(96, 165, 250, 0.3)"
            : "rgba(37, 99, 235, 0.3)"; // Blue with transparency
        ctx.strokeStyle = currentTheme === "dark" ? "#60a5fa" : "#2563eb";
        ctx.lineWidth = 1;

        ctx.fillRect(startX, startY, squareSize, residualHeight);
        ctx.strokeRect(startX, startY, squareSize, residualHeight);
      });
    }

    // Theme-appropriate point color
    const pointColor = currentTheme === "dark" ? "#60a5fa" : "#2563eb"; // Blue-400 / Blue-600

    // Draw data points on top of regression line and RSS squares
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
  }, [
    processedData,
    axisRanges,
    axisTicks,
    xScale,
    yScale,
    currentTheme,
    showRegression,
    showVariance,
    showRSS,
    regressionStats,
  ]);

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

  // Calculate axis labels based on current settings with proper subscripts
  const getXLabel = () => {
    if (xScale === "log") {
      const baseSubscript =
        logBase === "log10" ? "₁₀" : logBase === "log2" ? "₂" : "";
      return logBase === "ln" ? "ln(X)" : `log${baseSubscript}(X)`;
    }
    return "X";
  };

  const getYLabel = () => {
    if (yScale === "log") {
      const baseSubscript =
        logBase === "log10" ? "₁₀" : logBase === "log2" ? "₂" : "";
      return logBase === "ln" ? "ln(Y)" : `log${baseSubscript}(Y)`;
    }
    return "Y";
  };

  // Generate variable names for regression equation
  const getRegressionVariableName = (scale, variable) => {
    if (scale === "log") {
      const baseSubscript =
        logBase === "log10" ? "₁₀" : logBase === "log2" ? "₂" : "";
      return logBase === "ln"
        ? `ln(${variable})`
        : `log${baseSubscript}(${variable})`;
    }
    return variable;
  };

  // Format regression equation with proper notation
  const formatRegressionEquation = useCallback(() => {
    if (!showRegression || !regressionStats.isValid) return "";

    const yVar = getRegressionVariableName(yScale, "y");
    const xVar = getRegressionVariableName(xScale, "x");

    // Format numbers to 3 significant figures
    const slope = parseFloat(regressionStats.slope.toPrecision(3));
    const intercept = parseFloat(regressionStats.intercept.toPrecision(3));

    // Format the slope coefficient
    let slopeStr;
    if (slope === 1) {
      slopeStr = "";
    } else if (slope === -1) {
      slopeStr = "-";
    } else {
      slopeStr = slope.toString();
    }

    // Format the intercept
    let interceptStr;
    if (intercept === 0) {
      interceptStr = "";
    } else if (intercept > 0) {
      interceptStr = ` + ${intercept}`;
    } else {
      interceptStr = ` - ${Math.abs(intercept)}`;
    }

    return `${yVar} ≈ ${slopeStr}${xVar}${interceptStr}`;
  }, [showRegression, regressionStats, yScale, xScale, logBase]);

  // Process table data to include computed log values
  const getProcessedTableData = useCallback(() => {
    return tableData.map((row, index) => {
      const processedRow = { ...row };

      // Compute Log(X) if X scaling is log
      if (xScale === "log") {
        const x = parseFloat(row.x);
        if (!isNaN(x) && x > 0) {
          processedRow.logX = computeLog(x).toFixed(3);
        } else {
          processedRow.logX = ""; // Will be handled as error
        }
      }

      // Compute Log(Y) if Y scaling is log
      if (yScale === "log") {
        const y = parseFloat(row.y);
        if (!isNaN(y) && y > 0) {
          processedRow.logY = computeLog(y).toFixed(3);
        } else {
          processedRow.logY = ""; // Will be handled as error
        }
      }

      return processedRow;
    });
  }, [tableData, xScale, yScale, computeLog]);

  // Define table columns based on current scaling
  const getTableColumns = () => {
    const columns = [];

    // Add Log(X) column first if X is log scale
    if (xScale === "log") {
      columns.push({
        key: "logX",
        label: getXLabel(),
        type: "computed", // New type for computed values
        editable: false,
      });
    }

    // Add X column
    columns.push({ key: "x", label: "X", type: "number", editable: true });

    // Add Y column
    columns.push({ key: "y", label: "Y", type: "number", editable: true });

    // Add Log(Y) column last if Y is log scale
    if (yScale === "log") {
      columns.push({
        key: "logY",
        label: getYLabel(),
        type: "computed", // New type for computed values
        editable: false,
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
        data={getProcessedTableData()}
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
        type="toggle"
        variant="function"
        active={xScale === "log"}
        onToggle={handleXScaleToggle}
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
        type="toggle"
        variant="function"
        active={yScale === "log"}
        onToggle={handleYScaleToggle}
        theme={theme}
      >
        <div style={{ textAlign: "center", lineHeight: "1.1" }}>
          <div>Y</div>
          <div>{yScale === "log" ? "Log" : "Linear"}</div>
        </div>
      </GridButton>

      {/* Regression Statistics Display */}
      <GridDisplay
        x={9}
        y={1}
        w={2}
        h={2}
        variant="info"
        align="center"
        fontSize="small"
        theme={theme}
      >
        <div style={{ padding: "4px" }}>
          <div>
            <div style={{ fontWeight: "bold", marginBottom: "2px" }}>
              Data Analysis
            </div>
            <div style={{ fontSize: "0.85em", marginBottom: "4px" }}>
              N = {processedData().validPoints.length}
            </div>
            {showRegression && regressionStats.isValid ? (
              <div>
                <div style={{ fontSize: "0.8em", lineHeight: "1.2" }}>
                  <div>Slope: {regressionStats.slope.toFixed(3)}</div>
                  <div>Intercept: {regressionStats.intercept.toFixed(3)}</div>
                  <div>R²: {regressionStats.rSquared.toFixed(3)}</div>
                </div>
                <div
                  style={{
                    marginTop: "6px",
                    padding: "2px",
                    fontSize: "0.85em",
                    fontFamily: "monospace",
                    backgroundColor:
                      currentTheme === "dark"
                        ? "rgba(0,0,0,0.2)"
                        : "rgba(255,255,255,0.3)",
                    borderRadius: "2px",
                    textAlign: "center",
                  }}
                >
                  {formatRegressionEquation()}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </GridDisplay>

      {/* Logarithm Base Selector */}
      <GridWheelSelector
        x={9}
        y={3}
        w={2}
        h={1}
        value={
          logBase === "log10"
            ? "Base 10"
            : logBase === "log2"
              ? "Base 2"
              : "Natural (Base e)"
        }
        onChange={(displayValue) => {
          if (displayValue === "Base 10") setLogBase("log10");
          else if (displayValue === "Base 2") setLogBase("log2");
          else if (displayValue === "Natural (Base e)") setLogBase("ln");
        }}
        options={["Base 10", "Base 2", "Natural (Base e)"]}
        title="Logarithm base"
        theme={theme}
      />

      {/* TSS Visualization Toggle */}
      <GridButton
        x={9}
        y={4}
        w={1}
        h={1}
        type="toggle"
        variant="function"
        active={showVariance}
        onToggle={setShowVariance}
        theme={theme}
        title="Total Sum of Squares"
      >
        <div style={{ textAlign: "center", lineHeight: "1.1" }}>
          <div>{showVariance ? "Hide" : "Show"}</div>
          <div>TSS</div>
        </div>
      </GridButton>

      {/* RSS Visualization Toggle */}
      <GridButton
        x={10}
        y={4}
        w={1}
        h={1}
        type="toggle"
        variant="function"
        active={showRSS}
        onToggle={setShowRSS}
        theme={theme}
        title="Residual Sum of Squares"
      >
        <div style={{ textAlign: "center", lineHeight: "1.1" }}>
          <div>{showRSS ? "Hide" : "Show"}</div>
          <div>RSS</div>
        </div>
      </GridButton>

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
        type="toggle"
        variant="function"
        active={showRegression}
        onToggle={handleRegressionToggle}
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
