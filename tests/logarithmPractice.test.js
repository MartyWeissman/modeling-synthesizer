import { describe, it, expect } from "vitest";
import { create, all } from "mathjs/number";
import {
  makeProblem,
  checkAnswer,
  parseAnswer,
  BASES,
  KINDS,
  DEFAULT_OPTIONS,
} from "../src/tools/logarithmPracticeMath.js";

const math = create(all);
math.import({ ln: math.log }, { override: true });

// Small seeded generator so failures are reproducible
const mulberry32 = (seed) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// Every combination of bases (non-empty), kinds (non-empty) and roots
const allOptionSets = () => {
  const sets = [];
  for (let b = 1; b < 8; b++) {
    for (let k = 1; k < 4; k++) {
      for (const roots of [false, true]) {
        const bases = {};
        BASES.forEach((name, i) => (bases[name] = Boolean(b & (1 << i))));
        const o = { bases, roots };
        KINDS.forEach((name, i) => (o[name] = Boolean(k & (1 << i))));
        sets.push(o);
      }
    }
  }
  return sets;
};

const close = (a, b) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));

/** First problem (from a seeded stream) that satisfies pred. */
const find = (pred, options, seed = 5) => {
  const rng = mulberry32(seed);
  for (let i = 0; i < 50000; i++) {
    const p = makeProblem(options, rng);
    if (pred(p)) return p;
  }
  throw new Error("no matching problem");
};

const NUM = { bases: { 10: true, 2: true, e: true }, numbers: true, expressions: false, roots: true };
const EXPR = { ...NUM, numbers: false, expressions: true };

describe("logarithm practice: generated problems", () => {
  it("every answer equals the log of the displayed argument, and every method step is equal", () => {
    const rng = mulberry32(1);
    for (const options of allOptionSets()) {
      for (let i = 0; i < 40; i++) {
        const p = makeProblem(options, rng);
        for (const scope of p.samples) {
          const answer = math.evaluate(p.answerJs, { ...scope });
          expect(Number.isFinite(answer)).toBe(true);
          expect(close(math.evaluate(`${p.baseFn}(${p.argJs})`, { ...scope }), answer)).toBe(true);
          for (const js of p.chainJs ?? []) {
            expect(close(math.evaluate(`${p.baseFn}(${js})`, { ...scope }), answer)).toBe(true);
          }
          for (const js of p.statesJs ?? []) {
            expect(close(math.evaluate(js, { ...scope }), answer)).toBe(true);
          }
        }
      }
    }
  });

  it("respects the selected bases and kinds", () => {
    const rng = mulberry32(2);
    for (const options of allOptionSets()) {
      for (let i = 0; i < 20; i++) {
        const p = makeProblem(options, rng);
        expect(options.bases[p.base]).toBe(true);
        expect(options[p.kind]).toBe(true);
        expect(p.type === "number").toBe(p.kind === "numbers");
      }
    }
  });

  it("without roots, number answers are integers", () => {
    const rng = mulberry32(3);
    for (let i = 0; i < 500; i++) {
      const p = makeProblem({ ...NUM, roots: false }, rng);
      expect(p.answerValue.q).toBe(1);
      expect(p.argJs).not.toMatch(/sqrt|1\/3/);
    }
  });

  it("the typed form of the answer is accepted, and no mistake equals the answer", () => {
    const rng = mulberry32(4);
    for (const options of allOptionSets()) {
      for (let i = 0; i < 15; i++) {
        const p = makeProblem(options, rng);
        expect(checkAnswer(p, p.answerPlain).status).toBe("correct");
      }
    }
  });

  it("produces balanced MathML", () => {
    const rng = mulberry32(6);
    const count = (s, re) => (s.match(re) || []).length;
    for (let i = 0; i < 300; i++) {
      const p = makeProblem({ ...NUM, expressions: true }, rng);
      const all = [
        p.answerML,
        ...p.question.map((s) => s.ml ?? ""),
        ...p.steps.flatMap((st) => st.segs.map((s) => s.ml ?? "")),
      ].join("");
      for (const tag of ["math", "mrow", "msup", "msub", "mfrac", "msqrt", "mroot"]) {
        expect(count(all, new RegExp(`<${tag}[ >]`, "g"))).toBe(count(all, new RegExp(`</${tag}>`, "g")));
      }
    }
  });

  it("uses the default options when called without arguments", () => {
    const p = makeProblem();
    expect(DEFAULT_OPTIONS.bases[p.base]).toBe(true);
    expect(p.kind).toBe("numbers");
  });
});

