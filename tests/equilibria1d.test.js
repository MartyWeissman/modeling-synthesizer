// Equilibrium finding for 1D systems X' = f(X), via the equation parser.
// Converted from the old root-level test-equilibria.js script (#234).
import { describe, it, expect } from "vitest";
import { DynamicalSystem1D } from "../src/utils/equationParser.js";
import { findEquilibria1D } from "../src/utils/mathHelpers.js";

const roots = (expr, params, xMin, xMax, paramValues = {}) =>
  findEquilibria1D(new DynamicalSystem1D(expr, params), paramValues, xMin, xMax);

const expectRoots = (found, expected, digits = 4) => {
  expect(found).toHaveLength(expected.length);
  [...found]
    .sort((a, b) => a - b)
    .forEach((x, i) => expect(x).toBeCloseTo(expected[i], digits));
};

describe("findEquilibria1D", () => {
  it("finds a tangent root of X^2 at 0", () => {
    expectRoots(roots("X*X", [], -1, 1), [0]);
  });

  it("finds the inflection root of X^3 at 0", () => {
    expectRoots(roots("X*X*X", [], -1, 1), [0]);
  });

  it("finds both logistic equilibria k X (1 - X)", () => {
    expectRoots(roots("k*X*(1-X)", ["k"], -0.5, 1.5, { k: 0.5 }), [0, 1]);
  });

  it("finds the tangent root of (X - 0.5)^2", () => {
    expectRoots(roots("(X-0.5)*(X-0.5)", [], 0, 1), [0.5]);
  });

  it("finds -1, 0 (tangent) and 1 for X^4 - X^2", () => {
    expectRoots(roots("X*X*X*X - X*X", [], -1.5, 1.5), [-1, 0, 1]);
  });

  it("finds the zeros of sin X in [-4, 4]", () => {
    expectRoots(roots("sin(X)", [], -4, 4), [-Math.PI, 0, Math.PI]);
  });

  it("finds the zero of exp(X) - 1", () => {
    expectRoots(roots("exp(X) - 1", [], -2, 2), [0]);
  });

  it("finds the zero of log(X) at 1", () => {
    expectRoots(roots("log(X)", [], 0.1, 3), [1]);
  });

  it("finds the tangent zeros of sin(X)^2", () => {
    expectRoots(roots("sin(X)*sin(X)", [], -4, 4), [-Math.PI, 0, Math.PI]);
  });

  it("reports nothing for exp(-X^2) on [5, 6] (tiny but never zero)", () => {
    expect(roots("exp(-X*X)", [], 5, 6)).toHaveLength(0);
  });

  it("finds both roots of X exp(-X) = 0.1", () => {
    // Roots of X e^(-X) = 0.1 are 0.111833 and 3.577152
    expectRoots(roots("X*exp(-X) - 0.1", [], 0, 5), [0.111833, 3.577152]);
  });
});
