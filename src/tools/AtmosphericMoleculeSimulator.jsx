// src/tools/AtmosphericMoleculeSimulator.jsx

import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  GridSliderHorizontal,
  GridButton,
  GridWindow,
  GridDisplay,
} from "../components/grid";
import ToolContainer from "../components/ui/ToolContainer";
import { useTheme } from "../hooks/useTheme";
import { useAnimationLoop } from "../hooks/useAnimationLoop";
import { setupCanvas } from "../utils/canvas";
import { randomNormal } from "../utils/random";

const NUM_PARTICLES = 200;
const NUM_BINS = 16;
const MAX_HEIGHT = 100; // Ceiling of the box (height units); top of the window
const BIN_SIZE = MAX_HEIGHT / NUM_BINS; // 6.25 height units per bin
const GROUND_HEIGHT_PX = 12; // Visible ground strip at the bottom
const WINDOW_INSET = 0.03; // GridWindow clips 3% on each side
const STEPS_PER_SECOND = 60; // One random-walk step per frame at 60 Hz
const HISTOGRAM_UPDATE_INTERVAL = 200; // ms between histogram/stat updates while running

// ---- Model (pure functions) ----

/** Mean step per time step (negative = downward). */
const driftOf = (gravity) => gravity / 200;
/** Variance of the random part of one step. */
const varianceOf = (temperature) => temperature / 300;

/**
 * One random-walk step: drift from gravity plus Gaussian thermal noise,
 * reflected at the ground (0) and at the ceiling (MAX_HEIGHT).
 */
// eslint-disable-next-line react-refresh/only-export-components
export function stepHeight(h, gravity, temperature, z) {
  let newH = h + driftOf(gravity) + Math.sqrt(varianceOf(temperature)) * z;
  // Reflect (loop in case a step is larger than the box, which can't happen
  // for the slider ranges, but keeps the height valid regardless)
  for (let i = 0; i < 4 && (newH < 0 || newH > MAX_HEIGHT); i++) {
    if (newH < 0) newH = -newH;
    if (newH > MAX_HEIGHT) newH = 2 * MAX_HEIGHT - newH;
  }
  return Math.min(MAX_HEIGHT, Math.max(0, newH));
}

/**
 * Scale height H of the equilibrium profile. A random walk with drift mu and
 * step variance sigma^2, reflected at the ground, settles into an
 * exponential density exp(-h / H) with H = sigma^2 / (2|mu|).
 */
// eslint-disable-next-line react-refresh/only-export-components
export function scaleHeight(gravity, temperature) {
  const mu = Math.abs(driftOf(gravity));
  if (mu === 0) return Infinity;
  return varianceOf(temperature) / (2 * mu);
}

/** Expected fraction of molecules in each bin (exponential cut off at the ceiling). */
// eslint-disable-next-line react-refresh/only-export-components
export function expectedBinFractions(gravity, temperature) {
  const H = scaleHeight(gravity, temperature);
  if (!isFinite(H)) return Array(NUM_BINS).fill(1 / NUM_BINS);
  const probs = [];
  for (let i = 0; i < NUM_BINS; i++) {
    probs.push(Math.exp(-(i * BIN_SIZE) / H) - Math.exp(-((i + 1) * BIN_SIZE) / H));
  }
  const total = probs.reduce((a, b) => a + b, 0);
  return probs.map((p) => p / total);
}

/** Mean height of the exponential profile cut off at the ceiling. */
// eslint-disable-next-line react-refresh/only-export-components
export function expectedMeanHeight(gravity, temperature) {
  const H = scaleHeight(gravity, temperature);
  if (!isFinite(H)) return MAX_HEIGHT / 2;
  const r = MAX_HEIGHT / H;
  if (r < 1e-6) return MAX_HEIGHT / 2;
  return H - MAX_HEIGHT / Math.expm1(r);
}

const initialHeights = () =>
  Array.from({ length: NUM_PARTICLES }, () => 7.5 + (Math.random() * 2 - 1));

function heightStats(heights) {
  const mean = heights.reduce((a, b) => a + b, 0) / heights.length;
  const variance =
    heights.reduce((sum, h) => sum + (h - mean) * (h - mean), 0) / heights.length;
  return { mean, stdDev: Math.sqrt(variance) };
}

/** Vertical layout shared by both windows, in CSS pixels. */
function verticalGeometry(height) {
  const inset = height * WINDOW_INSET;
  const groundTop = height - inset - GROUND_HEIGHT_PX;
  const skyTop = inset + 3;
  return { groundTop, skyTop, pxPerUnit: (groundTop - skyTop) / MAX_HEIGHT };
}

