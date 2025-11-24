// src/utils/equationParser.js
// High-performance equation parser and compiler for dynamical systems

/**
 * Safe math functions with domain checking
 * All functions return NaN for invalid inputs instead of throwing
 */
const safeMath = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  sqrt: (x) => (x < 0 ? NaN : Math.sqrt(x)),
  exp: (x) => {
    const result = Math.exp(x);
    return isFinite(result) ? result : NaN;
  },
  log: (x) => (x <= 0 ? NaN : Math.log(x)),
  abs: Math.abs,
  pow: (x, y) => {
    const result = Math.pow(x, y);
    return isFinite(result) ? result : NaN;
  },
  // Add constants
  pi: Math.PI,
  e: Math.E,
};

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
    this.compiledFunction = null;

    try {
      this.compile();
      this.validate();
      this.isValid = true;
    } catch (error) {
      this.errorMessage = error.message;
      this.isValid = false;
    }
  }

  /**
   * Compile equation string to optimized JavaScript function
   */
  compile() {
    if (!this.rawEquation) {
      throw new Error("Equation cannot be empty");
    }

    // Validate and transform equation
    const jsCode = this.transformToJS(this.rawEquation);

    // Create optimized function with safe math context
    const functionBody = `
      "use strict";
      const { sin, cos, tan, sqrt, exp, log, abs, pow, pi, e } = safeMath;
      try {
        const result = ${jsCode};
        return isFinite(result) ? result : NaN;
      } catch (e) {
        return NaN;
      }
    `;

    this.compiledFunction = new Function("X", "Y", "safeMath", functionBody);
  }

  /**
   * Transform mathematical expression to safe JavaScript
   */
  transformToJS(equation) {
    let transformed = equation;

    // Step 1: Extract and validate function names first
    const allowedFunctions = [
      "sin",
      "cos",
      "tan",
      "sqrt",
      "exp",
      "log",
      "abs",
      "pow",
    ];
    const allowedConstants = ["pi", "e"];
    const functionPattern = /\b([a-zA-Z]+)\s*\(/g;
    const foundFunctions = [];
    let match;

    // Find all functions and validate them
    while ((match = functionPattern.exec(transformed)) !== null) {
      const funcName = match[1].toLowerCase();
      if (!allowedFunctions.includes(funcName)) {
        throw new Error(
          `Unknown function: ${match[1]}. Allowed: ${allowedFunctions.join(", ")}`,
        );
      }
      foundFunctions.push({
        original: match[1],
        normalized: funcName,
        fullMatch: match[0],
      });
    }

    // Handle constants (without parentheses) - reset regex lastIndex
    functionPattern.lastIndex = 0;
    const constantPattern = /\b([a-zA-Z]+)\b(?!\s*\()/g;
    const foundConstants = [];

    while ((match = constantPattern.exec(transformed)) !== null) {
      const constName = match[1].toLowerCase();
      if (allowedConstants.includes(constName)) {
        foundConstants.push({
          original: match[1],
          normalized: constName,
          fullMatch: match[0],
        });
      }
    }

    // Step 2: Replace functions and constants with temporary placeholders
    const replacements = [];

    foundFunctions.forEach((func, index) => {
      const placeholder = `FUNC${index}`;
      transformed = transformed.replace(func.fullMatch, `${placeholder}(`);
      replacements.push({
        placeholder: `${placeholder}(`,
        replacement: `${func.normalized}(`,
      });
    });

    foundConstants.forEach((const_, index) => {
      const placeholder = `CONST${index}`;
      transformed = transformed.replace(
        new RegExp(`\\b${const_.original}\\b`, "g"),
        placeholder,
      );
      replacements.push({
        placeholder: placeholder,
        replacement: const_.normalized,
      });
    });

    // Step 3: Check for remaining lowercase letters (now that functions are replaced)
    const remainingLowercase = transformed.match(/\b[a-z]\b/g);
    if (remainingLowercase) {
      throw new Error(
        `Use uppercase variables. Found: ${remainingLowercase.join(", ")}. Use: ${remainingLowercase.map((v) => v.toUpperCase()).join(", ")}`,
      );
    }

    // Step 4: Validate syntax patterns
    this.validateSyntax(transformed);

    // Step 5: Restore function names and constants
    replacements.forEach(({ placeholder, replacement }) => {
      const escapedPlaceholder = placeholder.replace(/[()]/g, "\\$&");
      transformed = transformed.replace(
        new RegExp(escapedPlaceholder, "g"),
        replacement,
      );
    });

    // Step 6: Replace ^ with pow for exponentiation
    transformed = this.replacePowerOperator(transformed);

    // Step 7: Validate variables (check both uppercase variables and lowercase constants)
    const allPattern = /\b[A-Za-z]+\b/g;
    const foundTokens = new Set();
    while ((match = allPattern.exec(transformed)) !== null) {
      const token = match[0];
      // Skip if it's a function name, constant, or placeholder
      if (
        !allowedFunctions.includes(token.toLowerCase()) &&
        !allowedConstants.includes(token.toLowerCase()) &&
        !token.startsWith("FUNC") &&
        !token.startsWith("CONST")
      ) {
        foundTokens.add(token);
      }
    }

    for (const token of foundTokens) {
      if (!this.variables.includes(token)) {
        throw new Error(
          `Unknown variable: ${token}. Use: ${this.variables.join(", ")}`,
        );
      }
    }

    // Step 8: Implicit multiplication disabled (users must use explicit *)
    // transformed = this.addImplicitMultiplication(transformed);

    return transformed;
  }

  /**
   * Validate syntax patterns to catch common errors
   */
  validateSyntax(equation) {
    // Check for double operators
    if (/\+\+|\-\-|\*\*|\/\/|\^\^/.test(equation)) {
      throw new Error(
        "Invalid syntax: double operators not allowed (e.g., ++, --, **, //, ^^)",
      );
    }

    // Check for operators at start/end (allow leading minus sign)
    if (/^[\+\*\/\^]|[\+\-\*\/\^]$/.test(equation.trim())) {
      throw new Error(
        "Invalid syntax: equation cannot start with +, *, /, ^ or end with an operator",
      );
    }

    // Check for mismatched parentheses
    let parenCount = 0;
    for (const char of equation) {
      if (char === "(") parenCount++;
      if (char === ")") parenCount--;
      if (parenCount < 0) {
        throw new Error("Invalid syntax: mismatched parentheses");
      }
    }
    if (parenCount !== 0) {
      throw new Error("Invalid syntax: mismatched parentheses");
    }

    // Check for consecutive operators (except +- or -+ which can be valid)
    if (/[\+\*\/\^][\+\-\*\/\^]|[\-][\*\/\^]/.test(equation)) {
      throw new Error("Invalid syntax: consecutive operators");
    }

    // Check for empty parentheses
    if (/\(\s*\)/.test(equation)) {
      throw new Error("Invalid syntax: empty parentheses");
    }

    // Check for valid characters (now that functions are replaced with FUNC placeholders)
    const allowedPattern = /^[A-Z0-9+\-*/^().,\s]*$/;
    if (!allowedPattern.test(equation)) {
      const invalid = equation.match(/[^A-Z0-9+\-*/^().,\s]/g);
      throw new Error(
        `Invalid characters: ${[...new Set(invalid)].join(", ")}`,
      );
    }
  }

  /**
   * Replace ^ with Math.pow, handling precedence correctly
   */
  replacePowerOperator(equation) {
    // Simple regex replacement for now - could be more sophisticated
    return equation.replace(
      /([A-Z0-9]+|\([^)]*\))\s*\^\s*([A-Z0-9]+|\([^)]*\))/g,
      "pow($1, $2)",
    );
  }

  /**
   * Add implicit multiplication between variables and numbers
   */
  addImplicitMultiplication(equation) {
    // Number followed by variable: "2X" → "2*X"
    equation = equation.replace(/(\d)\s*([A-Z])/g, "$1*$2");

    // Variable followed by variable: "XY" → "X*Y"
    equation = equation.replace(/([A-Z])\s*([A-Z])/g, "$1*$2");

    // Number or variable followed by function: "2sin" → "2*sin", "Xcos" → "X*cos"
    equation = equation.replace(/([A-Z0-9])\s*([a-z]+\s*\()/g, "$1*$2");

    // Closing paren followed by variable/number: ")X" → ")*X"
    equation = equation.replace(/(\))\s*([A-Z0-9])/g, "$1*$2");

    return equation;
  }

  /**
   * Validate compiled function with test points
   */
  validate() {
    if (!this.compiledFunction) {
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
        const result = this.compiledFunction(x, y, safeMath);
        // Result can be NaN (that's ok for domain errors), but shouldn't throw
        if (typeof result !== "number") {
          throw new Error("Function must return a number");
        }
      } catch (error) {
        throw new Error(`Validation failed at (${x}, ${y}): ${error.message}`);
      }
    }
  }

  /**
   * Evaluate equation at given point
   */
  evaluate(x, y) {
    if (!this.isValid || !this.compiledFunction) {
      return NaN;
    }

    try {
      const result = this.compiledFunction(x, y, safeMath);
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

export { CompiledEquation, DynamicalSystem, safeMath };
