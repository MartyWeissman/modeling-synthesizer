// src/utils/mathHelpers.js

// Caffeine metabolism calculations
export const calculateCaffeineLevels = (doses, metabolicRate) => {
  const data = new Array(72 * 60).fill(0); // 72 hours * 60 minutes
  const startTime = new Date();
  startTime.setHours(0, 0, 0, 0);

  for (let day = 0; day < 3; day++) {
    doses.forEach(({ time, dose }) => {
      const [hours, minutes] = time.split(":").map(Number);
      const doseTime = new Date(
        startTime.getTime() + day * 24 * 60 * 60 * 1000,
      );
      doseTime.setHours(hours, minutes);
      const startIndex = Math.floor((doseTime - startTime) / (1000 * 60));

      for (let j = 0; j < 60; j++) {
        if (startIndex + j < data.length) {
          data[startIndex + j] += dose / 60;
        }
      }
    });
  }

  for (let i = 1; i < data.length; i++) {
    data[i] += data[i - 1] * Math.exp(-metabolicRate / 60);
  }

  return data;
};

// Canvas plotting utilities
export const drawCaffeineGraph = (canvas, data) => {
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const padding = 40;

  ctx.clearRect(0, 0, width, height);

  // Draw grid lines
  ctx.strokeStyle = "#e0e0e0";
  ctx.lineWidth = 1;

  // Horizontal grid lines
  for (let i = 50; i <= 300; i += 50) {
    const y = height - padding - ((height - 2 * padding) * i) / 300;
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(width - padding, y);
    ctx.stroke();
  }

  // Vertical grid lines
  for (let i = 12; i <= 72; i += 12) {
    const x = padding + ((width - 2 * padding) * i) / 72;
    ctx.beginPath();
    ctx.moveTo(x, padding);
    ctx.lineTo(x, height - padding);
    ctx.stroke();
  }

  // Draw axes
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(padding, padding);
  ctx.lineTo(padding, height - padding);
  ctx.lineTo(width - padding, height - padding);
  ctx.stroke();

  // Draw x-axis labels
  ctx.fillStyle = "#000";
  ctx.font = "10px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  for (let i = 0; i <= 6; i++) {
    const x = padding + ((width - 2 * padding) * i) / 6;
    ctx.fillText(i * 12, x, height - padding + 5);
  }

  // Draw y-axis labels
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (let i = 0; i <= 6; i++) {
    const y = height - padding - ((height - 2 * padding) * i) / 6;
    ctx.fillText(i * 50, padding - 5, y);
  }

  // Draw data line
  if (data.length > 0) {
    ctx.beginPath();
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 2;

    for (let i = 0; i < data.length; i++) {
      const x = padding + ((width - 2 * padding) * i) / data.length;
      const y =
        height -
        padding -
        ((height - 2 * padding) * Math.min(data[i], 300)) / 300;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  }
};

// General math utilities
export const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export const lerp = (start, end, factor) => start + (end - start) * factor;

export const formatNumber = (num, decimals = 2) => {
  return Number(num).toFixed(decimals);
};

// Time utilities
export const getCurrentCaffeineLevel = (data) => {
  if (data.length === 0) return 0;
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  return Math.round(data[minutes] || 0);
};

export const calculateHalfLife = (metabolicRate) => {
  return Math.round(0.693 / metabolicRate);
};

// Linear regression utilities
export const calculateLinearRegression = (points) => {
  if (!points || points.length < 2) {
    return {
      slope: 0,
      intercept: 0,
      rSquared: 0,
      isValid: false,
    };
  }

  const n = points.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  let sumYY = 0;

  // Calculate sums
  for (const point of points) {
    sumX += point.x;
    sumY += point.y;
    sumXY += point.x * point.y;
    sumXX += point.x * point.x;
    sumYY += point.y * point.y;
  }

  // Calculate slope (m) and intercept (b) for y = mx + b
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Calculate R-squared (coefficient of determination)
  const meanY = sumY / n;
  let ssRes = 0; // Sum of squares of residuals
  let ssTot = 0; // Total sum of squares

  for (const point of points) {
    const predicted = slope * point.x + intercept;
    ssRes += Math.pow(point.y - predicted, 2);
    ssTot += Math.pow(point.y - meanY, 2);
  }

  const rSquared = ssTot === 0 ? 1 : 1 - ssRes / ssTot;

  return {
    slope,
    intercept,
    rSquared,
    isValid: true,
    pointCount: n,
  };
};

