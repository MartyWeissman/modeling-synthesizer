// src/tools/CaffeineMetabolismTool.jsx

import React, { useState, useEffect, useCallback } from "react";
import {
  GridTimePicker,
  GridStaircase,
  GridLabel,
  GridGraph,
  GridSliderHorizontal,
  GridDisplay,
} from "../components/grid";
import ToolContainer from "../components/ui/ToolContainer";
import { useTheme } from "../hooks/useTheme";

const CaffeineMetabolismTool = () => {
  const { theme } = useTheme();

  // Caffeine doses - using time strings and dose levels (0-5 = 0mg, 40mg, 80mg, 120mg, 160mg, 200mg)
  const [dose1Time, setDose1Time] = useState("7:00 AM");
  const [dose1Level, setDose1Level] = useState(3); // 120mg
  const [dose2Time, setDose2Time] = useState("12:00 PM");
  const [dose2Level, setDose2Level] = useState(2); // 80mg
  const [dose3Time, setDose3Time] = useState("4:00 PM");
  const [dose3Level, setDose3Level] = useState(1); // 40mg

  // Metabolic rate (controlled by slider, default 0.2 for 3.5 hour half-life)
  const [metabolicRate, setMetabolicRate] = useState(0.2);

  // Calculated values
  const [timeSeriesData, setTimeSeriesData] = useState([]);

  // Convert dose level (0-5) to mg
  const doseLevelToMg = (level) => {
    const doses = [0, 40, 80, 120, 160, 200];
    return doses[level] || 0;
  };

  // Parse time string to hours (24-hour format)
  const parseTimeToHours = (timeStr) => {
    const timeMatch = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/);
    if (timeMatch) {
      let hour = parseInt(timeMatch[1]);
      const minute = parseInt(timeMatch[2]);
      const period = timeMatch[3];

      if (period === "PM" && hour !== 12) hour += 12;
      if (period === "AM" && hour === 12) hour = 0;

      return hour + minute / 60;
    }
    return 0;
  };

  // Generate 72-hour (3-day) time series with daily dose repetition
  const generateTimeSeries = useCallback(() => {
    const dailyDoses = [
      { timeHours: parseTimeToHours(dose1Time), mg: doseLevelToMg(dose1Level) },
      { timeHours: parseTimeToHours(dose2Time), mg: doseLevelToMg(dose2Level) },
      { timeHours: parseTimeToHours(dose3Time), mg: doseLevelToMg(dose3Level) },
    ];

    // Create 3 days worth of doses
    const doses = [];
    for (let day = 0; day < 3; day++) {
      dailyDoses.forEach((dose) => {
        doses.push({
          timeHours: dose.timeHours + day * 24,
          mg: dose.mg,
        });
      });
    }

    const dataPoints = [];
    const timeStep = 0.25; // 15-minute intervals

    // Generate 72 hours of data
    for (let t = 0; t <= 72; t += timeStep) {
      let totalLevel = 0;

      doses.forEach((dose) => {
        if (dose.mg > 0) {
          const hoursElapsed = t - dose.timeHours;

          if (hoursElapsed > 0) {
            // Exponential decay: C(t) = C0 * e^(-kt)
            const decayedAmount =
              dose.mg * Math.exp(-metabolicRate * hoursElapsed);
            totalLevel += Math.max(0, decayedAmount);
          }
        }
      });

      dataPoints.push({ time: t, level: totalLevel });
    }

    setTimeSeriesData(dataPoints);
  }, [
    dose1Time,
    dose1Level,
    dose2Time,
    dose2Level,
    dose3Time,
    dose3Level,
    metabolicRate,
  ]);

  // Draw the time series on the graph canvas
  const drawTimeSeries = useCallback(() => {
    // Wait for the graph component to be rendered, then find its canvas
    setTimeout(() => {
      const graphComponent = document.querySelector(
        '[title="Caffeine in bloodstream"]',
      );
      if (!graphComponent) return;

      let canvas = graphComponent.querySelector("canvas");
      if (!canvas) {
        // Create canvas if it doesn't exist
        canvas = document.createElement("canvas");
        canvas.width = 400;
        canvas.height = 200;
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        canvas.style.position = "absolute";
        canvas.style.top = "30px";
        canvas.style.left = "30px";
        canvas.style.right = "10px";
        canvas.style.bottom = "30px";
        canvas.style.pointerEvents = "none";

        // Find the graph content area and add canvas
        const graphContent = graphComponent.querySelector(
          'div[style*="padding"]',
        );
        if (graphContent) {
          graphContent.appendChild(canvas);
        }
      }

      if (!canvas || timeSeriesData.length === 0) return;

      const ctx = canvas.getContext("2d");
      const { width, height } = canvas;

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Use fixed max level to match Y-axis (0-320mg for headroom)
      const maxLevel = 320;
      // No padding needed - canvas is already positioned within axis bounds
      const graphWidth = width;
      const graphHeight = height;

      // Draw caffeine curve
      ctx.strokeStyle = "#4682b4"; // Steelblue for caffeine
      ctx.lineWidth = 2;
      ctx.beginPath();

      timeSeriesData.forEach((point, index) => {
        // Use direct canvas coordinates - no Y-axis flip needed
        const x = (point.time / 72) * graphWidth;
        const y = graphHeight - (point.level / 320) * graphHeight;

        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.stroke();
    }, 200);
  }, [timeSeriesData, theme]);

  // Auto-update and regenerate time series
  useEffect(() => {
    generateTimeSeries();
  }, [generateTimeSeries]);

  // Draw graph when data changes
  useEffect(() => {
    if (timeSeriesData.length > 0) {
      drawTimeSeries();
    }
  }, [timeSeriesData, drawTimeSeries]);

  return (
    <ToolContainer
      title="Caffeine Metabolism Simulator"
      canvasWidth={10}
      canvasHeight={4}
    >
      {/* Row 0: Dose 1 */}
      <GridLabel
        x={0}
        y={0}
        w={1}
        h={1}
        text="Dose 1"
        fontSize="medium"
        tooltip="Dose 1"
        theme={theme}
      />

      <GridTimePicker
        x={1}
        y={0}
        value={dose1Time}
        onChange={setDose1Time}
        tooltip="Morning dose"
        theme={theme}
      />

      <GridStaircase
        x={2}
        y={0}
        value={dose1Level}
        onChange={setDose1Level}
        customLevels={["0mg", "40mg", "80mg", "120mg", "160mg", "200mg"]}
        tooltip={`Dose 1: ${doseLevelToMg(dose1Level)}mg`}
        theme={theme}
      />

      {/* Row 1: Dose 2 */}
      <GridLabel
        x={0}
        y={1}
        w={1}
        h={1}
        text="Dose 2"
        fontSize="medium"
        tooltip="Dose 2"
        theme={theme}
      />

      <GridTimePicker
        x={1}
        y={1}
        value={dose2Time}
        onChange={setDose2Time}
        tooltip="Lunch dose"
        theme={theme}
      />

      <GridStaircase
        x={2}
        y={1}
        value={dose2Level}
        onChange={setDose2Level}
        customLevels={["0mg", "40mg", "80mg", "120mg", "160mg", "200mg"]}
        tooltip={`Dose 2: ${doseLevelToMg(dose2Level)}mg`}
        theme={theme}
      />

      {/* Row 2: Dose 3 */}
      <GridLabel
        x={0}
        y={2}
        w={1}
        h={1}
        text="Dose 3"
        fontSize="medium"
        tooltip="Dose 3"
        theme={theme}
      />

      <GridTimePicker
        x={1}
        y={2}
        value={dose3Time}
        onChange={setDose3Time}
        tooltip="Afternoon dose"
        theme={theme}
      />

      <GridStaircase
        x={2}
        y={2}
        value={dose3Level}
        onChange={setDose3Level}
        customLevels={["0mg", "40mg", "80mg", "120mg", "160mg", "200mg"]}
        tooltip={`Dose 3: ${doseLevelToMg(dose3Level)}mg`}
        theme={theme}
      />

      {/* Main Graph (7x3) */}
      <GridGraph
        x={3}
        y={0}
        w={7}
        h={3}
        xLabel="time"
        yLabel="caffeine"
        xUnit="hours"
        yUnit="mg"
        variant="time-series-static"
        xAxisPosition="bottom"
        xTicks={[12, 24, 36, 48, 60, 72]}
        yTicks={[0, 100, 200, 300]}
        xRange={[0, 72]}
        yRange={[0, 320]}
        tooltip="Caffeine in bloodstream"
        theme={theme}
      />

      {/* Row 3: Bottom labels and controls */}
      <GridDisplay
        x={1}
        y={3}
        w={2}
        h={1}
        value={`Daily\ncaffeine\n${doseLevelToMg(dose1Level) + doseLevelToMg(dose2Level) + doseLevelToMg(dose3Level)}mg`}
        variant="status"
        align="center"
        fontSize="xs"
        tooltip={`Total daily caffeine: ${doseLevelToMg(dose1Level) + doseLevelToMg(dose2Level) + doseLevelToMg(dose3Level)}mg`}
        theme={theme}
      />

      {/* Metabolic Rate Horizontal Slider */}
      <GridSliderHorizontal
        x={7}
        y={3}
        w={3}
        h={1}
        value={metabolicRate * 200} // Convert 0.0-0.5 to 0-100 scale
        onChange={(value) => setMetabolicRate(value / 200)} // Convert back to 0.0-0.5
        variant="unipolar"
        label={`Metabolic rate {mu} = ${metabolicRate.toFixed(2)} hr⁻¹`}
        tooltip={`Metabolic rate: ${metabolicRate.toFixed(2)} (0.0 to 0.5)`}
        theme={theme}
      />

      {/* Differential Equation Formula */}
      <GridLabel
        x={4}
        y={3}
        w={2}
        h={1}
        text="C' = [intake] - {mu} C"
        fontSize="medium"
        textAlign="center"
        formulaMode={true}
        tooltip="Differential equation for caffeine metabolism"
        theme={theme}
      />
    </ToolContainer>
  );
};

export default CaffeineMetabolismTool;
