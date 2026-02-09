import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  GridSliderHorizontal,
  GridButton,
  GridWindow,
  GridDisplay,
} from "../components/grid";
import ToolContainer from "../components/ui/ToolContainer";
import { useTheme } from "../hooks/useTheme";

// Box-Muller transform for Gaussian random numbers
function gaussianRandom(mean, stdev) {
  const u = 1 - Math.random();
  const v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return z * stdev + mean;
}

const SIMULATION_STEPS = 350;

function computeStatistics(stateHistory) {
  let timeOpen = 0;
  let timeClosed = 0;
  let openBlocks = [];
  let currentBlockLength = 0;
  let previousState = null;

  stateHistory.forEach((state) => {
    if (state === 1) {
      timeOpen++;
      if (previousState === 1) {
        currentBlockLength++;
      } else {
        currentBlockLength = 1;
      }
    } else {
      timeClosed++;
      if (previousState === 1 && currentBlockLength > 0) {
        openBlocks.push(currentBlockLength);
        currentBlockLength = 0;
      }
    }
    previousState = state;
  });

  if (currentBlockLength > 0) {
    openBlocks.push(currentBlockLength);
  }

  const avgOpenTime =
    openBlocks.length > 0
      ? openBlocks.reduce((a, b) => a + b, 0) / openBlocks.length
      : 0;

  return { timeOpen, timeClosed, avgOpenTime };
}

