// src/tools/insulinGlucosePlot.js
// Canvas drawing shared by the two insulin-glucose tools: the glucose (red,
// solid) and insulin (blue, dashed) time series on a GridGraphDualY, the normal
// glucose band, scenario markers, off-scale markers and a legend placed where it
// covers the least data.

import { setupCanvas } from "../utils/canvas";
import { offScaleRuns } from "./insulinGlucoseModel";

const GLUCOSE_COLOR = "#ff4444";
const INSULIN_COLOR = "#4444ff";
const INSULIN_COLOR_DARK = "#7c8cff"; // lighter blue, readable on the dark theme
const INSULIN_DASH = [8, 4];

const fmt = (v) => (v >= 100 ? v.toFixed(0) : v.toFixed(1));

/**
 * Draw the insulin-glucose plot.
 *
 * canvas: the plot canvas (sized to transform.plotWidth × plotHeight in CSS px)
 * transform: the GridGraphDualY transform (plotWidth, plotHeight,
 *   dataToPixelLeft, dataToPixelRight)
 * data: [{ time, glucose (mM), insulin (pM) }]
 * options: {
 *   isDark, glucoseMax (top of left axis), insulinMax (top of right axis),
 *   markers: [{ time, label, color? , dash? }]
 * }
 */
export function drawInsulinGlucosePlot(canvas, transform, data, options) {
  if (!canvas || !transform) return;
  const { plotWidth, plotHeight, dataToPixelLeft, dataToPixelRight } =
    transform;
  const setup = setupCanvas(canvas, { width: plotWidth, height: plotHeight });
  if (!setup) return;
  const { ctx, width, height } = setup;
  const {
    isDark = false,
    glucoseMax = 12,
    insulinMax = 200,
    markers = [],
  } = options || {};
  const textColor = isDark ? "#ffffff" : "#000000";
  const insulinColor = isDark ? INSULIN_COLOR_DARK : INSULIN_COLOR;

  ctx.clearRect(0, 0, width, height);
  if (!data || data.length === 0) return;

  // Normal fasting glucose range (3.9–5.5 mM), on the left axis.
  const normalLowPos = dataToPixelLeft(0, 3.9);
  const normalHighPos = dataToPixelLeft(0, 5.5);
  ctx.fillStyle = "rgba(0, 255, 0, 0.1)";
  ctx.fillRect(0, normalHighPos.y, width, normalLowPos.y - normalHighPos.y);

  // Pixel positions of both series (values are NOT capped; the drawing is
  // clipped to the plot area instead).
  const gPts = data.map((p) => dataToPixelLeft(p.time, p.glucose));
  const iPts = data.map((p) => dataToPixelRight(p.time, p.insulin));

  const strokeSeries = (pts, color, lineWidth, dash) => {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, width, height);
    ctx.clip();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.setLineDash(dash);
    ctx.beginPath();
    pts.forEach((pos, i) => {
      // Keep far-off-screen values finite for the canvas.
      const y = Math.max(-10 * height, Math.min(11 * height, pos.y));
      if (i === 0) ctx.moveTo(pos.x, y);
      else ctx.lineTo(pos.x, y);
    });
    ctx.stroke();
    ctx.restore();
  };

  strokeSeries(gPts, GLUCOSE_COLOR, 3, []);
  strokeSeries(iPts, insulinColor, 2, INSULIN_DASH);

  // Off-scale markers: a small triangle at the top edge at the peak of each
  // stretch where a curve goes above the axis; the legend gives the peak value.
  const gRuns = offScaleRuns(data, "glucose", glucoseMax);
  const iRuns = offScaleRuns(data, "insulin", insulinMax);
  const drawTriangles = (runs, pts, color) => {
    ctx.fillStyle = color;
    runs.forEach((run) => {
      const x = Math.max(7, Math.min(width - 7, pts[run.peakIndex].x));
      ctx.beginPath();
      ctx.moveTo(x, 1);
      ctx.lineTo(x - 6, 11);
      ctx.lineTo(x + 6, 11);
      ctx.closePath();
      ctx.fill();
    });
  };
  drawTriangles(gRuns, gPts, GLUCOSE_COLOR);
  drawTriangles(iRuns, iPts, insulinColor);

  // Scenario markers (meals, snacks, challenge): dashed vertical line + label.
  markers.forEach((mk) => {
    const x = dataToPixelLeft(mk.time, 0).x;
    const color = mk.color || textColor;
    ctx.fillStyle = color;
    ctx.font = "11px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(mk.label, x, 15);
    ctx.strokeStyle = color;
    ctx.setLineDash(mk.dash || [2, 2]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, 20);
    ctx.lineTo(x, height);
    ctx.stroke();
    ctx.setLineDash([]);
  });

  // Legend text (with the peak value when a curve is off scale).
  const peakOf = (runs) => Math.max(...runs.map((r) => r.peak));
  const entries = [
    {
      label:
        gRuns.length > 0
          ? `Glucose (▲ off scale, peak ${fmt(peakOf(gRuns))} mM)`
          : "Glucose",
      color: GLUCOSE_COLOR,
      width: 3,
      dash: [],
    },
    {
      label:
        iRuns.length > 0
          ? `Insulin (▲ off scale, peak ${fmt(peakOf(iRuns))} pM)`
          : "Insulin",
      color: insulinColor,
      width: 2,
      dash: INSULIN_DASH,
    },
  ];
  ctx.font = "13px Arial";
  const textW = Math.max(...entries.map((e) => ctx.measureText(e.label).width));
  const legendW = Math.ceil(textW) + 52;
  const legendH = 44;

  // Candidate positions; pick the one covering the fewest data points
  // (marker lines count a little too). Ties keep the earlier candidate.
  const pad = 8;
  const top = 24; // below the marker labels
  const bottom = height - legendH - pad;
  const left = pad;
  const right = width - legendW - pad;
  const center = (width - legendW) / 2;
  const candidates = [
    [left, top],
    [right, top],
    [center, top],
    [left, bottom],
    [right, bottom],
    [center, bottom],
    [left, (height - legendH) / 2],
    [right, (height - legendH) / 2],
  ];
  const markerXs = markers.map((mk) => dataToPixelLeft(mk.time, 0).x);
  let best = candidates[0];
  let bestScore = Infinity;
  candidates.forEach(([lx, ly]) => {
    const x0 = lx - 4;
    const x1 = lx + legendW + 4;
    const y0 = ly - 4;
    const y1 = ly + legendH + 4;
    let score = 0;
    const count = (pts) => {
      for (const p of pts) {
        if (p.x >= x0 && p.x <= x1 && p.y >= y0 && p.y <= y1) score += 1;
      }
    };
    count(gPts);
    count(iPts);
    markerXs.forEach((mx) => {
      if (mx >= x0 && mx <= x1) score += 5;
    });
    if (score < bestScore) {
      bestScore = score;
      best = [lx, ly];
    }
  });
  const [legendX, legendY] = best;

  ctx.fillStyle = isDark ? "rgba(31, 41, 55, 0.9)" : "rgba(255, 255, 255, 0.9)";
  ctx.fillRect(legendX, legendY, legendW, legendH);
  ctx.strokeStyle = isDark ? "rgba(255, 255, 255, 0.3)" : "rgba(0, 0, 0, 0.3)";
  ctx.lineWidth = 1;
  ctx.strokeRect(legendX, legendY, legendW, legendH);

  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  entries.forEach((e, idx) => {
    const y = legendY + 12 + idx * 20;
    ctx.strokeStyle = e.color;
    ctx.lineWidth = e.width;
    ctx.setLineDash(e.dash);
    ctx.beginPath();
    ctx.moveTo(legendX + 10, y);
    ctx.lineTo(legendX + 40, y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = textColor;
    ctx.fillText(e.label, legendX + 46, y + 1);
  });
  ctx.textBaseline = "alphabetic";
}
