import { describe, it, expect, vi } from "vitest";

// The tool module imports UI components that need a DOM at import time;
// stub them so the pure equilibrium function can be tested in Node.
vi.mock("../src/components/grid", () => ({}));
vi.mock("../src/components/ui/ToolContainer", () => ({ default: () => null }));
vi.mock("../src/components/Equation", () => ({ default: () => null }));
vi.mock("../src/hooks/useTheme", () => ({ useTheme: () => ({}) }));

const { glvEquilibria } = await import(
  "../src/tools/GeneralizedLotkaVolterraTool.jsx"
);

const find = (eqs, x, y) =>
  eqs.find((e) => Math.abs(e.x - x) < 1e-6 && Math.abs(e.y - y) < 1e-6);

describe("glvEquilibria", () => {
  it("default preset: saddle at the origin, stable spiral at (2.75, 1.5)", () => {
    const p = { alpha: 1.5, beta: -2, gamma: 0, delta: 0.5, u: -1, v: 1 };
    const eqs = glvEquilibria(p, 5, 5);
    expect(eqs.length).toBe(2);
    expect(find(eqs, 0, 0).type).toBe("saddle");
    const interior = find(eqs, 2.75, 1.5);
    expect(interior.type).toBe("stable spiral");
    expect(interior.stable).toBe(true);
  });

  it("competition preset is bistable once (9, 0) is in the window", () => {
    const p = { alpha: 0.9, beta: 1.8, gamma: 0.1, delta: 0.5, u: -0.8, v: -0.9 };
    const eqs = glvEquilibria(p, 10, 5);
    expect(eqs.length).toBe(4);
    expect(find(eqs, 0, 0).type).toBe("unstable node");
    expect(find(eqs, 9, 0).type).toBe("stable node");
    expect(find(eqs, 0, 3.6).type).toBe("stable node");
    const interior = eqs.find((e) => e.x > 0 && e.y > 0);
    expect(interior.x).toBeCloseTo(99 / 67, 6); // 1.4776
    expect(interior.y).toBeCloseTo(63 / 67, 6); // 0.9403
    expect(interior.type).toBe("saddle");
    // With the old Pmax = 5 the stable point (9, 0) was outside the window
    expect(find(glvEquilibria(p, 5, 5), 9, 0)).toBeUndefined();
  });

  it("predator-prey preset: interior equilibrium is a center", () => {
    const p = { alpha: -0.3, beta: 0.4, gamma: 0, delta: 0, u: 0.03, v: -0.04 };
    const eqs = glvEquilibria(p, 20, 20);
    expect(find(eqs, 0, 0).type).toBe("saddle");
    expect(find(eqs, 10, 10).type).toBe("center");
  });

  it("cooperation preset: stable coexistence at (6, 4)", () => {
    const p = { alpha: 0.2, beta: 1, gamma: 0.1, delta: 0.7, u: 0.1, v: 0.3 };
    const eq = find(glvEquilibria(p, 10, 10), 6, 4);
    expect(eq.stable).toBe(true);
    expect(eq.type).toBe("stable node");
  });

  it("zero discriminant is a degenerate node, not 'non-hyperbolic'", () => {
    // P' = P − P² + 0.5PQ, Q' = 1.5Q − 1.5Q²: at (1.5, 1)
    // J = [[-1.5, 0.75], [0, -1.5]] (repeated eigenvalue, one eigenvector).
    const p = { alpha: 1, beta: 1.5, gamma: 1, delta: 1.5, u: 0.5, v: 0 };
    const eq = find(glvEquilibria(p, 5, 5), 1.5, 1);
    expect(eq.type).toBe("stable degenerate node");
    expect(eq.stable).toBe(true);
  });
});
