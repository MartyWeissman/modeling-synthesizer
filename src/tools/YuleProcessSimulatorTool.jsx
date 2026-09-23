// src/tools/YuleProcessSimulatorTool.jsx

import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  GridSliderHorizontal,
  GridButton,
  GridGraph,
  GridDisplay,
  GridInput,
} from "../components/grid";
import ToolContainer from "../components/ui/ToolContainer";
import { useTheme } from "../hooks/useTheme";
import { setupCanvas } from "../utils/canvas";
import { niceTicks, uniqueTicks } from "../utils/ticks";
import { birthDeathStep } from "./stochasticToolsMath";

// Population ceiling: a trial that reaches it is held at this value
// (and flagged in the Results)
const POP_CEILING = 10000;

// On the log scale, extinct trials (population 0) are drawn on a separate
// "0" level half a decade below 1, so they don't look like population 1.
const LOG_ZERO_LEVEL = -0.5;

// Quarter ticks for the time axis, without duplicates for small T
const timeTicks = (T) =>
  uniqueTicks([
    0,
    Math.round(T / 4),
    Math.round(T / 2),
    Math.round((3 * T) / 4),
    T,
  ]);

// Color palette for trial lines
const TRIAL_COLORS = [
  "#3b82f6", // blue
  "#ef4444", // red
  "#22c55e", // green
  "#f59e0b", // amber
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#f97316", // orange
  "#84cc16", // lime
  "#6366f1", // indigo
  "#14b8a6", // teal
  "#e11d48", // rose
  "#a855f7", // purple
  "#0ea5e9", // sky
  "#eab308", // yellow
  "#64748b", // slate
  "#dc2626", // red-600
  "#16a34a", // green-600
  "#2563eb", // blue-600
  "#9333ea", // purple-600
];

