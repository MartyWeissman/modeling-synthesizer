// src/utils/equationParser.js
// High-performance equation parser using math.js library
// Maintains same API as legacy parser for backward compatibility

import { create, all } from "mathjs/number";

// Create lightweight math.js instance (numbers only, no complex/BigNumber/units/matrices)
const math = create(all);

/**
 * Compiled equation for high-performance evaluation
 * Parse once, evaluate thousands of times
 */
class CompiledEquation {
  constructor(equationString, variables = ["X", "Y"]) {
    this.rawEquation = equationString.trim();
    this.variables = variables;
    this.isValid = false;
    this.errorMessage = "";
    this.compiledNode = null;

    try {
      this.compile();
      this.validate();
      this.isValid = true;
    } catch (error) {
      this.errorMessage = this.formatError(error);
      this.isValid = false;
    }
  }

  /**
   * Compile equation string to optimized math.js node
   */
  compile() {
    if (!this.rawEquation) {
      throw new Error("Equation cannot be empty");
    }

    // Validate uppercase variables before compilation
    this.validateVariables(this.rawEquation);

    try {
      // Parse and compile the equation using math.js
      // This creates an optimized evaluation tree
      this.compiledNode = math.compile(this.rawEquation);
    } catch (error) {
      // Re-throw with user-friendly message
      throw new Error(this.formatMathJsError(error));
    }
  }

  /**
   * Validate that only uppercase variables are used
   */
  validateVariables(equation) {
    // Extract potential variable names (single letters or multi-letter identifiers)
    // Skip function names and constants that math.js knows about
    const mathConstants = ["pi", "e", "PI", "E"];
    const mathFunctions = [
      "sin",
      "cos",
      "tan",
      "sqrt",
      "exp",
      "log",
      "abs",
      "pow",
      "asin",
      "acos",
      "atan",
      "sinh",
      "cosh",
      "tanh",
      "ln",
      "log10",
      "floor",
      "ceil",
      "round",
      "sign",
      "min",
      "max",
    ];

    // Find all identifiers (letter sequences not followed by parentheses)
    const identifierPattern = /\b([a-zA-Z]+)\b(?!\s*\()/g;
    let match;
    const foundIdentifiers = [];

    while ((match = identifierPattern.exec(equation)) !== null) {
      const identifier = match[1];

      // Skip known math.js functions and constants
      if (
        mathConstants.includes(identifier) ||
        mathFunctions.includes(identifier)
      ) {
        continue;
      }

      foundIdentifiers.push(identifier);
    }

    // Check for lowercase variables
    const lowercaseVars = foundIdentifiers.filter(
      (id) =>
        id.toLowerCase() === id &&
        !this.variables.map((v) => v.toLowerCase()).includes(id),
    );

    if (lowercaseVars.length > 0) {
      throw new Error(
        `Use uppercase variables. Found: ${lowercaseVars.join(", ")}. Use: ${lowercaseVars.map((v) => v.toUpperCase()).join(", ")}`,
      );
    }

    // Check for unknown uppercase variables
    const unknownVars = foundIdentifiers.filter(
      (id) =>
        id.toUpperCase() === id &&
        !this.variables.includes(id) &&
        !mathConstants.includes(id),
    );

    if (unknownVars.length > 0) {
      throw new Error(
        `Unknown variable: ${unknownVars.join(", ")}. Use: ${this.variables.join(", ")}`,
      );
    }
  }

  /**
   * Format math.js errors to be user-friendly
   */
  formatMathJsError(error) {
    const message = error.message || String(error);

    // Common error patterns and friendly messages
    if (message.includes("Unexpected")) {
      return `Invalid syntax: ${message}`;
    }
    if (message.includes("Undefined symbol")) {
      return `Unknown function or variable: ${message}`;
    }
    if (message.includes("parenthesis")) {
      return "Invalid syntax: mismatched parentheses";
    }

    // Return original message if no specific pattern matched
    return message;
  }

  /**
   * Format error message for display
   */
  formatError(error) {
    return error.message || String(error);
  }

  /**
   * Validate compiled function with test points
   */
  validate() {
    if (!this.compiledNode) {
      throw new Error("Function compilation failed");
    }

    // Test with various points to catch domain errors
    const testPoints = [
      [0, 0],
      [1, 1],
      [-1, -1],
      [0.1, 0.1],
      [Math.PI, Math.E],
      [10, -10],
      [-5, 5],
    ];

    for (const [x, y] of testPoints) {
      try {
        const scope = { X: x, Y: y };
        const result = this.compiledNode.evaluate(scope);

        // Result can be NaN (domain errors), Infinity, but should be a number
        if (typeof result !== "number") {
          throw new Error("Function must return a number");
        }
      } catch (error) {
        // Some domain errors are acceptable (e.g., sqrt(-1) = NaN)
        // Only fail if it's a syntax/compilation error
        const msg = error.message || String(error);
        if (!msg.includes("domain") && !msg.includes("range")) {
          throw new Error(`Validation failed at (${x}, ${y}): ${msg}`);
        }
      }
    }
  }

  /**
   * Evaluate equation at given point
   * Returns NaN for domain errors instead of throwing
   */
  evaluate(x, y) {
    if (!this.isValid || !this.compiledNode) {
      return NaN;
    }

    try {
      const scope = { X: x, Y: y };
      const result = this.compiledNode.evaluate(scope);

      // Return NaN for invalid results (Infinity, etc.)
      return isFinite(result) ? result : NaN;
    } catch (error) {
      // Return NaN for domain errors (sqrt of negative, log of negative, etc.)
      return NaN;
    }
  }

  /**
   * Get user-friendly error message
   */
  getError() {
    return this.errorMessage;
  }
}

/**
 * Dynamical system with two coupled differential equations
 * Handles X' = f(X,Y) and Y' = g(X,Y) with RK4 integration
 */
class DynamicalSystem {
  constructor(xPrimeEquation, yPrimeEquation) {
    this.xPrimeEq = new CompiledEquation(xPrimeEquation);
    this.yPrimeEq = new CompiledEquation(yPrimeEquation);

    this.isValid = this.xPrimeEq.isValid && this.yPrimeEq.isValid;
    this.errorMessage = this.getErrorMessage();
  }

