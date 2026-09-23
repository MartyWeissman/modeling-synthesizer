import { describe, it, expect, vi } from "vitest";

// The tool module imports UI components that need a browser; the model
// functions tested here don't use them.
vi.mock("../src/components/grid", () => ({}));
vi.mock("../src/components/ui/ToolContainer", () => ({ default: () => null }));
vi.mock("../src/hooks/useTheme", () => ({ useTheme: () => ({}) }));
import {
  driftGeneration,
  simulateDrift,
} from "../src/tools/GeneticDriftSimulator.jsx";

// Small deterministic PRNG (mulberry32) so the statistics are reproducible.
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("genetic drift model", () => {
  it("is neutral: E[A'] = A even when N(1+b) must be rounded", () => {
    // 1 A in 10 with b = 0.25 used to give E[freq] = 0.125 (rounding bias).
    const rng = mulberry32(1);
    const trials = 200000;
    let sum = 0;
    for (let i = 0; i < trials; i++) sum += driftGeneration(1, 10, 0.25, rng);
    const mean = sum / trials;
    // sd of one draw is < 1, so the standard error is < 0.003
    expect(mean).toBeGreaterThan(0.99);
    expect(mean).toBeLessThan(1.01);
  });

  it("keeps the population size fixed and counts in range", () => {
    const rng = mulberry32(2);
    const { data } = simulateDrift({ N: 50, births: 0.7, percentA: 40, rng });
    expect(data).toHaveLength(301);
    for (const d of data) {
      expect(d.typeA + d.typeB).toBe(50);
      expect(d.typeA).toBeGreaterThanOrEqual(0);
    }
  });

  it("variance per generation matches Ne = N(1+b)/b for whole-number b", () => {
    const rng = mulberry32(3);
    const N = 100;
    for (const b of [1, 4]) {
      const trials = 40000;
      let s = 0;
      let s2 = 0;
      for (let i = 0; i < trials; i++) {
        const p = driftGeneration(50, N, b, rng) / N;
        s += p;
        s2 += p * p;
      }
      const mean = s / trials;
      const variance = s2 / trials - mean * mean;
      const Ne = (N * (1 + b)) / b;
      // exact hypergeometric variance: p(1-p)/N * (M - N)/(M - 1), M = N(1+b)
      const M = N * (1 + b);
      const predicted = ((0.25 / N) * (M - N)) / (M - 1);
      // ...which is p(1-p)/Ne up to the factor M/(M-1)
      expect(Math.abs(predicted / ((0.25 / Ne) * (M / (M - 1))) - 1)).toBeLessThan(1e-12);
      expect(Math.abs(variance / predicted - 1)).toBeLessThan(0.05);
    }
  });

  it("more births means stronger drift (faster fixation)", () => {
    const rng = mulberry32(4);
    const pFix = (births) => {
      let fixed = 0;
      const runs = 400;
      for (let i = 0; i < runs; i++) {
        const r = simulateDrift({ N: 100, births, percentA: 70, rng });
        if (r.fixationGeneration !== null) fixed++;
      }
      return fixed / runs;
    };
    const low = pFix(0.1);
    const mid = pFix(1);
    const high = pFix(10);
    // N = 100, 70% A, fixation within 300 generations
    expect(low).toBeLessThan(0.25); // b = 0.1: Ne ~ 11N, little drift
    expect(mid).toBeGreaterThan(0.6); // b = 1 (default): about 70%
    expect(mid).toBeLessThan(0.82);
    expect(high).toBeGreaterThan(0.85); // b = 10: Ne ~ 1.1N
    expect(low).toBeLessThan(mid);
    expect(mid).toBeLessThan(high);
  });

  it("records the generation at which fixation happens", () => {
    const rng = mulberry32(5);
    const r = simulateDrift({ N: 10, births: 1, percentA: 50, rng });
    expect(r.fixationGeneration).not.toBeNull();
    const g = r.fixationGeneration;
    const d = r.data[g];
    expect(d.typeA === 0 || d.typeB === 0).toBe(true);
    const before = r.data[g - 1];
    expect(before.typeA > 0 && before.typeB > 0).toBe(true);
  });
});
