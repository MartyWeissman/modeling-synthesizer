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
import {
  simulateInsulinGlucose,
  MEAL_TIMES,
  SNACK_TIMES,
  CHALLENGE_TIME,
} from "./insulinGlucoseModel";
import { drawInsulinGlucosePlot } from "./insulinGlucosePlot";

// Axis tops. Values above these are drawn off the top of the graph with a ▲
// marker, and the legend shows the peak value.
const GLUCOSE_AXIS_MAX = 12; // mM
const INSULIN_AXIS_MAX = 200; // pM

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

  // Solve the model (RK4, see insulinGlucoseModel.js). The results are the
  // exact solution of the equations shown; at the defaults the system starts at
  // its equilibrium (G = 5 mM, I = 50 pM), so the graphs are flat.
  const runSimulation = useCallback(
    (mode = "baseline", params = null) => {
      const currentParams = params || { m, s, q, B, gamma };
      setTimeSeriesData(simulateInsulinGlucose(currentParams, { mode }));
      setCurrentMode(mode);
    },
    [m, s, q, B, gamma],
  );

  // Draw the time series on the dual Y-axis graph canvas
  const drawTimeSeries = useCallback(() => {
    const markers = [];
    if (currentMode === "challenge") {
      markers.push({ time: CHALLENGE_TIME, label: "Challenge", dash: [3, 3] });
    } else if (currentMode === "meals" || currentMode === "mealsSnacks") {
      MEAL_TIMES.forEach((t) => markers.push({ time: t, label: "Meal" }));
      if (currentMode === "mealsSnacks") {
        const snackColor = currentTheme === "dark" ? "#fbbf24" : "#b45309";
        SNACK_TIMES.forEach((t) =>
          markers.push({ time: t, label: "Snack", color: snackColor }),
        );
      }
    }
    drawInsulinGlucosePlot(
      canvasRef.current,
      transformRef.current,
      timeSeriesData,
      {
        isDark: currentTheme === "dark",
        glucoseMax: GLUCOSE_AXIS_MAX,
        insulinMax: INSULIN_AXIS_MAX,
        markers,
      },
    );
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
      {/* Parameters: m, s, q across the top row; B and γ down the left column */}
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
        x={0}
        y={2}
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
        yUnitLeft="mM"
        yUnitRight="pM"
        xTicks={[0, 5, 10, 15, 20]}
        yTicksLeft={[0, 3, 6, 9, 12]}
        yTicksRight={[0, 50, 100, 150, 200]}
        xRange={[0, 20]}
        yRangeLeft={[0, GLUCOSE_AXIS_MAX]}
        yRangeRight={[0, INSULIN_AXIS_MAX]}
        leftAxisColor={currentTheme === "dark" ? "#ffffff" : "#000000"}
        rightAxisColor={currentTheme === "dark" ? "#ffffff" : "#000000"}
        tooltip="Insulin-Glucose Dynamics"
        theme={theme}
      >
        {(transform) => {
          transformRef.current = transform;
          return (
            <canvas ref={canvasRef} style={transform.plotStyle} />
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

      {/* Scenario buttons, grouped as a 2 × 2 block */}
      <GridButton
        x={1}
        y={1}
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
        x={2}
        y={1}
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
