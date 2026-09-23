// src/utils/mathHelpers.js

// General math utilities
export const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export const lerp = (start, end, factor) => start + (end - start) * factor;

export const formatNumber = (num, decimals = 2) => {
  return Number(num).toFixed(decimals);
};

// Linear regression utilities

/** Means and mean-centred sums of squares/products (numerically stable). */
const centredSums = (points) => {
  const n = points.length;
  let meanX = 0;
  let meanY = 0;
  for (const p of points) {
    meanX += p.x;
    meanY += p.y;
  }
  meanX /= n;
  meanY /= n;
  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  let maxAbsX = 0;
  for (const p of points) {
    const dx = p.x - meanX;
    const dy = p.y - meanY;
    sxx += dx * dx;
    syy += dy * dy;
    sxy += dx * dy;
    maxAbsX = Math.max(maxAbsX, Math.abs(p.x));
  }
  return { n, meanX, meanY, sxx, syy, sxy, maxAbsX };
};

/**
 * Least-squares line y = slope·x + intercept.
 * Returns { slope, intercept, rSquared, isValid, pointCount, reason? }.
 * isValid is false (with a student-readable `reason`) when there are fewer
 * than two points or all x values are equal.
 */
export const calculateLinearRegression = (points) => {
  if (!points || points.length < 2) {
    return {
      slope: 0,
      intercept: 0,
      rSquared: 0,
      isValid: false,
      pointCount: points ? points.length : 0,
      reason: "Need at least 2 data points to fit a line.",
    };
  }

  const { n, meanX, meanY, sxx, syy, sxy, maxAbsX } = centredSums(points);

  // All x equal (up to rounding in the mean): the line would be vertical.
  const xTol = 1e-14 * maxAbsX;
  if (!(sxx > n * xTol * xTol) || !isFinite(sxx)) {
    return {
      slope: 0,
      intercept: 0,
      rSquared: 0,
      isValid: false,
      pointCount: n,
      reason: "All x values are the same, so no line can be fitted.",
    };
  }

  const slope = sxy / sxx;
  const intercept = meanY - slope * meanX;

  // R² = 1 − SS_res/SS_tot; SS_res = Syy − Sxy²/Sxx for the least-squares line.
  let rSquared;
  if (syy === 0) {
    rSquared = 1; // all y equal: the horizontal line fits exactly
  } else {
    let ssRes = 0;
    for (const p of points) {
      const r = p.y - (slope * p.x + intercept);
      ssRes += r * r;
    }
    rSquared = Math.min(1, Math.max(0, 1 - ssRes / syy));
  }

  return {
    slope,
    intercept,
    rSquared,
    isValid: true,
    pointCount: n,
  };
};

// Generate points for regression line within given bounds
export const generateRegressionLine = (
  slope,
  intercept,
  xRange,
  numPoints = 100,
) => {
  const [xMin, xMax] = xRange;
  const points = [];

  for (let i = 0; i <= numPoints; i++) {
    const x = xMin + (xMax - xMin) * (i / numPoints);
    const y = slope * x + intercept;
    points.push({ x, y });
  }

  return points;
};

// Calculate correlation coefficient (Pearson's r); 0 if undefined
export const calculateCorrelation = (points) => {
  if (!points || points.length < 2) return 0;
  const { sxx, syy, sxy } = centredSums(points);
  const denominator = Math.sqrt(sxx * syy);
  return denominator > 0 && isFinite(denominator) ? sxy / denominator : 0;
};

// Statistical utilities for regression
export const calculateStandardError = (points, slope, intercept) => {
  if (!points || points.length < 3) return 0;

  let sumSquaredResiduals = 0;
  for (const point of points) {
    const predicted = slope * point.x + intercept;
    sumSquaredResiduals += Math.pow(point.y - predicted, 2);
  }

  return Math.sqrt(sumSquaredResiduals / (points.length - 2));
};

// Validate regression data points
export const validateRegressionData = (points) => {
  if (!Array.isArray(points))
    return { isValid: false, error: "Data must be an array" };
  if (points.length < 2)
    return { isValid: false, error: "Need at least 2 data points" };

  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    if (!point || typeof point !== "object") {
      return { isValid: false, error: `Invalid point at index ${i}` };
    }
    if (typeof point.x !== "number" || typeof point.y !== "number") {
      return {
        isValid: false,
        error: `Point at index ${i} must have numeric x and y values`,
      };
    }
    if (!isFinite(point.x) || !isFinite(point.y)) {
      return {
        isValid: false,
        error: `Point at index ${i} contains infinite or NaN values`,
      };
    }
  }

  return { isValid: true };
};

