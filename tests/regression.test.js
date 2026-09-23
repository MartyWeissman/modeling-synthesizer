import { describe, it, expect } from "vitest";
import { calculateLinearRegression, calculateCorrelation } from "../src/utils/mathHelpers.js";

const pts = (arr) => arr.map(([x, y]) => ({ x, y }));

describe("calculateLinearRegression", () => {
  it("exact line", () => {
    const r = calculateLinearRegression(pts([[1, 3], [2, 5], [3, 7], [4, 9]]));
    expect(r.isValid).toBe(true);
    expect(r.slope).toBeCloseTo(2, 12);
    expect(r.intercept).toBeCloseTo(1, 12);
    expect(r.rSquared).toBeCloseTo(1, 12);
    expect(r.pointCount).toBe(4);
  });
  it("noisy data matches the textbook formulas", () => {
    const data = pts([[1, 2], [2, 3.9], [3, 6.2], [4, 7.8], [5, 10.1]]);
    const r = calculateLinearRegression(data);
    // hand computation: mean x = 3, mean y = 6, Sxx = 10, Sxy = 20.1
    expect(r.slope).toBeCloseTo(2.01, 12);
    expect(r.intercept).toBeCloseTo(6 - 2.01 * 3, 12);
    const ssRes = data.reduce((s, p) => s + (p.y - (r.slope * p.x + r.intercept)) ** 2, 0);
    const ssTot = data.reduce((s, p) => s + (p.y - 6) ** 2, 0);
    expect(r.rSquared).toBeCloseTo(1 - ssRes / ssTot, 12);
  });
  it("is accurate for large offsets (mean-centred sums)", () => {
    const base = 1e8;
    const r = calculateLinearRegression(pts([[base + 1, 1], [base + 2, 2], [base + 3, 3.5]]));
    expect(r.isValid).toBe(true);
    expect(r.slope).toBeCloseTo(1.25, 6);
  });
  it("all x equal → isValid false with a reason (no NaN)", () => {
    const r = calculateLinearRegression(pts([[2, 1], [2, 5], [2, 3]]));
    expect(r.isValid).toBe(false);
    expect(r.reason).toMatch(/x values are the same/);
    expect(Number.isNaN(r.slope)).toBe(false);
  });
  it("fewer than two points → isValid false", () => {
    expect(calculateLinearRegression([]).isValid).toBe(false);
    expect(calculateLinearRegression(null).isValid).toBe(false);
    expect(calculateLinearRegression(pts([[1, 1]])).reason).toMatch(/at least 2/);
  });
  it("all y equal → horizontal line, R² = 1", () => {
    const r = calculateLinearRegression(pts([[1, 4], [2, 4], [3, 4]]));
    expect(r.slope).toBe(0);
    expect(r.intercept).toBe(4);
    expect(r.rSquared).toBe(1);
  });
});

describe("calculateCorrelation", () => {
  it("perfect and zero correlation", () => {
    expect(calculateCorrelation(pts([[1, 2], [2, 4], [3, 6]]))).toBeCloseTo(1, 12);
    expect(calculateCorrelation(pts([[1, 6], [2, 4], [3, 2]]))).toBeCloseTo(-1, 12);
    expect(calculateCorrelation(pts([[1, 1], [1, 2]]))).toBe(0);
  });
});
