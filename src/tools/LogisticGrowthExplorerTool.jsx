// src/tools/LogisticGrowthExplorerTool.jsx

import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  GridTableInput,
  GridGraph,
  GridButton,
  GridDisplay,
  GridSliderHorizontal,
  GridLabel,
  GridInput,
} from "../components/grid";
import ToolContainer from "../components/ui/ToolContainer";
import Equation from "../components/Equation";
import { useTheme } from "../hooks/useTheme";

const LogisticGrowthExplorerTool = () => {
  const { theme, currentTheme } = useTheme();

  // Canvas and transform refs
  const canvasRef = useRef(null);
  const transformRef = useRef(null);

  // Parameters for logistic growth model
  // P(t) = C * e^(b(t-t0)) / (1 + e^(b(t-t0)))
  const [C, setC] = useState(100); // Carrying capacity
  const [b, setB] = useState(0.5); // Growth rate (stretch parameter)
  const [t0, setT0] = useState(10); // Time shift

  // Data table state - initial empty data
  const [tableData, setTableData] = useState([
    { t: "", P: "" },
    { t: "", P: "" },
    { t: "", P: "" },
    { t: "", P: "" },
    { t: "", P: "" },
    { t: "", P: "" },
    { t: "", P: "" },
    { t: "", P: "" },
  ]);

  // RSS visualization toggle
  const [showRSS, setShowRSS] = useState(false);

  // RSS value for display
  const [rssValue, setRssValue] = useState(0);

  // Logistic growth function
  const logisticFunction = useCallback(
    (t) => {
      const exponent = b * (t - t0);
      // Prevent overflow for large exponents
      if (exponent > 100) return C;
      if (exponent < -100) return 0;
      return (C * Math.exp(exponent)) / (1 + Math.exp(exponent));
    },
    [C, b, t0],
  );

  // Calculate axis ranges based on data and model
  const calculateAxisRanges = useCallback(() => {
    // Get valid data points
    const validPoints = tableData
      .filter((row) => {
        const t = parseFloat(row.t);
        const P = parseFloat(row.P);
        return !isNaN(t) && !isNaN(P);
      })
      .map((row) => ({
        t: parseFloat(row.t),
        P: parseFloat(row.P),
      }));

    // Default ranges
    let tMin = 0;
    let tMax = 20;
    let PMin = 0;
    let PMax = C * 1.1; // 10% above carrying capacity

    // Adjust based on data if present
    if (validPoints.length > 0) {
      const tValues = validPoints.map((p) => p.t);
      const PValues = validPoints.map((p) => p.P);

      tMin = Math.min(...tValues, 0);
      tMax = Math.max(...tValues, tMin + 20);
      PMin = 0;
      PMax = Math.max(...PValues, C, PMax);
    }

    // Add buffer
    const tRange = tMax - tMin;
    const PRange = PMax - PMin;

    return {
      tRange: [tMin - tRange * 0.05, tMax + tRange * 0.1],
      PRange: [PMin, PMax + PRange * 0.1],
    };
  }, [tableData, C]);

  // Calculate RSS
  const calculateRSS = useCallback(() => {
    const validPoints = tableData
      .filter((row) => {
        const t = parseFloat(row.t);
        const P = parseFloat(row.P);
        return !isNaN(t) && !isNaN(P);
      })
      .map((row) => ({
        t: parseFloat(row.t),
        P: parseFloat(row.P),
      }));

    if (validPoints.length === 0) {
      return 0;
    }

    const rss = validPoints.reduce((sum, point) => {
      const predicted = logisticFunction(point.t);
      const residual = point.P - predicted;
      return sum + residual * residual;
    }, 0);

    return rss;
  }, [tableData, logisticFunction]);

  // Update RSS when data or parameters change
  useEffect(() => {
    const rss = calculateRSS();
    setRssValue(rss);
  }, [calculateRSS]);

  // Handle data changes from table
  const handleDataChange = useCallback((newData) => {
    setTableData(newData);
  }, []);

  // Clear all data
  const handleClearData = useCallback(() => {
    setTableData([
      { t: "", P: "" },
      { t: "", P: "" },
      { t: "", P: "" },
      { t: "", P: "" },
      { t: "", P: "" },
      { t: "", P: "" },
      { t: "", P: "" },
      { t: "", P: "" },
    ]);
  }, []);

  // Draw visualization on canvas
  const drawVisualization = useCallback(() => {
    const canvas = canvasRef.current;
    const transform = transformRef.current;
    if (!canvas || !transform) return;

    const ctx = canvas.getContext("2d");
    const { plotWidth, plotHeight, dataToPixel } = transform;
    const { tRange, PRange } = calculateAxisRanges();

    // Clear canvas
    ctx.clearRect(0, 0, plotWidth, plotHeight);

    // Draw carrying capacity line (green dashed)
    const capacityLeft = dataToPixel(tRange[0], C);
    const capacityRight = dataToPixel(tRange[1], C);
    ctx.strokeStyle = currentTheme === "dark" ? "#4ade80" : "#16a34a";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(capacityLeft.x, capacityLeft.y);
    ctx.lineTo(capacityRight.x, capacityRight.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw logistic curve (red)
    ctx.strokeStyle = currentTheme === "dark" ? "#ef4444" : "#dc2626";
    ctx.lineWidth = 2;
    ctx.beginPath();

    const numPoints = 200;
    for (let i = 0; i <= numPoints; i++) {
      const t = tRange[0] + (i / numPoints) * (tRange[1] - tRange[0]);
      const P = logisticFunction(t);
      const pos = dataToPixel(t, P);

      if (i === 0) {
        ctx.moveTo(pos.x, pos.y);
      } else {
        ctx.lineTo(pos.x, pos.y);
      }
    }
    ctx.stroke();

    // Get valid data points
    const validPoints = tableData
      .filter((row) => {
        const t = parseFloat(row.t);
        const P = parseFloat(row.P);
        return !isNaN(t) && !isNaN(P);
      })
      .map((row) => ({
        t: parseFloat(row.t),
        P: parseFloat(row.P),
      }));

    // Draw RSS squares if enabled
    if (showRSS) {
      validPoints.forEach((point) => {
        const predicted = logisticFunction(point.t);
        const residual = point.P - predicted;

        const dataPos = dataToPixel(point.t, point.P);
        const predPos = dataToPixel(point.t, predicted);

        const squareSize = Math.abs(dataPos.y - predPos.y);

        // Draw gray semi-transparent square
        ctx.fillStyle =
          currentTheme === "dark"
            ? "rgba(148, 163, 184, 0.3)"
            : "rgba(100, 116, 139, 0.3)";
        ctx.strokeStyle = currentTheme === "dark" ? "#94a3b8" : "#64748b";
        ctx.lineWidth = 1;

        // Square extends horizontally from data point
        const startY = residual < 0 ? predPos.y : dataPos.y;

        ctx.fillRect(dataPos.x, startY, squareSize, squareSize);
        ctx.strokeRect(dataPos.x, startY, squareSize, squareSize);
      });
    }

    // Draw data points (blue circles on top)
    validPoints.forEach((point) => {
      const pos = dataToPixel(point.t, point.P);

      // Draw 5px circle
      ctx.fillStyle = currentTheme === "dark" ? "#60a5fa" : "#2563eb";
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 5, 0, 2 * Math.PI);
      ctx.fill();

      // Add stroke for visibility
      ctx.strokeStyle = currentTheme === "dark" ? "#1e293b" : "#ffffff";
      ctx.lineWidth = 1;
      ctx.stroke();
    });
  }, [
    calculateAxisRanges,
    logisticFunction,
    tableData,
    showRSS,
    currentTheme,
    C,
  ]);

  // Redraw when data or parameters change
  useEffect(() => {
    drawVisualization();
  }, [drawVisualization]);

  const { tRange, PRange } = calculateAxisRanges();

  // Generate Y-axis ticks including carrying capacity C
  const generateYTicks = useCallback(() => {
    const [pMin, pMax] = PRange;
    const range = pMax - pMin;
    const step = Math.pow(10, Math.floor(Math.log10(range / 4)));
    const niceStep =
      step * (range / step / 4 > 3 ? 2 : range / step / 4 > 1.5 ? 1 : 0.5);

    const ticks = [];
    let tick = Math.ceil(pMin / niceStep) * niceStep;

    while (tick <= pMax) {
      ticks.push(tick);
      tick += niceStep;
    }

    // Add carrying capacity C if it's within range and not too close to existing ticks
    if (C >= pMin && C <= pMax) {
      const hasNearbyTick = ticks.some((t) => Math.abs(t - C) < niceStep * 0.3);
      if (!hasNearbyTick) {
        ticks.push(C);
        ticks.sort((a, b) => a - b);
      }
    }

    // Format ticks to max 5 characters
    return ticks.map((t) => {
      const str = t.toString();
      if (str.length <= 5) return t;

      // Try toPrecision to get significant figures that fit
      for (let precision = 4; precision >= 1; precision--) {
        const formatted = parseFloat(t.toPrecision(precision));
        const formattedStr = formatted.toString();
        if (formattedStr.length <= 5) return formatted;
      }

      // Last resort: exponential notation
      return parseFloat(t.toExponential(1));
    });
  }, [PRange, C]);

  const yTicks = generateYTicks();

  // Generate X-axis (time) ticks
  const generateXTicks = useCallback(() => {
    const [tMin, tMax] = tRange;
    const range = tMax - tMin;

    // Target about 4-5 ticks
    const rawStep = range / 4;
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const normalizedStep = rawStep / magnitude;

    // Round to nice numbers
    let niceStep;
    if (normalizedStep <= 1) niceStep = magnitude;
    else if (normalizedStep <= 2) niceStep = 2 * magnitude;
    else if (normalizedStep <= 5) niceStep = 5 * magnitude;
    else niceStep = 10 * magnitude;

    const ticks = [];
    let tick = Math.ceil(tMin / niceStep) * niceStep;

    while (tick <= tMax) {
      ticks.push(tick);
      tick += niceStep;
    }

    // Format to max 5 characters
    return ticks.map((t) => {
      const str = t.toString();
      if (str.length <= 5) return t;

      for (let precision = 4; precision >= 1; precision--) {
        const formatted = parseFloat(t.toPrecision(precision));
        const formattedStr = formatted.toString();
        if (formattedStr.length <= 5) return formatted;
      }

      return parseFloat(t.toExponential(1));
    });
  }, [tRange]);

  const xTicks = generateXTicks();

  return (
    <ToolContainer
      title="Logistic Growth Explorer"
      canvasWidth={11}
      canvasHeight={6}
    >
      {/* Data Table */}
      <GridTableInput
        x={0}
        y={0}
        w={2}
        h={4}
        data={tableData}
        onDataChange={handleDataChange}
        columns={[
          { key: "t", label: "t", type: "number", editable: true },
          { key: "P", label: "P", type: "number", editable: true },
        ]}
        title="Data Table"
        theme={theme}
      />

      {/* RSS Display */}
      <GridDisplay
        x={0}
        y={4}
        w={2}
        h={1}
        variant="info"
        align="center"
        fontSize="small"
        theme={theme}
      >
        <div style={{ padding: "4px" }}>
          <div style={{ fontWeight: "bold", marginBottom: "2px" }}>RSS</div>
          <div style={{ fontSize: "0.9em" }}>{rssValue.toFixed(2)}</div>
        </div>
      </GridDisplay>

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

      {/* Main Graph */}
      <GridGraph
        x={2}
        y={0}
        w={7}
        h={6}
        title="Logistic Growth Model"
        xLabel="Time (t)"
        yLabel="Population (P)"
        xRange={tRange}
        yRange={PRange}
        xTicks={xTicks}
        yTicks={yTicks}
        theme={theme}
      >
        {(transform) => {
          transformRef.current = transform;
          const { plotWidth, plotHeight, plotStyle } = transform;

          return (
            <canvas
              ref={canvasRef}
              style={{
                ...plotStyle,
                pointerEvents: "none",
              }}
              width={plotWidth}
              height={plotHeight}
            />
          );
        }}
      </GridGraph>

      {/* Parameter: Carrying Capacity (C) */}
      <GridInput
        x={9}
        y={0}
        value={C}
        onChange={(value) => {
          const num = parseFloat(value);
          if (!isNaN(num) && num > 0) {
            setC(num);
          }
        }}
        min={1}
        max={10000}
        step={1}
        variable="C"
        title="Carrying capacity (1-10000)"
        theme={theme}
      />

      {/* Reset Parameters Button */}
      <GridButton
        x={10}
        y={0}
        w={1}
        h={1}
        onPress={() => {
          setC(100);
          setB(0.5);
          setT0(10);
        }}
        theme={theme}
      >
        <div style={{ textAlign: "center", lineHeight: "1.1" }}>
          <div>Reset</div>
          <div>Params</div>
        </div>
      </GridButton>

      {/* Parameter: Growth Rate (b) */}
      <GridSliderHorizontal
        x={9}
        y={1}
        w={2}
        h={1}
        value={b * 100}
        onChange={(value) => setB(value / 100)}
        min={0}
        max={200}
        variant="unipolar"
        label={`b = ${b.toFixed(2)}`}
        theme={theme}
      />

      {/* Parameter: Time Shift (t0) */}
      <GridSliderHorizontal
        x={9}
        y={2}
        w={2}
        h={1}
        value={(t0 / 30) * 100}
        onChange={(value) => setT0((value / 100) * 30)}
        variant="unipolar"
        label={`t₀ = ${t0.toFixed(1)}`}
        theme={theme}
      />

      {/* Equation Display - Solution */}
      <GridDisplay
        x={9}
        y={3}
        w={2}
        h={1}
        variant="info"
        align="center"
        fontSize="small"
        theme={theme}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            paddingTop: "14px",
          }}
        >
          <Equation name="logistic-solution" size="small" />
        </div>
      </GridDisplay>

      {/* Equation Display - Differential Equation */}
      <GridDisplay
        x={9}
        y={4}
        w={2}
        h={1}
        variant="info"
        align="center"
        fontSize="small"
        theme={theme}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            paddingTop: "16px",
          }}
        >
          <Equation name="logistic-differential" size="small" />
        </div>
      </GridDisplay>

      {/* Equation Display - Expanded Form with Parameter Values */}
      <GridDisplay
        x={9}
        y={5}
        w={2}
        h={1}
        variant="info"
        align="center"
        fontSize="small"
        theme={theme}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            fontStyle: "italic",
            fontSize: "0.85em",
            whiteSpace: "nowrap",
          }}
        >
          <span style={{ fontWeight: "bold" }}>P</span>
          <span>′&nbsp;=&nbsp;</span>
          <span>{b.toPrecision(2)}</span>
          <span style={{ fontWeight: "bold" }}>P</span>
          <span>&nbsp;−&nbsp;</span>
          <span>{(b / C).toPrecision(2)}</span>
          <span style={{ fontWeight: "bold" }}>P</span>
          <sup>2</sup>
        </div>
      </GridDisplay>
    </ToolContainer>
  );
};

export default LogisticGrowthExplorerTool;
