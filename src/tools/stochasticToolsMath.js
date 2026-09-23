// src/tools/stochasticToolsMath.js
// Pure math helpers for the Lab 5 (Randomness) tools: Rapid Coin Flipper,
// Tree Ring Simulator, Growth & Collapse Simulator, Yule Process Simulator,
// Brownian Motion Simulator. Kept free of React so they can be unit tested
// (tests/stochasticToolsMath.test.js).

import { binomialSample } from "../utils/random.js";

// ---------------------------------------------------------------------------
// Rapid Coin Flipper
// ---------------------------------------------------------------------------

/**
 * One curve of the random-walk funnel: after n flips the walk
 * (heads − tails) has mean n(2p−1) and SD 2√(np(1−p)), so the
 * "k-sigma" curve is n(2p−1) + k·2√(np(1−p)). k = 0 gives the expectation line.
 * Returns `samples + 1` points {n, y} for n from 0 to N.
 */
export function coinWalkFunnel(N, p, k, samples = 200) {
  const pts = [];
  const count = Math.max(1, samples);
  for (let i = 0; i <= count; i++) {
    const n = (N * i) / count;
    pts.push({ n, y: n * (2 * p - 1) + k * 2 * Math.sqrt(n * p * (1 - p)) });
  }
  return pts;
}

/**
 * Y-range for the random-walk graph: contains 0, the whole ±3σ funnel
 * (which can bulge beyond its endpoint values when p ≠ 0.5), and the walk
 * itself, plus 10% padding.
 */
export function coinWalkYRange(N, p, walkValues = []) {
  let lo = 0;
  let hi = 0;
  for (const k of [-3, 3]) {
    for (const { y } of coinWalkFunnel(N, p, k)) {
      if (y < lo) lo = y;
      if (y > hi) hi = y;
    }
  }
  for (const v of walkValues) {
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  if (hi - lo < 1e-9) {
    lo -= 1;
    hi += 1;
  }
  const pad = (hi - lo) * 0.1;
  return [lo - pad, hi + pad];
}

/**
 * Format an expected count without rounding it to an integer
 * (N·p has at most two decimals since p is set in steps of 0.01).
 * 50 → "50", 3.7 → "3.7", 33.33 → "33.33".
 */
export function formatExpected(x) {
  if (!Number.isFinite(x)) return String(x);
  const v = parseFloat(x.toFixed(2));
  return String(Object.is(v, -0) ? 0 : v);
}

// ---------------------------------------------------------------------------
// Tree Ring Simulator
// ---------------------------------------------------------------------------

/**
 * Expected total and SD of the sum of `years` independent Uniform(min, max)
 * ring widths: mean = years·(min+max)/2, SD = (max−min)·√(years/12).
 */
export function uniformSumStats(years, min, max) {
  const mean = (years * (min + max)) / 2;
  const sd = (max - min) * Math.sqrt(years / 12);
  return { mean, sd };
}

/** z-score (x − mean)/sd, or null when sd is 0. */
export function zScore(x, mean, sd) {
  if (!(sd > 0)) return null;
  return (x - mean) / sd;
}

// ---------------------------------------------------------------------------
// Yule Process Simulator (discrete-time birth–death process)
// ---------------------------------------------------------------------------

/**
 * One time step of the birth–death process for a population of `pop`:
 * each individual dies with probability `deathProb`, then each survivor
 * divides with probability `birthProb`. Returns the new population.
 */
export function birthDeathStep(pop, birthProb, deathProb, rng = Math.random) {
  if (pop <= 0) return 0;
  const deaths = binomialSample(pop, deathProb, rng);
  const survivors = pop - deaths;
  const births = binomialSample(survivors, birthProb, rng);
  return survivors + births;
}

/** Expected growth factor per step: (1 − D)(1 + B). */
export function birthDeathGrowthFactor(birthProb, deathProb) {
  return (1 - deathProb) * (1 + birthProb);
}

/**
 * Probability that one individual's line eventually dies out:
 * q = min(1, D / ((1 − D)·B)); the whole population (N₀ individuals) dies
 * out with probability q^N₀.
 */
export function birthDeathExtinctionProb(birthProb, deathProb, n0 = 1) {
  if (deathProb <= 0) return 0;
  if (deathProb >= 1 || birthProb <= 0) return 1;
  const q = Math.min(1, deathProb / ((1 - deathProb) * birthProb));
  return Math.pow(q, n0);
}

// ---------------------------------------------------------------------------
// Brownian Motion Simulator
// ---------------------------------------------------------------------------

export const BOLTZMANN_K = 1.380649e-23; // J/K

/**
 * Stokes–Einstein diffusion coefficient D = k_B T / (6π η r), in μm²/s.
 * @param {number} tempC - temperature in °C
 * @param {number} viscosityCP - viscosity in centipoise (1 cP = 1e-3 Pa·s)
 * @param {number} radiusUm - particle radius in μm
 */
export function stokesEinsteinD(tempC, viscosityCP, radiusUm) {
  const T = tempC + 273.15;
  const eta = viscosityCP * 1e-3;
  const r = radiusUm * 1e-6;
  return ((BOLTZMANN_K * T) / (6 * Math.PI * eta * r)) * 1e12;
}
