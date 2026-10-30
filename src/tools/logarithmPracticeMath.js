// src/tools/logarithmPracticeMath.js
// Random problems for the Logarithm Practice study aide.
//
// Two kinds of problems, in base 10, base 2 or base e:
//   - Numbers: evaluate log_b(y) where y is a power of b in disguise
//     (1000, 0.01, 1/8, √e, 4√2, 8^(2/3), ...). The answer is a rational
//     number r, found by rewriting y as b^r.
//   - Expressions: expand log_b(100x³), log_2(x/8), ln(√(e x)), log(xy), ...
//     in terms of log_b(x) (and log_b(y)), or simplify log_b(8^t) etc.
//     Uses the product, quotient and power rules and log_b(b^k) = k.
//
// Every displayed expression is built as a pair {ml, js}: MathML for display
// and a math.js string, so the tests can check that each displayed step
// really equals the next. Pure JS (no React), tested in
// tests/logarithmPractice.test.js.

import { create, all } from "mathjs/number";

const math = create(all);
// `ln` is the natural logarithm (math.js calls it `log`).
math.import({ ln: math.log }, { override: true });

// ---------------------------------------------------------------------------
// Rationals
// ---------------------------------------------------------------------------

const gcd = (a, b) => {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a || 1;
};
export const rat = (p, q = 1) => {
  if (q < 0) {
    p = -p;
    q = -q;
  }
  const g = gcd(p, q);
  return { p: p / g, q: q / g };
};
const rmul = (a, b) => rat(a.p * b.p, a.q * b.q);
const radd = (a, b) => rat(a.p * b.q + b.p * a.q, a.q * b.q);
const rneg = (a) => rat(-a.p, a.q);
const rabs = (a) => rat(Math.abs(a.p), a.q);
const rval = (a) => a.p / a.q;
const rIsInt = (a) => a.q === 1;
const rEq = (a, b) => a.p === b.p && a.q === b.q;
const R0 = rat(0);
const R1 = rat(1);
const ratJs = (r) => (r.q === 1 ? `(${r.p})` : `(${r.p}/${r.q})`);
const ratPlain = (r) => (r.q === 1 ? `${r.p}` : `${r.p}/${r.q}`);

// ---------------------------------------------------------------------------
// MathML
// ---------------------------------------------------------------------------

const MINUS = "&#x2212;";
const DOT = "&#x22C5;";
const APPLY = "&#x2061;";
const mi = (s, variant) =>
  `<mi${variant ? ` mathvariant="${variant}"` : ""}>${s}</mi>`;
const mn = (s) => `<mn>${s}</mn>`;
const mo = (s) => `<mo>${s}</mo>`;
const mrow = (...xs) => `<mrow>${xs.join("")}</mrow>`;
const msup = (b, e) => `<msup>${b}${e}</msup>`;
const msub = (b, s) => `<msub>${b}${s}</msub>`;
const mfrac = (a, b) => `<mfrac>${a}${b}</mfrac>`;
const msqrt = (x) => `<msqrt>${x}</msqrt>`;
const mroot = (x, n) => `<mroot>${x}${n}</mroot>`;
const fence = (c) => `<mo fence="true" lspace="0" rspace="0">${c}</mo>`;
const parenML = (x) => mrow(fence("("), x, fence(")"));
const THIN = `<mspace width="0.17em"/>`;

/** Wrap MathML content in a <math> element. */
export const wrapMath = (x) =>
  `<math xmlns="http://www.w3.org/1998/Math/MathML">${x}</math>`;

const ratAbsML = (r) =>
  r.q === 1 ? mn(Math.abs(r.p)) : mfrac(mn(Math.abs(r.p)), mn(r.q));
const signedRatML = (r) =>
  r.p < 0 ? mrow(mo(MINUS), ratAbsML(r)) : ratAbsML(r);
// In exponents, stacked fractions get tiny: write 3/2 on one line.
const inlineRatML = (r) => {
  const abs = r.q === 1 ? mn(Math.abs(r.p)) : mrow(mn(Math.abs(r.p)), mo("/"), mn(r.q));
  return r.p < 0 ? mrow(mo(MINUS), abs) : abs;
};

// ---------------------------------------------------------------------------
// Dual expressions {ml, js}
// ---------------------------------------------------------------------------

const fmtInt = (v) => (Math.abs(v) >= 10000 ? v.toLocaleString("en-US") : String(v));
const D = {
  int: (v) => ({ ml: mn(fmtInt(v)), js: `(${v})`, atom: true }),
  dec: (s) => ({ ml: mn(s), js: `(${s})`, atom: true }),
  rat: (r) => ({ ml: signedRatML(r), js: ratJs(r), atom: r.q === 1 && r.p >= 0 }),
  /** A rational for an exponent (one-line fraction). */
  erat: (r) => ({ ml: inlineRatML(r), js: ratJs(r), atom: r.q === 1 && r.p >= 0 }),
  sym: (name) => ({ ml: mi(name), js: name, atom: true }),
  e: () => ({ ml: mi("e"), js: "e", atom: true }),
  paren: (a) => ({ ml: parenML(a.ml), js: `(${a.js})`, atom: true }),
  /** a^b; the base gets parentheses unless it is a plain symbol or number. */
  pow: (a, b) => ({
    ml: msup(a.atom ? a.ml : parenML(a.ml), b.ml),
    js: `(${a.js})^(${b.js})`,
  }),
  /** Product: juxtaposed, or with a centered dot. */
  mul: (xs, dot = false) => ({
    ml: mrow(...xs.flatMap((x, i) => (i && dot ? [mo(DOT), x.ml] : [x.ml]))),
    js: xs.map((x) => `(${x.js})`).join("*"),
  }),
  frac: (a, b) => ({ ml: mfrac(a.ml, b.ml), js: `(${a.js})/(${b.js})`, atom: true }),
  sqrt: (a) => ({ ml: msqrt(a.ml), js: `sqrt(${a.js})`, atom: true }),
  root: (a, n) =>
    n === 2
      ? D.sqrt(a)
      : { ml: mroot(a.ml, mn(n)), js: `(${a.js})^(1/${n})`, atom: true },
  add: (a, b, minus = false) => ({
    ml: mrow(a.ml, mo(minus ? MINUS : "+"), b.ml),
    js: `(${a.js})${minus ? "-" : "+"}(${b.js})`,
  }),
};

// ---------------------------------------------------------------------------
// Bases
// ---------------------------------------------------------------------------

export const BASES = ["10", "2", "e"];
const SUB = { 10: "₁₀", 2: "₂" };
const SUP_DIGITS = "⁰¹²³⁴⁵⁶⁷⁸⁹";
const sup = (n) =>
  (n < 0 ? "⁻" : "") +
  String(Math.abs(n))
    .split("")
    .map((d) => SUP_DIGITS[d])
    .join("");

