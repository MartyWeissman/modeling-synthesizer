// src/utils/ticks.js
// Shared tick generation and tick-label formatting for all graphs.

/**
 * Round away floating-point noise (e.g. 0.30000000000000004 -> 0.3, -2.8e-17 -> 0).
 * `scale` is a typical magnitude for the axis (e.g. the tick step); values much
 * smaller than it are treated as 0.
 */
export function cleanNumber(value, scale = 1) {
  if (!Number.isFinite(value)) return value;
  if (Math.abs(value) < Math.abs(scale) * 1e-9) return 0;
  return parseFloat(value.toPrecision(12));
}

/** Number of decimal places needed to show `step` exactly (capped at 6). */
export function decimalsForStep(step) {
  if (!Number.isFinite(step) || step === 0) return 0;
  const s = Math.abs(step);
  for (let d = 0; d <= 6; d++) {
    if (Math.abs(Math.round(s * 10 ** d) - s * 10 ** d) < 1e-6) return d;
  }
  return 6;
}

/**
 * Format a tick value as a short, correct label. Never truncates digits.
 * - `step` (optional): spacing between ticks; controls the number of decimals.
 * Large/small magnitudes use compact exponent form (e.g. "1.5e4").
 */
export function formatTick(value, step) {
  if (typeof value === "string") return value;
  if (!Number.isFinite(value)) return String(value);
  const v = cleanNumber(value, step || Math.abs(value) || 1);
  if (v === 0) return "0";
  const abs = Math.abs(v);
  if (abs >= 1e5 || abs < 1e-4) {
    // compact exponent form: 1.5e4, 2e-5
    const [m, e] = v.toExponential(2).split("e");
    return `${parseFloat(m)}e${parseInt(e, 10)}`;
  }
  const d =
    step !== undefined && step !== null
      ? decimalsForStep(step)
      : decimalsForStep(v);
  return parseFloat(v.toFixed(d)).toString();
}

/** A "nice" step (1, 2, 2.5, 5 × 10^k) giving about `targetCount` intervals. */
export function niceStep(min, max, targetCount = 5) {
  const span = Math.abs(max - min);
  if (!Number.isFinite(span) || span === 0) return 1;
  const raw = span / Math.max(1, targetCount);
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  let nice;
  if (norm <= 1) nice = 1;
  else if (norm <= 2) nice = 2;
  else if (norm <= 2.5) nice = 2.5;
  else if (norm <= 5) nice = 5;
  else nice = 10;
  return nice * mag;
}

/**
 * Evenly spaced ticks from min to max with the given step, computed by index
 * (no floating-point accumulation), all inside [min, max], no duplicates.
 */
export function linearTicks(min, max, step) {
  if (!(step > 0) || !Number.isFinite(min) || !Number.isFinite(max) || max < min)
    return [];
  const eps = step * 1e-9;
  const start = Math.ceil((min - eps) / step);
  const end = Math.floor((max + eps) / step);
  const ticks = [];
  for (let i = start; i <= end && ticks.length < 1000; i++) {
    ticks.push(cleanNumber(i * step, step));
  }
  return ticks;
}

/** Nice ticks covering [min, max] with about `targetCount` intervals. */
export function niceTicks(min, max, targetCount = 5) {
  return linearTicks(min, max, niceStep(min, max, targetCount));
}

/** Remove duplicate tick values (after cleaning float noise). */
export function uniqueTicks(ticks) {
  const seen = new Set();
  const out = [];
  for (const t of ticks) {
    const key = typeof t === "number" ? cleanNumber(t).toString() : String(t);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(t);
    }
  }
  return out;
}

/** Keep only ticks inside [min, max] (with a tiny tolerance). */
export function ticksInRange(ticks, min, max) {
  const tol = Math.abs(max - min) * 1e-9;
  return ticks.filter((t) => t >= min - tol && t <= max + tol);
}