// Generate points for regression line within given bounds
export const generateRegressionLine = (
  slope,
  intercept,
  xRange,
  numPoints = 100,
) => {
  const [xMin, xMax] = xRange;
  const points = [];

  for (let i = 0; i <= numPoints; i++) {
    const x = xMin + (xMax - xMin) * (i / numPoints);
    const y = slope * x + intercept;
    points.push({ x, y });
  }

  return points;
};

// Calculate correlation coefficient (Pearson's r)
export const calculateCorrelation = (points) => {
  if (!points || points.length < 2) return 0;

  const n = points.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  let sumYY = 0;

  for (const point of points) {
    sumX += point.x;
    sumY += point.y;
    sumXY += point.x * point.y;
    sumXX += point.x * point.x;
    sumYY += point.y * point.y;
  }

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt(
    (n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY),
  );

  return denominator === 0 ? 0 : numerator / denominator;
};

// Statistical utilities for regression
export const calculateStandardError = (points, slope, intercept) => {
  if (!points || points.length < 3) return 0;

  let sumSquaredResiduals = 0;
  for (const point of points) {
    const predicted = slope * point.x + intercept;
    sumSquaredResiduals += Math.pow(point.y - predicted, 2);
  }

  return Math.sqrt(sumSquaredResiduals / (points.length - 2));
};

// Validate regression data points
export const validateRegressionData = (points) => {
  if (!Array.isArray(points))
    return { isValid: false, error: "Data must be an array" };
  if (points.length < 2)
    return { isValid: false, error: "Need at least 2 data points" };

  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    if (!point || typeof point !== "object") {
      return { isValid: false, error: `Invalid point at index ${i}` };
    }
    if (typeof point.x !== "number" || typeof point.y !== "number") {
      return {
        isValid: false,
        error: `Point at index ${i} must have numeric x and y values`,
      };
    }
    if (!isFinite(point.x) || !isFinite(point.y)) {
      return {
        isValid: false,
        error: `Point at index ${i} contains infinite or NaN values`,
      };
    }
  }

  return { isValid: true };
};

// ============================================================================
// 1D Dynamical Systems Analysis
// ============================================================================

/**
 * Find equilibrium points (zeros) of a 1D dynamical system
 * Uses combination of grid search and bisection method for robustness
 *
 * @param {DynamicalSystem1D} system - The 1D dynamical system
 * @param {Object} params - Parameter values, e.g., {k: 0.5, r: 1.2}
 * @param {number} xMin - Minimum X value to search
 * @param {number} xMax - Maximum X value to search
 * @param {number} gridSize - Number of grid points for initial search (default: 200)
 * @param {number} tolerance - Convergence tolerance for bisection (default: 1e-6)
 * @returns {Array<number>} - Array of equilibrium X values, sorted
 */
export const findEquilibria1D = (
  system,
  params,
  xMin,
  xMax,
  gridSize = 200,
  tolerance = 1e-6,
) => {
  if (!system || !system.isValidSystem()) {
    return [];
  }

  const equilibria = [];
  const dx = (xMax - xMin) / gridSize;

  // Threshold for detecting "near-zero valleys" (tangent roots)
  const nearZeroThreshold = 0.01 * Math.max(1, Math.abs(xMax - xMin));

  // Grid search to find sign changes (indicating zeros)
  let prevX = xMin;
  let prevF = system.evaluateDerivative(prevX, params);

  for (let i = 1; i <= gridSize; i++) {
    const x = xMin + i * dx;
    const f = system.evaluateDerivative(x, params);

    if (!isFinite(prevF) || !isFinite(f)) {
      prevX = x;
      prevF = f;
      continue;
    }

    // TYPE 1: Sign-change roots (standard crossing roots)
    if (prevF * f < 0) {
      // Found a sign change - use bisection to refine
      const equilibrium = bisection(
        (x) => system.evaluateDerivative(x, params),
        prevX,
        x,
        tolerance,
      );

      if (equilibrium !== null) {
        equilibria.push(equilibrium);
      }
    }

    // TYPE 2: Tangent roots (local minima near zero)
    // Check if both endpoints are small (near zero) AND have the same sign
    if (
      Math.abs(prevF) < nearZeroThreshold &&
      Math.abs(f) < nearZeroThreshold &&
      prevF * f > 0 // Same sign - excludes sign-changing roots
    ) {
      // Sample midpoint to check for local minimum pattern
      const midX = (prevX + x) / 2;
      const midF = system.evaluateDerivative(midX, params);

      if (isFinite(midF)) {
        // Check if midpoint is lower than both endpoints (U-shaped valley)
        if (
          Math.abs(midF) <= Math.abs(prevF) &&
          Math.abs(midF) <= Math.abs(f)
        ) {
          // Found a potential tangent root - use golden section search
          // to find the minimum of |f(X)| in this interval
          const candidate = goldenSectionSearch(
            (x) => Math.abs(system.evaluateDerivative(x, params)),
            prevX,
            x,
            tolerance,
          );

          // Verify it's actually a root (function value very close to zero)
          const candidateValue = system.evaluateDerivative(candidate, params);
          if (Math.abs(candidateValue) < tolerance) {
            equilibria.push(candidate);
          }
        }
      }
    }

    // TYPE 3: Exact zero (unlikely but possible)
    if (f === 0) {
      equilibria.push(x);
    }

    prevX = x;
    prevF = f;
  }

  // Remove duplicates (equilibria within tolerance of each other)
  const uniqueEquilibria = [];
  for (const eq of equilibria) {
    const isDuplicate = uniqueEquilibria.some(
      (existing) => Math.abs(existing - eq) < tolerance * 10,
    );
    if (!isDuplicate) {
      uniqueEquilibria.push(eq);
    }
  }

  // Sort equilibria
  return uniqueEquilibria.sort((a, b) => a - b);
};

