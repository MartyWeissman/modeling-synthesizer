// src/tools/derivativePracticeMath.js
// Random problems for the Derivative Practice study aide.
//
// Every problem has the form  F = (shift) + (scale) * (basic function),
// where the basic function is t (linear), t^r (power law), b^t
// (exponential) or sin(t) / cos(t). Only these rules are ever needed:
//   - a line's derivative is its slope,
//   - a vertical shift doesn't change the derivative,
//   - a vertical scaling scales the derivative,
//   - the power rule,
//   - d/dt b^t = ln(b) b^t, d/dt e^t = e^t, d/dt sin t = cos t,
//     d/dt cos t = -sin t.
// No chain rule and no product rule.
//
// Expressions are small structures (a list of terms, each term a
// coefficient times a basis function), so one problem can be rendered as
// MathML for display, as plain text, and as a math.js expression for
// checking a typed answer. Pure JS (no React), unit-tested in
// tests/derivativePractice.test.js.

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
const rabs = (a) => rat(Math.abs(a.p), a.q);
const risOne = (a) => a.p === 1 && a.q === 1;

// ---------------------------------------------------------------------------
// Coefficients: a rational times symbols (pi, parameters, ln(base))
// ---------------------------------------------------------------------------

const SYM_ORDER = { pi: 0, param: 1, ln: 2 };
const sortSyms = (syms) =>
  [...syms].sort(
    (a, b) =>
      SYM_ORDER[a.type] - SYM_ORDER[b.type] ||
      (a.type === "param" ? a.name.localeCompare(b.name) : 0),
  );
const coef = (r, syms = []) => ({ r, syms: sortSyms(syms) });
const ONE_COEF = coef(rat(1));
const cmul = (a, b) => coef(rmul(a.r, b.r), [...a.syms, ...b.syms]);
const cneg = (a) => coef(rat(-a.r.p, a.r.q), a.syms);
const isOneCoef = (c) => c.syms.length === 0 && risOne(c.r);
const paramSym = (name) => ({ type: "param", name });

// Bases of exponentials: {type: "e"} | {type: "num", r} | {type: "param", name}
// Basis functions:
//   {type: "one"}                                   constant
//   {type: "pow", exp: {r}}                          t^r
//   {type: "pow", exp: {param, offset}}              t^(n + offset)
//   {type: "exp", base}                              b^t
//   {type: "sin"} | {type: "cos"}
const ONE = { type: "one" };
const pow = (r) => ({ type: "pow", exp: { r } });
const powParam = (param, offset = rat(0)) => ({
  type: "pow",
  exp: { param, offset },
});

/** Derivative of a single term (never of a constant). */
const diffTerm = ({ c, b }) => {
  switch (b.type) {
    case "pow": {
      if (b.exp.param) {
        return {
          c: cmul(c, coef(rat(1), [paramSym(b.exp.param)])),
          b: powParam(b.exp.param, rat(-1)),
        };
      }
      const r1 = radd(b.exp.r, rat(-1));
      return { c: cmul(c, coef(b.exp.r)), b: r1.p === 0 ? ONE : pow(r1) };
    }
    case "exp":
      if (b.base.type === "e") return { c, b };
      return { c: cmul(c, coef(rat(1), [{ type: "ln", base: b.base }])), b };
    case "sin":
      return { c, b: { type: "cos" } };
    case "cos":
      return { c: cneg(c), b: { type: "sin" } };
    default:
      throw new Error(`diffTerm: cannot differentiate ${b.type}`);
  }
};

// ---------------------------------------------------------------------------
// math.js strings (for checking)
// ---------------------------------------------------------------------------

const ratJs = (r) => (r.q === 1 ? `(${r.p})` : `(${r.p}/${r.q})`);
const baseJs = (base) =>
  base.type === "e" ? "e" : base.type === "param" ? base.name : ratJs(base.r);
const symJs = (s) =>
  s.type === "pi" ? "pi" : s.type === "param" ? s.name : `log(${baseJs(s.base)})`;
