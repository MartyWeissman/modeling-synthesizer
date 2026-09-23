import { describe, it, expect } from "vitest";
import {
  CompiledEquation,
  CompiledEquation1D,
  DynamicalSystem,
  DynamicalSystem1D,
} from "../src/utils/equationParser.js";

const eval2 = (s, x, y) => {
  const e = new CompiledEquation(s);
  expect(e.isValid, `${s}: ${e.errorMessage}`).toBe(true);
  return e.evaluate(x, y);
};
const err2 = (s) => {
  const e = new CompiledEquation(s);
  expect(e.isValid, `${s} should be rejected`).toBe(false);
  return e.errorMessage;
};
const P1 = ["k", "X_tau"];
const eval1 = (s, x, params = { k: 3, X_tau: 5 }, names = P1, opts) => {
  const e = new CompiledEquation1D(s, names, opts);
  expect(e.isValid, `${s}: ${e.errorMessage}`).toBe(true);
  return e.evaluate(x, params);
};
const err1 = (s, names = P1) => {
  const e = new CompiledEquation1D(s, names);
  expect(e.isValid, `${s} should be rejected`).toBe(false);
  return e.errorMessage;
};

describe("2D parser: accepted formulas", () => {
  const X = 2;
  const Y = 3;
  it.each([
    ["ln(X)", Math.log(2)],
    ["log(X)", Math.log(2)], // log is the natural log
    ["log10(X*50)", 2],
    ["X(1-X)", -2],
    ["2X(1-X)", -4],
    ["2X", 4],
    ["X^2", 4],
    ["X^-1", 0.5],
    ["-X^2", -4],
    ["X*(1-X)", -2],
    ["3sin(X)", 3 * Math.sin(2)],
    ["e^X", Math.exp(2)],
    ["pi*X", Math.PI * 2],
    ["X Y", 6],
    ["XY", 6],
    ["X^1/2", 1], // (X^1)/2 by standard precedence
    ["pow(X,2)", 4],
    ["max(X,Y)", 3],
    ["x*y", 6], // case-insensitive variables
    ["x(1-y)", -4],
    ["Sin(X)", Math.sin(2)],
    ["X**2", 4],
    ["1 − Y*X", -5], // pasted Unicode minus
    ["X²", 4],
    ["(1-X)(1+X)", -3],
    ["1 - Y*X", -5], // lab manual
    ["(X*X/(1+X*X))-Y", 4 / 5 - 3], // lab manual
    ["sqrt(X)", Math.SQRT2],
  ])("%s", (s, expected) => {
    expect(eval2(s, X, Y)).toBeCloseTo(expected, 12);
  });

  it("returns NaN outside the domain instead of throwing", () => {
    expect(Number.isNaN(eval2("ln(X)", -1, 0))).toBe(true);
    expect(Number.isNaN(eval2("1/X", 0, 0))).toBe(true);
  });
});

