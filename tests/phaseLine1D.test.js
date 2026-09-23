import { describe, it, expect } from "vitest";
import { DynamicalSystem1D } from "../src/utils/equationParser.js";
import {
  findRoots1D,
  findEquilibria1D,
  analyzePhaseLine1D,
  findDegenerateIntervals1D,
  filterEquilibriaFromDegenerateIntervals,
} from "../src/utils/mathHelpers.js";

const sys = (eq) => {
  const s = new DynamicalSystem1D(eq, ["k"]);
  expect(s.isValidSystem(), s.getError()).toBe(true);
  return s;
};
// What the 1D calculator shows: equilibria not inside degenerate intervals
const phase = (eq, k = 0.5, xMin = -0.5, xMax = 1.5) => {
  const s = sys(eq);
  const a = analyzePhaseLine1D(s, { k }, xMin, xMax);
  const d = findDegenerateIntervals1D(s, { k }, xMin, xMax);
  return { eq: filterEquilibriaFromDegenerateIntervals(a.equilibria, d), degenerate: d, regions: a.regions };
};
const xs = (r) => r.eq.map((e) => e.x);
const types = (r) => r.eq.map((e) => e.type);

describe("equilibria and stability", () => {
  it("logistic k*X*(1-X): 0 unstable, 1 stable", () => {
    const r = phase("k*X*(1-X)");
    expect(xs(r)).toEqual([0, 1]);
    expect(types(r)).toEqual(["unstable", "stable"]);
    expect(r.degenerate).toEqual([]);
  });
  it("small k (0.001) still gives exactly 0 and 1", () => {
    for (const k of [0.001, 1e-6, -0.001]) {
      const r = phase("k*X*(1-X)", k);
      expect(r.eq).toHaveLength(2);
      expect(r.eq[0].x).toBe(0);
      expect(Math.abs(r.eq[1].x - 1)).toBeLessThan(1e-12);
      expect(types(r)).toEqual(k > 0 ? ["unstable", "stable"] : ["stable", "unstable"]);
      expect(r.degenerate).toEqual([]);
    }
  });
  it("tangent root exactly on a grid point: (X-0.2)^2 on [-0.5, 1.5]", () => {
    const r = phase("(X-0.2)^2");
    expect(r.eq).toHaveLength(1);
    expect(r.eq[0].x).toBeCloseTo(0.2, 7);
    expect(r.eq[0].type).toBe("semi-stable");
  });
  it("tangent roots between grid points", () => {
    for (const c of [0.2037, 0.206, 0.5, 0.99]) {
      const r = phase(`(X-${c})^2`);
      expect(r.eq).toHaveLength(1);
      expect(r.eq[0].x).toBeCloseTo(c, 7);
      expect(r.eq[0].type).toBe("semi-stable");
      const r2 = phase(`-(X-${c})^2 * 0.001`);
      expect(r2.eq).toHaveLength(1);
      expect(r2.eq[0].type).toBe("semi-stable");
    }
  });
  it("near-miss (X-0.2)^2 + 1e-6 has no equilibrium", () => {
    expect(phase("(X-0.2)^2 + 1e-6").eq).toEqual([]);
  });
  it("two roots closer than the grid spacing", () => {
    const r = phase("(X-0.2)*(X-0.2005)");
    expect(r.eq).toHaveLength(2);
    expect(r.eq[0].x).toBeCloseTo(0.2, 10);
    expect(r.eq[1].x).toBeCloseTo(0.2005, 10);
    expect(types(r)).toEqual(["stable", "unstable"]);
    const r2 = phase("(X-0.2037)*(X-0.2041)");
    expect(xs(r2).map((x) => +x.toFixed(4))).toEqual([0.2037, 0.2041]);
  });
  it("X^2 semi-stable, -X^3 stable, X^3 unstable, X^4 semi-stable", () => {
    expect(types(phase("X^2", 1, -1, 1))).toEqual(["semi-stable"]);
    expect(phase("X^2", 1, -1, 1).eq[0].x).toBe(0);
    expect(types(phase("-X^3", 1, -1, 1))).toEqual(["stable"]);
    expect(types(phase("X^3", 1, -1, 1))).toEqual(["unstable"]);
    expect(types(phase("X^4", 1, -1, 1))).toEqual(["semi-stable"]);
  });
  it("bistable X - X^3 (lab manual)", () => {
    const r = phase("X-X^3", 1, -2, 2);
    expect(xs(r).map((x) => +x.toFixed(9))).toEqual([-1, 0, 1]);
    expect(types(r)).toEqual(["stable", "unstable", "stable"]);
  });
  it("sin X on [-10, 10]: 7 equilibria, alternating", () => {
    const r = phase("sin(X)", 1, -10, 10);
    expect(r.eq).toHaveLength(7);
    r.eq.forEach((e, i) => expect(e.x).toBeCloseTo((i - 3) * Math.PI, 10));
    expect(types(r)).toEqual(["stable", "unstable", "stable", "unstable", "stable", "unstable", "stable"]);
  });
  it("rejects sign changes across poles", () => {
    const t = phase("tan(X)", 1, -3, 3);
    expect(xs(t)).toEqual([0]);
    expect(types(t)).toEqual(["unstable"]);
    expect(phase("1/(X-0.3)").eq).toEqual([]);
    expect(phase("1/(X-0.3)").degenerate).toEqual([]);
    expect(xs(phase("(X-1)/(X-0.3)")).map((x) => +x.toFixed(9))).toEqual([1]);
    expect(phase("floor(X) + 0.5").eq).toEqual([]); // jump, not a root
  });
  it("steep but continuous roots are kept", () => {
    const r = phase("cbrt(X-0.3)");
    expect(r.eq).toHaveLength(1);
    expect(r.eq[0].x).toBeCloseTo(0.3, 10);
    expect(r.eq[0].type).toBe("unstable");
  });
  it("root at the edge of the domain: sqrt(X) at 0", () => {
    const r = phase("sqrt(X)");
    expect(r.eq).toHaveLength(1);
    expect(Math.abs(r.eq[0].x)).toBeLessThan(1e-9);
    expect(xs(phase("ln(X)"))).toEqual([1]);
  });
  it("is invariant under scaling f by a constant", () => {
    for (const c of [1e-4, 1, 1e4]) {
      const r = phase(`${c}*(X-0.2)^2*(X-1)`);
      expect(r.eq.map((e) => +e.x.toFixed(6))).toEqual([0.2, 1]);
      expect(types(r)).toEqual(["semi-stable", "unstable"]);
    }
  });
});

