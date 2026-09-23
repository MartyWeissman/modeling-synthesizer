import { describe, it, expect } from "vitest";
import { eig2x2, classifyEquilibrium2D } from "../src/utils/stability.js";

describe("eig2x2", () => {
  it("recognizes defective matrices despite float noise", () => {
    expect(eig2x2([[0.8, 0.1], [-0.1, 0.6]]).kind).toBe("real-repeated-defective");
    expect(eig2x2([[0.9, 0.1], [-0.1, 0.7]]).kind).toBe("real-repeated-defective");
  });
  it("recognizes scalar matrices", () => {
    const e = eig2x2([[2, 0], [0, 2]]);
    expect(e.kind).toBe("real-repeated-scalar");
    expect(e.vectors.length).toBe(2);
  });
  it("complex pair", () => {
    const e = eig2x2([[0, -1], [1, 0]]);
    expect(e.kind).toBe("complex");
    expect(e.values[0].im).toBeCloseTo(1);
  });
  it("distinct real with eigenvectors", () => {
    const e = eig2x2([[2, 1], [1, 2]]);
    expect(e.values.map((v) => v.re)).toEqual([3, 1]);
    const [x, y] = e.vectors[0];
    expect(Math.abs(x - y)).toBeLessThan(1e-12);
  });
  it("singular matrix has a zero eigenvalue", () => {
    const e = eig2x2([[1, 2], [2, 4]]);
    expect(Math.min(...e.values.map((v) => Math.abs(v.re)))).toBeLessThan(1e-12);
  });
});

describe("classifyEquilibrium2D", () => {
  it("LV interior point is a center", () => expect(classifyEquilibrium2D([[0, 1], [-1, 0]]).type).toBe("center"));
  it("saddle", () => expect(classifyEquilibrium2D([[1, 0], [0, -1]]).type).toBe("saddle"));
  it("stable spiral", () => expect(classifyEquilibrium2D([[-0.1, 1], [-1, -0.1]]).type).toBe("stable spiral"));
  it("unstable node", () => expect(classifyEquilibrium2D([[2, 0], [0, 1]]).type).toBe("unstable node"));
  it("degenerate stable node", () => expect(classifyEquilibrium2D([[-1, 1], [0, -1]]).type).toBe("stable degenerate node"));
});