/**
 * Golden section search to find minimum of a function in [a, b]
 * Used to find tangent roots (local minima near zero)
 *
 * @param {Function} f - Function to minimize (use Math.abs(derivative) to find roots)
 * @param {number} a - Left bound
 * @param {number} b - Right bound
 * @param {number} tolerance - Convergence tolerance (default: 1e-8)
 * @returns {number} - X value where f(x) is minimized
 */
const goldenSectionSearch = (f, a, b, tolerance = 1e-8) => {
  const phi = (1 + Math.sqrt(5)) / 2; // Golden ratio
  const resphi = 2 - phi; // 1/phi

  // Initial points
  let x1 = a + resphi * (b - a);
  let x2 = b - resphi * (b - a);
  let f1 = f(x1);
  let f2 = f(x2);

  // Iteratively narrow the interval
  while (Math.abs(b - a) > tolerance) {
    if (f1 < f2) {
      b = x2;
      x2 = x1;
      f2 = f1;
      x1 = a + resphi * (b - a);
      f1 = f(x1);
    } else {
      a = x1;
      x1 = x2;
      f1 = f2;
      x2 = b - resphi * (b - a);
      f2 = f(x2);
    }
  }

  // Return midpoint as best estimate
  return (a + b) / 2;
};

/**
 * Bisection method to find zero of a function
 *
 * @param {Function} f - Function to find zero of
 * @param {number} a - Left bracket
 * @param {number} b - Right bracket
 * @param {number} tolerance - Convergence tolerance
 * @param {number} maxIterations - Maximum iterations (default: 100)
 * @returns {number|null} - Zero of function, or null if failed
 */
const bisection = (f, a, b, tolerance, maxIterations = 100) => {
  let fa = f(a);
  let fb = f(b);

  // Check that signs are different
  if (fa * fb > 0) {
    return null;
  }

  let iteration = 0;
  while (iteration < maxIterations && Math.abs(b - a) > tolerance) {
    const c = (a + b) / 2;
    const fc = f(c);

    if (Math.abs(fc) < tolerance) {
      return c; // Found zero
    }

    if (fa * fc < 0) {
      b = c;
      fb = fc;
    } else {
      a = c;
      fa = fc;
    }

    iteration++;
  }

  return (a + b) / 2; // Return midpoint as best estimate
};

/**
 * Analyze stability of an equilibrium point
 * Checks the sign of the derivative near the equilibrium
 *
 * @param {DynamicalSystem1D} system - The 1D dynamical system
 * @param {Object} params - Parameter values
 * @param {number} equilibrium - The equilibrium X value
 * @param {number} delta - Small perturbation for stability test (default: 0.001)
 * @returns {Object} - {stable: boolean, type: string}
 *   - stable: true if stable (derivative negative), false if unstable
 *   - type: "stable" | "unstable" | "semi-stable" | "unknown"
 */
