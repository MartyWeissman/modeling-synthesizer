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
import { useAnimationLoop } from "../hooks/useAnimationLoop";
import { setupCanvas } from "../utils/canvas";
import { randomNormal } from "../utils/random";
import { stokesEinsteinD } from "./stochasticToolsMath";

// Simulation timing
const TIME_STEP = 0.05; // simulated seconds per step
const STEPS_PER_SECOND = Math.round(1 / TIME_STEP); // 20 steps per simulated second
const TOTAL_STEPS = 10 * STEPS_PER_SECOND; // a run is 10 simulated seconds
// Steps per real second: one step per frame at 60 Hz, as before, so a run
// still takes 200/60 ≈ 3.3 s at any refresh rate.
const STEPS_PER_REAL_SECOND = 60;

// View: at least 15 μm from the center to the edge; doubles (30, 60, ... μm)
// whenever the particle would otherwise leave the viewport
const BASE_VIEW_RADIUS = 15;

// Expected squared displacement in 2-D after t seconds: E(d²) = 4Dt
// (= 2 k_B T t / (3π r η)), in μm²
const expectedD2 = (params, t) =>
  4 * stokesEinsteinD(params.temperature, params.viscosity, params.radius) * t;

const BrownianMotionSimulator = () => {
  const { theme, currentTheme } = useTheme();

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
    step: 0, // integer step counter (time = step · TIME_STEP)
    stepAccumulator: 0, // fractional steps carried between frames
    viewRadius: BASE_VIEW_RADIUS,
    isRunning: false,
    params: { ...uiParams }, // parameters used by the current/last run
    recordedData: emptyTableData(),
  });

  // state.params is set when a run starts (and on Reset), so the trajectory,
  // table and expectation circle always belong to one set of parameters.

  // Sync showExpectation ref with state
  useEffect(() => {
    showExpectationRef.current = showExpectation;
  }, [showExpectation]);

  // Standard deviation (μm) of each coordinate's displacement in one step:
  // σ = √(2 D Δt), with D from Stokes–Einstein, D = k_B T / (6π η r)
  const calculateStepSize = (temp, viscosity, radius) =>
    Math.sqrt(2 * stokesEinsteinD(temp, viscosity, radius) * TIME_STEP);

  // Draw the particle and trajectory on canvas
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { ctx, width, height } = setupCanvas(canvas);
    const centerX = width / 2;
    const centerY = height / 2;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Background
    ctx.fillStyle = currentTheme === "dark" ? "#1f2937" : "#f8fafc";
    ctx.fillRect(0, 0, width, height);

    const state = animationStateRef.current;

    // Scale: viewRadius microns from the center to the edge (15 μm, or
    // larger if the particle has wandered farther)
    const viewRadius = state.viewRadius;
    const pixelsPerMicron = Math.min(width, height) / 2 / viewRadius;
    const gridMicrons = viewRadius / 3; // 5 μm at the default scale

    // Draw grid lines (gridMicrons spacing)
    const gridSpacing = gridMicrons * pixelsPerMicron;
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

    // Draw expectation circle if enabled: radius √E(d²), where in 2-D
    // E(d²) = 4Dt = 2 k_B T t / (3π r η)
    if (showExpectationRef.current && state.step > 0) {
      const expectedD_um = Math.sqrt(
        expectedD2(state.params, state.step * TIME_STEP),
      );

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

    // Draw scale arrow (one grid square) - offset to align with a grid square, within circular viewport
    const scaleBarLength = gridMicrons * pixelsPerMicron;
    const scaleOffsetX = scaleBarLength / 2; // Shift right to center under a grid square
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
    ctx.fillText(
      `${gridMicrons} μm`,
      scaleArrowX + scaleBarLength / 2,
      scaleArrowY + 15,
    );
  }, [currentTheme]);

  // Zoom out (15 → 30 → 60 ... μm) so the particle, and the expectation
  // circle when shown, stay inside the circular viewport
  const updateViewRadius = () => {
    const state = animationStateRef.current;
    let extent = 0;
    for (const p of state.trajectory) {
      extent = Math.max(extent, Math.hypot(p.x, p.y));
    }
    if (showExpectationRef.current && state.step > 0) {
      extent = Math.max(
        extent,
        Math.sqrt(expectedD2(state.params, state.step * TIME_STEP)),
      );
    }
    let radius = BASE_VIEW_RADIUS;
    // The window shows a circle of about 0.9 × the canvas half-width; keep a
    // margin inside it
    while (extent > 0.8 * radius && radius < 1e6) radius *= 2;
    state.viewRadius = radius;
  };

  // Advance one step of 0.05 s: each coordinate moves by a normal random
  // amount with SD σ = √(2DΔt)
  const advanceStep = () => {
    const state = animationStateRef.current;
    const { temperature, viscosity, radius } = state.params;
    const sigma = calculateStepSize(temperature, viscosity, radius);

    state.position.x += randomNormal(0, sigma);
    state.position.y += randomNormal(0, sigma);
    state.trajectory.push({ x: state.position.x, y: state.position.y });
    state.step += 1;

    // Record data at whole seconds (integer step counter: no float drift)
    if (state.step % STEPS_PER_SECOND === 0) {
      const second = state.step / STEPS_PER_SECOND;
      if (second <= 10) {
        state.recordedData[second] = {
          time: second,
          x: state.position.x,
          y: state.position.y,
          d2: state.position.x ** 2 + state.position.y ** 2,
        };
      }
    }
  };

  // Animation loop: advances by real elapsed time (60 steps per real second)
  const loop = useAnimationLoop((dt) => {
    const state = animationStateRef.current;
    if (!state.isRunning) return false;

    state.stepAccumulator += dt * STEPS_PER_REAL_SECOND;
    let steps = Math.floor(state.stepAccumulator);
    state.stepAccumulator -= steps;
    steps = Math.min(steps, TOTAL_STEPS - state.step);
    for (let i = 0; i < steps; i++) advanceStep();

    if (steps > 0) {
      setCurrentTime(state.step * TIME_STEP);
      setTableData([...state.recordedData]);
    }

    updateViewRadius();
    drawCanvas();

    // Stop after 10 seconds
    if (state.step >= TOTAL_STEPS) {
      state.isRunning = false;
      setIsSimulating(false);
      return false;
    }
    return true;
  });

  // Start/Stop simulation
  const toggleSimulation = useCallback(() => {
    const state = animationStateRef.current;

    if (state.isRunning) {
      // Stop
      state.isRunning = false;
      setIsSimulating(false);
      loop.stop();
    } else {
      // Start fresh, with the parameters locked for the whole run
      state.params = { ...uiParams };
      state.position = { x: 0, y: 0 };
      state.trajectory = [{ x: 0, y: 0 }];
      state.step = 0;
      state.stepAccumulator = 0;
      state.viewRadius = BASE_VIEW_RADIUS;
      // Initialize with t=0 data, rest blank
      const initialData = emptyTableData();
      initialData[0] = { time: 0, x: 0, y: 0, d2: 0 };
      state.recordedData = initialData;
      state.isRunning = true;
      setIsSimulating(true);
      setCurrentTime(0);
      setTableData(initialData);
      loop.start();
    }
  }, [loop, uiParams]);

  // Reset simulation
  const resetSimulation = useCallback(() => {
    const state = animationStateRef.current;

    // Stop animation
    state.isRunning = false;
    setIsSimulating(false);
    loop.stop();

    // Reset state
    state.position = { x: 0, y: 0 };
    state.trajectory = [{ x: 0, y: 0 }];
    state.step = 0;
    state.stepAccumulator = 0;
    state.viewRadius = BASE_VIEW_RADIUS;
    state.params = { ...uiParams };
    state.recordedData = emptyTableData();

    setCurrentTime(0);
    setTableData(emptyTableData());

    drawCanvas();
  }, [drawCanvas, loop, uiParams]);

  // Update parameter helper. The parameters are locked during a run, so one
  // trajectory always has a single diffusion coefficient D.
  const updateParam = useCallback((param, value) => {
    if (animationStateRef.current.isRunning) return;
    setUiParams((prev) => ({ ...prev, [param]: value }));
  }, []);

  // Redraw when the theme, the sliders (between runs) or the expectation
  // toggle change; the animation loop draws while running.
  useEffect(() => {
    if (!animationStateRef.current.isRunning) {
      updateViewRadius();
      drawCanvas();
    }
  });

  // Diffusion coefficient of the current run (or of the slider settings
  // between runs)
  const displayParams = isSimulating
    ? animationStateRef.current.params
    : uiParams;
  const displayD = stokesEinsteinD(
    displayParams.temperature,
    displayParams.viscosity,
    displayParams.radius,
  );

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
      {/* Particle Radius: 0.1 to 2 μm in steps of 0.01, default 0.5 */}
      <GridSliderHorizontal
        x={6}
        y={0}
        w={3}
        h={1}
        min={0.1}
        max={2}
        step={0.01}
        value={uiParams.radius}
        onChange={(value) => updateParam("radius", Math.round(value * 100) / 100)}
        variant="unipolar"
        label={`Particle Radius (r): ${uiParams.radius.toFixed(2)} μm`}
        tooltip="Particle radius in microns (0.1 - 2 μm)"
        theme={theme}
      />

      {/* Viscosity: 0.2 to 5 cP in steps of 0.01, default 1.0 */}
      <GridSliderHorizontal
        x={6}
        y={1}
        w={3}
        h={1}
        min={0.2}
        max={5}
        step={0.01}
        value={uiParams.viscosity}
        onChange={(value) =>
          updateParam("viscosity", Math.round(value * 100) / 100)
        }
        variant="unipolar"
        label={`Viscosity (η): ${uiParams.viscosity.toFixed(2)} cP`}
        tooltip="Fluid viscosity in centiPoise (0.2 - 5 cP, water ≈ 1 cP)"
        theme={theme}
      />

      {/* Temperature: 0 to 80 °C in steps of 1, default 25 */}
      <GridSliderHorizontal
        x={6}
        y={2}
        w={3}
        h={1}
        min={0}
        max={80}
        step={1}
        value={uiParams.temperature}
        onChange={(value) => updateParam("temperature", Math.round(value))}
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
          <div
            style={{ marginTop: "4px" }}
            title="Diffusion coefficient D = k_B T / (6π η r) for this run"
          >
            D = {displayD.toFixed(3)} μm²/s
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
