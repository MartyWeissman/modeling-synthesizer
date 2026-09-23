import { describe, it, expect } from "vitest";
import { pseudoLog, roundPercents } from "../src/tools/leslieHelpers.js";

describe("pseudoLog", () => {
  it("maps 0, 1, 10, 100 to 0, 1, 2, 3", () => {
    expect([0, 1, 10, 100].map(pseudoLog)).toEqual([0, 1, 2, 3]);
  });
  it("never goes negative and is increasing below 1", () => {
    const vs = [0, 1e-9, 0.001, 0.05, 0.099, 0.5, 0.999, 1, 1.001, 5];
    const ys = vs.map(pseudoLog);
    ys.forEach((y) => expect(y).toBeGreaterThanOrEqual(0));
    for (let i = 1; i < ys.length; i++) expect(ys[i]).toBeGreaterThan(ys[i - 1]);
    expect(pseudoLog(-3)).toBe(0);
  });
});

describe("roundPercents", () => {
  it("always sums to 100", () => {
    const cases = [
      [1 / 3, 1 / 3, 1 / 3],
      [0.545, 0.215, 0.135, 0.085, 0.02],
      [0.125, 0.125, 0.125, 0.125, 0.125, 0.125, 0.125, 0.125],
      [1, 0, 0],
    ];
    cases.forEach((c) => expect(roundPercents(c).reduce((a, b) => a + b, 0)).toBe(100));
    expect(roundPercents([1 / 3, 1 / 3, 1 / 3]).sort()).toEqual([33, 33, 34]);
  });
});
