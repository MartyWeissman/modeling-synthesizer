import { describe, it, expect } from "vitest";
import { randomNormal, binomialSample } from "../src/utils/random.js";
import { randomNormal as rn2 } from "../src/utils/mathHelpers.js";

const seeded = (seed = 42) => {
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

const stats = (xs) => {
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  const v = xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1);
  return { m, v };
};

describe("randomNormal", () => {
  it("never takes log(0) even when rng returns 0", () => {
    const zero = () => 0;
    expect(Number.isFinite(randomNormal(0, 1, zero))).toBe(true);
    expect(rn2).toBe(randomNormal);
  });
  it("has the right mean and variance", () => {
    const rng = seeded(1);
    const xs = Array.from({ length: 40000 }, () => randomNormal(3, 2, rng));
    const { m, v } = stats(xs);
    expect(Math.abs(m - 3)).toBeLessThan(0.05);
    expect(Math.abs(v - 4)).toBeLessThan(0.15);
  });
});

describe("binomialSample", () => {
  it("edge cases", () => {
    expect(binomialSample(0, 0.5)).toBe(0);
    expect(binomialSample(10, 0)).toBe(0);
    expect(binomialSample(10, 1)).toBe(10);
    expect(binomialSample(-3, 0.5)).toBe(0);
  });
  it.each([
    [10, 0.3],
    [20, 0.9],
    [1000, 0.002],
    [100000, 0.00005],
    [1000, 0.5], // normal approximation branch
    [1e6, 0.3],
  ])("n=%d p=%d: mean and variance", (n, p) => {
    const rng = seeded(n);
    const N = 20000;
    const xs = Array.from({ length: N }, () => binomialSample(n, p, rng));
    xs.forEach((x) => {
      expect(Number.isInteger(x)).toBe(true);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(n);
    });
    const { m, v } = stats(xs);
    const mu = n * p;
    const sigma2 = n * p * (1 - p);
    expect(Math.abs(m - mu)).toBeLessThan(5 * Math.sqrt(sigma2 / N) + 1e-9);
    expect(Math.abs(v / sigma2 - 1)).toBeLessThan(0.06);
  });
  it("exact branch matches the pmf for n=5, p=0.5", () => {
    const rng = seeded(7);
    const counts = Array(6).fill(0);
    const N = 64000;
    for (let i = 0; i < N; i++) counts[binomialSample(5, 0.5, rng)]++;
    [1, 5, 10, 10, 5, 1].forEach((c, k) => expect(counts[k] / N).toBeCloseTo(c / 32, 2));
  });
});
