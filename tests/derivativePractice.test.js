import { describe, it, expect } from "vitest";
import { create, all } from "mathjs/number";
import {
  makeProblem,
  checkAnswer,
  parseAnswer,
  KINDS,
  DEFAULT_OPTIONS,
} from "../src/tools/derivativePracticeMath.js";

const math = create(all);

// Small seeded generator so failures are reproducible
const mulberry32 = (seed) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const ALL_ON = {
  kinds: { linear: true, power: true, exponential: true, trig: true },
  scaling: true,
  shifting: true,
  params: true,
};

// Every combination of kinds (non-empty) and variants
const allOptionSets = () => {
  const sets = [];
  for (let k = 1; k < 16; k++) {
    for (let v = 0; v < 8; v++) {
      const kinds = {};
      KINDS.forEach((name, i) => (kinds[name] = Boolean(k & (1 << i))));
      sets.push({ kinds, scaling: Boolean(v & 1), shifting: Boolean(v & 2), params: Boolean(v & 4) });
    }
  }
  return sets;
};

const numericDerivative = (fJs, scope) => {
  const f = math.parse(fJs).compile();
  const h = 1e-5;
  const at = (t) => f.evaluate({ ...scope, t });
  return (at(scope.t + h) - at(scope.t - h)) / (2 * h);
};

describe("derivative practice: generated problems", () => {
  it("every answer matches a numerical derivative of the function", () => {
    const rng = mulberry32(1);
    for (const options of allOptionSets()) {
      for (let i = 0; i < 25; i++) {
        const p = makeProblem(options, rng);
        const answer = math.parse(p.answerJs).compile();
        for (const scope of p.samples) {
          const exact = answer.evaluate({ ...scope });
          const approx = numericDerivative(p.functionJs, scope);
          expect(Number.isFinite(exact)).toBe(true);
          expect(Math.abs(exact - approx)).toBeLessThan(1e-5 * Math.max(1, Math.abs(exact)));
        }
      }
    }
  });

  it("respects the selected kinds and variants", () => {
    const rng = mulberry32(2);
    for (const options of allOptionSets()) {
      for (let i = 0; i < 20; i++) {
        const p = makeProblem(options, rng);
        expect(options.kinds[p.kind]).toBe(true);
        const hasShift = p.fTerms.some((t) => t.b.type === "one");
        if (!options.shifting) expect(hasShift).toBe(false);
        else expect(hasShift).toBe(true);
        const main = p.fTerms.find((t) => t.b.type !== "one");
        if (!options.scaling) expect(main.c).toEqual({ r: { p: 1, q: 1 }, syms: [] });
        if (!options.params) expect(p.params).toEqual([]);
        // no constant is named like the function letter
        p.params.forEach((q) => expect(q.name).not.toBe(p.dep.toLowerCase()));
        // independent variable is always t; constants are distinct lowercase letters
        const names = p.params.map((q) => q.name);
        expect(new Set(names).size).toBe(names.length);
        names.forEach((n) => expect(n).toMatch(/^[a-z]$/));
        expect(names).not.toContain("t");
        expect(names).not.toContain("e");
      }
    }
  });

  it("the typed form of the answer is accepted, and the function itself is not", () => {
    const rng = mulberry32(3);
    for (let i = 0; i < 2000; i++) {
      const p = makeProblem(ALL_ON, rng);
      expect(checkAnswer(p, p.answerPlain).status).toBe("correct");
      // Only e^t (no shift) is its own derivative
      const selfDerivative = p.kind === "exponential" && p.fTerms.length === 1 && p.fTerms[0].b.base.type === "e";
      if (!selfDerivative) expect(checkAnswer(p, p.functionPlain).status).toBe("incorrect");
    }
  });

  it("produces balanced MathML", () => {
    const rng = mulberry32(4);
    const balanced = (s) => {
      const stack = [];
      for (const [tag, close, name] of s.matchAll(/<(\/?)([a-z]+)[^>]*>/g)) {
        if (tag.endsWith("/>")) continue; // self-closing, e.g. <mspace/>
        if (close) {
          if (stack.pop() !== name) return false;
        } else stack.push(name);
      }
      return stack.length === 0;
    };
    for (let i = 0; i < 500; i++) {
      const p = makeProblem(ALL_ON, rng);
      const pieces = [
        p.answerML,
        ...[...p.question, ...p.note, ...p.steps.flatMap((s) => s.segs)]
          .filter((x) => typeof x === "object")
          .map((x) => x.ml),
      ];
      pieces.forEach((ml) => expect(balanced(ml)).toBe(true));
      expect(p.steps.length).toBeGreaterThan(0);
    }
  });

  it("uses the default options when called without arguments", () => {
    const p = makeProblem();
    expect(DEFAULT_OPTIONS.kinds[p.kind]).toBe(true);
  });
});

// A fixed problem: P = 2t^2 + 1
const fixed = (kind, options) => {
  const rng = mulberry32(99);
  for (let i = 0; i < 5000; i++) {
    const p = makeProblem(options, rng);
    if (kind(p)) return p;
  }
  throw new Error("no matching problem");
};

