// src/tools/TwoDimensionalMatrixVisualizerTool.jsx

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import {
  GridButton,
  GridDisplay,
  GridInput,
  GridWindow,
  GridWheelSelector,
  GridMatrixInput,
} from "../components/grid";
import ToolContainer from "../components/ui/ToolContainer";
import { useTheme } from "../hooks/useTheme";
import { setupCanvas } from "../utils/canvas";
import { niceStep, linearTicks, formatTick } from "../utils/ticks";
import { localPointer } from "../components/grid/pointer";
import { analyze2x2, describeLongRun } from "./matrix2dLongRun";

// ── Mesh helpers ───────────────────────────────────────────────────────────────
// Each shape returns an array of triangles: [ [v0, v1, v2], ... ]
// Each vertex is { orig:[x,y], cur:[x,y], angle, radius }
// This avoids all gap/tessellation issues — triangles share exact vertices.

const makeVertex = (x, y) => {
  const angle = Math.atan2(y, x);
  const radius = Math.sqrt(x * x + y * y);
  return { orig: [x, y], cur: [x, y], angle, radius };
};

// Build a uniform radial mesh inside a closed polygon boundary.
// rings: number of concentric rings from center to edge.
// boundaryFn: function(angle) → [x,y] giving the boundary at that angle.
const radialMesh = (rings, angularSteps, boundaryFn) => {
  const triangles = [];
  // Build grid: ring 0 = center point, ring r > 0 = angularSteps points
  // ring[r][a] = vertex at ring r, angle index a
  const grid = [];
  grid[0] = [makeVertex(0, 0)]; // center
  for (let r = 1; r <= rings; r++) {
    const row = [];
    for (let a = 0; a < angularSteps; a++) {
      const theta = (2 * Math.PI * a) / angularSteps;
      const [bx, by] = boundaryFn(theta);
      const frac = r / rings;
      row.push(makeVertex(bx * frac, by * frac));
    }
    grid[r] = row;
  }
  // Innermost ring: triangles from center to ring 1
  for (let a = 0; a < angularSteps; a++) {
    const a1 = (a + 1) % angularSteps;
    triangles.push([grid[0][0], grid[1][a], grid[1][a1]]);
  }
  // Outer rings: two triangles per quad
  for (let r = 1; r < rings; r++) {
    for (let a = 0; a < angularSteps; a++) {
      const a1 = (a + 1) % angularSteps;
      const v00 = grid[r][a];
      const v01 = grid[r][a1];
      const v10 = grid[r + 1][a];
      const v11 = grid[r + 1][a1];
      triangles.push([v00, v10, v11]);
      triangles.push([v00, v11, v01]);
    }
  }
  return triangles;
};

// Build a uniform rectangular grid mesh inside a bounding box,
// then keep only triangles fully inside the shape (point-in-polygon test).
const rectMesh = (x0, y0, x1, y1, cols, rows, insideFn) => {
  const triangles = [];
  const dx = (x1 - x0) / cols;
  const dy = (y1 - y0) / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const ax = x0 + c * dx,       ay = y0 + r * dy;
      const bx = x0 + (c+1) * dx,   by = y0 + r * dy;
      const cx2 = x0 + c * dx,      cy2 = y0 + (r+1) * dy;
      const dx2 = x0 + (c+1) * dx,  dy2 = y0 + (r+1) * dy;
      // Only emit triangle if its centroid is inside the shape
      const mid1x = (ax + bx + cx2) / 3, mid1y = (ay + by + cy2) / 3;
      const mid2x = (bx + dx2 + cx2) / 3, mid2y = (by + dy2 + cy2) / 3;
      if (insideFn(mid1x, mid1y))
        triangles.push([makeVertex(ax, ay), makeVertex(bx, by), makeVertex(cx2, cy2)]);
      if (insideFn(mid2x, mid2y))
        triangles.push([makeVertex(bx, by), makeVertex(dx2, dy2), makeVertex(cx2, cy2)]);
    }
  }
  return triangles;
};

