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
