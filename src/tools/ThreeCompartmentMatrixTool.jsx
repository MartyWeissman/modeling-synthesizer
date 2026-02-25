// src/tools/ThreeCompartmentMatrixTool.jsx

import React, { useState, useEffect, useCallback, useRef } from "react";
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

// Default matrix: M[i][j] = rate/fraction from compartment j to compartment i
const DEFAULT_MATRIX = [
  [0.7, 0.1, 0.05],
  [0.2, 0.8, 0.1],
  [0.1, 0.1, 0.85],
];

const DEFAULT_NAMES = ["A", "B", "C"];
const DEFAULT_POPS = [100, 50, 50];
const MAX_STEPS = 100;

// Colors for the three compartments (light / dark / unicorn)
const COMP_COLORS = {
  light: ["#dc2626", "#2563eb", "#16a34a"],
  dark: ["#f87171", "#60a5fa", "#4ade80"],
  unicorn: ["#e11d48", "#7c3aed", "#0891b2"],
};

const ThreeCompartmentMatrixTool = () => {
  const { theme, currentTheme } = useTheme();

  // ── UI State ──────────────────────────────────────────────────────────────
  const [matrix, setMatrix] = useState(DEFAULT_MATRIX.map((r) => [...r]));
  const [names, setNames] = useState([...DEFAULT_NAMES]);
  const [pops, setPops] = useState([...DEFAULT_POPS]);

  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [currentPops, setCurrentPops] = useState([...DEFAULT_POPS]);

  // ── Canvas / animation refs ───────────────────────────────────────────────
  const tsCanvasRef = useRef(null);

  const animRef = useRef({
    isRunning: false,
    animationId: null,
    step: 0,
    pops: [...DEFAULT_POPS],
    matrix: DEFAULT_MATRIX.map((r) => [...r]),
    names: [...DEFAULT_NAMES],
    history: [[...DEFAULT_POPS]],
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

  // Matrix-vector multiply: new = M * old
  const stepSimulation = (currentPopsArr, mat) => {
    const next = [0, 0, 0];
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        next[i] += mat[i][j] * currentPopsArr[j];
      }
    }
    return next;
  };

  // Column sums (ideally all ≈ 1.0)
  const colSums = [0, 1, 2].map(
    (j) => matrix[0][j] + matrix[1][j] + matrix[2][j],
  );

  // ── Time-series drawing ───────────────────────────────────────────────────
  const drawTimeSeries = useCallback(() => {
    const canvas = tsCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;
    const history = animRef.current.history;
    const isDark = currentTheme === "dark";
    const colors = COMP_COLORS[currentTheme] || COMP_COLORS.light;

    ctx.clearRect(0, 0, W, H);

    if (history.length < 1) return;

    // Helper: draw a filled dot
    const drawDot = (x, y, color, radius = 5) => {
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    };

    // Padding
    const pad = { left: 50, right: 12, top: 12, bottom: 40 };
    const plotW = W - pad.left - pad.right;
    const plotH = H - pad.top - pad.bottom;

    // Compute totals per step
    const totals = history.map((snap) => snap[0] + snap[1] + snap[2]);

    // Determine y max (include totals)
    const allVals = [...history.flat(), ...totals];
    const rawMax = Math.max(...allVals);
    const yMax = rawMax > 0 ? rawMax * 1.1 : 100;

    // Background
    ctx.fillStyle = isDark ? "#111827" : "#f9fafb";
    ctx.fillRect(0, 0, W, H);

    // Grid lines
    const gridColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)";
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    const yGridCount = 5;
    for (let g = 0; g <= yGridCount; g++) {
      const gy = pad.top + plotH - (g / yGridCount) * plotH;
      ctx.beginPath();
      ctx.moveTo(pad.left, gy);
      ctx.lineTo(pad.left + plotW, gy);
      ctx.stroke();
    }
    // x-axis scales to actual data extent
    const xMax = Math.max(history.length - 1, 1);
    const xGridCount = Math.min(xMax, 10);
    for (let g = 0; g <= xGridCount; g++) {
      const gx = pad.left + (g / xGridCount) * plotW;
      ctx.beginPath();
      ctx.moveTo(gx, pad.top);
      ctx.lineTo(gx, pad.top + plotH);
      ctx.stroke();
    }

    // Axes
    const axisColor = isDark ? "#e5e7eb" : "#1f2937";
    ctx.strokeStyle = axisColor;
    ctx.lineWidth = 1.5;
    // Y axis
    ctx.beginPath();
    ctx.moveTo(pad.left, pad.top);
    ctx.lineTo(pad.left, pad.top + plotH);
    ctx.stroke();
    // X axis
    ctx.beginPath();
    ctx.moveTo(pad.left, pad.top + plotH);
    ctx.lineTo(pad.left + plotW, pad.top + plotH);
    ctx.stroke();

    // Axis labels
    const labelColor = isDark ? "#d1d5db" : "#374151";
    ctx.fillStyle = labelColor;
    ctx.font = "11px sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (let g = 0; g <= yGridCount; g++) {
      const val = (g / yGridCount) * yMax;
      const gy = pad.top + plotH - (g / yGridCount) * plotH;
      ctx.fillText(Math.round(val), pad.left - 5, gy);
    }
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (let g = 0; g <= xGridCount; g++) {
      const step = Math.round((g / xGridCount) * xMax);
      const gx = pad.left + (g / xGridCount) * plotW;
      ctx.fillText(step, gx, pad.top + plotH + 5);
    }

    // Axis titles
    ctx.fillStyle = labelColor;
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText("Time Step", pad.left + plotW / 2, H - 2);

    ctx.save();
    ctx.translate(12, pad.top + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textBaseline = "top";
    ctx.fillText("Population", 0, 0);
    ctx.restore();

    // Data lines — three compartments
    for (let c = 0; c < 3; c++) {
      const lastSnap = history[history.length - 1];
      const lastX = pad.left + ((history.length - 1) / xMax) * plotW;
      const lastY = pad.top + plotH - (lastSnap[c] / yMax) * plotH;

      if (history.length > 1) {
        ctx.beginPath();
        ctx.strokeStyle = colors[c];
        ctx.lineWidth = 2.5;
        ctx.lineJoin = "round";
        history.forEach((snap, t) => {
          const x = pad.left + (t / xMax) * plotW;
          const y = pad.top + plotH - (snap[c] / yMax) * plotH;
          if (t === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
      }

      // Dot at last (or only) point
      drawDot(lastX, lastY, colors[c]);
    }

    // Total population line — black (light) or white (dark)
    const totalLineColor = isDark ? "#ffffff" : "#000000";
    const lastTotal = totals[totals.length - 1];
    const lastTotalX = pad.left + ((history.length - 1) / xMax) * plotW;
    const lastTotalY = pad.top + plotH - (lastTotal / yMax) * plotH;

    if (history.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = totalLineColor;
      ctx.lineWidth = 2;
      ctx.lineJoin = "round";
      ctx.setLineDash([6, 3]);
      totals.forEach((val, t) => {
        const x = pad.left + (t / xMax) * plotW;
        const y = pad.top + plotH - (val / yMax) * plotH;
        if (t === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Dot at last (or only) total point
    drawDot(lastTotalX, lastTotalY, totalLineColor, 4);
  }, [currentTheme]);

  // Draw on mount and whenever theme changes
  useEffect(() => {
    drawTimeSeries();
  }, [currentTheme, drawTimeSeries]);

  // ── Animation loop ────────────────────────────────────────────────────────
  const animationLoop = useCallback(() => {
    const anim = animRef.current;
    if (!anim.isRunning) return;

    if (anim.step >= MAX_STEPS) {
      anim.isRunning = false;
      setIsRunning(false);
      return;
    }

    const next = stepSimulation(anim.pops, anim.matrix);
    anim.pops = next;
    anim.step += 1;
    anim.history.push([...next]);

    setCurrentPops([...next]);
    setCurrentStep(anim.step);

    drawTimeSeries();

    anim.animationId = requestAnimationFrame(animationLoop);
  }, [drawTimeSeries]);

  // ── Controls ──────────────────────────────────────────────────────────────
  const handleRun = useCallback(() => {
    const anim = animRef.current;
    if (anim.isRunning || anim.step >= MAX_STEPS) return;

    // Initialise canvas once
    const canvas = tsCanvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      if (canvas.width !== rect.width || canvas.height !== rect.height) {
        canvas.width = rect.width;
        canvas.height = rect.height;
      }
    }

    if (anim.step === 0) {
      // First run – snapshot current UI values
      anim.pops = [...pops];
      anim.matrix = matrix.map((r) => [...r]);
      anim.names = [...names];
      anim.history = [[...pops]];
      setCurrentPops([...pops]);
    }

    anim.isRunning = true;
    setIsRunning(true);
    anim.animationId = requestAnimationFrame(animationLoop);
  }, [pops, matrix, names, animationLoop]);

  const handleStep = useCallback(() => {
    const anim = animRef.current;
    if (anim.isRunning || anim.step >= MAX_STEPS) return;

    // Initialise on first step just like handleRun
    const canvas = tsCanvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      if (canvas.width !== rect.width || canvas.height !== rect.height) {
        canvas.width = rect.width;
        canvas.height = rect.height;
      }
    }

    if (anim.step === 0) {
      anim.pops = [...pops];
      anim.matrix = matrix.map((r) => [...r]);
      anim.names = [...names];
      anim.history = [[...pops]];
      setCurrentPops([...pops]);
    }

    const next = stepSimulation(anim.pops, anim.matrix);
    anim.pops = next;
    anim.step += 1;
    anim.history.push([...next]);

    setCurrentPops([...next]);
    setCurrentStep(anim.step);
    drawTimeSeries();
  }, [pops, matrix, names, drawTimeSeries]);

  const handlePause = useCallback(() => {
    const anim = animRef.current;
    anim.isRunning = false;
    if (anim.animationId) {
      cancelAnimationFrame(anim.animationId);
      anim.animationId = null;
    }
    setIsRunning(false);
  }, []);

  const handleReset = useCallback(() => {
    handlePause();
    const anim = animRef.current;
    anim.step = 0;
    anim.pops = [...pops];
    anim.history = [[...pops]];

    setCurrentStep(0);
    setCurrentPops([...pops]);

    drawTimeSeries();
  }, [handlePause, pops, drawTimeSeries]);

  // Cleanup on unmount
  useEffect(() => {
    const anim = animRef.current;
    return () => {
      if (anim.animationId) cancelAnimationFrame(anim.animationId);
    };
  }, []);

  // ── Derived display values ────────────────────────────────────────────────
  const colors = COMP_COLORS[currentTheme] || COMP_COLORS.light;
  const totalPop = currentPops.reduce((a, b) => a + b, 0);

  // ── Layout constants ──────────────────────────────────────────────────────
  // Canvas: 8 wide × 7 tall
  // Top (rows 0-3): [4×4 matrix] [col 4: 4 buttons rows 0-3] [2×4 names] [1×4 pops]
  // Bottom (rows 4-6): [5×3 time series] [3×3 unified panel]

  const dividerColor = currentTheme === "dark" ? "#4b5563" : "#e5e7eb";
  const mutedColor = currentTheme === "dark" ? "#9ca3af" : "#6b7280";
  const textColor = currentTheme === "dark" ? "#e5e7eb" : "#1f2937";

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
        tooltip="Run the model step by step"
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
        xRange={[0, MAX_STEPS]}
        yRange={[0, 100]}
        xTicks={[0, 20, 40, 60, 80, 100]}
        yTicks={[0, 25, 50, 75, 100]}
        theme={theme}
        tooltip="Time series of compartment populations"
      >
        <canvas
          ref={tsCanvasRef}
          className="absolute"
          style={{
            left: 0,
            top: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
          }}
          width={500}
          height={300}
        />
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
            style={{ fontSize: "12px", color: mutedColor, marginBottom: "8px" }}
          >
            Step:{" "}
            <span style={{ color: textColor, fontWeight: "bold" }}>
              {currentStep}
            </span>{" "}
            / {MAX_STEPS}
          </div>

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
                <span
                  style={{
                    display: "inline-block",
                    width: "24px",
                    height: "3px",
                    background: colors[c],
                    borderRadius: "2px",
                    flexShrink: 0,
                  }}
                />
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
                  {Math.round(currentPops[c])}
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
              <span
                style={{
                  display: "inline-block",
                  width: "24px",
                  height: "3px",
                  background: `repeating-linear-gradient(to right, ${textColor} 0px, ${textColor} 6px, transparent 6px, transparent 9px)`,
                  flexShrink: 0,
                }}
              />
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
                {Math.round(totalPop)}
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