const basisJs = (b) => {
  switch (b.type) {
    case "one":
      return "1";
    case "pow":
      return b.exp.param
        ? `t^(${b.exp.param}+${ratJs(b.exp.offset)})`
        : `t^${ratJs(b.exp.r)}`;
    case "exp":
      return `${baseJs(b.base)}^t`;
    default:
      return `${b.type}(t)`;
  }
};
const coefJs = (c) => [ratJs(c.r), ...c.syms.map(symJs)].join("*");
const termJs = ({ c, b }) => `(${coefJs(c)})*(${basisJs(b)})`;
export const exprJs = (terms) =>
  terms.length ? terms.map(termJs).join(" + ") : "0";

// ---------------------------------------------------------------------------
// Plain text (the way a student would type it)
// ---------------------------------------------------------------------------

const ratPlain = (r) => (r.q === 1 ? `${r.p}` : `(${r.p}/${r.q})`);
const baseInner = (base) =>
  base.type === "e"
    ? "e"
    : base.type === "param"
      ? base.name
      : base.r.q === 1
        ? `${base.r.p}`
        : `${base.r.p}/${base.r.q}`;
const symPlain = (s) =>
  s.type === "pi" ? "pi" : s.type === "param" ? s.name : `ln(${baseInner(s.base)})`;
const basisPlain = (b) => {
  switch (b.type) {
    case "one":
      return "";
    case "pow": {
      if (b.exp.param) {
        const o = b.exp.offset;
        return o.p === 0
          ? `t^${b.exp.param}`
          : `t^(${b.exp.param}${o.p < 0 ? "-" : "+"}${ratPlain(rabs(o))})`;
      }
      const r = b.exp.r;
      if (risOne(r)) return "t";
      if (r.q === 1 && r.p > 0) return `t^${r.p}`;
      return `t^(${r.p}${r.q === 1 ? "" : `/${r.q}`})`;
    }
    case "exp": {
      const inner = baseInner(b.base);
      return b.base.type === "num" && b.base.r.q !== 1
        ? `(${inner})^t`
        : `${inner}^t`;
    }
    default:
      return `${b.type}(t)`;
  }
};
const termAbsPlain = ({ c, b }) => {
  const factors = [];
  const a = rabs(c.r);
  if (!risOne(a) || (c.syms.length === 0 && b.type === "one"))
    factors.push(ratPlain(a));
  c.syms.forEach((s) => factors.push(symPlain(s)));
  const bp = basisPlain(b);
  if (bp) factors.push(bp);
  return factors.join("*");
};
export const exprPlain = (terms) =>
  terms
    .map((term, i) => {
      const neg = term.c.r.p < 0;
      const body = termAbsPlain(term);
      if (i === 0) return neg ? `-${body}` : body;
      return `${neg ? " - " : " + "}${body}`;
    })
    .join("") || "0";

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
const mfrac = (a, b) => `<mfrac>${a}${b}</mfrac>`;
const msqrt = (x) => `<msqrt>${x}</msqrt>`;
const fence = (c) => `<mo fence="true" lspace="0" rspace="0">${c}</mo>`;
const paren = (x) => mrow(fence("("), x, fence(")"));
const THIN = `<mspace width="0.17em"/>`;
const T = mi("t");

/** Wrap MathML content in a <math> element. */
export const wrapMath = (x) =>
  `<math xmlns="http://www.w3.org/1998/Math/MathML">${x}</math>`;
// Full-size fraction (for dP/dt and d/dt); other fractions stay compact.
const bigFrac = (a, b) => `<mstyle displaystyle="true">${mfrac(a, b)}</mstyle>`;

const ratAbsML = (r) =>
  r.q === 1 ? mn(Math.abs(r.p)) : mfrac(mn(Math.abs(r.p)), mn(r.q));
const signedRatML = (r) => (r.p < 0 ? mrow(mo(MINUS), ratAbsML(r)) : ratAbsML(r));
const baseML = (base) =>
  base.type === "e" ? mi("e") : base.type === "param" ? mi(base.name) : ratAbsML(base.r);
const symML = (s) =>
  s.type === "pi"
    ? mi("π")
    : s.type === "param"
      ? mi(s.name)
      : mrow(THIN, mi("ln"), mo(APPLY), paren(baseML(s.base)));
