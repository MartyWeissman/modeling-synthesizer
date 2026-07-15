// src/tools/MinimalInsulinGlucoseTool.jsx

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  GridButton,
  GridGraphDualY,
  GridDisplay,
  GridInput,
} from "../components/grid";
import ToolContainer from "../components/ui/ToolContainer";
import Equation from "../components/Equation";
import { useTheme } from "../hooks/useTheme";

const MinimalInsulinGlucoseTool = () => {
  const { theme, currentTheme } = useTheme();

  // Model parameters
  const [m, setM] = useState(0.5); // Glucose production
  const [s, setS] = useState(1.0); // Insulin sensitivity
  const [q, setQ] = useState(1.0); // Insulin production rate
  const [B, setB] = useState(1.0); // Beta cell mass
  const [gamma, setGamma] = useState(1.0); // Insulin degradation rate

  // Simulation state
  const [isRunning, setIsRunning] = useState(false);
  const [timeSeriesData, setTimeSeriesData] = useState([]);
  const [currentMode, setCurrentMode] = useState("baseline"); // "baseline", "meals", or "challenge"

  // Canvas and transform refs
  const canvasRef = useRef(null);
  const transformRef = useRef(null);

  // Differential equation solver using Euler's method
  const runSimulation = useCallback(
    (mode = "baseline", params = null) => {
      // Use provided params or current state values
      const currentParams = params || {
        m,
        s,
        q,
        B,
        gamma,
      };
      const dt = 0.1; // Time step in hours
      const tMax = 20;
      const steps = tMax / dt;

      let G = 1; // Initial glucose concentration (normalized)
      let I = 0.5; // Initial insulin concentration (normalized)

      const dataPoints = [];

      for (let i = 0; i <= steps; i++) {
        const t = i * dt;

        // Store data (convert to real units)
        dataPoints.push({
          time: t,
          glucose: G * 5, // Convert to mmol/L
          insulin: I * 100, // Convert to pmol/L
        });

        // Hill equation for insulin production
        const f = (G * G) / (1 + G * G);

        // Glucose production based on mode
        let mEffective = currentParams.m;
        if (mode === "challenge") {
          // Add glucose spike at t=5
          mEffective += Math.exp(-Math.pow(t - 5, 2));
        } else if (mode === "meals" || mode === "mealsSnacks") {
          // Add meal surges at t=6, 10, 16 (30-minute duration each)
          const mealSurge = (mealTime) => {
            const timeDiff = Math.abs(t - mealTime);
            return timeDiff < 0.25
              ? 0.8 * Math.exp(-Math.pow((t - mealTime) * 4, 2))
              : 0;
          };
          mEffective += mealSurge(6) + mealSurge(10) + mealSurge(16);

          if (mode === "mealsSnacks") {
            // Extra sugary snacks between meals: mid-morning (t=8),
            // mid-afternoon (t=13), and an hour after dinner (t=17).
            // Higher amplitude and slightly longer to keep glucose elevated.
            const snackSurge = (snackTime) => {
              const timeDiff = Math.abs(t - snackTime);
              return timeDiff < 0.4
                ? 1.0 * Math.exp(-Math.pow((t - snackTime) * 2.5, 2))
                : 0;
            };
            mEffective += snackSurge(8) + snackSurge(13) + snackSurge(17);
          }
        }

        // Differential equations
        const dGdt = mEffective - currentParams.s * I * G;
        const dIdt =
          currentParams.q * currentParams.B * f - currentParams.gamma * I;

        // Update using Euler's method
        G += dGdt * dt;
        I += dIdt * dt;

        // Prevent negative values
        G = Math.max(0, G);
        I = Math.max(0, I);
      }

      setTimeSeriesData(dataPoints);
      setCurrentMode(mode);
    },
    [m, s, q, B, gamma],
  );

  // Draw the time series on the dual Y-axis graph canvas
  const drawTimeSeries = useCallback(() => {
    const canvas = canvasRef.current;
    const transform = transformRef.current;
    if (!canvas || !transform || timeSeriesData.length === 0) return;

    const ctx = canvas.getContext("2d");
    const { plotWidth, plotHeight, dataToPixelLeft, dataToPixelRight } =
      transform;

    // Clear canvas
    ctx.clearRect(0, 0, plotWidth, plotHeight);

    // Draw normal glucose range background (using left axis for glucose)
    const normalLow = 3.9;
    const normalHigh = 5.5;
    const normalLowPos = dataToPixelLeft(0, normalLow);
    const normalHighPos = dataToPixelLeft(0, normalHigh);

    ctx.fillStyle = "rgba(0, 255, 0, 0.1)";
    ctx.fillRect(
      0,
      normalHighPos.y,
      plotWidth,
      normalLowPos.y - normalHighPos.y,
    );

    // Draw glucose curve (red) - uses left Y axis
    ctx.strokeStyle = "#ff4444";
    ctx.lineWidth = 3;
    ctx.beginPath();

    timeSeriesData.forEach((point, index) => {
      const pos = dataToPixelLeft(point.time, Math.min(point.glucose, 12));
      if (index === 0) {
        ctx.moveTo(pos.x, pos.y);
      } else {
        ctx.lineTo(pos.x, pos.y);
      }
    });
    ctx.stroke();

    // Draw insulin curve (blue) - uses right Y axis (same scale in this case)
    ctx.strokeStyle = "#4444ff";
    ctx.lineWidth = 2;
    ctx.beginPath();

    timeSeriesData.forEach((point, index) => {
      // Insulin uses the right Y axis (0-200 pmol/L)
      const pos = dataToPixelRight(point.time, Math.min(point.insulin, 200));
      if (index === 0) {
        ctx.moveTo(pos.x, pos.y);
      } else {
        ctx.lineTo(pos.x, pos.y);
      }
    });
    ctx.stroke();

    // Draw mode indicators
    if (currentMode === "challenge") {
      const challengePos = dataToPixelLeft(5, 12); // t=5, top of graph
      ctx.fillStyle = currentTheme === "dark" ? "#ffffff" : "#000000";
      ctx.font = "12px Arial";
      ctx.textAlign = "center";
      ctx.fillText("Challenge", challengePos.x, 15);

      // Draw challenge marker line
      ctx.strokeStyle = currentTheme === "dark" ? "#ffffff" : "#000000";
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(challengePos.x, 20);
      ctx.lineTo(challengePos.x, plotHeight);
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (currentMode === "meals" || currentMode === "mealsSnacks") {
      // Draw meal indicators at t=6, 10, 16
      const mealTimes = [6, 10, 16];
      mealTimes.forEach((mealTime) => {
        const mealPos = dataToPixelLeft(mealTime, 12);
        ctx.fillStyle = currentTheme === "dark" ? "#ffffff" : "#000000";
        ctx.font = "11px Arial";
        ctx.textAlign = "center";
        ctx.fillText("Meal", mealPos.x, 15);

        // Draw meal marker line
        ctx.strokeStyle = currentTheme === "dark" ? "#ffffff" : "#000000";
        ctx.setLineDash([2, 2]);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(mealPos.x, 20);
        ctx.lineTo(mealPos.x, plotHeight);
        ctx.stroke();
        ctx.setLineDash([]);
      });

      // Draw snack indicators at t=8, 13, 17 (Meals & Snacks mode only)
      if (currentMode === "mealsSnacks") {
        const snackTimes = [8, 13, 17];
        snackTimes.forEach((snackTime) => {
          const snackPos = dataToPixelLeft(snackTime, 12);
          ctx.fillStyle = currentTheme === "dark" ? "#fbbf24" : "#b45309";
          ctx.font = "11px Arial";
          ctx.textAlign = "center";
          ctx.fillText("Snack", snackPos.x, 15);

          // Draw snack marker line
          ctx.strokeStyle = currentTheme === "dark" ? "#fbbf24" : "#b45309";
          ctx.setLineDash([2, 2]);
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(snackPos.x, 20);
          ctx.lineTo(snackPos.x, plotHeight);
          ctx.stroke();
          ctx.setLineDash([]);
        });
      }
    }

    // Legend in top-middle of graph
    const legendCenterPos = dataToPixelLeft(12.5, 12);
    const legendWidth = 126;
    const legendHeight = 45;
    const legendX = legendCenterPos.x - legendWidth / 2;
    const legendY = 40;

    // Legend background
    ctx.fillStyle =
      currentTheme === "dark"
        ? "rgba(31, 41, 55, 0.9)"
        : "rgba(255, 255, 255, 0.9)";
    ctx.fillRect(legendX, legendY - 5, legendWidth, legendHeight);
    ctx.strokeStyle =
      currentTheme === "dark"
        ? "rgba(255, 255, 255, 0.3)"
        : "rgba(0, 0, 0, 0.3)";
    ctx.lineWidth = 1;
    ctx.strokeRect(legendX, legendY - 5, legendWidth, legendHeight);

    // Legend items
    ctx.font = "13px Arial";
    ctx.textAlign = "left";

    // Red line for glucose
    ctx.strokeStyle = "#ff4444";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(legendX + 15, legendY + 6);
    ctx.lineTo(legendX + 35, legendY + 6);
    ctx.stroke();

    ctx.fillStyle = currentTheme === "dark" ? "#ffffff" : "#000000";
    ctx.fillText("Glucose", legendX + 40, legendY + 11);

    // Blue line for insulin
    ctx.strokeStyle = "#4444ff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(legendX + 15, legendY + 25);
    ctx.lineTo(legendX + 35, legendY + 25);
    ctx.stroke();

    ctx.fillStyle = currentTheme === "dark" ? "#ffffff" : "#000000";
    ctx.fillText("Insulin", legendX + 40, legendY + 30);
  }, [timeSeriesData, currentMode, currentTheme]);

  // Run initial simulation only once on mount
  useEffect(() => {
    runSimulation("baseline");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-run simulation when parameters change (keeping current mode)
  useEffect(() => {
    if (timeSeriesData.length > 0) {
      // Only re-run if we already have data (skip initial render)
      runSimulation(currentMode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m, s, q, B, gamma]);

  // Draw graph when data changes
  useEffect(() => {
    if (timeSeriesData.length > 0) {
      drawTimeSeries();
    }
  }, [timeSeriesData, drawTimeSeries]);

  // Handle simulation
  const handleSimulate = (mode = "baseline") => {
    setIsRunning(true);
    runSimulation(mode);
    setTimeout(() => setIsRunning(false), 1000);
  };

  return (
    <ToolContainer
      title="Minimal Insulin-Glucose Simulator"
      canvasWidth={11}
      canvasHeight={5}
    >
      {/* Row 0: Baseline button, then glucose parameters */}
      <GridInput
        x={1}
        y={0}
        value={m}
        onChange={setM}
        min={0}
        max={10}
        step={0.1}
        variable="m"
        title="Glucose production"
        theme={theme}
      />

      <GridInput
        x={2}
        y={0}
        value={s}
        onChange={setS}
        min={0}
        max={10}
        step={0.1}
        variable="s"
        title="Insulin sensitivity"
        theme={theme}
      />

      {/* Row 1: Insulin parameters */}
      <GridInput
        x={0}
        y={1}
        value={q}
        onChange={setQ}
        min={0}
        max={10}
        step={0.1}
        variable="q"
        title="Insulin production rate"
        theme={theme}
      />

      <GridInput
        x={1}
        y={1}
        value={B}
        onChange={setB}
        min={0}
        max={10}
        step={0.1}
        variable="B"
        title="Beta cell mass"
        theme={theme}
      />

      <GridInput
        x={2}
        y={1}
        value={gamma}
        onChange={setGamma}
        min={0}
        max={10}
        step={0.1}
        variable="γ"
        title="Insulin degradation rate"
        theme={theme}
      />

      {/* Main Graph */}
      <GridGraphDualY
        x={3}
        y={0}
        w={8}
        h={5}
        xLabel="time"
        yLabelLeft="glucose"
        yLabelRight="insulin"
        xUnit="hours"
        yUnitLeft="mmol/L"
        yUnitRight="pmol/L"
        xTicks={[0, 5, 10, 15, 20]}
        yTicksLeft={[0, 3, 6, 9, 12]}
        yTicksRight={[0, 50, 100, 150, 200]}
        xRange={[0, 20]}
        yRangeLeft={[0, 12]}
        yRangeRight={[0, 200]}
        leftAxisColor={currentTheme === "dark" ? "#ffffff" : "#000000"}
        rightAxisColor={currentTheme === "dark" ? "#ffffff" : "#000000"}
        tooltip="Insulin-Glucose Dynamics"
        theme={theme}
      >
        {(transform) => {
          transformRef.current = transform;
          return (
            <canvas
              ref={canvasRef}
              style={transform.plotStyle}
              width={transform.plotWidth}
              height={transform.plotHeight}
            />
          );
        }}
      </GridGraphDualY>

      {/* Row 3-4: Equation display */}
      <GridDisplay
        x={0}
        y={3}
        w={3}
        h={2}
        variant="info"
        align="center"
        fontSize="small"
        theme={theme}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0px",
            paddingTop: "8px",
            paddingBottom: "2px",
          }}
        >
          <div
            style={{
              fontWeight: "bold",
              fontSize: "14px",
              marginBottom: "4px",
            }}
          >
            Insulin-Glucose Model
          </div>
          <Equation
            name="insulin-glucose-minimal-glucose"
            size="small"
            style={{ lineHeight: "1", marginBottom: "-3px" }}
          />
          <Equation
            name="insulin-glucose-minimal-insulin"
            size="small"
            style={{ lineHeight: "1" }}
          />
        </div>
      </GridDisplay>

      {/* Control buttons */}
      <GridButton
        x={0}
        y={0}
        type="momentary"
        variant="function"
        onPress={() => handleSimulate("baseline")}
        disabled={isRunning}
        tooltip="Run baseline simulation"
        theme={theme}
        fontSize="xs"
      >
        {isRunning && currentMode === "baseline" ? "..." : "Baseline"}
      </GridButton>

      <GridButton
        x={0}
        y={2}
        type="momentary"
        variant="function"
        onPress={() => handleSimulate("meals")}
        disabled={isRunning}
        tooltip="Run meals simulation with 3 daily meals"
        theme={theme}
        fontSize="xs"
      >
        {isRunning && currentMode === "meals" ? "..." : "Meals"}
      </GridButton>

      <GridButton
        x={1}
        y={2}
        type="momentary"
        variant="function"
        onPress={() => handleSimulate("mealsSnacks")}
        disabled={isRunning}
        tooltip="Run meals plus sugary snacks between meals"
        theme={theme}
        fontSize="xs"
      >
        {isRunning && currentMode === "mealsSnacks" ? (
          "..."
        ) : (
          <div style={{ textAlign: "center", lineHeight: "1.1" }}>
            <div>Meals</div>
            <div>&amp; Snacks</div>
          </div>
        )}
      </GridButton>

      <GridButton
        x={2}
        y={2}
        type="momentary"
        variant="function"
        onPress={() => handleSimulate("challenge")}
        disabled={isRunning}
        tooltip="Run glucose challenge test"
        theme={theme}
        fontSize="xs"
      >
        {isRunning && currentMode === "challenge" ? "..." : "Challenge"}
      </GridButton>
    </ToolContainer>
  );
};

export default MinimalInsulinGlucoseTool;