// ============================================================================
// 1D Dynamical Systems Analysis
// ============================================================================
//
// All tolerances are scaled to the size of f on the window (F = max |f| over
// the sample grid), so the results do not change when f is multiplied by a
// constant (e.g. k = 0.001 vs k = 1).
//
//   ZERO_REL    |f| <= ZERO_REL · max(1, F) counts as "exactly zero"
//               (used for degenerate intervals and roots on grid points).
//               For F < 1 this is an absolute floor of 1e-13, so rounding
//               noise such as sin(X)^2 + cos(X)^2 - 1 counts as zero.
//   TANGENT_REL a local extremum of f with |f| <= TANGENT_REL · F is a
//               tangent (double) root.
//   POLE_RATIO  after bisecting a sign change, |f| at the bracket must have
//               shrunk to <= POLE_RATIO × its value at the grid points;
//               otherwise the sign change was a pole (tan X, 1/(X - 0.3)) or
//               a jump, not a root.

const ZERO_REL = 1e-13;
const TANGENT_REL = 1e-10;
const POLE_RATIO = 1e-3;
/** Minimum number of consecutive zero grid points for a degenerate interval. */
const MIN_ZERO_RUN = 4;

const sampleGrid = (f, xMin, xMax, gridSize) => {
  const xs = new Array(gridSize + 1);
  const fs = new Array(gridSize + 1);
  const mags = [];
  for (let i = 0; i <= gridSize; i++) {
    // index-based (no accumulated rounding); endpoints exact
    const x = i === gridSize ? xMax : xMin + ((xMax - xMin) * i) / gridSize;
    const v = f(x);
    xs[i] = x;
    fs[i] = Number.isFinite(v) ? v : NaN;
    if (Number.isFinite(v)) mags.push(Math.abs(v));
  }
  mags.sort((a, b) => a - b);
  const maxAbs = mags.length ? mags[mags.length - 1] : 0;
  // Typical size of f: 90th percentile of |f|, so that a spike next to a pole
  // (1/(X - 0.3) evaluated 1e-16 from the pole) does not inflate it.
  const scale = mags.length ? mags[Math.floor(0.9 * (mags.length - 1))] : 0;
  return { xs, fs, maxAbs, scale, zeroTol: ZERO_REL * Math.max(1, scale) };
};

/**
 * Mark grid points that are "zero". `inRun` marks points that are not to be
 * reported as roots: those in runs of >= MIN_ZERO_RUN (degenerate intervals)
 * and all but one point of shorter runs.
 */
const zeroRuns = (fs, zeroTol) => {
  const isZero = fs.map((v) => Number.isFinite(v) && Math.abs(v) <= zeroTol);
  const inRun = new Array(fs.length).fill(false);
  const runs = [];
  let i = 0;
  while (i < fs.length) {
    if (!isZero[i]) {
      i++;
      continue;
    }
    let j = i;
    while (j + 1 < fs.length && isZero[j + 1]) j++;
    if (j - i + 1 >= MIN_ZERO_RUN) {
      for (let m = i; m <= j; m++) inRun[m] = true;
      runs.push([i, j]);
    } else if (j > i) {
      // 2-3 consecutive near-zero points around one very flat root: keep only
      // the one with the smallest |f| as the root
      let best = i;
      for (let m = i + 1; m <= j; m++) if (Math.abs(fs[m]) < Math.abs(fs[best])) best = m;
      for (let m = i; m <= j; m++) if (m !== best) inRun[m] = true;
    }
    i = j + 1;
  }
  return { isZero, inRun, runs };
};

/** Bisection on interval width (to full double precision). */
const bisectWidth = (f, a, b, fa, fb, maxIterations = 200) => {
  for (let it = 0; it < maxIterations; it++) {
    const c = a + (b - a) / 2;
    if (c <= a || c >= b) break; // interval can't shrink further
    const fc = f(c);
    if (!Number.isFinite(fc)) return null;
    if (fc === 0) return { x: c, fa: 0, fb: 0 };
    if (Math.sign(fc) === Math.sign(fa)) {
      a = c;
      fa = fc;
    } else {
      b = c;
      fb = fc;
    }
  }
  return { x: Math.abs(fa) <= Math.abs(fb) ? a : b, fa, fb };
};

/** Bisection plus the pole/jump check. Returns x or null. */
const refineSignChange = (f, a, b, fa, fb, tangentTol) => {
  const r = bisectWidth(f, a, b, fa, fb);
  if (!r) return null;
  const endMin = Math.min(Math.abs(r.fa), Math.abs(r.fb));
  const startMax = Math.max(Math.abs(fa), Math.abs(fb));
  if (endMin <= tangentTol || endMin <= POLE_RATIO * startMax) return r.x;
  return null; // |f| did not shrink: pole or jump discontinuity
};

