import { describe, it, expect } from "vitest";
import {
  hollingTannerRHS,
  hollingTannerRate,
  hollingTannerCoexistence,
  lotkaVolterraRHS,
  lotkaVolterraRate,
  lotkaVolterraEquilibria,
  advanceState,
} from "../src/tools/predatorPreyModels.js";
import { numericJacobian2D } from "../src/utils/stability.js";

const HT = { alpha: 0.1, beta: 1.0, c: 0.5, h: 1.0, m: 7.0, q: 1.0 };
const LV = { p: 0.03, q: 0.04, beta: 0.6, delta: 0.4 };

describe("Holling-Tanner coexistence equilibrium", () => {
  it("is a stable spiral at the lab-manual defaults (c = 0.5)", () => {
    const e = hollingTannerCoexistence(HT);
    expect(e.x).toBeCloseTo(4.1762, 3);
    expect(e.y).toBeCloseTo(4.1762, 3);
    expect(e.type).toBe("stable spiral");
    const [ds, dt] = hollingTannerRHS(HT)(e.x, e.y);
    expect(Math.abs(ds)).toBeLessThan(1e-12);
    expect(Math.abs(dt)).toBeLessThan(1e-12);
  });

  it("becomes an unstable spiral for larger c (Hopf near c ≈ 0.9)", () => {
    expect(hollingTannerCoexistence({ ...HT, c: 0.8 }).type).toBe("stable spiral");
    expect(hollingTannerCoexistence({ ...HT, c: 1.0 }).type).toBe("unstable spiral");
    expect(hollingTannerCoexistence({ ...HT, c: 1.2 }).type).toBe("unstable spiral");
  });

  it("analytic Jacobian matches a numerical one", () => {
    const e = hollingTannerCoexistence({ ...HT, c: 1.0 });
    const J = numericJacobian2D(hollingTannerRHS({ ...HT, c: 1.0 }), e.x, e.y);
    expect(e.trace).toBeCloseTo(J[0][0] + J[1][1], 5);
    expect(e.det).toBeCloseTo(J[0][0] * J[1][1] - J[0][1] * J[1][0], 5);
  });

  it("is null only for non-positive parameters (never the origin)", () => {
    expect(hollingTannerCoexistence({ ...HT, c: 0 })).toBeNull();
    for (const c of [0.1, 0.5, 1, 3]) {
      const e = hollingTannerCoexistence({ ...HT, c });
      expect(e.x).toBeGreaterThan(0);
      expect(e.y).toBeGreaterThan(0);
    }
  });
});

describe("Holling-Tanner integration near T = 0", () => {
  it("does not blow up when started at small or zero T", () => {
    const f = hollingTannerRHS(HT);
    const rate = (s, t) => hollingTannerRate(HT, s, t);
    for (const t0 of [0.02, 0.001, 0]) {
      let s = 3,
        t = t0;
      let maxT = t;
      for (let i = 0; i < 600; i++) {
        const r = advanceState(f, rate, s, t, 0.1);
        s = r.s;
        t = r.t;
        maxT = Math.max(maxT, t);
        expect(r.blownUp).toBe(false);
      }
      // T can never exceed its carrying capacity m by much
      expect(maxT).toBeLessThan(HT.m + 0.01);
    }
  });

  it("with c = 1.0 approaches a limit cycle that fits in the 0–6 window", () => {
    const P = { ...HT, c: 1.0 };
    const f = hollingTannerRHS(P);
    const rate = (s, t) => hollingTannerRate(P, s, t);
    let s = 2,
      t = 2;
    let minS = Infinity,
      maxS = 0,
      minT = Infinity,
      maxT = 0;
    for (let i = 0; i < 10000; i++) {
      ({ s, t } = advanceState(f, rate, s, t, 0.1));
      if (i > 8000) {
        minS = Math.min(minS, s);
        maxS = Math.max(maxS, s);
        minT = Math.min(minT, t);
        maxT = Math.max(maxT, t);
      }
    }
    expect(maxS - minS).toBeGreaterThan(1); // sustained oscillation
    expect(maxT - minT).toBeGreaterThan(3);
    expect(maxS).toBeLessThan(6);
    expect(maxT).toBeLessThan(6);
    expect(minT).toBeGreaterThan(0);
  });
});

describe("Lotka-Volterra", () => {
  it("interior equilibrium is a center, origin a saddle", () => {
    const [origin, interior] = lotkaVolterraEquilibria(LV);
    expect(origin.type).toBe("saddle");
    expect(interior.x).toBeCloseTo(15, 10);
    expect(interior.y).toBeCloseTo(40 / 3, 10);
    expect(interior.type).toBe("center");
  });

  it("has no interior equilibrium when p or q is 0", () => {
    expect(lotkaVolterraEquilibria({ ...LV, p: 0 })).toHaveLength(1);
    expect(lotkaVolterraEquilibria({ ...LV, q: 0 })).toHaveLength(1);
  });

  it("orbit from (2, 2) leaves the 0–50 window and still closes", () => {
    const f = lotkaVolterraRHS(LV);
    const rate = (s, t) => lotkaVolterraRate(LV, s, t);
    // conserved quantity V = qS − β ln S + pT − δ ln T
    const V = (s, t) =>
      LV.q * s - LV.beta * Math.log(s) + LV.p * t - LV.delta * Math.log(t);
    let s = 2,
      t = 2;
    const V0 = V(s, t);
    let maxPop = 0;
    for (let i = 0; i < 3000; i++) {
      ({ s, t } = advanceState(f, rate, s, t, 0.1));
      maxPop = Math.max(maxPop, s, t);
    }
    expect(maxPop).toBeGreaterThan(50); // goes off-screen; must not freeze there
    expect(Math.abs(V(s, t) - V0)).toBeLessThan(1e-4); // orbit closes (V conserved)
  });
});
