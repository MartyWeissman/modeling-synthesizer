// src/tools/CaffeineMetabolismTool.jsx

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  GridTimePicker,
  GridStaircase,
  GridLabel,
  GridGraph,
  GridSliderHorizontal,
  GridDisplay,
} from "../components/grid";
import ToolContainer from "../components/ui/ToolContainer";
import Equation from "../components/Equation";
import { useTheme } from "../hooks/useTheme";
import { setupCanvas } from "../utils/canvas";
import { niceTicks } from "../utils/ticks";

// Default y-axis (mg). If the caffeine amount goes higher (large or stacked
// doses with a slow metabolic rate), the axis extends to fit the curve.
const DEFAULT_Y_MAX = 320;
const DEFAULT_Y_TICKS = [0, 100, 200, 300];
// Smallest metabolic rate on the slider (t½ = ln 2 / 0.01 ≈ 69 h). μ = 0 would
// mean caffeine is never eliminated.
const MU_MIN = 0.01;
const MU_MAX = 0.5;

const CaffeineMetabolismTool = () => {
  const { theme } = useTheme();

  // Canvas and transform refs
  const canvasRef = useRef(null);
  const transformRef = useRef(null);

  // Caffeine doses - using time strings and dose levels (0-5 = 0mg, 40mg, 80mg, 120mg, 160mg, 200mg)
  const [dose1Time, setDose1Time] = useState("7:00 AM");
  const [dose1Level, setDose1Level] = useState(3); // 120mg
  const [dose2Time, setDose2Time] = useState("12:00 PM");
  const [dose2Level, setDose2Level] = useState(2); // 80mg
  const [dose3Time, setDose3Time] = useState("4:00 PM");
  const [dose3Level, setDose3Level] = useState(1); // 40mg

  // Metabolic rate μ (per hour). Default 0.2, i.e. half-life ln 2 / 0.2 ≈ 3.5 h.
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
            // Each dose decays exponentially: dose · e^(−μ·t). The sum solves
            // C′ = Intake − μC with each dose taken all at once.
            totalLevel += dose.mg * Math.exp(-metabolicRate * hoursElapsed);
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

  // y-axis: the default [0, 320] mg, extended when the curve goes higher.
  const dataMax = timeSeriesData.reduce((mx, p) => Math.max(mx, p.level), 0);
  let yMax = DEFAULT_Y_MAX;
  let yTicks = DEFAULT_Y_TICKS;
  if (dataMax > DEFAULT_Y_MAX) {
    yTicks = niceTicks(0, dataMax * 1.05, 5);
    const step = yTicks.length > 1 ? yTicks[1] - yTicks[0] : 100;
    yMax = Math.max(dataMax * 1.05, yTicks[yTicks.length - 1]);
    yMax = Math.ceil(yMax / step) * step;
    yTicks = yTicks.filter((t) => t >= 0 && t <= yMax);
  }

  // Draw the time series on the graph canvas
  const drawTimeSeries = useCallback(() => {
    const transform = transformRef.current;
    const canvas = canvasRef.current;
    if (!canvas || !transform || timeSeriesData.length === 0) return;

    const setup = setupCanvas(canvas, {
      width: transform.plotWidth,
      height: transform.plotHeight,
    });
    if (!setup) return;
    const { ctx, width, height } = setup;
    const { dataToPixel } = transform;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw caffeine curve
    ctx.strokeStyle = "#4682b4"; // Steelblue for caffeine
    ctx.lineWidth = 2;
    ctx.beginPath();

    timeSeriesData.forEach((point, index) => {
      const pixel = dataToPixel(point.time, point.level);

      if (index === 0) {
        ctx.moveTo(pixel.x, pixel.y);
      } else {
        ctx.lineTo(pixel.x, pixel.y);
      }
    });

    ctx.stroke();
    // (yMax is derived from timeSeriesData, so the axis and the drawing change
    // together.)
  }, [timeSeriesData]);

  // Auto-update and regenerate time series
  useEffect(() => {
    generateTimeSeries();
  }, [generateTimeSeries]);

  // Draw graph when data changes
  useEffect(() => {
    if (
      timeSeriesData.length > 0 &&
      transformRef.current &&
      canvasRef.current
    ) {
      drawTimeSeries();
    }
  }, [timeSeriesData, drawTimeSeries]);

  const halfLife = Math.LN2 / metabolicRate;

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
        yTicks={yTicks}
        xRange={[0, 72]}
        yRange={[0, yMax]}
        tooltip="Caffeine in bloodstream"
        theme={theme}
      >
        {(transform) => {
          transformRef.current = transform;
          return (
            <canvas
              ref={canvasRef}
              className="absolute pointer-events-none"
              style={transform.plotStyle}
            />
          );
        }}
      </GridGraph>

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
        value={metabolicRate}
        onChange={setMetabolicRate}
        min={MU_MIN}
        max={MU_MAX}
        step={0.01}
        variant="unipolar"
        label={`{mu} = ${metabolicRate.toFixed(2)} hr⁻¹ (half-life ${halfLife.toFixed(1)} h)`}
        ariaValueText={`Metabolic rate μ = ${metabolicRate.toFixed(2)} per hour, half-life ${halfLife.toFixed(1)} hours`}
        tooltip={`Metabolic rate μ = ${metabolicRate.toFixed(2)} per hour (${MU_MIN} to ${MU_MAX}). Half-life t½ = ln 2 / μ = ${halfLife.toFixed(1)} hours.`}
        theme={theme}
      />

      {/* Differential Equation Formula */}
      <GridDisplay
        x={4}
        y={3}
        w={2}
        h={1}
        variant="info"
        align="center"
        fontSize="medium"
        theme={theme}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
          }}
        >
          <Equation name="caffeine-metabolism" size="small" />
        </div>
      </GridDisplay>
    </ToolContainer>
  );
};

export default CaffeineMetabolismTool;
