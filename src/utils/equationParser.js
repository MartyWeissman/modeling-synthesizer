// src/utils/equationParser.js
// Equation parser for the dynamical-systems calculators, built on math.js.
//
// Students type the right-hand side of a change equation, e.g. `k*X*(1-X)`.
// The formula is parsed once into a math.js expression tree, checked and
// normalized (see `compileFormula` below), then compiled for fast evaluation.
//
// What students may type:
//   - Variables X (and Y in 2D). Case-insensitive: `x` means X.
//   - Declared parameters (1D: `k`, and `X_tau` for the delayed value X(t−τ)).
//     Parameters are case-sensitive (`K` or `x_tau` get a "Did you mean"
//     hint rather than being silently accepted).
//   - Constants pi and e (also PI, E).
//   - Functions: sin, cos, tan, exp, sqrt, abs, ... and
//       log(X)  = natural logarithm (base e), same as ln(X)
//       log10(X), log2(X) for base 10 / base 2.
//   - Implicit multiplication: `2X`, `k X`, `kX`, `X(1-X)`, `2X(1-X)`,
//     `(1-X)(1+X)`, `3sin(X)` all mean what a student would expect.
//   - `**` is accepted as `^`, and pasted Unicode −, ×, ·, ², ³, τ are
//     converted.
//
// Errors are reported in plain language (no math.js internals).

import { create, all } from "mathjs/number";

// Lightweight math.js instance (numbers only, no complex/BigNumber/units/matrices)
const math = create(all);
// `ln` is the natural logarithm (math.js calls it `log`).
math.import({ ln: math.log }, { override: true });

// ---------------------------------------------------------------------------
// Shared formula compiler (used by both the 2D and the 1D classes)
// ---------------------------------------------------------------------------

const CONSTANTS = ["pi", "e", "PI", "E"];

/** Functions students may call. `log` is the natural log. */
const FUNCTIONS = [
  "sin", "cos", "tan", "sec", "csc", "cot",
  "asin", "acos", "atan", "atan2",
  "sinh", "cosh", "tanh",
  "sqrt", "cbrt", "exp", "log", "ln", "log10", "log2",
  "abs", "pow", "floor", "ceil", "round", "sign", "min", "max", "mod", "hypot",
];

const FUNCTION_SET = new Set(FUNCTIONS);

/** Replace pasted Unicode / Python-isms with math.js syntax. */
function normalizeText(s) {
  return s
    .replace(/[−‒–—]/g, "-") // − ‒ – —
    .replace(/[×·⋅∗]/g, "*") // × · ⋅ ∗
    .replace(/²/g, "^2")
    .replace(/³/g, "^3")
    .replace(/τ/g, "tau") // τ (so X_τ → X_tau)
    .replace(/\*\*/g, "^");
}

const joinList = (items) => {
  if (items.length <= 1) return items.join("");
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
};

const describeName = (name) =>
  name === "X_tau" ? "X_tau (the delayed value)" : name;

/** Student-readable sentence listing the names that may be used. */
function allowedNamesMessage(variables, parameters) {
  if (parameters.length === 0) {
    return variables.length === 1
      ? `Only ${variables[0]} may be used as the variable.`
      : `Only ${joinList(variables)} may be used as variables.`;
  }
  return `You can use ${joinList([...variables, ...parameters].map(describeName))}.`;
}

const squash = (s) => s.toLowerCase().replace(/_/g, "");

/**
 * Build a resolver that maps a typed identifier to the canonical name it
 * stands for (or null). Variables are case-insensitive; parameters and
 * constants must match exactly.
 */
function makeResolver(variables, parameters) {
  const exact = new Map();
  const loose = new Map();
  for (const v of variables) {
    exact.set(v, v);
    loose.set(v.toLowerCase(), v);
  }
  for (const p of parameters) exact.set(p, p);
  for (const c of CONSTANTS) exact.set(c, c);

  const resolve = (name) => exact.get(name) ?? loose.get(name.toLowerCase()) ?? null;

  // Split a run-together name such as "kX" or "XY" into allowed names
  // (fewest pieces wins). Only variables, parameters and pi are used as pieces.
  const splitPieces = [...variables, ...parameters, "pi"];
  const split = (name) => {
    const n = name.length;
    const best = Array(n + 1).fill(null);
    best[0] = [];
    for (let i = 0; i < n; i++) {
      if (!best[i]) continue;
      for (let j = i + 1; j <= n; j++) {
        const canon = resolve(name.slice(i, j));
        if (!canon || !splitPieces.includes(canon)) continue;
        const cand = [...best[i], canon];
        if (!best[j] || cand.length < best[j].length) best[j] = cand;
      }
    }
    return best[n] && best[n].length > 1 ? best[n] : null;
  };

  return { resolve, split };
}

