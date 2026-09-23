// src/utils/linearAlgebra.js
// Pure linear algebra functions for matrix/vector operations (up to 4x4)

export const identity = (n) =>
  Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  );

export const zeros = (rows, cols) =>
  Array.from({ length: rows }, () => Array(cols).fill(0));

export const ones = (n) => Array.from({ length: n }, () => [1]);

export const zerosVec = (n) => Array.from({ length: n }, () => [0]);

export const matAdd = (A, B) =>
  A.map((row, i) => row.map((val, j) => val + B[i][j]));

export const matMul = (A, B) => {
  const rows = A.length;
  const cols = B[0].length;
  const inner = B.length;
  const result = [];
  for (let i = 0; i < rows; i++) {
    result[i] = [];
    for (let j = 0; j < cols; j++) {
      let sum = 0;
      for (let k = 0; k < inner; k++) {
        sum += A[i][k] * B[k][j];
      }
      result[i][j] = sum;
    }
  }
  return result;
};

// v is stored as [[v1],[v2],...] (column vector as 2D array)
export const matVecMul = (A, v) =>
  A.map((row) => [row.reduce((sum, val, j) => sum + val * v[j][0], 0)]);

export const vecAdd = (v, w) => v.map((row, i) => [row[0] + w[i][0]]);

export const scalarVecMul = (s, v) => v.map((row) => [s * row[0]]);

// Resize matrix, preserving overlapping values, filling new cells from defaultMat
export const resizeMatrix = (oldMat, newRows, newCols, defaultMat) => {
  const result = [];
  for (let i = 0; i < newRows; i++) {
    result[i] = [];
    for (let j = 0; j < newCols; j++) {
      if (i < oldMat.length && j < oldMat[0].length) {
        result[i][j] = oldMat[i][j];
      } else {
        result[i][j] = defaultMat[i][j];
      }
    }
  }
  return result;
};

// Resize vector (column vector as 2D array), preserving overlapping values
export const resizeVector = (oldVec, newDim, defaultVec) => {
  const result = [];
  for (let i = 0; i < newDim; i++) {
    if (i < oldVec.length) {
      result[i] = [oldVec[i][0]];
    } else {
      result[i] = [defaultVec[i][0]];
    }
  }
  return result;
};

// ── Eigen-analysis ─────────────────────────────────────────────────────────

// 2×2 eigenvalues/eigenvectors (tolerance-aware); see stability.js.
export { eig2x2 } from "./stability.js";

const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));

/**
 * Dominant eigenvalue and eigenvectors of the Leslie matrix
 *
 *     [ f0 f1 f2 ... f(n-1) ]
 *     [ s0  0  0 ...   0    ]
 *     [  0 s1  0 ...   0    ]
 *     [  ...    s(n-2)  0   ]
 *
 * computed exactly (to double precision) by bisection on the Euler–Lotka
 * equation  Σ f_i l_i λ^-(i+1) = 1,  with l_0 = 1, l_i = s_0 s_1 ... s_(i-1)
 * (the fraction of newborns that survive to class i).
 *
 * Classes after a zero survival are unreachable (l_i = 0): their fecundity
 * never feeds back into the population, so they do not affect λ.
 *
 * @param {number[]} f - fecundities, length n (entries may be strings; blanks → 0)
 * @param {number[]} s - survival probabilities s_0 .. s_(n-2) (extra entries ignored)
 * @returns {{
 *   lambda: number,                 // dominant eigenvalue λ₁ (0 if no reachable class reproduces)
 *   stableDistribution: number[]|null, // right eigenvector, w_i ∝ l_i λ^-i, sums to 1
 *   reproductiveValues: number[]|null, // left eigenvector, v_0 = 1
 *   primitive: boolean,             // period === 1 and λ > 0: N(t) settles to the
 *                                   // stable distribution (strictly: "ergodic";
 *                                   // post-reproductive classes make the matrix reducible)
 *   period: number,                 // gcd of the 1-based positions of the reachable
 *                                   // fecund classes; > 1 means the age structure
 *                                   // oscillates with this period forever
 *   reachable: boolean[],           // l_i > 0
 *   survivorship: number[],         // l_i
 * }}
 */
export function leslieLambda(f, s) {
  const n = f.length;
  const num = (v) => {
    const x = typeof v === "number" ? v : parseFloat(v);
    return Number.isFinite(x) && x > 0 ? x : 0;
  };
  const fec = Array.from({ length: n }, (_, i) => num(f[i]));
  const surv = Array.from({ length: Math.max(0, n - 1) }, (_, i) => num(s ? s[i] : 0));

  const l = new Array(n);
  l[0] = 1;
  for (let i = 1; i < n; i++) l[i] = l[i - 1] * surv[i - 1];
  const reachable = l.map((x) => x > 0);

  const terms = fec.map((fi, i) => fi * l[i]); // f_i l_i
  const fecundPositions = [];
  terms.forEach((t, i) => {
    if (t > 0) fecundPositions.push(i + 1);
  });

  if (fecundPositions.length === 0) {
    return {
      lambda: 0,
      stableDistribution: null,
      reproductiveValues: null,
      primitive: false,
      period: 0,
      reachable,
      survivorship: l,
    };
  }
  const period = fecundPositions.reduce(gcd);

  // φ(λ) = Σ f_i l_i λ^-(i+1) is strictly decreasing on (0, ∞) from ∞ to 0.
  const phi = (lam) => {
    let sum = 0;
    let p = 1 / lam;
    for (let i = 0; i < n; i++) {
      if (terms[i] > 0) sum += terms[i] * p;
      p /= lam;
    }
    return sum;
  };
  // Bracket: φ(hi) <= 1 for hi >= max(1, Σ f_i l_i).
  let hi = Math.max(1, terms.reduce((a, b) => a + b, 0));
  let lo = hi / 2;
  while (phi(lo) < 1 && lo > 1e-300) lo /= 2;
  for (let it = 0; it < 2000; it++) {
    const mid = lo + (hi - lo) / 2;
    if (mid <= lo || mid >= hi) break;
    if (phi(mid) > 1) lo = mid;
    else hi = mid;
  }
  const lambda = (lo + hi) / 2;

  // Right eigenvector (stable age distribution): w_i ∝ l_i λ^-i
  const w = l.map((li, i) => li * Math.pow(lambda, -i));
  const wSum = w.reduce((a, b) => a + b, 0);
  const stableDistribution = w.map((x) => x / wSum);

  // Left eigenvector (reproductive values): v_(n-1) = f_(n-1)/λ,
  // v_i = (f_i + s_i v_(i+1)) / λ, normalized so v_0 = 1.
  const v = new Array(n);
  v[n - 1] = fec[n - 1] / lambda;
  for (let i = n - 2; i >= 0; i--) v[i] = (fec[i] + surv[i] * v[i + 1]) / lambda;
  const v0 = v[0];
  const reproductiveValues = v.map((x) => x / v0);

  return {
    lambda,
    stableDistribution,
    reproductiveValues,
    primitive: period === 1,
    period,
    reachable,
    survivorship: l,
  };
}

/** Build the n×n Leslie matrix from fecundities f and survivals s. */
export function leslieMatrix(f, s) {
  const n = f.length;
  const M = zeros(n, n);
  for (let j = 0; j < n; j++) M[0][j] = +f[j] || 0;
  for (let i = 1; i < n; i++) M[i][i - 1] = +s[i - 1] || 0;
  return M;
}
