// src/tools/LinearRegressionLogScalingTool.jsx

import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
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
import { niceTicks, linearTicks } from "../utils/ticks";
import { setupCanvas } from "../utils/canvas";

// Example exponential data (y = 2^x), loaded at start and by "Load Sample"
const SAMPLE_DATA = [
  { x: 1, y: 2 },
  { x: 2, y: 4 },
  { x: 3, y: 8 },
  { x: 4, y: 16 },
  { x: 5, y: 32 },
];

/** Statistic to 3 decimals, never "-0.000". */
const formatStat = (v) => {
  const s = v.toFixed(3);
  return /^-0\.0+$/.test(s) ? s.slice(1) : s;
};

const LinearRegressionLogScalingTool = () => {
  const { theme, currentTheme } = useTheme();

  // Canvas ref for data visualization
  const canvasRef = useRef(null);
  // Transform ref for coordinate conversion
  const transformRef = useRef(null);

  // Data state
  const [tableData, setTableData] = useState(SAMPLE_DATA);

  // Scaling options state
  const [xScale, setXScale] = useState("linear"); // "linear" or "log"
  const [yScale, setYScale] = useState("linear"); // "linear" or "log"
  const [logBase, setLogBase] = useState("log10"); // "log10", "log2", "ln"

  // Regression state
  const [showRegression, setShowRegression] = useState(false);
  const [showVariance, setShowVariance] = useState(false);
  const [showRSS, setShowRSS] = useState(false);

  // Logarithm in the selected base
  const computeLog = useCallback(
    (value) => {
      if (logBase === "log2") return Math.log2(value);
      if (logBase === "ln") return Math.log(value);
      return Math.log10(value);
    },
    [logBase],
  );

  // Parse the table, flag values that can't be log-transformed, and compute
  // the plotted coordinates (px, py) in the current scaling.
  const { validPoints, logErrors } = useMemo(() => {
    const errors = [];
    const points = [];
    tableData.forEach((row, index) => {
      const x = parseFloat(row.x);
      const y = parseFloat(row.y);
      if (isNaN(x) || isNaN(y)) return; // skip incomplete rows

      let hasError = false;
      if (xScale === "log" && x <= 0) {
        errors.push({ index, field: "x", value: x });
        hasError = true;
      }
      if (yScale === "log" && y <= 0) {
        errors.push({ index, field: "y", value: y });
        hasError = true;
      }
      if (hasError) return;

      points.push({
        x,
        y,
        px: xScale === "log" ? computeLog(x) : x,
        py: yScale === "log" ? computeLog(y) : y,
      });
    });
    return { validPoints: points, logErrors: errors };
  }, [tableData, xScale, yScale, computeLog]);

  // Axis ranges: small margin below, 10% above
  const { xRange, yRange } = useMemo(() => {
    if (validPoints.length === 0) {
      return { xRange: [0, 10], yRange: [0, 10] };
    }
    const pad = (values) => {
      const min = Math.min(...values);
      const max = Math.max(...values);
      return min === max
        ? [min - 1, max + 1]
        : [min - (max - min) * 0.05, max + (max - min) * 0.1];
    };
    return {
      xRange: pad(validPoints.map((p) => p.px)),
      yRange: pad(validPoints.map((p) => p.py)),
    };
  }, [validPoints]);

  // Ticks: "nice" values inside the axis range, in the plotted units (for a
  // log axis these are values of the logarithm, matching the axis label
  // log(X) or ln(X)). Grid lines at every tick plus 4 subdivisions.
  const { xTicks, yTicks, xGridLines, yGridLines } = useMemo(() => {
    const gridLines = (ticks, [min, max]) => {
      if (ticks.length < 2) return ticks;
      const step = ticks[1] - ticks[0];
      return linearTicks(min, max, step / 5);
    };
    const xt = niceTicks(xRange[0], xRange[1], 5);
    const yt = niceTicks(yRange[0], yRange[1], 5);
    return {
      xTicks: xt,
      yTicks: yt,
      xGridLines: gridLines(xt, xRange),
      yGridLines: gridLines(yt, yRange),
    };
  }, [xRange, yRange]);

  // Least-squares line in the current coordinates. Derived from the data
  // (never stale); near-zero results are shown as 0 (e.g. not −1.78e-16).
  const regression = useMemo(() => {
    const invalid = { slope: 0, intercept: 0, rSquared: 0, isValid: false };
    if (validPoints.length < 2) return invalid;
    const pts = validPoints.map((p) => ({ x: p.px, y: p.py }));
    if (!validateRegressionData(pts).isValid) return invalid;
    const fit = calculateLinearRegression(pts);
    if (!fit.isValid) return fit;
    const maxAbsX = Math.max(...pts.map((p) => Math.abs(p.x)), 1e-300);
    const maxAbsY = Math.max(...pts.map((p) => Math.abs(p.y)), 1e-300);
    const snap = (v, scale) => (Math.abs(v) < 1e-9 * scale ? 0 : v);
    return {
      ...fit,
      slope: snap(fit.slope, maxAbsY / maxAbsX),
      intercept: snap(fit.intercept, maxAbsY),
    };
  }, [validPoints]);

  // Handle data changes from table
  const handleDataChange = useCallback((newData) => {
    setTableData(newData);
  }, []);

  // Scale toggles keep the fit on; it is recomputed for the new coordinates.
  const handleXScaleToggle = useCallback(() => {
    setXScale((prev) => (prev === "linear" ? "log" : "linear"));
  }, []);

  const handleYScaleToggle = useCallback(() => {
    setYScale((prev) => (prev === "linear" ? "log" : "linear"));
  }, []);

  // The RSS squares measure distances to the fitted line, so showing them
  // turns the fit on, and turning the fit off hides them.
  const handleRegressionToggle = useCallback((on) => {
    setShowRegression(on);
    if (!on) setShowRSS(false);
  }, []);

  const handleRSSToggle = useCallback((on) => {
    setShowRSS(on);
    if (on) setShowRegression(true);
  }, []);

  // Draw data points on canvas
  const drawDataPoints = useCallback(() => {
    const transform = transformRef.current;
    if (!canvasRef.current || !transform) return;

    const { dataToPixel, plotWidth, plotHeight } = transform;
    const setup = setupCanvas(canvasRef.current, {
      width: plotWidth,
      height: plotHeight,
    });
    if (!setup) return;
    const { ctx, width, height } = setup;
    ctx.clearRect(0, 0, width, height);

    // Grid lines first (so they appear in the background)
    ctx.strokeStyle =
      currentTheme === "dark"
        ? "rgba(100, 116, 139, 0.6)"
        : "rgba(148, 163, 184, 0.7)";
    ctx.lineWidth = 0.5;
    ctx.setLineDash([2, 2]);
    xGridLines.forEach((tick) => {
      const top = dataToPixel(tick, yRange[1]);
      const bottom = dataToPixel(tick, yRange[0]);
      ctx.beginPath();
      ctx.moveTo(top.x, top.y);
      ctx.lineTo(bottom.x, bottom.y);
      ctx.stroke();
    });
    yGridLines.forEach((tick) => {
      const left = dataToPixel(xRange[0], tick);
      const right = dataToPixel(xRange[1], tick);
      ctx.beginPath();
      ctx.moveTo(left.x, left.y);
      ctx.lineTo(right.x, right.y);
      ctx.stroke();
    });
    ctx.setLineDash([]);

    // Regression line (behind the points)
    if (showRegression && regression.isValid) {
      const linePoints = generateRegressionLine(
        regression.slope,
        regression.intercept,
        xRange,
        100,
      );
      ctx.strokeStyle = currentTheme === "dark" ? "#ef4444" : "#dc2626";
      ctx.lineWidth = 2;
      ctx.beginPath();
      linePoints.forEach((point, index) => {
        const pixel = dataToPixel(point.x, point.y);
        if (index === 0) ctx.moveTo(pixel.x, pixel.y);
        else ctx.lineTo(pixel.x, pixel.y);
      });
      ctx.stroke();
    }

    // TSS: mean line and squares from each point to the mean
    if (showVariance && validPoints.length > 0) {
      const yMean =
        validPoints.reduce((sum, p) => sum + p.py, 0) / validPoints.length;
      const meanLeft = dataToPixel(xRange[0], yMean);
      const meanRight = dataToPixel(xRange[1], yMean);
      ctx.strokeStyle = currentTheme === "dark" ? "#4ade80" : "#16a34a";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(meanLeft.x, meanLeft.y);
      ctx.lineTo(meanRight.x, meanRight.y);
      ctx.stroke();

      validPoints.forEach((point) => {
        const dataPixel = dataToPixel(point.px, point.py);
        const meanPixel = dataToPixel(point.px, yMean);
        const side = Math.abs(dataPixel.y - meanPixel.y);
        const startY = point.py < yMean ? meanPixel.y : dataPixel.y;
        ctx.fillStyle =
          currentTheme === "dark"
            ? "rgba(74, 222, 128, 0.3)"
            : "rgba(22, 163, 74, 0.3)";
        ctx.strokeStyle = currentTheme === "dark" ? "#4ade80" : "#16a34a";
        ctx.lineWidth = 1;
        ctx.fillRect(dataPixel.x, startY, side, side);
        ctx.strokeRect(dataPixel.x, startY, side, side);
      });
    }

    // RSS: squares from each point to the fitted line
    if (showRSS && regression.isValid) {
      validPoints.forEach((point) => {
        const predictedY = regression.slope * point.px + regression.intercept;
        const residual = point.py - predictedY;
        const dataPixel = dataToPixel(point.px, point.py);
        const predPixel = dataToPixel(point.px, predictedY);
        const side = Math.abs(dataPixel.y - predPixel.y);
        // Square extends away from the line: left if residual·slope > 0
        const goLeft = residual * regression.slope > 0;
        const startX = goLeft ? dataPixel.x - side : dataPixel.x;
        const startY = residual < 0 ? predPixel.y : dataPixel.y;
        ctx.fillStyle =
          currentTheme === "dark"
            ? "rgba(96, 165, 250, 0.3)"
            : "rgba(37, 99, 235, 0.3)";
        ctx.strokeStyle = currentTheme === "dark" ? "#60a5fa" : "#2563eb";
        ctx.lineWidth = 1;
        ctx.fillRect(startX, startY, side, side);
        ctx.strokeRect(startX, startY, side, side);
      });
    }

    // Data points on top
    const pointColor = currentTheme === "dark" ? "#60a5fa" : "#2563eb";
    validPoints.forEach((point) => {
      const pixel = dataToPixel(point.px, point.py);
      ctx.fillStyle = pointColor;
      ctx.beginPath();
      ctx.arc(pixel.x, pixel.y, 5, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = currentTheme === "dark" ? "#1e293b" : "#ffffff";
      ctx.lineWidth = 1;
      ctx.stroke();
    });
  }, [
    validPoints,
    xRange,
    yRange,
    xGridLines,
    yGridLines,
    currentTheme,
    showRegression,
    showVariance,
    showRSS,
    regression,
  ]);

  // Redraw after every render (the plot area can change size with the tick
  // labels, so this is simplest and cheap)
  useEffect(() => {
    drawDataPoints();
  });

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
  const formatRegressionEquation = () => {
    if (!showRegression || !regression.isValid) return "";

    const yVar = getRegressionVariableName(yScale, "Y");
    const xVar = getRegressionVariableName(xScale, "X");

    // Format numbers to 3 significant figures
    const slope = parseFloat(regression.slope.toPrecision(3));
    const intercept = parseFloat(regression.intercept.toPrecision(3));

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
  };

  // Process table data to include computed log values
  const getProcessedTableData = useCallback(() => {
    return tableData.map((row) => {
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
        xRange={xRange}
        yRange={yRange}
        xTicks={xTicks}
        yTicks={yTicks}
        theme={theme}
      >
        {(transform) => {
          transformRef.current = transform;
          return (
            <canvas
              ref={canvasRef}
              className="absolute"
              style={{
                ...transform.plotStyle,
                pointerEvents: "none",
              }}
            />
          );
        }}
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
              N = {validPoints.length}
            </div>
            {showRegression && regression.isValid ? (
              <div>
                <div style={{ fontSize: "0.8em", lineHeight: "1.2" }}>
                  <div>Slope: {formatStat(regression.slope)}</div>
                  <div>Intercept: {formatStat(regression.intercept)}</div>
                  <div>R²: {formatStat(regression.rSquared)}</div>
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
        onToggle={handleRSSToggle}
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
        onPress={() => setTableData([])}
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
        onPress={() => setTableData(SAMPLE_DATA)}
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
