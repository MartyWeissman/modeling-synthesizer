import { describe, it, expect } from "vitest";
import { leslieLambda, leslieMatrix, matVecMul, eig2x2 } from "../src/utils/linearAlgebra.js";

// Brute force: power iteration on M + I (same eigenvectors, shifted spectrum,
// so it converges even for imprimitive matrices), with many iterations.
const powerIteration = (M, iters = 20000) => {
  const n = M.length;
  let v = Array.from({ length: n }, () => [1]);
  let lam = 0;
  for (let t = 0; t < iters; t++) {
    const Mv = matVecMul(M, v);
    const w = Mv.map((row, i) => [row[0] + v[i][0]]);
    const norm = w.reduce((s, r) => s + Math.abs(r[0]), 0);
    lam = norm / v.reduce((s, r) => s + Math.abs(r[0]), 0) - 1;
    v = w.map((r) => [r[0] / norm]);
  }
  return { lambda: lam, v: v.map((r) => r[0]) };
};

// Characteristic polynomial of a Leslie matrix: λ^n − Σ f_i l_i λ^(n−1−i)
const charPoly = (f, s, lam) => {
  let l = 1;
  let p = Math.pow(lam, f.length);
  for (let i = 0; i < f.length; i++) {
    p -= f[i] * l * Math.pow(lam, f.length - 1 - i);
    l *= s[i] ?? 0;
  }
  return p;
};

const pct = (w) => w.map((x) => Math.round(100 * x));

describe("leslieLambda", () => {
  it("f=(0.001,0,4), s=(0.5,0.5): λ ≈ 1.0003, 57/29/14 %", () => {
    const f = [0.001, 0, 4];
    const s = [0.5, 0.5];
    const r = leslieLambda(f, s);
    expect(r.lambda).toBeCloseTo(1.000333, 5);
    expect(pct(r.stableDistribution)).toEqual([57, 29, 14]);
    expect(r.period).toBe(1);
    expect(r.primitive).toBe(true);
    expect(Math.abs(charPoly(f, s, r.lambda))).toBeLessThan(1e-12);
    const pi = powerIteration(leslieMatrix(f, s));
    expect(r.lambda).toBeCloseTo(pi.lambda, 8);
  });

  it("f=(0,1,1), s=(0.5,0): unreachable class 3, λ = 1/√2, period 2", () => {
    const r = leslieLambda([0, 1, 1], [0.5, 0]);
    expect(r.lambda).toBeCloseTo(Math.SQRT1_2, 12);
    expect(r.reachable).toEqual([true, true, false]);
    expect(r.period).toBe(2);
    expect(r.primitive).toBe(false);
    expect(r.stableDistribution[2]).toBe(0);
    // The naive gcd over *all* fecund classes (2, 3) would say primitive.
  });

  it("f=(0,1.5,2,1,0), s=(0.5,0.8,0.7,0.4): λ ≈ 1.252, 54/22/14/8/2 %", () => {
    const f = [0, 1.5, 2, 1, 0];
    const s = [0.5, 0.8, 0.7, 0.4];
    const r = leslieLambda(f, s);
    expect(r.lambda).toBeCloseTo(1.252, 3);
    expect(pct(r.stableDistribution)).toEqual([54, 22, 14, 8, 2]);
    expect(r.primitive).toBe(true);
    const M = leslieMatrix(f, s);
    const pi = powerIteration(M);
    expect(r.lambda).toBeCloseTo(pi.lambda, 9);
    const piSum = pi.v.reduce((a, b) => a + b, 0);
    pi.v.forEach((x, i) => expect(r.stableDistribution[i]).toBeCloseTo(x / piSum, 8));
    // eigenvector checks: M w = λ w and vᵀ M = λ vᵀ
    const w = r.stableDistribution;
    const Mw = matVecMul(M, w.map((x) => [x])).map((row) => row[0]);
    Mw.forEach((x, i) => expect(x).toBeCloseTo(r.lambda * w[i], 12));
    const v = r.reproductiveValues;
    expect(v[0]).toBe(1);
    for (let j = 0; j < 5; j++) {
      const vM = v.reduce((sum, vi, i) => sum + vi * M[i][j], 0);
      expect(vM).toBeCloseTo(r.lambda * v[j], 12);
    }
    expect(v[4]).toBe(0); // post-reproductive
  });

  it("imprimitive: only the last class reproduces", () => {
    const r = leslieLambda([0, 0, 6], [0.5, 1 / 3]);
    expect(r.lambda).toBeCloseTo(1, 12);
    expect(r.period).toBe(3);
    expect(r.primitive).toBe(false);
  });

  it("near-imprimitive: tiny fecundity in class 1 makes it primitive", () => {
    const r = leslieLambda([1e-9, 4], [0.25]);
    expect(r.period).toBe(1);
    expect(r.primitive).toBe(true);
    expect(r.lambda).toBeCloseTo(1, 8);
    expect(Math.abs(charPoly([1e-9, 4], [0.25], r.lambda))).toBeLessThan(1e-12);
  });

  it("no reachable reproduction → λ = 0", () => {
    const r = leslieLambda([0, 0, 5], [0.5, 0]);
    expect(r.lambda).toBe(0);
    expect(r.stableDistribution).toBeNull();
    expect(leslieLambda(["", "", ""], ["", ""]).lambda).toBe(0);
  });

  it("accepts strings and blanks like the table input", () => {
    const r = leslieLambda(["0", "1.5", "2", "1", ""], ["0.5", "0.8", "0.7", "0.4"]);
    expect(r.lambda).toBeCloseTo(1.252, 3);
  });

  it("agrees with the characteristic polynomial on random matrices", () => {
    let seed = 12345;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let trial = 0; trial < 50; trial++) {
      const n = 2 + Math.floor(rnd() * 5);
      const f = Array.from({ length: n }, () => (rnd() < 0.3 ? 0 : rnd() * 5));
      const s = Array.from({ length: n - 1 }, () => rnd());
      const r = leslieLambda(f, s);
      if (r.lambda === 0) continue;
      expect(Math.abs(charPoly(f, s, r.lambda)) / Math.pow(r.lambda, n)).toBeLessThan(1e-10);
      if (r.primitive) {
        expect(r.lambda).toBeCloseTo(powerIteration(leslieMatrix(f, s), 5000).lambda, 6);
      }
    }
  });

  it("re-exports eig2x2", () => {
    expect(eig2x2([[2, 0], [0, 3]]).kind).toBe("real-distinct");
  });
});
