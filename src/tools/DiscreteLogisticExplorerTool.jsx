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

const DiscreteLogisticExplorerTool = () => {
  const { theme, currentTheme } = useTheme();

  // UI State
  const [initialPopulation, setInitialPopulation] = useState(0.1);
  const [beta, setBeta] = useState(2.0);
  const [betaMin, setBetaMin] = useState(0.0);
  const [betaMax, setBetaMax] = useState(3.0);
  const [bifurcationVersion, setBifurcationVersion] = useState(0);

  // Canvas refs
  const timeSeriesCanvasRef = useRef(null);
  const bifurcationCanvasRef = useRef(null);

  // Bifurcation data cache and range
  const bifurcationDataRef = useRef(null);
  const bifurcationRangeRef = useRef({ min: 0.0, max: 3.0 });
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

      bifurcationDataRef.current = data;
      bifurcationRangeRef.current = { min: minBeta, max: maxBeta };
    },
    [iterateLogistic],
  );

  // Recreate bifurcation diagram with current P0 and beta range
  const recreateBifurcation = useCallback(() => {
    // Ensure betaMin < betaMax
    const min = Math.max(0, Math.min(betaMin, betaMax));
    const max = Math.min(3, Math.max(betaMin, betaMax));

    // Update state to corrected values
    setBetaMin(min);
    setBetaMax(max);

    generateBifurcationData(initialPopulation, min, max);
    setBifurcationVersion((v) => v + 1); // Trigger redraw
  }, [generateBifurcationData, initialPopulation, betaMin, betaMax]);

  // Draw time series
  const drawTimeSeries = useCallback(
    (canvas, ctx) => {
      if (!canvas || timeSeriesData.length === 0) return;

      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      // Calculate padding to match GridGraph's internal calculations
      const yTicks = [0, 0.5, 1.0, 1.5];
      const maxYTickLength = Math.max(
        ...yTicks.map((t) => t.toString().length),
      );
      const yTickWidth = Math.max(25, maxYTickLength * 6 + 10);
      const yAxisLabelWidth = 20;

      const paddingLeft = yTickWidth + yAxisLabelWidth;
      const paddingRight = 15;
      const paddingTop = 15;
      const paddingBottom = 35;

      const plotWidth = width - paddingLeft - paddingRight;
      const plotHeight = height - paddingTop - paddingBottom;

      const tMax = 50;
      const PMin = 0;
      const PMax = 1.5;

      // Draw points and lines
      ctx.strokeStyle = currentTheme === "dark" ? "#60a5fa" : "#3b82f6";
      ctx.fillStyle = currentTheme === "dark" ? "#60a5fa" : "#3b82f6";
      ctx.lineWidth = 2;

      ctx.beginPath();
      timeSeriesData.forEach((point, index) => {
        const canvasX = paddingLeft + (point.t / tMax) * plotWidth;
        const canvasY =
          paddingTop +
          plotHeight -
          ((point.P - PMin) / (PMax - PMin)) * plotHeight;

        // Draw point
        ctx.beginPath();
        ctx.arc(canvasX, canvasY, 3, 0, 2 * Math.PI);
        ctx.fill();

        // Draw line to next point
        if (index < timeSeriesData.length - 1) {
          const nextPoint = timeSeriesData[index + 1];
          const nextCanvasX = paddingLeft + (nextPoint.t / tMax) * plotWidth;
          const nextCanvasY =
            paddingTop +
            plotHeight -
            ((nextPoint.P - PMin) / (PMax - PMin)) * plotHeight;

          ctx.beginPath();
          ctx.moveTo(canvasX, canvasY);
          ctx.lineTo(nextCanvasX, nextCanvasY);
          ctx.stroke();
        }
      });
    },
    [timeSeriesData, currentTheme],
  );

  // Draw bifurcation diagram
  const drawBifurcation = useCallback(
    (canvas, ctx) => {
      if (!canvas || !bifurcationDataRef.current) return;

      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      // Calculate padding to match GridGraph's internal calculations
      const yTicks = [0, 0.5, 1.0, 1.5];
      const maxYTickLength = Math.max(
        ...yTicks.map((t) => t.toString().length),
      );
      const yTickWidth = Math.max(25, maxYTickLength * 6 + 10);
      const yAxisLabelWidth = 20;

      const paddingLeft = yTickWidth + yAxisLabelWidth;
      const paddingRight = 15;
      const paddingTop = 15;
      const paddingBottom = 35;

      const plotWidth = width - paddingLeft - paddingRight;
      const plotHeight = height - paddingTop - paddingBottom;

      // Use the range that was used to generate the bifurcation data
      const betaMin = bifurcationRangeRef.current.min;
      const betaMax = bifurcationRangeRef.current.max;
      const PMin = 0;
      const PMax = 1.5;

      // Draw bifurcation points as single pixels with alpha for additive darkening
      ctx.fillStyle =
        currentTheme === "dark"
          ? "rgba(255, 255, 255, 0.15)"
          : "rgba(0, 0, 0, 0.15)";

      bifurcationDataRef.current.forEach((point) => {
        const canvasX =
          paddingLeft +
          ((point.beta - betaMin) / (betaMax - betaMin)) * plotWidth;
        const canvasY =
          paddingTop +
          plotHeight -
          ((point.P - PMin) / (PMax - PMin)) * plotHeight;

        // Draw single pixel using fillRect for precise positioning
        ctx.fillRect(Math.round(canvasX), Math.round(canvasY), 1, 1);
      });

      // Draw green triangular marker at current beta value
      const currentBetaX =
        paddingLeft + ((beta - betaMin) / (betaMax - betaMin)) * plotWidth;

      ctx.fillStyle = currentTheme === "dark" ? "#22c55e" : "#16a34a";
      ctx.strokeStyle = currentTheme === "dark" ? "#22c55e" : "#16a34a";
      ctx.lineWidth = 2;

      // Draw triangular marker at bottom
      const triangleSize = 8;
      const triangleY = paddingTop + plotHeight;

      ctx.beginPath();
      ctx.moveTo(currentBetaX, triangleY + 5);
      ctx.lineTo(currentBetaX - triangleSize, triangleY + 5 + triangleSize);
      ctx.lineTo(currentBetaX + triangleSize, triangleY + 5 + triangleSize);
      ctx.closePath();
      ctx.fill();

      // Draw triangular marker at top
      ctx.beginPath();
      ctx.moveTo(currentBetaX, paddingTop - 5);
      ctx.lineTo(currentBetaX - triangleSize, paddingTop - 5 - triangleSize);
      ctx.lineTo(currentBetaX + triangleSize, paddingTop - 5 - triangleSize);
      ctx.closePath();
      ctx.fill();

      // Draw vertical line connecting the markers
      ctx.beginPath();
      ctx.moveTo(currentBetaX, paddingTop - 5);
      ctx.lineTo(currentBetaX, triangleY + 5);
      ctx.stroke();
    },
    [beta, currentTheme, bifurcationVersion],
  );

  // Initialize bifurcation data on mount only
  useEffect(() => {
    generateBifurcationData(0.5, 0.0, 3.0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Run simulation on mount and when parameters change
  useEffect(() => {
    runSimulation();
  }, [runSimulation]);

  // Initialize canvases
  useEffect(() => {
    [timeSeriesCanvasRef, bifurcationCanvasRef].forEach((ref) => {
      if (ref.current) {
        const canvas = ref.current;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
      }
    });

    // Draw initial data
    if (timeSeriesCanvasRef.current) {
      const ctx = timeSeriesCanvasRef.current.getContext("2d");
      drawTimeSeries(timeSeriesCanvasRef.current, ctx);
    }

    if (bifurcationCanvasRef.current) {
      const ctx = bifurcationCanvasRef.current.getContext("2d");
      drawBifurcation(bifurcationCanvasRef.current, ctx);
    }
  }, [drawTimeSeries, drawBifurcation]);

  // Redraw when data or theme changes
  useEffect(() => {
    if (timeSeriesCanvasRef.current) {
      const ctx = timeSeriesCanvasRef.current.getContext("2d");
      drawTimeSeries(timeSeriesCanvasRef.current, ctx);
    }
  }, [drawTimeSeries]);

  useEffect(() => {
    if (bifurcationCanvasRef.current) {
      const ctx = bifurcationCanvasRef.current.getContext("2d");
      drawBifurcation(bifurcationCanvasRef.current, ctx);
    }
  }, [drawBifurcation]);

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
        xTicks={(() => {
          const min = bifurcationRangeRef.current.min;
          const max = bifurcationRangeRef.current.max;
          const range = max - min;
          const step = range <= 1 ? 0.1 : range <= 2 ? 0.25 : 0.5;
          const ticks = [];
          for (let t = Math.ceil(min / step) * step; t <= max; t += step) {
            ticks.push(Math.round(t * 100) / 100);
          }
          return ticks;
        })()}
        yTicks={[0, 0.5, 1.0, 1.5]}
        xRange={[
          bifurcationRangeRef.current.min,
          bifurcationRangeRef.current.max,
        ]}
        yRange={[0, 1.5]}
        leftAxisColor={currentTheme === "dark" ? "#ffffff" : "#000000"}
        tooltip="Bifurcation Diagram"
        theme={theme}
      >
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
          style={{
            left: 1,
            bottom: 1,
            width: "calc(100% - 2px)",
            height: "calc(100% - 2px)",
          }}
        />
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
        <canvas
          ref={timeSeriesCanvasRef}
          className="absolute pointer-events-none"
          style={{
            left: 1,
            bottom: 1,
            width: "calc(100% - 2px)",
            height: "calc(100% - 2px)",
          }}
        />
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
        value={(initialPopulation / 1.5) * 100}
        onChange={(value) => setInitialPopulation((value / 100) * 1.5)}
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
            ΔP/Δt = βP(1 - P)
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