/**
 * Between a point `good` where f is finite and a point `bad` where it is not,
 * locate the edge of the domain by bisection; return it if f -> 0 there.
 */
const domainEdge = (f, good, bad, fGood, tangentTol) => {
  let g = good;
  let b = bad;
  let fg = fGood;
  for (let it = 0; it < 200; it++) {
    const c = g + (b - g) / 2;
    if (c === g || c === b) break;
    const fc = f(c);
    if (Number.isFinite(fc)) {
      g = c;
      fg = fc;
    } else {
      b = c;
    }
  }
  if (Math.abs(fg) <= tangentTol || Math.abs(fg) <= POLE_RATIO * Math.abs(fGood)) return g;
  return null;
};

/** Golden-section search for the minimum of g on [a, b]. */
const goldenMin = (g, a, b, iterations = 120) => {
  const invPhi = (Math.sqrt(5) - 1) / 2;
  let x1 = b - invPhi * (b - a);
  let x2 = a + invPhi * (b - a);
  let g1 = g(x1);
  let g2 = g(x2);
  for (let it = 0; it < iterations && x2 - x1 > 0; it++) {
    if (g1 <= g2) {
      b = x2;
      x2 = x1;
      g2 = g1;
      x1 = b - invPhi * (b - a);
      g1 = g(x1);
    } else {
      a = x1;
      x1 = x2;
      g1 = g2;
      x2 = a + invPhi * (b - a);
      g2 = g(x2);
    }
  }
  return g1 <= g2 ? x1 : x2;
};

/**
 * Find the zeros of f on [xMin, xMax]: sign changes (refined by bisection,
 * with poles rejected), tangent/double roots (local extrema of f that touch
 * zero, including ones that sit exactly on a grid point), and pairs of close
 * roots between two grid points. Grid points inside a run of >= 4
 * consecutive zeros are treated as a degenerate interval, not as roots
 * (see findDegenerateIntervals1D).
 *
 * @param {(x:number)=>number} f
 * @returns {number[]} sorted roots
 */
export const findRoots1D = (f, xMin, xMax, gridSize = 200) => {
  if (!(xMax > xMin) || !(gridSize >= 2)) return [];
  const { xs, fs, maxAbs, scale, zeroTol } = sampleGrid(f, xMin, xMax, gridSize);
  if (maxAbs <= zeroTol) return []; // f is zero everywhere: a degenerate interval
  const tangentTol = Math.max(zeroTol, TANGENT_REL * scale);
  const { isZero, inRun } = zeroRuns(fs, zeroTol);
  const roots = [];
  const ok = (v) => Number.isFinite(v);

  for (let i = 0; i <= gridSize; i++) {
    if (!ok(fs[i])) {
      // Edge of the domain of f (e.g. sqrt(X) at 0): a root if f -> 0 there
      if (i < gridSize && ok(fs[i + 1]) && !inRun[i + 1]) {
        const e = domainEdge(f, xs[i + 1], xs[i], fs[i + 1], tangentTol);
        if (e !== null) roots.push(e);
      }
      if (i > 0 && ok(fs[i - 1]) && !inRun[i - 1]) {
        const e = domainEdge(f, xs[i - 1], xs[i], fs[i - 1], tangentTol);
        if (e !== null) roots.push(e);
      }
      continue;
    }

    // Roots on grid points
    if (isZero[i] && !inRun[i]) roots.push(xs[i]);

    // Sign change between grid points i and i+1 (a zero grid point with a
    // root just beside it, as in (X - 0.2)(X - 0.2005), is caught here too)
    if (i < gridSize && ok(fs[i + 1]) && fs[i] * fs[i + 1] < 0 && !(inRun[i] || inRun[i + 1])) {
      const r = refineSignChange(f, xs[i], xs[i + 1], fs[i], fs[i + 1], tangentTol);
      if (r !== null) roots.push(r);
    }
    if (isZero[i]) continue;

    // Local extremum of f toward zero at an interior grid point
    // (|f| no larger than its neighbours, same sign on both sides)
    if (i > 0 && i < gridSize) {
      const l = fs[i - 1];
      const r = fs[i + 1];
      if (!ok(l) || !ok(r) || isZero[i - 1] || isZero[i + 1]) continue;
      const s = Math.sign(fs[i]);
      if (Math.sign(l) !== s || Math.sign(r) !== s) continue;
      const a = Math.abs(fs[i]);
      if (a > Math.abs(l) || a > Math.abs(r)) continue;
      if (a === Math.abs(l) && a === Math.abs(r)) continue; // flat, e.g. floor(X)

      // Minimize s·f (unimodal for a dip toward zero)
      const g = (x) => {
        const v = f(x);
        return Number.isFinite(v) ? s * v : Infinity;
      };
      const xm = goldenMin(g, xs[i - 1], xs[i + 1]);
      const fm = f(xm);
      if (!ok(fm)) continue;
      if (Math.abs(fm) <= tangentTol) {
        roots.push(xm); // tangent root
      } else if (Math.sign(fm) !== s) {
        // The dip crosses zero twice between grid points
        const r1 = refineSignChange(f, xs[i - 1], xm, l, fm, tangentTol);
        const r2 = refineSignChange(f, xm, xs[i + 1], fm, r, tangentTol);
        if (r1 !== null) roots.push(r1);
        if (r2 !== null) roots.push(r2);
      }
    }
  }

  // x = 0 is a common exact root; bisection toward it returns 1e-60-ish
  const snap = 1e-12 * (xMax - xMin);
  for (let i = 0; i < roots.length; i++) if (Math.abs(roots[i]) < snap) roots[i] = 0;

  roots.sort((a, b) => a - b);
  const dedupTol = 1e-7 * (xMax - xMin);
  const unique = [];
  for (const x of roots) {
    if (unique.length === 0 || x - unique[unique.length - 1] > dedupTol) unique.push(x);
  }
  return unique;
};

