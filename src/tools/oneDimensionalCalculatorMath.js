// src/tools/oneDimensionalCalculatorMath.js
// Pure numerical helpers for the 1D Dynamical System Calculator
// (kept separate from the component so they can be unit tested).

/** Integration step (time units) used by the calculator. */
export const DT = 0.05;

/**
 * Value of X at time tq from a history sampled every DT from t = 0
 * (linear interpolation). Before t = 0 the initial value is used (constant
 * initial history); after the last sample, the latest value.
 */
export const historyValueAt = (history, tq, dt = DT) => {
  if (tq <= 0) return history[0].x;
  const pos = tq / dt;
  const i = Math.floor(pos + 1e-9);
  if (i >= history.length - 1) return history[history.length - 1].x;
  const frac = Math.max(0, pos - i);
  return history[i].x + frac * (history[i + 1].x - history[i].x);
};

/**
 * One RK4 step of X' = f(X, X_tau) from the end of `history`, with X_tau the
 * delayed value X(t − τ) evaluated at each RK4 stage time. When τ = 0 the
 * equilibrium form f(X, X) is used at every stage, so it is a true RK4 step
 * (holding X_tau fixed across the stages would reduce it to Euler's method).
 *
 * @param {DynamicalSystem1D} system - equation with parameters k, X_tau
 * @param {DynamicalSystem1D} sameTimeSystem - same equation with X_tau → X
 */
export const rk4DelayStep = (system, sameTimeSystem, history, dt, k, tau) => {
  const last = history[history.length - 1];
  const x = last.x;
  if (!(tau > 0)) return sameTimeSystem.rk4Step(x, { k }, dt);
  const t = last.t;
  // Delayed values at the stage times; a stage time after the current time
  // (only when τ < dt) uses the current value.
  const delayed = (ts) => historyValueAt(history, Math.min(ts - tau, t), dt);
  const d1 = delayed(t);
  const d2 = delayed(t + dt / 2);
  const d4 = delayed(t + dt);
  const f = (xx, xd) => system.evaluateDerivative(xx, { k, X_tau: xd });
  const k1 = f(x, d1);
  const k2 = f(x + 0.5 * dt * k1, d2);
  const k3 = f(x + 0.5 * dt * k2, d2);
  const k4 = f(x + dt * k3, d4);
  if (![k1, k2, k3, k4].every(Number.isFinite)) return NaN;
  return x + (dt / 6) * (k1 + 2 * k2 + 2 * k3 + k4);
};
