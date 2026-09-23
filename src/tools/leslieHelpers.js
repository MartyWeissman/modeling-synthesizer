// src/tools/leslieHelpers.js
// Small pure helpers for the Leslie Matrix tool (kept separate for unit tests).

// Pseudolog: 0→0, 1→1, 10→2, 100→3, 1000→4 — evenly spaced on the axis.
// Linear between 0 and 1 (so values below 1, e.g. a declining population,
// stay on the plot and approach 0), logarithmic above 1; continuous at 1.
export const pseudoLog = (v) => (v <= 0 ? 0 : v < 1 ? v : Math.log10(v) + 1);

// Round proportions (summing to 1) to whole percentages that add up to
// exactly 100 (largest-remainder method).
export const roundPercents = (props) => {
  const raw = props.map((p) => p * 100);
  const out = raw.map(Math.floor);
  let left = 100 - out.reduce((a, b) => a + b, 0);
  const order = raw
    .map((r, i) => ({ i, frac: r - Math.floor(r) }))
    .sort((a, b) => b.frac - a.frac);
  for (let k = 0; left > 0 && k < order.length; k++, left--) out[order[k].i] += 1;
  return out;
};
