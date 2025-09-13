// src/tools/GentamicinDosageTool.jsx

import React, { useState, useEffect, useCallback } from "react";
import {
  GridSliderHorizontal,
  GridGraph,
  GridDisplay,
} from "../components/grid";
import ToolContainer from "../components/ui/ToolContainer";
import { useTheme } from "../hooks/useTheme";

const GentamicinDosageTool = () => {
  const { theme, currentTheme } = useTheme();

  // Parameters with defaults at 3/4 up sliders to show problems
  const [dosage, setDosage] = useState(240); // mg (3/4 up 30-300 range)
  const [frequency, setFrequency] = useState(18); // hours (3/4 up 4-24 range)
  const [halfLife, setHalfLife] = useState(3); // hours (center of 1-8 range)
  const [infusionTime, setInfusionTime] = useState(60); // minutes (center of 15-180 range)

  // Calculated values
  const [timeSeriesData, setTimeSeriesData] = useState([]);
  const [therapeuticInfo, setTherapeuticInfo] = useState({});

  // Generate 48-hour time series with multiple doses
  const generateTimeSeries = useCallback(() => {
    const dataPoints = [];
    const timeStep = 0.25; // 15-minute intervals
    const totalHours = 48;
    const infusionHours = infusionTime / 60;
    const decayConstant = Math.log(2) / halfLife; // k = ln(2) / t_half

    // Calculate how many doses in 48 hours
    const numDoses = Math.floor(totalHours / frequency) + 1;

    for (let t = 0; t <= totalHours; t += timeStep) {
      let totalConcentration = 0;

      // Add contribution from each dose
      for (let doseNum = 0; doseNum < numDoses; doseNum++) {
        const doseTime = doseNum * frequency;

        if (t >= doseTime) {
          const timeAfterDose = t - doseTime;

          if (timeAfterDose <= infusionHours) {
            // During infusion: concentration builds up linearly
            const peakConc = dosage * 0.07; // Rough conversion mg -> mg/L (Vd ≈ 0.25 L/kg, 70kg = 17.5L, simplified to ~14L)
            const currentConc = peakConc * (timeAfterDose / infusionHours);
            totalConcentration += currentConc;
          } else {
            // After infusion: exponential decay from peak
            const timeAfterInfusion = timeAfterDose - infusionHours;
            const peakConc = dosage * 0.07;
            const decayedConc =
              peakConc * Math.exp(-decayConstant * timeAfterInfusion);
            totalConcentration += decayedConc;
          }
        }
      }

      dataPoints.push({ time: t, concentration: totalConcentration });
    }

    setTimeSeriesData(dataPoints);

    // Calculate therapeutic information
    const maxConc = Math.max(...dataPoints.map((p) => p.concentration));
    const minConc = Math.min(
      ...dataPoints
        .slice(Math.floor(frequency / timeStep))
        .map((p) => p.concentration),
    );

    setTherapeuticInfo({
      peakLevel: maxConc.toFixed(1),
      troughLevel: minConc.toFixed(1),
      idealRange: "4-10 mg/L",
      toxicLevel: "> 12 mg/L",
    });
  }, [dosage, frequency, halfLife, infusionTime]);

  // Draw the time series on the graph canvas
  const drawTimeSeries = useCallback(() => {
    setTimeout(() => {
      const graphComponent = document.querySelector(
        '[title="Gentamicin concentration over time"]',
      );
      if (!graphComponent) return;

      let canvas = graphComponent.querySelector("canvas");
      if (!canvas) {
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

      ctx.clearRect(0, 0, width, height);

      const graphWidth = width;
      const graphHeight = height;

      // Draw therapeutic range backgrounds
      const therapeuticMin = 4;
      const therapeuticMax = 10;
      const toxicLevel = 12;
      const maxLevel = 20; // Graph max

      // Therapeutic range (green background)
      ctx.fillStyle =
        currentTheme === "dark"
          ? "rgba(34, 197, 94, 0.25)"
          : "rgba(34, 197, 94, 0.15)";
      const thMin = graphHeight - (therapeuticMin / maxLevel) * graphHeight;
      const thMax = graphHeight - (therapeuticMax / maxLevel) * graphHeight;
      ctx.fillRect(0, thMax, graphWidth, thMin - thMax);

      // Toxic range (red background)
      ctx.fillStyle =
        currentTheme === "dark"
          ? "rgba(239, 68, 68, 0.25)"
          : "rgba(239, 68, 68, 0.15)";
      const toxicY = graphHeight - (toxicLevel / maxLevel) * graphHeight;
      ctx.fillRect(0, 0, graphWidth, toxicY);

      // Draw concentration curve
      ctx.strokeStyle = currentTheme === "dark" ? "#3b82f6" : "#2563eb";
      ctx.lineWidth = 3;
      ctx.beginPath();

      timeSeriesData.forEach((point, index) => {
        const x = (point.time / 48) * graphWidth;
        const y = graphHeight - (point.concentration / maxLevel) * graphHeight;

        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.stroke();

      // Draw dose markers
      ctx.fillStyle = currentTheme === "dark" ? "#fbbf24" : "#f59e0b";
      const numDoses = Math.floor(48 / frequency) + 1;
      for (let i = 0; i < numDoses; i++) {
        const doseTime = i * frequency;
        const x = (doseTime / 48) * graphWidth;
        ctx.fillRect(x - 1, 0, 2, graphHeight);
      }
    }, 200);
  }, [timeSeriesData, currentTheme, frequency]);

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
      title="Gentamicin Dosage Simulator"
      canvasWidth={10}
      canvasHeight={4}
    >
      {/* Row 0: Dosage */}
      <GridSliderHorizontal
        x={0}
        y={0}
        w={3}
        h={1}
        value={((dosage - 30) / (300 - 30)) * 100} // Map 30-300mg to 0-100%
        onChange={(value) => setDosage(30 + (value / 100) * (300 - 30))}
        variant="unipolar"
        label={`Dosage: ${dosage.toFixed(0)} mg`}
        tooltip={`Gentamicin dose: ${dosage.toFixed(0)}mg`}
        theme={theme}
      />

      {/* Row 1: Frequency */}
      <GridSliderHorizontal
        x={0}
        y={1}
        w={3}
        h={1}
        value={((frequency - 4) / (24 - 4)) * 100} // Map 4-24hrs to 0-100%
        onChange={(value) => setFrequency(4 + (value / 100) * (24 - 4))}
        variant="unipolar"
        label={`Frequency: ${frequency.toFixed(1)} hrs`}
        tooltip={`Dosing interval: ${frequency.toFixed(1)} hours`}
        theme={theme}
      />

      {/* Row 2: Infusion Duration */}
      <GridSliderHorizontal
        x={0}
        y={2}
        w={3}
        h={1}
        value={((infusionTime - 15) / (180 - 15)) * 100} // Map 15-180min to 0-100%
        onChange={(value) => setInfusionTime(15 + (value / 100) * (180 - 15))}
        variant="unipolar"
        label={`Infusion duration: ${infusionTime.toFixed(0)} min`}
        tooltip={`Infusion duration: ${infusionTime.toFixed(0)} minutes`}
        theme={theme}
      />

      {/* Row 3: Half-life */}
      <GridSliderHorizontal
        x={0}
        y={3}
        w={3}
        h={1}
        value={((halfLife - 1) / (8 - 1)) * 100} // Map 1-8hrs to 0-100%
        onChange={(value) => setHalfLife(1 + (value / 100) * (8 - 1))}
        variant="unipolar"
        label={`Half-life: ${halfLife.toFixed(1)} hrs`}
        tooltip={`Elimination half-life: ${halfLife.toFixed(1)} hours`}
        theme={theme}
      />

      {/* Main Graph (7x3) */}
      <GridGraph
        x={3}
        y={0}
        w={7}
        h={3}
        xLabel="Time"
        yLabel="Concentration"
        xUnit="hours"
        yUnit="mg/L"
        variant="time-series-static"
        xAxisPosition="bottom"
        xTicks={[0, 12, 24, 36, 48]}
        yTicks={[0, 5, 10, 15, 20]}
        xRange={[0, 48]}
        yRange={[0, 20]}
        tooltip="Gentamicin concentration over time"
        theme={theme}
      />

      {/* Therapeutic Information Display */}
      <GridDisplay
        x={3}
        y={3}
        w={7}
        h={1}
        variant="info"
        align="left"
        fontSize="small"
        theme={theme}
      >
        <div
          style={{
            padding: "8px",
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr 1fr",
            gap: "12px",
          }}
        >
          <div>
            <strong>Peak:</strong> {therapeuticInfo.peakLevel} mg/L
          </div>
          <div>
            <strong>Trough:</strong> {therapeuticInfo.troughLevel} mg/L
          </div>
          <div
            style={{ color: currentTheme === "dark" ? "#34d399" : "#059669" }}
          >
            <strong>Ideal:</strong> {therapeuticInfo.idealRange}
          </div>
          <div
            style={{ color: currentTheme === "dark" ? "#f87171" : "#dc2626" }}
          >
            <strong>Toxic:</strong> {therapeuticInfo.toxicLevel}
          </div>
        </div>
      </GridDisplay>
    </ToolContainer>
  );
};

export default GentamicinDosageTool;