const multiplyAll = (nodes) =>
  nodes.reduce((acc, node) => new math.OperatorNode("*", "multiply", [acc, node], true));

/** Friendly rewrite of a math.js syntax error. */
function friendlySyntaxError(error) {
  const msg = error.message || String(error);
  const at = /\(char (\d+)\)/.exec(msg);
  const where = at ? ` (at character ${at[1]})` : "";
  let m;
  if (/Parenthesis \) expected/.test(msg)) return "Missing a closing parenthesis “)”.";
  if (/Unexpected end of expression/.test(msg))
    return "The formula ends too early. Is something missing after the last operator?";
  if ((m = /Unexpected operator (\S+)/.exec(msg))) {
    if (m[1] === ")") return `There is an extra closing parenthesis “)”${where}.`;
    return `Unexpected “${m[1]}”${where}. Check for a missing number or variable.`;
  }
  if (/Value expected/.test(msg))
    return `Something is missing${where}. Check for two operators in a row.`;
  if ((m = /Unexpected part "([^"]*)"/.exec(msg)))
    return `Unexpected “${m[1]}”${where}. Use * between numbers, e.g. 2*3.`;
  if ((m = /Syntax error in part "([^"]*)"/.exec(msg)) || (m = /Unexpected character "([^"]*)"/.exec(msg)))
    return `The character “${m[1]}” can't be used in a formula${where}.`;
  return `The formula couldn't be read${where}. Check the syntax.`;
}

/** Friendly rewrite of an error thrown while evaluating the formula. */
function friendlyRuntimeError(error) {
  const msg = error.message || String(error);
  let m;
  if ((m = /Too (many|few) arguments in function (\w+?)(Number)?\b.*expected: (\d+)/.exec(msg)))
    return `${m[2]}(…) takes ${m[4]} input${m[4] === "1" ? "" : "s"}.`;
  if ((m = /Too (many|few) arguments in function (\w+?)(Number)?\b/.exec(msg)))
    return `Wrong number of inputs for ${m[2]}(…).`;
  if (/Unexpected type of argument/.test(msg))
    return "The formula couldn't be evaluated. Check that every function has parentheses, like sin(X).";
  return "The formula couldn't be evaluated. Check the syntax.";
}

/**
 * Parse, check and normalize a formula.
 *
 * @param {string} raw - what the student typed
 * @param {object} opts
 * @param {string[]} opts.variables  - e.g. ["X", "Y"] (case-insensitive)
 * @param {string[]} [opts.parameters] - e.g. ["k", "X_tau"]
 * @param {Object<string,string>} [opts.substitute] - rename symbols after
 *        checking, e.g. { X_tau: "X" } to get the equilibrium form of a delay
 *        equation. Names in `substitute` are also accepted as input names.
 * @param {string} [opts.example] - example formula used in messages
 * @returns {{ node: object, compiled: object, expression: string }}
 * @throws {Error} with a student-readable message
 */
