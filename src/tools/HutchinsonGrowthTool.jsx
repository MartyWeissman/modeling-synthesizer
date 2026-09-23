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
import { useAnimationLoop } from "../hooks/useAnimationLoop";
import { setupCanvas } from "../utils/canvas";
import { niceStep, linearTicks } from "../utils/ticks";
import { hutchinsonStep, delayedValue } from "./delayModels";

const T_MAX = 1000;
const DT = 0.05;
// Model time per real second. The original loop took 100 steps of 0.05 per
// frame (5 time units) at 60 frames/s = 300 per second, so a full run takes
// about 3.3 s; we keep that speed but advance by real elapsed time.
const SIM_RATE = 300;
// Default y-axis top; the axis grows when the population goes higher.
const BASE_P_MAX = 300;

// Nice axis top and ticks for a population maximum
function yAxisFor(maxP) {
  if (!(maxP > BASE_P_MAX)) {
    return { top: BASE_P_MAX, ticks: [0, 50, 100, 150, 200, 250, 300] };
  }
  const target = maxP * 1.05;
  const step = niceStep(0, target, 6);
  const top = Math.ceil(target / step) * step;
  return { top, ticks: linearTicks(0, top, step) };
}

const sameParams = (p, q) =>
  p.k === q.k && p.beta === q.beta && p.tau === q.tau && p.P0 === q.P0;

