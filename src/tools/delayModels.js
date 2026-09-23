// src/tools/delayModels.js
// Pure math shared by the delay-equation tools (Muscle Tremor Simulator,
// Hutchinson Growth). Kept out of the .jsx files so it can be unit tested.

/**
 * Behavior of the linear delay equation y' = -a y(t - tau) (a, tau >= 0),
 * e.g. the tremor model with y = L - 20 and a = r/1000 per ms, or the
 * Hutchinson model linearized at P = k (y = P/k - 1, a = beta).
 * The characteristic roots satisfy lambda = -a e^(-lambda tau), so with
 * s = a*tau:
 *   s <= 1/e       : monotone return to equilibrium (no oscillation)
 *   1/e < s < pi/2 : damped oscillations
 *   s >= pi/2      : sustained (growing) oscillations
 */
export function delayRegime(a, tau) {
  const s = a * tau;
  if (!(s > 1 / Math.E)) return "none";
  if (s < Math.PI / 2) return "damped";
  return "sustained";
}

/**
 * Dominant frequency (Hz) of samples taken every 1 ms, searched over
 * 2-50 Hz (at least two cycles in a 1 s window) after removing the mean
 * and linear trend. Returns null if the
 * signal is flat or has no clear peak inside the search range.
 */
export function dominantFrequency(values, sampleRate = 1000) {
  const n = values.length;
  if (n < 10) return null;
  // Remove mean and linear trend (least squares)
  const xm = (n - 1) / 2;
  const ym = values.reduce((acc, v) => acc + v, 0) / n;
  let sxy = 0,
    sxx = 0;
  for (let i = 0; i < n; i++) {
    sxy += (i - xm) * (values[i] - ym);
    sxx += (i - xm) * (i - xm);
  }
  const slope = sxy / sxx;
  const detrended = values.map((v, i) => v - ym - slope * (i - xm));
  const variance = detrended.reduce((acc, v) => acc + v * v, 0) / n;
  if (!(variance > 1e-18)) return null;

  const fMin = 2,
    fMax = 50,
    df = 0.1;
  const nSteps = Math.round((fMax - fMin) / df);
  let maxPower = 0;
  let best = -1;
  for (let j = 0; j <= nSteps; j++) {
    const f = fMin + j * df;
    let re = 0,
      im = 0;
    for (let i = 0; i < n; i++) {
      const angle = (2 * Math.PI * f * i) / sampleRate;
      re += detrended[i] * Math.cos(angle);
      im += detrended[i] * Math.sin(angle);
    }
    const power = re * re + im * im;
    if (power > maxPower) {
      maxPower = power;
      best = j;
    }
  }
  // A peak at the edge of the search range is not a real oscillation
  if (best <= 0 || best >= nSteps) return null;
  const normalizedPower = maxPower / (n * n * variance);
  if (normalizedPower <= 0.3) return null;
  return fMin + best * df;
}
