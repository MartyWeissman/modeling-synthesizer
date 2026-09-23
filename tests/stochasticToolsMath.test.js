import { describe, it, expect } from "vitest";
import {
  coinWalkFunnel,
  coinWalkYRange,
  formatExpected,
  uniformSumStats,
  zScore,
  birthDeathStep,
  birthDeathGrowthFactor,
  birthDeathExtinctionProb,
  stokesEinsteinD,
  BOLTZMANN_K,
} from "../src/tools/stochasticToolsMath.js";

const seeded = (seed = 7) => {
  // mulberry32
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

describe("coin flipper funnel", () => {
  it("is n(2p−1) ± k·2√(np(1−p))", () => {
    const pts = coinWalkFunnel(100, 0.5, 2, 4);
    expect(pts.map((p) => p.n)).toEqual([0, 25, 50, 75, 100]);
    expect(pts[0].y).toBe(0);
    expect(pts[4].y).toBeCloseTo(2 * 2 * Math.sqrt(25), 12); // 20
    const biased = coinWalkFunnel(100, 0.7, -1, 1);
    expect(biased[1].y).toBeCloseTo(100 * 0.4 - 2 * Math.sqrt(21), 12);
  });

  it("y-range contains the whole ±3σ funnel even when it bulges past its endpoints", () => {
    // p = 0.3: the +3σ curve peaks near n ≈ 12 above 0, although it ends at −12.5
    const [lo, hi] = coinWalkYRange(100, 0.3);
    let maxUpper = -Infinity;
    for (let n = 0; n <= 100; n += 0.5) {
      maxUpper = Math.max(maxUpper, n * -0.4 + 3 * 2 * Math.sqrt(n * 0.21));
    }
    expect(maxUpper).toBeGreaterThan(4);
    expect(hi).toBeGreaterThanOrEqual(maxUpper);
    expect(lo).toBeLessThanOrEqual(100 * -0.4 - 3 * 2 * Math.sqrt(21));
  });

  it("y-range contains the walk and is non-degenerate at p = 0 or 1", () => {
    const [lo, hi] = coinWalkYRange(10, 0.5, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(hi).toBeGreaterThan(10);
    expect(lo).toBeLessThan(-3 * 2 * Math.sqrt(2.5));
    const [lo1, hi1] = coinWalkYRange(20, 1);
    expect(lo1).toBeLessThan(0);
    expect(hi1).toBeGreaterThan(20);
  });

  it("formats expected counts without rounding to integers", () => {
    expect(formatExpected(3.7)).toBe("3.7");
    expect(formatExpected(50)).toBe("50");
    expect(formatExpected(100 * 0.33)).toBe("33");
    expect(formatExpected(7 * 0.37)).toBe("2.59");
    expect(formatExpected(-0)).toBe("0");
  });
});

describe("tree ring statistics", () => {
  it("sum of uniforms: mean years·(min+max)/2, SD (max−min)·√(years/12)", () => {
    const { mean, sd } = uniformSumStats(50, 1, 5);
    expect(mean).toBe(150);
    expect(sd).toBeCloseTo(4 * Math.sqrt(50 / 12), 12);
  });

  it("z-score", () => {
    expect(zScore(160, 150, 5)).toBe(2);
    expect(zScore(3, 3, 0)).toBeNull();
  });
});

describe("birth–death (Yule simulator) step", () => {
  it("has mean growth factor (1−D)(1+B)", () => {
    const rng = seeded(1);
    const B = 0.05;
    const D = 0.02;
    const n = 1000;
    const reps = 4000;
    let sum = 0;
    for (let i = 0; i < reps; i++) sum += birthDeathStep(n, B, D, rng);
    const factor = sum / reps / n;
    // SD of the factor estimate ≈ √(Var/ n / reps) ≈ 0.0004
    expect(factor).toBeCloseTo(birthDeathGrowthFactor(B, D), 2);
    expect(Math.abs(factor - 0.98 * 1.05)).toBeLessThan(0.002);
  });

  it("matches the per-individual model exactly in distribution for a single cell", () => {
    const rng = seeded(2);
    const B = 0.3;
    const D = 0.2;
    const counts = [0, 0, 0];
    const reps = 40000;
    for (let i = 0; i < reps; i++) counts[birthDeathStep(1, B, D, rng)]++;
    expect(counts[0] / reps).toBeCloseTo(D, 1);
    expect(counts[2] / reps).toBeCloseTo((1 - D) * B, 1);
  });

  it("extinction probability q^N0 with q = min(1, D/((1−D)B)) matches simulation", () => {
    const B = 0.1;
    const D = 0.05;
    const q = birthDeathExtinctionProb(B, D, 1);
    expect(q).toBeCloseTo(0.05 / (0.95 * 0.1), 12);
    const rng = seeded(3);
    let extinct = 0;
    const reps = 3000;
    for (let r = 0; r < reps; r++) {
      let pop = 1;
      for (let t = 0; t < 400 && pop > 0 && pop < 500; t++) {
        pop = birthDeathStep(pop, B, D, rng);
      }
      if (pop === 0) extinct++;
    }
    // Binomial SD ≈ √(q(1−q)/reps) ≈ 0.009
    expect(Math.abs(extinct / reps - q)).toBeLessThan(0.04);
    expect(birthDeathExtinctionProb(0.05, 0.1, 3)).toBe(1);
    expect(birthDeathExtinctionProb(0.05, 0, 10)).toBe(0);
    expect(birthDeathExtinctionProb(0.05, 0.02, 10)).toBeCloseTo(
      Math.pow(0.02 / (0.98 * 0.05), 10),
      15,
    );
  });

  it("extinct stays extinct", () => {
    expect(birthDeathStep(0, 0.5, 0.1)).toBe(0);
  });
});

describe("Brownian motion", () => {
  it("Stokes–Einstein D = k_B T/(6πηr) in μm²/s", () => {
    // 20 °C, 1 cP, r = 0.5 μm (Lab Manual BM2 settings)
    const D = stokesEinsteinD(20, 1, 0.5);
    const expected =
      ((BOLTZMANN_K * 293.15) / (6 * Math.PI * 1e-3 * 0.5e-6)) * 1e12;
    expect(D).toBeCloseTo(expected, 12);
    expect(D).toBeCloseTo(0.4295, 3);
    // Slope of E(d²) vs t in 2-D is 4D = 2 k_B T/(3π r η) (Lab Manual BM3)
    const slope = ((2 * BOLTZMANN_K * 293.15) / (3 * Math.PI * 0.5e-6 * 1e-3)) * 1e12;
    expect(4 * D).toBeCloseTo(slope, 12);
  });
});
