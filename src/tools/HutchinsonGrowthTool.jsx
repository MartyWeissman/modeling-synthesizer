// src/tools/HutchinsonGrowthTool.jsx

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  GridSliderHorizontal,
  GridButton,
  GridGraph,
  GridDisplay,
} from "../components/grid";
import ToolContainer from "../components/ui/ToolContainer";
import Equation from "../components/Equation";
import { useTheme } from "../hooks/useTheme";

const HutchinsonGrowthTool = () => {
  const { theme, currentTheme } = useTheme();

  // UI State
  const [uiParams, setUiParams] = useState({
    k: 100, // Carrying capacity
    beta: 0.1, // Birth rate
    tau: 10, // Time delay
    P0: 50, // Initial population
  });
  const [isAnimating, setIsAnimating] = useState(false);
  const [redrawTrigger, setRedrawTrigger] = useState(0);

  // Canvas ref
  const canvasRef = useRef(null);

  // Animation state
  const animationStateRef = useRef({
    time: 0,
    population: 50,
    history: [], // Store [time, population] pairs
    animationId: null,
    isRunning: false,
    params: { ...uiParams },
  });

  // Sync UI to animation
  useEffect(() => {
    animationStateRef.current.params = { ...uiParams };
  }, [uiParams]);

  // Update parameter helper
  const updateParam = useCallback((key, value) => {
    setUiParams((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Get past population value for delay differential equation
  const getPastValue = useCallback(
    (history, currentTime, delay, initialValue) => {
      const targetTime = currentTime - delay;

      if (targetTime <= 0) {
        return initialValue;
      }

      // Find the closest historical value
      for (let i = history.length - 1; i >= 0; i--) {
        if (history[i][0] <= targetTime) {
          return history[i][1];
        }
      }

      return initialValue;
    },
    [],
  );

  // Hutchinson delay differential equation: P'(t) = β P(t) (1 - P(t-τ)/k)
  const hutchinsonDerivative = useCallback((P, PDelayed, beta, k) => {
    return beta * P * (1 - PDelayed / k);
  }, []);

  // RK4 integration step
  const rk4Step = useCallback(
    (P, t, dt, history, params) => {
      const { beta, k, tau, P0 } = params;

      const PDelayed = getPastValue(history, t, tau, P0);
      const k1 = hutchinsonDerivative(P, PDelayed, beta, k);

      const PDelayed_k2 = getPastValue(history, t + dt / 2, tau, P0);
      const k2 = hutchinsonDerivative(P + (dt / 2) * k1, PDelayed_k2, beta, k);

      const PDelayed_k3 = getPastValue(history, t + dt / 2, tau, P0);
      const k3 = hutchinsonDerivative(P + (dt / 2) * k2, PDelayed_k3, beta, k);

      const PDelayed_k4 = getPastValue(history, t + dt, tau, P0);
      const k4 = hutchinsonDerivative(P + dt * k3, PDelayed_k4, beta, k);

      return P + (dt / 6) * (k1 + 2 * k2 + 2 * k3 + k4);
    },
    [getPastValue, hutchinsonDerivative],
  );

  // Draw the simulation
  const drawSimulation = useCallback(
    (canvas, ctx) => {
      if (!canvas) return;

      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      // Calculate padding to match GridGraph
      const yTicks = [0, 50, 100, 150, 200, 250, 300];
      const maxYTickLength = Math.max(
        ...yTicks.map((t) => t.toString().length),
      );
      const yTickWidth = Math.max(25, maxYTickLength * 6 + 10);
      const yAxisLabelWidth = 20;

      const paddingLeft = yTickWidth + yAxisLabelWidth;
      const paddingRight = 15;
      const paddingTop = 15;
      const paddingBottom = 35;

      const plotWidth = width - paddingLeft - paddingRight;
      const plotHeight = height - paddingTop - paddingBottom;

      const tMax = 1000;
      const PMin = 0;
      const PMax = 300;

      const state = animationStateRef.current;
      const { history } = state;
      // Use current UI parameter for carrying capacity line
      const { k } = uiParams;

      // Draw carrying capacity line
      const kY =
        paddingTop + plotHeight - ((k - PMin) / (PMax - PMin)) * plotHeight;
      ctx.strokeStyle =
        currentTheme === "dark"
          ? "rgba(239, 68, 68, 0.6)"
          : "rgba(220, 38, 38, 0.6)";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(paddingLeft, kY);
      ctx.lineTo(paddingLeft + plotWidth, kY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw green initial position dot
      const initialX = paddingLeft + (0 / tMax) * plotWidth;
      const initialY =
        paddingTop +
        plotHeight -
        ((uiParams.P0 - PMin) / (PMax - PMin)) * plotHeight;
      ctx.fillStyle = currentTheme === "dark" ? "#22c55e" : "#16a34a";
      ctx.beginPath();
      ctx.arc(initialX, initialY, 5, 0, 2 * Math.PI);
      ctx.fill();

      // Draw population trajectory
      if (history.length > 0) {
        ctx.strokeStyle = currentTheme === "dark" ? "#22c55e" : "#16a34a";
        ctx.lineWidth = 2;

        ctx.beginPath();
        history.forEach(([t, P], index) => {
          const x = paddingLeft + (t / tMax) * plotWidth;
          const y =
            paddingTop + plotHeight - ((P - PMin) / (PMax - PMin)) * plotHeight;

          if (index === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        });
        ctx.stroke();

        // Draw current position (black dot at end of trajectory)
        if (state.isRunning && history.length > 0) {
          const lastPoint = history[history.length - 1];
          const currentTime = lastPoint[0];
          const x = paddingLeft + (currentTime / tMax) * plotWidth;
          const y =
            paddingTop +
            plotHeight -
            ((lastPoint[1] - PMin) / (PMax - PMin)) * plotHeight;

          ctx.fillStyle = currentTheme === "dark" ? "#ffffff" : "#000000";
          ctx.beginPath();
          ctx.arc(x, y, 4, 0, 2 * Math.PI);
          ctx.fill();

          // Draw gray "ghost" dot at t-tau (only if t > tau)
          const { tau, P0 } = state.params;
          if (currentTime > tau) {
            const delayedP = getPastValue(history, currentTime, tau, P0);
            const ghostX =
              paddingLeft + ((currentTime - tau) / tMax) * plotWidth;
            const ghostY =
              paddingTop +
              plotHeight -
              ((delayedP - PMin) / (PMax - PMin)) * plotHeight;

            ctx.fillStyle =
              currentTheme === "dark"
                ? "rgba(156, 163, 175, 0.7)"
                : "rgba(107, 114, 128, 0.7)";
            ctx.beginPath();
            ctx.arc(ghostX, ghostY, 4, 0, 2 * Math.PI);
            ctx.fill();
          }
        }
      }
    },
    [currentTheme, uiParams.k, uiParams.P0, redrawTrigger, getPastValue],
  );

  // Animation loop
  const animationLoop = useCallback(() => {
    const state = animationStateRef.current;
    if (!state.isRunning) return;

    const dt = 0.05;
    const stepsPerFrame = 100;

    // Run multiple integration steps per frame for performance
    for (let i = 0; i < stepsPerFrame; i++) {
      if (state.time >= 1000) {
        state.isRunning = false;
        setIsAnimating(false);
        break;
      }

      const newP = rk4Step(
        state.population,
        state.time,
        dt,
        state.history,
        state.params,
      );

      state.time += dt;
      state.population = newP;
      state.history.push([state.time, state.population]);
    }

    // Draw current state
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      drawSimulation(canvasRef.current, ctx);
    }

    if (state.isRunning) {
      state.animationId = requestAnimationFrame(animationLoop);
    }
  }, [rk4Step, drawSimulation]);

  // Start simulation
  const startSimulation = useCallback(() => {
    const state = animationStateRef.current;

    // Reset state
    state.time = 0;
    state.population = state.params.P0;
    state.history = [[0, state.params.P0]];
    state.isRunning = true;

    setIsAnimating(true);

    // Clear canvas and start animation
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      drawSimulation(canvasRef.current, ctx);
    }

    state.animationId = requestAnimationFrame(animationLoop);
  }, [animationLoop, drawSimulation]);

  // Stop simulation
  const stopSimulation = useCallback(() => {
    const state = animationStateRef.current;
    state.isRunning = false;
    setIsAnimating(false);

    if (state.animationId) {
      cancelAnimationFrame(state.animationId);
    }
  }, []);

  // Initialize canvas
  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;

      const ctx = canvas.getContext("2d");
      drawSimulation(canvas, ctx);
    }
  }, [drawSimulation]);

  // Redraw when carrying capacity or initial population changes
  useEffect(() => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      drawSimulation(canvasRef.current, ctx);
    }
  }, [uiParams.k, uiParams.P0, drawSimulation]);

  // Cleanup
  useEffect(() => {
    return () => {
      const state = animationStateRef.current;
      if (state.animationId) {
        cancelAnimationFrame(state.animationId);
      }
    };
  }, []);

  return (
    <ToolContainer
      title="Hutchinson Population Growth Simulator"
      canvasWidth={8}
      canvasHeight={5}
    >
      {/* Population Time Series Graph */}
      <GridGraph
        x={0}
        y={0}
        w={8}
        h={3}
        xLabel="Time (t)"
        yLabel="Population (P)"
        xTicks={[0, 200, 400, 600, 800, 1000]}
        yTicks={[0, 50, 100, 150, 200, 250, 300]}
        xRange={[0, 1000]}
        yRange={[0, 300]}
        leftAxisColor={currentTheme === "dark" ? "#ffffff" : "#000000"}
        tooltip="Population over time"
        theme={theme}
      >
        <canvas
          ref={canvasRef}
          className="absolute pointer-events-none"
          style={{
            left: 1,
            bottom: 1,
            width: "calc(100% - 2px)",
            height: "calc(100% - 2px)",
          }}
        />
      </GridGraph>

      {/* Parameter Sliders */}
      <GridSliderHorizontal
        x={0}
        y={3}
        w={3}
        h={1}
        value={(uiParams.k / 300) * 100}
        onChange={(value) => updateParam("k", (value / 100) * 300)}
        variant="unipolar"
        label={`Carrying capacity: k = ${uiParams.k.toFixed(1)}`}
        tooltip="Maximum sustainable population"
        theme={theme}
      />

      <GridSliderHorizontal
        x={0}
        y={4}
        w={3}
        h={1}
        value={(uiParams.beta / 0.1) * 100}
        onChange={(value) => updateParam("beta", (value / 100) * 0.1)}
        variant="unipolar"
        label={`Birth rate: β = ${uiParams.beta.toFixed(3)}`}
        tooltip="Growth rate coefficient"
        theme={theme}
      />

      <GridSliderHorizontal
        x={3}
        y={3}
        w={3}
        h={1}
        value={(uiParams.tau / 100) * 100}
        onChange={(value) => updateParam("tau", (value / 100) * 100)}
        variant="unipolar"
        label={`Time delay: τ = ${uiParams.tau.toFixed(1)}`}
        tooltip="Lag period for population feedback"
        theme={theme}
      />

      <GridSliderHorizontal
        x={3}
        y={4}
        w={3}
        h={1}
        value={(uiParams.P0 / 300) * 100}
        onChange={(value) => updateParam("P0", (value / 100) * 300)}
        variant="unipolar"
        label={`Initial population: P₀ = ${uiParams.P0.toFixed(1)}`}
        tooltip="Starting population at t=0"
        theme={theme}
      />

      {/* Equation Display */}
      <GridDisplay
        x={6}
        y={3}
        w={2}
        h={1}
        variant="info"
        align="center"
        theme={theme}
      >
        <div
          style={{
            paddingTop: "30px",
            paddingBottom: "2px",
            paddingLeft: "2px",
            paddingRight: "2px",
            fontSize: "0.6em",
          }}
        >
          <Equation name="hutchinson" size="small" />
        </div>
      </GridDisplay>

      {/* Control Buttons */}
      <GridButton
        x={6}
        y={4}
        w={1}
        h={1}
        onPress={startSimulation}
        variant={isAnimating ? "pressed" : "default"}
        theme={theme}
      >
        <div style={{ fontSize: "14px" }}>Solve</div>
      </GridButton>

      <GridButton
        x={7}
        y={4}
        w={1}
        h={1}
        onPress={stopSimulation}
        theme={theme}
      >
        <div style={{ fontSize: "14px" }}>Stop</div>
      </GridButton>
    </ToolContainer>
  );
};

export default HutchinsonGrowthTool;