const HutchinsonGrowthTool = () => {
  const { theme, currentTheme } = useTheme();

  // UI State
  const [uiParams, setUiParams] = useState({
    k: 100, // Carrying capacity
    beta: 0.1, // Birth rate
    tau: 10, // Time delay
    P0: 50, // Initial population
  });
  // "idle" (nothing solved), "running", "paused", "done"
  const [runStatus, setRunStatus] = useState("idle");
  const [yAxis, setYAxis] = useState(() => yAxisFor(0));

  // Canvas ref
  const canvasRef = useRef(null);
  // Transform ref for coordinate conversion
  const transformRef = useRef(null);

  // Animation state. history[i] is P at time i*DT; runParams are the
  // parameters the current curve was solved with.
  const animationStateRef = useRef({
    history: [],
    runParams: null,
    stepAccumulator: 0,
    maxP: 0,
  });

  // Update parameter helper
  const updateParam = useCallback((key, value) => {
    setUiParams((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Draw the simulation (reads the latest UI parameters each call)
  const drawSimulation = useCallback(() => {
    const canvas = canvasRef.current;
    const transform = transformRef.current;
    if (!canvas || !transform) return;
    const setup = setupCanvas(canvas);
    if (!setup) return;
    const { ctx, width, height } = setup;

    const { dataToPixel } = transform;
    ctx.clearRect(0, 0, width, height);

    const state = animationStateRef.current;
    const { history, runParams } = state;
    const { k, P0 } = uiParams;
    const stale = runParams !== null && !sameParams(runParams, uiParams);

    // Carrying capacity line (current k)
    const kLeft = dataToPixel(0, k);
    const kRight = dataToPixel(T_MAX, k);
    ctx.strokeStyle =
      currentTheme === "dark"
        ? "rgba(239, 68, 68, 0.6)"
        : "rgba(220, 38, 38, 0.6)";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(kLeft.x, kLeft.y);
    ctx.lineTo(kRight.x, kRight.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Green dot: the initial population, at (t = 0, P0)
    const initialPixel = dataToPixel(0, P0);
    ctx.fillStyle = currentTheme === "dark" ? "#22c55e" : "#16a34a";
    ctx.beginPath();
    ctx.arc(initialPixel.x, initialPixel.y, 5, 0, 2 * Math.PI);
    ctx.fill();

    if (history.length > 1) {
      // A curve solved with other parameters is shown faded
      ctx.globalAlpha = stale ? 0.35 : 1;
      ctx.strokeStyle = currentTheme === "dark" ? "#22c55e" : "#16a34a";
      ctx.lineWidth = 2;
      ctx.beginPath();
      // At most ~2 points per pixel column
      const stride = Math.max(1, Math.floor(history.length / (2 * width)));
      for (let i = 0; i < history.length; i += stride) {
        const pixel = dataToPixel(i * DT, history[i]);
        if (i === 0) ctx.moveTo(pixel.x, pixel.y);
        else ctx.lineTo(pixel.x, pixel.y);
      }
      const lastIndex = history.length - 1;
      const lastPixel = dataToPixel(lastIndex * DT, history[lastIndex]);
      ctx.lineTo(lastPixel.x, lastPixel.y);
      ctx.stroke();

      // Current position and the delayed value it responds to, while the
      // solution is being computed (running or paused)
      if (runStatus === "running" || runStatus === "paused") {
        const currentTime = lastIndex * DT;
        ctx.fillStyle = currentTheme === "dark" ? "#ffffff" : "#000000";
        ctx.beginPath();
        ctx.arc(lastPixel.x, lastPixel.y, 4, 0, 2 * Math.PI);
        ctx.fill();

        // Gray "ghost" dot at (t - tau, P(t - tau)) once t > tau
        const { tau } = runParams;
        if (currentTime > tau) {
          const delayedP = delayedValue(history, DT, currentTime - tau, runParams.P0);
          const ghostPixel = dataToPixel(currentTime - tau, delayedP);
          ctx.fillStyle =
            currentTheme === "dark"
              ? "rgba(156, 163, 175, 0.8)"
              : "rgba(107, 114, 128, 0.8)";
          ctx.beginPath();
          ctx.arc(ghostPixel.x, ghostPixel.y, 4, 0, 2 * Math.PI);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;

      if (stale) {
        ctx.font = "13px Arial";
        ctx.textAlign = "right";
        ctx.textBaseline = "top";
        ctx.fillStyle = currentTheme === "dark" ? "#fbbf24" : "#b45309";
        ctx.fillText(
          "Parameters changed: press Solve to update the curve",
          width - 8,
          6,
        );
      }
    }
  }, [currentTheme, uiParams, runStatus]);

  // Animation loop: integrate in proportion to real elapsed time
  const loop = useAnimationLoop((dtSeconds) => {
    const state = animationStateRef.current;
    const params = state.runParams;
    if (!params) return false;
    const nMax = Math.round(T_MAX / DT);

    state.stepAccumulator += dtSeconds * SIM_RATE;
    let steps = 0;
    while (state.stepAccumulator >= DT && state.history.length <= nMax && steps < 20000) {
      const next = hutchinsonStep(state.history, DT, params);
      state.history.push(next);
      if (next > state.maxP) state.maxP = next;
      state.stepAccumulator -= DT;
      steps++;
    }

    // Grow the y-axis if the population goes above it
    setYAxis((prev) => {
      if (state.maxP <= prev.top) return prev;
      return yAxisFor(state.maxP);
    });

    if (state.history.length > nMax) {
      setRunStatus("done");
      drawSimulation();
      return false;
    }
    drawSimulation();
    return true;
  });
  const { start: startLoop, stop: stopLoop } = loop;

  // Solve: always restart from t = 0 with the current parameters
  const startSimulation = useCallback(() => {
    stopLoop();
    const state = animationStateRef.current;
    state.runParams = { ...uiParams };
    state.history = [uiParams.P0];
    state.stepAccumulator = 0;
    state.maxP = uiParams.P0;
    setYAxis(yAxisFor(uiParams.P0));
    setRunStatus("running");
    startLoop();
  }, [uiParams, startLoop, stopLoop]);

  // Stop pauses; pressing it again resumes the same run
  const stopOrResume = useCallback(() => {
    if (runStatus === "running") {
      stopLoop();
      setRunStatus("paused");
    } else if (runStatus === "paused") {
      setRunStatus("running");
      startLoop();
    }
  }, [runStatus, startLoop, stopLoop]);

  // Redraw whenever parameters, theme, status or axis change
  useEffect(() => {
    drawSimulation();
  }, [drawSimulation, yAxis]);

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
        yTicks={yAxis.ticks}
        xRange={[0, T_MAX]}
        yRange={[0, yAxis.top]}
        leftAxisColor={currentTheme === "dark" ? "#ffffff" : "#000000"}
        tooltip="Population over time (the P axis grows if the population goes above 300)"
        theme={theme}
      >
        {(transform) => {
          transformRef.current = transform;
          return (
            <canvas
              ref={canvasRef}
              className="absolute pointer-events-none"
              style={transform.plotStyle}
            />
          );
        }}
      </GridGraph>

      {/* Parameter Sliders */}
      <GridSliderHorizontal
        x={0}
        y={3}
        w={3}
        h={1}
        value={uiParams.k}
        onChange={(value) => updateParam("k", Math.round(value))}
        min={1}
        max={300}
        step={1}
        variant="unipolar"
        label={`Carrying capacity: k = ${uiParams.k.toFixed(0)}`}
        tooltip="Maximum sustainable population"
        theme={theme}
      />

      <GridSliderHorizontal
        x={0}
        y={4}
        w={3}
        h={1}
        value={(uiParams.beta / 0.1) * 100}
        onChange={(value) =>
          updateParam("beta", Math.round(value) / 1000)
        }
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
        value={uiParams.tau}
        onChange={(value) => updateParam("tau", Math.round(value))}
        min={0}
        max={100}
        step={1}
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
        onChange={(value) => updateParam("P0", Math.round(value) * 3)}
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
        variant={runStatus === "running" ? "pressed" : "default"}
        theme={theme}
      >
        <div style={{ fontSize: "14px" }}>Solve</div>
      </GridButton>

      <GridButton
        x={7}
        y={4}
        w={1}
        h={1}
        onPress={stopOrResume}
        theme={theme}
      >
        <div style={{ fontSize: "14px" }}>
          {runStatus === "paused" ? "Resume" : "Stop"}
        </div>
      </GridButton>
    </ToolContainer>
  );
};

export default HutchinsonGrowthTool;
