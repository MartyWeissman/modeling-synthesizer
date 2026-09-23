import { describe, it, expect } from "vitest";
import { DynamicalSystem1D } from "../src/utils/equationParser.js";
import {
  DT,
  historyValueAt,
  rk4DelayStep,
} from "../src/tools/oneDimensionalCalculatorMath.js";

const systems = (eq) => [
  new DynamicalSystem1D(eq, ["k", "X_tau"]),
  new DynamicalSystem1D(eq, ["k"], { substitute: { X_tau: "X" } }),
];

const run = (eq, { k = 1, tau = 0, x0 = 1, steps = 20 } = {}) => {
  const [s, e] = systems(eq);
  const h = [{ t: 0, x: x0 }];
  for (let i = 1; i <= steps; i++) {
    h.push({ t: i * DT, x: rk4DelayStep(s, e, h, DT, k, tau) });
  }
  return h;
};

describe("historyValueAt", () => {
  const h = [
    { t: 0, x: 1 },
    { t: 0.05, x: 2 },
    { t: 0.1, x: 4 },
  ];
  it("uses the initial value before t = 0", () => {
    expect(historyValueAt(h, -3)).toBe(1);
  });
  it("interpolates between samples", () => {
    expect(historyValueAt(h, 0.025)).toBeCloseTo(1.5, 12);
    expect(historyValueAt(h, 0.075)).toBeCloseTo(3, 12);
    expect(historyValueAt(h, 0.05)).toBeCloseTo(2, 12);
  });
  it("uses the latest value after the last sample", () => {
    expect(historyValueAt(h, 5)).toBe(4);
  });
});

describe("rk4DelayStep", () => {
  it("at tau = 0 is a real RK4 step of f(X, X) (not Euler)", () => {
    const h = run("-X_tau", { steps: 1 });
    const d = DT;
    const rk4 = 1 - d + d ** 2 / 2 - d ** 3 / 6 + d ** 4 / 24;
    expect(h[1].x).toBeCloseTo(rk4, 14);
    // Over t = 0..1 it matches e^{-1} to RK4 accuracy
    const h20 = run("-X_tau", { steps: 20 });
    expect(Math.abs(h20[20].x - Math.exp(-1))).toBeLessThan(1e-7);
  });

  it("uses X(t - tau) with a constant initial history", () => {
    // X' = -X(t-1), X = 1 for t <= 0  =>  X(t) = 1 - t on [0, 1]
    const h = run("-X_tau", { tau: 1, steps: 20 });
    expect(h[10].x).toBeCloseTo(0.5, 10);
    expect(h[20].x).toBeCloseTo(0, 10);
    // On [1, 2]: X(t) = 1 - t + (t-1)^2 / 2
    const h2 = run("-X_tau", { tau: 1, steps: 40 });
    expect(h2[30].x).toBeCloseTo(1 - 1.5 + 0.125, 6);
    expect(h2[40].x).toBeCloseTo(1 - 2 + 0.5, 6);
  });

  it("delayed logistic: kτ = 1 is damped, kτ = 2 oscillates", () => {
    const damped = run("k*X*(1-X_tau)", { k: 1, tau: 1, x0: 0.5, steps: 200 });
    const lateD = damped.slice(150).map((p) => p.x);
    expect(Math.max(...lateD) - Math.min(...lateD)).toBeLessThan(0.1);
    const sustained = run("2*X*(1-X_tau)", { tau: 1, x0: 0.5, steps: 200 });
    const lateS = sustained.slice(100).map((p) => p.x);
    expect(Math.max(...lateS) - Math.min(...lateS)).toBeGreaterThan(1);
  });

  it("ignores tau when the equation has no X_tau", () => {
    const a = run("X-X^3", { x0: 0.2, steps: 40 });
    const b = run("X-X^3", { x0: 0.2, tau: 0.5, steps: 40 });
    expect(b[40].x).toBeCloseTo(a[40].x, 12);
  });
});
