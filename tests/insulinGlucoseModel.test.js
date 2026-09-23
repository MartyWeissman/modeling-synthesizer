import { describe, it, expect } from "vitest";
import {
  simulateInsulinGlucose,
  simulateInsulinGlucoseEuler,
  offScaleRuns,
  glucoseInput,
} from "../src/tools/insulinGlucoseModel.js";

const D = { m: 0.5, s: 1, q: 1, B: 1, gamma: 1 };
const LAB = { m: 2, s: 7, q: 3, B: 2, gamma: 5, alpha: 1, k: 2, c: 2 };
const last = (d) => d[d.length - 1];

// Exact equilibrium of the minimal model: s·I·G = m, γ·I = qB·G²/(1+G²).
function equilibrium({ m, s, q, B, gamma }) {
  let lo = 0;
  let hi = 100;
  const f = (G) => s * G * ((q * B * G * G) / (1 + G * G)) / gamma - m;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (f(mid) > 0) hi = mid;
    else lo = mid;
  }
  const G = (lo + hi) / 2;
  return { glucose: 5 * G, insulin: (100 * m) / (s * G) };
}

// The original explicit-Euler solver (dt = 0.1 h, delays in 6-minute steps,
// clamped at 0), used to check that the full tool's results did not change.
function oldEuler(p, mode) {
  const dt = 0.1;
  let G = 1;
  let I = 0.5;
  const tS = Math.round((p.tau || 0) / 60 / dt);
  const sS = Math.round((p.sigma || 0) / 60 / dt);
  const gh = Array(tS + 1).fill(G);
  const ih = Array(sS + 1).fill(I);
  const out = [];
  for (let i = 0; i <= 200; i++) {
    const t = i * dt;
    out.push({ glucose: G * 5, insulin: I * 100 });
    const Gt = tS === 0 ? G : gh[gh.length - tS - 1];
    const Is = sS === 0 ? I : ih[ih.length - sS - 1];
    const f = (Gt * Gt) / (1 + Gt * Gt);
    const me = p.m + glucoseInput(mode, t);
    const liver = (p.alpha || 0) / (1 + Math.exp((p.k ?? 1) * Is - (p.c ?? 1)));
    G += (me + liver - p.s * I * G) * dt;
    I += (p.q * p.B * f - p.gamma * I) * dt;
    G = Math.max(0, G);
    I = Math.max(0, I);
    gh.push(G);
    ih.push(I);
  }
  return out;
}

describe("minimal model (RK4)", () => {
  it("is exactly at equilibrium at the defaults: 5 mM and 50 pM", () => {
    const d = simulateInsulinGlucose(D);
    for (const p of d) {
      expect(p.glucose).toBeCloseTo(5, 10);
      expect(p.insulin).toBeCloseTo(50, 10);
    }
  });

  it("converges to the Lab Manual equilibria (IG5, IG6)", () => {
    for (const p of [
      { ...D, m: 1 }, // 7.33 mM, 68.2 pM
      { ...D, m: 1, B: 2 }, // back to 5 mM, 100 pM
      { ...D, B: 1.5, s: 0.2 }, // insulin resistance
    ]) {
      const e = equilibrium(p);
      const end = last(simulateInsulinGlucose(p));
      expect(end.glucose).toBeCloseTo(e.glucose, 2);
      expect(end.insulin).toBeCloseTo(e.insulin, 1);
    }
    expect(equilibrium({ ...D, m: 1 }).glucose).toBeCloseTo(7.328, 3);
  });

  it("stays positive and stable for extreme parameters (no fake hypoglycemia)", () => {
    const p = { m: 10, s: 10, q: 10, B: 10, gamma: 10 };
    const d = simulateInsulinGlucose(p, { mode: "meals" });
    expect(Math.min(...d.map((x) => x.glucose))).toBeGreaterThan(1);
    expect(last(d).glucose).toBeCloseTo(equilibrium(p).glucose, 2);
  });

  it("matches a much finer step (converged)", () => {
    const p = { ...LAB, tau: 40, sigma: 20 };
    const a = simulateInsulinGlucose(p, { mode: "challenge" });
    const b = simulateInsulinGlucose(p, { mode: "challenge", h: 0.001 });
    for (let i = 0; i < a.length; i += 50) {
      expect(Math.abs(a[i].glucose - b[i * 10].glucose)).toBeLessThan(0.01);
    }
  });
});

describe("full-tool solver (guarded Euler)", () => {
  it("gives exactly the old results for the Lab Manual scenarios", () => {
    const cases = [
      [LAB, "baseline"],
      [{ ...LAB, m: 0 }, "baseline"],
      [{ ...LAB, m: 3 }, "baseline"],
      [{ ...LAB, tau: 40 }, "challenge"],
      [{ ...LAB, tau: 30, sigma: 30 }, "meals"],
      [{ ...LAB, tau: 60, sigma: 60 }, "challenge"],
      [D, "meals"],
    ];
    for (const [p, mode] of cases) {
      const a = oldEuler(p, mode);
      const b = simulateInsulinGlucoseEuler(p, { mode });
      expect(b.length).toBe(a.length);
      a.forEach((x, i) => {
        expect(b[i].glucose).toBe(x.glucose);
        expect(b[i].insulin).toBe(x.insulin);
      });
    }
  });

  it("does not show fake hypoglycemia where the old solver clamped to 0", () => {
    const p = { m: 10, s: 10, q: 10, B: 10, gamma: 10 };
    expect(Math.min(...oldEuler(p, "baseline").map((x) => x.glucose))).toBe(0);
    const d = simulateInsulinGlucoseEuler(p);
    expect(Math.min(...d.map((x) => x.glucose))).toBeGreaterThan(1);
    expect(last(d).glucose).toBeCloseTo(2.5, 2);
    expect(last(d).insulin).toBeCloseTo(200, 0);
  });
});

describe("offScaleRuns", () => {
  it("finds stretches above the axis and their peaks", () => {
    const data = [1, 13, 15, 11, 14, 2].map((glucose) => ({ glucose }));
    expect(offScaleRuns(data, "glucose", 12)).toEqual([
      { start: 1, end: 2, peakIndex: 2, peak: 15 },
      { start: 4, end: 4, peakIndex: 4, peak: 14 },
    ]);
  });
});
