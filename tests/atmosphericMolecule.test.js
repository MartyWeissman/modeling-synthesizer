import { describe, it, expect, vi } from "vitest";

vi.mock("../src/components/grid", () => ({}));
vi.mock("../src/components/ui/ToolContainer", () => ({ default: () => null }));
vi.mock("../src/hooks/useTheme", () => ({ useTheme: () => ({}) }));

import {
  stepHeight,
  scaleHeight,
  expectedBinFractions,
  expectedMeanHeight,
} from "../src/tools/AtmosphericMoleculeSimulator.jsx";
import { randomNormal } from "../src/utils/random.js";

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

describe("atmospheric molecule model", () => {
  it("scale height is sigma^2 / (2|mu|)", () => {
    // defaults: mu = -10/200 = -0.05, sigma^2 = 300/300 = 1  =>  H = 10
    expect(scaleHeight(-10, 300)).toBeCloseTo(10, 12);
    expect(scaleHeight(-50, 100)).toBeCloseTo(1 / 3 / 0.5, 12);
    expect(scaleHeight(-1, 500)).toBeCloseTo(5 / 3 / 0.01, 10);
  });

  it("bin fractions sum to 1 and mean of a steep profile is ~H", () => {
    const f = expectedBinFractions(-10, 300);
    expect(f.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
    expect(expectedMeanHeight(-50, 300)).toBeCloseTo(2, 6);
    // nearly flat profile -> mean close to half the box
    expect(expectedMeanHeight(-1, 500)).toBeGreaterThan(40);
    expect(expectedMeanHeight(-1, 500)).toBeLessThan(50);
  });

  it("keeps heights between ground and ceiling", () => {
    const rng = mulberry32(7);
    let h = 50;
    for (let i = 0; i < 20000; i++) {
      h = stepHeight(h, -1, 500, randomNormal(0, 1, rng) * 3);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThanOrEqual(100);
    }
  });

  it("simulated long-run mean height matches the theory", () => {
    const rng = mulberry32(11);
    for (const [g, T] of [
      [-10, 300],
      [-25, 300],
      [-10, 100],
    ]) {
      let h = 5;
      let sum = 0;
      let n = 0;
      for (let i = 0; i < 600000; i++) {
        h = stepHeight(h, g, T, randomNormal(0, 1, rng));
        if (i > 50000) {
          sum += h;
          n++;
        }
      }
      const theory = expectedMeanHeight(g, T);
      expect(Math.abs(sum / n / theory - 1)).toBeLessThan(0.06);
      // the old formula (sigma^2/|mu|) would be about twice as large
    }
  });
});