/**
 * Find equilibrium points (zeros) of a 1D dynamical system.
 *
 * @param {DynamicalSystem1D} system - The 1D dynamical system
 * @param {Object} params - Parameter values, e.g., {k: 0.5}
 * @param {number} xMin - Minimum X value to search
 * @param {number} xMax - Maximum X value to search
 * @param {number} gridSize - Number of grid intervals for the initial search (default: 200)
 * @returns {Array<number>} - Array of equilibrium X values, sorted
 */
export const findEquilibria1D = (system, params, xMin, xMax, gridSize = 200) => {
  if (!system || !system.isValidSystem()) {
    return [];
  }
  return findRoots1D((x) => system.evaluateDerivative(x, params), xMin, xMax, gridSize);
};

/**
 * Sign of f just to one side of an equilibrium: probe at distance delta, and
 * move closer (halving) while the value there is zero, so that a zero
 * plateau further away does not hide the local behaviour.
 */
const sideSign = (f, x, delta, dir, tol) => {
  let d = delta;
  for (let i = 0; i < 40 && d > 0; i++) {
    const v = f(x + dir * d);
    if (!Number.isFinite(v)) return NaN;
    if (Math.abs(v) > tol) return Math.sign(v);
    d /= 2;
    if (d < 1e-12 * Math.max(1, Math.abs(x))) break;
  }
  return 0;
};

/**
 * Analyze stability of an equilibrium point from the sign of X' on each side.
 *
 * @param {DynamicalSystem1D} system - The 1D dynamical system
 * @param {Object} params - Parameter values
 * @param {number} equilibrium - The equilibrium X value
 * @param {number} deltaLeft - distance to probe on the left
 * @param {number} deltaRight - distance to probe on the right
 * @returns {Object} - {stable: boolean, type: "stable" | "unstable" | "semi-stable" | "unknown", flowDirection?}
 */
export const analyzeStability1D = (system, params, equilibrium, deltaLeft, deltaRight) => {
  if (!system || !system.isValidSystem()) {
    return { stable: false, type: "unknown" };
  }
  const f = (x) => system.evaluateDerivative(x, params);
  const tolerance = 1e-300;
  const leftSign = sideSign(f, equilibrium, deltaLeft, -1, tolerance);
  const rightSign = sideSign(f, equilibrium, deltaRight, +1, tolerance);

  if (!Number.isFinite(leftSign) || !Number.isFinite(rightSign) || leftSign === 0 || rightSign === 0) {
    return { stable: false, type: "unknown" };
  }
  if (leftSign !== rightSign) {
    return leftSign > 0 ? { stable: true, type: "stable" } : { stable: false, type: "unstable" };
  }
  return {
    stable: false,
    type: "semi-stable",
    flowDirection: leftSign > 0 ? "right" : "left",
  };
};