const IonChannelSimulatorTool = () => {
  const { theme, currentTheme } = useTheme();

  const canvasRef = useRef(null);

  // Parameters
  const [probOpenToClosed, setProbOpenToClosed] = useState(0.05);
  const [probClosedToOpen, setProbClosedToOpen] = useState(0.05);

  // Results
  const [stats, setStats] = useState(null);
  const [hasSimulated, setHasSimulated] = useState(false);

  // Store trace data for redrawing on theme change
  const traceDataRef = useRef(null);

  // Layout constants for the custom patch clamp display
  // These define the drawing regions within the canvas
  const layout = {
    plotLeft: 40,
    plotRight: 95, // space for right y-axis + label
    plotBottom: 45, // gap between plot and time axis + label
  };

  const drawAxesAndGrid = useCallback(
    (canvas, ctx) => {
      const w = canvas.width;
      const h = canvas.height;
      const { plotLeft, plotRight, plotBottom } = layout;

      const plotW = w - plotLeft - plotRight;
      // Square grid: pixels per 10ms = pixels per 0.5pA
      // pixPer10ms = plotW / 35, pixPer05pA = plotH / 4
      // plotW / 35 = plotH / 4  =>  plotH = 4 * plotW / 35
      const plotH = Math.round((4 * plotW) / 35);
      const plotTop =
        Math.max(10, Math.round((h - plotBottom - plotH) / 2)) + 12;

      const isDark = currentTheme === "dark";
      const axisColor = isDark ? "#ffffff" : "#000000";
      const gridColor = isDark ? "#4b5563" : "#c0c0c0";
      const textColor = isDark ? "#ffffff" : "#000000";

      // Clear with solid background to override GridWindow gradient
      ctx.fillStyle = isDark ? "#111827" : "#ffffff";
      ctx.fillRect(0, 0, w, h);

      // Grid lines (horizontal at 0, 0.5, 1.0, 1.5, 2.0 pA)
      ctx.strokeStyle = gridColor;
      ctx.lineWidth = 0.5;
      for (let pA = 0; pA <= 2; pA += 0.5) {
        const y = plotTop + (pA / 2) * plotH; // 0 at top, 2 at bottom
        ctx.beginPath();
        ctx.moveTo(plotLeft, y);
        ctx.lineTo(plotLeft + plotW, y);
        ctx.stroke();
      }

      // Grid lines (vertical every 10 ms)
      for (let ms = 0; ms <= SIMULATION_STEPS; ms += 10) {
        const x = plotLeft + (ms / SIMULATION_STEPS) * plotW;
        ctx.beginPath();
        ctx.moveTo(x, plotTop);
        ctx.lineTo(x, plotTop + plotH);
        ctx.stroke();
      }

      // Right Y-axis line
      ctx.strokeStyle = axisColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(plotLeft + plotW + 8, plotTop);
      ctx.lineTo(plotLeft + plotW + 8, plotTop + plotH);
      ctx.stroke();

      // Right Y-axis ticks and labels (0, 0.5, 1, 1.5, 2)
      ctx.fillStyle = textColor;
      ctx.font = "11px monospace";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      for (let pA = 0; pA <= 2; pA += 0.5) {
        const y = plotTop + (pA / 2) * plotH;
        // Tick mark
        ctx.beginPath();
        ctx.moveTo(plotLeft + plotW + 4, y);
        ctx.lineTo(plotLeft + plotW + 12, y);
        ctx.stroke();
        // Label
        ctx.fillText(
          pA % 1 === 0 ? pA.toString() : pA.toFixed(1),
          plotLeft + plotW + 15,
          y,
        );
      }

      // Right Y-axis label "Current (pA)" rotated
      ctx.save();
      ctx.translate(plotLeft + plotW + 58, plotTop + plotH / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = "center";
      ctx.font = "12px monospace";
      ctx.fillStyle = textColor;
      ctx.fillText("Current (pA)", 0, 0);
      ctx.restore();

      // Time axis (horizontal line below the plot with a gap)
      const timeAxisY = h - 20;
      ctx.strokeStyle = axisColor;
      ctx.lineWidth = 1.5;
      const arrowTip = plotLeft + (360 / SIMULATION_STEPS) * plotW;
      ctx.beginPath();
      ctx.moveTo(plotLeft, timeAxisY);
      ctx.lineTo(arrowTip, timeAxisY);
      ctx.stroke();

      // Time axis arrow
      ctx.beginPath();
      ctx.moveTo(arrowTip, timeAxisY);
      ctx.lineTo(arrowTip - 7, timeAxisY - 3);
      ctx.lineTo(arrowTip - 7, timeAxisY + 3);
      ctx.closePath();
      ctx.fillStyle = axisColor;
      ctx.fill();

      // Time axis ticks and labels
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.font = "11px monospace";
      ctx.fillStyle = textColor;
      for (let ms = 0; ms <= SIMULATION_STEPS; ms += 50) {
        const x = plotLeft + (ms / SIMULATION_STEPS) * plotW;
        // Tick
        ctx.beginPath();
        ctx.moveTo(x, timeAxisY - 4);
        ctx.lineTo(x, timeAxisY + 4);
        ctx.stroke();
        // Label
        ctx.fillText(ms.toString(), x, timeAxisY + 6);
      }

      // Time axis label - "Time" inline with axis, "(ms)" below
      ctx.font = "12px monospace";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText("Time", plotLeft + plotW + 28, timeAxisY);
      ctx.textBaseline = "top";
      ctx.fillText("(ms)", plotLeft + plotW + 28, timeAxisY + 6);
    },
    [currentTheme],
  );

  const drawTrace = useCallback(
    (canvas, ctx, traceData) => {
      const w = canvas.width;
      const h = canvas.height;
      const { plotLeft, plotRight, plotBottom } = layout;

      const plotW = w - plotLeft - plotRight;
      const plotH = Math.round((4 * plotW) / 35);
      const plotTop =
        Math.max(10, Math.round((h - plotBottom - plotH) / 2)) + 12;

      const isDark = currentTheme === "dark";
      ctx.strokeStyle = isDark ? "#5b9ef5" : "#0055cc";
      ctx.lineWidth = 1;
      ctx.beginPath();

      traceData.forEach((point, index) => {
        const x = plotLeft + (point.time / SIMULATION_STEPS) * plotW;
        // Inverted: 0 pA at top, 2 pA at bottom (matching grid lines)
        const y = plotTop + (point.current / 2) * plotH;

        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.stroke();
    },
    [currentTheme],
  );

  const drawAll = useCallback(
    (traceData) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.parentElement.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;

      const ctx = canvas.getContext("2d");
      drawAxesAndGrid(canvas, ctx);

      if (traceData && traceData.length > 0) {
        drawTrace(canvas, ctx, traceData);
      }
    },
    [drawAxesAndGrid, drawTrace],
  );

  // Redraw on theme change
  useEffect(() => {
    drawAll(traceDataRef.current);
  }, [drawAll]);

  // Initialize canvas
  useEffect(() => {
    drawAll(null);
  }, []);

  // Run simulation
  const simulate = useCallback(() => {
    let currentState = 0; // Start closed
    const stateHistory = [];
    const traceData = [];

    for (let step = 0; step < SIMULATION_STEPS; step++) {
      let current;
      if (currentState === 0) {
        current = gaussianRandom(0, 0.2);
        if (Math.random() < probClosedToOpen) {
          currentState = 1;
        }
      } else {
        current = gaussianRandom(2, 0.2);
        if (Math.random() < probOpenToClosed) {
          currentState = 0;
        }
      }

      stateHistory.push(currentState);
      traceData.push({ time: step, current });
    }

    const newStats = computeStatistics(stateHistory);
    setStats(newStats);
    setHasSimulated(true);
    traceDataRef.current = traceData;
    drawAll(traceData);
  }, [probOpenToClosed, probClosedToOpen, drawAll]);

  // Reset
  const handleReset = useCallback(() => {
    setStats(null);
    setHasSimulated(false);
    traceDataRef.current = null;
    drawAll(null);
  }, [drawAll]);

  return (
    <ToolContainer
      title="Ion Channel Simulator"
      canvasWidth={10}
      canvasHeight={4}
    >
      {/* Patch Clamp Recording - Custom Canvas in GridWindow */}
      <GridWindow
        x={0}
        y={0}
        w={10}
        h={2}
        variant="rectangular"
        tooltip="Patch clamp recording"
        theme={theme}
      >
        <canvas
          ref={canvasRef}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
          }}
        />
      </GridWindow>

      {/* P(Open → Closed) slider */}
      <GridSliderHorizontal
        x={0}
        y={2}
        w={3}
        h={1}
        value={probOpenToClosed * 100}
        onChange={(value) => setProbOpenToClosed(value / 100)}
        variant="unipolar"
        label={`P(Open→Closed) = ${probOpenToClosed.toFixed(2)}`}
        tooltip="Probability of transitioning from open to closed each ms"
        theme={theme}
      />

      {/* P(Closed → Open) slider */}
      <GridSliderHorizontal
        x={0}
        y={3}
        w={3}
        h={1}
        value={probClosedToOpen * 100}
        onChange={(value) => setProbClosedToOpen(value / 100)}
        variant="unipolar"
        label={`P(Closed→Open) = ${probClosedToOpen.toFixed(2)}`}
        tooltip="Probability of transitioning from closed to open each ms"
        theme={theme}
      />

      {/* Simulate Button */}
      <GridButton
        x={3}
        y={2}
        type="momentary"
        onPress={simulate}
        tooltip="Run simulation"
        theme={theme}
      >
        <div style={{ textAlign: "center", lineHeight: "1.1" }}>
          <div>Simulate</div>
        </div>
      </GridButton>

      {/* Clear Button */}
      <GridButton
        x={3}
        y={3}
        type="momentary"
        variant="function"
        onPress={handleReset}
        tooltip="Clear trace and results"
        theme={theme}
      >
        <div style={{ textAlign: "center", lineHeight: "1.1" }}>
          <div>Clear</div>
        </div>
      </GridButton>

      {/* Combined Info & Results Display */}
      <GridDisplay
        x={4}
        y={2}
        w={6}
        h={2}
        variant="info"
        align="left"
        fontSize="small"
        theme={theme}
      >
        <div style={{ padding: "4px" }}>
          <div style={{ fontSize: "0.85em", marginBottom: "4px" }}>
            <strong>Closed</strong> ⇌ <strong>Open</strong> (two-state Markov
            channel)
          </div>
          <div
            style={{ fontSize: "0.85em", opacity: 0.8, marginBottom: "6px" }}
          >
            Closed: 0 pA | Open: 2 pA | Noise σ = 0.2 pA
          </div>
          {hasSimulated && stats ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: "8px",
                fontSize: "0.85em",
              }}
            >
              <div>
                <strong>Time open:</strong> {stats.timeOpen} ms
              </div>
              <div>
                <strong>Time closed:</strong> {stats.timeClosed} ms
              </div>
              <div>
                <strong>Avg open:</strong> {stats.avgOpenTime.toFixed(2)} ms
              </div>
            </div>
          ) : (
            <div style={{ fontSize: "0.85em", opacity: 0.6 }}>
              Click Simulate to run
            </div>
          )}
        </div>
      </GridDisplay>
    </ToolContainer>
  );
};

export default IonChannelSimulatorTool;