const expML = (exp) => {
  if (exp.param) {
    const o = exp.offset;
    return o.p === 0
      ? mi(exp.param)
      : mrow(mi(exp.param), mo(o.p < 0 ? MINUS : "+"), ratAbsML(o));
  }
  return signedRatML(exp.r);
};
const basisML = (b) => {
  switch (b.type) {
    case "one":
      return "";
    case "pow":
      return !b.exp.param && risOne(b.exp.r) ? T : msup(T, expML(b.exp));
    case "exp":
      return b.base.type === "num" && b.base.r.q !== 1
        ? msup(paren(baseML(b.base)), T)
        : msup(baseML(b.base), T);
    default:
      return mrow(mi(b.type), mo(APPLY), paren(T));
  }
};
const coefFactorsML = (c, alone) => {
  const out = [];
  const a = rabs(c.r);
  if (!risOne(a) || (alone && c.syms.length === 0)) out.push(ratAbsML(c.r));
  c.syms.forEach((s) => out.push(symML(s)));
  return out;
};

/**
 * MathML for |term|. style.fraction writes a negative power as a fraction
 * (3/t^2); style.sqrt writes t^(1/2) as a square root.
 */
const termAbsML = ({ c, b }, style = {}) => {
  if (b.type === "pow" && !b.exp.param) {
    const r = b.exp.r;
    const half = (x) => x.p === 1 && x.q === 2;
    if (style.fraction && r.p < 0) {
      const m = rabs(r);
      const top = [
        ...(Math.abs(c.r.p) !== 1 ? [mn(Math.abs(c.r.p))] : []),
        ...c.syms.map(symML),
      ];
      const tPart = risOne(m) ? T : half(m) ? msqrt(T) : msup(T, ratAbsML(m));
      return mfrac(
        top.length ? mrow(...top) : mn(1),
        c.r.q !== 1 ? mrow(mn(c.r.q), tPart) : tPart,
      );
    }
    if (style.sqrt && half(r)) return mrow(...coefFactorsML(c, false), msqrt(T));
  }
  const factors = coefFactorsML(c, b.type === "one");
  const bml = basisML(b);
  if (!bml) return mrow(...factors);
  const dot = factors.length > 0 && b.type === "exp" && b.base.type !== "e";
  const space = factors.length > 0 && (b.type === "sin" || b.type === "cos");
  return mrow(...factors, ...(dot ? [mo(DOT)] : []), ...(space ? [THIN] : []), bml);
};

/** MathML (without <math>) for a sum of terms. */
const exprML = (terms, styles = []) => {
  if (!terms.length) return mn(0);
  return mrow(
    ...terms.flatMap((term, i) => {
      const neg = term.c.r.p < 0;
      const body = termAbsML(term, styles[i]);
      if (i === 0) return neg ? [mrow(mo(MINUS), body)] : [body];
      return [mo(neg ? MINUS : "+"), body];
    }),
  );
};

const ddtML = (inner) =>
  mrow(bigFrac(mi("d", "normal"), mrow(mi("d", "normal"), T)), paren(inner));

// ---------------------------------------------------------------------------
// Problem generation
// ---------------------------------------------------------------------------

export const KINDS = ["linear", "power", "exponential", "trig"];

export const DEFAULT_OPTIONS = {
  kinds: { linear: true, power: true, exponential: false, trig: false },
  scaling: true,
  shifting: true,
  params: true,
};

// Letters for the function (no T, E, I, O, D: they look like t, e, 1, 0, d).
const DEP_LETTERS = [
  "P", "F", "G", "H", "Z", "Q", "N", "M", "R", "W",
  "Y", "X", "A", "B", "C", "L", "S", "V", "K", "J", "U",
];
// Constants. Never e, t, d, i, l, o, s or p (they collide with e, t, d/dt,
// sin, ln, pi...).
const COEF_POOL = ["k", "c", "a", "b", "r", "m", "q"];
const SHIFT_POOL = ["c", "b", "a", "h", "k"];
const EXP_POOL = ["n", "m"];
const BASE_POOL = ["a", "b"];

// Ranges of the random values used to compare a typed answer to the
// correct one.
const SAMPLE_RANGES = {
  t: [0.4, 2.6],
  coefficient: [0.6, 2.4],
  shift: [0.6, 2.4],
  exponent: [1.3, 3.7],
  base: [1.3, 3.5],
};
const SAMPLE_COUNT = 8;

