// src/tools/TreeRingSimulatorTool.jsx

import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  GridButton,
  GridWindow,
  GridDisplay,
  GridInput,
  GridWheelSelector,
} from "../components/grid";
import ToolContainer from "../components/ui/ToolContainer";
import { useTheme } from "../hooks/useTheme";
import { useAnimationLoop } from "../hooks/useAnimationLoop";
import { setupCanvas } from "../utils/canvas";
import { zScore } from "./stochasticToolsMath";

const GROW_SECONDS = 1.5; // length of the growth animation

// Colors for tree rings
const RING_COLORS = {
  light: ["#D2B48C", "#C4A574", "#B8956A"],
  dark: ["#8B7355", "#9C8A6E", "#A89880"],
  unicorn: ["#DDA0DD", "#D8BFD8", "#E6E6FA"],
};

const barkColorFor = (currentTheme) => {
  if (currentTheme === "unicorn") return "#9370DB";
  if (currentTheme === "dark") return "#5D4037";
  return "#8B4513";
};

const ringColorsFor = (currentTheme) => {
  if (currentTheme === "unicorn") return RING_COLORS.unicorn;
  if (currentTheme === "dark") return RING_COLORS.dark;
  return RING_COLORS.light;
};

// Ring-boundary noise. Frequencies are whole numbers so each boundary is a
// smooth closed curve (no kink at θ = 0). Amplitudes sum to 1, so
// |noise(θ)| ≤ 1.
const makeHarmonics = (minFreq, count) => {
  const raw = Array.from({ length: count }, (_, i) => ({
    weight: Math.random() / (i + 1), // higher frequencies get less weight
    frequency: minFreq + i,
    phase: Math.random() * Math.PI * 2,
  }));
  const total = raw.reduce((sum, h) => sum + h.weight, 0) || 1;
  return raw.map((h) => ({ ...h, amplitude: h.weight / total }));
};

const evaluateNoise = (harmonics, theta) => {
  let noise = 0;
  for (const h of harmonics) {
    noise += h.amplitude * Math.sin(h.frequency * theta + h.phase);
  }
  return noise;
};

// Offset (in mm) of the outer boundary of ring i at angle θ. It is at most a
// quarter of the narrower of the two rings it separates, so consecutive
// boundaries never cross and no ring can vanish, however thin.
const boundaryOffset = (growths, noiseData, i, theta) => {
  const next = i + 1 < growths.length ? growths[i + 1] : growths[i];
  const limit = 0.25 * Math.min(growths[i], next);
  return limit * evaluateNoise(noiseData.rings[i], theta);
};