// ── Shape definitions ──────────────────────────────────────────────────────────
const SHAPES = {
  "Unit Circle": () => {
    // Radial mesh: boundary is the unit circle
    return radialMesh(12, 60, (theta) => [Math.cos(theta), Math.sin(theta)]);
  },
  "Unit Square": () => {
    // Rect mesh clipped to [0,1]×[0,1]
    return rectMesh(0, 0, 1, 1, 20, 20, () => true);
  },
  "Centered Square": () => {
    // Rect mesh clipped to [-1,1]×[-1,1]
    return rectMesh(-1, -1, 1, 1, 20, 20, () => true);
  },
  "Standard Basis": () => {
    // Right triangle: x≥0, y≥0, x+y≤1
    return rectMesh(0, 0, 1, 1, 20, 20, (x, y) => x + y <= 1);
  },
  "Plus Sign": () => {
    const t = 0.25;
    // Inside plus: either |x|≤t or |y|≤t (within [-1,1]²)
    return rectMesh(-1, -1, 1, 1, 40, 40,
      (x, y) => (Math.abs(x) <= t || Math.abs(y) <= t));
  },
};

const SHAPE_NAMES = Object.keys(SHAPES);

const DEFAULT_MATRIX = [
  [1, 0],
  [0, 1],
];

// ── Color helpers ──────────────────────────────────────────────────────────────
// Sine-wave lightness on radius: smooth oscillation between 40% and 75%
const sineLightness = (r) => {
  return 57.5 + 17.5 * Math.sin(r * 2 * Math.PI); // %
};

// HSL color from original polar coords (low saturation = desaturated/pastel)
// atan2 returns (-π, π], so normalize to [0, 2π) before mapping to hue.
// alpha defaults to 1; pass a value < 1 for semi-transparent degenerate triangles.
const pointColor = (angle, radius, alpha = 1) => {
  const normalized = angle < 0 ? angle + 2 * Math.PI : angle;
  const hueDeg = (normalized / (2 * Math.PI)) * 360;
  const sat = 35;
  const light = Math.round(sineLightness(radius));
  if (alpha >= 1) return `hsl(${hueDeg.toFixed(1)}, ${sat}%, ${light}%)`;
  return `hsla(${hueDeg.toFixed(1)}, ${sat}%, ${light}%, ${alpha.toFixed(2)})`;
};

// ── Math helpers ───────────────────────────────────────────────────────────────
// Apply matrix to each triangle's .cur coordinates; .orig / .angle / .radius unchanged.
const applyMatrixVtx = (v, mat) => ({
  ...v,
  cur: [
    mat[0][0] * v.cur[0] + mat[0][1] * v.cur[1],
    mat[1][0] * v.cur[0] + mat[1][1] * v.cur[1],
  ],
});

const applyMatrix = (triangles, mat) =>
  triangles.map(([v0, v1, v2]) => [
    applyMatrixVtx(v0, mat),
    applyMatrixVtx(v1, mat),
    applyMatrixVtx(v2, mat),
  ]);

// Format a number to d decimals without showing "-0.00"
const formatEig = (v, d = 2) => {
  const t = v.toFixed(d);
  return /^-0\.?0*$/.test(t) ? t.slice(1) : t;
};

const MAX_TRAIL = 200; // positions kept per tracked point
const sameMatrix = (A, B) =>
  !!A && !!B && A.every((row, i) => row.every((v, j) => Number(v) === Number(B[i][j])));

