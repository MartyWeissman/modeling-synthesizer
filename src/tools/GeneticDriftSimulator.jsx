// src/tools/GeneticDriftSimulator.jsx

import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  GridSliderHorizontal,
  GridButton,
  GridGraph,
  GridDisplay,
  GridInput,
  GridTextInput,
} from "../components/grid";
import ToolContainer from "../components/ui/ToolContainer";
import { useTheme } from "../hooks/useTheme";
import { useAnimationLoop } from "../hooks/useAnimationLoop";
import { setupCanvas } from "../utils/canvas";

const NUM_GENERATIONS = 300;
const ANIMATION_DURATION_MS = 5000; // 5 seconds for full simulation

/**
 * Round x to an integer at random, up with probability equal to its
 * fractional part, so the expected value is exactly x.
 */
function stochasticRound(x, rng) {
  const lo = Math.floor(x);
  return lo + (rng() < x - lo ? 1 : 0);
}

/**
 * Number of type-A individuals among `n` drawn without replacement from a
 * pool of `poolA` type-A and `poolB` type-B individuals (hypergeometric).
 */
function drawWithoutReplacement(poolA, poolB, n, rng) {
  let a = poolA;
  let total = poolA + poolB;
  let countA = 0;
  for (let i = 0; i < n && total > 0; i++) {
    if (rng() * total < a) {
      countA++;
      a--;
    }
    total--;
  }
  return countA;
}

/**
 * One generation of the model: every individual has (1 + births) offspring
 * (a breeding pool of N(1 + births)), then N survivors are drawn at random
 * without replacement from the pool.
 *
 * When N(1 + births) is not a whole number, the pool size is rounded at
 * random, and the type-A share of the pool is rounded at random around its
 * exact value, so the expected frequency of A among survivors is exactly the
 * current frequency (no hidden selection from rounding). For whole-number
 * births (e.g. the default 1) no rounding happens at all.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function driftGeneration(countA, N, births, rng = Math.random) {
  const poolSize = stochasticRound(N * (1 + births), rng);
  const poolA = stochasticRound((poolSize * countA) / N, rng);
  return drawWithoutReplacement(poolA, poolSize - poolA, N, rng);
}

/**
 * Run the full simulation. Returns { data, fixationGeneration } where data has
 * one entry per generation 0..generations, and fixationGeneration is the first
 * generation at which one type is lost (null if neither is lost).
 */
// eslint-disable-next-line react-refresh/only-export-components
export function simulateDrift({
  N,
  births,
  percentA,
  generations = NUM_GENERATIONS,
  rng = Math.random,
}) {
  let typeA = Math.round(N * (percentA / 100));
  const data = [{ generation: 0, typeA, typeB: N - typeA }];
  let fixationGeneration = typeA === 0 || typeA === N ? 0 : null;
  for (let gen = 1; gen <= generations; gen++) {
    if (fixationGeneration === null) {
      typeA = driftGeneration(typeA, N, births, rng);
      if (typeA === 0 || typeA === N) fixationGeneration = gen;
    }
    data.push({ generation: gen, typeA, typeB: N - typeA });
  }
  return { data, fixationGeneration };
}