describe("2D parser: friendly errors", () => {
  it("rejects '=' and X' with a clear message", () => {
    expect(err2("X' = X")).toMatch(/right-hand side/);
    expect(err2("X = 2")).toMatch(/right-hand side.*=/);
    expect(err2("Y'")).toMatch(/right-hand side/);
    expect(err2("X′")).toMatch(/right-hand side/);
  });
  it("t, T and parameters: only X and Y may be used", () => {
    expect(err2("t")).toBe("Unknown name t. Only X and Y may be used as variables.");
    expect(err2("T*X")).toMatch(/Only X and Y may be used as variables/);
    expect(err2("k X")).toMatch(/Only X and Y may be used as variables/);
    expect(err2("X_tau")).toMatch(/Only X and Y/);
  });
  it("functions need parentheses", () => {
    expect(err2("sin X")).toMatch(/parentheses.*sin\(X\)/);
    expect(err2("sinX")).toMatch(/Did you mean sin\(X\)/);
  });
  it("syntax errors are in plain language", () => {
    expect(err2("")).toMatch(/Enter a formula/);
    expect(err2("X*")).toMatch(/ends too early/);
    expect(err2("X*(1-X")).toMatch(/closing parenthesis/);
    expect(err2("X)")).toMatch(/extra closing parenthesis/);
    expect(err2("2 3")).toMatch(/Unexpected/);
    expect(err2("X;Y")).toMatch(/single formula/);
    expect(err2("[1,2]")).toMatch(/can't be used/);
    expect(err2("@")).toMatch(/can't be used/);
    expect(err2("X>1")).toMatch(/number/);
    expect(err2("sin(X,Y)")).toMatch(/sin\(…\) takes 1 input/);
    expect(err2("foo(X)")).toMatch(/Unknown function foo/);
  });
  it("never leaks math.js internals", () => {
    for (const s of ["X(1,2)", "sin", "kX", "x_y", "X!!!", "X.Y", "a ? b : c", "1:3", "{a:1}"]) {
      const e = new CompiledEquation(s);
      if (!e.isValid) {
        expect(e.errorMessage).not.toMatch(/Undefined symbol|is not a function|char \d|Number\b/);
      }
    }
  });
});

describe("DynamicalSystem (2D)", () => {
  it("prefixes errors with the equation they belong to", () => {
    const sys = new DynamicalSystem("X(1-X)", "t");
    expect(sys.isValidSystem()).toBe(false);
    expect(sys.getError()).toMatch(/^Y': Unknown name t/);
  });
  it("RK4 step on X' = -X, Y' = -2Y", () => {
    const sys = new DynamicalSystem("-x", "-2y");
    const { x, y } = sys.rk4Step(1, 1, 0.01);
    expect(x).toBeCloseTo(Math.exp(-0.01), 9);
    expect(y).toBeCloseTo(Math.exp(-0.02), 9);
    expect(sys.evaluateField(1, 2)).toEqual({ vx: -1, vy: -4 });
  });
});

describe("1D parser", () => {
  it.each([
    ["k*X*(1-X)", 3 * 2 * -1],
    ["kX(1-X)", -6],
    ["kX", 6],
    ["k X", 6],
    ["k(1-X)", -3],
    ["x", 2], // lowercase x is X
    ["k*x*(1-x)", -6],
    ["k*X_tau*(1-X)", 3 * 5 * -1],
    ["kX_tau", 15],
    ["X-X^3", -6], // lab manual
    ["ln(X)", Math.log(2)],
    ["2X", 4],
  ])("%s", (s, expected) => {
    expect(eval1(s, 2)).toBeCloseTo(expected, 12);
  });

  it("lists what may be used instead of 'Declare parameters'", () => {
    expect(err1("r*X")).toBe(
      "Unknown name r. You can use X, k, and X_tau (the delayed value).",
    );
    expect(err1("t")).toMatch(/You can use X, k, and X_tau/);
    expect(err1("Y")).toMatch(/You can use X, k, and X_tau/);
    expect(err1("r*X", ["k"])).toBe("Unknown name r. You can use X and k.");
    expect(err1("r*X", [])).toBe("Unknown name r. Only X may be used as the variable.");
    expect(err1("r*X")).not.toMatch(/Declare/);
  });
  it("parameters stay case-sensitive but get a hint", () => {
    expect(err1("K*X")).toMatch(/Did you mean k\?/);
    expect(err1("k*X*(1-x_tau)")).toMatch(/Did you mean X_tau\?/);
    expect(err1("k*X*(1-Xtau)")).toMatch(/Did you mean X_tau\?/);
  });
  it("rejects '=' and X'", () => {
    expect(err1("X' = k*X")).toMatch(/right-hand side/);
    expect(err1("dX/dt = k*X")).toMatch(/right-hand side/);
  });
  it("substitute option gives the equilibrium form of a delay equation", () => {
    const v = eval1("k*X*(1-X_tau)", 2, { k: 3 }, ["k"], { substitute: { X_tau: "X" } });
    expect(v).toBe(-6);
  });
  it("DynamicalSystem1D integrates logistic growth", () => {
    const sys = new DynamicalSystem1D("k*X*(1-X)", ["k"]);
    const series = sys.generateTimeSeries(0.1, { k: 1 }, 2, 0.01);
    const last = series[series.length - 1];
    expect(last.t).toBeCloseTo(2, 12);
    const exact = 1 / (1 + 9 * Math.exp(-2));
    expect(last.x).toBeCloseTo(exact, 8);
    expect(sys.eulerStep(0.5, { k: 1 }, 0.1)).toBeCloseTo(0.525, 12);
  });
});
