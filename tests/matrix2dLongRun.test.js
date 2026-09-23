import { describe, it, expect } from "vitest";
import { analyze2x2, describeLongRun } from "../src/tools/matrix2dLongRun.js";

describe("analyze2x2", () => {
  it("near-defective matrix is not reported as complex (round-off disc < 0)", () => {
    const a = analyze2x2([[0.6, 0.1], [-0.1, 0.8]]);
    expect(a.kind).toBe("real-repeated-defective");
    expect(a.pairs).toHaveLength(1);
    expect(a.pairs[0].lam).toBeCloseTo(0.7, 12);
  });
  it("scalar matrix gives both axes", () => {
    const a = analyze2x2([[2, 0], [0, 2]]);
    expect(a.kind).toBe("real-repeated-scalar");
    expect(a.pairs.map((p) => p.ev)).toEqual([[1, 0], [0, 1]]);
  });
  it("sorts real eigenvalues by magnitude (lab manual Les5 matrix)", () => {
    const a = analyze2x2([[0.1, 1.4], [0.4, 0.2]]);
    expect(a.pairs[0].lam).toBeCloseTo(0.9, 12);
    expect(a.pairs[1].lam).toBeCloseTo(-0.6, 12);
  });
  it("black bear matrix: 1.15 and 0.4, eigenvector (-20, 10) for 0.4", () => {
    const a = analyze2x2([[0.65, 0.5], [0.25, 0.9]]);
    expect(a.pairs[0].lam).toBeCloseTo(1.15, 12);
    expect(a.pairs[1].lam).toBeCloseTo(0.4, 12);
    const [x, y] = a.pairs[1].ev;
    expect(x / y).toBeCloseTo(-2, 10);
  });
  it("complex: modulus and argument", () => {
    const a = analyze2x2([[0, -1], [1, 0]]);
    expect(a.kind).toBe("complex");
    expect(a.modulus).toBeCloseTo(1, 12);
    expect(a.argDeg).toBeCloseTo(90, 10);
  });
  it("string / blank entries are treated as numbers / 0", () => {
    const a = analyze2x2([["2", ""], [0, "0.5"]]);
    expect(a.pairs[0].lam).toBeCloseTo(2, 12);
    expect(a.pairs[1].lam).toBeCloseTo(0.5, 12);
  });
});

describe("describeLongRun", () => {
  const d = (M) => describeLongRun(analyze2x2(M));
  it("classifies common cases", () => {
    expect(d([[1, 0], [0, 1]])).toBe("keeps its size");
    expect(d([[2, 0], [0, 0.5]])).toBe("stretches along λ, shrinks along μ");
    expect(d([[0.65, 0.5], [0.25, 0.9]])).toBe("stretches along λ, shrinks along μ");
    expect(d([[0.5, 0.4], [0.1, 0.8]])).toBe("shrinks to 0 along λ");
    expect(d([[0.5, 0], [0, 0.5]])).toBe("shrinks to 0");
    expect(d([[2, 0], [0, 2]])).toBe("grows in every direction");
    expect(d([[3, 0], [0, 2]])).toBe("grows, lining up along λ");
    expect(d([[1, 1], [0, 1]])).toBe("drifts along the λ line, growing linearly");
    expect(d([[1, 0], [0, 0.5]])).toBe("settles onto the λ line");
    expect(d([[0, 1], [0, 0]])).toBe("collapses to 0 within 2 steps");
    expect(d([[-2, 0], [0, 0.5]])).toBe("stretches along λ, shrinks along μ, flipping each step");
    expect(d([[0, -1], [1, 0]])).toBe("rotates forever, turning 90.0° per step");
    expect(d([[0.5, -0.5], [0.5, 0.5]])).toBe("spirals in to 0, turning 45.0° per step");
    expect(d([[1, -1], [1, 1]])).toBe("spirals out, turning 45.0° per step");
  });
});
