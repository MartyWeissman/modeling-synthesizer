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

const TreeRingSimulatorTool = () => {
  const { theme, currentTheme } = useTheme();

  // Parameters
  const [minGrowth, setMinGrowth] = useState(1);
  const [maxGrowth, setMaxGrowth] = useState(5);
  const [numYears, setNumYears] = useState(20);
  const [distributionType, setDistributionType] = useState("Uniform");

  // Simulation results
  const [yearlyGrowths, setYearlyGrowths] = useState([]);
  const [noiseSeeds, setNoiseSeeds] = useState([]); // Store noise for each ring
  const [totalGrowth, setTotalGrowth] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [isGrowing, setIsGrowing] = useState(false);
  const [animationProgress, setAnimationProgress] = useState(0);

  // Canvas refs
  const crossSectionCanvasRef = useRef(null);
  const zoomCanvasRef = useRef(null);
  const animationRef = useRef(null);

  // Colors for tree rings
  const ringColors = {
    light: ["#D2B48C", "#C4A574", "#B8956A"],
    dark: ["#8B7355", "#9C8A6E", "#A89880"],
    unicorn: ["#DDA0DD", "#D8BFD8", "#E6E6FA"],
  };

  const getBarkColor = () => {
    if (currentTheme === "unicorn") return "#9370DB";
    if (currentTheme === "dark") return "#5D4037";
    return "#8B4513";
  };

  const getRingColors = () => {
    if (currentTheme === "unicorn") return ringColors.unicorn;
    if (currentTheme === "dark") return ringColors.dark;
    return ringColors.light;
  };

  // Generate smooth periodic noise using multiple sine waves
  const generateNoiseSeed = () => {
    // Generate random coefficients for a smooth periodic function
    const numHarmonics = 5;
    const harmonics = [];
    for (let i = 0; i < numHarmonics; i++) {
      harmonics.push({
        amplitude: (Math.random() * 0.3) / (i + 1), // Decreasing amplitude for higher frequencies
        frequency: i + 1 + Math.random() * 0.5, // Roughly integer frequencies with some variation
        phase: Math.random() * Math.PI * 2,
      });
    }
    return harmonics;
  };

  // Evaluate noise at angle theta using stored harmonics
  const evaluateNoise = (harmonics, theta, maxNoise) => {
    let noise = 0;
    for (const h of harmonics) {
      noise += h.amplitude * Math.sin(h.frequency * theta + h.phase);
    }
    // Normalize to [-maxNoise, maxNoise]
    return noise * maxNoise;
  };

  // Draw circular cross-section with organic ring shapes
  const drawCrossSection = useCallback(
    (growths, noiseData, progress = 1) => {
      const canvas = crossSectionCanvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      const { width, height } = canvas;
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
      const maxRadius = Math.min(width, height) / 2 - 10;
      const scaleFactor = maxRadius / totalRadius;

      const colors = getRingColors();
      const barkColor = getBarkColor();
      const ringsToShow = Math.ceil(growths.length * progress);

      // Draw rings from outside in (so inner rings overlay outer)
      // First calculate cumulative radii
      const cumulativeRadii = [0];
      for (let i = 0; i < growths.length; i++) {
        cumulativeRadii.push(cumulativeRadii[i] + growths[i]);
      }

      // Draw bark (outermost)
      const outerBarkRadius = cumulativeRadii[ringsToShow] * scaleFactor + 3;
      ctx.fillStyle = barkColor;
      ctx.beginPath();
      ctx.arc(centerX, centerY, outerBarkRadius, 0, Math.PI * 2);
      ctx.fill();

      // Draw rings from outermost to innermost
      for (let i = ringsToShow - 1; i >= 0; i--) {
        const outerRadius = cumulativeRadii[i + 1] * scaleFactor;
        const growth = growths[i];
        const maxNoise = 0.5 * growth * scaleFactor;
        const harmonics = noiseData[i];
        const color = colors[i % colors.length];

        // Draw filled ring with organic shape
        ctx.fillStyle = color;
        ctx.beginPath();

        const numPoints = 120;
        for (let j = 0; j <= numPoints; j++) {
          const theta = (j / numPoints) * Math.PI * 2;
          const noise = evaluateNoise(harmonics, theta, maxNoise);
          const r = outerRadius + noise;
          const x = centerX + r * Math.cos(theta);
          const y = centerY + r * Math.sin(theta);
          if (j === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.closePath();
        ctx.fill();

        // Draw ring boundary line
        ctx.strokeStyle = barkColor;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }

      // Draw center point (pith)
      ctx.fillStyle = barkColor;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 2, 0, Math.PI * 2);
      ctx.fill();

      // Draw zoom indicator rectangle (horizontal slice through right half only)
      if (progress >= 1) {
        const indicatorColor = currentTheme === "dark" ? "#ff6b6b" : "#e63946";
        const indicatorHeight = 12;
        const indicatorWidth = outerBarkRadius + 3; // Only right half

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

        // Draw radius label above the indicator
        const totalRadiusValue = growths.reduce((sum, g) => sum + g, 0);
        ctx.fillStyle = currentTheme === "dark" ? "#ffffff" : "#000000";
        ctx.font = "bold 11px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillText(
          `Radius = ${totalRadiusValue.toFixed(1)} mm`,
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

      const ctx = canvas.getContext("2d");
      const { width, height } = canvas;

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
      const scaleFactor = (width - 40) / totalWidth;

      const centerY = height / 2;
      const ringHeight = height - 40; // More padding for year labels

      const colors = getRingColors();
      const barkColor = getBarkColor();

      const ringsToShow = Math.ceil(growths.length * progress);
      let currentX = 20;

      for (let i = 0; i < ringsToShow; i++) {
        const ringWidth = growths[i] * scaleFactor;
        const color = colors[i % colors.length];

        // Add organic edge variation using the same noise
        const harmonics = noiseData[i];
        const maxNoise = 0.5 * growths[i] * scaleFactor;

        // Draw ring with wavy right edge
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(currentX, centerY - ringHeight / 2);

        // Right edge with noise
        const numPoints = 40;
        for (let j = 0; j <= numPoints; j++) {
          const t = j / numPoints;
          const y = centerY - ringHeight / 2 + t * ringHeight;
          // Map y position to theta (vertical position maps to angle)
          const theta = t * Math.PI;
          const noise = evaluateNoise(harmonics, theta, maxNoise * 0.3);
          const x = currentX + ringWidth + noise;
          ctx.lineTo(x, y);
        }

        ctx.lineTo(currentX, centerY + ringHeight / 2);
        ctx.closePath();
        ctx.fill();

        // Draw ring boundary
        ctx.strokeStyle = barkColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let j = 0; j <= numPoints; j++) {
          const t = j / numPoints;
          const y = centerY - ringHeight / 2 + t * ringHeight;
          const theta = t * Math.PI;
          const noise = evaluateNoise(harmonics, theta, maxNoise * 0.3);
          const x = currentX + ringWidth + noise;
          if (j === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();

        currentX += ringWidth;
      }

      // Draw outer bark
      ctx.fillStyle = barkColor;
      ctx.fillRect(currentX, centerY - ringHeight / 2, 5, ringHeight);

      // Draw year labels
      if (growths.length > 1 && progress >= 1) {
        ctx.fillStyle = currentTheme === "dark" ? "#ffffff" : "#000000";
        ctx.font = "11px sans-serif";
        ctx.textBaseline = "top";

        // Year 1 - left aligned at left edge of first ring
        ctx.textAlign = "left";
        ctx.fillText("Year 1", 20, centerY + ringHeight / 2 + 4);

        // Last year - right aligned at right edge of last ring
        ctx.textAlign = "right";
        ctx.fillText(
          `Year ${growths.length}`,
          currentX,
          centerY + ringHeight / 2 + 4,
        );
      }

      // Draw zoom indicator border
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

  // Combined draw function
  const drawAll = useCallback(
    (growths, noiseData, progress = 1) => {
      drawCrossSection(growths, noiseData, progress);
      drawZoomView(growths, noiseData, progress);
    },
    [drawCrossSection, drawZoomView],
  );

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

    initCanvas(crossSectionCanvasRef);
    initCanvas(zoomCanvasRef);
    drawAll(yearlyGrowths, noiseSeeds, animationProgress);
  }, [currentTheme, drawAll, yearlyGrowths, noiseSeeds, animationProgress]);

  const runSimulation = useCallback(() => {
    if (minGrowth >= maxGrowth) {
      alert("Minimum growth must be less than maximum growth");
      return;
    }

    setIsGrowing(true);
    setAnimationProgress(0);

    // Generate random growths and noise seeds for each year
    const growths = [];
    const noiseData = [];
    for (let i = 0; i < numYears; i++) {
      let growth;
      if (distributionType === "Uniform") {
        // Uniform random in [min, max]
        growth = Math.random() * (maxGrowth - minGrowth) + minGrowth;
      } else {
        // Binary: 50/50 choice between min and max
        growth = Math.random() < 0.5 ? minGrowth : maxGrowth;
      }
      growths.push(growth);
      noiseData.push(generateNoiseSeed());
    }

    setYearlyGrowths(growths);
    setNoiseSeeds(noiseData);

    const total = growths.reduce((sum, g) => sum + g, 0);
    setTotalGrowth(total);

    // Expected value is the same for both distributions: (min + max) / 2 per year
    const expectedPerYear = (minGrowth + maxGrowth) / 2;
    const expectedTotal = expectedPerYear * numYears;

    // Variance depends on distribution type
    let variancePerYear;
    if (distributionType === "Uniform") {
      // Uniform: variance = (max - min)^2 / 12
      variancePerYear = Math.pow(maxGrowth - minGrowth, 2) / 12;
    } else {
      // Binary (Bernoulli-like): variance = (max - min)^2 / 4
      variancePerYear = Math.pow(maxGrowth - minGrowth, 2) / 4;
    }
    const totalVariance = variancePerYear * numYears;
    const stdDev = Math.sqrt(totalVariance);

    setStatistics({
      expectedTotal,
      stdDev,
    });

    let frame = 0;
    const totalFrames = 90; // 1.5 seconds

    const animate = () => {
      frame++;
      const progress = Math.min(frame / totalFrames, 1);
      setAnimationProgress(progress);
      drawAll(growths, noiseData, progress);

      if (frame < totalFrames) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsGrowing(false);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  }, [minGrowth, maxGrowth, numYears, distributionType, drawAll]);

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

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
        {totalGrowth !== null && statistics ? (
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
              lineHeight: "1.4",
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
        disabled={isGrowing}
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