const AtmosphericMoleculeSimulator = () => {
  const { theme, currentTheme } = useTheme();

  // Canvas refs
  const simulationCanvasRef = useRef(null);
  const histogramCanvasRef = useRef(null);
  const lastHistogramUpdateRef = useRef(0);
  const stepCarryRef = useRef(0);

  // Parameters
  const [gravity, setGravity] = useState(-10);
  const [temperature, setTemperature] = useState(300);

  // Simulation state: heights live in a ref (updated every frame);
  // the statistics shown in the panel are refreshed a few times a second.
  const [isRunning, setIsRunning] = useState(false);
  const heightsRef = useRef(null);
  if (heightsRef.current === null) heightsRef.current = initialHeights();
  const [stats, setStats] = useState(() => heightStats(heightsRef.current));

  // Stable x positions for each particle (distributed across width)
  const particleXPositions = useRef(
    Array.from({ length: NUM_PARTICLES }, (_, i) => (i + 0.5) / NUM_PARTICLES),
  );

  // Colors
  const getParticleColor = useCallback(() => {
    if (currentTheme === "unicorn") return "#E11D48"; // Rose red
    if (currentTheme === "dark") return "#FB923C"; // Orange
    return "#DC2626"; // Red
  }, [currentTheme]);

  const getGroundColor = useCallback(() => {
    if (currentTheme === "unicorn") return "#A78BFA"; // Purple
    if (currentTheme === "dark") return "#065F46"; // Dark green
    return "#228B22"; // Forest green
  }, [currentTheme]);

  // Draw sky with gradient and clouds
  const drawSky = useCallback(
    (ctx, width, height) => {
      // Create gradient
      let gradient;
      if (currentTheme === "unicorn") {
        gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, "#C4B5FD"); // Light purple at top
        gradient.addColorStop(0.5, "#E9D5FF");
        gradient.addColorStop(1, "#FDF4FF"); // Very light at horizon
      } else if (currentTheme === "dark") {
        gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, "#0F172A"); // Dark navy at top
        gradient.addColorStop(0.4, "#1E3A5F");
        gradient.addColorStop(1, "#334155"); // Lighter at horizon
      } else {
        gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, "#3B82F6"); // Blue at top
        gradient.addColorStop(0.5, "#7DD3FC");
        gradient.addColorStop(1, "#E0F2FE"); // Very light at horizon
      }

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Draw faint clouds
      const cloudColor =
        currentTheme === "dark"
          ? "rgba(100, 116, 139, 0.15)"
          : currentTheme === "unicorn"
            ? "rgba(255, 255, 255, 0.4)"
            : "rgba(255, 255, 255, 0.5)";

      ctx.fillStyle = cloudColor;

      // Cloud 1 - upper left
      ctx.beginPath();
      ctx.ellipse(width * 0.2, height * 0.15, 40, 15, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(width * 0.25, height * 0.13, 30, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(width * 0.15, height * 0.14, 25, 10, 0, 0, Math.PI * 2);
      ctx.fill();

      // Cloud 2 - upper right
      ctx.beginPath();
      ctx.ellipse(width * 0.75, height * 0.22, 50, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(width * 0.82, height * 0.2, 35, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(width * 0.68, height * 0.21, 30, 12, 0, 0, Math.PI * 2);
      ctx.fill();

      // Cloud 3 - middle
      ctx.beginPath();
      ctx.ellipse(width * 0.45, height * 0.35, 35, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(width * 0.52, height * 0.34, 28, 10, 0, 0, Math.PI * 2);
      ctx.fill();
    },
    [currentTheme],
  );

  const getHistogramColor = useCallback(
    (density) => {
      // Gradient from light to dark based on density
      if (currentTheme === "unicorn") {
        const intensity = Math.min(1, density * 3);
        return `rgba(124, 58, 237, ${0.3 + intensity * 0.7})`;
      }
      if (currentTheme === "dark") {
        const intensity = Math.min(1, density * 3);
        return `rgba(96, 165, 250, ${0.3 + intensity * 0.7})`;
      }
      const intensity = Math.min(1, density * 3);
      return `rgba(30, 58, 95, ${0.3 + intensity * 0.7})`;
    },
    [currentTheme],
  );

  // Calculate histogram bins (every molecule is between ground and ceiling)
  const calculateBins = (heights) => {
    const bins = new Array(NUM_BINS).fill(0);
    heights.forEach((h) => {
      const binIndex = Math.min(NUM_BINS - 1, Math.max(0, Math.floor(h / BIN_SIZE)));
      bins[binIndex]++;
    });
    return bins;
  };

  // Draw simulation
  const drawSimulation = useCallback(() => {
    const setup = setupCanvas(simulationCanvasRef.current);
    if (!setup) return;
    const { ctx, width, height } = setup;
    const { groundTop, pxPerUnit } = verticalGeometry(height);

    // Draw sky with gradient and clouds
    drawSky(ctx, width, height);

    // Draw ground
    ctx.fillStyle = getGroundColor();
    ctx.fillRect(0, groundTop, width, height - groundTop);

    // Draw particles
    const particleRadius = 2;
    ctx.fillStyle = getParticleColor();
    ctx.beginPath();
    heightsRef.current.forEach((h, i) => {
      const x = particleXPositions.current[i] * width;
      const y = Math.min(groundTop - particleRadius, groundTop - h * pxPerUnit);
      ctx.moveTo(x + particleRadius, y);
      ctx.arc(x, y, particleRadius, 0, Math.PI * 2);
    });
    ctx.fill();
  }, [drawSky, getGroundColor, getParticleColor]);

  // Draw histogram
  const drawHistogram = useCallback(() => {
    const setup = setupCanvas(histogramCanvasRef.current);
    if (!setup) return;
    const { ctx, width, height } = setup;
    const { groundTop, pxPerUnit } = verticalGeometry(height);
    const isDark = currentTheme === "dark";

    // Background
    ctx.fillStyle = isDark ? "#1f2937" : "#f9fafb";
    ctx.fillRect(0, 0, width, height);

    // Ground strip to match the simulation window
    ctx.fillStyle = getGroundColor();
    ctx.fillRect(0, groundTop, width, height - groundTop);

    const bins = calculateBins(heightsRef.current);
    const expected = expectedBinFractions(gravity, temperature);

    // Height axis labels on the left (same heights as the atmosphere window)
    const insetX = width * WINDOW_INSET;
    const leftPadding = insetX + 24;
    const maxBarWidth = width - leftPadding - insetX - 4;
    ctx.fillStyle = isDark ? "#d1d5db" : "#374151";
    ctx.strokeStyle = isDark ? "#6b7280" : "#9ca3af";
    ctx.lineWidth = 1;
    ctx.font = "10px monospace";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (let hTick = 0; hTick <= MAX_HEIGHT; hTick += 25) {
      const y = groundTop - hTick * pxPerUnit;
      ctx.fillText(String(hTick), leftPadding - 5, Math.max(y, height * WINDOW_INSET + 7));
      ctx.beginPath();
      ctx.moveTo(leftPadding - 3, y);
      ctx.lineTo(leftPadding, y);
      ctx.stroke();
    }

    // Histogram bars: width = fraction of the 200 molecules in that bin
    const barHeightPx = BIN_SIZE * pxPerUnit;
    bins.forEach((count, i) => {
      const density = count / NUM_PARTICLES;
      const barWidth = density * maxBarWidth;
      const y = groundTop - (i + 1) * barHeightPx;
      ctx.fillStyle = getHistogramColor(density);
      ctx.fillRect(leftPadding, y, barWidth, barHeightPx - 1);
    });

    // Expected distribution overlay (line), same scale as the bars
    ctx.strokeStyle = isDark ? "#F59E0B" : "#B45309"; // Amber
    ctx.lineWidth = 2;
    ctx.beginPath();
    expected.forEach((prob, i) => {
      const x = leftPadding + prob * maxBarWidth;
      const y = groundTop - (i + 0.5) * barHeightPx;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }, [currentTheme, gravity, temperature, getHistogramColor, getGroundColor]);

  // Animation loop: advance by real elapsed time (60 steps per second, the
  // same speed as the original one-step-per-frame loop on a 60 Hz display)
  const loop = useAnimationLoop((dt, now) => {
    stepCarryRef.current += dt * STEPS_PER_SECOND;
    const steps = Math.floor(stepCarryRef.current);
    stepCarryRef.current -= steps;
    const heights = heightsRef.current;
    for (let s = 0; s < steps; s++) {
      for (let i = 0; i < heights.length; i++) {
        heights[i] = stepHeight(heights[i], gravity, temperature, randomNormal());
      }
    }
    drawSimulation();
    if (now - lastHistogramUpdateRef.current >= HISTOGRAM_UPDATE_INTERVAL) {
      lastHistogramUpdateRef.current = now;
      drawHistogram();
      setStats(heightStats(heights));
    }
    return true;
  });

  // Start/stop simulation
  const toggleSimulation = useCallback(() => {
    if (loop.isRunning()) {
      loop.stop();
      setIsRunning(false);
      drawHistogram();
      setStats(heightStats(heightsRef.current));
    } else {
      stepCarryRef.current = 0;
      setIsRunning(true);
      loop.start();
    }
  }, [loop, drawHistogram]);

  // Reset simulation
  const resetSimulation = useCallback(() => {
    loop.stop();
    setIsRunning(false);
    heightsRef.current = initialHeights();
    setStats(heightStats(heightsRef.current));
    drawSimulation();
    drawHistogram();
  }, [loop, drawSimulation, drawHistogram]);

  // Redraw both windows right away on theme or parameter changes (also while
  // paused, so the theory curve always matches the sliders)
  useEffect(() => {
    drawSimulation();
    drawHistogram();
  }, [drawSimulation, drawHistogram]);

  const H = scaleHeight(gravity, temperature);
  const theoryMean = expectedMeanHeight(gravity, temperature);
  const isDark = currentTheme === "dark";
  const barColor = isDark ? "#60a5fa" : currentTheme === "unicorn" ? "#7c3aed" : "#1e3a5f";
  const lineColor = isDark ? "#F59E0B" : "#B45309";

  // Convert temperature to Fahrenheit for display
  const tempFahrenheit = (((temperature - 273.15) * 9) / 5 + 32).toFixed(0);

  return (
    <ToolContainer
      title="Atmospheric Molecule Simulator"
      canvasWidth={10}
      canvasHeight={5}
    >
      {/* Main simulation display */}
      <GridWindow
        x={0}
        y={0}
        w={6}
        h={5}
        tooltip="Atmosphere: 200 molecules in a closed box (ground to ceiling)"
        theme={theme}
      >
        <canvas
          ref={simulationCanvasRef}
          style={{
            width: "100%",
            height: "100%",
            display: "block",
          }}
        />
      </GridWindow>

      {/* Histogram display */}
      <GridWindow
        x={6}
        y={0}
        w={2}
        h={5}
        tooltip="Density: bars = share of molecules at each height; amber line = theory"
        theme={theme}
      >
        <canvas
          ref={histogramCanvasRef}
          style={{
            width: "100%",
            height: "100%",
            display: "block",
          }}
        />
      </GridWindow>

      {/* Simulate/Stop button */}
      <GridButton
        x={8}
        y={0}
        w={1}
        h={1}
        type="momentary"
        variant="function"
        onPress={toggleSimulation}
        theme={theme}
      >
        <div style={{ textAlign: "center", lineHeight: "1.1" }}>
          {isRunning ? "Stop" : "Simulate"}
        </div>
      </GridButton>

      {/* Reset button */}
      <GridButton
        x={9}
        y={0}
        w={1}
        h={1}
        type="momentary"
        variant="function"
        onPress={resetSimulation}
        theme={theme}
      >
        <div style={{ textAlign: "center", lineHeight: "1.1" }}>Reset</div>
      </GridButton>

      {/* Gravity slider */}
      <GridSliderHorizontal
        x={8}
        y={1}
        w={2}
        h={1}
        value={(-gravity - 1) * (100 / 49)} // Map -50 to -1 → 0 to 100
        onChange={(value) => setGravity(-(1 + value * (49 / 100)))}
        variant="unipolar"
        label={`Gravity: ${gravity.toFixed(0)} m/s²`}
        theme={theme}
      />

      {/* Temperature slider */}
      <GridSliderHorizontal
        x={8}
        y={2}
        w={2}
        h={1}
        value={(temperature - 100) / 4} // Map 100-500 → 0-100
        onChange={(value) => setTemperature(100 + value * 4)}
        variant="unipolar"
        label={`Temp: ${temperature}K (${tempFahrenheit}°F)`}
        theme={theme}
      />

      {/* Statistics display */}
      <GridDisplay
        x={8}
        y={3}
        w={2}
        h={2}
        variant="info"
        align="left"
        theme={theme}
      >
        <div
          style={{
            padding: "8px",
            fontFamily: "monospace",
            fontSize: "11px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            height: "100%",
            lineHeight: "1.45",
          }}
        >
          <div style={{ fontWeight: "bold", marginBottom: "4px" }}>
            Statistics
          </div>
          <div>Particles: {NUM_PARTICLES}</div>
          <div>Mean height: {stats.mean.toFixed(1)}</div>
          <div>Std dev: {stats.stdDev.toFixed(1)}</div>
          <div style={{ marginTop: "4px" }}>
            Theory: H = {H.toFixed(1)}
          </div>
          <div>Theory mean: {theoryMean.toFixed(1)}</div>
          <div style={{ marginTop: "4px", fontSize: "10px" }}>
            <span style={{ color: barColor }}>{"\u25A0"}</span> molecules{" "}
            <span style={{ color: lineColor, fontWeight: "bold" }}>
              {"\u2014"}
            </span>{" "}
            theory
          </div>
          <div style={{ marginTop: "2px", opacity: 0.7 }}>
            {isRunning ? "Running..." : "Paused"}
          </div>
        </div>
      </GridDisplay>
    </ToolContainer>
  );
};

export default AtmosphericMoleculeSimulator;
