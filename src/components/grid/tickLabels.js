// src/components/grid/tickLabels.js
// Tick-label formatting and label-width estimates shared by GridGraph,
// GridGraphDualY and GridTimeSeries.

import { formatTick, decimalsForStep } from "../../utils/ticks";

/**
 * The spacing to use for formatting a set of ticks: the smallest positive gap
 * between distinct numeric ticks. If that gap has no short exact decimal form
 * (e.g. 1/3), it is rounded to 2 significant digits so labels stay short.
 */
export function inferTickStep(ticks) {
  const nums = [...new Set((ticks || []).map(Number).filter(Number.isFinite))].sort(
    (a, b) => a - b,
  );
  let step = Infinity;
  for (let i = 1; i < nums.length; i++) {
    const d = nums[i] - nums[i - 1];
    if (d > 0 && d < step) step = d;
  }
  if (!Number.isFinite(step)) return undefined;
  if (decimalsForStep(step) >= 6) step = Number(step.toPrecision(2));
  return step;
}

/**
 * Labels to display for `ticks`. Uses `customLabels[i]` when given; otherwise
 * formats numbers with step-aware precision (never truncating digits). String
 * ticks are shown as-is.
 */
export function formatTickLabels(ticks, customLabels = null) {
  const list = ticks || [];
  const step = inferTickStep(list);
  return list.map((t, i) => {
    if (customLabels && customLabels[i] !== undefined && customLabels[i] !== null)
      return String(customLabels[i]);
    if (typeof t === "string") return t;
    return formatTick(t, step);
  });
}

/** Approximate width (px) of an 11px monospace tick label of the given text. */
export const TICK_CHAR_WIDTH = 6;

/**
 * Horizontal space reserved for y-axis tick labels (same formula the graphs
 * have always used: 6px per character + 10px margin, at least 25px), sized
 * from the labels that are actually displayed.
 */
export function yTickLabelSpace(labels) {
  const maxLen = (labels || []).reduce((m, l) => Math.max(m, String(l).length), 1);
  return Math.max(25, maxLen * TICK_CHAR_WIDTH + 10);
}

/** Width for a centred x-axis tick label box (at least the historical 30px). */
export function xTickLabelWidth(label) {
  return Math.max(30, String(label).length * 7 + 4);
}