describe("degenerate intervals", () => {
  it("X' = 0 and k = 0 are degenerate on the whole window", () => {
    expect(phase("0").degenerate).toEqual([{ xMin: -0.5, xMax: 1.5 }]);
    expect(phase("0").eq).toEqual([]);
    expect(phase("k*X*(1-X)", 0).degenerate).toEqual([{ xMin: -0.5, xMax: 1.5 }]);
    expect(phase("sin(X)^2 + cos(X)^2 - 1").degenerate).toHaveLength(1); // rounding noise
  });
  it("max(0, X-0.5)*(1-X) is zero on [-0.5, 0.5], with a stable equilibrium at 1", () => {
    const r = phase("max(0,X-0.5)*(1-X)", 1, -0.5, 1.5);
    expect(r.degenerate).toHaveLength(1);
    expect(r.degenerate[0].xMin).toBe(-0.5);
    expect(r.degenerate[0].xMax).toBeCloseTo(0.5, 12);
    expect(xs(r)).toEqual([1]);
    expect(types(r)).toEqual(["stable"]);
  });
  it("flat but nonzero functions are not degenerate", () => {
    expect(phase("X^4", 1, -1, 1).degenerate).toEqual([]);
    expect(phase("0.01*X^3", 1, -1, 1).degenerate).toEqual([]);
    expect(types(phase("0.01*X^3", 1, -1, 1))).toEqual(["unstable"]);
    expect(phase("X^6", 1, -1, 1).degenerate).toEqual([]);
    expect(phase("k*X*(1-X)", 0.001).degenerate).toEqual([]);
    expect(phase("k*X*(1-X)", 1e-9).degenerate).toEqual([]);
  });
});

describe("findRoots1D / findEquilibria1D", () => {
  it("works on a plain function", () => {
    expect(findRoots1D((x) => x * x - 2, 0, 3).map((x) => +x.toFixed(12))).toEqual([+Math.SQRT2.toFixed(12)]);
    expect(findRoots1D(() => 1, 0, 1)).toEqual([]);
    expect(findRoots1D((x) => x, 1, 0)).toEqual([]);
  });
  it("returns [] for an invalid system", () => {
    const bad = new DynamicalSystem1D("X(", ["k"]);
    expect(findEquilibria1D(bad, {}, 0, 1)).toEqual([]);
    expect(analyzePhaseLine1D(bad, {}, 0, 1)).toEqual({ equilibria: [], regions: [] });
    expect(findDegenerateIntervals1D(bad, {}, 0, 1)).toEqual([]);
  });
  it("regions report the flow direction", () => {
    const r = phase("k*X*(1-X)");
    expect(r.regions.map((g) => g.flow)).toEqual(["left", "right", "left"]);
  });
});