/**
 * Complete phase line analysis for 1D system
 * Finds equilibria (searching 10% beyond the window so that stability at the
 * edges is right), determines stability, and the flow between equilibria.
 *
 * @returns {Object} - {
 *     equilibria: [{x, stable, type}, ...]  (only those inside [xMin, xMax]),
 *     regions: [{xMin, xMax, flow: "right"|"left"|"zero", sign, derivative}, ...]
 *   }
 */
export const analyzePhaseLine1D = (system, params, xMin, xMax) => {
  if (!system || !system.isValidSystem()) {
    return { equilibria: [], regions: [] };
  }
  const f = (x) => system.evaluateDerivative(x, params);

  const xRange = xMax - xMin;
  const xMinExtended = xMin - 0.1 * xRange;
  const xMaxExtended = xMax + 0.1 * xRange;
  const equilibriumValues = findEquilibria1D(system, params, xMinExtended, xMaxExtended);

  const allEquilibria = equilibriumValues.map((x, i) => {
    const prev = i > 0 ? equilibriumValues[i - 1] : xMinExtended;
    const next = i < equilibriumValues.length - 1 ? equilibriumValues[i + 1] : xMaxExtended;
    const deltaLeft = Math.abs(x - prev) / 2;
    const deltaRight = Math.abs(next - x) / 2;
    return {
      x,
      ...analyzeStability1D(system, params, x, deltaLeft, deltaRight),
    };
  });

  const equilibria = allEquilibria.filter((eq) => eq.x >= xMin && eq.x <= xMax);

  // Flow in regions between equilibria
  const { zeroTol } = sampleGrid(f, xMin, xMax, 50);
  const regions = [];
  const inside = equilibriumValues.filter((x) => x > xMin && x < xMax);
  const boundaries = [xMin, ...inside, xMax];
  for (let i = 0; i < boundaries.length - 1; i++) {
    const regionMin = boundaries[i];
    const regionMax = boundaries[i + 1];
    const derivative = f((regionMin + regionMax) / 2);
    let flow = "zero";
    let sign = 0;
    if (derivative > zeroTol) {
      flow = "right";
      sign = 1;
    } else if (derivative < -zeroTol) {
      flow = "left";
      sign = -1;
    }
    regions.push({ xMin: regionMin, xMax: regionMax, flow, sign, derivative });
  }

  return { equilibria, regions };
};

/**
 * Detect degenerate intervals where X' = 0 on a whole interval (not just at
 * isolated points), e.g. X' = 0, k = 0, or max(0, X - 0.5)·(1 - X).
 * "Zero" means |f| <= 1e-13 · max(1, max|f| on the window), so very flat
 * but nonzero functions such as X^4 or 0.01·X^3 are not reported.
 *
 * @param {DynamicalSystem1D} system - The 1D dynamical system
 * @param {Object} params - Parameter values
 * @param {number} xMin - Minimum X value
 * @param {number} xMax - Maximum X value
 * @param {number} gridSize - Number of grid intervals (default: 200)
 * @returns {Array<{xMin: number, xMax: number}>} - Array of degenerate intervals
 */
export const findDegenerateIntervals1D = (system, params, xMin, xMax, gridSize = 200) => {
  if (!system || !system.isValidSystem() || !(xMax > xMin)) {
    return [];
  }
  const f = (x) => system.evaluateDerivative(x, params);
  const { xs, fs, zeroTol } = sampleGrid(f, xMin, xMax, gridSize);
  const { runs } = zeroRuns(fs, zeroTol);

  const intervals = [];
  for (const [i, j] of runs) {
    // Verify with extra samples between the grid points
    const a = xs[i];
    const b = xs[j];
    const samples = 4 * (j - i);
    let allZero = true;
    for (let m = 1; m < samples; m++) {
      const v = f(a + ((b - a) * m) / samples);
      if (!Number.isFinite(v) || Math.abs(v) > zeroTol) {
        allZero = false;
        break;
      }
    }
    if (allZero) intervals.push({ xMin: a, xMax: b });
  }
  return intervals;
};

/**
 * Filter out equilibria that fall within degenerate intervals
 *
 * @param {Array} equilibria - Array of equilibrium objects {x, stable, type}
 * @param {Array} degenerateIntervals - Array of intervals {xMin, xMax}
 * @returns {Array} - Filtered equilibria that don't overlap with degenerate intervals
 */
export const filterEquilibriaFromDegenerateIntervals = (equilibria, degenerateIntervals) => {
  if (!degenerateIntervals || degenerateIntervals.length === 0) {
    return equilibria;
  }
  return equilibria.filter(
    (eq) => !degenerateIntervals.some((interval) => eq.x >= interval.xMin && eq.x <= interval.xMax),
  );
};

export { randomNormal, binomialSample } from "./random.js";