const BASE_INFO = {
  10: {
    key: "10",
    b: 10,
    fn: "log10",
    text: "log₁₀",
    logML: msub(mi("log"), mn(10)),
    dual: () => D.int(10),
    name: "base 10",
  },
  2: {
    key: "2",
    b: 2,
    fn: "log2",
    text: "log₂",
    logML: msub(mi("log"), mn(2)),
    dual: () => D.int(2),
    name: "base 2",
  },
  e: {
    key: "e",
    b: Math.E,
    fn: "ln",
    text: "ln",
    logML: mi("ln"),
    dual: () => D.e(),
    name: "base e",
  },
};

const logML = (base, argML) => mrow(base.logML, mo(APPLY), parenML(argML));
/** b^r with the exponent always shown. */
const bpowShown = (base, r) => D.pow(base.dual(), D.erat(r));
/** b^r, written as just b when r = 1. */
const bpow = (base, r) => (rEq(r, R1) ? base.dual() : bpowShown(base, r));
/** b^k as a plain number (base 2 and 10) or e^k. */
const baseNumber = (base, k) =>
  base.key === "e" ? bpow(base, rat(k)) : D.int(base.b ** k);
const baseNumberText = (base, k) =>
  base.key === "e" ? (k === 1 ? "e" : `e${sup(k)}`) : fmtInt(base.b ** k);

// ---------------------------------------------------------------------------
// Random helpers
// ---------------------------------------------------------------------------

const pick = (arr, rng) => arr[Math.floor(rng() * arr.length)];
const weighted = (pairs, rng) => {
  const live = pairs.filter(([, w]) => w > 0);
  const total = live.reduce((s, [, w]) => s + w, 0);
  let u = rng() * total;
  for (const [v, w] of live) {
    if ((u -= w) < 0) return v;
  }
  return live[live.length - 1][0];
};

const ml = (x) => ({ ml: wrapMath(x) });
const eqML = (...xs) => mrow(...xs.flatMap((x, i) => (i ? [mo("="), x] : [x])));

export const KINDS = ["numbers", "expressions"];
export const DEFAULT_OPTIONS = {
  bases: { 10: true, 2: true, e: false },
  numbers: true,
  expressions: false,
  roots: true,
};

// ---------------------------------------------------------------------------
// Number problems: log_b(y) where y = b^r
// ---------------------------------------------------------------------------

const INT_RANGE = { 10: [-4, 6], 2: [-5, 10], e: [-3, 4] };
const randInt = ([lo, hi], rng) => lo + Math.floor(rng() * (hi - lo + 1));

/**
 * One way of writing b^r. Returns {arg, r, chain, hints, mistakes}, where
 * chain is a list of equal expressions from arg to b^r.
 */