const YuleProcessSimulatorTool = () => {
  const { theme, currentTheme } = useTheme();

  // Parameters
  const [divisionProb, setDivisionProb] = useState(5.0); // B% - division probability (0-10%)
  const [deathProb, setDeathProb] = useState(2.0); // D% - death probability (0-10%)
  const [startingPop, setStartingPop] = useState(10); // Starting population
  const [timeElapsed, setTimeElapsed] = useState(50); // Time steps (max 100)
  const [numTrials, setNumTrials] = useState(20); // Number of trials

  // Display options
  const [logScale, setLogScale] = useState(false);

  // Simulation results
  const [trials, setTrials] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const isRunningRef = useRef(false);
  const [statistics, setStatistics] = useState(null);
  // Time span used by the displayed run (the T input may change afterward)
  const [runTime, setRunTime] = useState(null);

  // Canvas ref
  const canvasRef = useRef(null);

  // Transform ref - stores coordinate transformation from GridGraph
  const transformRef = useRef(null);


  // Run simulation
  const runSimulation = useCallback(() => {
    // GridButton has no disabled state, so ignore clicks during a run here
    if (isRunningRef.current) return;
    isRunningRef.current = true;
    setIsRunning(true);

    setTimeout(() => {
      const allTrials = [];
      const B = divisionProb / 100; // Convert percentage to probability
      const D = deathProb / 100;
      const T = Math.max(1, Math.round(timeElapsed));

      for (let trial = 0; trial < numTrials; trial++) {
        const trajectory = [startingPop];
        let pop = startingPop;
        let extinctionTime = null;
        let capped = false;

        for (let t = 1; t <= T; t++) {
          // Deaths first (each individual dies with probability D), then
          // each survivor divides with probability B. binomialSample draws
          // the number of deaths and of divisions directly.
          const next = birthDeathStep(pop, B, D);
          if (next >= POP_CEILING) capped = true;
          pop = Math.min(next, POP_CEILING);
          trajectory.push(pop);

          if (pop === 0 && extinctionTime === null) {
            extinctionTime = t;
          }
        }

        allTrials.push({
          trajectory,
          extinctionTime,
          finalPop: pop,
          capped,
        });
      }

      setTrials(allTrials);
      setRunTime(T);

      // Calculate statistics
      const finalPops = allTrials.map((t) => t.finalPop);
      const extinctions = allTrials.filter((t) => t.finalPop === 0).length;
      const survivors = allTrials.filter((t) => t.finalPop > 0);
      const avgFinal =
        survivors.length > 0
          ? survivors.reduce((sum, t) => sum + t.finalPop, 0) / survivors.length
          : 0;
      const maxPop = Math.max(...finalPops);
      const minPop = Math.min(...finalPops);
      const cappedCount = allTrials.filter((t) => t.capped).length;

      setStatistics({
        extinctions,
        avgFinal,
        maxPop,
        minPop,
        cappedCount,
        totalTrials: numTrials,
      });

      isRunningRef.current = false;
      setIsRunning(false);
    }, 50);
  }, [divisionProb, deathProb, startingPop, timeElapsed, numTrials]);

  // Time axis follows the displayed run (or the T input before any run)
  const plotT = runTime ?? timeElapsed;

  // Calculate max population across all trials for scaling
  const getMaxPop = useCallback(() => {
    if (trials.length === 0) return Math.max(startingPop, 10);

    let maxPop = startingPop;
    trials.forEach((trial) => {
      trial.trajectory.forEach((pop) => {
        if (pop > maxPop) maxPop = pop;
      });
    });
    return Math.max(maxPop, 10);
  }, [trials, startingPop]);

  // Calculate Y range - in log space for log scale
  const getYRange = useCallback(() => {
    const maxPop = getMaxPop();

    if (logScale) {
      // Log scale: range is in log10 space (exponents); the bottom of the
      // range is the separate "0" level for extinct trials
      const logMax = Math.ceil(Math.log10(Math.max(maxPop, 10)));
      return [LOG_ZERO_LEVEL, logMax]; // 0 = 10^0 = 1, logMax = 10^logMax
    } else {
      return [0, maxPop];
    }
  }, [getMaxPop, logScale]);

  // Generate Y ticks for log scale (in log space - these are exponents)
  const generateLogTicks = useCallback((min, max) => {
    const ticks = [];
    for (let power = Math.ceil(min); power <= Math.floor(max); power++) {
      ticks.push(power); // These are exponents: 0, 1, 2, 3 for 1, 10, 100, 1000
    }
    return ticks;
  }, []);

  // Generate minor ticks for log scale (positions of 2,3,4...9 between powers)
  const generateLogMinorTicks = useCallback((majorTicks, min, max) => {
    const minorTicks = [...majorTicks];

    for (let i = 0; i < majorTicks.length; i++) {
      const power = majorTicks[i];
      // Add minor ticks at 2, 3, 4, 5, 6, 7, 8, 9 times 10^power
      for (let multiplier = 2; multiplier <= 9; multiplier++) {
        const logValue = power + Math.log10(multiplier);
        if (logValue >= min && logValue <= max) {
          minorTicks.push(logValue);
        }
      }
    }

    return minorTicks;
  }, []);

  // Generate Y ticks for linear scale (shared helper: no float drift)
  const generateLinearTicks = useCallback(
    (min, max, targetCount = 5) => niceTicks(min, max, targetCount),
    [],
  );

  // Generate minor ticks for linear scale
  const generateLinearMinorTicks = useCallback((majorTicks) => {
    if (majorTicks.length < 2) return majorTicks;

    const minorTicks = [...majorTicks];
    const stepSize = majorTicks[1] - majorTicks[0];
    const minorStepSize = stepSize / 5;

    for (let i = 0; i < majorTicks.length - 1; i++) {
      const start = majorTicks[i];
      for (let j = 1; j < 5; j++) {
        minorTicks.push(start + j * minorStepSize);
      }
    }

    return minorTicks;
  }, []);

  // Get Y ticks - in log space for log scale (GridGraph positions these linearly)
  const getYTicks = useCallback(() => {
    const [yMin, yMax] = getYRange();
    if (logScale) {
      // Exponents (0, 1, 2, 3) - GridGraph positions these linearly in log
      // space - plus the "0" level for extinct trials
      return [LOG_ZERO_LEVEL, ...generateLogTicks(0, yMax)];
    } else {
      return generateLinearTicks(yMin, yMax);
    }
  }, [getYRange, logScale, generateLogTicks, generateLinearTicks]);

  // Draw trajectories on canvas
  const drawTrajectories = useCallback(() => {
    const canvas = canvasRef.current;
    const transform = transformRef.current;
    if (!canvas || !transform) return;

    const { plotWidth, plotHeight, dataToPixel } = transform;
    const { ctx } = setupCanvas(canvas, {
      width: plotWidth,
      height: plotHeight,
    });

    ctx.clearRect(0, 0, plotWidth, plotHeight);

    const [yMin, yMax] = getYRange();

    // Generate minor ticks for gridlines
    let yMinorTicks;
    if (logScale) {
      const majorTicks = generateLogTicks(0, yMax);
      yMinorTicks = [
        LOG_ZERO_LEVEL,
        ...generateLogMinorTicks(majorTicks, 0, yMax),
      ];
    } else {
      const majorTicks = generateLinearTicks(yMin, yMax);
      yMinorTicks = generateLinearMinorTicks(majorTicks);
    }

    // Generate X minor ticks
    const xMinorTicks = generateLinearMinorTicks(timeTicks(plotT));

    // Draw minor grid lines
    const gridColor =
      currentTheme === "dark"
        ? "rgba(100, 116, 139, 0.4)"
        : "rgba(148, 163, 184, 0.5)";

    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 0.5;
    ctx.setLineDash([2, 2]);

    // Vertical gridlines (time axis)
    xMinorTicks.forEach((tick) => {
      const pos = dataToPixel(tick, yMin);
      ctx.beginPath();
      ctx.moveTo(pos.x, 0);
      ctx.lineTo(pos.x, plotHeight);
      ctx.stroke();
    });

    // Horizontal gridlines (population axis)
    yMinorTicks.forEach((tick) => {
      const pos = dataToPixel(0, tick);
      ctx.beginPath();
      ctx.moveTo(0, pos.y);
      ctx.lineTo(plotWidth, pos.y);
      ctx.stroke();
    });

    ctx.setLineDash([]);

    if (trials.length === 0) return;

    // Draw each trial trajectory
    trials.forEach((trial, trialIndex) => {
      const color = TRIAL_COLORS[trialIndex % TRIAL_COLORS.length];
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();

      trial.trajectory.forEach((pop, t) => {
        // On the log scale, 0 is drawn on its own level below 1
        const displayY = logScale
          ? pop > 0
            ? Math.log10(pop)
            : LOG_ZERO_LEVEL
          : pop;

        const pos = dataToPixel(t, displayY);

        if (t === 0) {
          ctx.moveTo(pos.x, pos.y);
        } else {
          ctx.lineTo(pos.x, pos.y);
        }
      });

      ctx.stroke();

      // Mark extinction with a circle
      if (trial.extinctionTime !== null) {
        const extPos = dataToPixel(trial.extinctionTime, yMin);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(extPos.x, plotHeight - 4, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }, [
    trials,
    plotT,
    logScale,
    getYRange,
    generateLogTicks,
    generateLogMinorTicks,
    generateLinearTicks,
    generateLinearMinorTicks,
    currentTheme,
  ]);

  // Redraw after every render (cheap): the plot area can change size when
  // the tick labels change, which resets the canvas.
  useEffect(() => {
    drawTrajectories();
  });

  // yRange for GridGraph - use log space for log scale so ticks position correctly
  const yRange = getYRange();
  const yTicks = getYTicks();

  // Custom tick labels for log scale (show 1, 10, 100, 1000 instead of 0, 1, 2, 3)
  const yTickLabels = logScale
    ? yTicks.map((exp) =>
        exp === LOG_ZERO_LEVEL ? "0" : Math.pow(10, exp).toString(),
      )
    : null;

  return (
    <ToolContainer
      title="Yule Process Simulator"
      canvasWidth={9}
      canvasHeight={6}
    >
      {/* Main graph */}
      <GridGraph
        x={0}
        y={0}
        w={6}
        h={6}
        xLabel="Time"
        yLabel="Population"
        xRange={[0, plotT]}
        yRange={yRange}
        xTicks={timeTicks(plotT)}
        yTicks={yTicks}
        yTickLabels={yTickLabels}
        theme={theme}
        tooltip="Population Trajectories"
      >
        {(transform) => {
          // Store transform for use in drawing functions
          transformRef.current = transform;
          return (
            <canvas
              ref={canvasRef}
              style={{
                ...transform.plotStyle,
                pointerEvents: "none",
              }}
            />
          );
        }}
      </GridGraph>

      {/* Division probability slider */}
      <GridSliderHorizontal
        x={6}
        y={0}
        w={3}
        h={1}
        value={divisionProb * 10}
        onChange={(value) => setDivisionProb(value / 10)}
        variant="unipolar"
        label={`Division (B) = ${divisionProb.toFixed(1)}% per step`}
        theme={theme}
      />

      {/* Death probability slider */}
      <GridSliderHorizontal
        x={6}
        y={1}
        w={3}
        h={1}
        value={deathProb * 10}
        onChange={(value) => setDeathProb(value / 10)}
        variant="unipolar"
        label={`Death (D) = ${deathProb.toFixed(1)}% per step`}
        theme={theme}
      />

      {/* Starting population input */}
      <GridInput
        x={6}
        y={2}
        w={1}
        h={1}
        value={startingPop}
        onChange={setStartingPop}
        min={1}
        max={100}
        step={1}
        variable="Pop"
        title="Starting population"
        theme={theme}
      />

      {/* Time elapsed input */}
      <GridInput
        x={7}
        y={2}
        w={1}
        h={1}
        value={timeElapsed}
        onChange={setTimeElapsed}
        min={1}
        max={100}
        step={1}
        variable="T"
        title="Time elapsed (max 100)"
        theme={theme}
      />

      {/* Number of trials input */}
      <GridInput
        x={8}
        y={2}
        w={1}
        h={1}
        value={numTrials}
        onChange={setNumTrials}
        min={1}
        max={50}
        step={1}
        variable="N"
        title="Number of trials"
        theme={theme}
      />

      {/* Simulate button */}
      <GridButton
        x={6}
        y={3}
        w={1}
        h={1}
        type="momentary"
        variant="function"
        onPress={runSimulation}
        theme={theme}
      >
        <div style={{ textAlign: "center", lineHeight: "1.1" }}>
          {isRunning ? "..." : "Run!"}
        </div>
      </GridButton>

      {/* Log scale toggle */}
      <GridButton
        x={7}
        y={3}
        w={2}
        h={1}
        type="toggle"
        variant="function"
        active={logScale}
        onToggle={setLogScale}
        theme={theme}
      >
        <div style={{ textAlign: "center", lineHeight: "1.1" }}>
          <div>Log</div>
          <div>Scale</div>
        </div>
      </GridButton>

      {/* Results display */}
      <GridDisplay
        x={6}
        y={4}
        w={3}
        h={2}
        variant="info"
        align="left"
        fontSize="small"
        theme={theme}
      >
        {statistics ? (
          <div
            style={{
              padding: "8px",
              fontFamily: "monospace",
              fontSize: "13px",
              lineHeight: "1.6",
            }}
          >
            <div>
              <span style={{ fontWeight: "bold" }}>Extinctions: </span>
              <span>
                {statistics.extinctions} / {statistics.totalTrials} (
                {(
                  (statistics.extinctions / statistics.totalTrials) *
                  100
                ).toFixed(0)}
                %)
              </span>
            </div>
            <div>
              <span style={{ fontWeight: "bold" }}>Survivors Avg: </span>
              <span>
                {statistics.avgFinal.toFixed(1)}
                {statistics.cappedCount > 0 ? "*" : ""}
              </span>
            </div>
            <div>
              <span style={{ fontWeight: "bold" }}>Min Final: </span>
              <span>{statistics.minPop}</span>
            </div>
            <div>
              <span style={{ fontWeight: "bold" }}>Max Final: </span>
              <span>
                {statistics.maxPop}
                {statistics.cappedCount > 0 ? "*" : ""}
              </span>
            </div>
            {statistics.cappedCount > 0 && (
              <div
                style={{
                  color: currentTheme === "dark" ? "#fbbf24" : "#b45309",
                }}
                title="These trials reached the 10,000 cap, so their true populations are larger"
              >
                <span style={{ fontWeight: "bold" }}>*Hit 10,000 cap: </span>
                <span>
                  {statistics.cappedCount} / {statistics.totalTrials}
                </span>
              </div>
            )}
          </div>
        ) : (
          <div style={{ padding: "12px", fontSize: "13px", opacity: 0.6 }}>
            Click "Run!" to simulate
          </div>
        )}
      </GridDisplay>
    </ToolContainer>
  );
};

export default YuleProcessSimulatorTool;
