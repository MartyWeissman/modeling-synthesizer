// src/tools/CaffeineMetabolismTool.jsx

import React, { useState, useEffect, useCallback } from "react";
import {
  GridButton,
  GridTimePicker,
  GridStaircase,
  GridDisplay,
  GridGraph,
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

  // Metabolic rate (default 0.2 for 3.5 hour half-life)
  const [metabolicRate] = useState(0.2);

  // Calculated values
  const [currentLevel, setCurrentLevel] = useState(0);
  const [peakLevel, setPeakLevel] = useState(0);
  const [timeSeriesData, setTimeSeriesData] = useState([]);
  const [isAutoUpdate, setIsAutoUpdate] = useState(false);

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

  // Generate full 24-hour time series
  const generateTimeSeries = useCallback(() => {
    const doses = [
      { timeHours: parseTimeToHours(dose1Time), mg: doseLevelToMg(dose1Level) },
      { timeHours: parseTimeToHours(dose2Time), mg: doseLevelToMg(dose2Level) },
      { timeHours: parseTimeToHours(dose3Time), mg: doseLevelToMg(dose3Level) },
    ];

    const dataPoints = [];
    const timeStep = 0.25; // 15-minute intervals
    let maxLevel = 0;

    // Generate 24 hours of data
    for (let t = 0; t <= 24; t += timeStep) {
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
      maxLevel = Math.max(maxLevel, totalLevel);
    }

    setPeakLevel(Math.round(maxLevel));
    setTimeSeriesData(dataPoints);

    // Update current level based on current time of day
    const now = new Date();
    const currentHour = now.getHours() + now.getMinutes() / 60;
    const currentData = dataPoints.find(
      (point) => Math.abs(point.time - currentHour) < 0.25,
    );
    if (currentData) {
      setCurrentLevel(Math.round(currentData.level));
    }
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

      // Find max level for scaling
      const maxLevel = Math.max(...timeSeriesData.map((d) => d.level), 1);
      const padding = 20;
      const graphWidth = width - 2 * padding;
      const graphHeight = height - 2 * padding;

      // Draw grid lines
      ctx.strokeStyle = theme.component.includes("gray-700")
        ? "#6b7280"
        : "#d1d5db";
      ctx.lineWidth = 0.5;

      // Vertical grid lines (every 4 hours)
      for (let hour = 4; hour < 24; hour += 4) {
        const x = padding + (hour / 24) * graphWidth;
        ctx.beginPath();
        ctx.moveTo(x, padding);
        ctx.lineTo(x, height - padding);
        ctx.stroke();
      }

      // Horizontal grid lines
      for (let i = 1; i < 4; i++) {
        const y = padding + (i / 4) * graphHeight;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();
      }

      // Draw caffeine curve
      ctx.strokeStyle = "#ef4444"; // Red for caffeine
      ctx.lineWidth = 2;
      ctx.beginPath();

      timeSeriesData.forEach((point, index) => {
        const x = padding + (point.time / 24) * graphWidth;
        const y = height - padding - (point.level / maxLevel) * graphHeight;

        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.stroke();

      // Mark dose times
      ctx.fillStyle = "#3b82f6"; // Blue for dose markers
      const doses = [
        { time: parseTimeToHours(dose1Time), mg: doseLevelToMg(dose1Level) },
        { time: parseTimeToHours(dose2Time), mg: doseLevelToMg(dose2Level) },
        { time: parseTimeToHours(dose3Time), mg: doseLevelToMg(dose3Level) },
      ];

      doses.forEach((dose) => {
        if (dose.mg > 0) {
          const x = padding + (dose.time / 24) * graphWidth;

          ctx.beginPath();
          ctx.arc(x, height - padding, 3, 0, 2 * Math.PI);
          ctx.fill();

          // Label with dose amount
          ctx.fillStyle = theme.component.includes("gray-700")
            ? "#ffffff"
            : "#000000";
          ctx.font = "9px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(`${dose.mg}mg`, x, height - padding + 12);
          ctx.fillStyle = "#3b82f6";
        }
      });
    }, 200);
  }, [
    timeSeriesData,
    theme,
    dose1Time,
    dose1Level,
    dose2Time,
    dose2Level,
    dose3Time,
    dose3Level,
  ]);

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

  // Auto-update current level
  useEffect(() => {
    if (isAutoUpdate) {
      const interval = setInterval(() => {
        generateTimeSeries(); // This updates current level too
      }, 60000); // Update every minute

      return () => clearInterval(interval);
    }
  }, [isAutoUpdate, generateTimeSeries]);

  // Handle simulate button press
  const handleSimulate = () => {
    generateTimeSeries();
  };

  return (
    <ToolContainer title="Caffeine Dashboard" canvasWidth={10} canvasHeight={5}>
      {/* Row 0: Dose 1 */}
      <GridDisplay
        x={0}
        y={0}
        w={1}
        h={1}
        value="Dose 1"
        variant="default"
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
        customLevels={[0, 40, 80, 120, 160, 200]}
        tooltip={`Dose 1: ${doseLevelToMg(dose1Level)}mg`}
        theme={theme}
      />

      {/* Row 1: Dose 2 */}
      <GridDisplay
        x={0}
        y={1}
        w={1}
        h={1}
        value="Dose 2"
        variant="default"
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
        customLevels={[0, 40, 80, 120, 160, 200]}
        tooltip={`Dose 2: ${doseLevelToMg(dose2Level)}mg`}
        theme={theme}
      />

      {/* Row 2: Dose 3 */}
      <GridDisplay
        x={0}
        y={2}
        w={1}
        h={1}
        value="Dose 3"
        variant="default"
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
        customLevels={[0, 40, 80, 120, 160, 200]}
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
        yLabel="Caffeine(mg)"
        tooltip="Caffeine in bloodstream"
        theme={theme}
      />

      {/* Row 3: Simulate Button */}
      <GridButton
        x={1}
        y={3}
        type="momentary"
        variant="default"
        onPress={handleSimulate}
        tooltip="Simulate caffeine metabolism"
        theme={theme}
      >
        Simulate
      </GridButton>
    </ToolContainer>
  );
};

export default CaffeineMetabolismTool;