  /**
   * Get combined error message from both equations
   */
  getErrorMessage() {
    const errors = [];
    if (!this.xPrimeEq.isValid) {
      errors.push(`X': ${this.xPrimeEq.getError()}`);
    }
    if (!this.yPrimeEq.isValid) {
      errors.push(`Y': ${this.yPrimeEq.getError()}`);
    }
    return errors.join("; ");
  }

  /**
   * Evaluate vector field at point (x, y)
   * Returns {vx, vy} or {vx: NaN, vy: NaN} if invalid
   */
  evaluateField(x, y) {
    if (!this.isValid) {
      return { vx: NaN, vy: NaN };
    }

    return {
      vx: this.xPrimeEq.evaluate(x, y),
      vy: this.yPrimeEq.evaluate(x, y),
    };
  }

  /**
   * RK4 integration step
   * Returns new position {x, y} or {x: NaN, y: NaN} if integration fails
   */
  rk4Step(x, y, dt) {
    if (!this.isValid) {
      return { x: NaN, y: NaN };
    }

    try {
      // RK4 coefficients
      const k1x = this.xPrimeEq.evaluate(x, y);
      const k1y = this.yPrimeEq.evaluate(x, y);

      const k2x = this.xPrimeEq.evaluate(
        x + 0.5 * dt * k1x,
        y + 0.5 * dt * k1y,
      );
      const k2y = this.yPrimeEq.evaluate(
        x + 0.5 * dt * k1x,
        y + 0.5 * dt * k1y,
      );

      const k3x = this.xPrimeEq.evaluate(
        x + 0.5 * dt * k2x,
        y + 0.5 * dt * k2y,
      );
      const k3y = this.yPrimeEq.evaluate(
        x + 0.5 * dt * k2x,
        y + 0.5 * dt * k2y,
      );

      const k4x = this.xPrimeEq.evaluate(x + dt * k3x, y + dt * k3y);
      const k4y = this.yPrimeEq.evaluate(x + dt * k3x, y + dt * k3y);

      // Check for NaN in any coefficient
      if ([k1x, k1y, k2x, k2y, k3x, k3y, k4x, k4y].some((k) => !isFinite(k))) {
        return { x: NaN, y: NaN };
      }

      // RK4 formula
      const newX = x + (dt / 6) * (k1x + 2 * k2x + 2 * k3x + k4x);
      const newY = y + (dt / 6) * (k1y + 2 * k2y + 2 * k3y + k4y);

      // Final validity check
      if (!isFinite(newX) || !isFinite(newY)) {
        return { x: NaN, y: NaN };
      }

      return { x: newX, y: newY };
    } catch (error) {
      return { x: NaN, y: NaN };
    }
  }

  /**
   * Update equations (re-compile)
   */
  updateEquations(xPrimeEquation, yPrimeEquation) {
    this.xPrimeEq = new CompiledEquation(xPrimeEquation);
    this.yPrimeEq = new CompiledEquation(yPrimeEquation);

    this.isValid = this.xPrimeEq.isValid && this.yPrimeEq.isValid;
    this.errorMessage = this.getErrorMessage();
  }

