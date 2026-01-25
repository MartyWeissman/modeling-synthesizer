// src/tools/SharkTunaTrajectoryTool.jsx

import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import {
  GridSliderHorizontal,
  GridButton,
  GridDisplay,
  GridGraph,
} from "../components/grid";
import ToolContainer from "../components/ui/ToolContainer";
import Equation from "../components/Equation";
import { useTheme } from "../hooks/useTheme";

const SharkTunaTrajectoryTool = () => {
  const { theme } = useTheme();

  // UI State - only for React components
  const [uiParams, setUiParams] = useState({
    p: 0.03,
    q: 0.04,
    beta: 0.6,
    delta: 0.4,
    speed: 2,
  });

  const [isAnimating, setIsAnimating] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  // Canvas refs - separate static and dynamic layers for performance
  const staticCanvasRef = useRef(null);
  const dynamicCanvasRef = useRef(null);
  const timeSeriesCanvasRef = useRef(null);

  // Transform refs for coordinate conversion
  const phaseTransformRef = useRef(null);
  const timeSeriesTransformRef = useRef(null);

  // Animation state - pure refs, never cause React re-renders
  const animationStateRef = useRef({
    trajectories: [],
    time: 0,
    animationId: null,
    isRunning: false,
    timeSeriesData: [],
    params: { ...uiParams }, // Copy of UI params for animation
  });

  // Update animation parameters when UI changes (only time React affects animation)
  useEffect(() => {
    animationStateRef.current.params = { ...uiParams };
  }, [uiParams]);

  // Display constants
  const smin = 0,
    smax = 50,
    tmin = 0,
    tmax = 50;

  // Vector field computation (only for display, not animation)
  const _vectorField = useMemo(() => {
    const { p, q, beta, delta } = uiParams;
    const gridSize = 12;
    const field = [];

    for (let i = 0; i <= gridSize; i++) {
      for (let j = 0; j <= gridSize; j++) {
        const s = smin + (i / gridSize) * (smax - smin);
        const t = tmin + (j / gridSize) * (tmax - tmin);
        const ds = -delta * s + p * s * t;
        const dt = beta * t - q * s * t;
        const magnitude = Math.sqrt(ds * ds + dt * dt);

        field.push({
          x: s,
          y: t,
          dx: ds,
          dy: dt,
          magnitude,
          normalizedDx: magnitude > 0 ? ds / magnitude : 0,
          normalizedDy: magnitude > 0 ? dt / magnitude : 0,
        });
      }
    }
    return field;
  }, [uiParams]);

  // Equilibrium points
  const _equilibria = useMemo(() => {
    const { p, q, beta, delta } = uiParams;
    const points = [{ x: 0, y: 0, stability: "saddle" }];
    const sEq = beta / q;
    const tEq = delta / p;
    if (sEq > 0 && tEq > 0 && sEq <= smax && tEq <= tmax) {
      points.push({ x: sEq, y: tEq, stability: "stable" });
    }
    return points;
  }, [uiParams]);

  // Static elements drawing function - only redraws when parameters change
  const drawStaticElements = useCallback(
    (canvas, ctx) => {
      const transform = phaseTransformRef.current;
      if (!transform) return;

      const { plotWidth, plotHeight, dataToPixel } = transform;
      const { p, q, beta, delta } = animationStateRef.current.params;

      // Clear canvas
      ctx.clearRect(0, 0, plotWidth, plotHeight);

      // Calculate vector field dynamically
      // 16x16 grid at coordinates 2,5,8,...,47
      const gridCoords = [
        2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35, 38, 41, 44, 47,
      ];
      ctx.strokeStyle = "rgba(150, 150, 150, 0.7)";
      ctx.fillStyle = "rgba(150, 150, 150, 0.7)";
      ctx.lineWidth = 1;

      for (let i = 0; i < gridCoords.length; i++) {
        for (let j = 0; j < gridCoords.length; j++) {
          const s = gridCoords[i];
          const t = gridCoords[j];

          // Only draw vectors in the state space (S >= 0, T >= 0)
          if (s < 0 || t < 0) continue;

          const ds = -delta * s + p * s * t;
          const dt = beta * t - q * s * t;
          const magnitude = Math.sqrt(ds * ds + dt * dt);

          if (magnitude === 0) continue;

          const normalizedDx = ds / magnitude;
          const normalizedDy = dt / magnitude;

          const pos = dataToPixel(s, t);
          const arrowLength = 18;
          const endX = pos.x + normalizedDx * arrowLength;
          const endY = pos.y - normalizedDy * arrowLength;

          ctx.beginPath();
          ctx.moveTo(pos.x, pos.y);
          ctx.lineTo(endX, endY);
          ctx.stroke();

          // Arrowhead
          const angle = Math.atan2(endY - pos.y, endX - pos.x);
          ctx.save();
          ctx.translate(endX, endY);
          ctx.rotate(angle);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(-6, -2);
          ctx.lineTo(-6, 2);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      }

      // Calculate and draw equilibria dynamically
      const equilibriumPoints = [{ x: 0, y: 0, stability: "saddle" }];
      const sEq = beta / q;
      const tEq = delta / p;
      if (sEq > 0 && tEq > 0 && sEq <= smax && tEq <= tmax) {
        equilibriumPoints.push({ x: sEq, y: tEq, stability: "stable" });
      }

      equilibriumPoints.forEach(({ x, y, stability }) => {
        const pos = dataToPixel(x, y);

        ctx.fillStyle = stability === "stable" ? "#2563eb" : "#f59e0b";
        ctx.strokeStyle = stability === "stable" ? "#1d4ed8" : "#d97706";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 6, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "white";
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 2.5, 0, 2 * Math.PI);
        ctx.fill();
      });
    },
    [], // No dependencies - uses current animation parameters
  );

  // Dynamic elements drawing function - redraws every animation frame
  const drawDynamicElements = useCallback(
    (canvas, ctx) => {
      const transform = phaseTransformRef.current;
      if (!transform) return;

      const { plotWidth, plotHeight, dataToPixel } = transform;

      // Clear canvas
      ctx.clearRect(0, 0, plotWidth, plotHeight);

      // Draw trajectories only
      const state = animationStateRef.current;
      state.trajectories.forEach((traj) => {
        if (!traj.trail || traj.trail.length < 2) return;

        ctx.strokeStyle = traj.color;
        ctx.lineWidth = 2;
        ctx.beginPath();

        traj.trail.forEach((point, i) => {
          const pos = dataToPixel(point.x, point.y);
          if (i === 0) ctx.moveTo(pos.x, pos.y);
          else ctx.lineTo(pos.x, pos.y);
        });
        ctx.stroke();

        // Current position
        if (traj.isActive && traj.s !== undefined && traj.t !== undefined) {
          const pos = dataToPixel(traj.s, traj.t);
          ctx.fillStyle = traj.color;
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, 4, 0, 2 * Math.PI);
          ctx.fill();
        }
      });
    },
    [], // No dependencies
  );

  // Redraw static elements when parameters change (whether animating or not)
  useEffect(() => {
    if (staticCanvasRef.current && phaseTransformRef.current) {
      const ctx = staticCanvasRef.current.getContext("2d");
      drawStaticElements(staticCanvasRef.current, ctx);
    }
  }, [
    uiParams.p,
    uiParams.q,
    uiParams.beta,
    uiParams.delta,
    drawStaticElements,
  ]);

  const drawTimeSeries = useCallback((canvas, ctx) => {
    const transform = timeSeriesTransformRef.current;
    if (!transform) return;

    const { plotWidth, plotHeight } = transform;
    const state = animationStateRef.current;

    ctx.clearRect(0, 0, plotWidth, plotHeight);

    if (state.timeSeriesData.length < 2) return;

    // Use sliding window approach - show last 20 time units
    const timeWindow = 20;
    const currentTime = state.time;
    const minTime = Math.max(0, currentTime - timeWindow);
    const maxPop = Math.max(smax, tmax);

    // Helper to convert time series data to pixel coordinates
    const toPixel = (time, value) => {
      const x = ((time - minTime) / timeWindow) * plotWidth;
      const y = plotHeight - (value / maxPop) * plotHeight;
      return { x, y };
    };

    // Draw sharks
    ctx.strokeStyle = "#ff6b35";
    ctx.lineWidth = 2;
    ctx.beginPath();
    let firstPoint = true;
    state.timeSeriesData.forEach((point) => {
      const maxTime = Math.max(timeWindow, currentTime);
      if (point.time >= minTime && point.time <= maxTime) {
        const pos = toPixel(point.time, point.sharks);
        if (firstPoint) {
          ctx.moveTo(pos.x, pos.y);
          firstPoint = false;
        } else {
          ctx.lineTo(pos.x, pos.y);
        }
      }
    });
    ctx.stroke();

    // Draw tuna
    ctx.strokeStyle = "#00d4aa";
    ctx.lineWidth = 2;
    ctx.beginPath();
    firstPoint = true;
    state.timeSeriesData.forEach((point) => {
      const maxTime = Math.max(timeWindow, currentTime);
      if (point.time >= minTime && point.time <= maxTime) {
        const pos = toPixel(point.time, point.tuna);
        if (firstPoint) {
          ctx.moveTo(pos.x, pos.y);
          firstPoint = false;
        } else {
          ctx.lineTo(pos.x, pos.y);
        }
      }
    });
    ctx.stroke();
  }, []);

  // Animation loop - completely independent of React
  const animationLoop = useCallback(() => {
    const state = animationStateRef.current;
    if (!state.isRunning) return;

    const { p, q, beta, delta, speed } = state.params;
    if (speed === 0) {
      state.animationId = requestAnimationFrame(animationLoop);
      return;
    }

    const h = 0.05 * speed;

    // Update trajectories
    state.trajectories = state.trajectories.map((traj) => {
      if (!traj.isActive) return traj;

      const f = (s, t) => [-delta * s + p * s * t, beta * t - q * s * t];
      const [s, t] = [traj.s, traj.t];

      // RK4 integration
      const k1 = f(s, t);
      const k2 = f(s + (h * k1[0]) / 2, t + (h * k1[1]) / 2);
      const k3 = f(s + (h * k2[0]) / 2, t + (h * k2[1]) / 2);
      const k4 = f(s + h * k3[0], t + h * k3[1]);

      let newS = Math.max(
        0,
        s + (h / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]),
      );
      let newT = Math.max(
        0,
        t + (h / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]),
      );

      // Constrain to state space boundaries
      newS = Math.max(0, newS);
      newT = Math.max(0, newT);

      const isInBounds = newS <= smax && newT <= tmax;
      const newTrail = [...traj.trail.slice(-150), { x: newS, y: newT }];

      return {
        ...traj,
        s: newS,
        t: newT,
        trail: newTrail,
        isActive: isInBounds,
      };
    });

    state.time += h;

    // Update React time state every ~100ms for UI updates
    if (Math.floor(state.time * 10) !== Math.floor((state.time - h) * 10)) {
      setCurrentTime(state.time);
    }

    // Update time series - keep last 500 points (about 25 time units of data)
    const activeTraj = state.trajectories.find((t) => t.isActive);
    if (activeTraj) {
      state.timeSeriesData = [
        ...state.timeSeriesData.slice(-500),
        {
          time: state.time,
          sharks: activeTraj.s || 0,
          tuna: activeTraj.t || 0,
        },
      ];
    }

    // Draw only dynamic elements (efficient!)
    const dynamicCanvas = dynamicCanvasRef.current;
    const timeCanvas = timeSeriesCanvasRef.current;

    if (dynamicCanvas) {
      const ctx = dynamicCanvas.getContext("2d");
      drawDynamicElements(dynamicCanvas, ctx);
    }

    if (timeCanvas) {
      const ctx = timeCanvas.getContext("2d");
      drawTimeSeries(timeCanvas, ctx);
    }

    state.animationId = requestAnimationFrame(animationLoop);
  }, [drawDynamicElements, drawTimeSeries]);

  // Control functions
  const startAnimation = useCallback(() => {
    if (animationStateRef.current.isRunning) return;

    animationStateRef.current.isRunning = true;
    setIsAnimating(true);
    animationLoop();
  }, [animationLoop]);

  // Canvas click handler
  const handleCanvasClick = useCallback(
    (event) => {
      const canvas = dynamicCanvasRef.current;
      const transform = phaseTransformRef.current;
      if (!canvas || !transform) return;

      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      const { plotWidth, plotHeight, pixelToData } = transform;

      // Only process clicks within the plot area
      if (x < 0 || x > plotWidth || y < 0 || y > plotHeight) return;

      const data = pixelToData(x, y);

      if (data.x < 0 || data.y < 0 || data.x > smax || data.y > tmax) return;

      const colorHues = [0, 120, 240, 60, 300, 180];
      const hue =
        colorHues[
          animationStateRef.current.trajectories.length % colorHues.length
        ];

      const newTrajectory = {
        id: Date.now() + Math.random(),
        s: data.x,
        t: data.y,
        isActive: true,
        color: `hsl(${hue}, 70%, 50%)`,
        trail: [{ x: data.x, y: data.y }],
      };

      animationStateRef.current.trajectories.push(newTrajectory);

      if (animationStateRef.current.trajectories.length === 1) {
        animationStateRef.current.time = 0;
        animationStateRef.current.timeSeriesData = [];
      }

      startAnimation();
    },
    [startAnimation],
  );

  const stopAnimation = useCallback(() => {
    animationStateRef.current.isRunning = false;
    setIsAnimating(false);

    if (animationStateRef.current.animationId) {
      cancelAnimationFrame(animationStateRef.current.animationId);
      animationStateRef.current.animationId = null;
    }
  }, []);

  const resetSimulation = useCallback(() => {
    stopAnimation();
    animationStateRef.current.trajectories = [];
    animationStateRef.current.time = 0;
    animationStateRef.current.timeSeriesData = [];
    setCurrentTime(0);

    // Redraw static elements after clearing
    if (staticCanvasRef.current) {
      const ctx = staticCanvasRef.current.getContext("2d");
      drawStaticElements(staticCanvasRef.current, ctx);
    }

    if (timeSeriesCanvasRef.current) {
      const ctx = timeSeriesCanvasRef.current.getContext("2d");
      ctx.clearRect(
        0,
        0,
        timeSeriesCanvasRef.current.width,
        timeSeriesCanvasRef.current.height,
      );
    }
  }, [stopAnimation, drawStaticElements]);

  const updateParam = useCallback((param, value) => {
    // Use callback to avoid re-renders
    setUiParams((prev) => ({ ...prev, [param]: value }));
  }, []);

  const killPopulation = useCallback((species, amount = 10) => {
    animationStateRef.current.trajectories =
      animationStateRef.current.trajectories.map((traj) => {
        if (!traj.isActive) return traj;

        const newS =
          species === "sharks" ? Math.max(0, traj.s - amount) : traj.s;
        const newT = species === "tuna" ? Math.max(0, traj.t - amount) : traj.t;

        return {
          ...traj,
          s: newS,
          t: newT,
          trail: [...traj.trail, { x: newS, y: newT }],
        };
      });
  }, []);

  // Draw static elements when transform becomes available
  useEffect(() => {
    if (staticCanvasRef.current && phaseTransformRef.current) {
      const ctx = staticCanvasRef.current.getContext("2d");
      drawStaticElements(staticCanvasRef.current, ctx);
    }
  }, [drawStaticElements]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAnimation();
    };
  }, [stopAnimation]);

  return (
    <ToolContainer
      title="Shark-Tuna Population Dynamics"
      canvasWidth={11}
      canvasHeight={7}
    >
      {/* Main Phase Portrait */}
      <GridGraph
        x={0}
        y={0}
        w={5}
        h={5}
        xLabel="Shark Population (S)"
        yLabel="Tuna Population (T)"
        xRange={[smin, smax]}
        yRange={[tmin, tmax]}
        xTicks={[0, 10, 20, 30, 40, 50]}
        yTicks={[0, 10, 20, 30, 40, 50]}
        theme={theme}
        tooltip="Click to start a trajectory from that point"
      >
        {(transform) => {
          phaseTransformRef.current = transform;
          const { plotWidth, plotHeight, plotStyle } = transform;
          return (
            <>
              {/* Static background layer - vector field and equilibrium points */}
              <canvas
                ref={staticCanvasRef}
                className="absolute pointer-events-none"
                style={plotStyle}
                width={plotWidth}
                height={plotHeight}
              />

              {/* Dynamic foreground layer - trajectories and moving points */}
              <canvas
                ref={dynamicCanvasRef}
                className="absolute cursor-crosshair"
                style={plotStyle}
                width={plotWidth}
                height={plotHeight}
                onClick={handleCanvasClick}
              />
            </>
          );
        }}
      </GridGraph>

      {/* Time Series Plot */}
      <GridGraph
        x={0}
        y={5}
        w={5}
        h={2}
        xLabel="Time"
        yLabel="Population"
        xRange={[Math.max(0, currentTime - 20), Math.max(20, currentTime)]}
        yRange={[0, Math.max(smax, tmax)]}
        xTicks={[]}
        yTicks={[0, 10, 20, 30, 40, 50]}
        theme={theme}
        tooltip="Population dynamics over time"
      >
        {(transform) => {
          timeSeriesTransformRef.current = transform;
          const { plotWidth, plotHeight, plotStyle } = transform;
          return (
            <canvas
              ref={timeSeriesCanvasRef}
              style={plotStyle}
              width={plotWidth}
              height={plotHeight}
            />
          );
        }}
      </GridGraph>

      {/* Parameter Controls */}
      <GridSliderHorizontal
        x={5}
        y={0}
        w={3}
        h={1}
        value={uiParams.p * 1000}
        onChange={(value) => updateParam("p", value / 1000)}
        variant="unipolar"
        label={`Predation Coefficient (p): ${uiParams.p.toFixed(4)}`}
        theme={theme}
      />

      <GridSliderHorizontal
        x={5}
        y={1}
        w={3}
        h={1}
        value={uiParams.q * 250}
        onChange={(value) => updateParam("q", value / 250)}
        variant="unipolar"
        label={`Consumption Rate (q): ${uiParams.q.toFixed(4)}`}
        theme={theme}
      />

      <GridSliderHorizontal
        x={5}
        y={2}
        w={3}
        h={1}
        value={uiParams.beta * 50}
        onChange={(value) => updateParam("beta", value / 50)}
        variant="unipolar"
        label={`Tuna Growth Rate (β): ${uiParams.beta.toFixed(2)}`}
        theme={theme}
      />

      <GridSliderHorizontal
        x={5}
        y={3}
        w={3}
        h={1}
        value={uiParams.delta * 100}
        onChange={(value) => updateParam("delta", value / 100)}
        variant="unipolar"
        label={`Shark Death Rate (δ): ${uiParams.delta.toFixed(2)}`}
        theme={theme}
      />

      {/* Speed Control */}
      <GridSliderHorizontal
        x={5}
        y={4}
        w={3}
        h={1}
        value={uiParams.speed * 25}
        onChange={(value) => updateParam("speed", value / 25)}
        variant="unipolar"
        label={`Animation Speed: ${uiParams.speed.toFixed(1)}x`}
        theme={theme}
      />

      {/* Equations Display */}
      <GridDisplay
        x={8}
        y={0}
        w={3}
        h={2}
        variant="info"
        align="center"
        fontSize="medium"
        theme={theme}
      >
        <div style={{ textAlign: "center", lineHeight: "2.0" }}>
          <div
            style={{
              fontWeight: "bold",
              marginBottom: "15px",
              color: "#ff6b35",
              fontSize: "1.1em",
            }}
          >
            Lotka-Volterra Model
          </div>
          <div style={{ marginBottom: "0px", lineHeight: "1.2" }}>
            <Equation name="lotka-volterra-predator" size="medium" />
          </div>
          <div>
            <Equation name="lotka-volterra-prey" size="medium" />
          </div>
        </div>
      </GridDisplay>

      {/* Equilibrium Display */}
      <GridDisplay
        x={8}
        y={2}
        w={3}
        h={2}
        variant="status"
        align="center"
        fontSize="small"
        theme={theme}
      >
        <div style={{ textAlign: "center", lineHeight: "1.4" }}>
          <div style={{ fontWeight: "bold", marginBottom: "6px" }}>
            Equilibrium Point
          </div>
          <div
            style={{
              marginBottom: "4px",
              fontSize: "0.9em",
              whiteSpace: "nowrap",
            }}
          >
            <Equation
              name="equilibrium-s"
              size="small"
              style={{ marginRight: "4px" }}
            />
            {(uiParams.beta / uiParams.q).toFixed(1)}
          </div>
          <div style={{ fontSize: "0.9em", whiteSpace: "nowrap" }}>
            <Equation
              name="equilibrium-t"
              size="small"
              style={{ marginRight: "4px" }}
            />
            {(uiParams.delta / uiParams.p).toFixed(1)}
          </div>
        </div>
      </GridDisplay>

      {/* Control Buttons */}
      <GridButton
        x={8}
        y={4}
        w={1}
        h={1}
        onPress={resetSimulation}
        variant="default"
        theme={theme}
      >
        Reset
      </GridButton>

      <GridButton
        x={9}
        y={4}
        w={1}
        h={1}
        onPress={() => killPopulation("tuna", 10)}
        variant="default"
        theme={theme}
      >
        <div style={{ textAlign: "center", lineHeight: "1.1" }}>
          <div>Kill</div>
          <div>10</div>
          <div>Tuna</div>
        </div>
      </GridButton>

      <GridButton
        x={10}
        y={4}
        w={1}
        h={1}
        onPress={() => killPopulation("sharks", 10)}
        variant="default"
        theme={theme}
      >
        <div style={{ textAlign: "center", lineHeight: "1.1" }}>
          <div>Kill</div>
          <div>10</div>
          <div>Sharks</div>
        </div>
      </GridButton>

      {/* Status Display */}
      <GridDisplay
        x={5}
        y={5}
        w={6}
        h={2}
        variant="info"
        align="left"
        fontSize="small"
        theme={theme}
      >
        <div style={{ padding: "4px" }}>
          <div style={{ fontWeight: "bold", marginBottom: "4px" }}>
            Simulation Status
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: "8px",
              fontSize: "0.85em",
            }}
          >
            <div>
              Active Trajectories:{" "}
              {
                animationStateRef.current.trajectories.filter((t) => t.isActive)
                  .length
              }
            </div>
            <div>Current Time: {currentTime.toFixed(1)}</div>
            <div>Animation: {isAnimating ? "Running" : "Stopped"}</div>
          </div>
          <div style={{ marginTop: "4px", fontSize: "0.8em", opacity: 0.8 }}>
            Click on the phase portrait to add trajectory starting points.
            Adjust parameters to see different population dynamics.
          </div>
        </div>
      </GridDisplay>
    </ToolContainer>
  );
};

export default SharkTunaTrajectoryTool;