const numberForm = (base, roots, rng) => {
  const b = base.b;
  const cat = weighted(
    [
      ["plain", roots ? 0.35 : 0.8],
      ["powpow", roots ? 0.15 : 0.2],
      ["root", roots ? 0.3 : 0],
      ["mixed", roots ? 0.15 : 0],
      ["rootdec", roots && base.key === "10" ? 0.05 : 0],
    ],
    rng,
  );
  const hints = [];
  const mistakes = [];
  const R = (x, q) => D.root(x, q);
  const rootWord = (q) => (q === 2 ? "square root" : "cube root");

  if (cat === "plain") {
    const k = randInt(INT_RANGE[base.key], rng);
    const r = rat(k);
    let arg;
    let chain;
    if (base.key === "e") {
      if (k > 0) {
        arg = bpow(base, r);
        chain = k === 1 ? [arg, bpowShown(base, r)] : [arg];
      } else if (k === 0) {
        arg = D.int(1);
        chain = [arg, bpowShown(base, r)];
      } else if (rng() < 0.6) {
        arg = D.frac(D.int(1), bpow(base, rat(-k)));
        chain = [arg, bpowShown(base, r)];
      } else {
        arg = bpowShown(base, r);
        chain = [arg];
      }
    } else if (k >= 0) {
      arg = D.int(b ** k);
      chain = [arg];
      if (base.key === "2" && k >= 2 && k <= 5)
        chain.push(D.mul(Array.from({ length: k }, () => D.int(2)), true));
      chain.push(bpowShown(base, r));
    } else {
      const m = -k;
      const decimals = { 10: "0." + "0".repeat(m - 1) + "1", 2: ["", "0.5", "0.25", "0.125"][m] };
      const useDec =
        (base.key === "10" && rng() < 0.6) || (base.key === "2" && m <= 3 && rng() < 0.4);
      const frac = D.frac(D.int(1), D.int(b ** m));
      if (useDec) {
        arg = D.dec(decimals[base.key]);
        chain = [arg, frac, D.frac(D.int(1), bpowShown(base, rat(m))), bpowShown(base, r)];
      } else {
        arg = frac;
        chain = [arg, D.frac(D.int(1), bpowShown(base, rat(m))), bpowShown(base, r)];
      }
      hints.push("Use 1/bⁿ = b⁻ⁿ.");
      if (useDec && base.key === "10" && m >= 2) {
        mistakes.push({
          value: rat(-(m - 1)),
          message: `Count decimal places, not zeros: ${decimals[10]} = 1/${fmtInt(10 ** m)} = 10${sup(-m)}.`,
        });
      }
    }
    if (k === 0) hints.push("Any positive number to the power 0 is 1.");
    if (base.key === "10" && k >= 1) {
      mistakes.push({
        value: rat(k + 1),
        message: `Count the zeros, not the digits: ${fmtInt(10 ** k)} = 10${sup(k)}.`,
      });
    }
    if (base.key === "2" && k >= 3) {
      mistakes.push({
        value: rat(2 ** (k - 1)),
        message: `Dividing by 2 isn't the same as taking log₂. Count how many 2s multiply to give ${fmtInt(2 ** k)}.`,
      });
    }
    if (k !== 0 && k !== 1) {
      mistakes.push({
        js: base.key === "e" ? `e^(${k})` : `(${b ** k})`,
        message: `That's the number itself. The logarithm is the exponent: the power of ${base.key} that gives this number.`,
      });
    }
    return { arg, r, chain, hints, mistakes };
  }

  if (cat === "powpow") {
    const c = base.key === "2" ? pick([2, 3, 4], rng) : pick([2, 3], rng);
    const sChoices = roots
      ? [[2], [3], [-1], [-2], [1, 2], [3, 2], [-1, 2], [2, 3], [1, 3], [-2, 3], ...(c === 4 ? [[3, 4], [1, 4]] : [])]
      : [[2], [3], [-1], [-2]];
    const s = rat(...pick(sChoices, rng));
    const r = rmul(rat(c), s);
    let arg;
    let chain;
    if (base.key === "e") {
      const inner = bpowShown(base, rat(c));
      arg = D.pow(inner, D.erat(s));
      chain = [arg, D.pow(base.dual(), D.mul([D.int(c), s.q === 1 && s.p > 0 ? D.erat(s) : D.paren(D.erat(s))], true)), bpowShown(base, r)];
      mistakes.push({
        value: s,
        message: `Don't forget the inner exponent: (e${sup(c)})ⁿ = e${sup(c)}ⁿ.`,
      });
    } else {
      const inner = D.int(b ** c);
      arg = D.pow(inner, D.erat(s));
      chain = [
        arg,
        D.pow(bpowShown(base, rat(c)), D.erat(s)),
        D.pow(base.dual(), D.mul([D.int(c), s.q === 1 && s.p > 0 ? D.erat(s) : D.paren(D.erat(s))], true)),
        bpowShown(base, r),
      ];
      mistakes.push({
        value: s,
        message: `First write ${fmtInt(b ** c)} as a power of ${b}: ${fmtInt(b ** c)} = ${b}${sup(c)}.`,
      });
    }
    hints.push("A power of a power multiplies the exponents: (aᵐ)ⁿ = aᵐⁿ.");
    mistakes.push({
      value: radd(rat(c), s),
      message: "A power of a power multiplies the exponents: (aᵐ)ⁿ = aᵐⁿ. Don't add them.",
    });
    return { arg, r, chain, hints, mistakes };
  }

  if (cat === "root" || cat === "rootdec") {
    const q = pick([2, 2, 3], rng);
    let p;
    let arg;
    let chain;
    if (cat === "rootdec") {
      p = -pick(q === 2 ? [1, 3] : [1, 2], rng);
      const m = -p;
      const dec = D.dec("0." + "0".repeat(m - 1) + "1");
      const inner = bpowShown(base, rat(p));
      arg = R(dec, q);
      chain = [arg, R(inner, q), D.pow(inner, D.erat(rat(1, q))), bpowShown(base, rat(p, q))];
    } else {
      const ranges = { 10: [-3, 4], 2: [-5, 7], e: [-3, 3] };
      do p = randInt(ranges[base.key], rng);
      while (p === 0 || p % q === 0);
      const m = Math.abs(p);
      const innerPow = bpow(base, rat(m));
      const innerNum = base.key === "e" || m === 1 ? innerPow : D.int(b ** m);
      const top = (x) => (p > 0 ? x : D.frac(D.int(1), x));
      arg = top(R(innerNum, q));
      chain = [arg];
      if (innerNum !== innerPow) chain.push(top(R(innerPow, q)));
      // (b^m)^(1/q); for m = 1 this is just b^(1/q), shown next
      if (m > 1) chain.push(top(D.pow(innerPow, D.erat(rat(1, q)))));
      if (p < 0) chain.push(D.frac(D.int(1), bpowShown(base, rat(m, q))));
      chain.push(bpowShown(base, rat(p, q)));
      if (p < 0) hints.push("Use 1/bⁿ = b⁻ⁿ.");
    }
    const r = rat(p, q);
    hints.unshift(`A ${rootWord(q)} is the power 1/${q}.`);
    mistakes.push(
      {
        value: rat(p * q),
        message: `A ${rootWord(q)} is the power 1/${q}: divide by ${q}, don't multiply.`,
      },
      {
        value: rat(p),
        message: `Don't forget the ${rootWord(q)}: it is the power 1/${q}.`,
      },
    );
    return { arg, r, chain, hints, mistakes };
  }

  // mixed: b^k √b, or 1/(b^k √b)
  const k = pick(base.key === "2" ? [1, 2, 3] : [1, 2], rng);
  const neg = rng() < 0.3;
  const top = (x) => (neg ? D.frac(D.int(1), x) : x);
  const half = D.erat(rat(1, 2));
  const prod = D.mul([baseNumber(base, k), D.sqrt(base.dual())]);
  const sumR = rat(2 * k + 1, 2);
  const arg = top(prod);
  const chain = [
    arg,
    top(D.mul([bpowShown(base, rat(k)), D.pow(base.dual(), half)], true)),
    top(D.pow(base.dual(), D.add(D.int(k), half))),
    top(bpowShown(base, sumR)),
  ];
  if (neg) chain.push(bpowShown(base, rneg(sumR)));
  hints.push("√b is the power 1/2, and multiplying powers of the same base adds the exponents.");
  if (neg) hints.push("Then use 1/bⁿ = b⁻ⁿ.");
  const sgn = neg ? -1 : 1;
  mistakes.push(
    {
      value: rat(sgn * k),
      message: "Don't forget the square root: √b = b^(1/2) adds 1/2 to the exponent.",
    },
    {
      value: rat(sgn * k, 2),
      message: "When you multiply powers of the same base, add the exponents (don't multiply them).",
    },
  );
  return { arg, r: rat(sgn * (2 * k + 1), 2), chain, hints, mistakes };
};

const numberProblem = (base, options, rng) => {
  const { arg, r, chain, hints, mistakes } = numberForm(base, options.roots, rng);
  const logArg = logML(base, arg.ml);
  const question = ["What is ", ml(logArg), "?"];

  // Answer, with a decimal for fractions
  const parts = [logArg, signedRatML(r)];
  let answerML = eqML(...parts);
  if (!rIsInt(r)) {
    const v = rval(r);
    const exact = r.q === 2 || r.q === 4;
    answerML = mrow(answerML, mo(exact ? "=" : "&#x2248;"), mn((v < 0 ? "−" : "") + (exact ? Math.abs(v) : Math.abs(v).toFixed(3))));
  }

  const steps = [];
  const b = base.key;
  if (chain.length > 1) {
    steps.push({
      label: `Write it as a power of ${b}`,
      segs: [ml(eqML(...chain.map((c) => c.ml))), ...(hints.length ? [" (" + hints.join(" ") + ")"] : [])],
    });
  } else {
    steps.push({
      label: "Power of e",
      segs: ["It is already a power of e: ", ml(chain[0].ml), "."],
    });
  }
  const top = bpowShown(base, r);
  steps.push({
    label: "Take the logarithm",
    segs: [
      base.key === "e"
        ? "ln is the logarithm base e. ln(y) is the power of e that gives y, so "
        : `${base.text}(y) is the power of ${b} that gives y, so `,
      ml(eqML(logML(base, top.ml), signedRatML(r))),
      ".",
    ],
  });
  steps.push({ label: "Answer", segs: ["So ", ml(eqML(logArg, signedRatML(r))), "."] });

  const sign = rneg(r);
  const allMistakes = [
    {
      js: ratJs(sign),
      message:
        rval(r) < 0
          ? "Check the sign: numbers between 0 and 1 have negative logarithms."
          : "Check the sign: numbers bigger than 1 have positive logarithms.",
    },
    ...mistakes.map((m) => ({ js: m.js ?? ratJs(m.value), message: m.message })),
  ];
  if (Math.abs(r.p) >= 2 || r.q > 1) {
    allMistakes.push({
      js: ratJs(rat(r.q, r.p)),
      message: `That's upside down: the answer is the exponent r in ${b}ʳ, not 1/r.`,
    });
  }

  return {
    type: "number",
    base: base.key,
    vars: [],
    question,
    note: [],
    argJs: arg.js,
    chainJs: chain.map((c) => c.js),
    answerJs: ratJs(r),
    answerPlain: ratPlain(r),
    answerValue: r,
    answerML: wrapMath(answerML),
    steps,
    mistakes: allMistakes,
    samples: [{}],
  };
};