  /**
   * Check if system is valid for simulation
   */
  isValidSystem() {
    return this.isValid;
  }

  /**
   * Get error message for debugging
   */
  getError() {
    return this.errorMessage;
  }
}

/**
 * Compiled equation for 1D dynamical systems with parameters
 * Single variable X with adjustable parameters (k, r, a, etc.)
 */
class CompiledEquation1D {
  constructor(equationString, parameterNames = []) {
    this.rawEquation = equationString.trim();
    this.parameterNames = parameterNames; // e.g., ["k", "r"]
    this.isValid = false;
    this.errorMessage = "";
    this.compiledNode = null;

    try {
      this.compile();
      this.validate();
      this.isValid = true;
    } catch (error) {
      this.errorMessage = this.formatError(error);
      this.isValid = false;
    }
  }

  /**
   * Compile equation string to optimized math.js node
   */
  compile() {
    if (!this.rawEquation) {
      throw new Error("Equation cannot be empty");
    }

    // Validate variables and parameters before compilation
    this.validateVariablesAndParameters(this.rawEquation);

    try {
      // Parse and compile the equation using math.js
      this.compiledNode = math.compile(this.rawEquation);
    } catch (error) {
      throw new Error(this.formatMathJsError(error));
    }
  }

  /**
   * Validate that X is uppercase and parameters are lowercase
   */
  validateVariablesAndParameters(equation) {
    const mathConstants = ["pi", "e", "PI", "E"];
    const mathFunctions = [
      "sin",
      "cos",
      "tan",
      "sqrt",
      "exp",
      "log",
      "abs",
      "pow",
      "asin",
      "acos",
      "atan",
      "sinh",
      "cosh",
      "tanh",
      "ln",
      "log10",
      "floor",
      "ceil",
      "round",
      "sign",
      "min",
      "max",
    ];

    // Find all identifiers (not followed by parentheses)
    const identifierPattern = /\b([a-zA-Z]+)\b(?!\s*\()/g;
    let match;
    const foundIdentifiers = [];

    while ((match = identifierPattern.exec(equation)) !== null) {
      const identifier = match[1];

      // Skip known math.js functions and constants
      if (
        mathConstants.includes(identifier) ||
        mathFunctions.includes(identifier)
      ) {
        continue;
      }

      foundIdentifiers.push(identifier);
    }

    // Separate uppercase (should be X) and lowercase (should be parameters)
    const uppercaseIds = foundIdentifiers.filter(
      (id) => id.toUpperCase() === id,
    );
    const lowercaseIds = foundIdentifiers.filter(
      (id) => id.toLowerCase() === id,
    );

    // Check that only X is used as uppercase variable
    const invalidUppercase = uppercaseIds.filter(
      (id) => id !== "X" && !mathConstants.includes(id),
    );
    if (invalidUppercase.length > 0) {
      throw new Error(
        `Unknown variable: ${invalidUppercase.join(", ")}. Use X for the variable.`,
      );
    }

    // Check that all lowercase identifiers are declared parameters
    const undeclaredParams = lowercaseIds.filter(
      (id) => !this.parameterNames.includes(id) && !mathConstants.includes(id),
    );
    if (undeclaredParams.length > 0) {
      throw new Error(
        `Undeclared parameter: ${undeclaredParams.join(", ")}. Declare parameters: [${this.parameterNames.join(", ")}]`,
      );
    }
  }

  /**
   * Format math.js errors to be user-friendly
   */
  formatMathJsError(error) {
    const message = error.message || String(error);

    if (message.includes("Unexpected")) {
      return `Invalid syntax: ${message}`;
    }
    if (message.includes("Undefined symbol")) {
      return `Unknown function or variable: ${message}`;
    }
    if (message.includes("parenthesis")) {
      return "Invalid syntax: mismatched parentheses";
    }

    return message;
  }

  /**
   * Format error message for display
   */
  formatError(error) {
    return error.message || String(error);
  }

  /**
   * Validate compiled function with test values
   */
  validate() {
    if (!this.compiledNode) {
      throw new Error("Function compilation failed");
    }

    // Create test parameter scope (all params = 1)
    const paramScope = {};
    this.parameterNames.forEach((param) => {
      paramScope[param] = 1.0;
    });

    // Test with various X values
    const testValues = [0, 1, -1, 0.1, Math.PI, 10, -5];

    for (const x of testValues) {
      try {
        const scope = { X: x, ...paramScope };
        const result = this.compiledNode.evaluate(scope);

        if (typeof result !== "number") {
          throw new Error("Function must return a number");
        }
      } catch (error) {
        const msg = error.message || String(error);
        if (!msg.includes("domain") && !msg.includes("range")) {
          throw new Error(`Validation failed at X=${x}: ${msg}`);
        }
      }
    }
  }

  /**
   * Evaluate equation at given X with parameter values
   * @param {number} x - The value of X
   * @param {Object} params - Parameter values, e.g., {k: 0.5, r: 1.2}
   * @returns {number} - f(X, params) or NaN if invalid
   */
  evaluate(x, params = {}) {
    if (!this.isValid || !this.compiledNode) {
      return NaN;
    }

    try {
      const scope = { X: x, ...params };
      const result = this.compiledNode.evaluate(scope);

      return isFinite(result) ? result : NaN;
    } catch (error) {
      return NaN;
    }
  }

  /**
   * Get user-friendly error message
   */
  getError() {
    return this.errorMessage;
  }
}

/**
 * One-dimensional dynamical system
 * Handles X' = f(X, params) with parameters like k, r, etc.
 */
class DynamicalSystem1D {
  constructor(xPrimeEquation, parameterNames = []) {
    this.xPrimeEq = new CompiledEquation1D(xPrimeEquation, parameterNames);
    this.parameterNames = parameterNames;
    this.isValid = this.xPrimeEq.isValid;
    this.errorMessage = this.xPrimeEq.getError();
  }

