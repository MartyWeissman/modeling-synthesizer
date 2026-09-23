// src/tools/ThreeCompartmentMatrixTool.jsx

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  GridLabel,
  GridInput,
  GridButton,
  GridDisplay,
  GridGraph,
  GridTextInput,
} from "../components/grid";
import ToolContainer from "../components/ui/ToolContainer";
import { useTheme } from "../hooks/useTheme";
import { useAnimationLoop } from "../hooks/useAnimationLoop";
import { setupCanvas } from "../utils/canvas";
import { niceStep, linearTicks } from "../utils/ticks";

// Default matrix: M[i][j] = rate/fraction from compartment j to compartment i
const DEFAULT_MATRIX = [
  [0.7, 0.1, 0.05],
  [0.2, 0.8, 0.1],
  [0.1, 0.1, 0.85],
];

const DEFAULT_NAMES = ["A", "B", "C"];
const DEFAULT_POPS = [100, 50, 50];
const MAX_STEPS = 100;
// Run advances one time step every STEP_INTERVAL_S seconds (real time, so the
// speed does not depend on the display's refresh rate).
const STEP_INTERVAL_S = 0.3;
const MIN_X_SPAN = 10; // the time axis always shows at least steps 0-10

// Colors for the three compartments (light / dark / unicorn)
const COMP_COLORS = {
  light: ["#dc2626", "#2563eb", "#16a34a"],
  dark: ["#f87171", "#60a5fa", "#4ade80"],
  unicorn: ["#e11d48", "#7c3aed", "#0891b2"],
};
// Marker shape per compartment, so the series differ by more than color
const MARKERS = ["circle", "square", "triangle"];

// Matrix-vector multiply: new = M * old
const stepSimulation = (v, mat) => {
  const next = [0, 0, 0];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      next[i] += (Number(mat[i][j]) || 0) * v[j];
    }
  }
  return next;
};

const sum3 = (v) => v[0] + v[1] + v[2];

// Compact population formatter
const fmtPop = (v) => {
  if (!Number.isFinite(v)) return "—";
  const a = Math.abs(v);
  if (a >= 1e6) return v.toExponential(2);
  if (a >= 100 || a === 0) return String(Math.round(v));
  return String(parseFloat(v.toPrecision(3)));
};

// Nice axis covering [lo, hi] whose ends are ticks
const niceAxis = (lo, hi, count) => {
  if (!(hi > lo)) hi = lo + 1;
  const step = niceStep(lo, hi, count);
  const min = Math.floor(lo / step + 1e-9) * step;
  const max = Math.ceil(hi / step - 1e-9) * step;
  return { range: [min, max], ticks: linearTicks(min, max, step) };
};

const drawMarker = (ctx, shape, x, y, color, r = 5) => {
  ctx.fillStyle = color;
  ctx.beginPath();
  if (shape === "square") {
    ctx.rect(x - r * 0.85, y - r * 0.85, r * 1.7, r * 1.7);
  } else if (shape === "triangle") {
    ctx.moveTo(x, y - r * 1.1);
    ctx.lineTo(x + r, y + r * 0.8);
    ctx.lineTo(x - r, y + r * 0.8);
    ctx.closePath();
  } else {
    ctx.arc(x, y, r, 0, Math.PI * 2);
  }
  ctx.fill();
};

// Small legend swatch: colored line with the series marker in the middle
const Swatch = ({ color, shape, dashed = false }) => (
  <svg width="24" height="10" style={{ flexShrink: 0 }} aria-hidden="true">
    <line
      x1="0"
      y1="5"
      x2="24"
      y2="5"
      stroke={color}
      strokeWidth={dashed ? 2 : 2.5}
      strokeDasharray={dashed ? "6 3" : undefined}
    />
    {shape === "circle" && <circle cx="12" cy="5" r="3.5" fill={color} />}
    {shape === "square" && <rect x="9" y="2" width="6" height="6" fill={color} />}
    {shape === "triangle" && <polygon points="12,1 16,8.5 8,8.5" fill={color} />}
  </svg>
);

