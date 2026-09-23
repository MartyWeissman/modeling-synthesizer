// src/utils/random.js
// Random-number helpers shared by the stochastic tools.
// Every function takes an optional `rng` (default Math.random) returning
// uniform values in [0, 1), so tests can use a seeded generator.

/**
 * Standard normal sample (Box–Muller), scaled to mean/sd.
 * Uses 1 − rng() so the argument of Math.log is in (0, 1] (never log(0)).
 */
export function randomNormal(mean = 0, sd = 1, rng = Math.random) {
  const u = 1 - rng(); // (0, 1]
  const v = rng();
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Variance n·p·(1−p) above which binomialSample uses the normal approximation. */
export const BINOMIAL_NORMAL_THRESHOLD = 25;

/**
 * Binomial(n, p) sample.
 * Exact (inverse-CDF walk from 0, O(mean) time) when n·p·(1−p) is below
 * BINOMIAL_NORMAL_THRESHOLD; otherwise the normal approximation
 * round(np + z·sqrt(np(1−p))) clamped to [0, n].
 *
 * @param {number} n - number of trials (non-negative integer)
 * @param {number} p - success probability
 * @param {() => number} [rng]
 * @returns {number} integer in [0, n]
 */
export function binomialSample(n, p, rng = Math.random) {
  n = Math.floor(n);
  if (!(n > 0) || !(p > 0)) return 0;
  if (p >= 1) return n;

  const variance = n * p * (1 - p);
  if (variance >= BINOMIAL_NORMAL_THRESHOLD) {
    const k = Math.round(n * p + Math.sqrt(variance) * randomNormal(0, 1, rng));
    return Math.min(n, Math.max(0, k));
  }

  // Exact inversion on the smaller of p, 1 − p (keeps the walk short and
  // (1 − q)^n well away from underflow).
  const flip = p > 0.5;
  const q = flip ? 1 - p : p;
  const ratio = q / (1 - q);
  let pmf = Math.pow(1 - q, n);
  let cdf = pmf;
  const u = rng();
  let k = 0;
  while (u > cdf && k < n) {
    pmf *= ((n - k) / (k + 1)) * ratio;
    k++;
    cdf += pmf;
    if (pmf === 0 && cdf < u) break; // rounding: u is in the far tail
  }
  return flip ? n - k : k;
}
