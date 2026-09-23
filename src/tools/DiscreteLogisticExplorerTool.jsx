// src/tools/DiscreteLogisticExplorerTool.jsx

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  GridSliderHorizontal,
  GridInput,
  GridButton,
  GridGraph,
  GridDisplay,
  GridLabel,
  GridWindow,
} from "../components/grid";
import ToolContainer from "../components/ui/ToolContainer";
import { useTheme } from "../hooks/useTheme";
import { setupCanvas } from "../utils/canvas";
import { niceTicks } from "../utils/ticks";

// The bifurcation diagram is always seeded with P = 0.5 (a point in the
// basin of the attractor for every beta in 0-3), so it does not depend on
// the P0 slider. Seeding with e.g. P0 = 1.4 would send many orbits to -inf.
const BIFURCATION_SEED = 0.5;
// Narrowest allowed beta window (a zero-width window gave NaN)
const MIN_WINDOW = 0.01; // the inputs step by 0.01

const DiscreteLogisticExplorerTool = () => {
  const { theme, currentTheme } = useTheme();

  // UI State
  const [initialPopulation, setInitialPopulation] = useState(0.1);
  const [beta, setBeta] = useState(2.0);
  const [betaMin, setBetaMin] = useState(0.0);
  const [betaMax, setBetaMax] = useState(3.0);

  // Canvas refs
  const timeSeriesCanvasRef = useRef(null);
  const bifurcationCanvasRef = useRef(null);

  // Transform refs for coordinate conversion
  const timeSeriesTransformRef = useRef(null);
  const bifurcationTransformRef = useRef(null);

  // Bifurcation data cache and range
  const [bifurcation, setBifurcation] = useState(null); // { data, min, max }
  const [timeSeriesData, setTimeSeriesData] = useState([]);

  // Discrete logistic model: P_new = P + beta * P * (1 - P)
  const iterateLogistic = useCallback((P, beta) => {
    const deltaP = beta * P * (1 - P);
    return P + deltaP;
  }, []);

  // Run simulation for time series
  const runSimulation = useCallback(() => {
    const numIterations = 50;
    const data = [];
    let P = initialPopulation;

    for (let t = 0; t <= numIterations; t++) {
      data.push({ t, P });
      if (t < numIterations) {
        P = iterateLogistic(P, beta);
      }
    }

    setTimeSeriesData(data);
  }, [initialPopulation, beta, iterateLogistic]);

  // Generate bifurcation diagram data
  const generateBifurcationData = useCallback(
    (initialP, minBeta, maxBeta) => {
      const betaSteps = 650;
      const deltaBeta = (maxBeta - minBeta) / betaSteps;

      const warmupIterations = 150; // Discard transient behavior
      const recordIterations = 100; // Record steady-state values

      const data = [];

      for (let i = 0; i <= betaSteps; i++) {
        const currentBeta = minBeta + i * deltaBeta;
        let P = initialP; // Use provided initial condition

        // Warmup iterations
        for (let j = 0; j < warmupIterations; j++) {
          P = iterateLogistic(P, currentBeta);
        }

        // Record steady-state values
        for (let j = 0; j < recordIterations; j++) {
          data.push({ beta: currentBeta, P });
          P = iterateLogistic(P, currentBeta);
        }
      }

      setBifurcation({ data, min: minBeta, max: maxBeta });
    },
    [iterateLogistic],
  );

  // Recreate bifurcation diagram for the chosen beta range
  const recreateBifurcation = useCallback(() => {
    // Ensure betaMin < betaMax (and a window of nonzero width)
    let min = Math.max(0, Math.min(betaMin, betaMax));
    let max = Math.min(3, Math.max(betaMin, betaMax));
    if (max - min < MIN_WINDOW - 1e-9) {
      max = Math.min(3, min + MIN_WINDOW);
      min = max - MIN_WINDOW;
    }
    // Keep beta inside the new window
    setBeta((b) => Math.max(min, Math.min(max, b)));

    // Update state to corrected values
    setBetaMin(min);
    setBetaMax(max);

    generateBifurcationData(BIFURCATION_SEED, min, max);
  }, [generateBifurcationData, betaMin, betaMax]);

  // Draw time series
  const drawTimeSeries = useCallback(
    () => {
      const canvas = timeSeriesCanvasRef.current;
      const transform = timeSeriesTransformRef.current;
      if (!canvas || !transform || timeSeriesData.length === 0) return;
      const setup = setupCanvas(canvas);
      if (!setup) return;
      const { ctx } = setup;

      const { dataToPixel } = transform;
      ctx.clearRect(0, 0, setup.width, setup.height);

      // Draw points and lines
      ctx.strokeStyle = currentTheme === "dark" ? "#60a5fa" : "#3b82f6";
      ctx.fillStyle = currentTheme === "dark" ? "#60a5fa" : "#3b82f6";
      ctx.lineWidth = 2;

      ctx.beginPath();
      timeSeriesData.forEach((point, index) => {
        const pixel = dataToPixel(point.t, point.P);

        // Draw point
        ctx.beginPath();
        ctx.arc(pixel.x, pixel.y, 3, 0, 2 * Math.PI);
        ctx.fill();

        // Draw line to next point
        if (index < timeSeriesData.length - 1) {
          const nextPoint = timeSeriesData[index + 1];
          const nextPixel = dataToPixel(nextPoint.t, nextPoint.P);

          ctx.beginPath();
          ctx.moveTo(pixel.x, pixel.y);
          ctx.lineTo(nextPixel.x, nextPixel.y);
          ctx.stroke();
        }
      });
    },
    [timeSeriesData, currentTheme],
  );

  // Draw bifurcation diagram
  const drawBifurcation = useCallback(
    () => {
      const canvas = bifurcationCanvasRef.current;
      const transform = bifurcationTransformRef.current;
      if (!canvas || !transform || !bifurcation) return;
      const setup = setupCanvas(canvas);
      if (!setup) return;
      const { ctx, height: plotHeight } = setup;

      const { dataToPixel } = transform;
      ctx.clearRect(0, 0, setup.width, plotHeight);

      // Draw bifurcation points as single pixels with alpha for additive darkening
      ctx.fillStyle =
        currentTheme === "dark"
          ? "rgba(255, 255, 255, 0.15)"
          : "rgba(0, 0, 0, 0.15)";

      bifurcation.data.forEach((point) => {
        const pixel = dataToPixel(point.beta, point.P);
        // Draw single pixel using fillRect for precise positioning
        ctx.fillRect(Math.round(pixel.x), Math.round(pixel.y), 1, 1);
      });

      // Green marker at the current beta: a vertical line with triangles
      // pointing in from the top and bottom edges (drawn inside the plot so
      // they are not clipped)
      const currentBetaX = dataToPixel(beta, 0).x;

      ctx.fillStyle = currentTheme === "dark" ? "#22c55e" : "#16a34a";
      ctx.strokeStyle = currentTheme === "dark" ? "#22c55e" : "#16a34a";
      ctx.lineWidth = 2;

      const triangleSize = 8;

      // Bottom triangle, pointing up
      ctx.beginPath();
      ctx.moveTo(currentBetaX, plotHeight - triangleSize);
      ctx.lineTo(currentBetaX - triangleSize, plotHeight);
      ctx.lineTo(currentBetaX + triangleSize, plotHeight);
      ctx.closePath();
      ctx.fill();

      // Top triangle, pointing down
      ctx.beginPath();
      ctx.moveTo(currentBetaX, triangleSize);
      ctx.lineTo(currentBetaX - triangleSize, 0);
      ctx.lineTo(currentBetaX + triangleSize, 0);
      ctx.closePath();
      ctx.fill();

      // Vertical line connecting the markers
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.moveTo(currentBetaX, triangleSize);
      ctx.lineTo(currentBetaX, plotHeight - triangleSize);
      ctx.stroke();
      ctx.globalAlpha = 1;
    },
    [beta, currentTheme, bifurcation],
  );

  // Initialize bifurcation data on mount only
  useEffect(() => {
    generateBifurcationData(BIFURCATION_SEED, 0.0, 3.0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Run simulation on mount and when parameters change
  useEffect(() => {
    runSimulation();
  }, [runSimulation]);

  // Redraw when data, theme or window changes
  useEffect(() => {
    drawTimeSeries();
  }, [drawTimeSeries]);

  useEffect(() => {
    drawBifurcation();
  }, [drawBifurcation]);

  // Range of the diagram currently shown
  const bifRange = bifurcation ?? { min: 0, max: 3 };

  return (
    <ToolContainer
      title="Discrete Logistic Model Explorer"
      canvasWidth={10}
      canvasHeight={6}
    >
      {/* Bifurcation Diagram (7x4) */}
      <GridGraph
        x={0}
        y={0}
        w={7}
        h={4}
        xLabel="β (Birth Rate)"
        yLabel="Population (P)"
        xTicks={niceTicks(
          bifRange.min,
          bifRange.max,
          6,
        )}
        yTicks={[0, 0.5, 1.0, 1.5]}
        xRange={[
          bifRange.min,
          bifRange.max,
        ]}
        yRange={[0, 1.5]}
        leftAxisColor={currentTheme === "dark" ? "#ffffff" : "#000000"}
        tooltip="Bifurcation Diagram"
        theme={theme}
      >
        {(transform) => {
          bifurcationTransformRef.current = transform;
          return (
            <>
              {/* Title */}
              <div
                className="absolute pointer-events-none"
                style={{
                  top: "20px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  fontSize: "16px",
                  fontWeight: "bold",
                  color: currentTheme === "dark" ? "#ffffff" : "#000000",
                }}
              >
                Bifurcation Plot
              </div>

              <canvas
                ref={bifurcationCanvasRef}
                className="absolute pointer-events-none"
                style={transform.plotStyle}
              />
            </>
          );
        }}
      </GridGraph>

      {/* Time Series Graph (7x2) */}
      <GridGraph
        x={0}
        y={4}
        w={7}
        h={2}
        xLabel="Time (t)"
        yLabel="Population (P)"
        xTicks={[0, 10, 20, 30, 40, 50]}
        yTicks={[0, 0.5, 1.0, 1.5]}
        xRange={[0, 50]}
        yRange={[0, 1.5]}
        leftAxisColor={currentTheme === "dark" ? "#ffffff" : "#000000"}
        tooltip="Time Series"
        theme={theme}
      >
        {(transform) => {
          timeSeriesTransformRef.current = transform;
          return (
            <canvas
              ref={timeSeriesCanvasRef}
              className="absolute pointer-events-none"
              style={transform.plotStyle}
            />
          );
        }}
      </GridGraph>

      {/* Instruction Label */}
      <GridLabel
        x={7}
        y={0}
        w={3}
        h={1}
        text="Change view window of bifurcation plot with the buttons below."
        textAlign="center"
        fontSize={14}
        theme={theme}
      />

      {/* Beta Min Input */}
      <GridInput
        x={7}
        y={1}
        w={1}
        h={1}
        value={betaMin}
        onChange={(value) => {
          const newMin = Math.max(0, Math.min(3, value));
          setBetaMin(newMin);
          if (beta < newMin) setBeta(newMin);
        }}
        min={0.0}
        max={3.0}
        step={0.01}
        variable="βₘᵢₙ"
        title="Minimum beta value"
        theme={theme}
      />

      {/* Beta Max Input */}
      <GridInput
        x={8}
        y={1}
        w={1}
        h={1}
        value={betaMax}
        onChange={(value) => {
          const newMax = Math.max(0, Math.min(3, value));
          setBetaMax(newMax);
          if (beta > newMax) setBeta(newMax);
        }}
        min={0.0}
        max={3.0}
        step={0.01}
        variable="βₘₐₓ"
        title="Maximum beta value"
        theme={theme}
      />

      {/* Set Window Button */}
      <GridButton
        x={9}
        y={1}
        w={1}
        h={1}
        onPress={recreateBifurcation}
        theme={theme}
      >
        <div
          style={{ fontSize: "14px", lineHeight: "1.1", textAlign: "center" }}
        >
          <div>Set</div>
          <div>Window</div>
        </div>
      </GridButton>

      {/* Beta Parameter Slider */}
      <GridSliderHorizontal
        x={7}
        y={2}
        w={3}
        h={1}
        value={
          betaMin < betaMax
            ? ((beta - betaMin) / (betaMax - betaMin)) * 100
            : 50
        }
        onChange={(value) =>
          setBeta(betaMin + (value / 100) * (betaMax - betaMin))
        }
        variant="unipolar"
        label={`Birth rate: β = ${beta.toFixed(2)}`}
        tooltip={`Birth rate parameter (${betaMin.toFixed(2)} to ${betaMax.toFixed(2)})`}
        theme={theme}
      />

      {/* Initial Population Slider */}
      <GridSliderHorizontal
        x={7}
        y={3}
        w={3}
        h={1}
        value={initialPopulation}
        onChange={(value) =>
          setInitialPopulation(Math.round(value * 100) / 100)
        }
        min={0}
        max={1.5}
        step={0.01}
        variant="unipolar"
        label={`Initial population: P₀ = ${initialPopulation.toFixed(2)}`}
        tooltip="Initial population (0 to 1.5)"
        theme={theme}
      />

      {/* Info Display */}
      <GridDisplay
        x={7}
        y={4}
        w={3}
        h={2}
        variant="info"
        align="left"
        fontSize="small"
        theme={theme}
      >
        <div style={{ padding: "8px" }}>
          <div style={{ fontWeight: "bold", marginBottom: "8px" }}>
            Discrete Logistic Model
          </div>
          <div style={{ fontSize: "0.9em", marginBottom: "8px" }}>
            ΔP/Δt = βP(1 − P)
          </div>
          <div style={{ fontSize: "0.85em", lineHeight: "1.6" }}>
            <div>Initial Population: {initialPopulation.toFixed(2)}</div>
            <div>Birth Rate: β = {beta.toPrecision(5)}</div>
            <div style={{ marginTop: "8px", fontSize: "0.8em", opacity: 0.8 }}>
              Range: β ∈ [{betaMin.toFixed(2)}, {betaMax.toFixed(2)}]
            </div>
          </div>
        </div>
      </GridDisplay>
    </ToolContainer>
  );
};

export default DiscreteLogisticExplorerTool;
