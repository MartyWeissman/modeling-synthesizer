import { describe, it, expect, vi } from "vitest";

// The tool module imports UI components that need a DOM at import time;
// stub them so the pure simulation functions can be tested in Node.
vi.mock("../src/components/grid", () => ({}));
vi.mock("../src/components/ui/ToolContainer", () => ({ default: () => null }));
vi.mock("../src/hooks/useTheme", () => ({ useTheme: () => ({}) }));
vi.mock("../src/hooks/useSoundEffects", () => ({ useSoundEffects: () => ({}) }));

const { createRun, stepRun } = await import(
  "../src/tools/SelfInteractionSimulatorTool.jsx"
);

// Small deterministic PRNG (mulberry32)
const prng = (seed) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const meanHits = (n, fps, runs, seed) => {
  const rng = prng(seed);
  let total = 0;
  for (let r = 0; r < runs; r++) {
    const run = createRun(n, rng);
    let steps = 0;
    while (run.remaining > 0 && steps < 100000) {
      stepRun(run, 1 / fps);
      steps++;
    }
    total += run.hits;
  }
  return total / runs;
};

describe("self-interaction simulator physics", () => {
  it("a run lasts exactly 10 s of simulated time", () => {
    const run = createRun(10, prng(1));
    let steps = 0;
    while (run.remaining > 0) {
      stepRun(run, 1 / 60);
      steps++;
    }
    expect(steps).toBeGreaterThanOrEqual(600);
    expect(steps).toBeLessThanOrEqual(601);
  });

  it("hit counts do not depend on the display's frame rate", () => {
    const h60 = meanHits(10, 60, 300, 7);
    const h120 = meanHits(10, 120, 300, 7);
    const h30 = meanHits(10, 30, 300, 7);
    // Before the fix 120 Hz gave about 1.75x as many hits.
    expect(Math.abs(h120 / h60 - 1)).toBeLessThan(0.12);
    expect(Math.abs(h30 / h60 - 1)).toBeLessThan(0.12);
  });

  it("10 particles give about 5-12 hits per run (lab manual LO2)", () => {
    const h = meanHits(10, 60, 300, 3);
    expect(h).toBeGreaterThan(5);
    expect(h).toBeLessThan(12);
  });

  it("each pair is counted at most once", () => {
    const run = createRun(2, prng(5));
    for (let i = 0; i < 600; i++) stepRun(run, 1 / 60);
    expect(run.hits).toBeLessThanOrEqual(1);
  });
});
