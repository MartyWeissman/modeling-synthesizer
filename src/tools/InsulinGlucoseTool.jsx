// src/tools/InsulinGlucoseTool.jsx

import React, { useState, useEffect, useCallback } from "react";
import {
  GridSliderHorizontal,
  GridButton,
  GridGraphDualY,
  GridLabel,
  GridDisplay,
  GridInput,
} from "../components/grid";
import ToolContainer from "../components/ui/ToolContainer";
import Equation from "../components/Equation";
import { useTheme } from "../hooks/useTheme";

const InsulinGlucoseTool = () => {
  const { theme, currentTheme } = useTheme();

  // Model parameters
  const [m, setM] = useState(0.5); // Glucose production
  const [s, setS] = useState(1.0); // Insulin sensitivity
  const [q, setQ] = useState(1.0); // Insulin production rate
  const [B, setB] = useState(1.0); // Beta cell mass
  const [gamma, setGamma] = useState(1.0); // Insulin degradation rate
  const [tau, setTau] = useState(0); // Time delay parameter (minutes)

  // Liver glucose production parameters
  const [alpha, setAlpha] = useState(0.0); // Liver production amplitude
  const [k, setK] = useState(1.0); // Insulin sensitivity of liver
  const [c, setC] = useState(1.0); // Threshold parameter

  // Time delay parameters
  const [sigma, setSigma] = useState(0); // Insulin effect on glucose delay (minutes)

  // Simulation state
  const [isRunning, setIsRunning] = useState(false);
  const [timeSeriesData, setTimeSeriesData] = useState([]);
  const [currentMode, setCurrentMode] = useState("baseline"); // "baseline", "meals", or "challenge"

  // Differential equation solver using Euler's method with delay support
  const runSimulation = useCallback(
    (mode = "baseline", params = null) => {
      // Use provided params or current state values
      const currentParams = params || {
        m,
        s,
        q,
        B,
        gamma,
        tau,
        alpha,
        k,
        c,
        sigma,
      };
      const dt = 0.1; // Time step in hours
      const tMax = 20;
      const steps = tMax / dt;

      let G = 1; // Initial glucose concentration (normalized)
      let I = 0.5; // Initial insulin concentration (normalized)

      // History buffer for delayed glucose values (G --> I delay)
      // Convert tau from minutes to hours
      const tauHours = currentParams.tau / 60;
      const tauDelaySteps = Math.round(tauHours / dt);
      const glucoseHistory = [];

      // Initialize glucose history with initial glucose value
      for (let i = 0; i <= tauDelaySteps; i++) {
        glucoseHistory.push(G);
      }

      // History buffer for delayed insulin values (I --> G delay)
      // Convert sigma from minutes to hours
      const sigmaHours = currentParams.sigma / 60;
      const sigmaDelaySteps = Math.round(sigmaHours / dt);
      const insulinHistory = [];

      // Initialize insulin history with initial insulin value
      for (let i = 0; i <= sigmaDelaySteps; i++) {
        insulinHistory.push(I);
      }

      const dataPoints = [];

      for (let i = 0; i <= steps; i++) {
        const t = i * dt;

        // Store data (convert to real units)
        dataPoints.push({
          time: t,
          glucose: G * 5, // Convert to mmol/L
          insulin: I * 6, // Convert to pmol/L
        });

        // Get delayed glucose value G_tau (for insulin production)
        let G_tau;
        if (tauDelaySteps === 0 || glucoseHistory.length <= tauDelaySteps) {
          // No delay or not enough history yet - use current value
          G_tau = G;
        } else {
          // Look back tau time units in history
          G_tau = glucoseHistory[glucoseHistory.length - tauDelaySteps - 1];
        }

        // Get delayed insulin value I_sigma (for liver glucose production)
        let I_sigma;
        if (sigmaDelaySteps === 0 || insulinHistory.length <= sigmaDelaySteps) {
          // No delay or not enough history yet - use current value
          I_sigma = I;
        } else {
          // Look back sigma time units in history
          I_sigma = insulinHistory[insulinHistory.length - sigmaDelaySteps - 1];
        }

        // Hill equation for insulin production with delayed glucose
        const f = (G_tau * G_tau) / (1 + G_tau * G_tau);

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

        // Liver glucose production term: alpha / (1 + e^(kI_sigma - c))
        // Uses delayed insulin I_sigma
        const liverProduction =
          currentParams.alpha /
          (1 + Math.exp(currentParams.k * I_sigma - currentParams.c));

        // Differential equations - glucose uses current insulin, insulin uses delayed glucose
        const dGdt = mEffective + liverProduction - currentParams.s * I * G;
        const dIdt =
          currentParams.q * currentParams.B * f - currentParams.gamma * I;

        // Update using Euler's method
        G += dGdt * dt;
        I += dIdt * dt;

        // Prevent negative values
        G = Math.max(0, G);
        I = Math.max(0, I);

        // Add current values to history buffers
        glucoseHistory.push(G);
        insulinHistory.push(I);

        // Keep history buffers from growing unboundedly
        if (glucoseHistory.length > tauDelaySteps + 50) {
          glucoseHistory.shift();
        }
        if (insulinHistory.length > sigmaDelaySteps + 50) {
          insulinHistory.shift();
        }
      }

      setTimeSeriesData(dataPoints);
      setCurrentMode(mode);
    },
    [m, s, q, B, gamma, tau, alpha, k, c, sigma],
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
      const maxGlucose = 12; // mmol/L
      const maxInsulin = 12; // pmol/L

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
      ctx.fillStyle =
        currentTheme === "dark"
          ? "rgba(31, 41, 55, 0.9)"
          : "rgba(255, 255, 255, 0.9)"; // Match graph bg
      ctx.fillRect(legendX, legendY - 5, legendWidth, legendHeight);
      ctx.strokeStyle =
        currentTheme === "dark"
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
  }, [m, s, q, B, gamma, tau, alpha, k, c, sigma]);

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
      {/* Row 0: First 3 parameters */}
      <GridInput
        x={0}
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
        x={1}
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

      <GridInput
        x={2}
        y={0}
        value={q}
        onChange={setQ}
        min={0}
        max={10}
        step={0.1}
        variable="q"
        title="Insulin production rate"
        theme={theme}
      />

      {/* Row 1: Last 2 parameters */}
      <GridInput
        x={0}
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
        x={1}
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

      {/* Row 2: Liver glucose production parameters */}
      <GridInput
        x={0}
        y={2}
        value={alpha}
        onChange={setAlpha}
        min={0}
        max={10}
        step={0.1}
        variable="α"
        title="Liver production amplitude"
        theme={theme}
      />

      <GridInput
        x={1}
        y={2}
        value={k}
        onChange={setK}
        min={0}
        max={10}
        step={0.1}
        variable="k"
        title="Insulin sensitivity of liver"
        theme={theme}
      />

      <GridInput
        x={2}
        y={2}
        value={c}
        onChange={setC}
        min={0}
        max={10}
        step={0.1}
        variable="c"
        title="Threshold parameter"
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
        yTicksLeft={[0, 3, 6, 9, 12]}
        yTicksRight={[0, 3, 6, 9, 12]}
        xRange={[0, 20]}
        yRangeLeft={[0, 12]}
        yRangeRight={[0, 12]}
        leftAxisColor={currentTheme === "dark" ? "#ffffff" : "#000000"}
        rightAxisColor={currentTheme === "dark" ? "#ffffff" : "#000000"}
        tooltip="Insulin-Glucose Dynamics"
        theme={theme}
      />

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
            name="insulin-glucose-glucose"
            size="small"
            style={{ lineHeight: "1", marginBottom: "-3px" }}
          />
          <Equation
            name="insulin-glucose-insulin"
            size="small"
            style={{ lineHeight: "1" }}
          />
        </div>
      </GridDisplay>

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

      {/* G --> I delay (tau) slider */}
      <GridSliderHorizontal
        x={6}
        y={4}
        w={2}
        h={1}
        value={tau * (100 / 60)} // Convert 0-60 to 0-100 scale
        onChange={(value) => setTau(value * (60 / 100))}
        variant="unipolar"
        label={`G → I delay (τ) = ${tau.toFixed(0)} min`}
        tooltip={`Glucose to insulin delay (tau): ${tau.toFixed(0)} minutes`}
        theme={theme}
      />

      {/* I --> G delay (sigma) slider */}
      <GridSliderHorizontal
        x={8}
        y={4}
        w={2}
        h={1}
        value={sigma * (100 / 60)} // Convert 0-60 to 0-100 scale
        onChange={(value) => setSigma(value * (60 / 100))}
        variant="unipolar"
        label={`I → G delay (σ) = ${sigma.toFixed(0)} min`}
        tooltip={`Insulin to glucose delay (sigma): ${sigma.toFixed(0)} minutes`}
        theme={theme}
      />
    </ToolContainer>
  );
};

export default InsulinGlucoseTool;
