// src/tools/matrix2dLongRun.js
// Eigen summary and long-run behavior of the discrete linear map x -> M x
// for a 2x2 matrix M (used by the 2D Matrix Visualizer).

import { eig2x2 } from "../utils/linearAlgebra.js";

const TOL = 1e-9;

// Eigenvectors are only defined up to sign; draw them pointing right
// (or up, for a vertical one) so that e.g. (1, 1) is not shown as (-1, -1).
const orient = ([x, y]) =>
  x < -1e-12 || (Math.abs(x) <= 1e-12 && y < 0) ? [-x, -y] : [x, y];
const near = (a, b) => Math.abs(a - b) <= TOL * Math.max(1, Math.abs(a), Math.abs(b));

/**
 * Eigen-analysis of a 2x2 matrix with eigenvalue/eigenvector pairs ready to draw.
 * Returns eig2x2's fields plus
 *   pairs: [{ lam, ev:[x,y] }] sorted by |λ| descending (real cases only;
 *          a scalar matrix kI gives both axes, a defective matrix one direction)
 *   modulus, argDeg: |λ| and arg λ in degrees (0..180) of the eigenvalue with
 *          non-negative imaginary part (complex case); for real cases the
 *          modulus of the dominant eigenvalue
 */
export function analyze2x2(matrix) {
  const M = matrix.map((r) => r.map((v) => Number(v) || 0));
  const e = eig2x2(M);
  let pairs = [];
  let modulus;
  let argDeg = null;
  if (e.kind === "complex") {
    const { re, im } = e.values[0];
    modulus = Math.hypot(re, im);
    argDeg = (Math.atan2(Math.abs(im), re) * 180) / Math.PI;
  } else {
    if (e.kind === "real-distinct") {
      pairs = e.values.map((v, i) => ({ lam: v.re, ev: orient(e.vectors[i]) }));
      pairs.sort((a, b) => Math.abs(b.lam) - Math.abs(a.lam));
    } else if (e.kind === "real-repeated-scalar") {
      const lam = e.values[0].re;
      pairs = [
        { lam, ev: [1, 0] },
        { lam, ev: [0, 1] },
      ];
    } else {
      pairs = [{ lam: e.values[0].re, ev: orient(e.vectors[0]) }];
    }
    modulus = Math.abs(pairs[0].lam);
  }
  return { ...e, pairs, modulus, argDeg };
}

/** One-line description of what repeated application of M does in the long run. */
export function describeLongRun(a) {
  if (a.kind === "complex") {
    const turn = `${a.argDeg.toFixed(1)}° per step`;
    if (near(a.modulus, 1)) return `rotates forever, turning ${turn}`;
    return a.modulus < 1 ? `spirals in to 0, turning ${turn}` : `spirals out, turning ${turn}`;
  }
  const l1 = a.pairs[0].lam;
  const l2 = a.pairs.length > 1 ? a.pairs[1].lam : l1;
  const a1 = Math.abs(l1);
  const a2 = Math.abs(l2);
  // one direction wins (a defective matrix lines points up along its
  // single eigenvector even though both eigenvalues are equal)
  const defective = a.kind === "real-repeated-defective";
  const dominant = !near(a1, a2) || defective;
  const flip = l1 < 0 && (dominant || near(l1, l2)) ? ", flipping each step" : "";

  if (near(a1, 0)) return "collapses to 0 within 2 steps";
  if (near(a1, 1)) {
    if (near(a2, 1)) {
      if (defective) return `drifts along the λ line, growing linearly${flip}`;
      return l1 < 0 || l2 < 0 ? "keeps its size, flipping back and forth" : "keeps its size";
    }
    return `settles onto the λ line${flip}`;
  }
  if (a1 < 1) return `shrinks to 0${dominant ? " along λ" : ""}${flip}`;
  // a1 > 1
  if (!dominant) return `grows in every direction${flip}`;
  if (a2 < 1 && !near(a2, 1)) return `stretches along λ, shrinks along μ${flip}`;
  return `grows, lining up along λ${flip}`;
}