const TreeRingSimulatorTool = () => {
  const { theme, currentTheme } = useTheme();

  // Parameters
  const [minGrowth, setMinGrowth] = useState(1);
  const [maxGrowth, setMaxGrowth] = useState(5);
  const [numYears, setNumYears] = useState(20);
  const [distributionType, setDistributionType] = useState("Uniform");

  // Simulation results
  const [yearlyGrowths, setYearlyGrowths] = useState([]);
  // Ring-boundary noise: a shared trunk shape plus one set per ring
  const [noiseSeeds, setNoiseSeeds] = useState({ shape: [], rings: [] });
  const [totalGrowth, setTotalGrowth] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [isGrowing, setIsGrowing] = useState(false);
  const [animationProgress, setAnimationProgress] = useState(0);
  const [inputError, setInputError] = useState(null);

  // Canvas refs
  const crossSectionCanvasRef = useRef(null);
  const zoomCanvasRef = useRef(null);
  const animationElapsedRef = useRef(0);

  // Draw circular cross-section with organic ring shapes
  const drawCrossSection = useCallback(
    (growths, noiseData, progress = 1) => {
      const canvas = crossSectionCanvasRef.current;
      if (!canvas) return;

      const { ctx, width, height } = setupCanvas(canvas);
      const centerX = width / 2;
      const centerY = height / 2;

      ctx.clearRect(0, 0, width, height);

      if (growths.length === 0) {
        ctx.fillStyle = currentTheme === "dark" ? "#666666" : "#999999";
        ctx.font = "12px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText('Click "Grow!"', centerX, centerY);
        return;
      }

      const totalRadius = growths.reduce((sum, g) => sum + g, 0);
      // Leave room for the boundary wobble, the shared shape, and the bark
      const maxRadius = Math.min(width, height) / 2 - 12;
      const scaleFactor = maxRadius / (totalRadius * 1.1);

      const colors = ringColorsFor(currentTheme);
      const barkColor = barkColorFor(currentTheme);
      const ringsToShow = Math.ceil(growths.length * progress);

      const cumulativeRadii = [0];
      for (let i = 0; i < growths.length; i++) {
        cumulativeRadii.push(cumulativeRadii[i] + growths[i]);
      }

      // Radius (px) of the outer boundary of ring i at angle θ; a shared,
      // gentle trunk shape (1 + s(θ)) scales all rings together.
      const boundaryRadius = (i, theta) =>
        (cumulativeRadii[i + 1] + boundaryOffset(growths, noiseData, i, theta)) *
        (1 + 0.05 * evaluateNoise(noiseData.shape, theta)) *
        scaleFactor;

      const numPoints = 120;
      const traceBoundary = (i, extra = 0) => {
        ctx.beginPath();
        for (let j = 0; j <= numPoints; j++) {
          const theta = (j / numPoints) * Math.PI * 2;
          const r = boundaryRadius(i, theta) + extra;
          const x = centerX + r * Math.cos(theta);
          const y = centerY + r * Math.sin(theta);
          if (j === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
      };

      // Bark (outermost), following the shape of the last visible ring
      if (ringsToShow > 0) {
        ctx.fillStyle = barkColor;
        traceBoundary(ringsToShow - 1, 3);
        ctx.fill();
      }

      // Rings from outermost to innermost (inner rings overlay outer)
      for (let i = ringsToShow - 1; i >= 0; i--) {
        ctx.fillStyle = colors[i % colors.length];
        traceBoundary(i);
        ctx.fill();
        ctx.strokeStyle = barkColor;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }

      // Center point (pith)
      ctx.fillStyle = barkColor;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 2, 0, Math.PI * 2);
      ctx.fill();

      // Zoom indicator rectangle (horizontal slice through right half only)
      if (progress >= 1) {
        const indicatorColor = currentTheme === "dark" ? "#ff6b6b" : "#e63946";
        const indicatorHeight = 12;
        const indicatorWidth = boundaryRadius(growths.length - 1, 0) + 6;

        ctx.strokeStyle = indicatorColor;
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 2]);
        ctx.strokeRect(
          centerX,
          centerY - indicatorHeight / 2,
          indicatorWidth,
          indicatorHeight,
        );
        ctx.setLineDash([]);

        // Radius label above the indicator
        ctx.fillStyle = currentTheme === "dark" ? "#ffffff" : "#000000";
        ctx.font = "bold 11px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillText(
          `Radius = ${totalRadius.toFixed(1)} mm`,
          centerX + indicatorWidth / 2,
          centerY - indicatorHeight / 2 - 3,
        );
      }
    },
    [currentTheme],
  );

  // Draw zoomed linear view
  const drawZoomView = useCallback(
    (growths, noiseData, progress = 1) => {
      const canvas = zoomCanvasRef.current;
      if (!canvas) return;

      const { ctx, width, height } = setupCanvas(canvas);

      ctx.clearRect(0, 0, width, height);

      if (growths.length === 0) {
        ctx.fillStyle = currentTheme === "dark" ? "#666666" : "#999999";
        ctx.font = "14px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(
          'Click "Grow!" to simulate tree growth',
          width / 2,
          height / 2,
        );
        return;
      }

      const totalWidth = growths.reduce((sum, g) => sum + g, 0);
      const scaleFactor = (width - 50) / totalWidth;

      const centerY = height / 2;
      const ringHeight = height - 40; // Padding for year labels
      const top = centerY - ringHeight / 2;

      const colors = ringColorsFor(currentTheme);
      const barkColor = barkColorFor(currentTheme);

      const ringsToShow = Math.ceil(growths.length * progress);

      const cumulative = [0];
      for (let i = 0; i < growths.length; i++) {
        cumulative.push(cumulative[i] + growths[i]);
      }

      // The slice covers a small range of angles around θ = 0, so the
      // boundaries are the same curves as in the cross-section, seen up close.
      const numPoints = 40;
      const edgePoints = (i) => {
        const pts = [];
        for (let j = 0; j <= numPoints; j++) {
          const t = j / numPoints;
          const y = top + t * ringHeight;
          if (i < 0) {
            pts.push({ x: 20, y });
            continue;
          }
          const theta = (t - 0.5) * (Math.PI / 3);
          const r = cumulative[i + 1] + boundaryOffset(growths, noiseData, i, theta);
          pts.push({ x: 20 + r * scaleFactor, y });
        }
        return pts;
      };

      // Each ring fills exactly the region between its inner and outer
      // boundaries, so rings neither overlap nor leave gaps.
      let inner = edgePoints(-1);
      for (let i = 0; i < ringsToShow; i++) {
        const outer = edgePoints(i);
        ctx.fillStyle = colors[i % colors.length];
        ctx.beginPath();
        inner.forEach((pt, j) =>
          j === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y),
        );
        for (let j = outer.length - 1; j >= 0; j--) {
          ctx.lineTo(outer[j].x, outer[j].y);
        }
        ctx.closePath();
        ctx.fill();

        // Ring boundary
        ctx.strokeStyle = barkColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        outer.forEach((pt, j) =>
          j === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y),
        );
        ctx.stroke();

        inner = outer;
      }

      // Outer bark, following the last visible boundary
      ctx.fillStyle = barkColor;
      ctx.beginPath();
      inner.forEach((pt, j) =>
        j === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y),
      );
      for (let j = inner.length - 1; j >= 0; j--) {
        ctx.lineTo(inner[j].x + 5, inner[j].y);
      }
      ctx.closePath();
      ctx.fill();

      // Year labels
      if (growths.length > 1 && progress >= 1) {
        ctx.fillStyle = currentTheme === "dark" ? "#ffffff" : "#000000";
        ctx.font = "11px sans-serif";
        ctx.textBaseline = "top";

        ctx.textAlign = "left";
        ctx.fillText("Year 1", 20, centerY + ringHeight / 2 + 4);

        ctx.textAlign = "right";
        ctx.fillText(
          `Year ${growths.length}`,
          20 + totalWidth * scaleFactor,
          centerY + ringHeight / 2 + 4,
        );
      }

      // Zoom indicator border
      if (progress >= 1) {
        const indicatorColor = currentTheme === "dark" ? "#ff6b6b" : "#e63946";
        ctx.strokeStyle = indicatorColor;
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 2]);
        ctx.strokeRect(2, 2, width - 4, height - 4);
        ctx.setLineDash([]);
      }
    },
    [currentTheme],
  );

  // Draw both views whenever the data, the animation progress, or the theme
  // changes (the animation loop only updates the progress).
  useEffect(() => {
    drawCrossSection(yearlyGrowths, noiseSeeds, animationProgress);
    drawZoomView(yearlyGrowths, noiseSeeds, animationProgress);
  }, [drawCrossSection, drawZoomView, yearlyGrowths, noiseSeeds, animationProgress]);

  // Growth animation: rings appear over 1.5 s of real time
  const growLoop = useAnimationLoop((dt) => {
    animationElapsedRef.current += dt;
    const progress = Math.min(animationElapsedRef.current / GROW_SECONDS, 1);
    setAnimationProgress(progress);
    if (progress >= 1) {
      setIsGrowing(false);
      return false;
    }
    return true;
  });

  const runSimulation = useCallback(() => {
    if (growLoop.isRunning()) return; // ignore clicks while growing

    if (minGrowth > maxGrowth) {
      setInputError("Min must not exceed Max");
      return;
    }
    setInputError(null);

    const years = Math.max(1, Math.round(numYears));

    // Generate random growths and ring-boundary noise for each year
    const growths = [];
    const rings = [];
    for (let i = 0; i < years; i++) {
      let growth;
      if (distributionType === "Uniform") {
        // Uniform random in [min, max]
        growth = Math.random() * (maxGrowth - minGrowth) + minGrowth;
      } else {
        // Binary: 50/50 choice between min and max
        growth = Math.random() < 0.5 ? minGrowth : maxGrowth;
      }
      growths.push(growth);
      rings.push(makeHarmonics(2, 5));
    }

    setYearlyGrowths(growths);
    setNoiseSeeds({ shape: makeHarmonics(1, 4), rings });

    const total = growths.reduce((sum, g) => sum + g, 0);
    setTotalGrowth(total);

    // Expected value is the same for both distributions: (min + max) / 2 per year
    const expectedTotal = ((minGrowth + maxGrowth) / 2) * years;

    // Variance depends on distribution type
    const variancePerYear =
      distributionType === "Uniform"
        ? Math.pow(maxGrowth - minGrowth, 2) / 12 // Uniform: (max − min)²/12
        : Math.pow(maxGrowth - minGrowth, 2) / 4; // Binary: (max − min)²/4
    const stdDev = Math.sqrt(variancePerYear * years);

    setStatistics({
      expectedTotal,
      stdDev,
      z: zScore(total, expectedTotal, stdDev),
    });

    animationElapsedRef.current = 0;
    setAnimationProgress(0);
    setIsGrowing(true);
    growLoop.start();
  }, [minGrowth, maxGrowth, numYears, distributionType, growLoop]);

  return (
    <ToolContainer
      title="Tree Ring Simulator"
      canvasWidth={10}
      canvasHeight={3}
    >
      {/* Circular cross-section view */}
      <GridWindow
        x={0}
        y={0}
        w={3}
        h={3}
        title="Tree Cross-Section"
        theme={theme}
      >
        <canvas
          ref={crossSectionCanvasRef}
          style={{
            width: "100%",
            height: "100%",
            display: "block",
          }}
        />
      </GridWindow>

      {/* Zoomed linear view */}
      <GridWindow
        x={3}
        y={0}
        w={6}
        h={2}
        title="Zoomed View (horizontal slice)"
        theme={theme}
      >
        <canvas
          ref={zoomCanvasRef}
          style={{
            width: "100%",
            height: "100%",
            display: "block",
          }}
        />
      </GridWindow>

      {/* Inputs - top row */}
      <GridInput
        x={9}
        y={0}
        w={1}
        h={1}
        value={minGrowth}
        onChange={setMinGrowth}
        min={0.1}
        max={10}
        step={0.1}
        variable="Min"
        title="Minimum annual growth (mm)"
        theme={theme}
      />

      <GridInput
        x={9}
        y={1}
        w={1}
        h={1}
        value={maxGrowth}
        onChange={setMaxGrowth}
        min={0.1}
        max={10}
        step={0.1}
        variable="Max"
        title="Maximum annual growth (mm)"
        theme={theme}
      />

      {/* Results display, Grow button, Years input, Distribution selector - bottom row */}
      <GridDisplay
        x={3}
        y={2}
        w={3}
        h={1}
        variant="info"
        align="center"
        theme={theme}
      >
        {inputError ? (
          <div
            style={{
              padding: "8px",
              fontSize: "12px",
              color: currentTheme === "dark" ? "#f87171" : "#dc2626",
            }}
          >
            {inputError}
          </div>
        ) : totalGrowth !== null && statistics ? (
          <div
            style={{
              padding: "4px 8px",
              fontFamily: "monospace",
              fontSize: "12px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              width: "100%",
              lineHeight: "1.3",
            }}
          >
            <div>
              <span style={{ fontWeight: "bold" }}>Total: </span>
              <span>{totalGrowth.toFixed(2)} mm</span>
            </div>
            <div>
              <span style={{ fontWeight: "bold" }}>Expected: </span>
              <span>
                {statistics.expectedTotal.toFixed(2)} ±{" "}
                {statistics.stdDev.toFixed(2)} mm
              </span>
            </div>
            <div title="z = (Total − Expected) / SD">
              <span style={{ fontWeight: "bold" }}>z-score: </span>
              <span>
                {statistics.z === null ? "—" : statistics.z.toFixed(2)}
              </span>
            </div>
          </div>
        ) : (
          <div style={{ padding: "8px", fontSize: "12px", opacity: 0.6 }}>
            Click "Grow!"
          </div>
        )}
      </GridDisplay>

      <GridButton
        x={6}
        y={2}
        w={1}
        h={1}
        type="momentary"
        variant="function"
        onPress={runSimulation}
        theme={theme}
      >
        <div style={{ textAlign: "center", lineHeight: "1.1" }}>
          {isGrowing ? "..." : "Grow!"}
        </div>
      </GridButton>

      <GridInput
        x={7}
        y={2}
        w={1}
        h={1}
        value={numYears}
        onChange={setNumYears}
        min={1}
        max={100}
        step={1}
        variable="Years"
        title="Number of years to simulate"
        theme={theme}
      />

      <GridWheelSelector
        x={8}
        y={2}
        w={2}
        h={1}
        value={distributionType}
        onChange={setDistributionType}
        options={["Uniform", "Binary"]}
        title="Distribution"
        theme={theme}
      />
    </ToolContainer>
  );
};

export default TreeRingSimulatorTool;