const GeneticDriftSimulator = () => {
  const { theme, currentTheme } = useTheme();

  // Canvas ref for the stacked bar chart
  const canvasRef = useRef(null);
  const transformRef = useRef(null);
  const animRef = useRef({ startTime: 0 });

  // Parameters
  const [populationSize, setPopulationSize] = useState(100);
  const [perCapitaBirths, setPerCapitaBirths] = useState(1);
  const [typeAName, setTypeAName] = useState("Type A");
  const [typeBName, setTypeBName] = useState("Type B");
  const [percentageA, setPercentageA] = useState(70);

  // Simulation state. `run` holds the data together with the parameters that
  // produced it, so later edits to N don't rescale an old run.
  const [isSimulating, setIsSimulating] = useState(false);
  const [run, setRun] = useState(null); // { data, fixationGeneration, N, births }
  const [currentGeneration, setCurrentGeneration] = useState(0);
  const simulationData = run ? run.data : null;

  // The y-axis follows the displayed run's N (or the current N before any run)
  const displayN = run ? run.N : populationSize;

  // Derived percentage
  const percentageB = 100 - percentageA;

  // Linked slider handlers
  const handlePercentageAChange = useCallback((value) => {
    setPercentageA(value);
  }, []);

  const handlePercentageBChange = useCallback((value) => {
    setPercentageA(100 - value);
  }, []);

  // Colors for the two types - chosen for perceptual distinctiveness
  // Using a blue-orange complementary pair with moderate saturation
  const getTypeAColor = useCallback(() => {
    if (currentTheme === "unicorn") return "#7C9ED9"; // Soft periwinkle blue
    if (currentTheme === "dark") return "#6B9BD1"; // Muted steel blue
    return "#4A7DBD"; // Medium slate blue
  }, [currentTheme]);

  const getTypeBColor = useCallback(() => {
    if (currentTheme === "unicorn") return "#D9A07C"; // Soft peach/coral
    if (currentTheme === "dark") return "#D1956B"; // Muted terracotta
    return "#C4823A"; // Medium amber/ochre
  }, [currentTheme]);

  // Draw the stacked bar chart
  const drawStackedBars = useCallback(
    (runToDraw, upToGeneration) => {
      const canvas = canvasRef.current;
      const transform = transformRef.current;
      if (!canvas || !transform) return;

      const setup = setupCanvas(canvas, {
        width: transform.plotWidth,
        height: transform.plotHeight,
      });
      if (!setup) return;
      const { ctx, width: plotWidth, height: plotHeight } = setup;
      ctx.clearRect(0, 0, plotWidth, plotHeight);
      if (!runToDraw) return;

      const { data, N } = runToDraw;
      const typeAColor = getTypeAColor();
      const typeBColor = getTypeBColor();

      // One bar per generation 0..300 (301 bars), all inside the plot
      const barWidth = plotWidth / data.length;

      // Draw bars up to the current generation
      const gensToDraw = Math.min(upToGeneration, data.length);

      for (let i = 0; i < gensToDraw; i++) {
        const point = data[i];
        const x = i * barWidth;
        // Overlap neighbours slightly to avoid hairline gaps, but stay on-canvas
        const w = Math.min(barWidth + 0.5, plotWidth - x);

        // Type A (bottom portion)
        const heightA = (point.typeA / N) * plotHeight;
        ctx.fillStyle = typeAColor;
        ctx.fillRect(x, plotHeight - heightA, w, heightA);

        // Type B (top portion)
        const heightB = (point.typeB / N) * plotHeight;
        ctx.fillStyle = typeBColor;
        ctx.fillRect(x, plotHeight - heightA - heightB, w, heightB);
      }

      // Draw initial and final population labels if animation is complete
      if (upToGeneration >= data.length) {
        const finalData = data[data.length - 1];
        const initialData = data[0];

        ctx.font = "bold 12px sans-serif";
        ctx.textBaseline = "middle";
        // White text with a dark halo stays readable on both bar colors
        ctx.fillStyle = "#ffffff";
        ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
        ctx.shadowBlur = 2;

        const labelPair = (d, x) => {
          const hA = (d.typeA / N) * plotHeight;
          const hB = (d.typeB / N) * plotHeight;
          if (hA > 20) ctx.fillText(String(d.typeA), x, plotHeight - hA / 2);
          if (hB > 20) {
            ctx.fillText(String(d.typeB), x, plotHeight - hA - hB / 2);
          }
        };

        ctx.textAlign = "left";
        labelPair(initialData, 5);
        ctx.textAlign = "right";
        labelPair(finalData, plotWidth - 5);

        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
      }
    },
    [getTypeAColor, getTypeBColor],
  );

  // Animation: reveal generations over ANIMATION_DURATION_MS of real time
  const loop = useAnimationLoop((_dt, now) => {
    const anim = animRef.current;
    if (!anim.run) return false;
    if (anim.startTime === null) anim.startTime = now;
    const progress = Math.min((now - anim.startTime) / ANIMATION_DURATION_MS, 1);
    const totalGenerations = anim.run.data.length;
    const gensToShow = Math.ceil(progress * totalGenerations);
    setCurrentGeneration(gensToShow);
    drawStackedBars(anim.run, gensToShow);
    if (progress >= 1) {
      setIsSimulating(false);
      return false;
    }
    return true;
  });

  // Start simulation with animation
  const startSimulation = useCallback(() => {
    loop.stop();

    // Generate all simulation data, and remember the parameters used
    const result = simulateDrift({
      N: populationSize,
      births: perCapitaBirths,
      percentA: percentageA,
    });
    const newRun = { ...result, N: populationSize, births: perCapitaBirths };

    animRef.current = { run: newRun, startTime: null };
    setRun(newRun);
    setCurrentGeneration(0);
    setIsSimulating(true);
    loop.start();
  }, [loop, populationSize, perCapitaBirths, percentageA]);

  // Redraw a finished run when the theme or layout changes
  useEffect(() => {
    if (!isSimulating) {
      drawStackedBars(run, run ? run.data.length : 0);
    }
  }, [currentTheme, run, isSimulating, drawStackedBars]);

  // Final statistics for the displayed run
  const stats = (() => {
    if (!simulationData || simulationData.length === 0) return null;
    const finalData = simulationData[simulationData.length - 1];
    const initialData = simulationData[0];
    return {
      initialA: initialData.typeA,
      initialB: initialData.typeB,
      finalA: finalData.typeA,
      finalB: finalData.typeB,
      fixation: finalData.typeA === 0 || finalData.typeB === 0,
      fixedType:
        finalData.typeA === 0 ? "B" : finalData.typeB === 0 ? "A" : null,
    };
  })();

  // Status line for the legend box
  const statusText = (() => {
    if (isSimulating) {
      const gen = Math.max(0, Math.min(currentGeneration - 1, NUM_GENERATIONS));
      return `Generation ${gen}/${NUM_GENERATIONS}`;
    }
    if (!run) return "Click Simulate to start";
    if (run.fixationGeneration !== null) {
      return `Fixed at generation ${run.fixationGeneration}`;
    }
    return `No fixation in ${NUM_GENERATIONS} generations`;
  })();

  return (
    <ToolContainer
      title="Genetic Drift Simulator"
      canvasWidth={10}
      canvasHeight={6}
    >
      {/* Main stacked bar chart */}
      <GridGraph
        x={0}
        y={0}
        w={7}
        h={5}
        xLabel="Generations"
        yLabel="Population"
        xRange={[0, NUM_GENERATIONS]}
        yRange={[0, displayN]}
        xTicks={[0, 100, 200, 300]}
        yTicks={[0, Math.round(displayN / 2), displayN]}
        theme={theme}
        tooltip="Stacked bar chart showing allele frequencies over generations"
      >
        {(transform) => {
          transformRef.current = transform;
          return (
            <canvas
              ref={canvasRef}
              className="absolute"
              style={transform.plotStyle}
            />
          );
        }}
      </GridGraph>

      {/* Type A name input */}
      <GridTextInput
        x={7}
        y={0}
        w={3}
        h={1}
        value={typeAName}
        onChange={setTypeAName}
        label="Type A Name"
        placeholder="Type A"
        maxLength={12}
        theme={theme}
      />

      {/* Type A percentage slider */}
      <GridSliderHorizontal
        x={7}
        y={1}
        w={3}
        h={1}
        value={percentageA}
        onChange={handlePercentageAChange}
        variant="unipolar"
        label={`Initial % ${typeAName}: ${percentageA}%`}
        theme={theme}
      />

      {/* Type B name input */}
      <GridTextInput
        x={7}
        y={2}
        w={3}
        h={1}
        value={typeBName}
        onChange={setTypeBName}
        label="Type B Name"
        placeholder="Type B"
        maxLength={12}
        theme={theme}
      />

      {/* Type B percentage slider (linked) */}
      <GridSliderHorizontal
        x={7}
        y={3}
        w={3}
        h={1}
        value={percentageB}
        onChange={handlePercentageBChange}
        variant="unipolar"
        label={`Initial % ${typeBName}: ${percentageB}%`}
        theme={theme}
      />

      {/* Population size input */}
      <GridInput
        x={7}
        y={4}
        w={1}
        h={1}
        value={populationSize}
        onChange={setPopulationSize}
        min={10}
        max={1000}
        step={10}
        variable="N"
        title="Population size (10-1000)"
        theme={theme}
      />

      {/* Per capita births input */}
      <GridInput
        x={8}
        y={4}
        w={1}
        h={1}
        value={perCapitaBirths}
        onChange={setPerCapitaBirths}
        min={0.1}
        max={10}
        step={0.1}
        variable="Births"
        title="Per capita births"
        theme={theme}
      />

      {/* Simulate button */}
      <GridButton
        x={9}
        y={4}
        w={1}
        h={1}
        type="momentary"
        variant="function"
        onPress={startSimulation}
        disabled={isSimulating}
        theme={theme}
      >
        <div style={{ textAlign: "center", lineHeight: "1.1" }}>
          {isSimulating ? "..." : "Simulate"}
        </div>
      </GridButton>

      {/* Results/Legend display */}
      <GridDisplay
        x={0}
        y={5}
        w={5}
        h={1}
        variant="info"
        align="left"
        theme={theme}
      >
        <div
          style={{
            padding: "4px 8px",
            fontFamily: "monospace",
            fontSize: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: "100%",
          }}
        >
          {/* Legend */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <div
                style={{
                  width: "16px",
                  height: "16px",
                  backgroundColor: getTypeAColor(),
                  borderRadius: "2px",
                }}
              />
              <span>{typeAName}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <div
                style={{
                  width: "16px",
                  height: "16px",
                  backgroundColor: getTypeBColor(),
                  borderRadius: "2px",
                }}
              />
              <span>{typeBName}</span>
            </div>
          </div>

          {/* Status */}
          <div style={{ opacity: 0.7 }}>
            {statusText}
          </div>
        </div>
      </GridDisplay>

      {/* Statistics display */}
      <GridDisplay
        x={5}
        y={5}
        w={5}
        h={1}
        variant="info"
        align="center"
        theme={theme}
      >
        <div
          style={{
            padding: "4px 8px",
            fontFamily: "monospace",
            fontSize: "11px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
          }}
        >
          {stats ? (
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              {/* Initial column */}
              <div
                style={{ display: "flex", flexDirection: "column", gap: "2px" }}
              >
                <span>
                  Initial {typeAName}: {stats.initialA}
                </span>
                <span>
                  Initial {typeBName}: {stats.initialB}
                </span>
              </div>
              {/* Final column */}
              <div
                style={{ display: "flex", flexDirection: "column", gap: "2px" }}
              >
                <span>
                  Final {typeAName}: {stats.finalA}
                </span>
                <span>
                  Final {typeBName}: {stats.finalB}
                </span>
              </div>
              {/* Fixation indicator */}
              {stats.fixation && (
                <span
                  style={{
                    fontWeight: "bold",
                    color:
                      stats.fixedType === "A"
                        ? getTypeAColor()
                        : getTypeBColor(),
                  }}
                >
                  {stats.fixedType === "A" ? typeAName : typeBName} fixed!
                </span>
              )}
            </div>
          ) : (
            <span style={{ opacity: 0.6 }}>
              Results will appear after simulation
            </span>
          )}
        </div>
      </GridDisplay>
    </ToolContainer>
  );
};

export default GeneticDriftSimulator;
