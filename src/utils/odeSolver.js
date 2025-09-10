// src/utils/odeSolver.js

/**
 * Generic Runge-Kutta ODE solver for systems of differential equations
 * Supports RK4 (4th order) method for high accuracy
 */

/**
 * Fourth-order Runge-Kutta method for solving systems of ODEs
 * @param {Function} f - Function that takes (t, y) and returns dy/dt array
 * @param {number} t0 - Initial time
 * @param {Array} y0 - Initial values array [y1_0, y2_0, ...]
 * @param {number} h - Step size
 * @param {number} steps - Number of steps to compute
 * @returns {Array} Array of {t, y} objects where y is the state vector
 */
export const rungeKutta4 = (f, t0, y0, h, steps) => {
  const solution = [];
  let t = t0;
  let y = [...y0]; // Copy initial values

  // Add initial condition
  solution.push({ t, y: [...y] });

  for (let i = 0; i < steps; i++) {
    // RK4 coefficients
    const k1 = f(t, y);
    const k2 = f(t + h/2, vectorAdd(y, vectorScale(k1, h/2)));
    const k3 = f(t + h/2, vectorAdd(y, vectorScale(k2, h/2)));
    const k4 = f(t + h, vectorAdd(y, vectorScale(k3, h)));

    // Update y using weighted average
    const dy = vectorScale(
      vectorAdd(
        vectorAdd(k1, vectorScale(k2, 2)),
        vectorAdd(vectorScale(k3, 2), k4)
      ),
      h/6
    );

    y = vectorAdd(y, dy);
    t = t0 + (i + 1) * h;

    solution.push({ t, y: [...y] });
  }

  return solution;
};

/**
 * Adaptive step size Runge-Kutta method
 * Automatically adjusts step size based on error estimation
 * @param {Function} f - Function that takes (t, y) and returns dy/dt array
 * @param {number} t0 - Initial time
 * @param {Array} y0 - Initial values array
 * @param {number} tEnd - End time
 * @param {number} h0 - Initial step size
 * @param {number} tolerance - Error tolerance
 * @returns {Array} Array of {t, y} objects
 */
export const rungeKuttaAdaptive = (f, t0, y0, tEnd, h0 = 0.01, tolerance = 1e-6) => {
  const solution = [];
  let t = t0;
  let y = [...y0];
  let h = h0;

  solution.push({ t, y: [...y] });

  while (t < tEnd) {
    // Ensure we don't overstep
    if (t + h > tEnd) {
      h = tEnd - t;
    }

    // Full step with size h
    const y1 = rungeKutta4Step(f, t, y, h);

    // Two half steps with size h/2
    const yHalf = rungeKutta4Step(f, t, y, h/2);
    const y2 = rungeKutta4Step(f, t + h/2, yHalf, h/2);

    // Estimate error (difference between full step and two half steps)
    const error = vectorNorm(vectorSubtract(y2, y1));

    if (error < tolerance || h < 1e-10) {
      // Accept step
      y = y2; // Use more accurate result
      t += h;
      solution.push({ t, y: [...y] });

      // Increase step size if error is very small
      if (error < tolerance / 10) {
        h = Math.min(h * 1.5, h0 * 4);
      }
    } else {
      // Reject step and reduce step size
      h *= 0.5;
    }
  }

  return solution;
};

/**
 * Single step of RK4 method
 * @param {Function} f - Derivative function
 * @param {number} t - Current time
 * @param {Array} y - Current state
 * @param {number} h - Step size
 * @returns {Array} New state after one step
 */
const rungeKutta4Step = (f, t, y, h) => {
  const k1 = f(t, y);
  const k2 = f(t + h/2, vectorAdd(y, vectorScale(k1, h/2)));
  const k3 = f(t + h/2, vectorAdd(y, vectorScale(k2, h/2)));
  const k4 = f(t + h, vectorAdd(y, vectorScale(k3, h)));

  const dy = vectorScale(
    vectorAdd(
      vectorAdd(k1, vectorScale(k2, 2)),
      vectorAdd(vectorScale(k3, 2), k4)
    ),
    h/6
  );

  return vectorAdd(y, dy);
};

/**
 * Vector arithmetic utilities
 */
const vectorAdd = (v1, v2) => v1.map((val, i) => val + v2[i]);
const vectorSubtract = (v1, v2) => v1.map((val, i) => val - v2[i]);
const vectorScale = (v, scalar) => v.map(val => val * scalar);
const vectorNorm = (v) => Math.sqrt(v.reduce((sum, val) => sum + val * val, 0));

