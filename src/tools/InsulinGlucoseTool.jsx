// src/tools/InsulinGlucoseTool.jsx

import React, { useState, useEffect, useCallback } from "react";
import {
  GridSliderHorizontal,
  GridButton,
  GridGraphDualY,
  GridLabel,
  GridDisplay,
} from "../components/grid";
import ToolContainer from "../components/ui/ToolContainer";
import { useTheme } from "../hooks/useTheme";

const InsulinGlucoseTool = () => {
  const { theme, currentTheme } = useTheme();

  // Define default values
  const DEFAULT_VALUES = {
    m: 0.5,
    s: 1.0,
    q: 1.0,
    B: 1.0,
    gamma: 1.0,
    currentMode: "baseline",
  };

  // Model parameters
  const [m, setM] = useState(DEFAULT_VALUES.m); // Glucose production
  const [s, setS] = useState(DEFAULT_VALUES.s); // Insulin sensitivity
  const [q, setQ] = useState(DEFAULT_VALUES.q); // Insulin production rate
  const [B, setB] = useState(DEFAULT_VALUES.B); // Beta cell mass
  const [gamma, setGamma] = useState(DEFAULT_VALUES.gamma); // Insulin degradation rate

  // Simulation state
  const [isRunning, setIsRunning] = useState(false);
  const [timeSeriesData, setTimeSeriesData] = useState([]);
  const [currentMode, setCurrentMode] = useState(DEFAULT_VALUES.currentMode); // "baseline", "meals", or "challenge"

  // Differential equation solver using Euler's method
  const runSimulation = useCallback(
    (mode = "baseline", params = null) => {
      // Use provided params or current state values
      const currentParams = params || { m, s, q, B, gamma };
      const dt = 0.1;
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
          insulin: I * 6, // Convert to pmol/L
        });

        // Hill equation for insulin production
        const f = (G * G) / (1 + G * G);

        // Glucose production based on mode
        let mEffective = currentParams.m;
        if (mode === "challenge") {
          // Add glucose spike at t=5
          mEffective += Math.exp(-Math.pow(t - 5, 2));
        } else if (mode === "meals") {
          // Add meal surges at t=6, 10, 16 (30-minute duration each)
          const mealSurge = (mealTime) => {
            const timeDiff = Math.abs(t - mealTime);
            return timeDiff < 0.25
              ? 0.8 * Math.exp(-Math.pow((t - mealTime) * 4, 2))
              : 0;
          };
          mEffective += mealSurge(6) + mealSurge(10) + mealSurge(16);
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
    setTimeout(() => {
      const graphComponent = document.querySelector(
        '[title="Insulin-Glucose Dynamics"]',
      );
      if (!graphComponent) return;

      let canvas = graphComponent.querySelector("canvas");
      if (!canvas || timeSeriesData.length === 0) return;

      const ctx = canvas.getContext("2d");
      const { width, height } = canvas;

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Scales
      const maxTime = 20;
      const maxGlucose = 15; // mmol/L
      const maxInsulin = 18; // pmol/L

      // Chart dimensions (canvas already positioned correctly by GridGraphDualY)
      const chartWidth = width;
      const chartHeight = height;

      // Draw normal glucose range background
      const normalLow = 3.9;
      const normalHigh = 5.5;
      const normalLowY = chartHeight - (normalLow / maxGlucose) * chartHeight;
      const normalHighY = chartHeight - (normalHigh / maxGlucose) * chartHeight;

      ctx.fillStyle = "rgba(0, 255, 0, 0.1)";
      ctx.fillRect(0, normalHighY, chartWidth, normalLowY - normalHighY);

      // Draw glucose curve (red)
      ctx.strokeStyle = "#ff4444";
      ctx.lineWidth = 3; // Thicker line
      ctx.beginPath();

      timeSeriesData.forEach((point, index) => {
        const x = (point.time / maxTime) * chartWidth;
        const y =
          chartHeight -
          (Math.min(point.glucose, maxGlucose) / maxGlucose) * chartHeight;

        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();

      // Draw insulin curve (blue)
      ctx.strokeStyle = "#4444ff";
      ctx.lineWidth = 2;
      ctx.beginPath();

      timeSeriesData.forEach((point, index) => {
        const x = (point.time / maxTime) * chartWidth;
        const y =
          chartHeight -
          (Math.min(point.insulin, maxInsulin) / maxInsulin) * chartHeight;

        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();

      // Draw mode indicators
      if (currentMode === "challenge") {
        const challengeX = (5 / maxTime) * chartWidth;
        ctx.fillStyle = "#000000"; // Black text
        ctx.font = "12px Arial"; // Bigger font
        ctx.textAlign = "center";
        ctx.fillText("Challenge", challengeX, 15);

        // Draw challenge marker line (black, stops below text)
        ctx.strokeStyle = "#000000"; // Black line
        ctx.setLineDash([3, 3]);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(challengeX, 20); // Start below text
        ctx.lineTo(challengeX, chartHeight);
        ctx.stroke();
        ctx.setLineDash([]);
      } else if (currentMode === "meals") {
        // Draw meal indicators at t=6, 10, 16
        const mealTimes = [6, 10, 16];
        mealTimes.forEach((mealTime) => {
          const mealX = (mealTime / maxTime) * chartWidth;
          ctx.fillStyle = "#000000"; // Black text
          ctx.font = "11px Arial"; // Bigger font
          ctx.textAlign = "center";
          ctx.fillText("Meal", mealX, 15);

          // Draw meal marker line (black, stops below text)
          ctx.strokeStyle = "#000000"; // Black line
          ctx.setLineDash([2, 2]);
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(mealX, 20); // Start below text
          ctx.lineTo(mealX, chartHeight);
          ctx.stroke();
          ctx.setLineDash([]);
        });
      }

      // Legend in top-middle of graph
      const legendCenterX = (12.5 / maxTime) * chartWidth;
      const legendWidth = 126; // 70% of 180
      const legendHeight = 45; // 80% bigger than 25
      const legendX = legendCenterX - legendWidth / 2;
      const legendY = 40; // Moved down 20px from 20

      // Legend background - match graph background
      const isDarkMode = theme.component.includes("gray-700");
      ctx.fillStyle = isDarkMode
        ? "rgba(31, 41, 55, 0.9)"
        : "rgba(255, 255, 255, 0.9)"; // Match graph bg
      ctx.fillRect(legendX, legendY - 5, legendWidth, legendHeight);
      ctx.strokeStyle = isDarkMode
        ? "rgba(255, 255, 255, 0.3)"
        : "rgba(0, 0, 0, 0.3)";
      ctx.lineWidth = 1;
      ctx.strokeRect(legendX, legendY - 5, legendWidth, legendHeight);

      // Legend items
      ctx.font = "13px Arial"; // Bigger font (was 11px)
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
    }, 100);
  }, [timeSeriesData, currentMode, currentTheme, theme.component]);

  // Run initial simulation
  useEffect(() => {
    runSimulation("baseline");
  }, [runSimulation]);

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
      title="Insulin-Glucose Regulation"
      canvasWidth={11}
      canvasHeight={5}
    >
      {/* Row 0: Glucose production parameter */}
      <GridSliderHorizontal
        x={0}
        y={0}
        w={3}
        h={1}
        value={m * 100} // Convert 0-1 to 0-100 scale (default 0.5 becomes 50)
        onChange={(value) => setM(value / 100)}
        variant="unipolar"
        label={`Glucose production m = ${m.toFixed(1)}`}
        tooltip={`Glucose production rate parameter: ${m.toFixed(1)}`}
        theme={theme}
      />

      {/* Main Graph */}
      <GridGraphDualY
        x={3}
        y={0}
        w={8}
        h={4}
        xLabel="time"
        yLabelLeft="glucose"
        yLabelRight="insulin"
        xUnit="hours"
        yUnitLeft="mmol/L"
        yUnitRight="pmol/L"
        xTicks={[0, 5, 10, 15, 20]}
        yTicksLeft={[0, 3, 6, 9, 12, 15]}
        yTicksRight={[0, 3, 6, 9, 12, 15, 18]}
        xRange={[0, 20]}
        yRangeLeft={[0, 15]}
        yRangeRight={[0, 18]}
        leftAxisColor={currentTheme === "dark" ? "#ffffff" : "#000000"}
        rightAxisColor={currentTheme === "dark" ? "#ffffff" : "#000000"}
        tooltip="Insulin-Glucose Dynamics"
        theme={theme}
      />

      {/* Row 1: Insulin sensitivity */}
      <GridSliderHorizontal
        x={0}
        y={1}
        w={3}
        h={1}
        value={s * 50} // Convert 0-2 to 0-100 scale (default 1.0 becomes 50)
        onChange={(value) => setS(value / 50)}
        variant="unipolar"
        label={`Insulin sensitivity s = ${s.toFixed(1)}`}
        tooltip={`Insulin sensitivity parameter: ${s.toFixed(1)}`}
        theme={theme}
      />

      {/* Row 2: Insulin production rate */}
      <GridSliderHorizontal
        x={0}
        y={2}
        w={3}
        h={1}
        value={q * 50} // Convert 0-2 to 0-100 scale (default 1.0 becomes 50)
        onChange={(value) => setQ(value / 50)}
        variant="unipolar"
        label={`Insulin production q = ${q.toFixed(1)}`}
        tooltip={`Insulin production rate parameter: ${q.toFixed(1)}`}
        theme={theme}
      />

      {/* Row 3: Beta cell mass */}
      <GridSliderHorizontal
        x={0}
        y={3}
        w={3}
        h={1}
        value={B * 50} // Convert 0-2 to 0-100 scale (default 1.0 becomes 50)
        onChange={(value) => setB(value / 50)}
        variant="unipolar"
        label={`Beta cell mass B = ${B.toFixed(1)}`}
        tooltip={`Beta cell mass parameter: ${B.toFixed(1)}`}
        theme={theme}
      />

      {/* Row 4: Insulin degradation */}
      <GridSliderHorizontal
        x={0}
        y={4}
        w={3}
        h={1}
        value={gamma * 50} // Convert 0-2 to 0-100 scale (default 1.0 becomes 50)
        onChange={(value) => setGamma(value / 50)}
        variant="unipolar"
        label={`Insulin degradation γ = ${gamma.toFixed(1)}`}
        tooltip={`Insulin degradation rate parameter: ${gamma.toFixed(1)}`}
        theme={theme}
      />

      {/* Control buttons */}
      <GridButton
        x={3}
        y={4}
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
        x={4}
        y={4}
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
        x={5}
        y={4}
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

      {/* Status display */}
      <GridDisplay
        x={6}
        y={4}
        w={2}
        h={1}
        value={
          currentMode.charAt(0).toUpperCase() + currentMode.slice(1) + "\nMode"
        }
        variant="status"
        align="center"
        fontSize="xs"
        tooltip={`Current simulation mode: ${currentMode}`}
        theme={theme}
      />

      {/* Differential equation display */}
      <GridLabel
        x={8}
        y={4}
        w={3}
        h={1}
        text="G' = m - sIG|I' = qBf(G) - γI"
        fontSize="small"
        textAlign="center"
        formulaMode={true}
        tooltip="Differential equations: dG/dt = m - sIG, dI/dt = qBf(G) - γI where f(G) = G²/(1+G²)"
        theme={theme}
      />
    </ToolContainer>
  );
};

export default InsulinGlucoseTool;
