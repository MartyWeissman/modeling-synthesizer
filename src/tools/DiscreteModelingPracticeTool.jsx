import React, { useState, useCallback } from "react";
import {
  GridDisplay,
  GridButton,
  GridTimeSeries,
  GridLabel,
} from "../components/grid";
import ToolContainer from "../components/ui/ToolContainer";
import DiscreteEquation from "../components/DiscreteEquation";
import { useTheme } from "../hooks/useTheme";

const DiscreteModelingPracticeTool = () => {
  const { theme, currentTheme } = useTheme();

  // Problem generation state
  const [currentProblem, setCurrentProblem] = useState(null);
  const [showEquation, setShowEquation] = useState(false);
  const [showVariable, setShowVariable] = useState(false);
  const [showPrediction, setShowPrediction] = useState(false);
  const [showGraph, setShowGraph] = useState(false);

  // Random selection helpers
  const getRandomElement = (array) =>
    array[Math.floor(Math.random() * array.length)];
  const getRandomNumber = (min, max) =>
    Math.floor(Math.random() * (max - min + 1)) + min;

  // Problem generation logic
  const generateNewProblem = useCallback(() => {
    // Reset all reveals
    setShowEquation(false);
    setShowVariable(false);
    setShowPrediction(false);
    setShowGraph(false);

    // Random data arrays
    const containers = [
      "basket",
      "house",
      "bucket",
      "jar",
      "box",
      "bag",
      "tank",
      "pond",
      "field",
      "room",
    ];
    const things = [
      "apples",
      "bicycles",
      "monkeys",
      "fish",
      "books",
      "coins",
      "marbles",
      "flowers",
      "cars",
      "birds",
    ];
    const timeUnits = ["hour", "day", "week", "month"];

    // 50/50 chance for linear vs exponential
    const isLinear = Math.random() < 0.5;

    const container = getRandomElement(containers);
    const thing = getRandomElement(things);
    const timeUnit = getRandomElement(timeUnits);

    let problem;

    if (isLinear) {
      // Linear growth/decay
      const initial = getRandomNumber(5, 50);
      const rate = getRandomNumber(2, 7);
      const isGrowth = Math.random() < 0.5;
      const changeVerb = isGrowth ? "adds" : "takes away";
      const effectiveRate = isGrowth ? rate : -rate;

      problem = {
        type: "linear",
        container,
        thing,
        timeUnit,
        initial,
        rate: effectiveRate,
        isGrowth,
        description: `A ${container} starts with ${initial} ${thing}. Every ${timeUnit}, someone ${changeVerb} ${rate} ${thing}.`,
        variable: `Let ${thing.charAt(0).toUpperCase()} be the number of ${thing} in the ${container}.`,
        changeEquationProps: {
          template: "discrete-change-linear",
          variables: {
            VARIABLE: thing.charAt(0).toUpperCase(),
            RATE: effectiveRate,
          },
        },
        predictionEquationProps: {
          template: "discrete-prediction-linear",
          variables: {
            VARIABLE: thing.charAt(0).toUpperCase(),
            RATE: effectiveRate,
            INITIAL: initial,
          },
        },
        calculateValue: (t) => effectiveRate * t + initial,
      };
    } else {
      // Exponential growth/decay
      const initial = getRandomNumber(50, 500);
      const percentRate = getRandomNumber(10, 90);
      const isGrowth = Math.random() < 0.5;
      const changeVerb = isGrowth ? "increases" : "decreases";
      const decimalRate = percentRate / 100;
      const growthFactor = isGrowth ? 1 + decimalRate : 1 - decimalRate;

      problem = {
        type: "exponential",
        container,
        thing,
        timeUnit,
        initial,
        percentRate,
        isGrowth,
        growthFactor,
        description: `A ${container} starts with ${initial} ${thing}. Every ${timeUnit}, the number of ${thing} ${changeVerb} by ${percentRate}%.`,
        variable: `Let ${thing.charAt(0).toUpperCase()} be the number of ${thing} in the ${container}.`,
        changeEquationProps: {
          template: "discrete-change-exponential",
          variables: {
            VARIABLE: thing.charAt(0).toUpperCase(),
            RATE: isGrowth ? decimalRate.toFixed(2) : (-decimalRate).toFixed(2),
          },
        },
        predictionEquationProps: {
          template: "discrete-prediction-exponential",
          variables: {
            VARIABLE: thing.charAt(0).toUpperCase(),
            INITIAL: initial,
            FACTOR: growthFactor.toFixed(2),
          },
        },
        calculateValue: (t) => initial * Math.pow(growthFactor, t),
      };
    }

    setCurrentProblem(problem);
  }, []);

  // Generate initial problem on mount
  React.useEffect(() => {
    if (!currentProblem) {
      generateNewProblem();
    }
  }, [currentProblem, generateNewProblem]);

  // Generate graph data
  const generateGraphData = useCallback(() => {
    if (!currentProblem)
      return {
        series: [],
        timeRange: [0, 10],
        populationRange: [0, 100],
        xLabel: "Time",
        yLabel: "Value",
        xUnit: "",
        yUnit: "",
      };

    const timePoints = Array.from({ length: 11 }, (_, i) => i);
    const values = timePoints.map((t) => currentProblem.calculateValue(t));

    // Calculate appropriate y-axis range - always start at 0, first quadrant only
    const maxValue = Math.max(...values);
    const padding = Math.max(maxValue * 0.1, 1); // 10% padding or minimum 1
    const yMin = 0; // Always start at zero
    // Round yMax up to nearest multiple of 5 for nice integer tick labels
    const rawYMax = maxValue + padding;
    const yMax = Math.ceil(rawYMax / 5) * 5;

    // Generate tick marks
    const xTicks = timePoints; // Integer time points 0-10

    // Generate appropriate y-axis ticks
    const yTicks = [];
    const tickCount = 6; // Aim for ~6 ticks
    const yRange = yMax - yMin;
    const tickInterval = Math.ceil(yRange / tickCount);

    for (let i = Math.ceil(yMin); i <= yMax; i += tickInterval) {
      yTicks.push(i);
    }

    // Format data for GridTimeSeries
    const seriesData = timePoints.map((t, i) => ({
      t: t,
      value: values[i],
    }));

    return {
      series: [
        {
          name: `${currentProblem.thing.charAt(0).toUpperCase()}(t)`,
          data: seriesData,
          color: currentTheme === "dark" ? "#60a5fa" : "#2563eb",
          visible: true,
          lineWidth: 2,
        },
      ],
      timeRange: [0, 10],
      populationRange: [yMin, yMax],
      xLabel: "Time",
      yLabel: `Number of ${currentProblem.thing}`,
      xUnit: currentProblem.timeUnit + "s",
      yUnit: "",
    };
  }, [currentProblem, currentTheme]);

  if (!currentProblem) {
    return (
      <ToolContainer
        title="Discrete Modeling Practice"
        canvasWidth={10}
        canvasHeight={7}
      >
        <GridDisplay
          x={0}
          y={0}
          w={6}
          h={1}
          variant="info"
          fontSize="large"
          theme={theme}
        >
          Loading problem...
        </GridDisplay>
      </ToolContainer>
    );
  }

  const graphData = generateGraphData();

  return (
    <ToolContainer
      title="Discrete Modeling Practice"
      canvasWidth={9}
      canvasHeight={6}
    >
      {/* Situation Label */}
      <GridLabel
        x={0}
        y={0}
        w={2}
        h={1}
        text="Situation"
        textAlign="left"
        fontWeight="bold"
        theme={theme}
      />

      {/* Problem Description */}
      <GridDisplay
        x={2}
        y={0}
        w={6}
        h={1}
        variant="info"
        align="left"
        fontSize="large"
        theme={theme}
      >
        <div style={{ padding: "8px", fontSize: "16px" }}>
          {currentProblem.description}
        </div>
      </GridDisplay>

      {/* New Question Button */}
      <GridButton
        x={8}
        y={0}
        w={1}
        h={1}
        type="momentary"
        onPress={generateNewProblem}
        theme={theme}
      >
        <div
          style={{ textAlign: "center", lineHeight: "1.1", fontSize: "14px" }}
        >
          <div>New</div>
          <div>Question</div>
        </div>
      </GridButton>

      {/* State Variable Section */}
      <GridLabel
        x={0}
        y={1}
        w={2}
        h={1}
        text="State Variable"
        textAlign="left"
        fontWeight="bold"
        theme={theme}
      />

      <GridDisplay
        x={2}
        y={1}
        w={6}
        h={1}
        variant="info"
        align="left"
        fontSize="large"
        theme={theme}
        style={{
          backgroundColor: showVariable
            ? "transparent"
            : currentTheme === "dark"
              ? "#374151"
              : "#f3f4f6",
        }}
      >
        <div style={{ padding: "8px", fontSize: "16px" }}>
          {showVariable ? currentProblem.variable : ""}
        </div>
      </GridDisplay>

      <GridButton
        x={8}
        y={1}
        w={1}
        h={1}
        type="toggle"
        active={showVariable}
        onToggle={setShowVariable}
        theme={theme}
      >
        <div style={{ fontSize: "14px" }}>
          {showVariable ? "Hide" : "Reveal"}
        </div>
      </GridButton>

      {/* Change Equation Section */}
      <GridLabel
        x={0}
        y={2}
        w={2}
        h={1}
        text="Change Equation"
        textAlign="left"
        fontWeight="bold"
        theme={theme}
      />

      <GridDisplay
        x={2}
        y={2}
        w={6}
        h={1}
        variant="info"
        align="center"
        fontSize="large"
        theme={theme}
        style={{
          backgroundColor: showEquation
            ? "transparent"
            : currentTheme === "dark"
              ? "#374151"
              : "#f3f4f6",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            width: "100%",
          }}
        >
          {showEquation && currentProblem.changeEquationProps ? (
            <div style={{ marginTop: "20px" }}>
              <DiscreteEquation
                template={currentProblem.changeEquationProps.template}
                variables={currentProblem.changeEquationProps.variables}
                size="medium"
                style={{ display: "inline-block", verticalAlign: "middle" }}
              />
            </div>
          ) : (
            ""
          )}
        </div>
      </GridDisplay>

      <GridButton
        x={8}
        y={2}
        w={1}
        h={1}
        type="toggle"
        active={showEquation}
        onToggle={setShowEquation}
        theme={theme}
      >
        <div style={{ fontSize: "14px" }}>
          {showEquation ? "Hide" : "Reveal"}
        </div>
      </GridButton>

      {/* Prediction Equation Section */}
      <GridLabel
        x={0}
        y={3}
        w={2}
        h={1}
        text="Predictive Equation"
        textAlign="left"
        fontWeight="bold"
        theme={theme}
      />

      <GridDisplay
        x={2}
        y={3}
        w={6}
        h={1}
        variant="info"
        align="center"
        fontSize="large"
        theme={theme}
        style={{
          backgroundColor: showPrediction
            ? "transparent"
            : currentTheme === "dark"
              ? "#374151"
              : "#f3f4f6",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            width: "100%",
          }}
        >
          {showPrediction && currentProblem.predictionEquationProps ? (
            <div style={{ marginTop: "18px" }}>
              <DiscreteEquation
                template={currentProblem.predictionEquationProps.template}
                variables={currentProblem.predictionEquationProps.variables}
                size="medium"
                style={{ display: "inline-block", verticalAlign: "middle" }}
              />
            </div>
          ) : (
            ""
          )}
        </div>
      </GridDisplay>

      <GridButton
        x={8}
        y={3}
        w={1}
        h={1}
        type="toggle"
        active={showPrediction}
        onToggle={setShowPrediction}
        theme={theme}
      >
        <div style={{ fontSize: "14px" }}>
          {showPrediction ? "Hide" : "Reveal"}
        </div>
      </GridButton>

      {/* Time Series Plot Label */}
      <GridLabel
        x={0}
        y={4}
        w={2}
        h={2}
        text="Time Series Plot"
        textAlign="left"
        fontWeight="bold"
        theme={theme}
      />

      {/* Graph Section */}
      <GridTimeSeries
        x={2}
        y={4}
        w={6}
        h={2}
        series={graphData.series.map((s) => ({ ...s, visible: showGraph }))}
        timeRange={graphData.timeRange}
        populationRange={graphData.populationRange}
        xLabel={graphData.xLabel}
        yLabel={graphData.yLabel}
        xUnit={graphData.xUnit}
        yUnit={graphData.yUnit}
        showMarkers={showGraph}
        showLegend={false}
        theme={theme}
      />

      <GridButton
        x={8}
        y={4}
        w={1}
        h={1}
        type="toggle"
        active={showGraph}
        onToggle={setShowGraph}
        theme={theme}
      >
        <div style={{ fontSize: "14px" }}>{showGraph ? "Hide" : "Reveal"}</div>
      </GridButton>

      {/* Hide All Button */}
      <GridButton
        x={8}
        y={5}
        w={1}
        h={1}
        type="momentary"
        onPress={() => {
          setShowEquation(false);
          setShowVariable(false);
          setShowPrediction(false);
          setShowGraph(false);
        }}
        theme={theme}
      >
        <div
          style={{ textAlign: "center", lineHeight: "1.1", fontSize: "14px" }}
        >
          <div>Hide</div>
          <div>All</div>
        </div>
      </GridButton>
    </ToolContainer>
  );
};

export default DiscreteModelingPracticeTool;
