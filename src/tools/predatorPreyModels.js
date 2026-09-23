// src/tools/predatorPreyModels.js
// Pure math shared by the Holling-Tanner and Shark-Tuna Trajectories tools:
// right-hand sides, equilibria (classified from the Jacobian), and a
// stiffness-aware RK4 stepper. No React here, so it can be unit-tested.

import { classifyEquilibrium2D } from "../utils/stability.js";

// Tuna floor used in the Holling-Tanner shark equation S' = αS(1 − S/(qT)),
// which is singular at T = 0.
export const HT_T_FLOOR = 1e-6;

// Values beyond this are treated as "blown up": integration stops for that
// trajectory. Far outside any plot window, but well below overflow.
export const STATE_CAP = 1e6;

/** Holling-Tanner right-hand side: returns f(S, T) = [S', T']. */
export function hollingTannerRHS({ alpha, beta, c, h, m, q }) {
  return (s, t) => {
    const S = Math.max(0, s);
    const T = Math.max(0, t);
    const Te = Math.max(HT_T_FLOOR, T);
    return [
      alpha * S * (1 - S / (q * Te)),
      beta * T * (1 - T / m) - (c * S * T) / (h + T),
    ];
  };
}

/** Rough size of the fastest rate near (S, T), used to choose RK4 substeps. */
export function hollingTannerRate({ alpha, beta, c, h, m, q }, s, t) {
  const S = Math.max(0, s);
  const Te = Math.max(HT_T_FLOOR, t);
  return (
    alpha * (1 + (2 * S) / (q * Te)) +
    beta * (1 + (2 * Math.max(0, t)) / m) +
    (c * (S + Math.max(0, t))) / h
  );
}

/** Analytic Jacobian of the Holling-Tanner system at (S, T), T > 0. */
export function hollingTannerJacobian({ alpha, beta, c, h, m, q }, S, T) {
  return [
    [alpha * (1 - (2 * S) / (q * T)), (alpha * S * S) / (q * T * T)],
    [
      -(c * T) / (h + T),
      beta * (1 - (2 * T) / m) - (c * S * h) / ((h + T) * (h + T)),
    ],
  ];
}

/**
 * The coexistence equilibrium (S*, T*) with S*, T* > 0, classified from the
 * Jacobian, or null if the parameters admit none.
 * It lies on S = qT and on S = β(1 − T/m)(h + T)/c, so T* solves
 *   (β/m)T² + (cq − β(1 − h/m))T − βh = 0,
 * which (all parameters positive) has exactly one positive root.
 */
export function hollingTannerCoexistence(params) {
  const { alpha, beta, c, h, m, q } = params;
  if (!(alpha > 0 && beta > 0 && c > 0 && h > 0 && m > 0 && q > 0)) return null;
  const a = beta / m;
  const b = c * q - beta * (1 - h / m);
  const c0 = -beta * h;
  const disc = b * b - 4 * a * c0;
  if (!(disc >= 0)) return null;
  const sq = Math.sqrt(disc);
  // Stable form of the positive root (avoids cancellation when b > 0).
  const T = b >= 0 ? (-2 * c0) / (b + sq) : (-b + sq) / (2 * a);
  if (!(T > 0) || !Number.isFinite(T)) return null;
  const S = q * T;
  const cls = classifyEquilibrium2D(hollingTannerJacobian(params, S, T));
  return { x: S, y: T, ...cls };
}

/** Lotka-Volterra right-hand side S' = −δS + pST, T' = βT − qST. */
export function lotkaVolterraRHS({ p, q, beta, delta }) {
  return (s, t) => {
    const S = Math.max(0, s);
    const T = Math.max(0, t);
    return [-delta * S + p * S * T, beta * T - q * S * T];
  };
}

export function lotkaVolterraRate({ p, q, beta, delta }, s, t) {
  const S = Math.max(0, s);
  const T = Math.max(0, t);
  return delta + beta + p * (S + T) + q * (S + T);
}

export function lotkaVolterraJacobian({ p, q, beta, delta }, S, T) {
  return [
    [-delta + p * T, p * S],
    [-q * T, beta - q * S],
  ];
}

/**
 * Equilibria of the Lotka-Volterra system, each classified from the
 * Jacobian: the origin, and the interior point (β/q, δ/p) when p, q > 0
 * and it is not the origin itself.
 */
export function lotkaVolterraEquilibria(params) {
  const { p, q, beta, delta } = params;
  const points = [
    { x: 0, y: 0, ...classifyEquilibrium2D(lotkaVolterraJacobian(params, 0, 0)) },
  ];
  if (p > 0 && q > 0) {
    const S = beta / q;
    const T = delta / p;
    if (S > 0 || T > 0) {
      points.push({
        x: S,
        y: T,
        interior: true,
        ...classifyEquilibrium2D(lotkaVolterraJacobian(params, S, T)),
      });
    }
  }
  return points;
}

/** One classical RK4 step of size h for f(s, t) = [s', t']. */
export function rk4Step(f, s, t, h) {
  const k1 = f(s, t);
  const k2 = f(s + (h * k1[0]) / 2, t + (h * k1[1]) / 2);
  const k3 = f(s + (h * k2[0]) / 2, t + (h * k2[1]) / 2);
  const k4 = f(s + h * k3[0], t + h * k3[1]);
  return [
    s + (h / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]),
    t + (h / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]),
  ];
}

/**
 * Advance (s, t) by model time `dt` with RK4 substeps no longer than
 * `maxStep` and short enough that rate·step ≤ 0.5 (so stiff regions, e.g.
 * Holling-Tanner near T = 0, do not blow up). States are kept ≥ 0 and ≤ the
 * cap. Returns { s, t, blownUp }.
 */
export function advanceState(f, rate, s, t, dt, { maxStep = 0.05, maxSubsteps = 2000 } = {}) {
  let remaining = dt;
  let steps = 0;
  while (remaining > 1e-12 && steps < maxSubsteps) {
    const r = Math.max(1e-9, rate(s, t));
    const h = Math.min(remaining, maxStep, 0.5 / r);
    [s, t] = rk4Step(f, s, t, h);
    s = Math.max(0, s);
    t = Math.max(0, t);
    remaining -= h;
    steps++;
    if (!Number.isFinite(s) || !Number.isFinite(t) || s > STATE_CAP || t > STATE_CAP) {
      return {
        s: Number.isFinite(s) ? Math.min(s, STATE_CAP) : STATE_CAP,
        t: Number.isFinite(t) ? Math.min(t, STATE_CAP) : STATE_CAP,
        blownUp: true,
      };
    }
  }
  return { s, t, blownUp: false };
}

/** Fill/stroke colors for an equilibrium marker, by stability. */
export function equilibriumColors(cls) {
  if (cls.stable === true) return { fill: "#2563eb", stroke: "#1d4ed8" }; // blue
  if (cls.stable === false) return { fill: "#f59e0b", stroke: "#d97706" }; // orange
  return { fill: "#8b5cf6", stroke: "#6d28d9" }; // purple: center / neutral
}
