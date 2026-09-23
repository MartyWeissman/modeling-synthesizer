import { describe, it, expect, vi } from "vitest";

vi.mock("../src/components/grid", () => ({}));
vi.mock("../src/components/ui/ToolContainer", () => ({ default: () => null }));
vi.mock("../src/hooks/useTheme", () => ({ useTheme: () => ({}) }));

import { markovStep } from "../src/tools/TwoCompartmentMarkovTool.jsx";

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

describe("two-compartment Markov step", () => {
  it("one step matches the expected transition (lab manual Osm1 example)", () => {
    // 1000 in each, 20% A->B, 10% B->A: expect 900 in A, 1100 in B after 1 step
    const rng = mulberry32(1);
    let sumA = 0;
    const trials = 200;
    for (let t = 0; t < trials; t++) {
      const comps = [...Array(1000).fill("A"), ...Array(1000).fill("B")];
      markovStep(comps, 0.2, 0.1, rng);
      sumA += comps.filter((c) => c === "A").length;
    }
    expect(Math.abs(sumA / trials - 900)).toBeLessThan(5);
  });

  it("relaxes to the equilibrium 0.2 A = 0.1 B (about 667 / 1333)", () => {
    const rng = mulberry32(2);
    const comps = [...Array(1000).fill("A"), ...Array(1000).fill("B")];
    let sumA = 0;
    let n = 0;
    for (let step = 1; step <= 3000; step++) {
      markovStep(comps, 0.2, 0.1, rng);
      if (step > 50) {
        sumA += comps.filter((c) => c === "A").length;
        n++;
      }
    }
    expect(Math.abs(sumA / n - 2000 / 3)).toBeLessThan(5);
  });

  it("each particle switches at most once per step and indices are reported", () => {
    const rng = mulberry32(3);
    const comps = ["A", "B", "A", "B"];
    const before = [...comps];
    const switched = markovStep(comps, 1, 1, rng);
    expect(switched).toEqual([0, 1, 2, 3]);
    comps.forEach((c, i) => expect(c).not.toBe(before[i]));
  });
});
