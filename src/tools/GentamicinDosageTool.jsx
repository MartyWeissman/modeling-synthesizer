// src/tools/GentamicinDosageTool.jsx

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  GridSliderHorizontal,
  GridGraph,
  GridDisplay,
} from "../components/grid";
import ToolContainer from "../components/ui/ToolContainer";
import { useTheme } from "../hooks/useTheme";

const GentamicinDosageTool = () => {
  const { theme, currentTheme } = useTheme();

  // Canvas refs
  const canvasRef = useRef(null);
  const transformRef = useRef(null);

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
    const canvas = canvasRef.current;
    const transform = transformRef.current;
    if (!canvas || !transform || timeSeriesData.length === 0) return;

    const ctx = canvas.getContext("2d");
    const { dataToPixel, plotWidth, plotHeight } = transform;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw therapeutic range backgrounds
    const therapeuticMin = 4;
    const therapeuticMax = 10;
    const toxicLevel = 12;

    // Therapeutic range (green background)
    ctx.fillStyle =
      currentTheme === "dark"
        ? "rgba(34, 197, 94, 0.25)"
        : "rgba(34, 197, 94, 0.15)";
    const thMinPos = dataToPixel(0, therapeuticMin);
    const thMaxPos = dataToPixel(48, therapeuticMax);
    ctx.fillRect(0, thMaxPos.y, plotWidth, thMinPos.y - thMaxPos.y);

    // Toxic range (red background)
    ctx.fillStyle =
      currentTheme === "dark"
        ? "rgba(239, 68, 68, 0.25)"
        : "rgba(239, 68, 68, 0.15)";
    const toxicPos = dataToPixel(0, toxicLevel);
    ctx.fillRect(0, 0, plotWidth, toxicPos.y);

    // Draw concentration curve
    ctx.strokeStyle = currentTheme === "dark" ? "#3b82f6" : "#2563eb";
    ctx.lineWidth = 3;
    ctx.beginPath();

    timeSeriesData.forEach((point, index) => {
      const pos = dataToPixel(point.time, point.concentration);

      if (index === 0) {
        ctx.moveTo(pos.x, pos.y);
      } else {
        ctx.lineTo(pos.x, pos.y);
      }
    });

    ctx.stroke();

    // Draw dose markers
    ctx.fillStyle = currentTheme === "dark" ? "#fbbf24" : "#f59e0b";
    const numDoses = Math.floor(48 / frequency) + 1;
    for (let i = 0; i < numDoses; i++) {
      const doseTime = i * frequency;
      const pos = dataToPixel(doseTime, 0);
      ctx.fillRect(pos.x - 1, 0, 2, plotHeight);
    }
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
      >
        {(transform) => {
          transformRef.current = transform;
          return (
            <canvas
              ref={canvasRef}
              className="absolute pointer-events-none"
              style={transform.plotStyle}
              width={transform.plotWidth}
              height={transform.plotHeight}
            />
          );
        }}
      </GridGraph>

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