const ThreeCompartmentMatrixTool = () => {
  const { theme, currentTheme } = useTheme();

  // ── UI State ──────────────────────────────────────────────────────────────
  const [matrix, setMatrix] = useState(DEFAULT_MATRIX.map((r) => [...r]));
  const [names, setNames] = useState([...DEFAULT_NAMES]);
  const [pops, setPops] = useState([...DEFAULT_POPS]);

  const [isRunning, setIsRunning] = useState(false);
  // Bumped whenever the simulation state in simRef changes (triggers redraw)
  const [simVersion, setSimVersion] = useState(0);
  const bump = useCallback(() => setSimVersion((v) => v + 1), []);

  // ── Canvas / simulation refs ──────────────────────────────────────────────
  const tsCanvasRef = useRef(null);
  const transformRef = useRef(null);
  // The matrix used for each new step is always the one currently entered.
  const matrixRef = useRef(matrix);

  const simRef = useRef({
    step: 0,
    pops: [...DEFAULT_POPS],
    history: [[...DEFAULT_POPS]],
    matrixEdits: [], // steps at which the matrix was edited mid-run
    acc: 0, // time accumulated toward the next step while running (s)
    message: "", // e.g. overflow notice
  });

  // ── Helpers ───────────────────────────────────────────────────────────────
  const updateMatrix = (row, col, value) => {
    setMatrix((prev) => {
      const m = prev.map((r) => [...r]);
      m[row][col] = value;
      return m;
    });
  };

  const updateName = (idx, value) => {
    setNames((prev) => {
      const n = [...prev];
      n[idx] = value;
      return n;
    });
  };

  const updatePop = (idx, value) => {
    setPops((prev) => {
      const p = [...prev];
      p[idx] = value;
      return p;
    });
  };

  // Matrix edits take effect from the next step; remember where they happened
  // so the graph can mark them.
  useEffect(() => {
    matrixRef.current = matrix;
    const sim = simRef.current;
    if (sim.step > 0 && sim.matrixEdits[sim.matrixEdits.length - 1] !== sim.step) {
      sim.matrixEdits.push(sim.step);
      bump();
    }
  }, [matrix, bump]);

  // Before the first step, the starting numbers ARE the t = 0 state.
  useEffect(() => {
    const sim = simRef.current;
    if (sim.step === 0) {
      sim.pops = [...pops];
      sim.history = [[...pops]];
      sim.message = "";
      bump();
    }
  }, [pops, bump]);

  // Column sums (ideally all ≈ 1.0)
  const colSums = [0, 1, 2].map(
    (j) =>
      (Number(matrix[0][j]) || 0) +
      (Number(matrix[1][j]) || 0) +
      (Number(matrix[2][j]) || 0),
  );

  // ── Axes (from the current history) ───────────────────────────────────────
  const axes = useMemo(() => {
    const { history } = simRef.current;
    let lo = 0;
    let hi = 0;
    history.forEach((snap) => {
      [...snap, sum3(snap)].forEach((v) => {
        if (Number.isFinite(v)) {
          if (v < lo) lo = v;
          if (v > hi) hi = v;
        }
      });
    });
    if (hi === lo) hi = lo + 100;
    const y = niceAxis(lo, hi + (hi - lo) * 0.05, 5);
    const x = niceAxis(0, Math.max(history.length - 1, MIN_X_SPAN), 10);
    return { x, y };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simVersion]);

  // ── Time-series drawing ───────────────────────────────────────────────────
  const drawTimeSeries = useCallback(() => {
    const canvas = tsCanvasRef.current;
    const transform = transformRef.current;
    if (!canvas || !transform) return;
    const { ctx, width, height } = setupCanvas(canvas, {
      width: transform.plotWidth,
      height: transform.plotHeight,
    });
    ctx.clearRect(0, 0, width, height);

    const { history, matrixEdits } = simRef.current;
    if (history.length < 1) return;
    const isDark = currentTheme === "dark";
    const colors = COMP_COLORS[currentTheme] || COMP_COLORS.light;
    const toPx = (t, v) => transform.dataToPixel(t, v);
    const last = history.length - 1;

    // Markers where the matrix was edited during the run
    if (matrixEdits.length) {
      ctx.save();
      ctx.strokeStyle = isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.4)";
      ctx.fillStyle = ctx.strokeStyle;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.font = "10px sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      matrixEdits.forEach((k) => {
        const { x } = toPx(k, 0);
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
        ctx.fillText("M edited", x + 3, 2);
      });
      ctx.restore();
    }

    const drawSeries = (valueAt, color, lineWidth, dash) => {
      if (history.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineJoin = "round";
      ctx.setLineDash(dash);
      history.forEach((snap, t) => {
        const p = toPx(t, valueAt(snap));
        if (t === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
      ctx.setLineDash([]);
    };

    // Three compartments
    for (let c = 0; c < 3; c++) {
      drawSeries((snap) => snap[c], colors[c], 2.5, []);
      const p = toPx(last, history[last][c]);
      drawMarker(ctx, MARKERS[c], p.x, p.y, colors[c]);
    }

    // Total population — black (light) or white (dark), dashed
    const totalColor = isDark ? "#ffffff" : "#000000";
    drawSeries(sum3, totalColor, 2, [6, 3]);
    const pt = toPx(last, sum3(history[last]));
    drawMarker(ctx, "circle", pt.x, pt.y, totalColor, 4);
  }, [currentTheme]);

  // Redraw after every step, axis change and theme change
  useEffect(() => {
    drawTimeSeries();
  }, [simVersion, axes, drawTimeSeries]);

  // ── Simulation ────────────────────────────────────────────────────────────
  // Advance one step. Returns true if another step is possible.
  const doStep = useCallback(() => {
    const sim = simRef.current;
    if (sim.step >= MAX_STEPS) return false;
    const next = stepSimulation(sim.pops, matrixRef.current);
    if (!next.every(Number.isFinite) || !Number.isFinite(sum3(next))) {
      sim.message = `Stopped at step ${sim.step}: the numbers became too large to compute.`;
      bump();
      return false;
    }
    sim.pops = next;
    sim.step += 1;
    sim.history.push([...next]);
    bump();
    return sim.step < MAX_STEPS;
  }, [bump]);

  const loop = useAnimationLoop((dt) => {
    const sim = simRef.current;
    sim.acc += dt;
    let more = true;
    while (more && sim.acc >= STEP_INTERVAL_S) {
      sim.acc -= STEP_INTERVAL_S;
      more = doStep();
    }
    if (!more) {
      setIsRunning(false);
      return false;
    }
    return true;
  });

  // ── Controls ──────────────────────────────────────────────────────────────
  const canStep = () => {
    const sim = simRef.current;
    return sim.step < MAX_STEPS && !sim.message;
  };

  const handleRun = useCallback(() => {
    if (loop.isRunning() || !canStep()) return;
    // First step right away, then one every STEP_INTERVAL_S
    simRef.current.acc = STEP_INTERVAL_S;
    setIsRunning(true);
    loop.start();
  }, [loop]);

  const handleStep = useCallback(() => {
    if (loop.isRunning() || !canStep()) return;
    doStep();
  }, [loop, doStep]);

  const handlePause = useCallback(() => {
    loop.stop();
    setIsRunning(false);
  }, [loop]);

  const handleReset = useCallback(() => {
    loop.stop();
    setIsRunning(false);
    const sim = simRef.current;
    sim.step = 0;
    sim.pops = [...pops];
    sim.history = [[...pops]];
    sim.matrixEdits = [];
    sim.acc = 0;
    sim.message = "";
    bump();
  }, [loop, pops, bump]);

  // ── Derived display values ────────────────────────────────────────────────
  const colors = COMP_COLORS[currentTheme] || COMP_COLORS.light;
  const sim = simRef.current;
  const currentStep = sim.step;
  const currentPops = sim.pops;
  const totalPop = sum3(currentPops);
  const startChanged =
    currentStep > 0 && pops.some((p, i) => p !== sim.history[0][i]);
  let statusMsg = "";
  if (sim.message) statusMsg = sim.message + " Press Reset to start again.";
  else if (currentStep >= MAX_STEPS)
    statusMsg = `Reached step ${MAX_STEPS}. Press Reset to start again.`;
  else if (startChanged) statusMsg = "New starting numbers take effect on Reset.";

  // ── Layout constants ──────────────────────────────────────────────────────
  // Canvas: 8 wide × 7 tall
  // Top (rows 0-3): [4×4 matrix] [col 4: 4 buttons rows 0-3] [2×4 names] [1×4 pops]
  // Bottom (rows 4-6): [5×3 time series] [3×3 unified panel]

  const dividerColor = currentTheme === "dark" ? "#4b5563" : "#e5e7eb";
  const mutedColor = currentTheme === "dark" ? "#9ca3af" : "#6b7280";
  const textColor = currentTheme === "dark" ? "#e5e7eb" : "#1f2937";
  const warnColor = currentTheme === "dark" ? "#fbbf24" : "#b45309";

  return (
    <ToolContainer
      title="Three-Compartment Matrix Model"
      canvasWidth={8}
      canvasHeight={7}
    >
      {/* ══ TOP SECTION: rows 0-3 ════════════════════════════════════════════ */}

      {/* ── 4×4 Matrix block (cols 0-3, rows 0-3) ──────────────────────────── */}

      {/* Corner label */}
      <GridLabel
        x={0}
        y={0}
        w={1}
        h={1}
        text="Transition Matrix"
        fontSize={14}
        textAlign="center"
        theme={theme}
      />

      {/* "From X" column labels */}
      {[0, 1, 2].map((j) => (
        <GridLabel
          key={`from-${j}`}
          x={j + 1}
          y={0}
          w={1}
          h={1}
          text={`From ${names[j] || DEFAULT_NAMES[j]}`}
          fontSize={13}
          textAlign="center"
          theme={theme}
        />
      ))}

      {/* Rows 1-3: "To X" labels + 3×3 matrix entries */}
      {[0, 1, 2].map((i) => (
        <React.Fragment key={`row-${i}`}>
          <GridLabel
            x={0}
            y={i + 1}
            w={1}
            h={1}
            text={`To ${names[i] || DEFAULT_NAMES[i]}`}
            fontSize={13}
            textAlign="center"
            theme={theme}
          />
          {[0, 1, 2].map((j) => (
            <GridInput
              key={`m-${i}-${j}`}
              x={j + 1}
              y={i + 1}
              w={1}
              h={1}
              value={matrix[i][j]}
              onChange={(v) => updateMatrix(i, j, v)}
              min={-1000}
              max={1000}
              step={0.01}
              compact={true}
              variable={`${(names[j] || DEFAULT_NAMES[j]).slice(0, 2)}\u2192${(names[i] || DEFAULT_NAMES[i]).slice(0, 2)}`}
              title={`Entry: from ${names[j] || DEFAULT_NAMES[j]} to ${names[i] || DEFAULT_NAMES[i]}`}
              theme={theme}
            />
          ))}
        </React.Fragment>
      ))}

      {/* ── col 4: Run / Pause / Reset buttons ────────────────────────────── */}

      <GridButton
        x={4}
        y={0}
        w={1}
        h={1}
        type="momentary"
        onPress={handleRun}
        bgColor={isRunning ? "#14532d" : "#16a34a"}
        theme={theme}
        tooltip="Run: one time step every 0.3 s, up to 100 steps"
      >
        <div style={{ textAlign: "center", lineHeight: "1.1" }}>
          <div style={{ fontSize: "16px" }}>
            {isRunning ? "Running" : "Run"}
          </div>
        </div>
      </GridButton>

      <GridButton
        x={4}
        y={1}
        w={1}
        h={1}
        type="momentary"
        onPress={handleStep}
        bgColor="#ca8a04"
        theme={theme}
        tooltip="Advance one time step"
      >
        <div style={{ textAlign: "center", lineHeight: "1.1" }}>
          <div style={{ fontSize: "16px" }}>Step</div>
        </div>
      </GridButton>

      <GridButton
        x={4}
        y={2}
        w={1}
        h={1}
        type="momentary"
        onPress={handlePause}
        bgColor="#dc2626"
        theme={theme}
        tooltip="Pause the simulation"
      >
        <div style={{ textAlign: "center", lineHeight: "1.1" }}>
          <div style={{ fontSize: "16px" }}>Pause</div>
        </div>
      </GridButton>

      <GridButton
        x={4}
        y={3}
        w={1}
        h={1}
        type="momentary"
        onPress={handleReset}
        bgColor="#6b7280"
        theme={theme}
        tooltip="Reset the simulation"
      >
        <div style={{ textAlign: "center", lineHeight: "1.1" }}>
          <div style={{ fontSize: "16px" }}>Reset</div>
        </div>
      </GridButton>

      {/* ── 2×4 Compartment name block (cols 5-6, rows 0-3) ──────────────── */}

      <GridLabel
        x={5}
        y={0}
        w={2}
        h={1}
        text="Compartment name"
        fontSize={13}
        textAlign="center"
        theme={theme}
      />
      {[0, 1, 2].map((i) => (
        <GridTextInput
          key={`name-${i}`}
          x={5}
          y={i + 1}
          w={2}
          h={1}
          value={names[i]}
          onChange={(v) => updateName(i, v)}
          placeholder={DEFAULT_NAMES[i]}
          label={DEFAULT_NAMES[i]}
          maxLength={12}
          theme={theme}
        />
      ))}

      {/* ── 1×4 Starting population block (col 7, rows 0-3) ──────────────── */}

      <GridLabel
        x={7}
        y={0}
        w={1}
        h={1}
        text="Starting number"
        fontSize={13}
        textAlign="center"
        theme={theme}
      />
      {[0, 1, 2].map((i) => (
        <GridInput
          key={`pop-${i}`}
          x={7}
          y={i + 1}
          w={1}
          h={1}
          value={pops[i]}
          onChange={(v) => updatePop(i, v)}
          min={0}
          max={9999}
          step={1}
          variable={names[i] || DEFAULT_NAMES[i]}
          title={`Starting population for compartment ${names[i] || DEFAULT_NAMES[i]}`}
          theme={theme}
        />
      ))}

      {/* ══ BOTTOM SECTION: rows 4-6 ═════════════════════════════════════════ */}

      {/* ── 5×3 Time series graph (cols 0-4, rows 4-6) ───────────────────── */}
      <GridGraph
        x={0}
        y={4}
        w={5}
        h={3}
        xLabel="Time Step"
        yLabel="Population"
        xRange={axes.x.range}
        yRange={axes.y.range}
        xTicks={axes.x.ticks}
        yTicks={axes.y.ticks}
        theme={theme}
        tooltip="Time series of compartment populations"
      >
        {(transform) => {
          transformRef.current = transform;
          return (
            <canvas
              ref={tsCanvasRef}
              className="absolute"
              style={{ ...transform.plotStyle, pointerEvents: "none" }}
            />
          );
        }}
      </GridGraph>

      {/* ── 3×3 Unified panel (cols 5-7, rows 4-6) ───────────────────────── */}
      <GridDisplay
        x={5}
        y={4}
        w={3}
        h={3}
        variant="info"
        align="left"
        fontSize="small"
        theme={theme}
      >
        <div
          style={{
            padding: "10px 12px",
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          {/* Step counter */}
          <div
            style={{ fontSize: "12px", color: mutedColor, marginBottom: statusMsg ? "2px" : "8px" }}
          >
            Step:{" "}
            <span style={{ color: textColor, fontWeight: "bold" }}>
              {currentStep}
            </span>{" "}
            / {MAX_STEPS}
          </div>
          {statusMsg && (
            <div
              role="status"
              style={{ fontSize: "11px", color: warnColor, marginBottom: "6px", lineHeight: 1.25 }}
            >
              {statusMsg}
            </div>
          )}

          {/* Divider */}
          <div
            style={{
              borderTop: `1px solid ${dividerColor}`,
              marginBottom: "8px",
            }}
          />

          {/* Legend + current populations */}
          <div style={{ marginBottom: "4px" }}>
            {[0, 1, 2].map((c) => (
              <div
                key={c}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "5px",
                }}
              >
                <Swatch color={colors[c]} shape={MARKERS[c]} />
                <span
                  style={{
                    color: colors[c],
                    fontWeight: "bold",
                    fontSize: "13px",
                    minWidth: "50px",
                  }}
                >
                  {names[c] || DEFAULT_NAMES[c]}
                </span>
                <span style={{ color: textColor, fontSize: "12px" }}>
                  {fmtPop(currentPops[c])}
                </span>
              </div>
            ))}

            {/* Total row — matches legend style, dashed swatch */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginTop: "3px",
                paddingTop: "4px",
                borderTop: `1px solid ${dividerColor}`,
              }}
            >
              <Swatch color={textColor} shape="circle" dashed />
              <span
                style={{
                  color: textColor,
                  fontWeight: "bold",
                  fontSize: "13px",
                  minWidth: "50px",
                }}
              >
                Total
              </span>
              <span style={{ color: textColor, fontSize: "12px" }}>
                {fmtPop(totalPop)}
              </span>
            </div>
          </div>

          {/* Divider */}
          <div
            style={{
              borderTop: `1px solid ${dividerColor}`,
              marginBottom: "8px",
            }}
          />

          {/* Column sums */}
          <div
            style={{ fontSize: "11px", color: mutedColor, marginBottom: "4px" }}
          >
            Column sums:
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            {[0, 1, 2].map((j) => {
              const s = colSums[j];
              return (
                <span key={j} style={{ fontSize: "11px", color: textColor }}>
                  From {names[j] || DEFAULT_NAMES[j]}: {s.toFixed(3)}
                </span>
              );
            })}
          </div>
        </div>
      </GridDisplay>
    </ToolContainer>
  );
};

export default ThreeCompartmentMatrixTool;