// ---------------------------------------------------------------------------
// Expression problems
// ---------------------------------------------------------------------------

// Argument structure: { q (root index: 1, 2 or 3), num: [factors], den: [factors] }
// factor: { type: "base", k } (b^k, k > 0 integer) | { type: "var", name, m } (m > 0 integer)
const baseF = (k) => ({ type: "base", k });
const varF = (name, m = 1) => ({ type: "var", name, m });

const factorDual = (base, f) =>
  f.type === "base"
    ? baseNumber(base, f.k)
    : f.m === 1
      ? D.sym(f.name)
      : D.pow(D.sym(f.name), D.int(f.m));
const productDual = (base, fs) => {
  if (!fs.length) return D.int(1);
  const parts = fs.map((f) => factorDual(base, f));
  if (parts.length === 1) return parts[0];
  // A dot between a number and e^k, or between two numbers
  const out = { ...D.mul(parts), atom: false };
  return out;
};
const quotientDual = (base, num, den) =>
  den.length ? D.frac(productDual(base, num), productDual(base, den)) : productDual(base, num);
const argDual = (base, a) => {
  const inner = quotientDual(base, a.num, a.den);
  return a.q > 1 ? D.root(inner, a.q) : inner;
};

/** Signed list of log-items, rendered as a sum; pre multiplies the whole sum. */
const itemML = (base, it) => {
  switch (it.kind) {
    case "log":
      return logML(base, it.ml);
    case "coeflog":
      return mrow(ratAbsML(it.m), THIN, logML(base, mi(it.name)));
    default:
      return ratAbsML(it.v);
  }
};
const sumML = (base, items) =>
  items.length
    ? mrow(
        ...items.flatMap((it, i) => {
          const body = itemML(base, it);
          if (i === 0) return it.sign < 0 ? [mrow(mo(MINUS), body)] : [body];
          return [mo(it.sign < 0 ? MINUS : "+"), body];
        }),
      )
    : mn(0);
const stateML = (base, pre, items) => {
  const s = sumML(base, items);
  if (rEq(pre, R1)) return s;
  return mrow(ratAbsML(pre), items.length > 1 ? parenML(s) : mrow(THIN, s));
};
const itemJs = (base, it) => {
  const v = it.kind === "log" ? `${base.fn}(${it.js})` : it.kind === "coeflog" ? `${ratJs(it.m)}*${base.fn}(${it.name})` : ratJs(it.v);
  return `${it.sign < 0 ? "-" : "+"}(${v})`;
};
const stateJs = (base, pre, items) =>
  `${ratJs(pre)}*(0${items.map((it) => itemJs(base, it)).join("")})`;

/** Linear answer: {c0, x, y, t} (rationals). */
const linML = (base, lin, constFirst) => {
  const terms = [];
  const varTerm = (name) => {
    const c = lin[name];
    if (!c || c.p === 0) return;
    const body =
      name === "t"
        ? rEq(rabs(c), R1)
          ? mi("t")
          : mrow(ratAbsML(c), mi("t"))
        : rEq(rabs(c), R1)
          ? logML(base, mi(name))
          : mrow(ratAbsML(c), THIN, logML(base, mi(name)));
    terms.push({ neg: c.p < 0, body });
  };
  const constTerm = () => {
    if (lin.c0 && lin.c0.p !== 0) terms.push({ neg: lin.c0.p < 0, body: ratAbsML(lin.c0) });
  };
  if (constFirst) constTerm();
  ["x", "y", "t"].forEach(varTerm);
  if (!constFirst) constTerm();
  if (!terms.length) return mn(0);
  return mrow(
    ...terms.flatMap((t, i) => {
      if (i === 0) return t.neg ? [mrow(mo(MINUS), t.body)] : [t.body];
      return [mo(t.neg ? MINUS : "+"), t.body];
    }),
  );
};
const linJs = (base, lin) => {
  const parts = [];
  if (lin.c0?.p) parts.push(ratJs(lin.c0));
  ["x", "y"].forEach((v) => lin[v]?.p && parts.push(`${ratJs(lin[v])}*${base.fn}(${v})`));
  if (lin.t?.p) parts.push(`${ratJs(lin.t)}*t`);
  return parts.length ? parts.join(" + ") : "0";
};
const linPlain = (base, lin) => {
  const terms = [];
  const coefText = (c, body) => {
    const a = rabs(c);
    if (rEq(a, R1)) return body;
    return a.q === 1 ? `${a.p}*${body}` : `(${a.p}/${a.q})*${body}`;
  };
  if (lin.c0?.p > 0) terms.push({ neg: false, text: ratPlain(lin.c0) });
  ["x", "y"].forEach((v) => lin[v]?.p && terms.push({ neg: lin[v].p < 0, text: coefText(lin[v], `${base.fn}(${v})`) }));
  if (lin.t?.p) terms.push({ neg: lin.t.p < 0, text: coefText(lin.t, "t") });
  if (lin.c0?.p < 0) terms.push({ neg: true, text: ratPlain(rabs(lin.c0)) });
  return (
    terms
      .map((t, i) => (i === 0 ? (t.neg ? "-" : "") + t.text : (t.neg ? " - " : " + ") + t.text))
      .join("") || "0"
  );
};
const linScale = (lin, s) => {
  const out = {};
  Object.entries(lin).forEach(([k, v]) => (out[k] = rmul(v, s)));
  return out;
};

const logText = (base, inside) => `${base.text}(${inside})`;

