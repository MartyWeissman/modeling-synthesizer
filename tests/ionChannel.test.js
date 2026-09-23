import { describe, it, expect, vi } from "vitest";

vi.mock("../src/components/grid", () => ({}));
vi.mock("../src/components/ui/ToolContainer", () => ({ default: () => null }));
vi.mock("../src/hooks/useTheme", () => ({ useTheme: () => ({}) }));

import {
  simulateChannel,
  computeStatistics,
  theoreticalOpenFraction,
} from "../src/tools/IonChannelSimulatorTool.jsx";

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

describe("ion channel simulator", () => {
  it("statistics count episodes of both states", () => {
    const s = computeStatistics([0, 0, 1, 1, 1, 0, 1, 0, 0, 0]);
    expect(s.timeOpen).toBe(4);
    expect(s.timeClosed).toBe(6);
    expect(s.avgOpenTime).toBe(2); // episodes 3, 1
    expect(s.avgClosedTime).toBe(2); // episodes 2, 1, 3
    expect(s.fractionOpen).toBeCloseTo(0.4, 12);
  });

  it("each recorded state matches the current plotted for that ms", () => {
    const rng = mulberry32(3);
    const { states, trace } = simulateChannel(0.3, 0.3, 2000, rng);
    expect(states[0]).toBe(0); // starts closed
    // noise sd is 0.2 pA, so |current - level| < 1 pA essentially always
    states.forEach((st, i) => {
      const level = st === 1 ? -2 : 0;
      expect(Math.abs(trace[i].current - level)).toBeLessThan(1.2);
    });
  });

  it("open dwell time is geometric with mean 1/p; fraction open matches theory", () => {
    const rng = mulberry32(9);
    const pOC = 0.1;
    const pCO = 0.2;
    const { states } = simulateChannel(pOC, pCO, 400000, rng);
    const s = computeStatistics(states);
    expect(s.avgOpenTime).toBeGreaterThan(9.7);
    expect(s.avgOpenTime).toBeLessThan(10.3);
    expect(s.avgClosedTime).toBeGreaterThan(4.85);
    expect(s.avgClosedTime).toBeLessThan(5.15);
    expect(theoreticalOpenFraction(pOC, pCO)).toBeCloseTo(2 / 3, 12);
    expect(Math.abs(s.fractionOpen - 2 / 3)).toBeLessThan(0.01);
    expect(theoreticalOpenFraction(0, 0)).toBeNull();
  });
});