/**
 * Predefined ODE systems for common models
 */

/**
 * Lotka-Volterra predator-prey system
 * x' = ax - bxy (prey)
 * y' = -cy + dxy (predator)
 * @param {Object} params - {a, b, c, d} parameters
 * @returns {Function} ODE function
 */
export const lotkaVolterra = (params) => {
  const { a, b, c, d } = params;
  return (t, y) => {
    const [x, y_pred] = y;
    return [
      a * x - b * x * y_pred,  // prey equation
      -c * y_pred + d * x * y_pred  // predator equation
    ];
  };
};

/**
 * Shark-Tuna interaction system (modified Lotka-Volterra)
 * S' = -δS + pST (sharks)
 * T' = βT - qST (tuna)
 * @param {Object} params - {delta, p, beta, q} parameters
 * @returns {Function} ODE function
 */
export const sharkTuna = (params) => {
  const { delta, p, beta, q } = params;
  return (t, y) => {
    const [S, T] = y;
    return [
      -delta * S + p * S * T,  // shark equation
      beta * T - q * S * T     // tuna equation
    ];
  };
};

/**
 * Van der Pol oscillator
 * x'' - μ(1 - x²)x' + x = 0
 * Converted to first-order system:
 * x' = y
 * y' = μ(1 - x²)y - x
 * @param {number} mu - Damping parameter
 * @returns {Function} ODE function
 */
export const vanDerPol = (mu) => {
  return (t, y) => {
    const [x, v] = y;
    return [
      v,                           // x' = v
      mu * (1 - x * x) * v - x    // v' = μ(1-x²)v - x
    ];
  };
};

/**
 * Utility function to compute vector field for visualization
 * @param {Function} f - ODE function
 * @param {Array} xRange - [min, max] for first variable
 * @param {Array} yRange - [min, max] for second variable
 * @param {number} gridSize - Number of points in each direction
 * @returns {Array} Array of {x, y, dx, dy} objects
 */
export const computeVectorField = (f, xRange, yRange, gridSize = 20) => {
  const [xMin, xMax] = xRange;
  const [yMin, yMax] = yRange;
  const field = [];

  for (let i = 0; i <= gridSize; i++) {
    for (let j = 0; j <= gridSize; j++) {
      const x = xMin + (i / gridSize) * (xMax - xMin);
      const y = yMin + (j / gridSize) * (yMax - yMin);

      const derivatives = f(0, [x, y]); // t=0 for autonomous systems
      const [dx, dy] = derivatives;

      // Normalize for display
      const magnitude = Math.sqrt(dx * dx + dy * dy);
      const normalizedDx = magnitude > 0 ? dx / magnitude : 0;
      const normalizedDy = magnitude > 0 ? dy / magnitude : 0;

      field.push({
        x, y,
        dx, dy,
        normalizedDx, normalizedDy,
        magnitude
      });
    }
  }

  return field;
};

/**
 * Find equilibrium points numerically
 * @param {Function} f - ODE function
 * @param {Array} xRange - Search range for x
 * @param {Array} yRange - Search range for y
 * @param {number} tolerance - Tolerance for equilibrium detection
 * @returns {Array} Array of equilibrium points {x, y}
 */
export const findEquilibria = (f, xRange, yRange, tolerance = 1e-6) => {
  const equilibria = [];
  const [xMin, xMax] = xRange;
  const [yMin, yMax] = yRange;
  const gridSize = 50;

  for (let i = 0; i <= gridSize; i++) {
    for (let j = 0; j <= gridSize; j++) {
      const x = xMin + (i / gridSize) * (xMax - xMin);
      const y = yMin + (j / gridSize) * (yMax - yMin);

      const [dx, dy] = f(0, [x, y]);
      const magnitude = Math.sqrt(dx * dx + dy * dy);

      if (magnitude < tolerance) {
        // Check if this is a new equilibrium (not too close to existing ones)
        const isNew = equilibria.every(eq => {
          const dist = Math.sqrt((eq.x - x) ** 2 + (eq.y - y) ** 2);
          return dist > tolerance * 10;
        });

        if (isNew) {
          equilibria.push({ x, y, stability: 'unknown' });
        }
      }
    }
  }

  return equilibria;
};