/** Expansion problems: log_b(argument) in terms of log_b(x) (and log_b(y)). */
const expansionProblem = (base, options, rng) => {
  const roots = options.roots;
  const maxK = { 10: 3, 2: 5, e: 3 }[base.key];
  const k = () => 1 + Math.floor(rng() * maxK);
  const template = weighted(
    [
      ["product", 0.22],
      ["power", 0.22],
      ["quotient", 0.18],
      ["rootprod", roots ? 0.12 : 0],
      ["twovar", 0.2],
    ],
    rng,
  );
  let a;
  if (template === "product") {
    a = { q: 1, num: [baseF(k()), varF("x", pick([1, 1, 2, 3], rng))], den: [] };
  } else if (template === "power") {
    const choices = [
      { q: 1, num: [varF("x", 2)], den: [] },
      { q: 1, num: [varF("x", 3)], den: [] },
      { q: 1, num: [varF("x", pick([4, 5], rng))], den: [] },
      { q: 1, num: [], den: [varF("x", pick([1, 2], rng))] },
    ];
    if (roots)
      choices.push(
        { q: 2, num: [varF("x")], den: [] },
        { q: 3, num: [varF("x")], den: [] },
        { q: 3, num: [varF("x", 2)], den: [] },
        { q: 2, num: [varF("x", 3)], den: [] },
      );
    a = pick(choices, rng);
  } else if (template === "quotient") {
    const x = varF("x", pick([1, 1, 2], rng));
    a = rng() < 0.6 ? { q: 1, num: [x], den: [baseF(k())] } : { q: 1, num: [baseF(k())], den: [x] };
  } else if (template === "rootprod") {
    a = { q: pick([2, 2, 3], rng), num: [baseF(k()), varF("x")], den: [] };
  } else {
    const choices = [
      { q: 1, num: [varF("x"), varF("y")], den: [] },
      { q: 1, num: [varF("x")], den: [varF("y")] },
      { q: 1, num: [varF("x", 2), varF("y")], den: [] },
      { q: 1, num: [varF("x")], den: [varF("y", 2)] },
      { q: 1, num: [baseF(k()), varF("x"), varF("y")], den: [] },
    ];
    if (roots) choices.push({ q: 2, num: [varF("x"), varF("y")], den: [] });
    a = pick(choices, rng);
  }

  const vars = [...new Set([...a.num, ...a.den].filter((f) => f.type === "var").map((f) => f.name))].sort();
  const arg = argDual(base, a);
  const pre0 = rat(1, a.q);

  // Exact answer
  const lin = { c0: R0, x: R0, y: R0 };
  const addF = (f, sign) => {
    if (f.type === "base") lin.c0 = radd(lin.c0, rat(sign * f.k));
    else lin[f.name] = radd(lin[f.name], rat(sign * f.m));
  };
  a.num.forEach((f) => addF(f, 1));
  a.den.forEach((f) => addF(f, -1));
  const answer = linScale(lin, pre0);
  const constFirst = answer.c0.p > 0;

  // --- method: one state per rule -------------------------------------------
  const steps = [];
  const L0 = logML(base, arg.ml);
  const states = []; // for tests: math.js forms of each step
  const say = (label, text, pre, items) => {
    const m = stateML(base, pre, items);
    steps.push({ label, segs: [text, ml(eqML(L0, m))] });
    states.push(stateJs(base, pre, items));
  };
  const innerDual = quotientDual(base, a.num, a.den);
  let pre = R1;
  let items = [{ sign: 1, kind: "log", ml: innerDual.ml, js: innerDual.js }];
  if (a.q > 1) {
    pre = pre0;
    say(
      "Roots are powers",
      `A ${a.q === 2 ? "square" : "cube"} root is the power 1/${a.q}, and the power rule moves the 1/${a.q} in front: `,
      pre,
      items,
    );
  }
  const numDual = productDual(base, a.num);
  const denDual = productDual(base, a.den);
  if (a.den.length) {
    items = [
      { sign: 1, kind: "log", ml: numDual.ml, js: numDual.js },
      { sign: -1, kind: "log", ml: denDual.ml, js: denDual.js },
    ];
    say("Quotient rule", "The log of a quotient is a difference, log(A/B) = log(A) − log(B): ", pre, items);
  }
  const factorItems = [
    ...a.num.map((f) => ({ f, sign: 1 })),
    ...(a.num.length ? [] : [{ f: null, sign: 1 }]),
    ...a.den.map((f) => ({ f, sign: -1 })),
  ];
  if (a.num.length > 1 || a.den.length > 1) {
    items = factorItems.map(({ f, sign }) => {
      const d = f ? factorDual(base, f) : D.int(1);
      return { sign, kind: "log", ml: d.ml, js: d.js };
    });
    say("Product rule", "The log of a product is a sum, log(AB) = log(A) + log(B): ", pre, items);
  } else {
    items = factorItems.map(({ f, sign }) => {
      const d = f ? factorDual(base, f) : D.int(1);
      return { sign, kind: "log", ml: d.ml, js: d.js };
    });
  }
  const powered = factorItems.some(({ f }) => f && f.type === "var" && f.m > 1);
  if (powered) {
    items = items.map((it, i) => {
      const f = factorItems[i].f;
      return f && f.type === "var" && f.m > 1
        ? { sign: it.sign, kind: "coeflog", m: rat(f.m), name: f.name }
        : it;
    });
    say("Power rule", "Powers come out in front, log(xⁿ) = n·log(x): ", pre, items);
  }
  const hasConst = factorItems.some(({ f }) => !f || f.type === "base");
  if (hasConst) {
    const examples = factorItems
      .filter(({ f }) => !f || f.type === "base")
      .map(({ f }) =>
        f
          ? `${logText(base, baseNumberText(base, f.k))} = ${base.key === "e" ? "" : `${logText(base, `${base.key}${sup(f.k)}`)} = `}${f.k}`
          : `${logText(base, "1")} = 0`,
      );
    items = items
      .map((it, i) => {
        const f = factorItems[i].f;
        if (!f) return null;
        return f.type === "base" ? { sign: it.sign, kind: "const", v: rat(f.k) } : it;
      })
      .filter(Boolean);
    say("Evaluate", `${examples.join(", and ")}: `, pre, items);
  }
  const needsDistribute = !rEq(pre, R1) && (items.length > 1 || items.some((it) => it.kind !== "log"));
  if (needsDistribute) {
    steps.push({
      label: "Answer",
      segs: [
        "Multiply out: ",
        ml(eqML(L0, linML(base, answer, constFirst))),
      ],
    });
  } else {
    steps.push({ label: "Answer", segs: ["So ", ml(eqML(L0, linML(base, answer, constFirst)))] });
  }

  // --- mistakes ----------------------------------------------------------------
  const L = (v) => `${base.fn}(${v})`;
  const fTerm = (f) => (f.type === "base" ? `(${f.k})` : `(${f.m})*${L(f.name)}`);
  const mistakes = [];
  const add = (js, message) => mistakes.push({ js, message });
  const preJs = ratJs(pre0);
  add(
    `-(${linJs(base, answer)})`,
    a.den.length
      ? "Check the signs: log(A/B) = log(A) − log(B), so the log of the denominator is subtracted."
      : "Check the signs.",
  );
  const firstBase = factorItems.find(({ f }) => f && f.type === "base")?.f;
  if (firstBase) {
    add(
      linJs(base, { ...answer, c0: R0 }),
      `Don't forget the constant: ${logText(base, baseNumberText(base, firstBase.k))} = ${firstBase.k}.`,
    );
    if (base.key !== "e") {
      const swap = (f) => (f.type === "base" ? `(${base.b ** f.k})` : fTerm(f));
      add(
        `${preJs}*(${a.num.map(swap).join("+") || "0"}-(${a.den.map(swap).join("+") || "0"}))`,
        `Take the log of ${fmtInt(base.b ** firstBase.k)} too: ${logText(base, fmtInt(base.b ** firstBase.k))} = ${firstBase.k}.`,
      );
    }
  }
  if (a.q > 1) {
    add(linJs(base, lin), `A ${a.q === 2 ? "square" : "cube"} root is the power 1/${a.q}, so the whole log gets multiplied by 1/${a.q}.`);
    if (lin.c0.p !== 0 && (lin.x.p !== 0 || lin.y.p !== 0)) {
      add(
        linJs(base, { ...linScale(lin, pre0), c0: lin.c0 }),
        `The 1/${a.q} multiplies every term, including the constant.`,
      );
    }
  }
  if (a.num.length > 1 && !a.den.length) {
    add(
      `${preJs}*(${a.num.map(fTerm).join("*")})`,
      "The log of a product is a sum of logs, log(AB) = log(A) + log(B), not a product.",
    );
  }
  if (a.num.length && a.den.length) {
    add(
      `${preJs}*(${a.num.map(fTerm).join("+")})/(${a.den.map(fTerm).join("+")})`,
      "The log of a quotient is a difference of logs, log(A/B) = log(A) − log(B), not a quotient.",
    );
  }
  if (powered) {
    const withPow = (f, how) =>
      f.type === "var" && f.m > 1 ? (how === "pow" ? `${L(f.name)}^${f.m}` : L(f.name)) : fTerm(f);
    const build = (how) =>
      `${preJs}*((${a.num.map((f) => withPow(f, how)).join("+") || "0"})-(${a.den.map((f) => withPow(f, how)).join("+") || "0"}))`;
    add(build("pow"), "Power rule: log(x³) = 3·log(x), which is not the same as (log x)³.");
    add(build("drop"), "Use the power rule: log(xⁿ) = n·log(x).");
  }

  // --- question ------------------------------------------------------------------
  const inTermsOf = vars.flatMap((v, i) => [...(i ? [" and "] : []), ml(logML(base, mi(v)))]);
  const question = ["Write ", ml(L0), " in terms of ", ...inTermsOf, "."];
  const note =
    vars.length === 1
      ? ["Here ", ml(mi(vars[0])), " is positive."]
      : ["Here ", ml(mi("x")), " and ", ml(mi("y")), " are positive."];

  return {
    type: "logs",
    base: base.key,
    vars,
    question,
    note,
    argJs: arg.js,
    statesJs: states,
    answerJs: linJs(base, answer),
    answerPlain: linPlain(base, answer),
    answerML: wrapMath(eqML(L0, linML(base, answer, constFirst))),
    steps,
    mistakes,
    template,
  };
};

