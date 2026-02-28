// src/tools/TwoDimensionalMatrixVisualizerTool.jsx

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react"; // useMemo still used for props
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

const computeProperties = (mat) => {
  const a = mat[0][0],
    b = mat[0][1],
    c = mat[1][0],
    d = mat[1][1];
  const det = a * d - b * c;
  const trace = a + d;
  const disc = trace * trace - 4 * det;

  let eigenvalues, eigenvectors;

  if (disc >= 0) {
    const sq = Math.sqrt(disc);
    const lam1 = (trace + sq) / 2;
    const lam2 = (trace - sq) / 2;
    const isRepeated = Math.abs(lam1 - lam2) < 1e-9;

    // Deduplicate repeated eigenvalue
    eigenvalues = isRepeated ? [lam1] : [lam1, lam2];

    const getEigenvector = (lam) => {
      if (Math.abs(b) > 1e-9) {
        const nx = b,
          ny = lam - a;
        const norm = Math.sqrt(nx * nx + ny * ny);
        return [nx / norm, ny / norm];
      } else if (Math.abs(c) > 1e-9) {
        const nx = lam - d,
          ny = c;
        const norm = Math.sqrt(nx * nx + ny * ny);
        return [nx / norm, ny / norm];
      } else {
        // Diagonal case
        return Math.abs(lam - a) < 1e-9 ? [1, 0] : [0, 1];
      }
    };

    if (isRepeated) {
      eigenvectors = [getEigenvector(lam1)];
    } else {
      eigenvectors = [lam1, lam2].map(getEigenvector);
    }
  } else {
    const realPart = trace / 2;
    const imagPart = Math.sqrt(-disc) / 2;
    eigenvalues = { real: realPart, imag: imagPart };
    eigenvectors = null;
  }

  return { det, trace, eigenvalues, eigenvectors, disc };
};

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
  }, [selectedShape]);

  // Matrix properties
  const props = useMemo(() => computeProperties(matrix), [matrix]);

  // ── Drawing ────────────────────────────────────────────────────────────────
  const drawVisualization = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;

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

    // Pick a grid/tick spacing that gives ~5-10 lines across the view
    const rawSpacing = RANGE / 5;
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawSpacing)));
    const normalized = rawSpacing / magnitude;
    const tickSpacing = normalized < 1.5 ? magnitude
                      : normalized < 3.5 ? 2 * magnitude
                      : normalized < 7.5 ? 5 * magnitude
                      : 10 * magnitude;

    // Grid lines
    ctx.lineWidth = 0.5;
    ctx.strokeStyle = isDark
      ? "rgba(255,255,255,0.08)"
      : isUnicorn
        ? "rgba(168,85,247,0.12)"
        : "rgba(0,0,0,0.08)";
    const firstTick = Math.ceil(-RANGE / tickSpacing) * tickSpacing;
    for (let g = firstTick; g <= RANGE + tickSpacing * 0.01; g += tickSpacing) {
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
    for (let g = firstTick; g <= RANGE + tickSpacing * 0.01; g += tickSpacing) {
      if (Math.abs(g) < tickSpacing * 0.01) continue; // skip 0
      const label = Number(g.toPrecision(6)).toString(); // clean up float noise
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
    if (
      showEigenvectors &&
      Array.isArray(props.eigenvectors) &&
      props.eigenvectors
    ) {
      // Single color: black in light/unicorn, white in dark
      const evColor = isDark ? "#ffffff" : "#000000";

      // Sort so λ (index 0) = larger magnitude eigenvalue, μ (index 1) = smaller
      const eigenPairs = props.eigenvectors.map((ev, i) => ({
        ev,
        lam: Array.isArray(props.eigenvalues) ? props.eigenvalues[i] : 0,
      }));
      if (eigenPairs.length === 2) {
        eigenPairs.sort((a, b) => Math.abs(b.lam) - Math.abs(a.lam));
      }
      const labels = ["λ", "μ"];

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

      eigenPairs.forEach(({ ev: [ex, ey], lam }, idx) => {
        const scale = Math.min(Math.abs(lam) * 1.5, RANGE * 0.85);
        drawArrow(ex * scale, ey * scale, true);
        drawArrow(-ex * scale, -ey * scale, false);

        // Label
        const [lx, ly] = toCanvas(ex * scale * 1.12, ey * scale * 1.12);
        ctx.fillStyle = evColor;
        ctx.font = "bold 12px sans-serif";
        ctx.textAlign = lx > W / 2 ? "left" : "right";
        ctx.fillText(
          `${labels[idx]}=${lam.toFixed(2)}`,
          lx + (lx > W / 2 ? 4 : -4),
          ly - 4,
        );
      });
    }

    // ── Draw tracked points ───────────────────────────────────────────────
    const ptFill   = isDark ? "#111827" : isUnicorn ? "#fdf4ff" : "#ffffff";
    const ptStroke = isDark ? "#ffffff" : "#000000";
    for (const pt of trackedPoints) {
      const [ptx, pty] = toCanvas(pt.cur[0], pt.cur[1]);
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
    let legendTextWidth;
    if (stepCount === 0) {
      legendTextWidth = ctx.measureText("Original shape").width;
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
  }, [currentTheme, basePoints, showEigenvectors, props, stepCount, trackedPoints, viewRange]);

  // Resize + draw on changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (parent) {
      canvas.width = parent.clientWidth || 580;
      canvas.height = parent.clientHeight || 580;
    }
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
    })));
    setStepCount((n) => n + 1);
  }, [matrix]);

  const handleResetShape = useCallback(() => {
    setBasePoints(SHAPES[selectedShape]());
    setTrackedPoints([]);
    setStepCount(0);
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
    const rect = canvas.getBoundingClientRect();
    const W = canvas.width;
    const H = canvas.height;
    // Scale from CSS pixels to canvas pixels, then invert toCanvas
    const px = (e.clientX - rect.left) * (W / rect.width);
    const py = (e.clientY - rect.top) * (H / rect.height);
    const dx = ((px - W / 2) / (W / 2)) * viewRange;
    const dy = -((py - H / 2) / (H / 2)) * viewRange;
    setTrackedPoints((prev) => [...prev, { cur: [dx, dy] }]);
  }, [viewRange]);

  // ── Properties display helpers ─────────────────────────────────────────────
  const { det, trace, eigenvalues, disc } = props;
  const detStr = det.toFixed(3);
  const traceStr = trace.toFixed(3);

  // Sort eigenvalues by descending magnitude to match canvas λ/μ convention
  let eigStr;
  if (Array.isArray(eigenvalues)) {
    if (eigenvalues.length === 1) {
      eigStr = `λ = μ = ${eigenvalues[0].toFixed(3)} (repeated)`;
    } else {
      const sorted = [...eigenvalues].sort((a, b) => Math.abs(b) - Math.abs(a));
      eigStr = `λ = ${sorted[0].toFixed(3)},  μ = ${sorted[1].toFixed(3)}`;
    }
  } else {
    eigStr = `λ, μ = ${eigenvalues.real.toFixed(3)} ± ${eigenvalues.imag.toFixed(3)}i`;
  }

  const isComplex = disc < 0;
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
        onChange={(v) => setViewRange(Math.round(Math.max(1, Math.min(1000, v))))}
        min={1}
        max={1000}
        step={1}
        variable="Zoom"
        title="Window range (±value on each axis)"
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
            padding: "6px 10px",
            width: "100%",
            boxSizing: "border-box",
            fontSize: "12px",
            color: textColor,
          }}
        >
          {/* det and trace on one line */}
          <div style={{ marginBottom: "3px" }}>
            <span>det M = </span>
            <span style={{ color: Math.abs(det) < 1e-9 ? warnColor : textColor }}>
              {detStr}{Math.abs(det) < 1e-9 && " ⚠ singular"}
            </span>
            <span style={{ margin: "0 8px", opacity: 0.4 }}>|</span>
            <span>tr M = {traceStr}</span>
          </div>
          {/* Eigenvalues */}
          <div style={{ fontSize: "11px", marginBottom: "1px" }}>
            {isComplex
              ? "Complex conjugate eigenvalues:"
              : eigenvalues.length === 1
              ? "One repeated eigenvalue:"
              : "Two real eigenvalues:"}
          </div>
          <div style={{ color: isComplex ? warnColor : textColor }}>
            {eigStr}
          </div>
        </div>
      </GridDisplay>
    </ToolContainer>
  );
};

export default TwoDimensionalMatrixVisualizerTool;