  /**
   * Evaluate derivative at point X with given parameters
   * @param {number} x - The value of X
   * @param {Object} params - Parameter values, e.g., {k: 0.5}
   * @returns {number} - X' = f(X, params) or NaN if invalid
   */
  evaluateDerivative(x, params = {}) {
    if (!this.isValid) {
      return NaN;
    }

    return this.xPrimeEq.evaluate(x, params);
  }

  /**
   * Euler integration step (simple, fast)
   * @param {number} x - Current value of X
   * @param {Object} params - Parameter values
   * @param {number} dt - Time step
   * @returns {number} - New value of X or NaN if integration fails
   */
  eulerStep(x, params, dt) {
    if (!this.isValid) {
      return NaN;
    }

    const derivative = this.evaluateDerivative(x, params);
    if (!isFinite(derivative)) {
      return NaN;
    }

    const newX = x + dt * derivative;
    return isFinite(newX) ? newX : NaN;
  }

  /**
   * RK4 integration step (accurate, recommended)
   * @param {number} x - Current value of X
   * @param {Object} params - Parameter values
   * @param {number} dt - Time step
   * @returns {number} - New value of X or NaN if integration fails
   */
  rk4Step(x, params, dt) {
    if (!this.isValid) {
      return NaN;
    }

    try {
      // RK4 coefficients
      const k1 = this.evaluateDerivative(x, params);
      const k2 = this.evaluateDerivative(x + 0.5 * dt * k1, params);
      const k3 = this.evaluateDerivative(x + 0.5 * dt * k2, params);
      const k4 = this.evaluateDerivative(x + dt * k3, params);

      // Check for NaN in any coefficient
      if ([k1, k2, k3, k4].some((k) => !isFinite(k))) {
        return NaN;
      }

      // RK4 formula
      const newX = x + (dt / 6) * (k1 + 2 * k2 + 2 * k3 + k4);

      return isFinite(newX) ? newX : NaN;
    } catch (error) {
      return NaN;
    }
  }

  /**
   * Generate time series data
   * @param {number} x0 - Initial value of X
   * @param {Object} params - Parameter values
   * @param {number} tMax - Maximum time
   * @param {number} dt - Time step
   * @returns {Array} - Array of {t, x} points
   */
  generateTimeSeries(x0, params, tMax, dt = 0.01) {
    if (!this.isValid) {
      return [];
    }

    const data = [{ t: 0, x: x0 }];
    let x = x0;
    let t = 0;

    while (t < tMax) {
      x = this.rk4Step(x, params, dt);
      t += dt;

      if (!isFinite(x)) {
        break; // Stop if integration fails
      }

      data.push({ t, x });
    }

    return data;
  }

  /**
   * Update equation (re-compile)
   */
  updateEquation(xPrimeEquation) {
    this.xPrimeEq = new CompiledEquation1D(xPrimeEquation, this.parameterNames);
    this.isValid = this.xPrimeEq.isValid;
    this.errorMessage = this.xPrimeEq.getError();
  }

  /**
   * Check if system is valid for simulation
   */
  isValidSystem() {
    return this.isValid;
  }

  /**
   * Get error message for debugging
   */
  getError() {
    return this.errorMessage;
  }
}

// Export math.js instance for advanced usage if needed
export {
  CompiledEquation,
  DynamicalSystem,
  CompiledEquation1D,
  DynamicalSystem1D,
  math,
};