/** log_b(B^(a t + d)) where B is a power of b. */
const exponentProblem = (base, options, rng) => {
  const roots = options.roots;
  const choices = {
    2: [
      { c: R1, d: () => D.int(2) },
      { c: rat(2), d: () => D.int(4), n: "4" },
      { c: rat(3), d: () => D.int(8), n: "8" },
      { c: rat(-1), d: () => D.paren(D.frac(D.int(1), D.int(2))), n: "1/2" },
      ...(roots ? [{ c: rat(1, 2), d: () => D.sqrt(D.int(2)), n: "√2" }] : []),
    ],
    10: [
      { c: R1, d: () => D.int(10) },
      { c: rat(2), d: () => D.int(100), n: "100" },
      { c: rat(3), d: () => D.int(1000), n: "1000" },
      { c: rat(-1), d: () => D.paren(D.dec("0.1")), n: "0.1" },
      ...(roots ? [{ c: rat(1, 2), d: () => D.sqrt(D.int(10)), n: "√10" }] : []),
    ],
    e: [
      { c: R1, d: () => D.e() },
      { c: R1, d: () => D.e() },
      { c: rat(-1), d: () => D.paren(D.frac(D.int(1), D.e())), n: "1/e" },
      ...(roots ? [{ c: rat(1, 2), d: () => D.sqrt(D.e()), n: "√e" }] : []),
    ],
  }[base.key];
  const B = pick(choices, rng);
  const aCoef = rat(...pick(roots ? [[1], [1], [2], [3], [-1], [1, 2]] : [[1], [1], [2], [3], [-1]], rng));
  const dConst = rng() < 0.6 ? R0 : rat(pick([1, 2, 3, -1, -2], rng));

  // Exponent a t + d
  const tPart = rEq(aCoef, R1)
    ? D.sym("t")
    : rEq(aCoef, rat(-1))
      ? { ml: mrow(mo(MINUS), mi("t")), js: "(-t)" }
      : aCoef.q === 1
        ? { ml: mrow(mn(Math.abs(aCoef.p)), mi("t")), js: `(${aCoef.p}*t)` }
        : { ml: mrow(mi("t"), mo("/"), mn(aCoef.q)), js: `(t/${aCoef.q})` };
  const expo =
    dConst.p === 0
      ? tPart
      : {
          ml: mrow(tPart.ml, mo(dConst.p < 0 ? MINUS : "+"), mn(Math.abs(dConst.p))),
          js: `(${tPart.js}+${ratJs(dConst)})`,
        };
  const Bd = B.d();
  const arg = D.pow(Bd, expo);
  const L0 = logML(base, arg.ml);
  const answer = { c0: rmul(B.c, dConst), t: rmul(B.c, aCoef) };
  const ansML = linML(base, answer, false);

  const steps = [];
  const statesJs = [];
  if (!rEq(B.c, R1)) {
    const cPow = bpowShown(base, B.c);
    const newExp = mrow(rIsInt(B.c) && B.c.p > 0 ? mn(B.c.p) : parenML(inlineRatML(B.c)), dConst.p === 0 && rEq(aCoef, R1) ? "" : mo(DOT), dConst.p === 0 && rEq(aCoef, R1) ? mi("t") : parenML(expo.ml));
    steps.push({
      label: "Rewrite the base",
      segs: [
        `Write ${B.n} as a power of ${base.key}: `,
        ml(eqML(Bd.ml, cPow.ml)),
        ". A power of a power multiplies the exponents: ",
        ml(eqML(arg.ml, msup(parenML(cPow.ml), expo.ml), msup(base.dual().ml, newExp))),
      ],
    });
    statesJs.push(`${base.fn}((${cPow.js})^(${expo.js}))`);
  }
  steps.push({
    label: "Logs undo exponentials",
    segs: [`${base.text}(${base.key}ᵘ) = u for any u, so `, ml(eqML(L0, ansML))],
  });

  const mistakes = [
    { js: `-(${linJs(base, answer)})`, message: "Check the sign." },
  ];
  if (!rEq(B.c, R1)) {
    mistakes.push({
      js: expo.js,
      message: `First write ${B.n} as a power of ${base.key}: ${base.text}(${B.n}) = ${ratPlain(B.c)}, not 1.`,
    });
    if (B.c.q === 1 && B.c.p > 0) {
      mistakes.push({
        js: `${base.b ** B.c.p}*(${expo.js})`,
        message: `${base.text}(${B.n}) is ${B.c.p}, not ${B.n}: write ${B.n} as ${base.key}${sup(B.c.p)}.`,
      });
    }
  }

  return {
    type: "linear",
    base: base.key,
    vars: ["t"],
    question: ["Simplify ", ml(L0), "."],
    note: [],
    argJs: arg.js,
    statesJs,
    answerJs: linJs(base, answer),
    answerPlain: linPlain(base, answer),
    answerML: wrapMath(eqML(L0, ansML)),
    steps,
    mistakes,
    template: "exponent",
  };
};