export const analyzeStability1D = (
  system,
  params,
  equilibrium,
  deltaLeft,
  deltaRight,
) => {
  if (!system || !system.isValidSystem()) {
    return { stable: false, type: "unknown" };
  }

  const tolerance = 1e-12;

  // Evaluate X' = f(X, k) to the left and right of equilibrium
  const fLeft = system.evaluateDerivative(equilibrium - deltaLeft, params);
  const fRight = system.evaluateDerivative(equilibrium + deltaRight, params);

  if (!isFinite(fLeft) || !isFinite(fRight)) {
    return { stable: false, type: "unknown" };
  }

  // Determine sign of X' on each side
  const leftSign = Math.abs(fLeft) < tolerance ? 0 : Math.sign(fLeft);
  const rightSign = Math.abs(fRight) < tolerance ? 0 : Math.sign(fRight);

  if (leftSign === 0 || rightSign === 0) {
    return { stable: false, type: "unknown" };
  }

  // Classify based on sign of X' on either side:
  // Stable: X' changes sign (left positive, right negative)
  // Unstable: X' changes sign (left negative, right positive)
  // Semi-stable: X' same sign on both sides

  if (leftSign !== rightSign) {
    // X' changes sign
    if (leftSign > 0 && rightSign < 0) {
      return { stable: true, type: "stable" };
    } else {
      return { stable: false, type: "unstable" };
    }
  } else {
    // X' same sign on both sides - semi-stable
    return {
      stable: false,
      type: "semi-stable",
      flowDirection: leftSign > 0 ? "right" : "left",
    };
  }
};

/**
 * Complete phase line analysis for 1D system
 * Finds equilibria, determines stability, and analyzes flow between equilibria
 *
 * @param {DynamicalSystem1D} system - The 1D dynamical system
 * @param {Object} params - Parameter values
 * @param {number} xMin - Minimum X value
 * @param {number} xMax - Maximum X value
 * @returns {Object} - Complete phase line analysis
 *   {
 *     equilibria: [{x: number, stable: boolean, type: string}, ...],
 *     regions: [{xMin: number, xMax: number, flow: "right"|"left"|"zero", sign: number}, ...]
 *   }
 */
export const analyzePhaseLine1D = (system, params, xMin, xMax) => {
  if (!system || !system.isValidSystem()) {
    return { equilibria: [], regions: [] };
  }

  // Find all equilibria in extended range (10% beyond boundaries)
  const xRange = xMax - xMin;
  const xMinExtended = xMin - 0.1 * xRange;
  const xMaxExtended = xMax + 0.1 * xRange;
  const equilibriumValues = findEquilibria1D(
    system,
    params,
    xMinExtended,
    xMaxExtended,
  );

  // Analyze stability of each equilibrium with adaptive deltas
  const allEquilibria = equilibriumValues.map((x, i) => {
    // Calculate delta as halfway to nearest equilibrium (or to boundary)
    let deltaLeft, deltaRight;

    if (i === 0) {
      // First equilibrium - use distance to xMinExtended or next equilibrium
      deltaLeft = Math.abs(x - xMinExtended) / 2;
      deltaRight =
        i < equilibriumValues.length - 1
          ? Math.abs(equilibriumValues[i + 1] - x) / 2
          : Math.abs(xMaxExtended - x) / 2;
    } else if (i === equilibriumValues.length - 1) {
      // Last equilibrium - use distance to previous equilibrium or xMaxExtended
      deltaLeft = Math.abs(x - equilibriumValues[i - 1]) / 2;
      deltaRight = Math.abs(xMaxExtended - x) / 2;
    } else {
      // Middle equilibrium - use distance to neighbors
      deltaLeft = Math.abs(x - equilibriumValues[i - 1]) / 2;
      deltaRight = Math.abs(equilibriumValues[i + 1] - x) / 2;
    }

    return {
      x,
      ...analyzeStability1D(system, params, x, deltaLeft, deltaRight),
    };
  });

  // Filter to only show equilibria within visible window [xMin, xMax]
  const equilibria = allEquilibria.filter((eq) => eq.x >= xMin && eq.x <= xMax);

  // Analyze flow in regions between equilibria
  const regions = [];
  const boundaries = [xMin, ...equilibriumValues, xMax];

  for (let i = 0; i < boundaries.length - 1; i++) {
    const regionMin = boundaries[i];
    const regionMax = boundaries[i + 1];
    const midpoint = (regionMin + regionMax) / 2;

    // Evaluate derivative at midpoint to determine flow direction
    const derivative = system.evaluateDerivative(midpoint, params);

    let flow, sign;
    if (derivative > 1e-10) {
      flow = "right"; // X increasing
      sign = 1;
    } else if (derivative < -1e-10) {
      flow = "left"; // X decreasing
      sign = -1;
    } else {
      flow = "zero"; // No flow (shouldn't happen in non-equilibrium regions)
      sign = 0;
    }

    regions.push({
      xMin: regionMin,
      xMax: regionMax,
      flow,
      sign,
      derivative,
    });
  }

  return { equilibria, regions };
};

