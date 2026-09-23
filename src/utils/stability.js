// src/utils/stability.js
// Classification of equilibria of 2D systems X' = f(X,Y), Y' = g(X,Y)
// (continuous time) and eigen-analysis of 2x2 matrices.

/**
 * Eigenvalues/eigenvectors of a real 2x2 matrix [[a, b], [c, d]].
 * Uses a relative tolerance so defective / repeated cases are recognized
 * despite floating-point noise.
 *
 * Returns {
 *   trace, det, disc,
 *   kind: "real-distinct" | "real-repeated-scalar" | "real-repeated-defective" | "complex",
 *   values: [{re, im}, {re, im}],
 *   vectors: [[x,y],[x,y]] (real cases; for scalar matrices both axes; for defective only one),
 * }
 */
export function eig2x2(M, relTol = 1e-9) {
  const [[a, b], [c, d]] = M;
  const trace = a + d;
  const det = a * d - b * c;
  let disc = trace * trace - 4 * det;
  const scale = Math.max(1, trace * trace, Math.abs(det), a * a, b * b, c * c, d * d);
  if (Math.abs(disc) < relTol * scale) disc = 0;

  const normalize = ([x, y]) => {
    const n = Math.hypot(x, y) || 1;
    return [x / n, y / n];
  };
  const eigvec = (lambda) => {
    // (M - λI) v = 0 — choose the better-conditioned row
    const r1 = [a - lambda, b];
    const r2 = [c, d - lambda];
    const r = Math.hypot(...r1) >= Math.hypot(...r2) ? r1 : r2;
    if (Math.hypot(...r) < 1e-12) return [1, 0];
    return normalize([-r[1], r[0]]);
  };

  if (disc > 0) {
    const s = Math.sqrt(disc);
    const l1 = (trace + s) / 2;
    const l2 = (trace - s) / 2;
    return {
      trace, det, disc, kind: "real-distinct",
      values: [{ re: l1, im: 0 }, { re: l2, im: 0 }],
      vectors: [eigvec(l1), eigvec(l2)],
    };
  }
  if (disc === 0) {
    const l = trace / 2;
    const offScale = Math.max(1, Math.abs(l));
    const isScalar =
      Math.abs(b) < 1e-9 * offScale &&
      Math.abs(c) < 1e-9 * offScale &&
      Math.abs(a - d) < 1e-9 * offScale;
    return {
      trace, det, disc,
      kind: isScalar ? "real-repeated-scalar" : "real-repeated-defective",
      values: [{ re: l, im: 0 }, { re: l, im: 0 }],
      vectors: isScalar ? [[1, 0], [0, 1]] : [eigvec(l)],
    };
  }
  const re = trace / 2;
  const im = Math.sqrt(-disc) / 2;
  return {
    trace, det, disc, kind: "complex",
    values: [{ re, im }, { re, im: -im }],
    vectors: [],
  };
}

/**
 * Classify an equilibrium of a continuous-time 2D system from its Jacobian
 * J = [[fx, fy], [gx, gy]].
 *
 * Returns {
 *   type: "stable node" | "unstable node" | "saddle" | "stable spiral" |
 *         "unstable spiral" | "center" | "stable degenerate node" |
 *         "unstable degenerate node" | "stable star" | "unstable star" |
 *         "non-isolated (det = 0)",
 *   stable: true | false | null (null = neutral / undetermined by linearization),
 *   trace, det, disc, eig,
 *   note: optional caveat string
 * }
 */
export function classifyEquilibrium2D(J, relTol = 1e-9) {
  const eig = eig2x2(J, relTol);
  const { trace, det, disc } = eig;
  const scale = Math.max(1, Math.abs(trace), Math.sqrt(Math.abs(det)));
  const tr0 = Math.abs(trace) < relTol * scale * 1e3;
  const det0 = Math.abs(det) < relTol * scale * scale * 1e3;

  if (det0) {
    return { type: "non-isolated (det = 0)", stable: null, trace, det, disc, eig,
      note: "Linearization is degenerate; the equilibrium may not be isolated." };
  }
  if (det < 0) return { type: "saddle", stable: false, trace, det, disc, eig };
  if (tr0) {
    return { type: "center", stable: null, trace, det, disc, eig,
      note: "Linearization gives a center; nonlinear terms decide the true behavior unless the system is conservative." };
  }
  const stable = trace < 0;
  const pre = stable ? "stable" : "unstable";
  if (eig.kind === "complex") return { type: `${pre} spiral`, stable, trace, det, disc, eig };
  if (eig.kind === "real-repeated-scalar") return { type: `${pre} star`, stable, trace, det, disc, eig };
  if (eig.kind === "real-repeated-defective") return { type: `${pre} degenerate node`, stable, trace, det, disc, eig };
  return { type: `${pre} node`, stable, trace, det, disc, eig };
}

/**
 * Numerical Jacobian of a 2D vector field at (x, y) by central differences.
 * f(x, y) must return [dx, dy].
 */
export function numericJacobian2D(f, x, y, h) {
  const hx = h ?? 1e-6 * Math.max(1, Math.abs(x));
  const hy = h ?? 1e-6 * Math.max(1, Math.abs(y));
  const [f1, g1] = f(x + hx, y);
  const [f2, g2] = f(x - hx, y);
  const [f3, g3] = f(x, y + hy);
  const [f4, g4] = f(x, y - hy);
  return [
    [(f1 - f2) / (2 * hx), (f3 - f4) / (2 * hy)],
    [(g1 - g2) / (2 * hx), (g3 - g4) / (2 * hy)],
  ];
}
