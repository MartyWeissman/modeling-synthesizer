// src/tools/insulinGlucoseModel.js
// Numerical model shared by the two insulin-glucose tools
// (InsulinGlucoseTool.jsx and MinimalInsulinGlucoseTool.jsx).
//
// Model (in model units, G ≈ 1 and I ≈ 0.5 at the default steady state):
//   G' = m + meals(t) + α / (1 + e^(k·I(t − σ) − c)) − s·I·G
//   I' = q·B·G(t − τ)² / (1 + G(t − τ)²) − γ·I
// The minimal tool uses α = 0 and no delays.
//
// Display units: glucose G × 5 → mmol/L (mM), insulin I × 100 → pmol/L (pM).
//
// Two integrators are provided:
// - simulateInsulinGlucose (used by the minimal tool): classical RK4 on a fixed
//   base grid (h = 0.01 h = 0.6 min), with
//   automatic sub-stepping when the equations become stiff (large s, I, γ), so
//   the solution stays stable and non-negative without clamping. Delayed values
//   are read from the stored history by linear interpolation; before t = 0 the
//   history is the initial state (the same convention as the old Euler solver).
// - simulateInsulinGlucoseEuler (used by the full tool): the original Euler
//   scheme, made safe with automatic sub-steps (see the comment there).

export const GLUCOSE_SCALE = 5; // model units → mmol/L
export const INSULIN_SCALE = 100; // model units → pmol/L (pM)

// Meal / snack / challenge glucose inputs. These are unchanged from the original
// tools (same times, heights and widths).
const mealSurge = (t, mealTime) =>
  Math.abs(t - mealTime) < 0.25
    ? 0.8 * Math.exp(-Math.pow((t - mealTime) * 4, 2))
    : 0;

const snackSurge = (t, snackTime) =>
  Math.abs(t - snackTime) < 0.4
    ? 1.0 * Math.exp(-Math.pow((t - snackTime) * 2.5, 2))
    : 0;

export const MEAL_TIMES = [6, 10, 16];
export const SNACK_TIMES = [8, 13, 17];
export const CHALLENGE_TIME = 5;

/** Extra glucose input (added to m) at time t (hours) for a scenario. */
export function glucoseInput(mode, t) {
  if (mode === "challenge") {
    return Math.exp(-Math.pow(t - CHALLENGE_TIME, 2));
  }
  if (mode === "meals" || mode === "mealsSnacks") {
    let extra = 0;
    for (const mt of MEAL_TIMES) extra += mealSurge(t, mt);
    if (mode === "mealsSnacks") {
      for (const st of SNACK_TIMES) extra += snackSurge(t, st);
    }
    return extra;
  }
  return 0;
}

// Values are capped far above anything plotted, only to avoid overflow.
const HUGE = 1e6;

/**
 * Simulate the insulin-glucose model.
 *
 * params: { m, s, q, B, gamma, alpha = 0, k = 1, c = 1, tau = 0, sigma = 0 }
 *   tau, sigma in MINUTES (as on the sliders).
 * options: { mode = "baseline", tMax = 20, h = 0.01, G0 = 1, I0 = 0.5 }
 *
 * Returns an array of { time, glucose, insulin } in display units
 * (hours, mmol/L, pmol/L), one point per base step h.
 */
