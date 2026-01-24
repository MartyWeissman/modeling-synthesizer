// src/tools/GrowthCollapseSimulatorTool.jsx

import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  GridSliderHorizontal,
  GridButton,
  GridWindow,
  GridDisplay,
  GridInput,
} from "../components/grid";
import ToolContainer from "../components/ui/ToolContainer";
import { useTheme } from "../hooks/useTheme";

const GrowthCollapseSimulatorTool = () => {
  const { theme, currentTheme } = useTheme();

  // Parameters - linked probabilities
  const [probGrowth, setProbGrowth] = useState(0.9);
  const [timeSpan, setTimeSpan] = useState(50);

  // Fixed number of trials
  const numTrials = 500;

  // Simulation results
  const [results, setResults] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // Canvas refs
  const samplesCanvasRef = useRef(null);
  const histogramCanvasRef = useRef(null);

  // Animation state ref (for smooth animation without re-renders)
  const animationStateRef = useRef({
    heights: [], // Current height of each sample
    randomSeeds: [], // Pre-generated random values for each sample at each step
    animationId: null,
    isRunning: false,
  });

  // Linked probability handler
  const handleProbGrowthChange = useCallback((value) => {
    setProbGrowth(value / 100);
  }, []);

  // Get color for height value using 10-step "hot" gradient
  // M is the range maximum (smallest multiple of 10 > max height)
  const getHeightColor = useCallback((height, M) => {
    // 10-step hot gradient: cold (blue/purple) to hot (red/orange/yellow)
    const hotGradient = [
      "#3b82f6", // 0: blue (coldest)
      "#6366f1", // 1: indigo
      "#8b5cf6", // 2: violet
      "#a855f7", // 3: purple
      "#d946ef", // 4: fuchsia
      "#ec4899", // 5: pink
      "#f43f5e", // 6: rose
      "#ef4444", // 7: red
      "#f97316", // 8: orange
      "#eab308", // 9: yellow (hottest)
    ];

    if (M === 0) return hotGradient[0];

    // Determine which of the 10 bins this height falls into
    const binSize = M / 10;
    const binIndex = Math.min(Math.floor(height / binSize), 9);

    return hotGradient[binIndex];
  }, []);

  // Draw samples visualization (animated version - uses fixed max scale)
  const drawAnimatedSamples = useCallback(
    (data, step, totalSteps, finalMax) => {
      const canvas = samplesCanvasRef.current;
      if (!canvas || data.length === 0) return;

      const ctx = canvas.getContext("2d");
      const { width, height } = canvas;
      const padding = { top: 28, right: 20, bottom: 20, left: 55 };

      ctx.clearRect(0, 0, width, height);

      const chartWidth = width - padding.left - padding.right;
      const chartHeight = height - padding.top - padding.bottom;

      // Use the pre-calculated final max for consistent scaling
      const displayMax = Math.max(finalMax, 10);

      // Calculate M for color gradient
      const M = Math.ceil((displayMax + 1) / 10) * 10;

      const barWidth = Math.max(1, chartWidth / data.length - 1);

      // Draw axes
      ctx.strokeStyle = currentTheme === "dark" ? "#666666" : "#999999";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padding.left, padding.top);
      ctx.lineTo(padding.left, height - padding.bottom);
      ctx.lineTo(width - padding.right, height - padding.bottom);
      ctx.stroke();

      // Draw y-axis tick labels
      ctx.fillStyle = currentTheme === "dark" ? "#ffffff" : "#000000";
      ctx.font = "11px sans-serif";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";

      const yTicks = [0, Math.round(displayMax / 2), displayMax];
      yTicks.forEach((tick) => {
        const y = height - padding.bottom - (tick / displayMax) * chartHeight;
        ctx.fillText(tick.toString(), padding.left - 5, y);
      });

      // Y-axis label (Height)
      ctx.fillStyle = currentTheme === "dark" ? "#ffffff" : "#000000";
      ctx.save();
      ctx.translate(
        16,
        (height - padding.top - padding.bottom) / 2 + padding.top,
      );
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "11px sans-serif";
      ctx.fillText("Height", 0, 0);
      ctx.restore();

      // Draw sample bars with 10-step hot gradient
      data.forEach((value, i) => {
        const x = padding.left + (i / data.length) * chartWidth;
        const barHeight =
          displayMax > 0 ? (value / displayMax) * chartHeight : 0;
        const y = height - padding.bottom - barHeight;

        ctx.fillStyle = getHeightColor(value, M);

        if (value === 0) {
          // Draw small dot for zero values
          ctx.beginPath();
          ctx.arc(
            x + barWidth / 2,
            height - padding.bottom - 2,
            2,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        } else {
          ctx.fillRect(x, y, Math.max(barWidth, 1), barHeight);
        }
      });

      // Title with step counter
      ctx.fillStyle = currentTheme === "dark" ? "#ffffff" : "#000000";
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(
        `Step ${step} of ${totalSteps} — watching 500 samples grow & collapse`,
        width / 2,
        12,
      );
    },
    [currentTheme, getHeightColor],
  );

  // Draw samples visualization (final static version)
  const drawSamples = useCallback(
    (data, stats) => {
      const canvas = samplesCanvasRef.current;
      if (!canvas || data.length === 0) return;

      const ctx = canvas.getContext("2d");
      const { width, height } = canvas;
      const padding = { top: 28, right: 20, bottom: 20, left: 55 };

      ctx.clearRect(0, 0, width, height);

      const chartWidth = width - padding.left - padding.right;
      const chartHeight = height - padding.top - padding.bottom;
      const maxHeight = stats.max;

      // Calculate M for consistent 10-step gradient with histogram
      const M = maxHeight > 0 ? Math.ceil((maxHeight + 1) / 10) * 10 : 10;

      const barWidth = Math.max(1, chartWidth / data.length - 1);

      // Draw axes
      ctx.strokeStyle = currentTheme === "dark" ? "#666666" : "#999999";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padding.left, padding.top);
      ctx.lineTo(padding.left, height - padding.bottom);
      ctx.lineTo(width - padding.right, height - padding.bottom);
      ctx.stroke();

      // Draw y-axis tick labels
      ctx.fillStyle = currentTheme === "dark" ? "#ffffff" : "#000000";
      ctx.font = "11px sans-serif";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";

      const yTicks = [0, Math.round(maxHeight / 2), maxHeight];
      yTicks.forEach((tick) => {
        const y = height - padding.bottom - (tick / maxHeight) * chartHeight;
        ctx.fillText(tick.toString(), padding.left - 5, y);
      });

      // Draw average as y-axis tick label (green)
      if (stats.average > 0) {
        const avgY =
          height - padding.bottom - (stats.average / maxHeight) * chartHeight;
        ctx.fillStyle = currentTheme === "dark" ? "#4ade80" : "#16a34a";
        ctx.font = "bold 10px sans-serif";
        ctx.textAlign = "right";
        ctx.fillText(stats.average.toFixed(1), padding.left - 5, avgY);
      }

      // Y-axis label (Height)
      ctx.fillStyle = currentTheme === "dark" ? "#ffffff" : "#000000";
      ctx.save();
      ctx.translate(
        16,
        (height - padding.top - padding.bottom) / 2 + padding.top,
      );
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "11px sans-serif";
      ctx.fillText("Height", 0, 0);
      ctx.restore();

      // Draw sample bars with 10-step hot gradient
      data.forEach((value, i) => {
        const x = padding.left + (i / data.length) * chartWidth;
        const barHeight = maxHeight > 0 ? (value / maxHeight) * chartHeight : 0;
        const y = height - padding.bottom - barHeight;

        ctx.fillStyle = getHeightColor(value, M);

        if (value === 0) {
          // Draw small dot for zero values
          ctx.beginPath();
          ctx.arc(
            x + barWidth / 2,
            height - padding.bottom - 2,
            2,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        } else {
          ctx.fillRect(x, y, Math.max(barWidth, 1), barHeight);
        }
      });

      // Draw average line
      if (stats.average > 0) {
        const avgY =
          height - padding.bottom - (stats.average / maxHeight) * chartHeight;
        ctx.strokeStyle = currentTheme === "dark" ? "#4ade80" : "#16a34a";
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 3]);
        ctx.beginPath();
        ctx.moveTo(padding.left, avgY);
        ctx.lineTo(width - padding.right, avgY);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Title
      ctx.fillStyle = currentTheme === "dark" ? "#ffffff" : "#000000";
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(
        `Height of 500 samples after ${timeSpan} steps`,
        width / 2,
        12,
      );
    },
    [currentTheme, getHeightColor, timeSpan],
  );

  // Draw histogram
  const drawHistogram = useCallback(
    (data, stats) => {
      const canvas = histogramCanvasRef.current;
      if (!canvas || data.length === 0) return;

      const ctx = canvas.getContext("2d");
      const { width, height } = canvas;
      const padding = { top: 28, right: 10, bottom: 38, left: 45 };

      ctx.clearRect(0, 0, width, height);

      const chartWidth = width - padding.left - padding.right;
      const chartHeight = height - padding.top - padding.bottom;

      // Create histogram bins with proper sizing
      // M = smallest multiple of 10 strictly greater than max height
      const numBins = 10;
      const maxHeight = stats.max;
      const M = maxHeight > 0 ? Math.ceil((maxHeight + 1) / 10) * 10 : 10;
      const binSize = M / numBins; // Each bin contains binSize integers
      const bins = new Array(numBins).fill(0);

      data.forEach((value) => {
        const binIndex = Math.min(Math.floor(value / binSize), numBins - 1);
        bins[binIndex]++;
      });

      const maxCount = Math.max(...bins, 1);
      const barWidth = chartWidth / numBins - 2;

      // Draw axes
      ctx.strokeStyle = currentTheme === "dark" ? "#666666" : "#999999";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padding.left, padding.top);
      ctx.lineTo(padding.left, height - padding.bottom);
      ctx.lineTo(width - padding.right, height - padding.bottom);
      ctx.stroke();

      // Draw y-axis labels (counts)
      ctx.fillStyle = currentTheme === "dark" ? "#ffffff" : "#000000";
      ctx.font = "10px sans-serif";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";

      const yTicks = [0, Math.round(maxCount / 2), maxCount];
      yTicks.forEach((tick) => {
        const y = height - padding.bottom - (tick / maxCount) * chartHeight;
        ctx.fillText(tick.toString(), padding.left - 5, y);
      });

      // Y-axis label (Frequency)
      ctx.save();
      ctx.translate(16, height / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "11px sans-serif";
      ctx.fillText("Frequency", 0, 0);
      ctx.restore();

      // X-axis label (Height)
      ctx.fillStyle = currentTheme === "dark" ? "#ffffff" : "#000000";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.font = "11px sans-serif";
      ctx.fillText("Height", padding.left + chartWidth / 2, height - 16);

      // Draw histogram bars with bin range labels
      bins.forEach((count, i) => {
        const x = padding.left + i * (chartWidth / numBins) + 1;
        const barHeight = (count / maxCount) * chartHeight;
        const y = height - padding.bottom - barHeight;

        // Calculate bin range: from i*binSize to (i+1)*binSize - 1
        const binStart = Math.round(i * binSize);
        const binEnd = Math.round((i + 1) * binSize - 1);
        const midValue = (i + 0.5) * binSize;

        ctx.fillStyle = getHeightColor(midValue, M);
        ctx.fillRect(x, y, barWidth, barHeight);

        // Bar outline
        ctx.strokeStyle = currentTheme === "dark" ? "#333333" : "#cccccc";
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x, y, barWidth, barHeight);

        // Bin range label under each bar
        ctx.fillStyle = currentTheme === "dark" ? "#ffffff" : "#000000";
        ctx.font = "9px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        const labelX = x + barWidth / 2;

        // If bin contains single integer, just show that number
        // Otherwise show range like "0-2" or "3-5"
        const label =
          binSize === 1 ? binStart.toString() : `${binStart}-${binEnd}`;
        ctx.fillText(label, labelX, height - padding.bottom + 3);
      });

      // Title
      ctx.fillStyle = currentTheme === "dark" ? "#ffffff" : "#000000";
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Heights of 500 samples: Histogram", width / 2, 10);
    },
    [currentTheme, getHeightColor],
  );

  // Initialize canvases
  useEffect(() => {
    const initCanvas = (ref) => {
      const canvas = ref.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
      }
    };

    initCanvas(samplesCanvasRef);
    initCanvas(histogramCanvasRef);

    // Draw placeholder text if no results
    if (results.length === 0) {
      const samplesCanvas = samplesCanvasRef.current;
      if (samplesCanvas) {
        const ctx = samplesCanvas.getContext("2d");
        ctx.fillStyle = currentTheme === "dark" ? "#666666" : "#999999";
        ctx.font = "14px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(
          'Click "Run!" to simulate',
          samplesCanvas.width / 2,
          samplesCanvas.height / 2,
        );
      }
    }
  }, [currentTheme, results.length]);

  // Redraw when results or theme changes
  useEffect(() => {
    if (results.length > 0 && statistics) {
      drawSamples(results, statistics);
      drawHistogram(results, statistics);
    }
  }, [results, statistics, drawSamples, drawHistogram]);

  // Run animated simulation
  const runSimulation = useCallback(() => {
    // Cancel any existing animation
    if (animationStateRef.current.animationId) {
      clearInterval(animationStateRef.current.animationId);
    }

    setIsRunning(true);
    setCurrentStep(0);
    setStatistics(null);

    // Pre-generate all random values for deterministic playback
    const randomSeeds = [];
    for (let trial = 0; trial < numTrials; trial++) {
      const trialSeeds = [];
      for (let t = 0; t < timeSpan; t++) {
        trialSeeds.push(Math.random());
      }
      randomSeeds.push(trialSeeds);
    }

    // Pre-calculate final heights to determine the max for consistent y-axis scaling
    const finalHeights = new Array(numTrials).fill(0);
    for (let trial = 0; trial < numTrials; trial++) {
      let h = 0;
      for (let t = 0; t < timeSpan; t++) {
        if (randomSeeds[trial][t] < probGrowth) {
          h += 1;
        } else {
          h = 0;
        }
      }
      finalHeights[trial] = h;
    }
    const finalMax = Math.max(...finalHeights, 1);

    // Initialize heights to 0
    const heights = new Array(numTrials).fill(0);

    animationStateRef.current = {
      heights,
      randomSeeds,
      step: 0,
      animationId: null,
      isRunning: true,
      finalMax,
    };

    // Draw initial state
    drawAnimatedSamples(heights, 0, timeSpan, finalMax);

    // Animation interval - 100ms per step (0.1 seconds)
    const intervalId = setInterval(() => {
      const state = animationStateRef.current;

      if (state.step >= timeSpan) {
        // Animation complete
        clearInterval(intervalId);
        state.isRunning = false;

        // Calculate final statistics
        const max = Math.max(...state.heights);
        const sum = state.heights.reduce((a, b) => a + b, 0);
        const average = sum / state.heights.length;

        setResults([...state.heights]);
        setStatistics({ max, average });
        setCurrentStep(timeSpan);
        setIsRunning(false);
        return;
      }

      // Process this step for all samples
      const currentStep = state.step;
      for (let i = 0; i < numTrials; i++) {
        if (state.randomSeeds[i][currentStep] < probGrowth) {
          state.heights[i] += 1;
        } else {
          state.heights[i] = 0; // Collapse!
        }
      }

      state.step += 1;
      setCurrentStep(state.step);

      // Draw updated state
      drawAnimatedSamples(
        [...state.heights],
        state.step,
        timeSpan,
        state.finalMax,
      );
    }, 100);

    animationStateRef.current.animationId = intervalId;
  }, [probGrowth, timeSpan, numTrials, drawAnimatedSamples]);

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (animationStateRef.current.animationId) {
        clearInterval(animationStateRef.current.animationId);
      }
    };
  }, []);

  const probCollapse = 1 - probGrowth;

  return (
    <ToolContainer
      title="Growth & Collapse Simulator"
      canvasWidth={10}
      canvasHeight={4}
    >
      {/* Samples visualization - full width */}
      <GridWindow x={0} y={0} w={10} h={2} theme={theme}>
        <canvas
          ref={samplesCanvasRef}
          style={{
            width: "100%",
            height: "100%",
            display: "block",
          }}
        />
      </GridWindow>

      {/* P(Growth) slider */}
      <GridSliderHorizontal
        x={0}
        y={2}
        w={3}
        h={1}
        value={probGrowth * 100}
        onChange={handleProbGrowthChange}
        variant="unipolar"
        label={`P(Growth) = ${probGrowth.toFixed(2)}`}
        theme={theme}
      />

      {/* P(Collapse) slider - linked */}
      <GridSliderHorizontal
        x={0}
        y={3}
        w={3}
        h={1}
        value={probCollapse * 100}
        onChange={(value) => handleProbGrowthChange(100 - value)}
        variant="unipolar"
        label={`P(Collapse) = ${probCollapse.toFixed(2)}`}
        theme={theme}
      />

      {/* Time span input */}
      <GridInput
        x={3}
        y={2}
        w={1}
        h={1}
        value={timeSpan}
        onChange={setTimeSpan}
        min={1}
        max={100}
        step={1}
        variable="Time"
        title="Time span (number of steps)"
        theme={theme}
      />

      {/* Run button */}
      <GridButton
        x={3}
        y={3}
        w={1}
        h={1}
        type="momentary"
        variant="function"
        onPress={runSimulation}
        disabled={isRunning}
        theme={theme}
      >
        <div style={{ textAlign: "center", lineHeight: "1.1" }}>
          {isRunning ? "..." : "Run!"}
        </div>
      </GridButton>

      {/* Results display */}
      <GridDisplay
        x={4}
        y={2}
        w={2}
        h={2}
        variant="info"
        align="center"
        theme={theme}
      >
        {isRunning ? (
          <div
            style={{
              padding: "8px",
              fontFamily: "monospace",
              fontSize: "14px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              width: "100%",
              lineHeight: "1.8",
            }}
          >
            <div
              style={{
                fontWeight: "bold",
                color: currentTheme === "dark" ? "#fbbf24" : "#d97706",
              }}
            >
              Simulating...
            </div>
            <div>
              <span style={{ fontWeight: "bold" }}>Step: </span>
              <span>
                {currentStep} / {timeSpan}
              </span>
            </div>
          </div>
        ) : statistics ? (
          <div
            style={{
              padding: "8px",
              fontFamily: "monospace",
              fontSize: "14px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              width: "100%",
              lineHeight: "1.8",
            }}
          >
            <div>
              <span style={{ fontWeight: "bold" }}>Max Height: </span>
              <span>{statistics.max}</span>
            </div>
            <div>
              <span style={{ fontWeight: "bold" }}>Average: </span>
              <span>{statistics.average.toFixed(2)}</span>
            </div>
          </div>
        ) : (
          <div style={{ padding: "12px", fontSize: "14px", opacity: 0.6 }}>
            Click "Run!" to simulate
          </div>
        )}
      </GridDisplay>

      {/* Histogram */}
      <GridWindow x={6} y={2} w={4} h={2} theme={theme}>
        <canvas
          ref={histogramCanvasRef}
          style={{
            width: "100%",
            height: "100%",
            display: "block",
          }}
        />
      </GridWindow>
    </ToolContainer>
  );
};

export default GrowthCollapseSimulatorTool;
