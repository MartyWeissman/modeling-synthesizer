// src/tools/MuscleTremorSimulatorTool.jsx

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  GridInput,
  GridLabel,
  GridButton,
  GridGraph,
  GridDisplay,
  GridSliderHorizontal,
  GridWindow,
} from "../components/grid";
import ToolContainer from "../components/ui/ToolContainer";
import { useTheme } from "../hooks/useTheme";
import { useAnimationLoop } from "../hooks/useAnimationLoop";
import { setupCanvas } from "../utils/canvas";
import Equation from "../components/Equation";
import { delayRegime, dominantFrequency } from "./delayModels";

const T_MAX = 2000; // ms simulated (and played back in 2 s of real time)

const MuscleTremorSimulatorTool = () => {
  const { theme, currentTheme } = useTheme();

  // UI State - Parameters
  const Leq = 20; // Equilibrium length (cm) - fixed at 20
  const [r, setR] = useState(50); // Reflex magnitude (0-100, equation uses r/1000 for unit conversion)
  const [tau, setTau] = useState(10); // Time delay (ms)
  const [L0, setL0] = useState(25); // Initial length (cm)

  // Simulation state
  const [simulationData, setSimulationData] = useState([]);

  // Animation state for forearm visualization
  const [isAnimating, setIsAnimating] = useState(false);
  // Playback time (ms of model time) shown by the forearm; null = at start
  const [playbackTime, setPlaybackTime] = useState(null);
  const playbackRef = useRef(0);

  // Canvas refs for visualization
  const canvasRef = useRef(null);
  const forearmCanvasRef = useRef(null);
  const transformRef = useRef(null);

  // RK4 integration for delay differential equation
  // Adapted from OneDimensionalCalculator - proper RK4 for DDEs
  const rk4Step = useCallback((history, dt, params) => {
    const { r, Leq, tau } = params;
    const currentL = history[history.length - 1].L;
    const currentT = history[history.length - 1].t;

    // Helper to get delayed value L(t - tau) at a specific time
    const getDelayedL = (t) => {
      if (tau === 0) return currentL;

      const targetTime = t - tau;

      // Find the closest history point to targetTime
      // History is stored chronologically, so we search backwards
      for (let i = history.length - 1; i >= 0; i--) {
        if (history[i].t <= targetTime) {
          // Linear interpolation for precision between timesteps
          if (i < history.length - 1) {
            const t0 = history[i].t;
            const t1 = history[i + 1].t;
            const L0 = history[i].L;
            const L1 = history[i + 1].L;
            const alpha = (targetTime - t0) / (t1 - t0);
            return L0 + alpha * (L1 - L0);
          }
          return history[i].L;
        }
      }

      // If we don't have enough history, use the initial value
      return history[0].L;
    };

    // L'(t) = (r/1000) * (Leq - L(t - tau))
    // r is in 1/s; time is in ms, so the rate per ms is r/1000
    const derivative = (L, t) => {
      const L_delayed = getDelayedL(t);
      return (r / 1000) * (Leq - L_delayed);
    };

    // RK4 steps - each step evaluates derivative at different times
    const k1 = derivative(currentL, currentT);
    const k2 = derivative(currentL + 0.5 * dt * k1, currentT + 0.5 * dt);
    const k3 = derivative(currentL + 0.5 * dt * k2, currentT + 0.5 * dt);
    const k4 = derivative(currentL + dt * k3, currentT + dt);

    let newL = currentL + (dt / 6) * (k1 + 2 * k2 + 2 * k3 + k4);

    // Apply physical constraints: 10 cm <= L <= 30 cm
    newL = Math.max(10, Math.min(30, newL));

    return newL;
  }, []);

  // Oscillation analysis (regime from theory, frequency measured)
  const [oscillationStats, setOscillationStats] = useState({
    regime: "none",
    frequency: null,
  });

  // Run simulation
  const runSimulation = useCallback(() => {
    const dt = 1; // 1 ms timestep
    const params = { r, Leq, tau };

    const data = [];
    const history = [{ t: 0, L: L0 }];
    data.push({ t: 0, L: L0 });

    for (let t = dt; t <= T_MAX; t += dt) {
      const newL = rk4Step(history, dt, params);
      const newPoint = { t, L: newL };
      history.push(newPoint);
      data.push(newPoint);
    }

    setSimulationData(data);

    const regime = delayRegime(r / 1000, tau);
    // Measure the frequency between 1000 ms and 2000 ms
    const values = data.filter((p) => p.t >= 1000).map((p) => p.L);
    const frequency = regime === "none" ? null : dominantFrequency(values);
    setOscillationStats({ regime, frequency });
  }, [r, Leq, tau, L0, rk4Step]);

  // Draw simulation on canvas
  const drawSimulation = useCallback(() => {
    const transform = transformRef.current;
    const canvas = canvasRef.current;
    if (!canvas || !transform || simulationData.length === 0) return;

    const setup = setupCanvas(canvas);
    if (!setup) return;
    const { ctx } = setup;
    const { dataToPixel, plotWidth } = transform;

    // Clear canvas
    ctx.clearRect(0, 0, setup.width, setup.height);

    // Draw invalid regions (shaded areas)
    ctx.fillStyle =
      currentTheme === "dark"
        ? "rgba(255, 100, 100, 0.15)"
        : "rgba(255, 100, 100, 0.1)";

    // Bottom invalid region (0-10 cm)
    const bottomLeft = dataToPixel(0, 0);
    const bottomRight = dataToPixel(T_MAX, 10);
    ctx.fillRect(0, bottomRight.y, plotWidth, bottomLeft.y - bottomRight.y);

    // Top invalid region (30-40 cm)
    const topLeft = dataToPixel(0, 40);
    const topRight = dataToPixel(T_MAX, 30);
    ctx.fillRect(0, topLeft.y, plotWidth, topRight.y - topLeft.y);

    // Draw equilibrium line (red dashed)
    const eqLeft = dataToPixel(0, Leq);
    const eqRight = dataToPixel(T_MAX, Leq);
    ctx.strokeStyle = currentTheme === "dark" ? "#ef4444" : "#dc2626";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(eqLeft.x, eqLeft.y);
    ctx.lineTo(eqRight.x, eqRight.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw initial condition (dark green dot)
    const initialPos = dataToPixel(0, L0);
    ctx.fillStyle = currentTheme === "dark" ? "#22c55e" : "#16a34a";
    ctx.beginPath();
    ctx.arc(initialPos.x, initialPos.y, 6, 0, 2 * Math.PI);
    ctx.fill();

    // Draw trajectory (green curve)
    ctx.strokeStyle = currentTheme === "dark" ? "#4ade80" : "#22c55e";
    ctx.lineWidth = 2;
    ctx.beginPath();

    simulationData.forEach((point, index) => {
      const pos = dataToPixel(point.t, point.L);

      if (index === 0) {
        ctx.moveTo(pos.x, pos.y);
      } else {
        ctx.lineTo(pos.x, pos.y);
      }
    });

    ctx.stroke();

    // Playback cursor: where the forearm is in time
    if (playbackTime !== null) {
      const top = dataToPixel(playbackTime, 40);
      const bottom = dataToPixel(playbackTime, 0);
      ctx.strokeStyle =
        currentTheme === "dark"
          ? "rgba(255, 255, 255, 0.45)"
          : "rgba(0, 0, 0, 0.35)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(top.x, top.y);
      ctx.lineTo(bottom.x, bottom.y);
      ctx.stroke();
    }

    // Draw current state (black dot at end)
    if (simulationData.length > 0) {
      const lastPoint = simulationData[simulationData.length - 1];
      const lastPos = dataToPixel(lastPoint.t, lastPoint.L);

      ctx.fillStyle = currentTheme === "dark" ? "#ffffff" : "#000000";
      ctx.beginPath();
      ctx.arc(lastPos.x, lastPos.y, 5, 0, 2 * Math.PI);
      ctx.fill();
    }

    // Draw delayed state (red dot) if tau > 0: the value L(t - tau) that
    // the reflex is responding to at the final time t = 2000 ms
    if (tau > 0 && simulationData.length > 0) {
      const lastPoint = simulationData[simulationData.length - 1];
      const lastT = lastPoint.t;
      const targetTime = lastT - tau;

      // Find the delayed point using the same interpolation logic
      let delayedL = L0; // Default to initial value
      for (let i = simulationData.length - 1; i >= 0; i--) {
        if (simulationData[i].t <= targetTime) {
          if (i < simulationData.length - 1) {
            const t0 = simulationData[i].t;
            const t1 = simulationData[i + 1].t;
            const L0_interp = simulationData[i].L;
            const L1_interp = simulationData[i + 1].L;
            const alpha = (targetTime - t0) / (t1 - t0);
            delayedL = L0_interp + alpha * (L1_interp - L0_interp);
          } else {
            delayedL = simulationData[i].L;
          }
          break;
        }
      }

      const delayedPos = dataToPixel(lastT, delayedL);

      ctx.fillStyle = currentTheme === "dark" ? "#ef4444" : "#dc2626";
      ctx.beginPath();
      ctx.arc(delayedPos.x, delayedPos.y, 5, 0, 2 * Math.PI);
      ctx.fill();
    }
  }, [simulationData, Leq, L0, tau, currentTheme, playbackTime]);

  // Redraw when simulation data or theme changes
  useEffect(() => {
    drawSimulation();
  }, [drawSimulation]);

  // Auto-run simulation on mount and parameter changes
  useEffect(() => {
    runSimulation();
  }, [runSimulation]);

  // Draw forearm at a specific muscle length
  const drawForearm = useCallback(
    (muscleLength) => {
      const canvas = forearmCanvasRef.current;
      if (!canvas) return;
      const setup = setupCanvas(canvas);
      if (!setup) return;
      const { ctx, width, height } = setup;

      ctx.clearRect(0, 0, width, height);

      // Elbow position - vertical position chosen so horizontal arm aligns with L=20cm
      const elbowX = width * 0.8;

      // Forearm and hand lengths (fixed)
      const forearmLength = width * 0.6;
      const handLength = width * 0.15;

      // Position elbow so when horizontal, fingertip aligns with L=20cm on graph
      // The graph shows 0-40cm with L=20 at middle vertical position
      // Move elbow down 36 pixels from center to make upper arm longer
      const elbowY = height * 0.5 + 36;

      // Map muscle length (10-30 cm) to angle (canvas y points down):
      // L=10 -> forearm angled about 45 degrees UP (elbow flexed)
      // L=20 -> forearm horizontal, pointing left (angle 180 degrees)
      // L=30 -> forearm angled about 45 degrees DOWN (elbow extended)
      const angle = Math.PI + ((Leq - muscleLength) / 20) * (Math.PI / 2);

      // Hand position (end of forearm)
      const handX = elbowX + forearmLength * Math.cos(angle);
      const handY = elbowY + forearmLength * Math.sin(angle);

      // Draw upper arm (vertical from top to elbow)
      ctx.strokeStyle = currentTheme === "dark" ? "#d4d4d8" : "#52525b";
      ctx.lineWidth = 8;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(elbowX, 0);
      ctx.lineTo(elbowX, elbowY);
      ctx.stroke();

      // Draw forearm (from elbow to hand, going left)
      ctx.strokeStyle = currentTheme === "dark" ? "#e4e4e7" : "#3f3f46";
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(elbowX, elbowY);
      ctx.lineTo(handX, handY);
      ctx.stroke();

      // Draw elbow joint (circle)
      ctx.fillStyle = currentTheme === "dark" ? "#a1a1aa" : "#71717a";
      ctx.beginPath();
      ctx.arc(elbowX, elbowY, 8, 0, 2 * Math.PI);
      ctx.fill();

      // Draw hand (simplified as extension of forearm)
      const handWidth = 6;
      const handEndX = handX + handLength * Math.cos(angle);
      const handEndY = handY + handLength * Math.sin(angle);

      ctx.strokeStyle = currentTheme === "dark" ? "#fbbf24" : "#f59e0b";
      ctx.lineWidth = handWidth;
      ctx.beginPath();
      ctx.moveTo(handX, handY);
      ctx.lineTo(handEndX, handEndY);
      ctx.stroke();

      // Draw fingertip (small circle)
      ctx.fillStyle = currentTheme === "dark" ? "#ef4444" : "#dc2626";
      ctx.beginPath();
      ctx.arc(handEndX, handEndY, 4, 0, 2 * Math.PI);
      ctx.fill();
    },
    [Leq, currentTheme],
  );

  // Muscle length at model time t (ms), from the current simulation
  const lengthAt = useCallback(
    (t) => {
      if (simulationData.length === 0) return L0;
      const i = Math.max(0, Math.min(simulationData.length - 1, Math.floor(t)));
      const j = Math.min(simulationData.length - 1, i + 1);
      const frac = Math.max(0, Math.min(1, t - i));
      return simulationData[i].L + frac * (simulationData[j].L - simulationData[i].L);
    },
    [simulationData, L0],
  );

  // Forearm playback: 1 ms of model time per 1 ms of real time. Always
  // reads the latest simulation, so changing a slider mid-play is safe.
  const playLoop = useAnimationLoop((dtSeconds) => {
    const t = Math.min(T_MAX, playbackRef.current + dtSeconds * 1000);
    playbackRef.current = t;
    setPlaybackTime(t);
    if (t >= T_MAX) {
      setIsAnimating(false);
      return false; // leave the hand at the final position
    }
    return true;
  });
  const { start: startPlay, stop: stopPlay } = playLoop;

  // Start animation (from the beginning)
  const handlePlayAnimation = useCallback(() => {
    if (isAnimating) return;
    playbackRef.current = 0;
    setPlaybackTime(0);
    setIsAnimating(true);
    startPlay();
  }, [isAnimating, startPlay]);

  // Reset animation to starting position
  const handleResetAnimation = useCallback(() => {
    stopPlay();
    setIsAnimating(false);
    playbackRef.current = 0;
    setPlaybackTime(null);
  }, [stopPlay]);

  // A finished playback belongs to the old parameters: when the simulation
  // changes (and nothing is playing), show the new starting position.
  useEffect(() => {
    if (!isAnimating) setPlaybackTime(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simulationData]);

  // Draw the forearm whenever the shown time, data or theme changes
  useEffect(() => {
    drawForearm(playbackTime === null ? L0 : lengthAt(playbackTime));
  }, [playbackTime, L0, lengthAt, drawForearm]);

  return (
    <ToolContainer
      title="Muscle Tremor Simulator"
      canvasWidth={9}
      canvasHeight={5}
    >
      {/* Main Graph (6x3) */}
      <GridGraph
        x={0}
        y={0}
        w={6}
        h={3}
        xLabel="Time"
        xUnit="ms"
        yLabel="Muscle Length"
        yUnit="cm"
        xTicks={[0, 500, 1000, 1500, 2000]}
        yTicks={[0, 10, 20, 30, 40]}
        xRange={[0, 2000]}
        yRange={[0, 40]}
        leftAxisColor={currentTheme === "dark" ? "#ffffff" : "#000000"}
        theme={theme}
        tooltip="Green: muscle length L(t). Red dashed: L = 20 cm. Black dot: L at t = 2000 ms; red dot: the delayed value L(t − τ) the reflex is reacting to then."
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

      {/* Initial Length Slider (3x1) - left side of row 3 */}
      <GridSliderHorizontal
        x={0}
        y={3}
        w={3}
        h={1}
        value={L0}
        onChange={(value) => setL0(Math.round(value * 5) / 5)}
        min={10}
        max={30}
        step={0.2}
        variant="unipolar"
        label={`Initial length L₀ = ${L0.toFixed(1)} cm`}
        theme={theme}
      />

      {/* Equation Display (3x1) - right side of row 3 */}
      <GridDisplay
        x={3}
        y={3}
        w={3}
        h={1}
        variant="info"
        align="center"
        fontSize="medium"
        theme={theme}
      >
        <div style={{ padding: "8px", paddingTop: "28px" }}>
          <Equation name="muscle-tremor" size="medium" />
        </div>
      </GridDisplay>

      {/* Reflex Magnitude Slider (3x1) - row 4 */}
      <GridSliderHorizontal
        x={0}
        y={4}
        w={3}
        h={1}
        value={r}
        onChange={setR}
        variant="unipolar"
        label={`Reflex magnitude r = ${r.toFixed(0)} s⁻¹`}
        theme={theme}
      />

      {/* Time Delay Slider (3x1) - row 4 */}
      <GridSliderHorizontal
        x={3}
        y={4}
        w={3}
        h={1}
        value={tau}
        onChange={(value) => setTau(Math.round(value))}
        min={0}
        max={30}
        step={1}
        variant="unipolar"
        label={`Time delay τ = ${tau} ms`}
        theme={theme}
      />

      {/* Forearm Visualization Window (3x2) - top right */}
      <GridWindow x={6} y={0} w={3} h={2} theme={theme}>
        <canvas
          ref={forearmCanvasRef}
          style={{
            width: "100%",
            height: "100%",
            display: "block",
          }}
        />
      </GridWindow>

      {/* Play / Reset buttons and playback time - below forearm window */}
      <GridButton
        x={6}
        y={2}
        w={1}
        h={1}
        onPress={handlePlayAnimation}
        variant={isAnimating ? "pressed" : "default"}
        theme={theme}
      >
        <div style={{ textAlign: "center", lineHeight: "1.1" }}>
          <div>{isAnimating ? "Playing" : "Play"}</div>
        </div>
      </GridButton>

      <GridButton
        x={7}
        y={2}
        w={1}
        h={1}
        onPress={handleResetAnimation}
        theme={theme}
      >
        <div style={{ textAlign: "center", lineHeight: "1.1" }}>
          <div>Reset</div>
        </div>
      </GridButton>

      <GridDisplay
        x={8}
        y={2}
        w={1}
        h={1}
        variant="info"
        align="center"
        fontSize="small"
        theme={theme}
      >
        <div style={{ textAlign: "center", lineHeight: "1.3" }}>
          <div style={{ fontSize: "0.85em", opacity: 0.7 }}>t</div>
          <div>{Math.round(playbackTime ?? 0)} ms</div>
        </div>
      </GridDisplay>

      {/* Oscillation Statistics Display (3x2) - bottom right */}
      <GridDisplay
        x={6}
        y={3}
        w={3}
        h={2}
        variant="info"
        align="left"
        fontSize="small"
        theme={theme}
      >
        <div style={{ padding: "8px" }}>
          <div style={{ fontWeight: "bold", marginBottom: "4px" }}>
            Oscillation Analysis
          </div>
          <div style={{ fontSize: "0.9em", lineHeight: "1.4" }}>
            <div style={{ fontWeight: "bold" }}>
              {oscillationStats.regime === "sustained"
                ? "Sustained oscillations"
                : oscillationStats.regime === "damped"
                  ? "Damped oscillations (die out)"
                  : "No oscillations"}
            </div>
            {oscillationStats.frequency !== null ? (
              <>
                <div>
                  Period: {(1000 / oscillationStats.frequency).toFixed(1)} ms
                </div>
                <div>Frequency: {oscillationStats.frequency.toFixed(2)} Hz</div>
              </>
            ) : (
              <div style={{ fontStyle: "italic", opacity: 0.7 }}>
                {oscillationStats.regime === "none"
                  ? "L returns smoothly to 20 cm"
                  : "Dies out too fast to measure"}
              </div>
            )}
          </div>
          <div
            style={{
              fontSize: "0.75em",
              marginTop: "4px",
              opacity: 0.6,
              fontStyle: "italic",
            }}
          >
            Analysis window: 1000-2000 ms
          </div>
        </div>
      </GridDisplay>
    </ToolContainer>
  );
};

export default MuscleTremorSimulatorTool;
