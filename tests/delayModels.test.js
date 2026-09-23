import { describe, it, expect } from "vitest";
import { delayRegime, dominantFrequency } from "../src/tools/delayModels.js";

// Simulate y' = -a y(t - tau) with y = y0 on [-tau, 0] (Euler, small step)
function simulate(a, tau, tMax, dt = 0.01) {
  const lag = Math.round(tau / dt);
  const n = Math.round(tMax / dt);
  const y = new Float64Array(n + 1);
  y[0] = 1;
  for (let i = 0; i < n; i++) {
    const yd = i - lag >= 0 ? y[i - lag] : 1;
    y[i + 1] = y[i] - dt * a * yd;
  }
  return y;
}
const minOf = (arr) => arr.reduce((m, v) => Math.min(m, v), Infinity);

describe("delayRegime", () => {
  it("uses a*tau against 1/e and pi/2", () => {
    expect(delayRegime(0, 10)).toBe("none");
    expect(delayRegime(0.05, 0)).toBe("none");
    expect(delayRegime(0.035, 10)).toBe("none"); // 0.35 < 1/e
    expect(delayRegime(0.05, 10)).toBe("damped"); // tremor defaults: 0.5
    expect(delayRegime(0.06, 26)).toBe("damped"); // 1.56 < pi/2
    expect(delayRegime(0.06, 27)).toBe("sustained"); // 1.62 > pi/2
    expect(delayRegime(0.1, 30)).toBe("sustained");
  });
  it("matches simulated behavior", () => {
    // monotone: never crosses 0
    expect(minOf(simulate(1, 0.3, 40))).toBeGreaterThan(0);
    // damped: crosses 0, decays
    const d = simulate(1, 1.0, 60);
    expect(minOf(d)).toBeLessThan(0);
    expect(Math.abs(d[d.length - 1])).toBeLessThan(0.01);
    // sustained: amplitude grows
    const g = simulate(1, 1.7, 80);
    const late = Math.max(...Array.from(g.slice(-1000)).map(Math.abs));
    expect(late).toBeGreaterThan(1);
  });
});

describe("dominantFrequency", () => {
  const samples = (fn, n = 1001) => Array.from({ length: n }, (_, i) => fn(i));
  it("finds a sinusoid's frequency", () => {
    const f = dominantFrequency(samples((i) => 20 + 3 * Math.sin((2 * Math.PI * 9.6 * i) / 1000)));
    expect(f).toBeCloseTo(9.6, 5);
  });
  it("ignores flat signals and slow trends", () => {
    expect(dominantFrequency(samples(() => 20))).toBeNull();
    expect(dominantFrequency(samples((i) => 20 + 5 * Math.exp(-i / 1000)))).toBeNull();
  });
});

import { delayedValue, hutchinsonStep } from "../src/tools/delayModels.js";

describe("delayedValue", () => {
  const h = [0, 10, 20, 30];
  it("interpolates and uses P0 before t = 0", () => {
    expect(delayedValue(h, 0.5, 0.75, 5)).toBeCloseTo(15);
    expect(delayedValue(h, 0.5, -1, 5)).toBe(5);
    expect(delayedValue(h, 0.5, 10, 5)).toBe(30);
  });
});

describe("hutchinsonStep", () => {
  const solve = (params, dt = 0.05, T = 1000) => {
    const h = [params.P0];
    const n = Math.round(T / dt);
    for (let i = 0; i < n; i++) h.push(hutchinsonStep(h, dt, params));
    return h;
  };
  it("tau = 0 matches the logistic solution", () => {
    const h = solve({ beta: 0.1, k: 100, tau: 0, P0: 50 }, 0.05, 20);
    const exact = 100 / (1 + Math.exp(-0.1 * 20));
    expect(h[h.length - 1]).toBeCloseTo(exact, 6);
  });
  it("beta*tau below pi/2 settles, above sustains (lab: beta = 0.02, k = 100)", () => {
    const late = (h) => h.slice(-4000);
    const span = (a) => Math.max(...a) - Math.min(...a);
    expect(span(late(solve({ beta: 0.02, k: 100, tau: 40, P0: 50 })))).toBeLessThan(1);
    expect(span(late(solve({ beta: 0.02, k: 100, tau: 90, P0: 50 })))).toBeGreaterThan(50);
  });
});