/**
 * Detect degenerate intervals where X' = 0 over an entire interval
 * (Not just isolated equilibrium points)
 *
 * @param {DynamicalSystem1D} system - The 1D dynamical system
 * @param {Object} params - Parameter values
 * @param {number} xMin - Minimum X value
 * @param {number} xMax - Maximum X value
 * @param {number} gridSize - Number of grid points (default: 200)
 * @param {number} tolerance - Tolerance for "zero" (default: 1e-6)
 * @returns {Array<{xMin: number, xMax: number}>} - Array of degenerate intervals
 */
export const findDegenerateIntervals1D = (
  system,
  params,
  xMin,
  xMax,
  gridSize = 200,
  tolerance = 1e-6,
) => {
  if (!system || !system.isValidSystem()) {
    return [];
  }

  const dx = (xMax - xMin) / gridSize;
  const degenerateIntervals = [];
  let currentInterval = null;

  // Grid search for consecutive zero points
  for (let i = 0; i <= gridSize; i++) {
    const x = xMin + i * dx;
    const f = system.evaluateDerivative(x, params);

    if (isFinite(f) && Math.abs(f) < tolerance) {
      // Found a zero point
      if (currentInterval === null) {
        // Start new interval
        currentInterval = { xMin: x, xMax: x };
      } else {
        // Extend current interval
        currentInterval.xMax = x;
      }
    } else {
      // Not zero - close current interval if it exists
      if (currentInterval !== null) {
        // Only keep intervals that span multiple grid points
        const intervalWidth = currentInterval.xMax - currentInterval.xMin;
        if (intervalWidth > dx * 2) {
          // Verify it's truly degenerate (sample more points within)
          if (
            verifyDegenerateInterval(
              system,
              params,
              currentInterval.xMin,
              currentInterval.xMax,
              tolerance,
            )
          ) {
            degenerateIntervals.push(currentInterval);
          }
        }
        currentInterval = null;
      }
    }
  }

  // Close final interval if exists
  if (currentInterval !== null) {
    const intervalWidth = currentInterval.xMax - currentInterval.xMin;
    if (intervalWidth > dx * 2) {
      if (
        verifyDegenerateInterval(
          system,
          params,
          currentInterval.xMin,
          currentInterval.xMax,
          tolerance,
        )
      ) {
        degenerateIntervals.push(currentInterval);
      }
    }
  }

  return degenerateIntervals;
};

/**
 * Verify that an interval is truly degenerate by sampling additional points
 *
 * @param {DynamicalSystem1D} system - The 1D dynamical system
 * @param {Object} params - Parameter values
 * @param {number} xMin - Interval minimum
 * @param {number} xMax - Interval maximum
 * @param {number} tolerance - Tolerance for "zero"
 * @returns {boolean} - True if interval is degenerate
 */
const verifyDegenerateInterval = (system, params, xMin, xMax, tolerance) => {
  const numSamples = 10;
  const dx = (xMax - xMin) / numSamples;

  for (let i = 0; i <= numSamples; i++) {
    const x = xMin + i * dx;
    const f = system.evaluateDerivative(x, params);

    if (!isFinite(f) || Math.abs(f) > tolerance) {
      return false; // Found a non-zero point
    }
  }

  return true; // All sampled points are zero
};

/**
 * Filter out equilibria that fall within degenerate intervals
 *
 * @param {Array} equilibria - Array of equilibrium objects {x, stable, type}
 * @param {Array} degenerateIntervals - Array of intervals {xMin, xMax}
 * @returns {Array} - Filtered equilibria that don't overlap with degenerate intervals
 */
export const filterEquilibriaFromDegenerateIntervals = (
  equilibria,
  degenerateIntervals,
) => {
  if (!degenerateIntervals || degenerateIntervals.length === 0) {
    return equilibria;
  }

  return equilibria.filter((eq) => {
    // Check if this equilibrium falls within any degenerate interval
    const inDegenerateInterval = degenerateIntervals.some((interval) => {
      return eq.x >= interval.xMin && eq.x <= interval.xMax;
    });

    return !inDegenerateInterval;
  });
};
