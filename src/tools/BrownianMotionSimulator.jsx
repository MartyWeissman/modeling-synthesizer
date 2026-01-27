// src/tools/BrownianMotionSimulator.jsx

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  GridSliderHorizontal,
  GridButton,
  GridDisplay,
  GridWindow,
} from "../components/grid";
import ToolContainer from "../components/ui/ToolContainer";
import Equation from "../components/Equation";
import { useTheme } from "../hooks/useTheme";
import { CELL_SIZE } from "../themes";

const BrownianMotionSimulator = () => {
  const { theme, currentTheme } = useTheme();

  // Physical constants
  const BOLTZMANN = 1.38e-23; // Boltzmann constant in J/K
  const TIME_STEP = 0.05; // seconds per simulation step

  // UI State - React state for controls
  const [uiParams, setUiParams] = useState({
    radius: 0.5, // particle radius in microns
    viscosity: 1.0, // viscosity in centiPoise
    temperature: 25, // temperature in Celsius
  });

  const [isSimulating, setIsSimulating] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [showExpectation, setShowExpectation] = useState(false);

  // Ref to track showExpectation for animation loop (avoids stale closure)
  const showExpectationRef = useRef(false);

  // Initialize table with 11 empty rows (t=0 to t=10)
  const emptyTableData = () =>
    Array.from({ length: 11 }, (_, i) => ({
      time: i,
      x: null,
      y: null,
      d2: null,
    }));

  const [tableData, setTableData] = useState(emptyTableData);

  // Canvas ref for drawing inside GridWindow
  const canvasRef = useRef(null);

  // Animation state - pure refs, never cause React re-renders
  const animationStateRef = useRef({
    position: { x: 0, y: 0 },
    trajectory: [{ x: 0, y: 0 }],
    time: 0,
    animationId: null,
    isRunning: false,
    params: { ...uiParams },
    recordedData: emptyTableData(),
  });

  // Update animation parameters when UI changes
  useEffect(() => {
    animationStateRef.current.params = { ...uiParams };
  }, [uiParams]);

  // Sync showExpectation ref with state
  useEffect(() => {
    showExpectationRef.current = showExpectation;
  }, [showExpectation]);

  // Calculate step size (standard deviation of displacement) using Einstein-Stokes
  // D = kT / (6 * pi * eta * r), then sigma = sqrt(2 * D * dt)
  const calculateStepSize = useCallback(
    (temp, viscosity, radius) => {
      const tempKelvin = temp + 273.15;
      const viscosityPascalSec = viscosity * 0.001; // centiPoise to Pascal-seconds
      const radiusMeters = radius * 1e-6; // microns to meters

      // D in m^2/s
      const D =
        (BOLTZMANN * tempKelvin) /
        (6 * Math.PI * viscosityPascalSec * radiusMeters);

      // Standard deviation of displacement in microns
      const sigma = Math.sqrt(2 * D * TIME_STEP) * 1e6;

      return sigma;
    },
    [TIME_STEP],
  );

  // Generate a random number from normal distribution (Box-Muller transform)
  const randomNormal = useCallback(() => {
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }, []);

  // Draw the particle and trajectory on canvas
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Background
    ctx.fillStyle = currentTheme === "dark" ? "#1f2937" : "#f8fafc";
    ctx.fillRect(0, 0, width, height);

    // Scale: 15 microns visible radius
    const pixelsPerMicron = Math.min(width, height) / 2 / 15;

    // Draw grid lines (5 micron spacing)
    const gridSpacing = 5 * pixelsPerMicron;
    ctx.strokeStyle =
      currentTheme === "dark"
        ? "rgba(255, 255, 255, 0.15)"
        : "rgba(0, 0, 0, 0.1)";
    ctx.lineWidth = 1;

    // Vertical grid lines
    for (let x = centerX % gridSpacing; x < width; x += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Horizontal grid lines
    for (let y = centerY % gridSpacing; y < height; y += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw axes through center
    ctx.strokeStyle =
      currentTheme === "dark"
        ? "rgba(255, 255, 255, 0.4)"
        : "rgba(0, 0, 0, 0.3)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(centerX, 0);
    ctx.lineTo(centerX, height);
    ctx.stroke();

    // Convert position (microns) to pixels
    const toPixelX = (x) => centerX + x * pixelsPerMicron;
    const toPixelY = (y) => centerY - y * pixelsPerMicron;

    const state = animationStateRef.current;

    // Draw trajectory
    if (state.trajectory.length > 1) {
      ctx.strokeStyle =
        currentTheme === "dark"
          ? "rgba(156, 163, 175, 0.7)"
          : "rgba(107, 114, 128, 0.7)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(
        toPixelX(state.trajectory[0].x),
        toPixelY(state.trajectory[0].y),
      );
      for (let i = 1; i < state.trajectory.length; i++) {
        ctx.lineTo(
          toPixelX(state.trajectory[i].x),
          toPixelY(state.trajectory[i].y),
        );
      }
      ctx.stroke();
    }

    // Draw particle with sphere gradient (smaller, no border)
    const particleX = toPixelX(state.position.x);
    const particleY = toPixelY(state.position.y);
    const particlePixelRadius = Math.max(
      2.5,
      state.params.radius * pixelsPerMicron * 0.4,
    );

    // Create radial gradient for sphere effect
    const gradient = ctx.createRadialGradient(
      particleX - particlePixelRadius * 0.3,
      particleY - particlePixelRadius * 0.3,
      0,
      particleX,
      particleY,
      particlePixelRadius,
    );

    if (currentTheme === "unicorn") {
      gradient.addColorStop(0, "#f9a8d4");
      gradient.addColorStop(0.5, "#ec4899");
      gradient.addColorStop(1, "#9d174d");
    } else if (currentTheme === "dark") {
      gradient.addColorStop(0, "#fdba74");
      gradient.addColorStop(0.5, "#f97316");
      gradient.addColorStop(1, "#9a3412");
    } else {
      gradient.addColorStop(0, "#fdba74");
      gradient.addColorStop(0.5, "#ea580c");
      gradient.addColorStop(1, "#7c2d12");
    }

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(particleX, particleY, particlePixelRadius, 0, 2 * Math.PI);
    ctx.fill();

    // Draw expectation circle if enabled
    // E(d²) = (k_B * T) / (3 * π * r * η) * t
    // So expected d = sqrt(E(d²))
    if (showExpectationRef.current && state.time > 0) {
      const { temperature, viscosity, radius } = state.params;
      const tempKelvin = temperature + 273.15;
      const viscosityPascalSec = viscosity * 0.001;
      const radiusMeters = radius * 1e-6;

      // E(d²) in m², then convert to μm²
      const expectedD2_m2 =
        ((BOLTZMANN * tempKelvin) /
          (3 * Math.PI * radiusMeters * viscosityPascalSec)) *
        state.time;
      const expectedD2_um2 = expectedD2_m2 * 1e12; // Convert m² to μm²
      const expectedD_um = Math.sqrt(expectedD2_um2);

      const expectedRadiusPixels = expectedD_um * pixelsPerMicron;

      ctx.strokeStyle =
        currentTheme === "unicorn"
          ? "rgba(16, 185, 129, 0.8)"
          : currentTheme === "dark"
            ? "rgba(74, 222, 128, 0.8)"
            : "rgba(22, 163, 74, 0.8)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(centerX, centerY, expectedRadiusPixels, 0, 2 * Math.PI);
      ctx.stroke();
    }

    // Draw scale arrow (5 microns) - offset to align with grid square, within circular viewport
    const scaleBarLength = 5 * pixelsPerMicron;
    const scaleOffsetX = 2.5 * pixelsPerMicron; // Shift right to center under a grid square
    const scaleArrowX = centerX - scaleBarLength / 2 + scaleOffsetX;
    const scaleArrowY = centerY + (Math.min(width, height) / 2) * 0.7; // 70% down from center
    const arrowHeadSize = 5;

    ctx.strokeStyle = currentTheme === "dark" ? "#d1d5db" : "#374151";
    ctx.fillStyle = currentTheme === "dark" ? "#d1d5db" : "#374151";
    ctx.lineWidth = 2;

    // Main line
    ctx.beginPath();
    ctx.moveTo(scaleArrowX, scaleArrowY);
    ctx.lineTo(scaleArrowX + scaleBarLength, scaleArrowY);
    ctx.stroke();

    // Left arrowhead
    ctx.beginPath();
    ctx.moveTo(scaleArrowX, scaleArrowY);
    ctx.lineTo(scaleArrowX + arrowHeadSize, scaleArrowY - arrowHeadSize);
    ctx.lineTo(scaleArrowX + arrowHeadSize, scaleArrowY + arrowHeadSize);
    ctx.closePath();
    ctx.fill();

    // Right arrowhead
    ctx.beginPath();
    ctx.moveTo(scaleArrowX + scaleBarLength, scaleArrowY);
    ctx.lineTo(
      scaleArrowX + scaleBarLength - arrowHeadSize,
      scaleArrowY - arrowHeadSize,
    );
    ctx.lineTo(
      scaleArrowX + scaleBarLength - arrowHeadSize,
      scaleArrowY + arrowHeadSize,
    );
    ctx.closePath();
    ctx.fill();

    // Scale label - centered beneath the arrow
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("5 μm", scaleArrowX + scaleBarLength / 2, scaleArrowY + 15);
  }, [currentTheme]);

  // Animation loop
  const animationLoop = useCallback(() => {
    const state = animationStateRef.current;
    if (!state.isRunning) return;

    const { temperature, viscosity, radius } = state.params;

    // Calculate step size
    const sigma = calculateStepSize(temperature, viscosity, radius);

    // Random displacement using normal distribution
    const dx = randomNormal() * sigma;
    const dy = randomNormal() * sigma;

    // Update position
    state.position.x += dx;
    state.position.y += dy;

    // Add to trajectory (keep last 2000 points)
    state.trajectory.push({ x: state.position.x, y: state.position.y });
    if (state.trajectory.length > 2000) {
      state.trajectory.shift();
    }

    // Update time
    state.time += TIME_STEP;

    // Record data at integer second intervals (0, 1, 2, ... 10)
    const currentSecond = Math.floor(state.time);
    const prevSecond = Math.floor(state.time - TIME_STEP);
    if (currentSecond !== prevSecond && currentSecond <= 10) {
      // Update the row for this second
      state.recordedData[currentSecond] = {
        time: currentSecond,
        x: state.position.x,
        y: state.position.y,
        d2: state.position.x ** 2 + state.position.y ** 2,
      };
    }

    // Update React state periodically for UI updates
    if (
      Math.floor(state.time * 20) !== Math.floor((state.time - TIME_STEP) * 20)
    ) {
      setCurrentTime(state.time);
      setTableData([...state.recordedData]);
    }

    // Stop after 10 seconds
    if (state.time >= 10) {
      state.isRunning = false;
      setIsSimulating(false);
      setCurrentTime(state.time);
      setTableData([...state.recordedData]);
      drawCanvas();
      return;
    }

    // Draw
    drawCanvas();

    state.animationId = requestAnimationFrame(animationLoop);
  }, [calculateStepSize, randomNormal, drawCanvas, TIME_STEP]);

  // Start/Stop simulation
  const toggleSimulation = useCallback(() => {
    const state = animationStateRef.current;

    if (state.isRunning) {
      // Stop
      state.isRunning = false;
      setIsSimulating(false);
      if (state.animationId) {
        cancelAnimationFrame(state.animationId);
        state.animationId = null;
      }
    } else {
      // Start fresh
      state.position = { x: 0, y: 0 };
      state.trajectory = [{ x: 0, y: 0 }];
      state.time = 0;
      // Initialize with t=0 data, rest blank
      const initialData = emptyTableData();
      initialData[0] = { time: 0, x: 0, y: 0, d2: 0 };
      state.recordedData = initialData;
      state.isRunning = true;
      setIsSimulating(true);
      setCurrentTime(0);
      setTableData(initialData);
      animationLoop();
    }
  }, [animationLoop]);

  // Reset simulation
  const resetSimulation = useCallback(() => {
    const state = animationStateRef.current;

    // Stop animation
    state.isRunning = false;
    setIsSimulating(false);
    if (state.animationId) {
      cancelAnimationFrame(state.animationId);
      state.animationId = null;
    }

    // Reset state
    state.position = { x: 0, y: 0 };
    state.trajectory = [{ x: 0, y: 0 }];
    state.time = 0;
    state.recordedData = emptyTableData();

    setCurrentTime(0);
    setTableData(emptyTableData());

    drawCanvas();
  }, [drawCanvas]);

  // Update parameter helper
  const updateParam = useCallback((param, value) => {
    setUiParams((prev) => ({ ...prev, [param]: value }));
  }, []);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      // Size canvas to fill GridWindow (6x6 grid units minus padding)
      const size = 6 * CELL_SIZE - 32; // Account for GridWindow padding
      canvas.width = size;
      canvas.height = size;
      drawCanvas();
    }
  }, [drawCanvas]);

  // Redraw when theme changes
  useEffect(() => {
    drawCanvas();
  }, [currentTheme, drawCanvas]);

  // Redraw when showExpectation changes (for when simulation is stopped)
  useEffect(() => {
    if (!animationStateRef.current.isRunning) {
      drawCanvas();
    }
  }, [showExpectation, drawCanvas]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const state = animationStateRef.current;
      if (state.animationId) {
        cancelAnimationFrame(state.animationId);
      }
    };
  }, []);

  // Table styles
  const tableStyles = {
    width: "100%",
    borderCollapse: "collapse",
    fontFamily: "monospace",
    fontSize: "12px",
  };

  const thStyles = {
    padding: "4px 8px",
    borderBottom: `2px solid ${currentTheme === "dark" ? "#4b5563" : "#d1d5db"}`,
    textAlign: "right",
    fontWeight: "bold",
    backgroundColor: currentTheme === "dark" ? "#374151" : "#f3f4f6",
  };

  const tdStyles = {
    padding: "3px 8px",
    borderBottom: `1px solid ${currentTheme === "dark" ? "#374151" : "#e5e7eb"}`,
    textAlign: "right",
  };

  const emptyTdStyles = {
    ...tdStyles,
    color: currentTheme === "dark" ? "#4b5563" : "#d1d5db",
  };

  return (
    <ToolContainer
      title="Brownian Motion Simulator"
      canvasWidth={11}
      canvasHeight={7}
    >
      {/* Circular viewport for Brownian motion */}
      <GridWindow x={0} y={0} w={6} h={6} variant="circular" theme={theme}>
        <canvas
          ref={canvasRef}
          style={{
            width: "100%",
            height: "100%",
          }}
        />
      </GridWindow>

      {/* Parameter Controls */}
      {/* Particle Radius: 0.1 to 2 μm, default 1.0 at slider value 47.4 */}
      <GridSliderHorizontal
        x={6}
        y={0}
        w={3}
        h={1}
        value={((uiParams.radius - 0.1) / 1.9) * 100}
        onChange={(value) => updateParam("radius", 0.1 + (value / 100) * 1.9)}
        variant="unipolar"
        label={`Particle Radius (r): ${uiParams.radius.toFixed(2)} μm`}
        tooltip="Particle radius in microns (0.1 - 2 μm)"
        theme={theme}
      />

      {/* Viscosity: 0.2 to 5 cP, default 1.0 at slider value 16.7 */}
      <GridSliderHorizontal
        x={6}
        y={1}
        w={3}
        h={1}
        value={((uiParams.viscosity - 0.2) / 4.8) * 100}
        onChange={(value) =>
          updateParam("viscosity", 0.2 + (value / 100) * 4.8)
        }
        variant="unipolar"
        label={`Viscosity (η): ${uiParams.viscosity.toFixed(2)} cP`}
        tooltip="Fluid viscosity in centiPoise (0.2 - 5 cP, water ≈ 1 cP)"
        theme={theme}
      />

      {/* Temperature: 0 to 80 °C, default 25 at slider value 31.25 */}
      <GridSliderHorizontal
        x={6}
        y={2}
        w={3}
        h={1}
        value={(uiParams.temperature / 80) * 100}
        onChange={(value) => updateParam("temperature", (value / 100) * 80)}
        variant="unipolar"
        label={`Temperature (T): ${uiParams.temperature.toFixed(0)} °C`}
        tooltip="Temperature in Celsius (0 - 80 °C)"
        theme={theme}
      />

      {/* Control Buttons */}
      <GridButton
        x={9}
        y={0}
        w={1}
        h={1}
        onPress={toggleSimulation}
        variant={isSimulating ? "function" : "default"}
        theme={theme}
      >
        <div style={{ textAlign: "center", lineHeight: "1.1" }}>
          <div>{isSimulating ? "Stop!" : "Diffuse!"}</div>
        </div>
      </GridButton>

      <GridButton
        x={10}
        y={0}
        w={1}
        h={1}
        onPress={resetSimulation}
        variant="default"
        theme={theme}
      >
        <div style={{ textAlign: "center", lineHeight: "1.1" }}>
          <div>Reset</div>
        </div>
      </GridButton>

      {/* Current Position Display */}
      <GridDisplay
        x={9}
        y={1}
        w={2}
        h={2}
        variant="info"
        align="left"
        fontSize="small"
        theme={theme}
      >
        <div style={{ padding: "4px", fontSize: "0.85em" }}>
          <div style={{ fontWeight: "bold", marginBottom: "4px" }}>
            Position
          </div>
          <div>t = {currentTime.toFixed(2)} s</div>
          <div>x = {animationStateRef.current.position.x.toFixed(2)} μm</div>
          <div>y = {animationStateRef.current.position.y.toFixed(2)} μm</div>
          <div style={{ marginTop: "4px" }}>
            d² ={" "}
            {(
              animationStateRef.current.position.x ** 2 +
              animationStateRef.current.position.y ** 2
            ).toFixed(2)}{" "}
            μm²
          </div>
        </div>
      </GridDisplay>

      {/* Data Table - now starts at y=3 with h=4 */}
      <GridDisplay
        x={6}
        y={3}
        w={5}
        h={4}
        variant="info"
        align="left"
        fontSize="small"
        theme={theme}
        tooltip="Select and copy (Cmd+C) to paste into a spreadsheet"
      >
        <div
          style={{
            padding: "4px",
            height: "100%",
            overflow: "auto",
          }}
        >
          <table style={tableStyles}>
            <thead>
              <tr>
                <th style={thStyles}>t (s)</th>
                <th style={thStyles}>x (μm)</th>
                <th style={thStyles}>y (μm)</th>
                <th style={thStyles}>d² (μm²)</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((row, idx) => (
                <tr key={idx}>
                  <td style={tdStyles}>{row.time}</td>
                  <td style={row.x !== null ? tdStyles : emptyTdStyles}>
                    {row.x !== null ? row.x.toFixed(3) : "—"}
                  </td>
                  <td style={row.y !== null ? tdStyles : emptyTdStyles}>
                    {row.y !== null ? row.y.toFixed(3) : "—"}
                  </td>
                  <td style={row.d2 !== null ? tdStyles : emptyTdStyles}>
                    {row.d2 !== null ? row.d2.toFixed(3) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GridDisplay>

      {/* Expected displacement equation */}
      <GridDisplay
        x={0}
        y={6}
        w={4}
        h={1}
        variant="info"
        align="center"
        theme={theme}
      >
        <div style={{ paddingTop: "20px" }}>
          <Equation
            name="brownian-expected-displacement"
            size="small"
            style={{ fontSize: "0.55em" }}
          />
        </div>
      </GridDisplay>

      {/* Toggle expectation circle */}
      <GridButton
        x={4}
        y={6}
        w={2}
        h={1}
        type="toggle"
        active={showExpectation}
        onToggle={setShowExpectation}
        variant="function"
        theme={theme}
      >
        <div
          style={{ textAlign: "center", lineHeight: "1.1", fontSize: "12px" }}
        >
          <div>{showExpectation ? "Hide" : "Show"}</div>
          <div>Expectation</div>
        </div>
      </GridButton>
    </ToolContainer>
  );
};

export default BrownianMotionSimulator;