export function compileFormula(raw, opts) {
  const variables = opts.variables ?? ["X", "Y"];
  const substitute = opts.substitute ?? {};
  const parameters = [
    ...(opts.parameters ?? []),
    ...Object.keys(substitute).filter((n) => !(opts.parameters ?? []).includes(n)),
  ];
  const example = opts.example ?? (variables.length > 1 ? "1 - Y*X" : "k*X*(1-X)");
  const allowed = allowedNamesMessage(variables, parameters);

  const text = normalizeText(String(raw ?? "").trim());
  if (!text) throw new Error("Enter a formula.");
  if (/['′’`]/.test(text)) {
    throw new Error(
      `Type only the right-hand side (no X' or Y'). Example: ${example}`,
    );
  }
  if (text.includes("=")) {
    throw new Error(
      `Type only the right-hand side, without “=”. Example: ${example}`,
    );
  }
  if (/["]/.test(text)) throw new Error("Quotation marks can't be used in a formula.");

  let tree;
  try {
    tree = math.parse(text);
  } catch (error) {
    throw new Error(friendlySyntaxError(error));
  }

  const { resolve, split } = makeResolver(variables, parameters);

  const unknownName = (name) => {
    // "sinX" → suggest sin(X)
    const fn = FUNCTIONS.filter((f) => name.toLowerCase().startsWith(f) && name.length > f.length)
      .sort((a, b) => b.length - a.length)[0];
    if (fn) {
      const rest = name.slice(fn.length);
      if (resolve(rest) || split(rest)) {
        return `Unknown name ${name}. Did you mean ${fn}(${rest})?`;
      }
    }
    const near = parameters.find((p) => squash(p) === squash(name));
    if (near) return `Unknown name ${name}. Did you mean ${near}?`;
    return `Unknown name ${name}. ${allowed}`;
  };

  const resolveSymbol = (name) => {
    const canon = resolve(name);
    if (canon) return new math.SymbolNode(canon);
    const pieces = split(name);
    if (pieces) return multiplyAll(pieces.map((p) => new math.SymbolNode(p)));
    if (FUNCTION_SET.has(name) || FUNCTION_SET.has(name.toLowerCase())) {
      throw new Error(`Use parentheses with functions: write ${name.toLowerCase()}(X), not ${name} X.`);
    }
    throw new Error(unknownName(name));
  };

  // transform() does not descend into a node that the callback replaced, so
  // replaced FunctionNodes transform their own arguments with `rule`.
  const rule = (n) => {
    switch (n.type) {
      case "SymbolNode":
        return resolveSymbol(n.name);
      case "FunctionNode": {
        const name = n.fn && n.fn.name;
        if (!name) throw new Error("The formula couldn't be read. Check the syntax.");
        const fname = FUNCTION_SET.has(name)
          ? name
          : FUNCTION_SET.has(name.toLowerCase())
            ? name.toLowerCase()
            : null;
        if (fname) {
          // Arguments are transformed recursively below.
          return new math.FunctionNode(
            new math.SymbolNode(fname),
            n.args.map((a) => a.transform(rule)),
          );
        }
        // X(1-X), k(1-X), kX(1-X): multiplication, not a function call.
        if (resolve(name) || split(name)) {
          if (n.args.length !== 1) {
            throw new Error(`${name}(…) isn't a function. Use * to multiply, e.g. ${name}*(1-X).`);
          }
          return new math.OperatorNode(
            "*",
            "multiply",
            [resolveSymbol(name), new math.ParenthesisNode(n.args[0].transform(rule))],
            true,
          );
        }
        throw new Error(
          `Unknown function ${name}(…). Available functions include sin, cos, tan, exp, ln (same as log), log10, sqrt, abs, min, max.`,
        );
      }
      default:
        return checkNodeType(n);
    }
  };
  let node = tree.transform(rule);

  // Apply substitutions (e.g. X_tau → X).
  if (Object.keys(substitute).length > 0) {
    node = node.transform((n) =>
      n.type === "SymbolNode" && Object.prototype.hasOwnProperty.call(substitute, n.name)
        ? new math.SymbolNode(substitute[n.name])
        : n,
    );
  }

  let compiled;
  try {
    compiled = node.compile();
  } catch (error) {
    throw new Error(friendlyRuntimeError(error));
  }
  return { node, compiled, expression: node.toString() };
}

function checkNodeType(n) {
  switch (n.type) {
    case "AssignmentNode":
    case "FunctionAssignmentNode":
      throw new Error("Type only the right-hand side, without “=”.");
    case "BlockNode":
      throw new Error("Enter a single formula (no ; or line breaks).");
    case "ArrayNode":
    case "AccessorNode":
    case "IndexNode":
    case "ObjectNode":
    case "RangeNode":
      throw new Error("Square brackets, colons, dots and braces can't be used in a formula.");
    default:
      return n;
  }
}

// ---------------------------------------------------------------------------
// 2D
// ---------------------------------------------------------------------------

/**
 * Compiled equation for high-performance evaluation
 * Parse once, evaluate thousands of times
 */
class CompiledEquation {
  constructor(equationString, variables = ["X", "Y"]) {
    this.rawEquation = String(equationString ?? "").trim();
    this.variables = variables;
    this.isValid = false;
    this.errorMessage = "";
    this.compiledNode = null;
    this.expression = "";

    try {
      this.compile();
      this.validate();
      this.isValid = true;
    } catch (error) {
      this.errorMessage = this.formatError(error);
      this.isValid = false;
    }
  }

  /** Parse, check and compile the equation string. */
  compile() {
    const { compiled, expression } = compileFormula(this.rawEquation, {
      variables: this.variables,
    });
    this.compiledNode = compiled;
    this.expression = expression;
  }

  formatError(error) {
    return error.message || String(error);
  }

  scopeFor(x, y) {
    const scope = {};
    scope[this.variables[0]] = x;
    if (this.variables.length > 1) scope[this.variables[1]] = y;
    return scope;
  }

  /** Evaluate at test points to catch errors math.js only finds at run time. */
  validate() {
    if (!this.compiledNode) {
      throw new Error("Function compilation failed");
    }
    const testPoints = [
      [0, 0], [1, 1], [-1, -1], [0.1, 0.1], [Math.PI, Math.E], [10, -10], [-5, 5],
    ];
    validateAtPoints(this.compiledNode, testPoints.map(([x, y]) => this.scopeFor(x, y)));
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
      const result = this.compiledNode.evaluate(this.scopeFor(x, y));
      return typeof result === "number" && isFinite(result) ? result : NaN;
    } catch {
      return NaN;
    }
  }

  getError() {
    return this.errorMessage;
  }
}

/** Shared run-time validation for both classes. */
function validateAtPoints(compiledNode, scopes) {
  for (const scope of scopes) {
    let result;
    try {
      result = compiledNode.evaluate(scope);
    } catch (error) {
      const msg = error.message || String(error);
      // Domain errors (e.g. sqrt of a negative) are fine: they give NaN.
      if (/domain|range/i.test(msg)) continue;
      throw new Error(friendlyRuntimeError(error));
    }
    if (typeof result === "boolean") {
      throw new Error("The formula must give a number, not a true/false comparison.");
    }
    if (typeof result !== "number") {
      throw new Error("The formula must give a number.");
    }
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
    const f = (a, b) => this.xPrimeEq.evaluate(a, b);
    const g = (a, b) => this.yPrimeEq.evaluate(a, b);

    const k1x = f(x, y);
    const k1y = g(x, y);
    const k2x = f(x + 0.5 * dt * k1x, y + 0.5 * dt * k1y);
    const k2y = g(x + 0.5 * dt * k1x, y + 0.5 * dt * k1y);
    const k3x = f(x + 0.5 * dt * k2x, y + 0.5 * dt * k2y);
    const k3y = g(x + 0.5 * dt * k2x, y + 0.5 * dt * k2y);
    const k4x = f(x + dt * k3x, y + dt * k3y);
    const k4y = g(x + dt * k3x, y + dt * k3y);

    if ([k1x, k1y, k2x, k2y, k3x, k3y, k4x, k4y].some((k) => !isFinite(k))) {
      return { x: NaN, y: NaN };
    }
    const newX = x + (dt / 6) * (k1x + 2 * k2x + 2 * k3x + k4x);
    const newY = y + (dt / 6) * (k1y + 2 * k2y + 2 * k3y + k4y);
    if (!isFinite(newX) || !isFinite(newY)) {
      return { x: NaN, y: NaN };
    }
    return { x: newX, y: newY };
  }

  updateEquations(xPrimeEquation, yPrimeEquation) {
    this.xPrimeEq = new CompiledEquation(xPrimeEquation);
    this.yPrimeEq = new CompiledEquation(yPrimeEquation);
    this.isValid = this.xPrimeEq.isValid && this.yPrimeEq.isValid;
    this.errorMessage = this.getErrorMessage();
  }

  isValidSystem() {
    return this.isValid;
  }

  getError() {
    return this.errorMessage;
  }
}

// ---------------------------------------------------------------------------
// 1D
// ---------------------------------------------------------------------------

/**
 * Compiled equation for 1D dynamical systems with parameters
 * Single variable X with adjustable parameters (k, X_tau, ...).
 *
 * @param {string} equationString
 * @param {string[]} parameterNames - e.g. ["k", "X_tau"]
 * @param {object} [options]
 * @param {Object<string,string>} [options.substitute] - e.g. { X_tau: "X" }
 *        evaluates X_tau as X (equilibrium form of a delay equation). Safer than a
 *        string replace, because it acts on the parsed formula.
 */
class CompiledEquation1D {
  constructor(equationString, parameterNames = [], options = {}) {
    this.rawEquation = String(equationString ?? "").trim();
    this.parameterNames = parameterNames;
    this.options = options;
    this.isValid = false;
    this.errorMessage = "";
    this.compiledNode = null;
    this.expression = "";

    try {
      this.compile();
      this.validate();
      this.isValid = true;
    } catch (error) {
      this.errorMessage = this.formatError(error);
      this.isValid = false;
    }
  }

  compile() {
    const { compiled, expression } = compileFormula(this.rawEquation, {
      variables: ["X"],
      parameters: this.parameterNames,
      substitute: this.options.substitute,
    });
    this.compiledNode = compiled;
    this.expression = expression;
  }

  formatError(error) {
    return error.message || String(error);
  }

  validate() {
    if (!this.compiledNode) {
      throw new Error("Function compilation failed");
    }
    const paramScope = {};
    this.parameterNames.forEach((param) => {
      paramScope[param] = 1.0;
    });
    const testValues = [0, 1, -1, 0.1, Math.PI, 10, -5];
    validateAtPoints(this.compiledNode, testValues.map((x) => ({ ...paramScope, X: x })));
  }

  /**
   * Evaluate equation at given X with parameter values
   * @param {number} x - The value of X
   * @param {Object} params - Parameter values, e.g., {k: 0.5, X_tau: 0.3}
   * @returns {number} - f(X, params) or NaN if invalid
   */
  evaluate(x, params = {}) {
    if (!this.isValid || !this.compiledNode) {
      return NaN;
    }
    try {
      const result = this.compiledNode.evaluate({ ...params, X: x });
      return typeof result === "number" && isFinite(result) ? result : NaN;
    } catch {
      return NaN;
    }
  }

  getError() {
    return this.errorMessage;
  }
}

/**
 * One-dimensional dynamical system
 * Handles X' = f(X, params) with parameters like k, X_tau.
 */
class DynamicalSystem1D {
  constructor(xPrimeEquation, parameterNames = [], options = {}) {
    this.options = options;
    this.xPrimeEq = new CompiledEquation1D(xPrimeEquation, parameterNames, options);
    this.parameterNames = parameterNames;
    this.isValid = this.xPrimeEq.isValid;
    this.errorMessage = this.xPrimeEq.getError();
  }

  evaluateDerivative(x, params = {}) {
    if (!this.isValid) {
      return NaN;
    }
    return this.xPrimeEq.evaluate(x, params);
  }

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

  rk4Step(x, params, dt) {
    if (!this.isValid) {
      return NaN;
    }
    const k1 = this.evaluateDerivative(x, params);
    const k2 = this.evaluateDerivative(x + 0.5 * dt * k1, params);
    const k3 = this.evaluateDerivative(x + 0.5 * dt * k2, params);
    const k4 = this.evaluateDerivative(x + dt * k3, params);
    if ([k1, k2, k3, k4].some((k) => !isFinite(k))) {
      return NaN;
    }
    const newX = x + (dt / 6) * (k1 + 2 * k2 + 2 * k3 + k4);
    return isFinite(newX) ? newX : NaN;
  }

  generateTimeSeries(x0, params, tMax, dt = 0.01) {
    if (!this.isValid) {
      return [];
    }
    const data = [{ t: 0, x: x0 }];
    let x = x0;
    const steps = Math.ceil(tMax / dt - 1e-9);
    for (let i = 1; i <= steps; i++) {
      x = this.rk4Step(x, params, dt);
      if (!isFinite(x)) break;
      data.push({ t: i * dt, x });
    }
    return data;
  }

  updateEquation(xPrimeEquation) {
    this.xPrimeEq = new CompiledEquation1D(xPrimeEquation, this.parameterNames, this.options);
    this.isValid = this.xPrimeEq.isValid;
    this.errorMessage = this.xPrimeEq.getError();
  }

  isValidSystem() {
    return this.isValid;
  }

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
  FUNCTIONS as SUPPORTED_FUNCTIONS,
};