const pick = (arr, rng) => arr[Math.floor(rng() * arr.length)];
const weighted = (pairs, rng) => {
  const total = pairs.reduce((s, [, w]) => s + w, 0);
  let u = rng() * total;
  for (const [v, w] of pairs) {
    if ((u -= w) < 0) return v;
  }
  return pairs[pairs.length - 1][0];
};

const listNames = (names) =>
  names.length === 1
    ? names[0]
    : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;

/**
 * Make a random problem.
 * options: {kinds: {linear, power, exponential, trig}, scaling, shifting, params}
 * rng: a function returning uniform numbers in [0, 1) (Math.random by default)
 */
export const makeProblem = (options = DEFAULT_OPTIONS, rng = Math.random) => {
  const kinds = KINDS.filter((k) => options.kinds?.[k]);
  const kind = kinds.length ? pick(kinds, rng) : "power";
  const used = new Set();
  const params = []; // [{name, role}]
  const takeParam = (pool, role) => {
    const name = pick(
      pool.filter((n) => !used.has(n)),
      rng,
    );
    used.add(name);
    params.push({ name, role });
    return name;
  };

  // --- the basic function -------------------------------------------------
  let basis;
  const style = {};
  if (kind === "linear") {
    basis = pow(rat(1));
  } else if (kind === "power") {
    const cats = [
      ["posInt", 0.45],
      ["negInt", 0.2],
      ["frac", 0.2],
    ];
    if (options.params) cats.push(["param", 0.15]);
    const cat = weighted(cats, rng);
    if (cat === "param") {
      basis = powParam(takeParam(EXP_POOL, "exponent"));
    } else {
      let r;
      if (cat === "posInt") r = rat(pick([2, 2, 3, 3, 4, 5, 6, 7], rng));
      else if (cat === "negInt") r = rat(pick([-1, -1, -2, -2, -3, -4], rng));
      else r = rat(...pick([[1, 2], [1, 2], [3, 2], [1, 3], [2, 3], [5, 2], [-1, 2]], rng));
      basis = pow(r);
      style.fraction = r.p < 0 && rng() < 0.5;
      style.sqrt = r.p === 1 && r.q === 2 && rng() < 0.5;
    }
  } else if (kind === "exponential") {
    const u = rng();
    let base;
    if (options.params && u < 0.2)
      base = { type: "param", name: takeParam(BASE_POOL, "base") };
    else if (u < 0.55) base = { type: "e" };
    else base = { type: "num", r: rat(...pick([[2, 1], [2, 1], [3, 1], [5, 1], [10, 1], [1, 2]], rng)) };
    basis = { type: "exp", base };
  } else {
    basis = { type: rng() < 0.5 ? "sin" : "cos" };
  }

  // --- vertical scaling ----------------------------------------------------
  let scale = ONE_COEF;
  if (options.scaling) {
    const u = rng();
    const sign = () => (rng() < 0.2 ? -1 : 1);
    if (options.params && u < 0.3) {
      scale = coef(rat(sign()), [paramSym(takeParam(COEF_POOL, "coefficient"))]);
    } else if (options.params && u < 0.4) {
      scale = coef(rat(sign()), [{ type: "pi" }]);
    } else {
      const v = rng();
      if (v < 0.6) scale = coef(rat(pick([2, 3, 4, 5, 6, 7, 8, 9, 10], rng)));
      else if (v < 0.85) scale = coef(rat(-pick([1, 2, 3, 4, 5, 6, 7, 8], rng)));
      else scale = coef(rat(...pick([[1, 2], [1, 3], [2, 3], [3, 2], [3, 4], [-1, 2]], rng)));
    }
  }

  // --- vertical shift ------------------------------------------------------
  let shift = null;
  if (options.shifting) {
    const u = rng();
    if (options.params && u < 0.25) {
      shift = coef(rat(rng() < 0.3 ? -1 : 1), [paramSym(takeParam(SHIFT_POOL, "shift"))]);
    } else if (options.params && u < 0.3) {
      shift = coef(rat(1), [{ type: "pi" }]);
    } else {
      shift = coef(rat((rng() < 0.7 ? 1 : -1) * (1 + Math.floor(rng() * 20))));
    }
  }
  const shiftFirst = shift !== null && shift.r.p > 0 && rng() < 0.25;

  // --- the function letter (not the capital of a constant, e.g. K with k) ---
  const dep = pick(
    DEP_LETTERS.filter((L) => !used.has(L.toLowerCase())),
    rng,
  );

  // --- terms -----------------------------------------------------------------
  const main = { c: scale, b: basis };
  const shiftTerm = shift && { c: shift, b: ONE };
  const fTerms = shift ? (shiftFirst ? [shiftTerm, main] : [main, shiftTerm]) : [main];
  const fStyles = shift && shiftFirst ? [{}, style] : [style];
  const d = diffTerm(main);
  const dTerms = [d];
  const baseTerm = { c: ONE_COEF, b: basis };
  const dBase = diffTerm(baseTerm);

  // --- display pieces ----------------------------------------------------------
  const depML = mi(dep, "bold-italic");
  const dDep = bigFrac(mrow(mi("d", "normal"), depML), mrow(mi("d", "normal"), T));
  const ml = (x) => ({ ml: wrapMath(x) });
  const eq = (...xs) => mrow(...xs.flatMap((x, i) => (i ? [mo("="), x] : [x])));

  const question = [
    "Suppose that ",
    ml(mrow(depML, mo("="), exprML(fTerms, fStyles))),
    ". What is ",
    ml(dDep),
    "?",
  ];

  const note = [];
  if (params.length) {
    const names = params.map((p) => p.name);
    const parts = names.map((n) => ml(mi(n)));
    note.push("Here ");
    parts.forEach((p, i) => {
      if (i > 0) note.push(i === parts.length - 1 ? " and " : ", ");
      note.push(p);
    });
    note.push(names.length === 1 ? " is a constant" : " are constants");
    const baseParam = params.find((p) => p.role === "base");
    if (baseParam) {
      note.push(" (", ml(mrow(mi(baseParam.name), mo("&gt;"), mn(0))), ")");
    }
    note.push(".");
  }

  // Answer, with an equivalent fraction/root form and a decimal for ln(2) etc.
  const dExp = d.b.type === "pow" && !d.b.exp.param ? d.b.exp.r : null;
  let altStyle = null;
  if (dExp && dExp.p < 0) altStyle = { fraction: true };
  else if (dExp && dExp.p === 1 && dExp.q === 2) altStyle = { sqrt: true };
  const answerParts = [dDep, exprML(dTerms)];
  if (altStyle) answerParts.push(exprML(dTerms, [altStyle]));
  let answerML = eq(...answerParts);
  const lnNum = d.c.syms.filter((s) => s.type === "ln" && s.base.type === "num");
  if (lnNum.length) {
    const value =
      (d.c.r.p / d.c.r.q) *
      lnNum.reduce((prod, s) => prod * Math.log(s.base.r.p / s.base.r.q), 1);
    const rest = d.c.syms.filter((s) => !lnNum.includes(s));
    const approx = mrow(
      ...(value < 0 ? [mo(MINUS)] : []),
      mn(Number(Math.abs(value).toFixed(3)).toString()),
      ...rest.map(symML),
      mo(DOT),
      basisML(d.b),
    );
    answerML = mrow(answerML, mo("&#x2248;"), approx);
  }

  // --- method ------------------------------------------------------------------
  const steps = [];
  const shiftML = shift && exprML([shiftTerm]);
  const scaleML = exprML([{ c: scale, b: ONE }]);
  if (kind === "linear") {
    steps.push({
      label: "Slope",
      segs: [
        `${dep} is a linear function of t: its graph is a line with slope `,
        ml(scaleML),
        ". The derivative of a linear function is its slope.",
        ...(shift
          ? [
              " The constant term ",
              ml(shiftML),
              " only shifts the line up or down; it doesn't change the slope.",
            ]
          : []),
      ],
    });
    steps.push({ label: "Answer", segs: ["So ", ml(eq(dDep, exprML(dTerms)))] });
  } else {
    if (style.fraction || style.sqrt) {
      steps.push({
        label: "Rewrite",
        segs: [
          "Write ",
          ml(exprML([main], [style])),
          " as a power of t: ",
          ml(exprML([main])),
          ".",
        ],
      });
    }
    if (shift) {
      steps.push({
        label: "Vertical shift",
        segs: [
          "The constant ",
          ml(shiftML),
          " shifts the graph up or down. It doesn't change the derivative: ",
          ml(eq(dDep, ddtML(exprML([main])))),
        ],
      });
    }
    const scaled = !isOneCoef(scale);
    if (scaled) {
      steps.push({
        label: "Vertical scaling",
        segs: [
          "Multiplying by ",
          ml(scaleML),
          " multiplies the derivative by ",
          ml(scaleML),
          ": ",
          ml(
            eq(
              shift ? ddtML(exprML([main])) : dDep,
              mrow(scaleML, mo(DOT), ddtML(exprML([baseTerm]))),
            ),
          ),
        ],
      });
    }
    const baseML0 = exprML([baseTerm]);
    const dBaseML = exprML([dBase]);
    if (kind === "power" && basis.exp.param) {
      const n = basis.exp.param;
      steps.push({
        label: "Power rule",
        segs: [
          "The power rule works for any constant exponent ",
          ml(mi(n)),
          ": ",
          ml(eq(ddtML(baseML0), dBaseML)),
        ],
      });
    } else if (kind === "power") {
      const r = basis.exp.r;
      const generic = eq(
        ddtML(msup(T, mi("n"))),
        mrow(mi("n"), msup(T, mrow(mi("n"), mo(MINUS), mn(1)))),
      );
      steps.push({
        label: "Power rule",
        segs: [
          ml(generic),
          ", so ",
          ml(
            eq(
              ddtML(baseML0),
              mrow(
                signedRatML(r),
                ...(r.q === 1 && Math.abs(r.p) === 1 ? [mo(DOT)] : []),
                msup(T, mrow(signedRatML(r), mo(MINUS), mn(1))),
              ),
              dBaseML,
            ),
          ),
        ],
      });
    } else if (kind === "exponential" && basis.base.type === "e") {
      steps.push({
        label: "Exponential",
        segs: [
          "The function ",
          ml(msup(mi("e"), T)),
          " is its own derivative: ",
          ml(eq(ddtML(baseML0), dBaseML)),
        ],
      });
    } else if (kind === "exponential") {
      const g = ["b", "a", "r"].find((x) => !used.has(x)) || "b";
      const gb = mi(g);
      const generic = eq(
        ddtML(msup(gb, T)),
        mrow(mi("ln"), mo(APPLY), paren(gb), mo(DOT), msup(gb, T)),
      );
      steps.push({
        label: "Exponential",
        segs: [
          "For a positive base ",
          ml(gb),
          ": ",
          ml(generic),
          ", so ",
          ml(eq(ddtML(baseML0), dBaseML)),
        ],
      });
    } else {
      steps.push({
        label: basis.type === "sin" ? "Sine" : "Cosine",
        segs: [ml(eq(ddtML(baseML0), dBaseML))],
      });
    }
    if (scaled) {
      steps.push({
        label: "Put it together",
        segs: [ml(eq(dDep, mrow(scaleML, mo(DOT), paren(dBaseML)), exprML(dTerms)))],
      });
    } else {
      steps.push({ label: "Answer", segs: ["So ", ml(eq(dDep, exprML(dTerms)))] });
    }
  }

  // --- common mistakes (checked in order; first match wins) --------------------
  const mistakes = [];
  const addMistake = (expr, message) => mistakes.push({ expr, message });
  addMistake(
    exprJs([{ c: cneg(d.c), b: d.b }]),
    basis.type === "sin"
      ? "Check the sign: the derivative of sin(t) is cos(t), with no minus sign."
      : basis.type === "cos"
        ? "Check the sign: the derivative of cos(t) is −sin(t)."
        : "Check the sign.",
  );
  if (shift) {
    addMistake(
      exprJs([d, shiftTerm]),
      "Almost! The constant term (a vertical shift) doesn't change the derivative, so leave it out.",
    );
  }
  if (!isOneCoef(scale)) {
    addMistake(
      exprJs([dBase]),
      "Don't forget the vertical scaling: multiplying by a constant multiplies the derivative by that constant.",
    );
  }
  if (kind === "linear") {
    addMistake(
      exprJs([main]),
      "The derivative of a linear function is just its slope, a constant (no t).",
    );
  } else if (kind === "power") {
    const msg1 =
      "Power rule: multiply by the exponent, then lower the exponent by 1.";
    if (basis.exp.param) {
      const n = basis.exp.param;
      addMistake(exprJs([{ c: scale, b: powParam(n, rat(-1)) }]), msg1);
      addMistake(
        exprJs([{ c: cmul(scale, coef(rat(1), [paramSym(n)])), b: basis }]),
        "Power rule: after multiplying by the exponent, lower the exponent by 1.",
      );
    } else {
      const r = basis.exp.r;
      const lower = radd(r, rat(-1));
      const raise = radd(r, rat(1));
      addMistake(exprJs([{ c: scale, b: lower.p === 0 ? ONE : pow(lower) }]), msg1);
      addMistake(
        exprJs([{ c: cmul(scale, coef(r)), b: basis }]),
        "Power rule: after multiplying by the exponent, lower the exponent by 1.",
      );
      addMistake(
        exprJs([{ c: cmul(scale, coef(r)), b: raise.p === 0 ? ONE : pow(raise) }]),
        "Power rule: lower the exponent by 1 (don't raise it).",
      );
    }
  } else if (kind === "exponential") {
    if (basis.base.type !== "e") {
      addMistake(
        exprJs([main]),
        "The derivative of bᵗ is ln(b)·bᵗ. Don't forget the factor ln(b).",
      );
    }
    addMistake(
      `(${coefJs(scale)})*t*${baseJs(basis.base)}^(t-1)`,
      "This is an exponential function (t is in the exponent), so the power rule doesn't apply.",
    );
  }
  addMistake(exprJs(fTerms), "That's the original function. Now take its derivative.");
  if (shift) {
    addMistake(
      exprJs([main]),
      "That's the function without its constant term. Now take its derivative.",
    );
  }

  // --- sample points for checking answers ---------------------------------------
  const samples = [];
  const draw = ([lo, hi]) => lo + (hi - lo) * rng();
  for (let i = 0; i < SAMPLE_COUNT; i++) {
    const scope = { t: draw(SAMPLE_RANGES.t) };
    params.forEach((p) => {
      scope[p.name] = draw(SAMPLE_RANGES[p.role]);
    });
    samples.push(scope);
  }

  return {
    kind,
    dep,
    params,
    options,
    fTerms,
    dTerms,
    functionJs: exprJs(fTerms),
    answerJs: exprJs(dTerms),
    functionPlain: exprPlain(fTerms),
    answerPlain: exprPlain(dTerms),
    question,
    note,
    answerML: wrapMath(answerML),
    steps,
    mistakes,
    samples,
    constantsText: params.length ? listNames(params.map((p) => p.name)) : "",
  };
};