// ---------------------------------------------------------------------------
// Problems
// ---------------------------------------------------------------------------

const SAMPLE_RANGES = { x: [0.3, 6], y: [0.3, 6], t: [-2, 2] };
const SAMPLE_COUNT = 8;

/**
 * Make a random problem.
 * options: {bases: {10, 2, e}, numbers, expressions, roots}
 * rng: uniform numbers in [0, 1) (Math.random by default)
 */
export const makeProblem = (options = DEFAULT_OPTIONS, rng = Math.random) => {
  const bases = BASES.filter((k) => options.bases?.[k]);
  const base = BASE_INFO[bases.length ? pick(bases, rng) : "10"];
  const kinds = KINDS.filter((k) => options[k]);
  const kind = kinds.length ? pick(kinds, rng) : "numbers";
  let problem;
  if (kind === "numbers") problem = numberProblem(base, options, rng);
  else if (rng() < 0.22) problem = exponentProblem(base, options, rng);
  else problem = expansionProblem(base, options, rng);

  if (problem.type !== "number") {
    problem.samples = [];
    for (let i = 0; i < SAMPLE_COUNT; i++) {
      const scope = {};
      problem.vars.forEach((v) => {
        const [lo, hi] = SAMPLE_RANGES[v];
        scope[v] = lo + (hi - lo) * rng();
      });
      problem.samples.push(scope);
    }
  }
  return { ...problem, kind, options, baseText: base.text, baseFn: base.fn };
};

// ---------------------------------------------------------------------------
// Reading and checking a typed answer
// ---------------------------------------------------------------------------

const LOGS = ["log10", "log2", "ln"];
const FUNCTIONS = ["sqrt", "exp", ...LOGS];

const normalize = (input) => {
  let s = String(input)
    .replace(/[−–—]/g, "-")
    .replace(/[·×⋅∙]/g, "*")
    .replace(/π/g, "pi")
    .replace(/√/g, "sqrt")
    .replace(/∛/g, "cbrt")
    .replace(/²/g, "^2")
    .replace(/³/g, "^3")
    .replace(/÷/g, "/")
    .replace(/\*\*/g, "^")
    .replace(/[[{]/g, "(")
    .replace(/[\]}]/g, ")")
    .replace(/log\s*₁₀/g, "log10")
    .replace(/log\s*₂/g, "log2")
    .replace(/log\s*ₑ/g, "ln")
    .replace(/log\s*_\s*\(?\s*(10|2|e)\s*\)?/g, (m, b) => (b === "e" ? "ln" : `log${b}`));
  // "log_10" etc. done; now "dy/dx = ..." style prefixes: keep what follows "="
  const eqAt = s.lastIndexOf("=");
  if (eqAt >= 0) s = s.slice(eqAt + 1);
  return s.trim();
};

/** Numbers, single-letter names, function names and operators. */
const tokenize = (s) => {
  const tokens = [];
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    const num = /^(\d+\.?\d*|\.\d+)/.exec(s.slice(i));
    if (num) {
      tokens.push({ t: "num", v: num[0] });
      i += num[0].length;
      continue;
    }
    const rest = s.slice(i);
    const lg = /^log(10|2)(?!\d)/.exec(rest);
    if (lg) {
      tokens.push({ t: "fn", v: `log${lg[1]}` });
      i += lg[0].length;
      continue;
    }
    const word = /^[A-Za-z]+/.exec(rest);
    if (word) {
      const run = word[0];
      let j = 0;
      while (j < run.length) {
        const sub = run.slice(j);
        const name = ["sqrt", "cbrt", "exp", "log", "ln", "pi"].find((n) => sub.startsWith(n));
        if (name === "log") {
          // "log" right before digits 10 or 2 (e.g. "xlog10")
          const after = s.slice(i + j + 3);
          const m = /^(10|2)(?!\d)/.exec(after);
          if (j + 3 === run.length && m) {
            tokens.push({ t: "fn", v: `log${m[1]}` });
            i += m[1].length;
          } else {
            tokens.push({ t: "fn", v: "log10", plain: true });
          }
          j += 3;
        } else if (name) {
          tokens.push({ t: name === "pi" ? "id" : "fn", v: name });
          j += name.length;
        } else {
          tokens.push({ t: "id", v: run[j] });
          j++;
        }
      }
      i += run.length;
      continue;
    }
    if ("+-*/^(),".includes(ch)) {
      tokens.push({ t: "op", v: ch });
      i++;
      continue;
    }
    throw new Error(`I don't understand the character “${ch}”.`);
  }
  return tokens;
};

/** Add explicit * and the parentheses of "ln x", "log 2", "sqrt t". */
const prepare = (tokens) => {
  const out = [];
  const isValue = (tk) =>
    tk && (tk.t === "num" || tk.t === "id" || (tk.t === "op" && tk.v === ")"));
  const startsValue = (tk) =>
    tk && (tk.t === "num" || tk.t === "id" || tk.t === "fn" || (tk.t === "op" && tk.v === "("));
  const push = (tk) => {
    if (isValue(out[out.length - 1]) && startsValue(tk)) out.push({ t: "op", v: "*" });
    out.push(tk);
  };
  for (let i = 0; i < tokens.length; i++) {
    const tk = tokens[i];
    const next = tokens[i + 1];
    if (tk.t === "fn" && next && (next.t === "num" || next.t === "id")) {
      push(tk);
      out.push({ t: "op", v: "(" }, next, { t: "op", v: ")" });
      i++;
    } else {
      push(tk);
    }
  }
  return out;
};