describe("derivative practice: reading typed answers", () => {
  const p = fixed(
    (q) => q.functionPlain === "2*t^2 + 1",
    { kinds: { power: true }, scaling: true, shifting: true, params: false },
  );

  it.each([
    ["4t"],
    ["4*t"],
    ["4 t"],
    ["2*2t"],
    ["dP/dt = 4t"],
    [`d${p.dep}/dt=4t`],
    ["4·t"],
    ["(4)(t)"],
  ])("accepts %s", (input) => {
    expect(checkAnswer(p, input).status).toBe("correct");
  });

  it("explains common mistakes", () => {
    expect(checkAnswer(p, "4t + 1").message).toMatch(/vertical shift/);
    expect(checkAnswer(p, "2t").message).toMatch(/vertical scaling/);
    expect(checkAnswer(p, "-4t").message).toMatch(/sign/);
    expect(checkAnswer(p, "2t^2+1").message).toMatch(/original function/);
    expect(checkAnswer(p, "4t^2").message).toMatch(/lower the exponent/);
    expect(checkAnswer(p, "5t").status).toBe("incorrect");
  });

  it("gives readable errors", () => {
    expect(checkAnswer(p, "").status).toBe("error");
    expect(checkAnswer(p, "4T").message).toMatch(/lowercase t/);
    expect(checkAnswer(p, `4${p.dep}`).message).toMatch(/in terms of t/);
    expect(checkAnswer(p, "4x").message).toMatch(/constant called x/);
    expect(checkAnswer(p, "4t)").status).toBe("error");
    expect(checkAnswer(p, "4t$").status).toBe("error");
  });

  it("shows how it read the answer", () => {
    expect(parseAnswer("4t - 1", p).readAs).toBe("4·t − 1");
    expect(parseAnswer("ln2 2^t", p).readAs).toBe("ln(2)·2^t");
  });
});

describe("derivative practice: other rules", () => {
  it("handles functions written without parentheses, roots, pi and constants", () => {
    const sin = fixed((q) => q.functionPlain === "sin(t)", { kinds: { trig: true }, scaling: false, shifting: false, params: false });
    expect(checkAnswer(sin, "cos t").status).toBe("correct");
    expect(checkAnswer(sin, "cost").status).toBe("correct");
    expect(checkAnswer(sin, "-cos(t)").message).toMatch(/no minus sign/);

    const cos = fixed((q) => q.functionPlain === "cos(t)", { kinds: { trig: true }, scaling: false, shifting: false, params: false });
    expect(checkAnswer(cos, "-sin t").status).toBe("correct");
    expect(checkAnswer(cos, "sin(t)").message).toMatch(/−sin/);

    const root = fixed((q) => q.functionPlain === "t^(1/2)", { kinds: { power: true }, scaling: false, shifting: false, params: false });
    expect(checkAnswer(root, "1/(2sqrt(t))").status).toBe("correct");
    expect(checkAnswer(root, "1/(2√t)").status).toBe("correct");
    expect(checkAnswer(root, "0.5t^(-1/2)").status).toBe("correct");

    const two = fixed((q) => q.functionPlain === "2^t", { kinds: { exponential: true }, scaling: false, shifting: false, params: false });
    expect(checkAnswer(two, "ln(2)*2^t").status).toBe("correct");
    expect(checkAnswer(two, "log(2) 2^t").status).toBe("correct");
    expect(checkAnswer(two, "0.693*2^t").status).toBe("close");
    expect(checkAnswer(two, "2^t").message).toMatch(/ln\(b\)/);
    expect(checkAnswer(two, "t*2^(t-1)").message).toMatch(/power rule doesn't apply/);

    const kt = fixed((q) => q.functionPlain === "k*t^3", { kinds: { power: true }, scaling: true, shifting: false, params: true });
    expect(checkAnswer(kt, "3kt^2").status).toBe("correct");
    expect(checkAnswer(kt, "3 t^2 k").status).toBe("correct");

    const pi = fixed((q) => /^pi\*t\^2$/.test(q.functionPlain), { kinds: { power: true }, scaling: true, shifting: false, params: true });
    expect(checkAnswer(pi, "2πt").status).toBe("correct");
    expect(checkAnswer(pi, "2pit").status).toBe("correct");
  });

  it("spots a missing exponent parenthesis, leading-dot decimals, and tan", () => {
    const tn = fixed((q) => q.functionPlain === "t^n", { kinds: { power: true }, scaling: false, shifting: false, params: true });
    expect(checkAnswer(tn, "n t^(n-1)").status).toBe("correct");
    expect(checkAnswer(tn, "n t^n-1").message).toMatch(/parentheses around the whole exponent/);
    expect(checkAnswer(tn, "n t^n+1").message).not.toMatch(/parentheses/);

    const two = fixed((q) => q.functionPlain === "2^t", { kinds: { exponential: true }, scaling: false, shifting: false, params: false });
    expect(checkAnswer(two, ".693*2^t").status).toBe("close");

    const neg = fixed((q) => q.functionPlain === "t^(-1/2)", { kinds: { power: true }, scaling: false, shifting: false, params: false });
    expect(checkAnswer(neg, "-1/2 t^(-3/2)").status).toBe("correct");
    expect(checkAnswer(neg, "-1/2 t^-3/2").message).toMatch(/parentheses/);
    expect(parseAnswer("tan", neg).error).toBeDefined(); // t·a·n, and a, n aren't constants here
  });
});