export function simulateInsulinGlucose(params, options = {}) {
  const {
    m,
    s,
    q,
    B,
    gamma,
    alpha = 0,
    k = 1,
    c = 1,
    tau = 0,
    sigma = 0,
  } = params;
  const { mode = "baseline", tMax = 20, h = 0.01, G0 = 1, I0 = 0.5 } = options;

  const tauH = Math.max(0, tau) / 60;
  const sigmaH = Math.max(0, sigma) / 60;
  const steps = Math.round(tMax / h);

  // Stored history on the base grid: Gh[j] = G(j·h), Ih[j] = I(j·h).
  const Gh = new Float64Array(steps + 1);
  const Ih = new Float64Array(steps + 1);
  let stored = 0; // number of stored grid points

  // Current state at the start of the current sub-step (for delays shorter
  // than the stored history reaches).
  let curT = 0;
  let curG = G0;
  let curI = I0;

  // Value of a history array at time tq (tq <= current time).
  const historyAt = (arr, init, cur, tq) => {
    if (tq <= 0) return init;
    const lastT = (stored - 1) * h;
    if (tq >= lastT) {
      // Inside the step being computed (only when the delay is < h):
      // interpolate between the last stored point and the current state.
      const span = curT - lastT;
      if (span <= 0 || tq >= curT) return cur;
      const w = (tq - lastT) / span;
      return arr[stored - 1] * (1 - w) + cur * w;
    }
    const x = tq / h;
    const j = Math.floor(x);
    const w = x - j;
    return arr[j] * (1 - w) + arr[j + 1] * w;
  };

  // Right-hand side. G, I are the stage values; delayed values come from history.
  const rhs = (t, G, I) => {
    const Gd = tauH > 0 ? historyAt(Gh, G0, curG, t - tauH) : G;
    const Id = sigmaH > 0 ? historyAt(Ih, I0, curI, t - sigmaH) : I;
    const hill = (Gd * Gd) / (1 + Gd * Gd);
    const liver = alpha !== 0 ? alpha / (1 + Math.exp(k * Id - c)) : 0;
    const dG = m + glucoseInput(mode, t) + liver - s * I * G;
    const dI = q * B * hill - gamma * I;
    return [dG, dI];
  };

  const rk4 = (t, G, I, dt) => {
    const [a1, b1] = rhs(t, G, I);
    const [a2, b2] = rhs(t + dt / 2, G + (dt / 2) * a1, I + (dt / 2) * b1);
    const [a3, b3] = rhs(t + dt / 2, G + (dt / 2) * a2, I + (dt / 2) * b2);
    const [a4, b4] = rhs(t + dt, G + dt * a3, I + dt * b3);
    return [
      G + (dt / 6) * (a1 + 2 * a2 + 2 * a3 + a4),
      I + (dt / 6) * (b1 + 2 * b2 + 2 * b3 + b4),
    ];
  };

  const data = new Array(steps + 1);
  let G = G0;
  let I = I0;
  for (let i = 0; i <= steps; i++) {
    const t = i * h;
    Gh[i] = G;
    Ih[i] = I;
    stored = i + 1;
    data[i] = {
      time: t,
      glucose: G * GLUCOSE_SCALE,
      insulin: I * INSULIN_SCALE,
    };
    if (i === steps) break;

    // Stiffness estimate: |∂G'/∂G| = sI, |∂G'/∂I| = sG, |∂I'/∂I| = γ, plus the
    // bounded Hill (≤ 0.65 qB) and liver (≤ αk/4) slopes. Keep h·L/n ≤ 0.5.
    const L =
      Math.abs(s) * (Math.abs(I) + Math.abs(G)) +
      Math.abs(gamma) +
      0.65 * Math.abs(q * B) +
      0.25 * Math.abs(alpha * k);
    const n = Math.min(2000, Math.max(1, Math.ceil((h * L) / 0.5)));
    const dt = h / n;
    let tt = t;
    for (let j = 0; j < n; j++) {
      curT = tt;
      curG = G;
      curI = I;
      [G, I] = rk4(tt, G, I, dt);
      tt += dt;
      // The exact solution stays non-negative; this only guards round-off.
      if (!(G > 0)) G = 0;
      if (!(I > 0)) I = 0;
      if (G > HUGE) G = HUGE;
      if (I > HUGE) I = HUGE;
    }
  }
  return data;
}