const FN_READ = { log10: "log₁₀", log2: "log₂", ln: "ln", sqrt: "√", cbrt: "∛", exp: "exp" };
const tokensToJs = (tokens) => tokens.map((tk) => tk.v).join("");
const tokensToReadable = (tokens) =>
  tokens
    .map((tk, i) => {
      if (tk.t === "id" && tk.v === "pi") return "π";
      if (tk.t === "fn") return FN_READ[tk.v] ?? tk.v;
      if (tk.t === "op" && tk.v === "*") return "·";
      if (tk.t === "op" && (tk.v === "+" || tk.v === "-")) {
        const sign = tk.v === "-" ? "−" : "+";
        const prev = tokens[i - 1];
        const binary =
          prev && (prev.t === "num" || prev.t === "id" || (prev.t === "op" && prev.v === ")"));
        return binary ? ` ${sign} ` : sign;
      }
      return tk.v;
    })
    .join("");

/**
 * Parse a typed answer.
 * Returns {node, compiled, readAs, plainLog} or {error, readAs}.
 */
export const parseAnswer = (input, problem) => {
  const s = normalize(input);
  if (!s) return { error: "Type your answer first." };
  let tokens;
  try {
    tokens = prepare(tokenize(s));
  } catch (err) {
    return { error: err.message };
  }
  const readAs = tokensToReadable(tokens);
  const plainLog = tokens.some((tk) => tk.plain);
  let node;
  try {
    node = math.parse(tokensToJs(tokens));
  } catch {
    return { error: "I couldn't read that. Check your parentheses and operators.", readAs };
  }
  const fnNodes = node.filter((n) => n.isFunctionNode);
  const fnNames = new Set(fnNodes.map((n) => n.fn.name ?? n.name));
  const allowed = new Set(["e", "pi", ...problem.vars]);
  const symbols = node
    .filter((n) => n.isSymbolNode)
    .map((n) => n.name)
    .filter((name) => !fnNames.has(name) || !FUNCTIONS.includes(name));
  for (const name of symbols) {
    if (allowed.has(name) || FUNCTIONS.includes(name)) continue;
    if (/^[A-Z]$/.test(name) && problem.vars.includes(name.toLowerCase()))
      return { error: `Use a lowercase ${name.toLowerCase()}.`, readAs };
    if (problem.type === "number")
      return { error: "The answer is a number: no letters needed.", readAs };
    return {
      error: `This problem doesn't have a variable called ${name}. Use ${problem.vars.join(" and ")}.`,
      readAs,
    };
  }
  let compiled;
  try {
    compiled = node.compile();
  } catch {
    return { error: "I couldn't read that. Check your parentheses and operators.", readAs };
  }
  return { node, compiled, readAs, plainLog, fnNodes };
};

const evaluateAt = (compiled, scope) => {
  try {
    const v = compiled.evaluate({ ...scope });
    return typeof v === "number" ? v : NaN;
  } catch {
    return NaN;
  }
};

/** Largest relative difference between two expressions over the samples. */
const maxRelativeDifference = (a, b, samples) => {
  let worst = 0;
  for (const scope of samples) {
    const x = evaluateAt(a, scope);
    const y = evaluateAt(b, scope);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return Infinity;
    worst = Math.max(worst, Math.abs(x - y) / Math.max(1, Math.abs(x), Math.abs(y)));
  }
  return worst;
};

const EXACT = 1e-9;
const ROUNDED = 5e-3;
const compileCache = new Map();
const compileJs = (js) => {
  if (!compileCache.has(js)) compileCache.set(js, math.parse(js).compile());
  return compileCache.get(js);
};

/** Is the answer written in the required final form? Returns a message or null. */
const formProblem = (problem, parsed) => {
  const logs = parsed.fnNodes.filter((n) => LOGS.includes(n.fn.name));
  if (problem.type !== "logs") {
    if (logs.length)
      return problem.type === "number"
        ? "Right value! Now evaluate the logarithm: give the answer as a number."
        : "Right idea! Now evaluate the logarithm of the number.";
    return null;
  }
  for (const n of logs) {
    const arg = n.args[0];
    const isVar = arg && arg.isSymbolNode && problem.vars.includes(arg.name);
    if (!isVar) {
      const hasVar = arg && arg.filter((m) => m.isSymbolNode && problem.vars.includes(m.name)).length > 0;
      return hasVar
        ? `Keep going: in the final answer each logarithm should have just ${problem.vars.join(" or ")} inside.`
        : "Right idea! Now evaluate the logarithm of the number.";
    }
    if (n.fn.name !== problem.baseFn)
      return `Right value, but write it with ${problem.baseText}, the base in the question.`;
  }
  return null;
};

/**
 * Check a typed answer.
 * Returns {status: "correct" | "close" | "incorrect" | "error", message, readAs}.
 */
export const checkAnswer = (problem, input) => {
  const parsed = parseAnswer(input, problem);
  if (parsed.error) return { status: "error", message: parsed.error, readAs: parsed.readAs };
  const { compiled, readAs } = parsed;
  const correct = compileJs(problem.answerJs);
  const diff = maxRelativeDifference(correct, compiled, problem.samples);
  if (diff < EXACT) {
    const issue = formProblem(problem, parsed);
    if (issue) return { status: "close", message: issue, readAs };
    return { status: "correct", message: "Correct!", readAs };
  }
  // Plain "log" means log10; maybe the student meant this problem's base
  if (parsed.plainLog && problem.baseFn !== "log10") {
    const alt = parseAnswer(String(input).replace(/log(?!\s*(_|₁|₂|10|2))/g, problem.baseFn), problem);
    if (alt.compiled && maxRelativeDifference(correct, alt.compiled, problem.samples) < EXACT) {
      return {
        status: "close",
        message: `Here plain "log" means log₁₀. Write ${problem.baseFn === "ln" ? "ln(x)" : "log2(x)"} for ${problem.baseText}.`,
        readAs,
      };
    }
  }
  if (diff < ROUNDED && /\.\d/.test(String(input))) {
    return {
      status: "close",
      message: "Very close, but you used rounded decimals. Give the exact answer (for example 2/3, not 0.667).",
      readAs,
    };
  }
  for (const m of problem.mistakes) {
    const wrong = compileJs(m.js);
    if (maxRelativeDifference(correct, wrong, problem.samples) < EXACT) continue;
    if (maxRelativeDifference(wrong, compiled, problem.samples) < EXACT)
      return { status: "incorrect", message: m.message, readAs };
  }
  return {
    status: "incorrect",
    message: "Not quite. Try again, or use Show method for a hint.",
    readAs,
  };
};