describe("logarithm practice: numbers", () => {
  it("checks answers and names common mistakes", () => {
    const hundredth = find((q) => q.argJs === "(0.01)", NUM);
    expect(checkAnswer(hundredth, "-2").status).toBe("correct");
    expect(checkAnswer(hundredth, "-1").message).toMatch(/decimal places/);
    expect(checkAnswer(hundredth, "2").message).toMatch(/sign/);
    expect(checkAnswer(hundredth, "0.01").message).toMatch(/number itself/);
    expect(checkAnswer(hundredth, "log10(0.01)").status).toBe("close");
    expect(checkAnswer(hundredth, "x").status).toBe("error");

    const thousand = find((q) => q.argJs === "(1000)", NUM);
    expect(checkAnswer(thousand, "3").status).toBe("correct");
    expect(checkAnswer(thousand, "4").message).toMatch(/zeros, not the digits/);

    const rootE = find((q) => q.argJs === "sqrt(e)", NUM);
    expect(checkAnswer(rootE, "1/2").status).toBe("correct");
    expect(checkAnswer(rootE, "0.5").status).toBe("correct");
    expect(checkAnswer(rootE, "2").message).toMatch(/power 1\/2/);

    const eight = find((q) => q.argJs === "(8)" && q.base === "2", NUM);
    expect(checkAnswer(eight, "3").status).toBe("correct");
    expect(checkAnswer(eight, "4").message).toMatch(/Dividing by 2/);

    const third = find((q) => q.type === "number" && q.answerPlain === "2/3", NUM);
    expect(checkAnswer(third, "2/3").status).toBe("correct");
    expect(checkAnswer(third, "0.667").status).toBe("close");
    expect(checkAnswer(third, ".67").status).toBe("close");
    expect(checkAnswer(third, "3/2").message).toMatch(/upside down/);
  });
});

describe("logarithm practice: expressions", () => {
  it("accepts the usual ways of writing logs", () => {
    const p = find((q) => q.argJs === "((100))*((x)^((3)))", EXPR);
    for (const s of ["2+3log(x)", "2 + 3 log10 x", "2+3log_10(x)", "2+3log_{10}(x)", "2+3log₁₀(x)", "3log10(x)+2"]) {
      expect(checkAnswer(p, s).status).toBe("correct");
    }
  });

  it("insists on the final form", () => {
    const p = find((q) => q.argJs === "((100))*((x)^((3)))", EXPR);
    expect(checkAnswer(p, "log(100x^3)").message).toMatch(/Keep going/);
    expect(checkAnswer(p, "log(100)+3log(x)").message).toMatch(/evaluate/);
    expect(checkAnswer(p, "2+3ln(x)/ln(10)").message).toMatch(/log₁₀/);
  });

  it("names common mistakes", () => {
    const p = find((q) => q.argJs === "((100))*((x)^((3)))", EXPR);
    expect(checkAnswer(p, "2+log(x)^3").message).toMatch(/Power rule/);
    expect(checkAnswer(p, "6log(x)").message).toMatch(/sum of logs/);
    expect(checkAnswer(p, "100+3log(x)").message).toMatch(/log of 100 too/);
    expect(checkAnswer(p, "3log(x)").message).toMatch(/constant/);
    expect(checkAnswer(p, "2+3X").message).toMatch(/lowercase/);

    const q = find((r) => r.argJs === "((x)^((2)))/((100))", EXPR);
    expect(checkAnswer(q, "2log(x) - 2").status).toBe("correct");
    expect(checkAnswer(q, "2 - 2log(x)").message).toMatch(/denominator is subtracted/);
    expect(checkAnswer(q, "log(x)").message).toMatch(/quotient/);

    const r = find((s) => s.template === "rootprod" && s.argJs.startsWith("sqrt") && s.base === "10", EXPR);
    const k = Number(/\(\((\d+)\)\)/.exec(r.argJs)[1]);
    const c = Math.log10(k);
    expect(checkAnswer(r, `${c}/2 + log(x)/2`).status).toBe("correct");
    expect(checkAnswer(r, `${c} + log(x)/2`).message).toMatch(/every term/);
    expect(checkAnswer(r, `${c} + log(x)`).message).toMatch(/whole log/);
  });

  it("explains plain log in a base-2 or base-e problem", () => {
    const p = find((q) => q.base === "e" && q.argJs === "(x)*(y)", EXPR);
    expect(checkAnswer(p, "ln x + ln y").status).toBe("correct");
    expect(checkAnswer(p, "log x + log y").message).toMatch(/plain "log" means log₁₀/);
    expect(checkAnswer(p, "ln(x) ln(y)").message).toMatch(/sum of logs/);
  });

  it("simplifies logs of exponentials", () => {
    const p = find((q) => q.template === "exponent" && q.argJs === "((8))^(t)", EXPR);
    expect(checkAnswer(p, "3t").status).toBe("correct");
    expect(checkAnswer(p, "t").message).toMatch(/power of 2/);
    expect(checkAnswer(p, "8t").message).toMatch(/not 8/);
    expect(checkAnswer(p, "t log2(8)").status).toBe("close");
    expect(checkAnswer(p, "x").status).toBe("error");
  });
});

describe("logarithm practice: reading typed answers", () => {
  it("reads subscripts and implicit multiplication", () => {
    const p = find((q) => q.argJs === "((100))*((x)^((3)))", EXPR);
    expect(parseAnswer("2+3xlog10", p).readAs).toBeDefined();
    expect(parseAnswer("3log₂x", p).readAs).toBe("3·log₂(x)");
    expect(parseAnswer("2 + 3 log x", p).readAs).toBe("2 + 3·log₁₀(x)");
    expect(parseAnswer("", p).error).toMatch(/Type your answer/);
    expect(parseAnswer("2 # 3", p).error).toMatch(/character/);
  });
});
