// src/tools/InsulinGlucoseTool.jsx

import React, { useState, useEffect, useCallback, useRef } from "react";
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
import {
  simulateInsulinGlucoseEuler,
  MEAL_TIMES,
  CHALLENGE_TIME,
} from "./insulinGlucoseModel";
import { drawInsulinGlucosePlot } from "./insulinGlucosePlot";

// Axis tops. Values above these are drawn off the top of the graph with a ▲
// marker, and the legend shows the peak value.
const GLUCOSE_AXIS_MAX = 12; // mM
const INSULIN_AXIS_MAX = 200; // pM (insulin is displayed as I × 100 pM)

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

  // σ acts only through the liver term, which vanishes when α = 0.
  const sigmaActive = alpha !== 0;

  // Canvas and transform refs
  const canvasRef = useRef(null);
  const transformRef = useRef(null);

  // Solve the model with the delays (see simulateInsulinGlucoseEuler in
  // insulinGlucoseModel.js: the original 0.1 h Euler scheme, with automatic
  // sub-steps where one step would be unstable, instead of clamping at 0).
  const runSimulation = useCallback(
    (mode = "baseline", params = null) => {
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
      setTimeSeriesData(simulateInsulinGlucoseEuler(currentParams, { mode }));
      setCurrentMode(mode);
    },
    [m, s, q, B, gamma, tau, alpha, k, c, sigma],
  );

  // Draw the time series on the dual Y-axis graph canvas
  const drawTimeSeries = useCallback(() => {
    const markers = [];
    if (currentMode === "challenge") {
      markers.push({ time: CHALLENGE_TIME, label: "Challenge", dash: [3, 3] });
    } else if (currentMode === "meals") {
      MEAL_TIMES.forEach((t) => markers.push({ time: t, label: "Meal" }));
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

      {/* I --> G delay (sigma) slider. σ only delays insulin's effect on the
          liver term α / (1 + e^(k·I(t − σ) − c)), so it has no effect when
          α = 0 (the default): the slider is dimmed and says so. */}
      <div
        style={{
          opacity: sigmaActive ? 1 : 0.45,
          transition: "opacity 0.2s",
        }}
      >
        <GridSliderHorizontal
          x={8}
          y={4}
          w={2}
          h={1}
          value={sigma * (100 / 60)} // Convert 0-60 to 0-100 scale
          onChange={(value) => setSigma(value * (60 / 100))}
          variant="unipolar"
          label={
            sigmaActive
              ? `I → G delay (σ) = ${sigma.toFixed(0)} min`
              : `σ = ${sigma.toFixed(0)} min (no effect: α = 0)`
          }
          tooltip={
            sigmaActive
              ? `Insulin to glucose (liver) delay (sigma): ${sigma.toFixed(0)} minutes`
              : "Insulin to glucose (liver) delay (sigma). It only acts through the liver term, so it has no effect while α = 0. Set α > 0 to use it."
          }
          theme={theme}
        />
      </div>
    </ToolContainer>
  );
};

export default InsulinGlucoseTool;