// ── Component ──────────────────────────────────────────────────────────────────
const TwoDimensionalMatrixVisualizerTool = () => {
  const { theme, currentTheme } = useTheme();

  // Matrix state
  const [matrix, setMatrix] = useState(DEFAULT_MATRIX.map((r) => [...r]));

  // Shape selection
  const [selectedShape, setSelectedShape] = useState(SHAPE_NAMES[0]);

  // Triangle mesh: array of [v0,v1,v2] where each vertex has orig/cur/angle/radius.
  // "Next State" applies M to .cur; .orig/.angle/.radius stay fixed for coloring.
  const [basePoints, setBasePoints] = useState(() => SHAPES[SHAPE_NAMES[0]]());
  const [stepCount, setStepCount] = useState(0);
  // The matrix applied at every step so far (null before the first step,
  // "mixed" once M was edited between steps) — keeps the "Mⁿ · shape" label honest.
  const [appliedMatrix, setAppliedMatrix] = useState(null);

  // Display options
  const [showEigenvectors, setShowEigenvectors] = useState(false);

  // View range: ±viewRange on both axes
  const [viewRange, setViewRange] = useState(3);

  // Tracked points: user-placed, transform with M each step
  const [trackedPoints, setTrackedPoints] = useState([]);

  // Canvas ref
  const canvasRef = useRef(null);

  // When shape changes, reset base to that shape and clear tracked points
  useEffect(() => {
    setBasePoints(SHAPES[selectedShape]());
    setTrackedPoints([]);
    setStepCount(0);
    setAppliedMatrix(null);
  }, [selectedShape]);

  // Matrix properties
  const props = useMemo(() => analyze2x2(matrix), [matrix]);
  const shapeIsMnShape =
    stepCount > 0 && appliedMatrix !== "mixed" && sameMatrix(appliedMatrix, matrix);

  // ── Drawing ────────────────────────────────────────────────────────────────
  const drawVisualization = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { ctx, width: W, height: H } = setupCanvas(canvas);

    const RANGE = viewRange;

    const toCanvas = (x, y) => [
      W / 2 + (x / RANGE) * (W / 2),
      H / 2 - (y / RANGE) * (H / 2),
    ];

    const isDark = currentTheme === "dark";
    const isUnicorn = currentTheme === "unicorn";

    // Background
    ctx.fillStyle = isDark ? "#111827" : isUnicorn ? "#fdf4ff" : "#f8fafc";
    ctx.fillRect(0, 0, W, H);

    // Grid/tick spacing giving ~5 lines on each side of the origin
    const tickSpacing = niceStep(0, RANGE, 5);
    const gridTicks = linearTicks(-RANGE, RANGE, tickSpacing);

    // Grid lines
    ctx.lineWidth = 0.5;
    ctx.strokeStyle = isDark
      ? "rgba(255,255,255,0.08)"
      : isUnicorn
        ? "rgba(168,85,247,0.12)"
        : "rgba(0,0,0,0.08)";
    for (const g of gridTicks) {
      const [vx] = toCanvas(g, 0);
      ctx.beginPath(); ctx.moveTo(vx, 0); ctx.lineTo(vx, H); ctx.stroke();
      const [, hy] = toCanvas(0, g);
      ctx.beginPath(); ctx.moveTo(0, hy); ctx.lineTo(W, hy); ctx.stroke();
    }

    // Axes
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = isDark
      ? "rgba(255,255,255,0.4)"
      : isUnicorn
        ? "rgba(109,40,217,0.5)"
        : "rgba(0,0,0,0.4)";
    ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke();

    // Tick labels
    const labelColor = isDark
      ? "rgba(255,255,255,0.5)"
      : isUnicorn
        ? "rgba(109,40,217,0.7)"
        : "rgba(0,0,0,0.5)";
    ctx.fillStyle = labelColor;
    ctx.font = "11px monospace";
    for (const g of gridTicks) {
      if (g === 0) continue; // skip 0
      const label = formatTick(g, tickSpacing);
      const [cx] = toCanvas(g, 0);
      const [, cy] = toCanvas(0, g);
      ctx.textAlign = "center";
      ctx.fillText(label, cx, H / 2 + 14);
      ctx.textAlign = "right";
      ctx.fillText(label, W / 2 - 5, cy + 4);
    }

    // ── Draw current shape (triangle mesh, colored by original polar coords) ──
    // Thresholds (in canvas pixels²):
    //   area > FILL_THRESH  → filled triangle
    //   area > LINE_THRESH  → line segment (longest edge), semi-transparent
    //   otherwise           → dot at centroid, semi-transparent
    const FILL_THRESH = 4;   // px²
    const LINE_THRESH = 0.5; // px²

    for (const [v0, v1, v2] of basePoints) {
      const [ax, ay] = toCanvas(v0.cur[0], v0.cur[1]);
      const [bx, by] = toCanvas(v1.cur[0], v1.cur[1]);
      const [cx2, cy2] = toCanvas(v2.cur[0], v2.cur[1]);

      // Average angles via unit-vector mean to avoid ±π wrap discontinuity
      const sinSum = Math.sin(v0.angle) + Math.sin(v1.angle) + Math.sin(v2.angle);
      const cosSum = Math.cos(v0.angle) + Math.cos(v1.angle) + Math.cos(v2.angle);
      const origAngle = Math.atan2(sinSum, cosSum);
      const origRadius = (v0.radius + v1.radius + v2.radius) / 3;

      // Signed area (half cross-product) in canvas pixels²
      const area = Math.abs(
        (bx - ax) * (cy2 - ay) - (cx2 - ax) * (by - ay)
      ) / 2;

      if (area > FILL_THRESH) {
        // Normal filled triangle
        ctx.fillStyle = pointColor(origAngle, origRadius);
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.lineTo(cx2, cy2);
        ctx.closePath();
        ctx.fill();
      } else if (area > LINE_THRESH) {
        // Degenerate → draw longest edge as a line segment
        const edges = [
          [ax, ay, bx, by],
          [bx, by, cx2, cy2],
          [ax, ay, cx2, cy2],
        ];
        const [x1, y1, x2, y2] = edges.reduce((best, e) => {
          const d = (e[2]-e[0])**2 + (e[3]-e[1])**2;
          const bd = (best[2]-best[0])**2 + (best[3]-best[1])**2;
          return d > bd ? e : best;
        });
        // Alpha scales with area relative to threshold so thin triangles fade in
        const alpha = Math.min(0.7, 0.3 + (area / FILL_THRESH) * 0.4);
        ctx.strokeStyle = pointColor(origAngle, origRadius, alpha);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      } else {
        // Fully degenerate → dot at centroid
        const mx = (ax + bx + cx2) / 3;
        const my = (ay + by + cy2) / 3;
        ctx.fillStyle = pointColor(origAngle, origRadius, 0.4);
        ctx.beginPath();
        ctx.arc(mx, my, 1, 0, 2 * Math.PI);
        ctx.fill();
      }
    }

    // ── Draw eigenvectors ─────────────────────────────────────────────────
    // Real eigenvalues only. λ = larger |eigenvalue|, μ = smaller. A scalar
    // matrix kI has every direction as an eigenvector: both axes are drawn.
    if (showEigenvectors && props.pairs.length) {
      // Single color: black in light/unicorn, white in dark
      const evColor = isDark ? "#ffffff" : "#000000";
      const isScalar = props.kind === "real-repeated-scalar";
      const labels = isScalar ? ["λ", "λ"] : ["λ", "μ"];

      const drawArrow = (dx, dy, solid) => {
        const [x1, y1] = toCanvas(0, 0);
        const [x2, y2] = toCanvas(dx, dy);
        ctx.strokeStyle = evColor;
        ctx.lineWidth = 2;
        ctx.setLineDash(solid ? [] : [4, 4]);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Arrowhead
        if (solid) {
          const angle = Math.atan2(y2 - y1, x2 - x1);
          const headLen = 10;
          ctx.fillStyle = evColor;
          ctx.beginPath();
          ctx.moveTo(x2, y2);
          ctx.lineTo(
            x2 - headLen * Math.cos(angle - 0.35),
            y2 - headLen * Math.sin(angle - 0.35),
          );
          ctx.lineTo(
            x2 - headLen * Math.cos(angle + 0.35),
            y2 - headLen * Math.sin(angle + 0.35),
          );
          ctx.closePath();
          ctx.fill();
        }
      };

      props.pairs.forEach(({ ev: [ex, ey], lam }, idx) => {
        // Arrow length grows with |λ|, but never so short that the direction
        // is invisible (a zero eigenvalue marks the direction that collapses).
        const scale = Math.min(Math.max(Math.abs(lam) * 1.5, RANGE * 0.15), RANGE * 0.85);
        drawArrow(ex * scale, ey * scale, true);
        drawArrow(-ex * scale, -ey * scale, false);

        // Label
        const [lx, ly] = toCanvas(ex * scale * 1.12, ey * scale * 1.12);
        ctx.fillStyle = evColor;
        ctx.font = "bold 12px sans-serif";
        ctx.textAlign = lx > W / 2 ? "left" : "right";
        ctx.fillText(
          `${labels[idx]}=${formatEig(lam)}`,
          lx + (lx > W / 2 ? 4 : -4),
          ly - 4,
        );
      });
    }

    // ── Draw tracked points ───────────────────────────────────────────────
    const ptFill   = isDark ? "#111827" : isUnicorn ? "#fdf4ff" : "#ffffff";
    const ptStroke = isDark ? "#ffffff" : "#000000";
    // Trails: earlier positions joined by thin lines, with small dots
    ctx.strokeStyle = isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.45)";
    ctx.fillStyle = ctx.strokeStyle;
    ctx.lineWidth = 1;
    const LIM = 1e6; // keep canvas coordinates finite for points far off-screen
    const clampPx = ([x, y]) => [
      Math.max(-LIM, Math.min(LIM, x)),
      Math.max(-LIM, Math.min(LIM, y)),
    ];
    for (const pt of trackedPoints) {
      if (!pt.trail.length) continue;
      const path = [...pt.trail, pt.cur].map(([x, y]) => clampPx(toCanvas(x, y)));
      ctx.beginPath();
      path.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
      ctx.stroke();
      path.slice(0, -1).forEach(([x, y]) => {
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, 2 * Math.PI);
        ctx.fill();
      });
    }

    for (const pt of trackedPoints) {
      const [ptx, pty] = clampPx(toCanvas(pt.cur[0], pt.cur[1]));
      ctx.beginPath();
      ctx.arc(ptx, pty, 5, 0, 2 * Math.PI);
      ctx.fillStyle = ptFill;
      ctx.fill();
      ctx.strokeStyle = ptStroke;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // ── Legend: step counter ──────────────────────────────────────────────
    // Build legend label with Unicode superscript digits for exponent
    const legendPad = 8;
    const swatchW2 = 24;
    const legendH = 26;
    const legendX = 28, legendY = 28;
    const textColor2 = isDark ? "#e5e7eb" : isUnicorn ? "#4c1d95" : "#1f2937";
    const textX = legendX + legendPad + swatchW2 + legendPad;
    const textBaseline = legendY + 17;

    // Measure legend text width for background sizing
    ctx.font = "12px sans-serif";
    const editedText = `After ${stepCount} step${stepCount === 1 ? "" : "s"} (M was edited)`;
    let legendTextWidth;
    if (stepCount === 0) {
      legendTextWidth = ctx.measureText("Original shape").width;
    } else if (!shapeIsMnShape) {
      legendTextWidth = ctx.measureText(editedText).width;
    } else if (stepCount === 1) {
      legendTextWidth = ctx.measureText("M · shape").width;
    } else {
      const expStr = String(stepCount);
      ctx.font = "8px sans-serif";
      const expWidth = ctx.measureText(expStr).width;
      ctx.font = "12px sans-serif";
      legendTextWidth = ctx.measureText("M · shape").width + expWidth;
    }

    const legendW = legendPad + swatchW2 + legendPad + legendTextWidth + legendPad;

    const legendBg = isDark
      ? "rgba(0,0,0,0.5)"
      : isUnicorn
        ? "rgba(255,255,255,0.8)"
        : "rgba(255,255,255,0.75)";
    ctx.fillStyle = legendBg;
    ctx.beginPath();
    ctx.roundRect(legendX, legendY, legendW, legendH, 6);
    ctx.fill();

    // Color-wheel swatch
    const swatchX = legendX + legendPad, swatchY = legendY + 6, swatchH = 14;
    const segments = 6;
    for (let s = 0; s < segments; s++) {
      const hue = (s / segments) * 360;
      ctx.fillStyle = `hsl(${hue.toFixed(0)}, 35%, 58%)`;
      ctx.fillRect(
        swatchX + (s / segments) * swatchW2,
        swatchY,
        swatchW2 / segments + 1,
        swatchH,
      );
    }

    ctx.fillStyle = textColor2;
    ctx.textAlign = "left";
    if (stepCount === 0) {
      ctx.font = "12px sans-serif";
      ctx.fillText("Original shape", textX, textBaseline);
    } else if (!shapeIsMnShape) {
      ctx.font = "12px sans-serif";
      ctx.fillText(editedText, textX, textBaseline);
    } else if (stepCount === 1) {
      ctx.font = "12px sans-serif";
      ctx.fillText("M · shape", textX, textBaseline);
    } else {
      // Draw "M" then superscript exponent raised and smaller, then " · shape"
      ctx.font = "12px sans-serif";
      ctx.fillText("M", textX, textBaseline);
      const mWidth = ctx.measureText("M").width;
      ctx.font = "8px sans-serif";
      ctx.fillText(String(stepCount), textX + mWidth, textBaseline - 5);
      const expWidth = ctx.measureText(String(stepCount)).width;
      ctx.font = "12px sans-serif";
      ctx.fillText(" · shape", textX + mWidth + expWidth, textBaseline);
    }
  }, [currentTheme, basePoints, showEigenvectors, props, stepCount, trackedPoints, viewRange, shapeIsMnShape]);

  // Draw on changes (setupCanvas sizes the canvas to its layout size × DPR)
  useEffect(() => {
    drawVisualization();
  }, [drawVisualization]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleNextState = useCallback(() => {
    setBasePoints((prev) => applyMatrix(prev, matrix));
    setTrackedPoints((prev) => prev.map((pt) => ({
      cur: [
        matrix[0][0] * pt.cur[0] + matrix[0][1] * pt.cur[1],
        matrix[1][0] * pt.cur[0] + matrix[1][1] * pt.cur[1],
      ],
      trail: [...pt.trail, pt.cur].slice(-MAX_TRAIL),
    })));
    setAppliedMatrix((prev) => {
      if (prev === "mixed") return prev;
      if (prev === null || sameMatrix(prev, matrix)) return matrix.map((r) => [...r]);
      return "mixed";
    });
    setStepCount((n) => n + 1);
  }, [matrix]);

  const handleResetShape = useCallback(() => {
    setBasePoints(SHAPES[selectedShape]());
    setTrackedPoints([]);
    setStepCount(0);
    setAppliedMatrix(null);
  }, [selectedShape]);

  const handleResetMatrix = useCallback(() => {
    setMatrix(DEFAULT_MATRIX.map((r) => [...r]));
  }, []);

  const handleResetPoints = useCallback(() => {
    setTrackedPoints([]);
  }, []);

  const handleCanvasClick = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Pointer position in the canvas's own CSS pixels (correct even when
    // ToolContainer scales the tool down), then invert toCanvas
    const { x: px, y: py } = localPointer(e, canvas);
    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;
    const dx = ((px - W / 2) / (W / 2)) * viewRange;
    const dy = -((py - H / 2) / (H / 2)) * viewRange;
    setTrackedPoints((prev) => [...prev, { cur: [dx, dy], trail: [] }]);
  }, [viewRange]);

  // ── Properties display helpers ─────────────────────────────────────────────
  const { det, trace, kind, pairs } = props;
  const detStr = formatEig(det, 3);
  const traceStr = formatEig(trace, 3);
  const isComplex = kind === "complex";
  const isSingular = Math.abs(det) < 1e-9 * Math.max(1, trace * trace);

  // Eigenvalues sorted by descending magnitude (λ = larger, μ = smaller),
  // matching the arrows on the canvas
  let kindStr;
  let eigStr;
  if (isComplex) {
    const { re, im } = props.values[0];
    kindStr = `Complex: |λ| = ${props.modulus.toFixed(3)}, arg λ = ±${props.argDeg.toFixed(1)}°`;
    eigStr = `λ, μ = ${formatEig(re, 3)} ± ${Math.abs(im).toFixed(3)}i`;
  } else if (kind === "real-repeated-scalar") {
    kindStr = "Repeated; M = λI, every vector is an eigenvector:";
    eigStr = `λ = μ = ${formatEig(pairs[0].lam, 3)}`;
  } else if (kind === "real-repeated-defective") {
    kindStr = "Repeated; only one eigenvector direction:";
    eigStr = `λ = μ = ${formatEig(pairs[0].lam, 3)}`;
  } else {
    kindStr = "Two real eigenvalues:";
    eigStr = `λ = ${formatEig(pairs[0].lam, 3)},  μ = ${formatEig(pairs[1].lam, 3)}`;
  }
  const longRunStr = `Long run: ${describeLongRun(props)}`;

  const isDark = currentTheme === "dark";
  const isUnicorn = currentTheme === "unicorn";
  const textColor = isDark ? "#e5e7eb" : isUnicorn ? "#3b0764" : "#1f2937";
  const warnColor = isDark ? "#fbbf24" : "#b45309";

  return (
    <ToolContainer
      title="2D Matrix Visualizer"
      canvasWidth={9}
      canvasHeight={6}
    >
      {/* ── Left: 6×6 visualization window ─────────────────────────────────── */}
      <GridWindow
        x={0}
        y={0}
        w={6}
        h={6}
        theme={theme}
        tooltip="Linear map visualization"
      >
        <canvas
          ref={canvasRef}
          style={{ width: "100%", height: "100%", display: "block", cursor: "crosshair" }}
          onClick={handleCanvasClick}
        />
      </GridWindow>

      {/* ── Right column: controls ───────────────────────────────────────────── */}

      {/* 2×2 Matrix input */}
      <GridMatrixInput
        x={6}
        y={0}
        w={3}
        h={2}
        rows={2}
        cols={2}
        values={matrix}
        onChange={setMatrix}
        label="Matrix M"
        precision={3}
        theme={theme}
        tooltip="Enter the 2×2 matrix M"
      />

      {/* Shape selector */}
      <GridWheelSelector
        x={6}
        y={2}
        w={3}
        h={1}
        value={selectedShape}
        onChange={setSelectedShape}
        options={SHAPE_NAMES}
        title="Shape"
        theme={theme}
      />

      {/* Row y=3: three reset buttons */}
      <GridButton
        x={6}
        y={3}
        w={1}
        h={1}
        type="momentary"
        onPress={handleResetShape}
        bgColor="#6b7280"
        theme={theme}
        tooltip="Reset to original shape"
      >
        <div style={{ textAlign: "center", lineHeight: "1.1" }}>
          <div style={{ fontSize: "13px" }}>Reset</div>
          <div style={{ fontSize: "11px", opacity: 0.8 }}>Shape</div>
        </div>
      </GridButton>

      <GridButton
        x={7}
        y={3}
        w={1}
        h={1}
        type="momentary"
        onPress={handleResetPoints}
        bgColor="#6b7280"
        theme={theme}
        tooltip="Clear all tracked points"
      >
        <div style={{ textAlign: "center", lineHeight: "1.1" }}>
          <div style={{ fontSize: "13px" }}>Reset</div>
          <div style={{ fontSize: "11px", opacity: 0.8 }}>Points</div>
        </div>
      </GridButton>

      <GridButton
        x={8}
        y={3}
        w={1}
        h={1}
        type="momentary"
        onPress={handleResetMatrix}
        bgColor="#6b7280"
        theme={theme}
        tooltip="Reset matrix M to the identity"
      >
        <div style={{ textAlign: "center", lineHeight: "1.1" }}>
          <div style={{ fontSize: "13px" }}>Reset</div>
          <div style={{ fontSize: "11px", opacity: 0.8 }}>M = I</div>
        </div>
      </GridButton>

      {/* Row y=4: Next State (w=1) + Window Range (w=1) + Show/Hide Eigenvectors (w=1) */}
      <GridButton
        x={6}
        y={4}
        w={1}
        h={1}
        type="momentary"
        onPress={handleNextState}
        bgColor={isDark ? "#15803d" : isUnicorn ? "#7c3aed" : "#16a34a"}
        theme={theme}
        tooltip="Apply M to the current shape and points"
      >
        <div style={{ textAlign: "center", lineHeight: "1.1" }}>
          <div style={{ fontSize: "13px" }}>Next</div>
          <div style={{ fontSize: "11px", opacity: 0.8 }}>State</div>
        </div>
      </GridButton>

      <GridInput
        x={7}
        y={4}
        w={1}
        h={1}
        value={viewRange}
        onChange={(v) => setViewRange(Math.max(0.1, Math.min(1000, Number(v) || 3)))}
        min={0.1}
        max={1000}
        step={0.5}
        variable="Range ±"
        title="Window range: each axis runs from −value to +value (larger = zoom out)"
        theme={theme}
      />

      <GridButton
        x={8}
        y={4}
        w={1}
        h={1}
        type="toggle"
        active={showEigenvectors}
        onToggle={setShowEigenvectors}
        theme={theme}
        tooltip="Show or hide real eigenvectors as arrows"
      >
        <div style={{ textAlign: "center", lineHeight: "1.1" }}>
          <div style={{ fontSize: "13px" }}>
            {showEigenvectors ? "Hide" : "Show"}
          </div>
          <div style={{ fontSize: "11px", opacity: 0.8 }}>Eigenvecs</div>
        </div>
      </GridButton>

      {/* Properties panel */}
      <GridDisplay
        x={6}
        y={5}
        w={3}
        h={1}
        variant="info"
        align="left"
        fontSize="small"
        theme={theme}
        tooltip="Matrix properties"
      >
        <div
          style={{
            padding: "3px 8px",
            width: "100%",
            boxSizing: "border-box",
            fontSize: "12px",
            lineHeight: 1.3,
            color: textColor,
          }}
        >
          {/* det and trace on one line */}
          <div>
            <span>det M = </span>
            <span style={{ color: isSingular ? warnColor : textColor }}>
              {detStr}{isSingular && " ⚠ singular"}
            </span>
            <span style={{ margin: "0 8px", opacity: 0.4 }}>|</span>
            <span>tr M = {traceStr}</span>
          </div>
          {/* Eigenvalue type (and |λ|, arg λ for complex eigenvalues) */}
          <div style={{ fontSize: "11px" }}>{kindStr}</div>
          <div style={{ color: isComplex ? warnColor : textColor }}>{eigStr}</div>
          {/* One-line long-run behavior of repeated Next State */}
          <div style={{ fontSize: "11px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={longRunStr}>
            {longRunStr}
          </div>
        </div>
      </GridDisplay>
    </ToolContainer>
  );
};

export default TwoDimensionalMatrixVisualizerTool;
