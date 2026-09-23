// src/tools/LeslieMatrixTool.jsx

import React, { useState, useRef, useMemo, useCallback, useEffect } from "react";
import {
  GridGraph,
  GridDisplay,
  GridTableInput,
  GridButton,
  GridInput,
} from "../components/grid";
import ToolContainer from "../components/ui/ToolContainer";
import { useTheme } from "../hooks/useTheme";
import { setupCanvas } from "../utils/canvas";
import { leslieLambda } from "../utils/linearAlgebra";
import { pseudoLog, roundPercents } from "./leslieHelpers";

const DEFAULT_STRATA   = 5;
const MAX_STRATA       = 10;
const STEP_INTERVAL_MS = 300;

// ── Pure helpers (outside component) ──────────────────────────────────────


// Green (#22c55e = 34,197,94) → amber-brown (#b45309 = 180,83,9)
const getStratumColor = (i, n) => {
  const t = n <= 1 ? 0 : i / (n - 1);
  return `rgb(${Math.round(34 + t * 146)},${Math.round(197 - t * 114)},${Math.round(94 - t * 85)})`;
};

// Non-breaking space so HTML doesn't collapse leading padding
const NBSP = "\u00a0";

// Fixed 5-char labels (right-aligned with nbsp padding) so the y-axis never jumps width.
// Reference width: "1E100" = 5 chars.
const makeYLabel = (tickIndex) => {
  if (tickIndex === 0) return NBSP.repeat(4) + "0";
  const power = tickIndex - 1;
  const s = power <= 4 ? String(10 ** power) : `1E${power}`;
  return NBSP.repeat(Math.max(0, 5 - s.length)) + s;
};

const DEFAULT_Y_AXIS = {
  topPower: 1,
  ticks:  [0, 1, 2],
  labels: [0, 1, 2].map(makeYLabel),
};
const DEFAULT_X_AXIS = { range: [0, 20], ticks: [0, 5, 10, 15, 20] };

const computeYAxis = (history) => {
  let max = 0;
  history.forEach(({ n }) => n.forEach((v) => { if (v > max) max = v; }));
  const top   = max <= 1 ? 1 : Math.ceil(Math.log10(max));
  const count = top + 2;
  return {
    topPower: top,
    ticks:  Array.from({ length: count }, (_, i) => i),
    labels: Array.from({ length: count }, (_, i) => makeYLabel(i)),
  };
};

// Gradually expand x-axis: ~20% headroom, find smallest nice step for 4-10 ticks
const NICE_STEPS = [1, 2, 5, 10, 20, 25, 50, 100, 200, 500, 1000];
const computeXAxis = (t) => {
  const minTop = Math.max(20, Math.ceil(t * 1.2));
  for (const step of NICE_STEPS) {
    const top = Math.ceil(minTop / step) * step;
    const n   = top / step;
    if (n >= 4 && n <= 10) {
      return { range: [0, top], ticks: Array.from({ length: n + 1 }, (_, i) => i * step) };
    }
  }
  return DEFAULT_X_AXIS;
};

// Compact formatter for population values (handles large floats gracefully)
const fmtPop = (v) => {
  const n = parseFloat(v);
  if (isNaN(n) || n === 0) return "0";
  if (!isFinite(n)) return "∞";
  if (n >= 1e6) return n.toExponential(2);
  return parseFloat(n.toPrecision(5)).toString();
};

// ── Table column definitions ────────────────────────────────────────────────

const makeDefaultParams = () =>
  Array.from({ length: MAX_STRATA }, () => ({ fecundity: "", survival: "", initPop: "" }));

const makeTableColumns = (currentTheme) => {
  const isDark    = currentTheme === "dark";
  const isUnicorn = currentTheme === "unicorn";
  return [
    { key: "age",       label: "Age\nStrata",          type: "computed", editable: false },
    { key: "fecundity", label: "Fecundity\n(0-1000)",  type: "number", min: 0, max: 1000,
      color: isUnicorn ? "#7c3aed" : isDark ? "#60a5fa" : "#2563eb" },
    { key: "survival",  label: "Survival\n(0.0-1.0)",  type: "number", min: 0, max: 1,
      color: isUnicorn ? "#065f46" : isDark ? "#4ade80" : "#16a34a" },
    { key: "initPop",   label: "Start\nPopulation",    type: "number", min: 0 },
  ];
};

