import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  GridSliderHorizontal,
  GridButton,
  GridWindow,
  GridDisplay,
} from "../components/grid";
import ToolContainer from "../components/ui/ToolContainer";
import { useTheme } from "../hooks/useTheme";
import { setupCanvas } from "../utils/canvas";
import { randomNormal } from "../utils/random";

const SIMULATION_STEPS = 350; // 1 ms per step

// Layout constants for the custom patch clamp display (CSS pixels)
const LAYOUT = {
  plotLeft: 40,
  plotRight: 95, // space for right y-axis + label
  plotBottom: 45, // gap between plot and time axis + label
};

// Open channel: 2 pA of inward current, which by convention is negative and
// is drawn downward (as in the lab manual's patch-clamp figure).
const OPEN_CURRENT = -2;
const NOISE_SD = 0.2;

/**
 * Simulate the two-state channel for `steps` ms. The state recorded for each
 * millisecond is the state that produced that millisecond's current, and the
 * transition (if any) happens at the end of the millisecond. Starts closed.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function simulateChannel(pOpenToClosed, pClosedToOpen, steps, rng = Math.random) {
  let state = 0; // 0 = closed, 1 = open
  const states = [];
  const trace = [];
  for (let t = 0; t < steps; t++) {
    const mean = state === 1 ? OPEN_CURRENT : 0;
    trace.push({ time: t, current: randomNormal(mean, NOISE_SD, rng) });
    states.push(state);
    if (state === 0) {
      if (rng() < pClosedToOpen) state = 1;
    } else if (rng() < pOpenToClosed) {
      state = 0;
    }
  }
  return { states, trace };
}

/** Time open/closed (ms), mean length of open and closed episodes, fraction open. */
// eslint-disable-next-line react-refresh/only-export-components
export function computeStatistics(stateHistory) {
  const blocks = { 0: [], 1: [] };
  let runState = null;
  let runLength = 0;
  stateHistory.forEach((state) => {
    if (state === runState) {
      runLength++;
    } else {
      if (runState !== null) blocks[runState].push(runLength);
      runState = state;
      runLength = 1;
    }
  });
  if (runState !== null) blocks[runState].push(runLength);

  const mean = (arr) =>
    arr.length > 0 ? arr.reduce((x, y) => x + y, 0) / arr.length : 0;
  const timeOpen = stateHistory.filter((st) => st === 1).length;
  const timeClosed = stateHistory.length - timeOpen;
  return {
    timeOpen,
    timeClosed,
    avgOpenTime: mean(blocks[1]),
    avgClosedTime: mean(blocks[0]),
    fractionOpen: stateHistory.length > 0 ? timeOpen / stateHistory.length : 0,
  };
}

/** Long-run fraction of time open: P(C→O) / (P(C→O) + P(O→C)). */
// eslint-disable-next-line react-refresh/only-export-components
export function theoreticalOpenFraction(pOpenToClosed, pClosedToOpen) {
  const total = pOpenToClosed + pClosedToOpen;
  return total > 0 ? pClosedToOpen / total : null;
}

