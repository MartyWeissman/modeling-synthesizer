import React, { useState, useCallback, useMemo } from "react";
import {
  GridDisplay,
  GridButton,
  GridTimeSeries,
  GridLabel,
} from "../components/grid";
import ToolContainer from "../components/ui/ToolContainer";
import DiscreteEquation from "../components/DiscreteEquation";
import { useTheme } from "../hooks/useTheme";
import { niceStep, linearTicks } from "../utils/ticks";

// Random selection helpers
const getRandomElement = (array) =>
  array[Math.floor(Math.random() * array.length)];
const getRandomNumber = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const CONTAINERS = [
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
const THINGS = [
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
const TIME_UNITS = ["hour", "day", "week", "month"];
const T_MAX = 10; // the graph shows t = 0, 1, ..., 10

/**
 * A number as MathML, with a real minus sign (<mo>−</mo>) for negative
 * values instead of a hyphen inside <mn>. `text` is the already formatted
 * absolute value (e.g. "0.30").
 */
const signedMn = (negative, text) =>
  negative ? `<mo>−</mo><mn>${text}</mn>` : `<mn>${text}</mn>`;

/** Generate a random linear or exponential growth/decay problem. */
const makeProblem = () => {
  const container = getRandomElement(CONTAINERS);
  const thing = getRandomElement(THINGS);
  const timeUnit = getRandomElement(TIME_UNITS);
  const letter = thing.charAt(0).toUpperCase();
  const variable = `Let ${letter} be the number of ${thing} in the ${container}, and t the time in ${timeUnit}s.`;

  if (Math.random() < 0.5) {
    // Linear growth/decay
    const rate = getRandomNumber(2, 7);
    const isGrowth = Math.random() < 0.5;
    // Decay problems start with at least 10·rate, so the count stays
    // non-negative over the whole graph (t = 0..10).
    const initial = isGrowth
      ? getRandomNumber(5, 50)
      : getRandomNumber(T_MAX * rate, T_MAX * rate + 30);
    const changeVerb = isGrowth ? "adds" : "takes away";
    const effectiveRate = isGrowth ? rate : -rate;
    const rateMathml = signedMn(!isGrowth, String(rate));

    return {
      type: "linear",
      thing,
      timeUnit,
      description: `A ${container} starts with ${initial} ${thing}. Every ${timeUnit}, someone ${changeVerb} ${rate} ${thing}.`,
      variable,
      changeEquationProps: {
        template: "discrete-change-linear",
        variables: { VARIABLE: letter, RATE: rateMathml },
      },
      predictionEquationProps: {
        template: "discrete-prediction-linear",
        variables: { VARIABLE: letter, RATE: rateMathml, INITIAL: initial },
      },
      calculateValue: (t) => effectiveRate * t + initial,
    };
  }

  // Exponential growth/decay
  const initial = getRandomNumber(50, 500);
  const percentRate = getRandomNumber(10, 90);
  const isGrowth = Math.random() < 0.5;
  const changeVerb = isGrowth ? "increases" : "decreases";
  const decimalRate = percentRate / 100;
  const growthFactor = isGrowth ? 1 + decimalRate : 1 - decimalRate;

  return {
    type: "exponential",
    thing,
    timeUnit,
    description: `A ${container} starts with ${initial} ${thing}. Every ${timeUnit}, the number of ${thing} ${changeVerb} by ${percentRate}%.`,
    variable,
    changeEquationProps: {
      template: "discrete-change-exponential",
      variables: {
        VARIABLE: letter,
        RATE: signedMn(!isGrowth, decimalRate.toFixed(2)),
      },
    },
    predictionEquationProps: {
      template: "discrete-prediction-exponential",
      variables: {
        VARIABLE: letter,
        INITIAL: initial,
        FACTOR: growthFactor.toFixed(2),
      },
    },
    calculateValue: (t) => initial * Math.pow(growthFactor, t),
  };
};

const DiscreteModelingPracticeTool = () => {
  const { theme, currentTheme } = useTheme();

  // Problem state (the first problem is created right away)
  const [currentProblem, setCurrentProblem] = useState(() => makeProblem());
  const [showEquation, setShowEquation] = useState(false);
  const [showVariable, setShowVariable] = useState(false);
  const [showPrediction, setShowPrediction] = useState(false);
  const [showGraph, setShowGraph] = useState(false);

  const generateNewProblem = useCallback(() => {
    setShowEquation(false);
    setShowVariable(false);
    setShowPrediction(false);
    setShowGraph(false);
    setCurrentProblem(makeProblem());
  }, []);

  // Graph data. While the graph is hidden, the y-axis has no numbers, so it
  // doesn't give away the size of the answer.
  const graphData = useMemo(() => {
    const timePoints = Array.from({ length: T_MAX + 1 }, (_, i) => i);
    const values = timePoints.map((t) => currentProblem.calculateValue(t));

    // y-axis from 0 to a "nice" value above the largest value
    const maxValue = Math.max(...values);
    const rawYMax = maxValue + Math.max(maxValue * 0.1, 1);
    const step = niceStep(0, rawYMax, 5);
    const yMax = Math.ceil(rawYMax / step - 1e-9) * step;

    return {
      series: [
        {
          name: `${currentProblem.thing.charAt(0).toUpperCase()}(t)`,
          data: timePoints.map((t, i) => ({ t, value: values[i] })),
          color: currentTheme === "dark" ? "#60a5fa" : "#2563eb",
          visible: true,
          lineWidth: 2,
        },
      ],
      xTicks: timePoints,
      yTicks: linearTicks(0, yMax, step),
      timeRange: [0, T_MAX],
      populationRange: [0, yMax],
      xLabel: "Time",
      yLabel: `Number of ${currentProblem.thing}`,
      xUnit: currentProblem.timeUnit + "s",
      yUnit: "",
    };
  }, [currentProblem, currentTheme]);

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
        xTicks={graphData.xTicks}
        yTicks={showGraph ? graphData.yTicks : []}
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