// ── Matrix canvas drawing ──────────────────────────────────────────────────

const NUM_FONT    = 13;
const LABEL_FONT  = 12;
const COL_PAD     = 6;
const ROW_H       = 18;
const BRACKET_W   = 10;
const LABEL_ABOVE = 40;
const SECTION_GAP = 24;

// ── Eigenanalysis ──────────────────────────────────────────────────────────

const fmtSig = (v, digits = 3) => {
  if (!Number.isFinite(v)) return "–";
  if (v === 0) return "0";
  if (Math.abs(v) >= 1e5 || Math.abs(v) < 1e-3) return v.toExponential(2);
  return String(parseFloat(v.toPrecision(digits)));
};

// ── Value formatting ────────────────────────────────────────────────────────

const fmtVal = (v) => {
  if (v === "" || v === null || v === undefined) return "0";
  const n = parseFloat(v);
  if (isNaN(n)) return "0";
  return parseFloat(n.toFixed(4)).toString();
};

const measureColWidths = (ctx, matrix, n) => {
  ctx.font = `${NUM_FONT}px monospace`;
  const widths = Array(n).fill(0);
  for (let c = 0; c < n; c++)
    for (let r = 0; r < n; r++)
      widths[c] = Math.max(widths[c], ctx.measureText(fmtVal(matrix[r][c])).width);
  return widths;
};

const getParamVectors = (params, n) => ({
  fec: Array.from({ length: n }, (_, i) => params[i].fecundity),
  surv: Array.from({ length: n - 1 }, (_, i) => params[i].survival),
});

