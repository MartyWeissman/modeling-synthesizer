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
import Equation from "../components/Equation";

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
  const [currentAnimationLength, setCurrentAnimationLength] = useState(null);
  const animationFrameRef = useRef(null);
  const animationStartTimeRef = useRef(null);

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
    // r is 0-100, divided by 1000 to convert from cm/s to cm/ms
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

  // Oscillation detection state
  const [oscillationStats, setOscillationStats] = useState({
    period: null,
    frequency: null,
  });

  // Run simulation
  const runSimulation = useCallback(() => {
    const dt = 1; // 1 ms timestep
    const tMax = 2000; // 2 seconds = 2000 ms
    const params = { r, Leq, tau };

    const data = [];
    const history = [{ t: 0, L: L0 }];
    data.push({ t: 0, L: L0 });

    for (let t = dt; t <= tMax; t += dt) {
      const newL = rk4Step(history, dt, params);
      const newPoint = { t, L: newL };
      history.push(newPoint);
      data.push(newPoint);
    }

    setSimulationData(data);

    // Detect oscillations using FFT between 1000ms and 2000ms
    const analysisStart = 1000;
    const analysisEnd = 2000;
    const analysisData = data.filter(
      (point) => point.t >= analysisStart && point.t <= analysisEnd,
    );

    if (analysisData.length > 10) {
      // Detrend the data (remove DC component and linear trend)
      const values = analysisData.map((p) => p.L);
      const n = values.length;
      const mean = values.reduce((sum, v) => sum + v, 0) / n;
      const detrended = values.map((v) => v - mean);

      // Simple DFT for frequency analysis (looking for dominant frequency)
      // We only need to check frequencies between 1-50 Hz
      const sampleRate = 1000; // 1 sample per ms = 1000 Hz
      const minFreq = 1; // Hz
      const maxFreq = 50; // Hz

      let maxPower = 0;
      let dominantFreq = null;

      // Check frequencies from 1 to 50 Hz in 0.1 Hz steps
      for (let f = minFreq; f <= maxFreq; f += 0.1) {
        let realSum = 0;
        let imagSum = 0;

        // Compute DFT at this frequency
        for (let i = 0; i < n; i++) {
          const angle = (2 * Math.PI * f * i) / sampleRate;
          realSum += detrended[i] * Math.cos(angle);
          imagSum += detrended[i] * Math.sin(angle);
        }

        // Power at this frequency
        const power = realSum * realSum + imagSum * imagSum;

        if (power > maxPower) {
          maxPower = power;
          dominantFreq = f;
        }
      }

      // Only report if there's a clear oscillation (power threshold)
      // Normalized power relative to signal variance
      const variance = detrended.reduce((sum, v) => sum + v * v, 0) / n;
      const normalizedPower = maxPower / (n * n * variance);

      if (normalizedPower > 0.3 && dominantFreq !== null) {
        const period = 1000 / dominantFreq; // Convert Hz to ms
        setOscillationStats({
          period: period,
          frequency: dominantFreq,
        });
      } else {
        setOscillationStats({ period: null, frequency: null });
      }
    } else {
      setOscillationStats({ period: null, frequency: null });
    }
  }, [r, Leq, tau, L0, rk4Step]);

  // Draw simulation on canvas
  const drawSimulation = useCallback(() => {
    const transform = transformRef.current;
    const canvas = canvasRef.current;
    if (!canvas || !transform || simulationData.length === 0) return;

    const ctx = canvas.getContext("2d");
    const { dataToPixel, plotWidth, plotHeight } = transform;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw invalid regions (shaded areas)
    ctx.fillStyle =
      currentTheme === "dark"
        ? "rgba(255, 100, 100, 0.15)"
        : "rgba(255, 100, 100, 0.1)";

    // Bottom invalid region (0-10 cm)
    const bottomLeft = dataToPixel(0, 0);
    const bottomRight = dataToPixel(2000, 10);
    ctx.fillRect(0, bottomRight.y, plotWidth, bottomLeft.y - bottomRight.y);

    // Top invalid region (30-40 cm)
    const topLeft = dataToPixel(0, 40);
    const topRight = dataToPixel(2000, 30);
    ctx.fillRect(0, topLeft.y, plotWidth, topRight.y - topLeft.y);

    // Draw equilibrium line (red dashed)
    const eqLeft = dataToPixel(0, Leq);
    const eqRight = dataToPixel(2000, Leq);
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

    // Draw current state (black dot at end)
    if (simulationData.length > 0) {
      const lastPoint = simulationData[simulationData.length - 1];
      const lastPos = dataToPixel(lastPoint.t, lastPoint.L);

      ctx.fillStyle = currentTheme === "dark" ? "#ffffff" : "#000000";
      ctx.beginPath();
      ctx.arc(lastPos.x, lastPos.y, 5, 0, 2 * Math.PI);
      ctx.fill();
    }

    // Draw delayed state (red dot) if tau > 0
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
  }, [simulationData, Leq, L0, tau, currentTheme]);

  // Initialize canvas
  useEffect(() => {
    if (canvasRef.current && transformRef.current) {
      const canvas = canvasRef.current;
      canvas.width = transformRef.current.plotWidth;
      canvas.height = transformRef.current.plotHeight;
      drawSimulation();
    }
  }, [drawSimulation]);

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
    (canvas, ctx, muscleLength) => {
      if (!canvas) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const width = canvas.width;
      const height = canvas.height;

      // Elbow position - vertical position chosen so horizontal arm aligns with L=20cm
      const elbowX = width * 0.8;

      // Forearm and hand lengths (fixed)
      const forearmLength = width * 0.6;
      const handLength = width * 0.15;

      // Position elbow so when horizontal, fingertip aligns with L=20cm on graph
      // The graph shows 0-40cm with L=20 at middle vertical position
      // Move elbow down 36 pixels from center to make upper arm longer
      const elbowY = height * 0.5 + 36;

      // Map muscle length (10-30 cm) to angle
      // L=10 -> arm points down about 45 degrees
      // L=20 -> arm is horizontal pointing left (angle 180 degrees)
      // L=30 -> arm points up about 45 degrees
      // Angle in radians: Math.PI + (20 - L) / 20 * (Math.PI / 2)
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

  // Animation loop for forearm
  const animateForearm = useCallback(
    (timestamp) => {
      if (!animationStartTimeRef.current) {
        animationStartTimeRef.current = timestamp;
      }

      const elapsed = timestamp - animationStartTimeRef.current;

      if (elapsed >= 2000 || simulationData.length === 0) {
        // Animation complete - leave hand at final position
        setIsAnimating(false);
        animationStartTimeRef.current = null;

        // Set final position
        const finalLength = simulationData[simulationData.length - 1]?.L || L0;
        setCurrentAnimationLength(finalLength);

        if (forearmCanvasRef.current) {
          const canvas = forearmCanvasRef.current;
          const ctx = canvas.getContext("2d");
          drawForearm(canvas, ctx, finalLength);
        }
        return;
      }

      // Find corresponding muscle length from simulation data
      const dataIndex = Math.floor(elapsed);
      const muscleLength = simulationData[dataIndex]?.L || L0;
      setCurrentAnimationLength(muscleLength);

      // Draw forearm at this position
      if (forearmCanvasRef.current) {
        const canvas = forearmCanvasRef.current;
        const ctx = canvas.getContext("2d");
        drawForearm(canvas, ctx, muscleLength);
      }

      // Continue animation
      animationFrameRef.current = requestAnimationFrame(animateForearm);
    },
    [simulationData, L0, drawForearm],
  );

  // Start animation
  const handlePlayAnimation = useCallback(() => {
    if (isAnimating) return;

    setIsAnimating(true);
    setCurrentAnimationLength(null);
    animationStartTimeRef.current = null;
    animationFrameRef.current = requestAnimationFrame(animateForearm);
  }, [isAnimating, animateForearm]);

  // Reset animation to starting position
  const handleResetAnimation = useCallback(() => {
    setIsAnimating(false);
    setCurrentAnimationLength(null);
    animationStartTimeRef.current = null;

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    // Draw at initial position
    if (forearmCanvasRef.current) {
      const canvas = forearmCanvasRef.current;
      const ctx = canvas.getContext("2d");
      drawForearm(canvas, ctx, L0);
    }
  }, [L0, drawForearm]);

  // Initialize forearm canvas
  useEffect(() => {
    if (forearmCanvasRef.current) {
      const canvas = forearmCanvasRef.current;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;

      // Draw initial position
      const ctx = canvas.getContext("2d");
      drawForearm(canvas, ctx, L0);
    }
  }, [L0, drawForearm]);

  // Redraw forearm when parameters change (if not animating)
  useEffect(() => {
    if (!isAnimating && forearmCanvasRef.current) {
      const canvas = forearmCanvasRef.current;
      const ctx = canvas.getContext("2d");
      const displayLength =
        currentAnimationLength !== null ? currentAnimationLength : L0;
      drawForearm(canvas, ctx, displayLength);
    }
  }, [L0, isAnimating, currentAnimationLength, drawForearm]);

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

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
      >
        {(transform) => {
          transformRef.current = transform;
          return (
            <canvas
              ref={canvasRef}
              className="absolute pointer-events-none"
              style={transform.plotStyle}
              width={transform.plotWidth}
              height={transform.plotHeight}
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
        value={(L0 - 10) * 5}
        onChange={(value) => setL0(10 + value / 5)}
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
        label={`Reflex magnitude r = ${r.toFixed(0)}`}
        theme={theme}
      />

      {/* Time Delay Slider (3x1) - row 4 */}
      <GridSliderHorizontal
        x={3}
        y={4}
        w={3}
        h={1}
        value={tau * (100 / 30)}
        onChange={(value) => setTau(Math.round(value * (30 / 100)))}
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

      {/* Play Animation Button (1.5x1) - below forearm window */}
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

      {/* Reset Animation Button (1.5x1) - below forearm window */}
      <GridButton
        x={7}
        y={2}
        w={2}
        h={1}
        onPress={handleResetAnimation}
        theme={theme}
      >
        <div style={{ textAlign: "center", lineHeight: "1.1" }}>
          <div>Reset</div>
        </div>
      </GridButton>

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
            {oscillationStats.period !== null ? (
              <>
                <div>Period: {oscillationStats.period.toFixed(1)} ms</div>
                <div>Frequency: {oscillationStats.frequency.toFixed(2)} Hz</div>
              </>
            ) : (
              <div style={{ fontStyle: "italic", opacity: 0.7 }}>
                No oscillations detected
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
