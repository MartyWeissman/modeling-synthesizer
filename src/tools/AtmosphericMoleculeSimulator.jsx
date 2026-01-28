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

const NUM_PARTICLES = 200;
const NUM_BINS = 16; // More bins, visually same size after 2x zoom
const BIN_SIZE = 6.25; // Height units per bin (100 / 16)
const MAX_HEIGHT = NUM_BINS * BIN_SIZE; // 100 units
const GROUND_HEIGHT_PX = 20; // Fixed ground height in pixels
const PIXELS_PER_UNIT = 4; // Height units to pixels conversion (2x zoom)
const HISTOGRAM_UPDATE_INTERVAL = 200; // Update histogram every 200ms (5 times per second)

const AtmosphericMoleculeSimulator = () => {
  const { theme, currentTheme } = useTheme();

  // Canvas refs
  const simulationCanvasRef = useRef(null);
  const histogramCanvasRef = useRef(null);
  const animationRef = useRef(null);
  const lastHistogramUpdateRef = useRef(0);

  // Parameters
  const [gravity, setGravity] = useState(-10);
  const [temperature, setTemperature] = useState(300);

  // Simulation state
  const [isRunning, setIsRunning] = useState(false);
  // Initialize particles near the ground (height ~7.5 with small random offset)
  const [particleHeights, setParticleHeights] = useState(() =>
    Array.from({ length: NUM_PARTICLES }, () => 7.5 + (Math.random() * 2 - 1)),
  );

  // Store stable x positions for each particle (distributed across width)
  const particleXPositions = useRef(
    Array.from({ length: NUM_PARTICLES }, (_, i) => i / NUM_PARTICLES),
  );

  // Pre-cached normal random values for performance
  const normalCacheRef = useRef([]);
  const normalIndexRef = useRef(0);

  // Generate normal random values using Box-Muller transform
  const generateNormalCache = useCallback(() => {
    const cache = [];
    for (let i = 0; i < 1000; i += 2) {
      const u1 = Math.random();
      const u2 = Math.random();
      const r = Math.sqrt(-2.0 * Math.log(u1));
      const theta = 2.0 * Math.PI * u2;
      cache.push(r * Math.cos(theta));
      cache.push(r * Math.sin(theta));
    }
    normalCacheRef.current = cache;
    normalIndexRef.current = 0;
  }, []);

  // Get next normal random value
  const getNormalValue = useCallback(
    (g, t) => {
      if (normalIndexRef.current >= normalCacheRef.current.length) {
        generateNormalCache();
      }
      const normalVal = normalCacheRef.current[normalIndexRef.current++];
      // Gravity pulls down (negative g means downward), temperature scales random motion
      return g / 200 + Math.sqrt(t / 300) * normalVal;
    },
    [generateNormalCache],
  );

  // Initialize normal cache
  useEffect(() => {
    generateNormalCache();
  }, [generateNormalCache]);

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

  // Calculate histogram bins
  const calculateBins = useCallback((heights) => {
    const bins = new Array(NUM_BINS).fill(0);
    heights.forEach((h) => {
      const binIndex = Math.floor(h / BIN_SIZE);
      if (binIndex >= 0 && binIndex < NUM_BINS) {
        bins[binIndex]++;
      }
    });
    return bins;
  }, []);

  // Calculate expected distribution (Boltzmann/barometric formula)
  // For a random walk with drift g/200 and variance (t/300), the stationary
  // distribution is exponential: P(h) ∝ exp(-h / scale_height)
  // where scale_height = variance / |drift| = (t/300) / (|g|/200) = 200t / (300|g|) = 2t / (3|g|)
  const getExpectedDistribution = useCallback(() => {
    const drift = Math.abs(gravity) / 200;
    const variance = temperature / 300;

    if (drift < 0.001) {
      // No gravity - uniform distribution
      return Array(NUM_BINS).fill(1 / NUM_BINS);
    }

    const scaleHeight = variance / drift;

    // Calculate expected fraction in each bin
    const expected = [];
    let total = 0;

    for (let i = 0; i < NUM_BINS; i++) {
      const hLow = i * BIN_SIZE;
      const hHigh = (i + 1) * BIN_SIZE;
      // Integral of exp(-h/scale) from hLow to hHigh
      const prob =
        Math.exp(-hLow / scaleHeight) - Math.exp(-hHigh / scaleHeight);
      expected.push(prob);
      total += prob;
    }

    // Normalize
    return expected.map((p) => p / total);
  }, [gravity, temperature]);

  // Draw simulation
  const drawSimulation = useCallback(
    (heights) => {
      const canvas = simulationCanvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      const { width, height } = canvas;

      // Draw sky with gradient and clouds
      drawSky(ctx, width, height);

      // Draw ground (fixed 20px from bottom)
      ctx.fillStyle = getGroundColor();
      ctx.fillRect(0, height - GROUND_HEIGHT_PX, width, GROUND_HEIGHT_PX);

      // Draw particles
      const particleColor = getParticleColor();
      const particleRadius = 2; // Smaller dots like original

      ctx.fillStyle = particleColor;
      heights.forEach((h, i) => {
        // Use stable x position for each particle
        const x = particleXPositions.current[i] * width;
        // Map height units to pixels (2 pixels per unit), measured from top of ground
        const y = height - GROUND_HEIGHT_PX - h * PIXELS_PER_UNIT;

        ctx.beginPath();
        ctx.arc(
          x,
          Math.max(
            particleRadius,
            Math.min(y, height - GROUND_HEIGHT_PX - particleRadius),
          ),
          particleRadius,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      });
    },
    [drawSky, getGroundColor, getParticleColor],
  );

  // Draw histogram
  const drawHistogram = useCallback(
    (heights) => {
      const canvas = histogramCanvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      const { width, height } = canvas;

      // Clear
      ctx.fillStyle = currentTheme === "dark" ? "#1f2937" : "#f9fafb";
      ctx.fillRect(0, 0, width, height);

      // Draw ground area to match simulation (same 20px from bottom)
      ctx.fillStyle = getGroundColor();
      ctx.fillRect(0, height - GROUND_HEIGHT_PX, width, GROUND_HEIGHT_PX);

      // Calculate bins and expected distribution
      const bins = calculateBins(heights);
      const expected = getExpectedDistribution();
      const maxCount = Math.max(...bins, 1);
      const maxExpected = Math.max(...expected);

      // Draw histogram bars - positioned to align exactly with simulation
      const barHeightPx = BIN_SIZE * PIXELS_PER_UNIT;
      const leftPadding = 10; // Shift bars right to avoid GridWindow edge
      const maxBarWidth = width - leftPadding - 5;

      bins.forEach((count, i) => {
        const density = count / NUM_PARTICLES;
        // Scale so NUM_PARTICLES (200) = full width
        const barWidth = (count / NUM_PARTICLES) * maxBarWidth;
        // Position bars to align with height units in simulation
        const y = height - GROUND_HEIGHT_PX - (i + 1) * barHeightPx;

        ctx.fillStyle = getHistogramColor(density);
        ctx.fillRect(leftPadding, y, barWidth, barHeightPx - 1);
      });

      // Draw expected distribution overlay (line)
      ctx.strokeStyle = currentTheme === "dark" ? "#F59E0B" : "#B45309"; // Amber
      ctx.lineWidth = 2;
      ctx.beginPath();

      expected.forEach((prob, i) => {
        // Scale expected line same as bars (probability = fraction of particles)
        const expectedWidth = leftPadding + prob * maxBarWidth;
        const y = height - GROUND_HEIGHT_PX - (i + 0.5) * barHeightPx;

        if (i === 0) {
          ctx.moveTo(expectedWidth, y);
        } else {
          ctx.lineTo(expectedWidth, y);
        }
      });
      ctx.stroke();
    },
    [
      currentTheme,
      calculateBins,
      getHistogramColor,
      getGroundColor,
      getExpectedDistribution,
    ],
  );

  // Animation loop
  const animate = useCallback(() => {
    setParticleHeights((prevHeights) => {
      const newHeights = prevHeights.map((h) => {
        let newH = h + getNormalValue(gravity, temperature);
        // Bounce off ground (elastic reflection)
        if (newH < 0) {
          newH = -newH;
        }
        return newH;
      });
      return newHeights;
    });

    animationRef.current = requestAnimationFrame(animate);
  }, [gravity, temperature, getNormalValue]);

  // Start/stop simulation
  const toggleSimulation = useCallback(() => {
    if (isRunning) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      setIsRunning(false);
    } else {
      setIsRunning(true);
      animationRef.current = requestAnimationFrame(animate);
    }
  }, [isRunning, animate]);

  // Reset simulation
  const resetSimulation = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    setIsRunning(false);
    // Reset particles near the ground (height ~7.5 with small random offset)
    setParticleHeights(
      Array.from(
        { length: NUM_PARTICLES },
        () => 7.5 + (Math.random() * 2 - 1),
      ),
    );
    generateNormalCache();
  }, [generateNormalCache]);

  // Update animation when parameters change while running
  useEffect(() => {
    if (isRunning) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      animationRef.current = requestAnimationFrame(animate);
    }
  }, [gravity, temperature, isRunning, animate]);

  // Draw whenever heights change (throttle histogram updates)
  useEffect(() => {
    drawSimulation(particleHeights);

    // Throttle histogram updates to 5 per second
    const now = Date.now();
    if (now - lastHistogramUpdateRef.current >= HISTOGRAM_UPDATE_INTERVAL) {
      drawHistogram(particleHeights);
      lastHistogramUpdateRef.current = now;
    }
  }, [particleHeights, drawSimulation, drawHistogram]);

  // Initialize canvases
  useEffect(() => {
    const initCanvas = (canvasRef) => {
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
      }
    };

    initCanvas(simulationCanvasRef);
    initCanvas(histogramCanvasRef);
    drawSimulation(particleHeights);
    drawHistogram(particleHeights);
  }, [currentTheme]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Calculate statistics
  const meanHeight = particleHeights.reduce((a, b) => a + b, 0) / NUM_PARTICLES;
  const variance =
    particleHeights.reduce((sum, h) => sum + Math.pow(h - meanHeight, 2), 0) /
    NUM_PARTICLES;
  const stdDev = Math.sqrt(variance);

  // Convert temperature to Fahrenheit for display
  const tempFahrenheit = (((temperature - 273.15) * 9) / 5 + 32).toFixed(0);

  return (
    <ToolContainer
      title="Atmospheric Molecule Simulator"
      canvasWidth={10}
      canvasHeight={5}
    >
      {/* Main simulation display */}
      <GridWindow x={0} y={0} w={6} h={5} title="Atmosphere" theme={theme}>
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
      <GridWindow x={6} y={0} w={2} h={5} title="Density" theme={theme}>
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
            lineHeight: "1.6",
          }}
        >
          <div style={{ fontWeight: "bold", marginBottom: "4px" }}>
            Statistics
          </div>
          <div>Particles: {NUM_PARTICLES}</div>
          <div>Mean height: {meanHeight.toFixed(1)}</div>
          <div>Std dev: {stdDev.toFixed(1)}</div>
          <div style={{ marginTop: "4px", opacity: 0.7 }}>
            {isRunning ? "Running..." : "Paused"}
          </div>
        </div>
      </GridDisplay>
    </ToolContainer>
  );
};

export default AtmosphericMoleculeSimulator;