// sim: { t, n (current vector or null), history }
const drawLeslieMatrixOnCanvas = (canvas, params, numStrata, currentTheme, sim) => {
  const setup = setupCanvas(canvas);
  if (!setup) return;
  const { ctx, width: W, height: H } = setup;
  ctx.clearRect(0, 0, W, H);
  const n = numStrata;

  // Build Leslie matrix
  const matrix = Array.from({ length: n }, () => Array(n).fill("0"));
  for (let c = 0; c < n; c++) {
    const f = params[c].fecundity;
    matrix[0][c] = f !== "" ? f : "0";
  }
  for (let r = 1; r < n; r++) {
    const sv = params[r - 1].survival;
    matrix[r][r - 1] = sv !== "" ? sv : "0";
  }

  // Dominant eigenvalue, stable age distribution and reproductive values,
  // computed exactly from the Euler–Lotka equation.
  const { fec, surv } = getParamVectors(params, n);
  const eig = leslieLambda(fec, surv);
  const hasEigen = eig.lambda > 0 && eig.stableDistribution;
  const percents = hasEigen ? roundPercents(eig.stableDistribution) : null;

  // Population vector — use current simulation state if available, else initPop
  const popVec = sim.n !== null
    ? sim.n
    : Array.from({ length: n }, (_, i) => {
        const v = params[i].initPop;
        return v !== "" ? parseFloat(v) || 0 : 0;
      });

  // Theme colors
  const isDark    = currentTheme === "dark";
  const isUnicorn = currentTheme === "unicorn";
  const zeroColor    = isUnicorn ? "#c4b5fd" : isDark ? "#4b5563" : "#9ca3af";
  const fecColor     = isUnicorn ? "#7c3aed" : isDark ? "#60a5fa" : "#2563eb";
  const survColor    = isUnicorn ? "#065f46" : isDark ? "#4ade80" : "#16a34a";
  const bracketColor = isUnicorn ? "#7c3aed" : isDark ? "#9ca3af" : "#374151";
  const labelColor   = isUnicorn ? "#7c3aed" : isDark ? "#d1d5db" : "#374151";
  const noteColor    = isDark ? "#fbbf24" : "#b45309";

  // ── Readout at the bottom (not scaled): t, N(t), N(t)/N(t−1), λ₁ ──────────
  const total = (v) => v.reduce((a, b) => a + (Number(b) || 0), 0);
  const t = sim.n !== null ? sim.t : 0;
  const Nt = total(popVec);
  let ratioStr = "–";
  if (sim.history.length >= 2) {
    const prev = total(sim.history[sim.history.length - 2].n);
    if (prev > 0) ratioStr = (Nt / prev).toFixed(4);
  }
  const lambdaStr = hasEigen ? eig.lambda.toFixed(4) : "–";
  const readout1 = `t = ${t}    N(t) = ${fmtPop(Nt)}    N(t)/N(t−1) = ${ratioStr}    λ₁ = ${lambdaStr}`;
  let readout2 = "";
  if (!hasEigen) {
    readout2 = "No age class that newborns can reach reproduces: the population dies out.";
  } else if (eig.period > 1) {
    readout2 = `Imprimitive (period ${eig.period}): the age structure oscillates forever, so N(t)/N(t−1) keeps changing; N grows by λ₁ per step on average.`;
  }
  const READOUT_FONT = 12;
  const readoutH = readout2 ? 2 * (READOUT_FONT + 5) + 4 : READOUT_FONT + 9;

  // ── Measure the matrix / vector block (drawn scaled to fit) ──────────────
  ctx.font = `${NUM_FONT}px monospace`;
  const colWidths    = measureColWidths(ctx, matrix, n);
  const matrixInnerW = colWidths.reduce((acc, w) => acc + w + COL_PAD * 2, 0);
  const matrixH      = n * ROW_H;
  const fullMatrixW  = matrixInnerW + BRACKET_W * 2;

  const colW = (strs) => Math.max(...strs.map((x) => ctx.measureText(x).width)) + COL_PAD * 2;
  const popStrs = Array.from({ length: n }, (_, r) => fmtPop(popVec[r]));
  const eigStrs = Array.from({ length: n }, (_, r) => (hasEigen ? `${percents[r]}%` : "–"));
  const rvStrs  = Array.from({ length: n }, (_, r) =>
    hasEigen && eig.reachable[r] ? fmtSig(eig.reproductiveValues[r]) : "–");
  const vecInnerW   = colW(popStrs);
  const eigenInnerW = Math.max(colW(eigStrs), ctx.measureText("100%").width + COL_PAD * 2);
  const rvInnerW    = Math.max(colW(rvStrs), ctx.measureText("0.00").width + COL_PAD * 2);
  const fullVecW   = vecInnerW + BRACKET_W * 2;
  const fullEigenW = eigenInnerW + BRACKET_W * 2;
  const fullRvW    = rvInnerW + BRACKET_W * 2;

  ctx.font = `bold ${LABEL_FONT}px sans-serif`;
  const labelW = (...ls) => Math.max(...ls.map((l) => ctx.measureText(l).width));
  const lambdaLabel = hasEigen ? `λ₁ = ${eig.lambda.toPrecision(4)}` : "λ₁ = –";
  const secW = [
    Math.max(fullMatrixW, labelW("Leslie", "Matrix")),
    Math.max(fullVecW, labelW("Current", "Population")),
    Math.max(fullEigenW, labelW("Dominant", "Eigenvector", lambdaLabel)),
    Math.max(fullRvW, labelW("Reproductive", "Value")),
  ];
  const gaps = [SECTION_GAP, SECTION_GAP * 2, SECTION_GAP];
  const blockW = secW.reduce((a, b) => a + b, 0) + gaps.reduce((a, b) => a + b, 0);
  const blockH = LABEL_ABOVE + matrixH;
  const availH = H - readoutH - 4;
  const scale = Math.min(1, (W - 8) / blockW, availH / blockH);

  ctx.save();
  const offX = (W - blockW * scale) / 2;
  const offY = Math.max(2, (availH - blockH * scale) / 2);
  ctx.translate(offX, offY);
  ctx.scale(scale, scale);

  const matrixY = LABEL_ABOVE;
  const labelY  = LABEL_ABOVE / 2 + 4;
  const secX = [0];
  for (let k = 1; k < 4; k++) secX[k] = secX[k - 1] + secW[k - 1] + gaps[k - 1];
  // Center each bracketed column within its section
  const startX = secX[0] + (secW[0] - fullMatrixW) / 2;
  const vecX   = secX[1] + (secW[1] - fullVecW) / 2;
  const eigenX = secX[2] + (secW[2] - fullEigenW) / 2;
  const rvX    = secX[3] + (secW[3] - fullRvW) / 2;

  // Labels
  ctx.font = `bold ${LABEL_FONT}px sans-serif`;
  ctx.fillStyle = labelColor;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  const LINE_H = LABEL_FONT + 2;
  const drawLabel2 = (l1, l2, cx) => {
    ctx.fillText(l1, cx, labelY - LINE_H);
    ctx.fillText(l2, cx, labelY);
  };
  const drawLabel3 = (l1, l2, l3, cx) => {
    ctx.fillText(l1, cx, labelY - LINE_H * 2);
    ctx.fillText(l2, cx, labelY - LINE_H);
    ctx.fillText(l3, cx, labelY);
  };
  drawLabel2("Leslie",  "Matrix",     secX[0] + secW[0] / 2);
  drawLabel2("Current", "Population", secX[1] + secW[1] / 2);
  drawLabel3("Dominant", "Eigenvector", lambdaLabel, secX[2] + secW[2] / 2);
  drawLabel2("Reproductive", "Value", secX[3] + secW[3] / 2);

  // Bracket helper
  const drawBL = (x, y, h) => {
    ctx.beginPath(); ctx.strokeStyle = bracketColor; ctx.lineWidth = 2; ctx.lineCap = "round";
    const bx = x + BRACKET_W * 0.8, cx = bx - BRACKET_W * 1.1;
    ctx.moveTo(bx, y); ctx.bezierCurveTo(cx, y + h * 0.15, cx, y + h * 0.85, bx, y + h); ctx.stroke();
  };
  const drawBR = (x, y, h) => {
    ctx.beginPath(); ctx.strokeStyle = bracketColor; ctx.lineWidth = 2; ctx.lineCap = "round";
    const bx = x + BRACKET_W * 0.2, cx = x + BRACKET_W * 1.2;
    ctx.moveTo(bx, y); ctx.bezierCurveTo(cx, y + h * 0.15, cx, y + h * 0.85, bx, y + h); ctx.stroke();
  };

  // Matrix
  drawBL(startX, matrixY, matrixH);
  drawBR(startX + BRACKET_W + matrixInnerW, matrixY, matrixH);
  ctx.font = `${NUM_FONT}px monospace`; ctx.textBaseline = "middle"; ctx.textAlign = "center";
  let curX = startX + BRACKET_W;
  for (let c = 0; c < n; c++) {
    const cellW = colWidths[c] + COL_PAD * 2, cellCX = curX + cellW / 2;
    for (let r = 0; r < n; r++) {
      const str = fmtVal(matrix[r][c]), cellCY = matrixY + r * ROW_H + ROW_H / 2;
      ctx.fillStyle =
        r === 0 && parseFloat(str) !== 0 ? fecColor :
        r > 0 && c === r - 1 && parseFloat(str) !== 0 ? survColor :
        zeroColor;
      ctx.fillText(str, cellCX, cellCY);
    }
    curX += cellW;
  }

  // A bracketed column vector of strings
  const drawColumn = (x, innerW, strs, colorFor) => {
    drawBL(x, matrixY, matrixH);
    drawBR(x + BRACKET_W + innerW, matrixY, matrixH);
    const cx = x + BRACKET_W + innerW / 2;
    strs.forEach((str, r) => {
      ctx.fillStyle = colorFor(str, r);
      ctx.fillText(str, cx, matrixY + r * ROW_H + ROW_H / 2);
    });
  };
  const stratumOrZero = (str, r) => (str === "0" || str === "–" ? zeroColor : getStratumColor(r, n));
  drawColumn(vecX, vecInnerW, popStrs, stratumOrZero);
  drawColumn(eigenX, eigenInnerW, eigStrs, stratumOrZero);
  drawColumn(rvX, rvInnerW, rvStrs, stratumOrZero);
  ctx.restore();

  // Readout
  ctx.font = `${READOUT_FONT}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  const fitText = (str, y, color) => {
    ctx.fillStyle = color;
    const w = ctx.measureText(str).width;
    const k = Math.min(1, (W - 8) / w);
    ctx.save();
    ctx.translate(W / 2, y);
    ctx.scale(k, 1);
    ctx.fillText(str, 0, 0);
    ctx.restore();
  };
  if (readout2) {
    fitText(readout1, H - READOUT_FONT - 9, labelColor);
    fitText(readout2, H - 4, noteColor);
  } else {
    fitText(readout1, H - 5, labelColor);
  }
};

// ── Component ──────────────────────────────────────────────────────────────

const LeslieMatrixTool = () => {
  const { theme, currentTheme } = useTheme();
  const [numStrata, setNumStrata]   = useState(DEFAULT_STRATA);
  const [isRunning, setIsRunning]   = useState(false);
  const [yAxis, setYAxis]           = useState(DEFAULT_Y_AXIS);
  const [xAxis, setXAxis]           = useState(DEFAULT_X_AXIS);
  const [simTick, setSimTick]       = useState(0);

  const paramsRef          = useRef(makeDefaultParams());
  const matrixCanvasRef    = useRef(null);
  const drawMatrixRef      = useRef(null);
  const timeSeriesCanvasRef = useRef(null);
  const transformRef       = useRef(null);
  const drawTSRef          = useRef(null);
  const numStrataRef       = useRef(DEFAULT_STRATA);
  const simRef             = useRef({ t: 0, n: null, history: [], isRunning: false, intervalId: null });

  // Keep numStrataRef current
  useEffect(() => { numStrataRef.current = numStrata; }, [numStrata]);

  const tableColumns = useMemo(() => makeTableColumns(currentTheme), [currentTheme]);

  const tableData = useMemo(
    () => Array.from({ length: numStrata }, (_, i) => ({
      age:       `Age ${i}`,
      fecundity: paramsRef.current[i].fecundity,
      survival:  paramsRef.current[i].survival,
      initPop:   paramsRef.current[i].initPop,
    })),
    [numStrata],
  );

  // ── Matrix canvas ──────────────────────────────────────────────────────

  const drawMatrix = useCallback(() => {
    const canvas = matrixCanvasRef.current;
    if (!canvas) return;
    drawLeslieMatrixOnCanvas(canvas, paramsRef.current, numStrata, currentTheme, simRef.current);
  }, [currentTheme, numStrata]);

  useEffect(() => { drawMatrixRef.current = drawMatrix; }, [drawMatrix]);

  useEffect(() => {
    const canvas = matrixCanvasRef.current;
    if (!canvas) return;
    // setupCanvas (inside the draw) sizes the canvas to its layout size × DPR
    const raf = requestAnimationFrame(() => drawMatrix());
    return () => cancelAnimationFrame(raf);
  }, [drawMatrix]);

  // ── Time series canvas ────────────────────────────────────────────────

  const drawTimeSeries = useCallback((transform) => {
    const canvas = timeSeriesCanvasRef.current;
    if (!canvas || !transform) return;
    const { ctx, width, height } = setupCanvas(canvas, {
      width: transform.plotWidth,
      height: transform.plotHeight,
    });
    ctx.clearRect(0, 0, width, height);
    const { history } = simRef.current;
    if (!history.length) return;
    const n = numStrataRef.current;

    for (let s = 0; s < n; s++) {
      const color = getStratumColor(s, n);
      // Line through history
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      history.forEach(({ t, n: pop }, idx) => {
        const pt = transform.dataToPixel(t, pseudoLog(pop[s] ?? 0));
        if (idx === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.stroke();
      // Thick dot at t=0
      const pt0 = transform.dataToPixel(history[0].t, pseudoLog(history[0].n[s] ?? 0));
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(pt0.x, pt0.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }, []);

  useEffect(() => { drawTSRef.current = drawTimeSeries; }, [drawTimeSeries]);

  // Redraw time series after every step or axis rescale
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      if (transformRef.current) drawTimeSeries(transformRef.current);
    });
    return () => cancelAnimationFrame(raf);
  }, [simTick, yAxis, xAxis, drawTimeSeries]);

  // ── Simulation ────────────────────────────────────────────────────────

  const initSimulation = useCallback(() => {
    const sim = simRef.current;
    const n   = numStrataRef.current;
    sim.n = Array.from({ length: n }, (_, i) => parseFloat(paramsRef.current[i].initPop) || 0);
    sim.t = 0;
    sim.history = [{ t: 0, n: [...sim.n] }];
    setYAxis(computeYAxis(sim.history));
    setXAxis(DEFAULT_X_AXIS);
    setSimTick((c) => c + 1);
    drawMatrixRef.current?.();
  }, []);

  const advanceStep = useCallback(() => {
    const sim = simRef.current;
    const n   = numStrataRef.current;
    const fec = Array.from({ length: n }, (_, i) => parseFloat(paramsRef.current[i].fecundity) || 0);
    const sur = Array.from({ length: n }, (_, i) =>
      i === n - 1 ? 0 : (parseFloat(paramsRef.current[i].survival) || 0));

    const newN = new Array(n).fill(0);
    for (let j = 0; j < n; j++) newN[0] += fec[j] * sim.n[j];
    for (let r = 1; r < n; r++) newN[r] = sur[r - 1] * sim.n[r - 1];

    // Stop on numerical overflow
    if (newN.some((v) => !isFinite(v))) {
      if (sim.intervalId) clearInterval(sim.intervalId);
      sim.isRunning = false;
      sim.intervalId = null;
      setIsRunning(false);
      return;
    }

    sim.n = newN;
    sim.t += 1;
    sim.history.push({ t: sim.t, n: [...newN] });
    setYAxis(computeYAxis(sim.history));
    setXAxis(computeXAxis(sim.t));
    setSimTick((c) => c + 1);
    drawMatrixRef.current?.();
  }, []);

  const handleStart = useCallback(() => {
    const sim = simRef.current;
    if (sim.isRunning) return;
    if (!sim.n) initSimulation();
    sim.isRunning = true;
    setIsRunning(true);
    sim.intervalId = setInterval(advanceStep, STEP_INTERVAL_MS);
  }, [initSimulation, advanceStep]);

  const handleStop = useCallback(() => {
    const sim = simRef.current;
    if (!sim.isRunning) return;
    clearInterval(sim.intervalId);
    sim.isRunning = false;
    sim.intervalId = null;
    setIsRunning(false);
  }, []);

  const handleStep = useCallback(() => {
    if (simRef.current.isRunning) return;
    // The first press starts from the Start Population column and takes a step
    if (!simRef.current.n) initSimulation();
    advanceStep();
  }, [initSimulation, advanceStep]);

  const doReset = useCallback(() => {
    const sim = simRef.current;
    if (sim.intervalId) clearInterval(sim.intervalId);
    Object.assign(sim, { t: 0, n: null, history: [], isRunning: false, intervalId: null });
    setIsRunning(false);
    setYAxis(DEFAULT_Y_AXIS);
    setXAxis(DEFAULT_X_AXIS);
    setSimTick((c) => c + 1); // triggers effect which clears canvas (history=[])
    drawMatrixRef.current?.();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    const sim = simRef.current;
    return () => {
      if (sim.intervalId) clearInterval(sim.intervalId);
    };
  }, []);

  const handleTableChange = useCallback((rows) => {
    rows.forEach((row, i) => {
      if (i < MAX_STRATA) {
        paramsRef.current[i] = {
          fecundity: row.fecundity ?? "",
          survival:  row.survival  ?? "",
          initPop:   row.initPop   ?? "",
        };
      }
    });
    drawMatrixRef.current?.();
  }, []);

  const handleNumStrataChange = useCallback((v) => {
    const n = Math.round(Math.min(10, Math.max(2, v)));
    // Reset sim whenever strata count changes
    const sim = simRef.current;
    if (sim.intervalId) clearInterval(sim.intervalId);
    Object.assign(sim, { t: 0, n: null, history: [], isRunning: false, intervalId: null });
    setIsRunning(false);
    setYAxis(DEFAULT_Y_AXIS);
    setXAxis(DEFAULT_X_AXIS);
    setSimTick((c) => c + 1);
    setNumStrata(n);
  }, []);

  return (
    <ToolContainer title="Leslie Matrix Population Model" canvasWidth={9} canvasHeight={6}>

      {/* Top-left: time series graph (6×3) */}
      <GridGraph
        x={0} y={0} w={6} h={3}
        xLabel="Time Step"
        yLabel="Population"
        xRange={xAxis.range}
        yRange={[0, yAxis.topPower + 1]}
        xTicks={xAxis.ticks}
        yTicks={yAxis.ticks}
        yTickLabels={yAxis.labels}
        variant="time-series-dynamic"
        theme={theme}
      >
        {(transform) => {
          // Store latest transform for the drawing effect
          transformRef.current = transform;
          return (
            <canvas
              ref={timeSeriesCanvasRef}
              className="absolute"
              style={transform.plotStyle}
            />
          );
        }}
      </GridGraph>

      {/* Bottom-left: Leslie matrix + population vector (6×3) */}
      <GridDisplay
        x={0} y={3} w={6} h={3}
        variant="info"
        theme={theme}
        title="Leslie Matrix"
      >
        <canvas
          ref={matrixCanvasRef}
          style={{
            position: "absolute",
            top: "8px", left: "8px", right: "8px", bottom: "8px",
            width: "calc(100% - 16px)", height: "calc(100% - 16px)",
          }}
        />
      </GridDisplay>

      {/* Top-right: parameter input table (3×4) */}
      <GridTableInput
        key={numStrata}
        x={6} y={0} w={3} h={4}
        data={tableData}
        columns={tableColumns}
        maxRows={numStrata}
        onDataChange={handleTableChange}
        lockedCells={[{ row: numStrata - 1, key: "survival", value: 0 }]}
        title="Age Class Parameters"
        theme={theme}
      />

      {/* Bottom-right row 4: Start · Step · Stop */}
      <GridButton
        x={6} y={4} w={1} h={1}
        type="momentary"
        onPress={handleStart}
        bgColor={isRunning ? "#14532d" : "#16a34a"}
        theme={theme}
      >
        <div style={{ textAlign: "center" }}>Start</div>
      </GridButton>

      <GridButton
        x={7} y={4} w={1} h={1}
        type="momentary"
        onPress={handleStep}
        bgColor="#ca8a04"
        theme={theme}
      >
        <div style={{ textAlign: "center" }}>Step</div>
      </GridButton>

      <GridButton
        x={8} y={4} w={1} h={1}
        type="momentary"
        onPress={handleStop}
        bgColor="#dc2626"
        theme={theme}
      >
        <div style={{ textAlign: "center" }}>Stop</div>
      </GridButton>

      {/* Bottom-right row 5: strata input · Reset */}
      <GridInput
        x={6} y={5} w={2} h={1}
        value={numStrata}
        onChange={handleNumStrataChange}
        min={2}
        max={10}
        step={1}
        variable="Number of Strata"
        title="Number of strata"
        theme={theme}
      />

      <GridButton
        x={8} y={5} w={1} h={1}
        type="momentary"
        onPress={doReset}
        bgColor="#6b7280"
        theme={theme}
      >
        <div style={{ textAlign: "center" }}>Reset</div>
      </GridButton>

    </ToolContainer>
  );
};

export default LeslieMatrixTool;