/**
 * Explicit Euler with the original fixed step (dt = 0.1 h, delays rounded to
 * whole 6-minute steps), exactly as the tools computed before, EXCEPT that a
 * step that is too large for the current rates (dt·s·I > 1 or dt·γ > 1, where
 * Euler overshoots and oscillates or blows up), or that would make G or I
 * negative, is split into 2, 4, 8, … equal sub-steps instead of clamping the
 * result to 0. For all ordinary parameter values (including every Lab Manual
 * scenario) no sub-steps are needed and the results are bit-for-bit the same
 * as before.
 *
 * Kept for the full Insulin-Glucose Regulation tool so that the Lab Manual's
 * time-delay exercise (IGO2) looks exactly as it always has: with delays, the
 * 0.1 h Euler step noticeably exaggerates the oscillations compared with the
 * exact solution (see simulateInsulinGlucose), which is a decision for later.
 *
 * Same params/return value as simulateInsulinGlucose; options: { mode, tMax,
 * dt = 0.1, G0, I0 }.
 */
export function simulateInsulinGlucoseEuler(params, options = {}) {
  const {
    m,
    s,
    q,
    B,
    gamma,
    alpha = 0,
    k = 1,
    c = 1,
    tau = 0,
    sigma = 0,
  } = params;
  const { mode = "baseline", tMax = 20, dt = 0.1, G0 = 1, I0 = 0.5 } = options;
  const steps = Math.round(tMax / dt);
  const tauSteps = Math.round(Math.max(0, tau) / 60 / dt);
  const sigmaSteps = Math.round(Math.max(0, sigma) / 60 / dt);

  // Full history (index = step number); before t = 0 it is the initial state.
  const Gh = new Float64Array(steps + 1);
  const Ih = new Float64Array(steps + 1);
  const delayed = (arr, init, i, d) => (i - d < 0 ? init : arr[i - d]);

  const data = new Array(steps + 1);
  let G = G0;
  let I = I0;
  for (let i = 0; i <= steps; i++) {
    const t = i * dt;
    Gh[i] = G;
    Ih[i] = I;
    data[i] = {
      time: t,
      glucose: G * GLUCOSE_SCALE,
      insulin: I * INSULIN_SCALE,
    };
    if (i === steps) break;

    // Delayed values are held fixed during the step (as before).
    const Gd = tauSteps === 0 ? null : delayed(Gh, G0, i, tauSteps);
    const Id = sigmaSteps === 0 ? null : delayed(Ih, I0, i, sigmaSteps);
    const input = m + glucoseInput(mode, t);

    const advance = (n) => {
      const h = dt / n;
      let g = G;
      let x = I;
      for (let j = 0; j < n; j++) {
        const gd = Gd === null ? g : Gd;
        const xd = Id === null ? x : Id;
        const hill = (gd * gd) / (1 + gd * gd);
        const liver = alpha / (1 + Math.exp(k * xd - c));
        const dG = input + liver - s * x * g;
        const dI = q * B * hill - gamma * x;
        g += dG * h;
        x += dI * h;
        if (!(g >= 0) || !(x >= 0)) return null;
      }
      return [g, x];
    };

    // Use sub-steps when one step is too large for the current rates: if
    // dt·s·I > 1 (or dt·γ > 1) a single Euler step overshoots past the
    // equilibrium and produces spurious oscillations or negative values.
    let n = 1;
    while (n < 4096 && (dt / n) * Math.max(s * I, gamma) > 1) n *= 2;
    let next = null;
    for (; n <= 4096 && next === null; n *= 2) next = advance(n);
    if (next === null) next = [Math.max(0, G), Math.max(0, I)]; // not reached in practice
    G = Math.min(HUGE, next[0]);
    I = Math.min(HUGE, next[1]);
  }
  return data;
}

/**
 * Find the runs where a series exceeds `max`. Returns [{ start, end, peakIndex,
 * peak }] (indices into data), used to draw off-scale markers.
 */
export function offScaleRuns(data, key, max) {
  const runs = [];
  let run = null;
  data.forEach((p, i) => {
    const v = p[key];
    if (v > max) {
      if (!run) run = { start: i, end: i, peakIndex: i, peak: v };
      run.end = i;
      if (v > run.peak) {
        run.peak = v;
        run.peakIndex = i;
      }
    } else if (run) {
      runs.push(run);
      run = null;
    }
  });
  if (run) runs.push(run);
  return runs;
}