// ---------------------------------------------------------------------------
// Reading and checking a typed answer
// ---------------------------------------------------------------------------

// (No "tan": no answer needs it, and "tan" would swallow t*a*n.)
const FUNCTIONS = ["sqrt", "sin", "cos", "exp", "ln", "log"];
// Longest names first, so "sqrt" wins over "s", "q", ...
const NAMES = [...FUNCTIONS, "pi"].sort((a, b) => b.length - a.length);

const normalize = (input) => {
  let s = String(input)
    .replace(/[−–—]/g, "-")
    .replace(/[·×⋅∙]/g, "*")
    .replace(/π/g, "pi")
    .replace(/√/g, "sqrt")
    .replace(/²/g, "^2")
    .replace(/³/g, "^3")
    .replace(/÷/g, "/")
    .replace(/\*\*/g, "^")
    .replace(/[[{]/g, "(")
    .replace(/[\]}]/g, ")");
  // "dP/dt = 4t" or "P' = 4t": keep what follows the last "="
  const eqAt = s.lastIndexOf("=");
  if (eqAt >= 0) s = s.slice(eqAt + 1);
  return s.trim();
};

/** Split into numbers, single-letter names, known names and operators. */
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
    const word = /^[A-Za-z]+/.exec(s.slice(i));
    if (word) {
      const run = word[0];
      let j = 0;
      while (j < run.length) {
        const name = NAMES.find((n) => run.startsWith(n, j));
        if (name) {
          tokens.push({ t: FUNCTIONS.includes(name) ? "fn" : "id", v: name });
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

/** Add explicit * and the parentheses of "sin t", "ln 2", "sqrt t". */
const prepare = (tokens) => {
  const out = [];
  const isValue = (tk) => tk && (tk.t === "num" || tk.t === "id" || (tk.t === "op" && tk.v === ")"));
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

const tokensToJs = (tokens) => tokens.map((tk) => tk.v).join("");
const tokensToReadable = (tokens) =>
  tokens
    .map((tk, i) => {
      if (tk.t === "id" && tk.v === "pi") return "π";
      if (tk.t === "fn" && tk.v === "log") return "ln";
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
 * Parse a typed answer. Returns {compiled, readAs} or {error, readAs}.
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
  let node;
  try {
    node = math.parse(tokensToJs(tokens));
  } catch {
    return {
      error: "I couldn't read that. Check your parentheses and operators.",
      readAs,
    };
  }
  const fnNames = new Set(
    node.filter((n) => n.isFunctionNode).map((n) => n.fn.name ?? n.name),
  );
  const allowed = new Set(["t", "e", "pi", ...problem.params.map((p) => p.name)]);
  const symbols = node
    .filter((n) => n.isSymbolNode)
    .map((n) => n.name)
    .filter((name) => !fnNames.has(name) || !FUNCTIONS.includes(name));
  for (const name of symbols) {
    if (allowed.has(name) || FUNCTIONS.includes(name)) continue;
    if (name === "T") return { error: "Use a lowercase t for time.", readAs };
    if (name === problem.dep)
      return {
        error: `Write your answer in terms of t (and any constants), not ${problem.dep}.`,
        readAs,
      };
    if (/^[a-z]$/.test(name))
      return { error: `This problem doesn't have a constant called ${name}.`, readAs };
    return { error: `I don't recognize “${name}” here.`, readAs };
  }
  try {
    return { compiled: node.compile(), readAs };
  } catch {
    return {
      error: "I couldn't read that. Check your parentheses and operators.",
      readAs,
    };
  }
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

const EXACT = 1e-8;
const ROUNDED = 5e-3;
const compileCache = new Map();
const compileJs = (js) => {
  if (!compileCache.has(js)) compileCache.set(js, math.parse(js).compile());
  return compileCache.get(js);
};

/**
 * Check a typed answer.
 * Returns {status: "correct" | "close" | "incorrect" | "error", message, readAs}.
 */
export const checkAnswer = (problem, input) => {
  const parsed = parseAnswer(input, problem);
  if (parsed.error)
    return { status: "error", message: parsed.error, readAs: parsed.readAs };
  const { compiled, readAs } = parsed;
  const correct = compileJs(problem.answerJs);
  const diff = maxRelativeDifference(correct, compiled, problem.samples);
  if (diff < EXACT) return { status: "correct", message: "Correct!", readAs };
  if (diff < ROUNDED && /\.\d/.test(String(input))) {
    return {
      status: "close",
      message:
        "Very close, but you used rounded decimals. Give the exact answer (for example ln(2), not 0.693).",
      readAs,
    };
  }
  for (const m of problem.mistakes) {
    const wrong = compileJs(m.expr);
    if (maxRelativeDifference(correct, wrong, problem.samples) < EXACT) continue;
    if (maxRelativeDifference(wrong, compiled, problem.samples) < EXACT)
      return { status: "incorrect", message: m.message, readAs };
  }
  // "t^n-1" or "t^-3/2": right answer, but the exponent needs parentheses.
  const EXPONENT = /\^\s*(-?\s*[\w.]+(?:\s*[-+/]\s*[\w.]+)+)/g;
  if (EXPONENT.test(String(input))) {
    const fixed = parseAnswer(String(input).replace(EXPONENT, "^($1)"), problem);
    if (
      fixed.compiled &&
      maxRelativeDifference(correct, fixed.compiled, problem.samples) < EXACT
    ) {
      return {
        status: "incorrect",
        message:
          "Almost! Put parentheses around the whole exponent, as in t^(n-1) or t^(-3/2).",
        readAs,
      };
    }
  }
  return {
    status: "incorrect",
    message: "Not quite. Try again, or use Show method for a hint.",
    readAs,
  };
};
