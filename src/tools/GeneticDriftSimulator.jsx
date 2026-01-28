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

const NUM_GENERATIONS = 300;
const ANIMATION_DURATION_MS = 5000; // 5 seconds for full simulation

const GeneticDriftSimulator = () => {
  const { theme, currentTheme } = useTheme();

  // Canvas ref for the stacked bar chart
  const canvasRef = useRef(null);
  const transformRef = useRef(null);
  const animationRef = useRef(null);

  // Parameters
  const [populationSize, setPopulationSize] = useState(100);
  const [perCapitaBirths, setPerCapitaBirths] = useState(1);
  const [typeAName, setTypeAName] = useState("Type A");
  const [typeBName, setTypeBName] = useState("Type B");
  const [percentageA, setPercentageA] = useState(70);

  // Simulation state
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationData, setSimulationData] = useState(null);
  const [currentGeneration, setCurrentGeneration] = useState(0);

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

  // Run the genetic drift simulation (generate all data at once)
  const runSimulation = useCallback(() => {
    const data = [];

    // Initial counts based on percentage
    let typeACount = Math.round(populationSize * (percentageA / 100));
    let typeBCount = populationSize - typeACount;

    // Store generation 0
    data.push({
      generation: 0,
      typeA: typeACount,
      typeB: typeBCount,
      freqA: typeACount / populationSize,
    });

    // Simulate each generation
    for (let gen = 1; gen <= NUM_GENERATIONS; gen++) {
      // Expand population by per capita births
      const newTypeACount = Math.round(typeACount * (1 + perCapitaBirths));
      const newTypeBCount = Math.round(typeBCount * (1 + perCapitaBirths));

      // Create breeding pool
      const poolSize = newTypeACount + newTypeBCount;
      const pool = [];
      for (let i = 0; i < newTypeACount; i++) pool.push("A");
      for (let i = 0; i < newTypeBCount; i++) pool.push("B");

      // Fisher-Yates shuffle
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }

      // Select survivors (first N from shuffled pool)
      const survivors = pool.slice(0, populationSize);
      typeACount = survivors.filter((type) => type === "A").length;
      typeBCount = survivors.filter((type) => type === "B").length;

      data.push({
        generation: gen,
        typeA: typeACount,
        typeB: typeBCount,
        freqA: typeACount / populationSize,
      });

      // Check for fixation (one type completely lost)
      if (typeACount === 0 || typeBCount === 0) {
        // Fill remaining generations with fixed state
        for (
          let remaining = gen + 1;
          remaining <= NUM_GENERATIONS;
          remaining++
        ) {
          data.push({
            generation: remaining,
            typeA: typeACount,
            typeB: typeBCount,
            freqA: typeACount / populationSize,
          });
        }
        break;
      }
    }

    return data;
  }, [populationSize, perCapitaBirths, percentageA]);

  // Draw the stacked bar chart
  const drawStackedBars = useCallback(
    (data, upToGeneration) => {
      const canvas = canvasRef.current;
      const transform = transformRef.current;
      if (!canvas || !transform || !data) return;

      const ctx = canvas.getContext("2d");
      const { plotWidth, plotHeight, dataToPixel } = transform;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const typeAColor = getTypeAColor();
      const typeBColor = getTypeBColor();

      // Bar width calculation - each bar represents one generation
      const barWidth = plotWidth / NUM_GENERATIONS;

      // Draw bars up to the current generation
      const gensToDraw = Math.min(upToGeneration, data.length);

      for (let i = 0; i < gensToDraw; i++) {
        const point = data[i];
        const x = (i / NUM_GENERATIONS) * plotWidth;

        // Type A (bottom portion)
        const heightA = (point.typeA / populationSize) * plotHeight;
        ctx.fillStyle = typeAColor;
        ctx.fillRect(x, plotHeight - heightA, barWidth + 0.5, heightA);

        // Type B (top portion)
        const heightB = (point.typeB / populationSize) * plotHeight;
        ctx.fillStyle = typeBColor;
        ctx.fillRect(
          x,
          plotHeight - heightA - heightB,
          barWidth + 0.5,
          heightB,
        );
      }

      // Draw initial and final population labels if animation is complete
      if (upToGeneration >= data.length) {
        const finalData = data[data.length - 1];
        const initialData = data[0];

        ctx.font = "bold 12px sans-serif";
        ctx.textBaseline = "middle";

        // Initial counts (left side)
        const leftX = 5;
        const initialAHeight =
          (initialData.typeA / populationSize) * plotHeight;
        const initialBHeight =
          (initialData.typeB / populationSize) * plotHeight;

        // Type A label (in the A section)
        ctx.fillStyle = currentTheme === "dark" ? "#ffffff" : "#ffffff";
        ctx.textAlign = "left";
        if (initialAHeight > 20) {
          ctx.fillText(
            initialData.typeA.toString(),
            leftX,
            plotHeight - initialAHeight / 2,
          );
        }

        // Type B label (in the B section)
        if (initialBHeight > 20) {
          ctx.fillText(
            initialData.typeB.toString(),
            leftX,
            plotHeight - initialAHeight - initialBHeight / 2,
          );
        }

        // Final counts (right side)
        const rightX = plotWidth - 5;
        const finalAHeight = (finalData.typeA / populationSize) * plotHeight;
        const finalBHeight = (finalData.typeB / populationSize) * plotHeight;

        ctx.textAlign = "right";
        if (finalAHeight > 20) {
          ctx.fillText(
            finalData.typeA.toString(),
            rightX,
            plotHeight - finalAHeight / 2,
          );
        }

        if (finalBHeight > 20) {
          ctx.fillText(
            finalData.typeB.toString(),
            rightX,
            plotHeight - finalAHeight - finalBHeight / 2,
          );
        }
      }
    },
    [populationSize, getTypeAColor, getTypeBColor, currentTheme],
  );

  // Start simulation with animation
  const startSimulation = useCallback(() => {
    // Cancel any existing animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    setIsSimulating(true);
    setCurrentGeneration(0);

    // Generate all simulation data
    const data = runSimulation();
    setSimulationData(data);

    // Animate the drawing
    const startTime = performance.now();
    const totalGenerations = data.length;

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / ANIMATION_DURATION_MS, 1);

      // Calculate how many generations to show
      const gensToShow = Math.ceil(progress * totalGenerations);
      setCurrentGeneration(gensToShow);

      // Draw the chart
      drawStackedBars(data, gensToShow);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsSimulating(false);
        animationRef.current = null;
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  }, [runSimulation, drawStackedBars]);

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Redraw when theme changes (if we have data)
  useEffect(() => {
    if (simulationData && !isSimulating) {
      drawStackedBars(simulationData, simulationData.length);
    }
  }, [currentTheme, simulationData, isSimulating, drawStackedBars]);

  // Get final statistics
  const getFinalStats = useCallback(() => {
    if (!simulationData || simulationData.length === 0) return null;

    const finalData = simulationData[simulationData.length - 1];
    const initialData = simulationData[0];

    return {
      initialA: initialData.typeA,
      initialB: initialData.typeB,
      finalA: finalData.typeA,
      finalB: finalData.typeB,
      finalFreqA: (finalData.freqA * 100).toFixed(1),
      finalFreqB: ((1 - finalData.freqA) * 100).toFixed(1),
      fixation: finalData.typeA === 0 || finalData.typeB === 0,
      fixedType:
        finalData.typeA === 0 ? "B" : finalData.typeB === 0 ? "A" : null,
    };
  }, [simulationData]);

  const stats = getFinalStats();

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
        yRange={[0, populationSize]}
        xTicks={[0, 100, 200, 300]}
        yTicks={[0, Math.round(populationSize / 2), populationSize]}
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
              width={transform.plotWidth}
              height={transform.plotHeight}
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
            {isSimulating
              ? `Generation ${Math.min(currentGeneration, NUM_GENERATIONS)}/${NUM_GENERATIONS}`
              : simulationData
                ? `Complete (${NUM_GENERATIONS} generations)`
                : "Click Simulate to start"}
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