/** Plot geometry for a canvas of the given CSS size. */
function plotGeometry(w, h) {
  const { plotLeft, plotRight, plotBottom } = LAYOUT;
  const plotW = w - plotLeft - plotRight;
  // Square grid: pixels per 10 ms = pixels per 0.5 pA
  // plotW / 35 = plotH / 4  =>  plotH = 4 * plotW / 35
  const plotH = Math.round((4 * plotW) / 35);
  const plotTop = Math.max(10, Math.round((h - plotBottom - plotH) / 2)) + 12;
  return { plotLeft, plotW, plotH, plotTop };
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
  const [showTheory, setShowTheory] = useState(false);

  // Store trace data for redrawing on theme change
  const traceDataRef = useRef(null);

  const drawAxesAndGrid = useCallback(
    (ctx, w, h) => {
      const { plotLeft, plotW, plotH, plotTop } = plotGeometry(w, h);

      const isDark = currentTheme === "dark";
      const axisColor = isDark ? "#ffffff" : "#000000";
      const gridColor = isDark ? "#4b5563" : "#c0c0c0";
      const textColor = isDark ? "#ffffff" : "#000000";

      // Clear with solid background to override GridWindow gradient
      ctx.fillStyle = isDark ? "#111827" : "#ffffff";
      ctx.fillRect(0, 0, w, h);

      // Grid lines (horizontal at 0, -0.5, -1, -1.5, -2 pA; 0 at top)
      ctx.strokeStyle = gridColor;
      ctx.lineWidth = 0.5;
      for (let k = 0; k <= 4; k++) {
        const y = plotTop + (k / 4) * plotH;
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

      // Right Y-axis ticks and labels (0, -0.5, -1, -1.5, -2): inward
      // current is negative and plotted downward
      ctx.fillStyle = textColor;
      ctx.font = "11px monospace";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      for (let k = 0; k <= 4; k++) {
        const y = plotTop + (k / 4) * plotH;
        // Tick mark
        ctx.beginPath();
        ctx.moveTo(plotLeft + plotW + 4, y);
        ctx.lineTo(plotLeft + plotW + 12, y);
        ctx.stroke();
        // Label
        ctx.fillText(
          k === 0 ? "0" : `\u2212${(k * 0.5).toFixed(k % 2 === 0 ? 0 : 1)}`,
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
    (ctx, w, h, traceData) => {
      const { plotLeft, plotW, plotH, plotTop } = plotGeometry(w, h);

      const isDark = currentTheme === "dark";
      ctx.strokeStyle = isDark ? "#5b9ef5" : "#0055cc";
      ctx.lineWidth = 1;
      ctx.beginPath();

      traceData.forEach((point, index) => {
        const x = plotLeft + (point.time / SIMULATION_STEPS) * plotW;
        // 0 pA at the top, -2 pA (open) at the bottom
        const y = plotTop + (point.current / OPEN_CURRENT) * plotH;

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
      const setup = setupCanvas(canvasRef.current);
      if (!setup) return;
      const { ctx, width, height } = setup;
      drawAxesAndGrid(ctx, width, height);
      if (traceData && traceData.length > 0) {
        drawTrace(ctx, width, height, traceData);
      }
    },
    [drawAxesAndGrid, drawTrace],
  );

  // Draw on mount and redraw on theme change
  useEffect(() => {
    drawAll(traceDataRef.current);
  }, [drawAll]);

  // Run simulation
  const simulate = useCallback(() => {
    const { states, trace } = simulateChannel(
      probOpenToClosed,
      probClosedToOpen,
      SIMULATION_STEPS,
    );
    setStats({
      ...computeStatistics(states),
      pOC: probOpenToClosed,
      pCO: probClosedToOpen,
    });
    setHasSimulated(true);
    traceDataRef.current = trace;
    drawAll(trace);
  }, [probOpenToClosed, probClosedToOpen, drawAll]);

  // Reset
  const handleReset = useCallback(() => {
    setStats(null);
    setHasSimulated(false);
    traceDataRef.current = null;
    drawAll(null);
  }, [drawAll]);

  const paramsChanged =
    stats && (stats.pOC !== probOpenToClosed || stats.pCO !== probClosedToOpen);
  const theoryOpen = stats ? theoreticalOpenFraction(stats.pOC, stats.pCO) : null;

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
            Closed: 0 pA | Open: 2 pA inward (plotted down as −2 pA) |
            Noise σ = 0.2 pA
          </div>
          {hasSimulated && stats ? (
            <>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: "4px 8px",
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
                  <strong>Fraction open:</strong>{" "}
                  {(stats.fractionOpen * 100).toFixed(1)}%
                </div>
                <div>
                  <strong>Avg open:</strong> {stats.avgOpenTime.toFixed(2)} ms
                </div>
                <div>
                  <strong>Avg closed:</strong> {stats.avgClosedTime.toFixed(2)}{" "}
                  ms
                </div>
                <div>
                  {showTheory ? (
                    <span>
                      <strong>Theory P(open):</strong>{" "}
                      {theoryOpen === null
                        ? "—"
                        : `${(theoryOpen * 100).toFixed(1)}%`}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowTheory(true)}
                      style={{
                        font: "inherit",
                        textDecoration: "underline",
                        background: "none",
                        border: "none",
                        padding: 0,
                        color: "inherit",
                        cursor: "pointer",
                        opacity: 0.8,
                      }}
                      title="Show the long-run fraction of time open, P(C→O) / (P(C→O) + P(O→C))"
                    >
                      Show theory
                    </button>
                  )}
                </div>
              </div>
              {paramsChanged && (
                <div style={{ fontSize: "0.75em", opacity: 0.7, marginTop: "4px" }}>
                  Results are for P(O→C) = {stats.pOC.toFixed(2)}, P(C→O) ={" "}
                  {stats.pCO.toFixed(2)}. Click Simulate for the new values.
                </div>
              )}
            </>
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
