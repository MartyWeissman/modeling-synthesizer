// src/tools/GuanfacinePharmacokineticsTool.jsx

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

const GuanfacinePharmacokineticsTool = () => {
  const { theme } = useTheme();

  // Dose parameters - Dose 1 is ER, Doses 2 & 3 are IR
  const [dose1Time, setDose1Time] = useState("8:00 AM"); // ER dose
  const [dose1Level, setDose1Level] = useState(2); // 2mg ER (index 2)
  const [dose2Time, setDose2Time] = useState("2:00 PM"); // IR dose
  const [dose2Level, setDose2Level] = useState(2); // 0.5mg IR (index 2)
  const [dose3Time, setDose3Time] = useState("8:00 PM"); // IR dose
  const [dose3Level, setDose3Level] = useState(1); // 0.25mg IR (index 1)

  // Pharmacokinetic parameters (can be adjusted for individual variation)
  const [patientWeight, setPatientWeight] = useState(30); // Patient weight in kg (20-100kg)
  const [clearanceRate, setClearanceRate] = useState(1.0); // Relative clearance (0.5-2.0)

  // Calculated values
  const [timeSeriesData, setTimeSeriesData] = useState([]);
  const [peakMarkers, setPeakMarkers] = useState([]); // Store peak time/concentration pairs
  const [dailyAuc, setDailyAuc] = useState([]); // Daily AUC values for each day
  const [day7SteadyState, setDay7SteadyState] = useState({
    cmax: 0,
    cmin: 0,
    auc: 0,
  }); // Day 7 steady-state values

  // Convert dose level to mg for ER (Extended Release)
  const erDoseLevelToMg = (level) => {
    const doses = [0, 1, 2, 3, 4, 5]; // 0mg, 1mg, 2mg, 3mg, 4mg, 5mg
    return doses[level] || 0;
  };

  // Convert dose level to mg for IR (Immediate Release)
  const irDoseLevelToMg = (level) => {
    const doses = [0, 0.25, 0.5, 0.75, 1, 1.25]; // 0mg, 0.25mg, 0.5mg, 0.75mg, 1mg, 1.25mg
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

  // 2-compartment pharmacokinetic simulation using Euler's method
  const generateTimeSeries = useCallback(() => {
    // Create daily repeating doses for 3 days (72 hours)
    const dailyDoses = [
      {
        timeMinutes: parseTimeToHours(dose1Time) * 60,
        mg: erDoseLevelToMg(dose1Level),
        type: "ER", // Extended Release
      },
      {
        timeMinutes: parseTimeToHours(dose2Time) * 60,
        mg: irDoseLevelToMg(dose2Level),
        type: "IR", // Immediate Release
      },
      {
        timeMinutes: parseTimeToHours(dose3Time) * 60,
        mg: irDoseLevelToMg(dose3Level),
        type: "IR", // Immediate Release
      },
    ];

    // Repeat doses daily for 7 days
    const doses = [];
    for (let day = 0; day < 7; day++) {
      dailyDoses.forEach((dose) => {
        if (dose.mg > 0) {
          doses.push({
            timeMinutes: dose.timeMinutes + day * 24 * 60,
            mg: dose.mg,
            type: dose.type,
          });
        }
      });
    }

    // Simulation parameters
    const timeStepMinutes = 1; // 1-minute intervals for Euler's method
    const totalHours = 168; // Extended to 168 hours (7 days)
    const totalMinutes = totalHours * 60;

    // Compartment amounts (mg) - track drug in each compartment
    let erStomach = 0; // ER drug in stomach
    let erPlasma = 0; // ER drug in plasma
    let irStomach = 0; // IR drug in stomach
    let irPlasma = 0; // IR drug in plasma

    // Rate constants (per minute)
    const bioavailability = 0.1; // Only 10% of drug reaches plasma
    const kER_digest = 0.008; // ER exponential digestion rate (1/min) - slower
    const kIR_digest_linear = 0.02; // IR linear digestion rate (mg/min per mg in stomach)
    const kER_elim = Math.log(2) / (18.0 * 60); // ER elimination rate (1/min) - 18h half-life
    const kIR_elim = Math.log(2) / (16.0 * 60); // IR elimination rate (1/min) - 16h half-life

    // Apply clearance rate adjustment
    const adjustedKER_elim = kER_elim * clearanceRate;
    const adjustedKIR_elim = kIR_elim * clearanceRate;

    // Volume of distribution (L) - weight-scaled
    const Vd = 2.0 * (patientWeight / 30.0); // 2L/30kg baseline, scales with weight

    const dataPoints = [];
    const concentrations = []; // For AUC calculation

    // Euler's method simulation
    for (let minute = 0; minute <= totalMinutes; minute += timeStepMinutes) {
      // Add doses at appropriate times
      doses.forEach((dose) => {
        if (
          Math.abs(minute - dose.timeMinutes) < timeStepMinutes / 2 &&
          dose.mg > 0
        ) {
          if (dose.type === "ER") {
            erStomach += dose.mg; // ER dose goes to stomach
          } else {
            irStomach += dose.mg; // IR dose goes to stomach
          }
        }
      });

      // Differential equations using Euler's method

      // ER compartment changes
      if (erStomach > 0) {
        // ER: exponential digestion from stomach to plasma
        const erDigestRate = kER_digest * erStomach; // Exponential digestion
        const erDigested = erDigestRate * timeStepMinutes;
        erStomach = Math.max(0, erStomach - erDigested);
        erPlasma += erDigested * bioavailability; // Only 10% reaches plasma
      }

      // ER elimination from plasma
      if (erPlasma > 0) {
        const erEliminated = adjustedKER_elim * erPlasma * timeStepMinutes;
        erPlasma = Math.max(0, erPlasma - erEliminated);
      }

      // IR compartment changes
      if (irStomach > 0) {
        // IR: linear digestion from stomach to plasma
        const irDigestRate = Math.min(
          kIR_digest_linear * irStomach,
          irStomach / timeStepMinutes,
        );
        const irDigested = irDigestRate * timeStepMinutes;
        irStomach = Math.max(0, irStomach - irDigested);
        irPlasma += irDigested * bioavailability; // Only 10% reaches plasma
      }

      // IR elimination from plasma
      if (irPlasma > 0) {
        const irEliminated = adjustedKIR_elim * irPlasma * timeStepMinutes;
        irPlasma = Math.max(0, irPlasma - irEliminated);
      }

      // Calculate total plasma concentration (ng/mL) with different scaling factors
      const erConcentration = ((erPlasma / Vd) * 1000) / 40; // ER: 40x reduction
      const irConcentration = ((irPlasma / Vd) * 1000) / 16; // IR: 16x reduction
      const plasmaConcentration = erConcentration + irConcentration;

      // Store data points (every 15 minutes for visualization, but only up to 168 hours for display)
      if (minute % 15 === 0) {
        const hours = minute / 60;
        if (hours <= 168) {
          // Only store up to 168 hours for visualization
          dataPoints.push({
            time: hours,
            concentration: plasmaConcentration,
            erStomach: erStomach,
            erPlasma: erPlasma,
            irStomach: irStomach,
            irPlasma: irPlasma,
          });
        }
      }

      // Store all concentrations for AUC calculation
      concentrations.push(plasmaConcentration);
    }

    setTimeSeriesData(dataPoints);

    // Calculate daily AUC for each 24-hour period using trapezoidal rule (ng·h/mL)
    const dailyAucValues = [];
    const minutesPerDay = 24 * 60; // 24 hours in minutes

    for (let day = 0; day < 7; day++) {
      let dayAuc = 0;
      const startMinute = day * minutesPerDay;
      const endMinute = Math.min(
        (day + 1) * minutesPerDay,
        concentrations.length,
      );

      for (let i = startMinute + 1; i < endMinute; i++) {
        const dt = timeStepMinutes / 60; // Convert to hours
        const avgConcentration =
          (concentrations[i - 1] + concentrations[i]) / 2;
        dayAuc += avgConcentration * dt;
      }
      dailyAucValues.push(dayAuc);
    }
    setDailyAuc(dailyAucValues);

    // Calculate Day 7 steady-state values (Cmax, Cmin, AUC)
    const day7Data = dataPoints.filter(
      (point) => point.time >= 144 && point.time <= 168,
    );
    if (day7Data.length > 0) {
      const day7Concentrations = day7Data.map((point) => point.concentration);
      const day7Cmax = Math.max(...day7Concentrations);
      const day7Cmin = Math.min(...day7Concentrations);
      const day7Auc = dailyAucValues[6] || 0; // Day 7 AUC (index 6)

      setDay7SteadyState({
        cmax: day7Cmax,
        cmin: day7Cmin,
        auc: day7Auc,
      });
    }

    // Detect peaks (local maxima) for marking Tmax/Cmax
    const peaks = [];
    for (let i = 1; i < dataPoints.length - 1; i++) {
      const prev = dataPoints[i - 1].concentration;
      const current = dataPoints[i].concentration;
      const next = dataPoints[i + 1].concentration;

      // Local maximum: current > both neighbors and above threshold
      if (current > prev && current > next && current > 0.1) {
        peaks.push({
          time: dataPoints[i].time,
          concentration: current,
          index: i,
        });
      }
    }

    // Filter peaks to only significant ones (avoid minor fluctuations)
    const significantPeaks = peaks.filter(
      (peak) =>
        peak.concentration >
        Math.max(...dataPoints.map((p) => p.concentration)) * 0.3,
    );

    setPeakMarkers(significantPeaks);
  }, [
    dose1Time,
    dose1Level,
    dose2Time,
    dose2Level,
    dose3Time,
    dose3Level,
    patientWeight,
    clearanceRate,
  ]);

  // Draw the time series on the graph canvas
  const drawTimeSeries = useCallback(() => {
    setTimeout(() => {
      const graphComponent = document.querySelector(
        '[title="Guanfacine plasma concentration"]',
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

      const graphWidth = width;
      const graphHeight = height;

      // Draw day/night background gradient
      for (let day = 0; day < 7; day++) {
        const dayStart = ((day * 24) / 168) * graphWidth;
        const dayEnd = (((day + 1) * 24) / 168) * graphWidth;

        // Nighttime: 8pm (20:00) to 6am (6:00) = 10 hours
        const nightStart = ((day * 24 + 20) / 168) * graphWidth;
        const nightEnd = (((day + 1) * 24 + 6) / 168) * graphWidth;

        // Day background (6am to 8pm) - pale yellow
        ctx.fillStyle = "rgba(255, 255, 224, 0.3)"; // Light yellow
        ctx.fillRect(
          dayStart + (6 / 24) * (dayEnd - dayStart),
          0,
          (14 / 24) * (dayEnd - dayStart),
          graphHeight,
        );

        // Night background (8pm to 6am next day) - dark blue-gray
        ctx.fillStyle = "rgba(47, 79, 79, 0.4)"; // Dark slate gray
        // Evening (8pm to midnight)
        ctx.fillRect(nightStart, 0, dayEnd - nightStart, graphHeight);
        // Early morning (midnight to 6am)
        if (day < 6) {
          // Don't paint beyond last day
          ctx.fillRect(dayEnd, 0, (6 / 24) * (dayEnd - dayStart), graphHeight);
        }
      }

      // Draw concentration curve with high contrast color
      ctx.strokeStyle = "#DC2626"; // Bright red for good contrast against both backgrounds
      ctx.lineWidth = 3; // Slightly thicker for better visibility
      ctx.beginPath();

      timeSeriesData.forEach((point, index) => {
        const x = (point.time / 168) * graphWidth; // Updated for 168 hours (7 days) display
        const y = graphHeight - (point.concentration / 10) * graphHeight;

        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.stroke();

      // Draw stronger tick lines every 24 hours to emphasize daily cycle
      ctx.strokeStyle = "#333333";
      ctx.lineWidth = 2;
      for (let day = 1; day <= 6; day++) {
        const dayX = ((day * 24) / 168) * graphWidth;
        ctx.beginPath();
        ctx.moveTo(dayX, 0);
        ctx.lineTo(dayX, graphHeight);
        ctx.stroke();
      }

      // Draw peak markers
      if (peakMarkers && peakMarkers.length > 0) {
        peakMarkers.forEach((peak) => {
          const x = (peak.time / 168) * graphWidth;
          const y = graphHeight - (peak.concentration / 10) * graphHeight;

          // Draw peak marker (red circle)
          ctx.fillStyle = "#ef4444"; // Red color
          ctx.beginPath();
          ctx.arc(x, y, 4, 0, 2 * Math.PI);
          ctx.fill();

          // Draw dashed lines to axes
          ctx.strokeStyle = "#666666";
          ctx.lineWidth = 1;
          ctx.setLineDash([3, 3]); // Dashed line

          // Horizontal line to Y-axis (for Cmax)
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(x, y);
          ctx.stroke();

          // Vertical line to X-axis (for Tmax)
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x, graphHeight);
          ctx.stroke();

          ctx.setLineDash([]); // Reset to solid line
        });
      }

      // Hide default axis labels by covering them with white rectangles
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, graphHeight + 10, graphWidth, 20);

      // Add time-of-day axis labels (0=midnight, 12=noon)
      ctx.fillStyle = "#000000";
      ctx.font = "12px Arial";
      ctx.textAlign = "center";

      // Draw time-of-day labels at 12-hour intervals
      for (let hour = 0; hour <= 168; hour += 12) {
        const x = (hour / 168) * graphWidth;
        const timeOfDay = hour % 24 === 0 ? "0" : "12";

        // Position labels below the x-axis (replacing defaults)
        ctx.fillText(timeOfDay, x, graphHeight + 20);
      }

      // Add day labels
      ctx.font = "10px Arial";
      ctx.fillStyle = "#666666";
      for (let day = 0; day < 7; day++) {
        const dayCenter = (((day + 0.5) * 24) / 168) * graphWidth;
        ctx.fillText(`Day ${day + 1}`, dayCenter, graphHeight + 35);
      }
    }, 200);
  }, [timeSeriesData, peakMarkers]);

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
      title="Guanfacine Pharmacokinetics Simulator"
      canvasWidth={10}
      canvasHeight={4}
    >
      {/* Row 0: Dose 1 (ER) */}
      <GridLabel
        x={0}
        y={0}
        w={1}
        h={1}
        text="Dose 1|ER"
        fontSize="medium"
        tooltip="Extended Release Dose 1"
        theme={theme}
      />

      <GridTimePicker
        x={1}
        y={0}
        value={dose1Time}
        onChange={setDose1Time}
        tooltip="Extended release dose time"
        theme={theme}
      />

      <GridStaircase
        x={2}
        y={0}
        value={dose1Level}
        onChange={setDose1Level}
        customLevels={["0mg", "1mg", "2mg", "3mg", "4mg", "5mg"]}
        tooltip={`ER Dose: ${erDoseLevelToMg(dose1Level)}mg`}
        theme={theme}
      />

      {/* Row 1: Dose 2 (IR) */}
      <GridLabel
        x={0}
        y={1}
        w={1}
        h={1}
        text="Dose 2|IR"
        fontSize="medium"
        tooltip="Immediate Release Dose 2"
        theme={theme}
      />

      <GridTimePicker
        x={1}
        y={1}
        value={dose2Time}
        onChange={setDose2Time}
        tooltip="Immediate release dose time"
        theme={theme}
      />

      <GridStaircase
        x={2}
        y={1}
        value={dose2Level}
        onChange={setDose2Level}
        customLevels={["0mg", "0.25mg", "0.5mg", "0.75mg", "1mg", "1.25mg"]}
        tooltip={`IR Dose: ${irDoseLevelToMg(dose2Level)}mg`}
        theme={theme}
      />

      {/* Row 2: Dose 3 (IR) */}
      <GridLabel
        x={0}
        y={2}
        w={1}
        h={1}
        text="Dose 3|IR"
        fontSize="medium"
        tooltip="Immediate Release Dose 3"
        theme={theme}
      />

      <GridTimePicker
        x={1}
        y={2}
        value={dose3Time}
        onChange={setDose3Time}
        tooltip="Immediate release dose time"
        theme={theme}
      />

      <GridStaircase
        x={2}
        y={2}
        value={dose3Level}
        onChange={setDose3Level}
        customLevels={["0mg", "0.25mg", "0.5mg", "0.75mg", "1mg", "1.25mg"]}
        tooltip={`IR Dose: ${irDoseLevelToMg(dose3Level)}mg`}
        theme={theme}
      />

      {/* Main Graph (7x3) */}
      <GridGraph
        x={3}
        y={0}
        w={7}
        h={3}
        xLabel="time"
        yLabel="plasma concentration"
        xUnit="hours"
        yUnit="ng/mL"
        variant="time-series-static"
        xAxisPosition="bottom"
        xTicks={[
          0, 12, 24, 36, 48, 60, 72, 84, 96, 108, 120, 132, 144, 156, 168,
        ]}
        yTicks={[0, 2, 4, 6, 8, 10]}
        xRange={[0, 168]}
        yRange={[0, 10]}
        tooltip="Guanfacine plasma concentration"
        theme={theme}
      />

      {/* Row 3: Bottom controls and info */}
      <GridDisplay
        x={0}
        y={3}
        w={2}
        h={1}
        value={`Day 7 Steady State\nCmax: ${day7SteadyState.cmax.toFixed(2)} ng/mL\nCmin: ${day7SteadyState.cmin.toFixed(2)} ng/mL\nAUC: ${day7SteadyState.auc.toFixed(1)} ng·h/mL`}
        variant="status"
        align="left"
        fontSize="xs"
        tooltip={`Day 7 steady-state values: Cmax=${day7SteadyState.cmax.toFixed(2)} ng/mL, Cmin=${day7SteadyState.cmin.toFixed(2)} ng/mL, AUC=${day7SteadyState.auc.toFixed(1)} ng·h/mL`}
        theme={theme}
      />

      {/* Patient Weight Slider */}
      <GridSliderHorizontal
        x={2}
        y={3}
        w={3}
        h={1}
        value={((patientWeight - 20) / (100 - 20)) * 100} // 20-100kg mapped to 0-100%
        onChange={(value) => setPatientWeight(20 + (value / 100) * (100 - 20))}
        variant="unipolar"
        label={`Weight: ${patientWeight.toFixed(0)} kg`}
        tooltip="Patient body weight (20-100 kg) - higher weight = lower concentration"
        theme={theme}
      />

      {/* Clearance Rate Slider */}
      <GridSliderHorizontal
        x={5}
        y={3}
        w={3}
        h={1}
        value={clearanceRate * 50} // 0.5-2.0 mapped to 25-100%
        onChange={(value) =>
          setClearanceRate(Math.max(0.5, Math.min(2.0, value / 50)))
        }
        variant="unipolar"
        label={`Clearance: ${clearanceRate.toFixed(1)}x`}
        tooltip="Relative drug clearance rate (0.5x-2.0x normal)"
        theme={theme}
      />

      {/* Total Daily Dose Display */}
      <GridDisplay
        x={8}
        y={3}
        w={2}
        h={1}
        value={`Daily\n${(erDoseLevelToMg(dose1Level) + irDoseLevelToMg(dose2Level) + irDoseLevelToMg(dose3Level)).toFixed(2)}mg`}
        variant="info"
        align="center"
        fontSize="xs"
        tooltip={`Total daily guanfacine: ${(erDoseLevelToMg(dose1Level) + irDoseLevelToMg(dose2Level) + irDoseLevelToMg(dose3Level)).toFixed(2)}mg`}
        theme={theme}
      />
    </ToolContainer>
  );
};

export default GuanfacinePharmacokineticsTool;
