// src/tools/LogisticGrowthTool.jsx

import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  GridTableInput,
  GridGraph,
  GridButton,
  GridDisplay,
  GridSliderHorizontal,
  GridLabel,
} from "../components/grid";
import ToolContainer from "../components/ui/ToolContainer";
import { useTheme } from "../hooks/useTheme";
import Equation from "../components/Equation";

const LogisticGrowthTool = () => {
  const { theme, currentTheme } = useTheme();

  // Canvas ref for data visualization
  const canvasRef = useRef(null);

  // Data state
  const [tableData, setTableData] = useState([
    { t: "", P: "" },
    { t: "", P: "" },
    { t: "", P: "" },
    { t: "", P: "" },
    { t: "", P: "" },
    { t: "", P: "" },
    { t: "", P: "" },
    { t: "", P: "" },
    { t: "", P: "" },
    { t: "", P: "" },
  ]);

  // Parameter state
  const [k, setK] = useState(100); // Carrying capacity
  const [b, setB] = useState(1.0); // Growth rate (stretch)
  const [t0, setT0] = useState(0); // Time shift

  // Visualization state
  const [showRSS, setShowRSS] = useState(false);

  // Logistic solution function: P(t) = k * e^(b(t-t0)) / (1 + e^(b(t-t0)))
  const logisticSolution = useCallback(
    (t, kVal, bVal, t0Val) => {
      const u = Math.exp(bVal * (t - t0Val));
      return (kVal * u) / (1 + u);
    },
    [],
  );

  // Get valid data points
  const getValidDataPoints = useCallback(() => {
    return tableData
      .map((row) => ({
        t: parseFloat(row.t),
        P: parseFloat(row.P),
      }))
      .filter((point) => !isNaN(point.t) && !isNaN(point.P))
      .sort((a, b) => a.t - b.t);
  }, [tableData]);

  // Calculate RSS
  const calculateRSS = useCallback(() => {
    const points = getValidDataPoints();
    if (points.length === 0) return 0;

    let rss = 0;
    points.forEach((point) => {
      const predicted = logisticSolution(point.t, k, b, t0);
      const residual = point.P - predicted;
      rss += residual * residual;
    });

    return rss;
  }, [getValidDataPoints, logisticSolution, k, b, t0]);

  // Calculate axis ranges with buffer
  const axisRanges = useCallback(() => {
    const points = getValidDataPoints();

    let tMax = 10;
    let PMax = k * 1.1;

    if (points.length > 0) {
      const maxT = Math.max(...points.map((p) => p.t));
      const maxP = Math.max(...points.map((p) => p.P));
      tMax = Math.max(tMax, maxT * 1.1);
      PMax = Math.max(PMax, maxP * 1.1, k * 1.1);
    }

    return { tRange: [0, tMax], PRange: [0, PMax] };
  }, [getValidDataPoints, k]);

  // Generate nice tick marks
  const generateTicks = useCallback((min, max, targetCount = 5) => {
    const range = max - min;
    const rawStep = range / targetCount;

    // Round to nice numbers
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
      ticks.push(Math.round(tick * 1000000) / 1000000);
    }

    return ticks;
  }, []);

  // Draw data points and logistic curve
  const drawVisualization = useCallback(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const points = getValidDataPoints();
    const { tRange, PRange } = axisRanges();

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate canvas dimensions (account for axis padding)
    const paddingLeft = 45;
    const paddingRight = 15;
    const paddingTop = 15;
    const paddingBottom = 35;

    const plotWidth = canvas.width - paddingLeft - paddingRight;
    const plotHeight = canvas.height - paddingTop - paddingBottom;

    // Scaling functions
    const scaleX = (t) =>
      paddingLeft + ((t - tRange[0]) / (tRange[1] - tRange[0])) * plotWidth;
    const scaleY = (P) =>
      paddingTop +
      plotHeight -
      ((P - PRange[0]) / (PRange[1] - PRange[0])) * plotHeight;

    // Draw logistic curve (red)
    ctx.beginPath();
    ctx.strokeStyle = currentTheme === "dark" ? "#ef4444" : "#dc2626"; // Red
    ctx.lineWidth = 2;

    const numPoints = 500;
    for (let i = 0; i <= numPoints; i++) {
      const t = tRange[0] + (i / numPoints) * (tRange[1] - tRange[0]);
      const P = logisticSolution(t, k, b, t0);
      const x = scaleX(t);
      const y = scaleY(P);

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Draw carrying capacity line (green dashed)
    ctx.beginPath();
    ctx.strokeStyle = currentTheme === "dark" ? "#4ade80" : "#16a34a"; // Green
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    const kY = scaleY(k);
    ctx.moveTo(paddingLeft, kY);
    ctx.lineTo(paddingLeft + plotWidth, kY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw RSS squares if enabled
    if (showRSS && points.length > 0) {
      ctx.fillStyle =
        currentTheme === "dark"
          ? "rgba(100, 116, 139, 0.4)"
          : "rgba(71, 85, 105, 0.4)"; // Gray
      ctx.strokeStyle = currentTheme === "dark" ? "#64748b" : "#475569";
      ctx.lineWidth = 1;

      points.forEach((point) => {
        const predicted = logisticSolution(point.t, k, b, t0);
        const x1 = scaleX(point.t);
        const y1 = scaleY(point.P);
        const y2 = scaleY(predicted);

        const squareSize = Math.abs(y1 - y2);
        const isAbove = point.P > predicted;
        const x2 = isAbove ? x1 - squareSize : x1 + squareSize;

        ctx.fillRect(
          Math.min(x1, x2),
          Math.min(y1, y2),
          squareSize,
          squareSize,
        );
        ctx.strokeRect(
          Math.min(x1, x2),
          Math.min(y1, y2),
          squareSize,
          squareSize,
        );
      });
    }

    // Draw data points (blue circles)
    const pointColor = currentTheme === "dark" ? "#60a5fa" : "#2563eb"; // Blue
    points.forEach((point) => {
      ctx.fillStyle = pointColor;
      ctx.beginPath();
      ctx.arc(scaleX(point.t), scaleY(point.P), 5, 0, 2 * Math.PI);
      ctx.fill();

      // Add stroke for visibility
      ctx.strokeStyle = currentTheme === "dark" ? "#1e293b" : "#ffffff";
      ctx.lineWidth = 1;
      ctx.stroke();
    });
  }, [
    getValidDataPoints,
    axisRanges,
    logisticSolution,
    k,
    b,
    t0,
    showRSS,
    currentTheme,
  ]);

  // Initialize canvas and draw when data or parameters change
  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      drawVisualization();
    }
  }, [drawVisualization]);

  // Redraw when window resizes
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        drawVisualization();
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [drawVisualization]);

  // Handle data changes from table
  const handleDataChange = useCallback((newData) => {
    setTableData(newData);
  }, []);

  // Clear all data
  const handleClearData = useCallback(() => {
    setTableData(
      Array(10)
        .fill(null)
        .map(() => ({ t: "", P: "" })),
    );
  }, []);

  // Calculate current RSS
  const currentRSS = calculateRSS();
  const { tRange, PRange } = axisRanges();
  const tTicks = generateTicks(tRange[0], tRange[1]);
  const PTicks = generateTicks(PRange[0], PRange[1]);

  return (
    <ToolContainer
      title="Logistic Growth Model Explorer"
      canvasWidth={12}
      canvasHeight={6}
    >
      {/* Data Entry Table */}
      <GridTableInput
        x={0}
        y={0}
        w={3}
        h={5}
        data={tableData}
        onDataChange={handleDataChange}
        columns={[
          { key: "t", label: "Time (t)", type: "number", editable: true },
          { key: "P", label: "Population (P)", type: "number", editable: true },
        ]}
        title="Data Entry"
        theme={theme}
      />

      {/* Main Plot */}
      <GridGraph
        x={3}
        y={0}
        w={6}
        h={6}
        title="Population vs Time"
        xLabel="Time (t)"
        yLabel="Population (P)"
        xRange={tRange}
        yRange={PRange}
        xTicks={tTicks}
        yTicks={PTicks}
        theme={theme}
      >
        {/* Canvas overlay for visualization */}
        <canvas
          ref={canvasRef}
          className="absolute"
          style={{
            left: 1,
            bottom: 1,
            width: "calc(100% - 2px)",
            height: "calc(100% - 2px)",
            pointerEvents: "none",
          }}
        />
      </GridGraph>

      {/* Carrying Capacity Slider */}
      <GridSliderHorizontal
        x={9}
        y={0}
        w={3}
        h={1}
        value={k}
        onChange={setK}
        min={10}
        max={500}
        variant="unipolar"
        label={`Carrying capacity (k) = ${k.toFixed(1)}`}
        theme={theme}
      />

      {/* Growth Rate Slider */}
      <GridSliderHorizontal
        x={9}
        y={1}
        w={3}
        h={1}
        value={b * 50}
        onChange={(value) => setB(value / 50)}
        min={0.1 * 50}
        max={3.0 * 50}
        variant="unipolar"
        label={`Growth rate (b) = ${b.toFixed(2)}`}
        theme={theme}
      />

      {/* Time Shift Slider */}
      <GridSliderHorizontal
        x={9}
        y={2}
        w={3}
        h={1}
        value={t0 * 10 + 50}
        onChange={(value) => setT0((value - 50) / 10)}
        min={0}
        max={100}
        variant="bipolar"
        label={`Time shift (t₀) = ${t0.toFixed(2)}`}
        theme={theme}
      />

      {/* RSS Display */}
      <GridDisplay
        x={9}
        y={3}
        w={3}
        h={2}
        variant="info"
        align="center"
        fontSize="small"
        theme={theme}
      >
        <div style={{ padding: "4px" }}>
          <div style={{ fontWeight: "bold", marginBottom: "4px" }}>
            Model Statistics
          </div>
          <div style={{ fontSize: "0.9em", marginBottom: "4px" }}>
            Data Points: {getValidDataPoints().length}
          </div>
          <div style={{ fontSize: "0.85em" }}>
            Residual Sum of Squares:
          </div>
          <div
            style={{
              fontSize: "1.1em",
              fontWeight: "bold",
              marginTop: "4px",
              fontFamily: "monospace",
            }}
          >
            RSS = {currentRSS.toFixed(2)}
          </div>
        </div>
      </GridDisplay>

      {/* Equations Display */}
      <GridLabel
        x={3}
        y={5}
        w={6}
        h={1}
        theme={theme}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-around",
            height: "100%",
            gap: "20px",
          }}
        >
          <Equation name="logistic-differential" size="medium" />
          <Equation name="logistic-solution" size="medium" />
        </div>
      </GridLabel>

      {/* Clear Data Button */}
      <GridButton
        x={0}
        y={5}
        w={1}
        h={1}
        onPress={handleClearData}
        theme={theme}
      >
        <div style={{ textAlign: "center", lineHeight: "1.1" }}>
          <div>Clear</div>
          <div>Data</div>
        </div>
      </GridButton>

      {/* Show/Hide RSS Button */}
      <GridButton
        x={1}
        y={5}
        w={1}
        h={1}
        type="toggle"
        variant="function"
        active={showRSS}
        onToggle={setShowRSS}
        theme={theme}
      >
        <div style={{ textAlign: "center", lineHeight: "1.1" }}>
          <div>{showRSS ? "Hide" : "Show"}</div>
          <div>RSS</div>
        </div>
      </GridButton>
    </ToolContainer>
  );
};

export default LogisticGrowthTool;
