# Modeling Synthesizer — Review Task List

*Review date: September 23, 2026. Covers the latest commit (`71ba02d`, "Add Minimal Insulin-Glucose Simulator tool").*

**What was reviewed:** all 36 registered tools (32 student-facing, 4 dev), the shared grid and UI components, the utilities, the MathML equations, the help files, the registry, the build and deploy setup, and the docs.

**How it was reviewed:**

- Ran `vite build` (it succeeds) and `eslint` (126 problems).
- Read every tool's source.
- Re-implemented the key models in Node scripts to check the math. Items marked ✔ were **verified numerically**; the rest come from reading the code.

**Priority key:**

- **P1**: students see wrong results, broken behavior, or an incorrect statement of math or biology.
- **P2**: a noticeable problem, misleading text, or a significant maintainability issue.
- **P3**: polish or a nice-to-have.


## Status & decisions (kept current while work proceeds)

**Legend:** `[x]` done · ⏸ deferred, needs Marty's decision · 🧪 done, please test in the browser · each item has an ID like `#012`.

**Progress (Sep 23, 2026):** Phase A (shared components, utilities, app shell, build, docs) and phase B (every tool + its help file) are done and committed to local `main`. 211 unit tests pass, lint is clean, and every tool loads without console errors in light and dark themes. Remaining: items marked ⏸ (your decisions — see §6) and ◐ partials. Nothing has been pushed.

**Decisions (Sep 23, 2026):**
- Work is committed to local `main`. Nothing is pushed; Marty pushes (which deploys) after testing.
- **Constraint:** no change may break the Lab Manual (v3.0) instructions on the pages that refer to a tool.
- Glycolysis model/defaults/help: ⏸ left for later — only code bugs fixed.
- Insulin display: ×100 pmol/L (pM) in both insulin tools.
- Dead code/files may be removed.
- Not approved (⏸): Gentamicin PK/target changes, changed defaults (Holling–Tanner c, Leslie prefill, Hutchinson β range), renaming the Yule tool.
- Pedagogy ideas (§5): ⏸ awaiting Marty's feedback.
- Brownian E(d²) = 2k_BT·t/(3πrη): already fixed by Marty on GitHub (commits 90238e7, edc43af, db83c7d).

---

## 0. Fix first (student-facing P1s)

These are the items where a student currently sees something **wrong**.

- [x] `#001` **Brownian motion: expected displacement is off by a factor of 2.** The equation and the expectation circle use the 1-D formula E(d²) = 2Dt = k_BT·t/(3πrη). The simulation is 2-D, where E(d²) = 4Dt = 2k_BT·t/(3πrη). As a result the circle is √2 too small, and a student fitting d² vs t gets k_B wrong by 2×. ✔
  - Files: `src/equations/brownian-expected-displacement.mathml`, `BrownianMotionSimulator.jsx:233-236`, `public/help/brownian-motion.md:23,45`. Line 45 also drops *r*: "D = kT/6πη".
- [x] `#002` **Atmospheric molecule: the amber "expected" curve is off by a factor of 2.** For a reflected random walk, the scale height is σ²/(2|μ|); the code uses `variance / drift`. The bars never converge to the line, which contradicts the help. ✔
  - Fix: `scaleHeight = variance / (2 * drift)` (`AtmosphericMoleculeSimulator.jsx:206`).
- [x] `#003` **Genetic drift: the help gets the effect of "Births" backwards.** Survivors are drawn without replacement from a pool of N(1+b), so *more* births give *stronger* drift. For example, P(fixation within 300 gens) is 0.009 at b = 0.1 and 0.91 at b = 10. ✔
  - File: `genetic-drift.md:19,42`.
- [ ] `#004` ⏸ *(glycolysis left for later)* **Glycolysis: the defaults sit exactly on the Hopf point, so no sustained limit cycle is visible.** In this Sel'kov form the Hopf point is k³ = cv², and v = c = k = 1 is exactly on it. Near the equilibrium, orbits shrink slowly; farther away they escape to F → ∞. A stable cycle exists only for about 1 < k < 1.07, and there it leaves the plotting box. ✔
  - The help's "settle onto a closed loop" is therefore false.
  - Fix: switch to the Strogatz Sel'kov form (x′ = −x + ay + x²y, y′ = b − ay − x²y), or at least change the defaults and the help.
- [x] `#005` 🧪 *(classified from the Jacobian; default c unchanged)* **Holling–Tanner: the coexistence equilibrium is always labeled "Unstable focus".** At the defaults it is a **stable spiral**, and the help's "trajectories converge to a closed orbit" is false. ✔
  - Fix: classify the equilibrium by the Jacobian. Set default c = 1.0, which gives a limit cycle that fits in the window. ✔
  - Related: the "No coexistence equilibrium" branch can never run, because (0,0) is always in the list, and the panel can then show (0,0) as S*, T* (`HollingTannerTool.jsx:256, 847-869`).
- [x] `#006` **Shark–Tuna trajectories: several problems with orbits and labels.**
  - The Lotka–Volterra interior equilibrium is labeled "stable"; it is a **center** (`:173,179`).
  - Orbits freeze permanently when S or T exceeds 50. The default click at (2,2) reaches about 65–73, so students see orbits stop instead of close. ✔ (`:352`)
  - The help swaps the meanings of p and q, and gives δ's range as 0–4 when the code uses 0–1.
- [ ] `#007` ⏸ *(Gentamicin PK not approved)* **Gentamicin: the pharmacokinetics are wrong in three ways.**
  1. The infusion ramps linearly with no elimination, so infusion duration never changes the peak, contrary to the help. ✔
  2. "Toxic > 12 mg/L" is applied to the whole curve. The default once-daily regimen, with a peak around 17, is flagged toxic even though toxicity is mainly trough-driven. The help's "maintain adequate trough levels for efficacy" is backwards.
  3. "Trough" reports the *first* trough, not the steady-state trough. For example it shows 15.4 when the steady-state value is 52.6. ✔
- [x] `#008` **Insulin units are inconsistent between the two insulin tools.** The full tool converts `I*6` "pmol/L" (baseline about 3 pmol/L, implausibly low); the minimal tool uses `I*100`. Pick one scale for both (`InsulinGlucoseTool.jsx:98` vs `MinimalInsulinGlucoseTool.jsx:60`).
- [x] `#009` **GridGraph tick labels can show wrong numbers.** `formatTickLabel` truncates to 4 characters: −1000 → "-100", 15000 → "2e+4", −0.25 → "-0.3", 0.001 → "0.00". ✔
  - If a tool passes a string tick, it throws a TypeError. The 1D Calculator crashes when Xmin = −10. ✔
  - Fix: use step-aware precision, and never truncate digits (`GridGraph.jsx:161-185`).
- [x] `#010` 🧪 *(log ticks now in range, in log units)* **Linear Regression: this is the cause of the "tick misalignment" you noted.** `generateLogTicks` returns integer ticks *outside* the axis range. For example, the range is [0.24, 1.63] but the ticks are 0, 1, 2, so they are drawn off the axes. ✔ Keep only in-range ticks and add 2×/5× ticks (`LinearRegressionLogScalingTool.jsx:163-173`).
- [x] `#011` **Yule Process has no help file.** The (?) button shows "not found". An outline is in §3 below.
- [x] `#012` 🧪 *(Tailwind v3.4 now compiled at build time; CDN removed)* **Styling depends on the Tailwind *Play CDN* (`cdn.tailwindcss.com`, marked "not for production").** `src/index.css` uses v3 `@tailwind` directives under the v4 PostCSS plugin, so the built CSS contains almost none of the utility classes. If the CDN is slow or blocked (school networks, offline), the whole app is unstyled.
  - Fix: switch to `@import "tailwindcss";` (and port `tailwind.config.js`), confirm that `dist/` CSS contains the classes, then remove the CDN script (`index.html:99`).
- [x] `#013` **Help files with wrong math claims.** Each is detailed in its tool section:
  - SHO: period, which extreme is where, the u/k effect, and buttons that don't exist.
  - Hutchinson: the stability regimes.
  - Discrete logistic: says β < 1 decays to 0, and gives the wrong equilibrium formula.
  - Trajectory practice: the two phase-plane rules are wrong.
  - Discrete modeling practice: "percentages < 100% indicate decay".
  - Growth–collapse: "collapses cascade".
  - Two-compartment: every default and range is out of date.
  - Logistic explorer: the b range is wrong.
  - 1D Calculator: the X_tau example never oscillates.
  - Dynamical Systems Calculator: "case insensitive" and the Pause description are wrong.

---

## 1. Cross-cutting / shared infrastructure

### Animation and state patterns (these recur in many tools)

- [x] `#014` **P1 Stale rAF closures.** Most animated tools call `requestAnimationFrame(animationLoop)` with the closure from the render that started it. Theme or parameter changes during a run are ignored, and in the Dynamical Systems Calculator, particles keep following the *old equations*.
  - Fix: use one shared pattern: `loopRef.current = animationLoop` plus a guarded `ensureLoop()`/`stopLoop()` that always sets `animationId = null`.
  - Affected: DynamicalSystems, GLV, SHO, FHN, Hutchinson, Glycolysis, Brownian.
- [x] `#015` **P1 Double loops and loops that won't restart.**
  - Pressing Start while click-trajectories are running launches a second loop (double speed).
  - Pause doesn't null `animationId`, so new clicks never restart the loop.
  - Hutchinson "Solve" pressed during a run stacks loops.
  - Affected: DynamicalSystems, GLV, Hutchinson, Coin flipper.
- [x] `#016` **P1 Reset doesn't clear the dynamic canvas.** Old trajectories stay visible. Affected: Holling–Tanner, Shark–Tuna trajectories. GLV already has the fix.
- [x] `#017` **P2 Trajectories freeze once they leave the plot window**, which hides closed orbits and limit cycles. Keep integrating off-screen and clip only the drawing. Affected: HT, Shark–Tuna, SHO, Glycolysis.
- [x] `#018` **P2 Trail and time-series buffers are capped by *sample count*, not time.** Windows end up half-empty, or orbits never close. Examples: SHO shows 24% of an orbit; FHN shows under half a cycle. Trim by time instead.
- [x] `#019` **P2 Animation speed is tied to frame rate.** Physics steps once per frame, so 120 Hz displays run about 2× faster and get different counts. Self-Interaction gets 1.75× the hits ✔. Scale by the rAF timestamp.
  - Affected: Self-Interaction, Brownian, Atmospheric, DynamicalSystems, Three-Compartment, Two-Compartment.
- [x] `#020` **P2 Stale results after parameter edits.** Axes, titles, and bar scaling read the *live* inputs but draw the previous run's data. Store the run's parameters with its results.
  - Affected: Coin flipper, Growth–collapse, Yule, Genetic drift, Two-compartment, Three-compartment.
- [x] `#021` **P2 Stability is hard-coded rather than computed** (HT "unstable", Shark–Tuna "stable", Glycolysis "unstable"), or not shown at all (FHN, SHO). Move GLV's Jacobian trace/det classifier to `src/utils` and use it everywhere.
- [x] `#022` **P2 Idle loops run forever.** Loops keep running after every trajectory is inactive, and there's no consistent Pause/Stop. Standardize: Start/Pause/Reset, with auto-stop when idle.

### Shared components

- [x] `#023` **P2 `GridButton` ignores its `w`/`h` props** (hard-coded 1×1, `GridButton.jsx:111-112`). The w = 2/3 buttons in Brownian, MuscleTremor, SharkTunaInteraction, and Yule render as 1×1 next to an empty cell. CLAUDE.md also documents `w={2}`.
- [x] `#024` 🧪 *(status/equation text now really uses small/xs sizes — check readability)* **P2 `GridDisplay` `fontSize="small"|"large"|…` does nothing.** The value is inserted raw as a CSS class (53 uses). Map names to `text-xs`/`text-sm`, as `GridLabel` does (`GridDisplay.jsx:114`).
- [x] `#025` **P2 `GridSliderHorizontal` click mapping is off.** The knob is drawn over `trackWidth−24` but clicks map over `trackWidth`, so clicking the knob changes the value (e.g., 0 → 4) ✔. It also silently ignores `min`/`max` props, which caused the Logistic "b 0–2" help error (`:170-186, 318`).
- [x] `#026` **P2 `GridGraph` padding is sized from `tick.toString()`, not the displayed label.** A tick like 0.30000000000000004 reserves about 124 px (`:57-63`).
- [x] `#027` **P2 `GridGraphDualY` renders ticks raw.** There is no formatter, so float noise shows. Share one tick formatter and one padding helper across GridGraph, GridGraphDualY, and GridTimeSeries.
- [x] `#028` **P2 `GridTimeSeries` runs a permanent 60 fps rAF loop** to redraw static data (CPU/battery drain). It also ignores tick props passed by tools, and sits about 4 px off GridGraph's plot area.
- [x] `#029` **P2 `GridTableInput` compacts empty rows on every keystroke.** The cursor jumps and entries move rows (Linear Regression). It also re-initializes its rows when `columns` change, which caused the Leslie theme-wipe bug.
- [x] `#030` 🧪 *(typed numbers now apply on Enter/Tab/click-away)* **P2 `GridInput`: debug `console.log` spam** (`:114-185`). Also:
  - Integer inputs aren't rounded, so N = 50.5 flips 51 coins while the expectations use 50.5.
  - Decimal places come from the range, not the step.
  - Every keystroke fires `onChange`. Commit on blur/Enter instead.
  - The range prints as "-2-2"; use "−2 to 2".
- [x] `#031` **P3 `GridEquationInput`: the allowed-character regex lacks `,`**, so `pow(X,2)` and `max(X,Y)` are flagged red.
- [x] `#032` **P3 `GridWindow` ignores `title` (only `tooltip`).**
- [x] `#033` **P3 Theme detection by color substring** (`theme.component.includes("gray-700")`) in about 15 components, contrary to CLAUDE.md. Use `useTheme().currentTheme`.
- [x] `#034` **P3 Wrong `backgroundSize` on noise textures.** `"cover, 64px 64px"` with a single `url()` layer stretches the noise instead of tiling it.
- [x] `#035` **P3 `GridGraph` defaults its axis labels to "tuna"/"sharks".** Default them to `""`.

### Rendering, accessibility, responsiveness

- [x] `#036` *(shared components done; tool canvases in phase B)* **P2 No `devicePixelRatio` scaling on any canvas.** Everything is blurry on Retina/HiDPI screens. Add a shared `setupCanvas(canvas)` helper.
- [x] `#037` 🧪 *(buttons/sliders keyboard + touch; help modal is a proper dialog)* **P2 Keyboard and screen-reader access.**
  - Buttons are `<div>`s with no role, tabIndex, or key handling.
  - Sliders have no `role="slider"`, ARIA values, or arrow keys, and are mouse-only, so they don't drag on tablets.
  - Help modal: no `role="dialog"` or focus trap.
  - Fix: use pointer events, real `<button>`s, and ARIA.
- [x] `#038` 🧪 *(tools scale down in narrow windows)* **P2 Fixed-pixel `ToolContainer`** (up to 1250 px wide) overflows on laptops, tablets, and split screen. Scale with `transform: scale(min(1, available/needed))`.
- [x] `#039` 🧪 **P2 Flash on every navigation.** Theme and tool are read from the URL in an effect, so dark-mode users get a white flash on every navigation, and direct links flash the menu first. Initialize state lazily from `URLSearchParams`.
- [ ] `#040` ◐ *(light touch — dashed second series in many tools)* **P3 Color-only encoding** throughout (glucose/insulin, nullclines, the gentamicin bands). Add line styles for color-blind students.
- [x] `#041` **P3 Pressing `?` opens help even while typing in an input.** Ignore it when the target is an input.
- [ ] `#042` ◐ *(tab titles done; title font is a look decision for Marty)* **P3 Hard-to-read titles and a generic tab title.** Tool titles use the Dancing Script cursive. Set `document.title` per tool.

### Utilities / parser

- [x] `#043` **P2 `ln` is whitelisted but math.js has no `ln`.** `ln(X)` errors ✔. Fix with `math.import({ ln: math.log })`.
- [x] `#044` 🧪 *(new student-facing parser messages)* **P2 Parser error messages leak math.js internals.**
  - `X(1-X)` gives "'X' is not a function"; `kX` gives "Undefined symbol kX".
  - Lowercase `x` gives "Undefined symbol x".
  - `t` gives "use uppercase T" even though T isn't valid either.
  - "Declare parameters: [k, X_tau]" asks for something students can't do.
  - Fix: add a friendly error layer and auto-insert `*` before `(`. The 2D and 1D validators are duplicated; share one.
- [x] `#045` **P1 `mathHelpers` root finding has three problems.** ✔
  1. It misses tangent roots that fall on a grid point: `(X-0.2)^2` on the default window reports **no equilibrium**.
  2. It reports sign changes across poles as equilibria: `tan X` gives ±π/2 "stable".
  3. Its absolute 1e-6 tolerances give wrong roots for small k (0.0005 instead of 0), and flag `X^4` as "X′ = 0 on an interval".
  - Fix: use scaled tolerances and bisect on interval width.
- [x] `#046` **P3 `calculateLinearRegression` returns NaN with `isValid: true`** when all x are equal. Use mean-centred sums.
- [x] `#047` *(shared randomNormal added; tools switch over in phase B)* **P3 Box–Muller can hit `Math.log(0)`.** Use `1 - Math.random()` (Brownian, Atmospheric).

### Build, deploy, performance

- [x] `#048` **P2 One 1.1 MB JS chunk.** Every tool, plus math.js and the dev tools, is imported eagerly and re-parsed on every full-reload navigation. Use `React.lazy(() => import(...))` per tool.
- [x] `#049` **P2 `deploy.yml` uses Node 18 (EOL).** Move to 22. PR runs also get `pages: write`; split into build (PR) and deploy (main) jobs and add a lint step.
- [x] `#050` **P2 The sitemap lists only 10 of 32 student tools**, and `lastmod` is 2025-01-27. Generate it from `tools.js` at build time.
- [x] `#051` **P3 Dev tools reachable by students.** `?tool=component-test` etc. open without `?dev=true`, because `getToolById` ignores visibility. Gate them behind `import.meta.env.DEV`.
- [x] `#052` **P3 `?tool=<unknown>` shows only "Tool not found".** Add a Back link.
- [x] `#053` 🧪 *(new favicon from Logo.png, social preview image)* **P3 Metadata and SEO cleanup.**
  - The favicon is the Vite logo (`Logo.png` is unused).
  - There's no `og:image`.
  - The static canonical URL contradicts the per-tool sitemap entries.
  - `google…html` sits at the repo root instead of in `public/`.
- [x] `#054` **P3 `npm run deploy` (gh-pages) is obsolete now that Pages deploys via Actions.** Remove it, or document why it's kept.

### Registry (`src/data/tools.js`)

- [x] `#055` **P2 Yule description.** A Yule process is *pure birth*; with deaths it's a birth–death (Galton–Watson) process. Rename it, or say "Yule process with death".
- [x] `#056` **P2 `self-interaction-simulator` has `topics: []`**, so it appears under no topic.
- [x] `#057` **P3 Other description fixes.**
  - "Einstein-Stokes" → "Stokes–Einstein" (also in the README).
  - SHO "circular trajectories" → "elliptical".
  - Tree ring "using z-scores": no z-score is shown.
  - 2D matrix "in real time": it's step-by-step.
  - Shark–Tuna Interaction "real-time predation events": it's a single random placement.
- [ ] `#058` ⏸ *(needs Marty)* **P3 Confirm lab assignments.**
  - These have no lab: DynamicalSystems, LinearRegression, DiscreteModelingPractice, TrajectoryPractice.
  - Gentamicin is in "Growth".
  - Discrete logistic (deterministic chaos) is in "Randomness".
  - Ion channel and Two-compartment (stochastic) are in "Order".
  - The Lab 6 description in CLAUDE.md doesn't match its tools.
- [x] `#059` **P3 The menu shows only the first topic and first lab tag**, so insulin-glucose shows only "Lab 1". `getToolsByCategory`, `searchTools`, and `getAllTools` are unused, and one checks only `.lab`.

---

## 2. Per-tool tasks

### Lab 1–2: Physiology & pharmacokinetics

**insulin-glucose** (`InsulinGlucoseTool.jsx`)
- [x] `#060` P1 Fix the insulin unit scale (see §0).
- [x] `#061` 🧪 *(σ slider dimmed while α = 0)* P2 σ only affects the liver term and α defaults to 0, so the σ slider does nothing at the defaults. Default α > 0, or disable σ when α = 0.
- [ ] `#062` ◐ *(minimal tool uses RK4; full tool keeps Euler with safe substeps — see #243)* P2 Explicit Euler with dt = 0.1 goes unstable at large inputs, and the `Math.max(0,…)` clamp shows fake hypoglycemia ✔. G is also silently capped at 12. Use RK4 with the delay buffer, and show off-scale markers.
- [x] `#063` P2 Help: "c = half-max insulin level" is wrong; half-max is at I = c/k.
- [x] `#064` P3 The meal pulse is truncated at 0.37·peak (it jumps on and off) and its area is small. The legend overlays the data. The help has 11 `[VERIFY]` markers and empty References.

**insulin-glucose-minimal** (`MinimalInsulinGlucoseTool.jsx`)
- [x] `#065` P2 Same Euler/clamp issues, and silent caps at 12 mmol/L and 200 pmol/L.
- [x] `#066` P3 The legend covers the snack marker at t = 13. Group all four scenario buttons together. The help has 7 `[VERIFY]` markers.

**caffeine-metabolism**
- [x] `#067` P2 Help says the equation shown is dC/dt = −μC; the tool shows C′ = Intake − μC.
- [x] `#068` 🧪 P2 μ can be 0 and stacked doses reach 600 mg, overflowing the fixed y-range [0, 320]. Set a μ floor of about 0.05, auto-scale y, and show t½ = ln2/μ. The default t½ is 3.5 h; the typical adult value is about 5 h.
- [x] `#069` P3 Help: "concentration (mg)" is an amount, not a concentration. Also "selects the hour" (it's 15-minute steps). `[VERIFY]` markers remain.

**gentamicin-dosage**
- [ ] `#070` ⏸ *(not approved)* P1 Infusion model, peak/trough targets, and steady-state trough (see §0).
- [ ] `#071` ⏸ *(not approved)* P2 yRange [0, 20] clips the curve. "Frequency: 18.0 hrs" is really the dosing *interval*; snap it to clinical intervals (q6/8/12/24/36/48).
- [x] `#072` P3 The code comments are wrong: the defaults are not at "3/4" or "center", and Vd is 14.3 L, not 17.5 L. Consider a weight input (Vd ≈ 0.25 L/kg).

**glycolysis** (Higgins–Sel'kov)
- [ ] `#073` ⏸ *(left for later)* P1 Model and defaults (see §0). Show trace/det and the Hopf condition k³ = cv² in the status panel; that's the key teaching point.
- [x] `#074` P2 Reset doesn't clear `periodData`, so the tool can show "Detected Period: −47.20". Period detection also mixes crossings from different trajectories.
- [ ] `#075` ⏸ *(left for later)* P2 Help: "Shows the differential equations with current parameter values" is false; the MathML is symbolic.
- [ ] `#076` ◐ *(x-ticks and auto-stop done; model items deferred with glycolysis)* P3 A = 0 is also an A-nullcline. The time series has no x-ticks. The c slider default isn't centered. The loop keeps running after every trajectory has left the box.

### Lab 1, 3, 4: Ecology

**holling-tanner**
- [x] `#077` P1 Stability label, defaults, the coexistence-equilibrium branch, and Reset leaving the canvas uncleared (see §0 and §1).
- [x] `#078` P2 The S/(qT) singularity at T = 0 blows up RK4 (a click at T = 0.02 jumps to T ≈ 3e7 ✔). Floor T at ε.
- [x] `#079` P2 The legend says "Red lines: Nullclines", but the S-nullcline is blue.
- [x] `#080` P2 q's tooltip "Shark carrying capacity" is wrong; q is sharks supported per tuna.
- [x] `#081` 🧪 *(new Pause/Resume button)* P2 The time series has no ticks and follows whichever trajectory is "first active". There's no Pause.
- [x] `#082` P3 Help: "ratio-dependent" → Leslie–Gower. `holling-tanner-system.mathml` is unused.

**shark-tuna-trajectory**
- [x] `#083` P1 Center vs "stable", the freeze at 50, p/q swapped in the help, δ range, and Reset (see §0).
- [x] `#084` P2 The time-series colors have no legend and aren't theme-aware.
- [x] `#085` P2 p = 0 or q = 0 displays "Infinity".
- [x] `#086` P3 Dead code (`_vectorField`, `_equilibria`). The title differs from the registry name. Help: "circular" → "closed orbits".

**shark-tuna-interaction**
- [x] `#087` P2 Cells are placed at `x/20` instead of `(x+0.5)/20`, so row and column 0 are half-clipped.
- [x] `#088` P2 The tooltip "`${tuna.length} survived`" shows the total, not the survivors.
- [x] `#089` P2 The help uses βST; the companion tool uses p/q.
- [ ] `#090` ⏸ *(pedagogy idea)* P3 Idea: a "Run 100 trials" button that plots mean encounters vs S·T, to show mass action.

**generalized-lotka-volterra**
- [x] `#091` P1 Double loop / Pause bugs (see §1).
- [x] `#092` P1 Tooltips: u is "(P effect on P)" and v is "(Q effect on Q)"; they're actually the Q→P and P→Q effects (`:1220, 1233`).
- [x] `#093` P2 Help claims the panel lists every equilibrium with its stability; it doesn't.
- [x] `#094` P2 Help's "Hopf bifurcation" claim is misleading: 2-species LV has no limit cycles.
- [x] `#095` P2 A zero discriminant is labeled "Non-hyperbolic"; it's a degenerate node and still hyperbolic.
- [x] `#096` P2 The Competition preset is bistable, but its stable point (9, 0) lies outside Pmax = 5 ✔. Widen the axis and explain in the help.
- [x] `#097` 🧪 *(Pause freezes grid particles only — see #252)* P2 "Pause" actually clears the particles. Equilibria and particle trails share a color.
- [x] `#098` P3 Accumulated float ticks produce labels like "0.6000000000000001". The preset comments are wrong. The lint warning at 302 is a false positive.

**logistic-growth-explorer**
- [ ] `#099` ◐ *(help now states the real range 0–1; the range itself is #237)* P1 Help: b range "0–2"; the actual range is 0–1, because the slider ignores min/max.
- [x] `#100` P2 t₀ is limited to 0–30 even when the data lies elsewhere.
- [x] `#101` P2 Help: "lag phase" and "exponential phase around t₀" are wrong. t₀ is where the growth *rate* peaks, at P = C/2.
- [ ] `#102` ◐ *(RSS fits its box; example-data button is a pedagogy idea)* P3 Add a "Load example data" button (Gause yeast/Paramecium). RSS formatting overflows its box. C is styled bold-italic in the MathML (parameters should be italic).

**self-interaction-simulator**
- [x] `#103` P1 Hit counts depend on frame rate (1.75× more at 120 Hz ✔).
- [x] `#104` P1 Stop → Start re-initializes the particles instead of resuming. The help says "timer continues"; it doesn't.
- [x] `#105` P2 Changing the theme or N mid-run resets the particles and hits.
- [x] `#106` P2 Help mentions a volume control; the sound component is only an on/off toggle.
- [ ] `#107` ⏸ *(pedagogy idea)* P3 Idea: plot hits vs N(N−1)/2 across runs.

### Lab 3–4: Calculators, oscillators, delay equations

**dynamical-systems-calculator**
- [x] `#108` P1 Particles follow the old equations after an edit, because of the stale closure (see §1).
- [x] `#109` P1 Arrow directions are normalized in data units, so they're wrong on non-square viewports (e.g., Y ∈ [−50, 50]).
- [x] `#110` P1 Help: "case insensitive" is false. "Pause freezes blue particles while red continue" isn't what happens.
- [x] `#111` P2 Invalid equations silently draw the fallback field X′ = Y, Y′ = −X. Draw nothing instead.
- [x] `#112` P2 Ticks `[xMin, 0, xMax]` draw a 0 tick outside the axes when 0 is out of range.
- [x] `#113` P3 Only about 31% of the "5625 particles" are on-screen, at 80k evaluations per frame (slow on Chromebooks). Axis labels are lowercase x/y while equations need uppercase X/Y.

**one-dimensional-calculator**
- [x] `#114` P1 A string tick crashes the tool when Xmin = −10 ✔.
- [x] `#115` P1 Tangent roots are missed and flat roots are flagged as degenerate intervals (see §1).
- [x] `#116` P1 Help example `k*X_tau*(1-X)` never oscillates. Use `k*X*(1-X_tau)`, and note that kτ ≤ 1 < π/2 means sustained oscillation needs a larger coefficient.
- [x] `#117` P2 Equilibrium ticks are placed at *rounded* values, so they're about 3 px off the equilibrium lines.
- [x] `#118` P2 The status box hides the other equilibria when a degenerate interval exists, and can overflow.
- [x] `#119` P2 At τ = 0, X_tau is held fixed across RK4 stages, which reduces the method to Euler.
- [x] `#120` P2 Help: "Dashed lines = equilibria" is wrong (solid = stable, dashed = unstable, dotted = semi-stable). Help says Euler–Maruyama; the drift is actually RK4.
- [ ] `#121` ◐ *(runs still stop at t = 10 (documented in help))* P3 Title mismatch ("Explorer" vs "Calculator"). The 2×1 error box clips messages. The simulation stops at t = 10.

**simple-harmonic-oscillator**
- [x] `#122` P1 Help is wrong in several places.
  - Maximum compression is at the left/right ends of the ellipse, not the top/bottom.
  - The period is T = 2π/√(uk) (a product, not a ratio).
  - The u/k stretching directions are swapped.
  - It lists Start/Pause/Clear buttons that don't exist.
- [x] `#123` P2 Help ranges say 0.1–2 and axes ±2; the code uses 0.01–3 and ±3.
- [x] `#124` P2 The time series keeps 500 samples, so the plot is half-blank after t = 10. The trail shows only 24% of an orbit.
- [x] `#125` *(theoretical period intentionally NOT shown (lab SHO3 asks students to find it))* P3 The legend is drawn at y = −10 (clipped). Period jitters ±0.02; show the theoretical 2π/√(uk) beside it. Speed quantizes below 0.75×. The spring window is blank before the first click.

**muscle-tremor-simulator** (the DDE integration checks out ✔)
- [x] `#126` P2 MathML shows L′ = r(20 − L_τ) with "r = 50", but the code uses r/1000 per ms. Give units, and write L(t − τ).
- [x] `#127` P2 Help: "L > 20 → arm angled upward" is backwards, and so are the code comments.
- [x] `#128` 🧪 *(see #249)* P2 "No oscillations detected" is shown for *damped* oscillations, including at the defaults. Report none/damped/sustained using aτ vs 1/e and π/2.
- [x] `#129` P3 False positive at r = 1 ("1.00 Hz"). The red delayed-state dot is undocumented. Button widths are asymmetric.

**fitzhugh-nagumo** (the model, equilibrium solver, and z ≈ 0.4 claim check out ✔)
- [x] `#130` P2 Equilibria have no stability labels. Add trace = 1 − X² − ub, det = u(1 − b(1 − X²)).
- [x] `#131` P2 The trail covers less than half the limit cycle (period ≈ 33.5).
- [x] `#132` P3 The speed slider changes dt. Presets don't clear old trajectories. Remove the resolved `[VERIFY]` and give a concrete bistability example. The lint xmin/ymin warnings are false positives.

**hutchinson-growth**
- [x] `#133` P1 Help's stability story is wrong. The regimes are: monotone for βτ < 1/e, damped for 1/e < βτ < π/2, sustained for βτ > π/2. "τ = 5 stable, smooth" is actually damped.
- [ ] `#134` ◐ *(P axis grows automatically; no log toggle (no room); τ range kept (lab needs τ up to 100))* P1 The suggested β = 0.1, τ = 30 peaks near 761 on a 300-max axis; βτ ≥ 5 is effectively extinction ✔. Auto-scale or add a log axis, and cap τ.
- [x] `#135` P2 Pressing Solve during a run stacks loops. The stale closure keeps drawing the old K line. k = 0 gives NaN; set a minimum above 0. The default β = 0.1 sits at slider max.
- [x] `#136` P3 Stop can't resume. The green dot is at (0, P₀), not the origin. The delayed value uses a step lookup; interpolate it.

**discrete-logistic-explorer** (Feigenbaum numbers check out ✔)
- [x] `#137` P1 Help: "β < 1 decays to 0" and "equilibrium 1 − 1/β" are wrong for this form of the map. Here P* = 1 is stable for 0 < β < 2.
- [x] `#138` P2 Help: "Period-2 for 2–2.5" contradicts line 81 (period 4 from 2.449). "P₀ doesn't affect attractors" fails for P₀ = 0 or P₀ > (1+β)/β.
- [x] `#139` P2 The bifurcation diagram is seeded from the P₀ slider, so P₀ = 1.4 blanks the chaotic region ✔. Always seed with 0.5.
- [ ] `#140` ◐ *(cobweb diagram is a pedagogy idea)* P3 Tick accumulation drops the last tick, and zooms narrower than 0.1 have none. Triangles are clipped. βmin == βmax gives NaN. Idea: add the cobweb diagram the registry implies.

### Study aides & data tools

**linear-regression-log-scaling** (the regression math checks out ✔)
- [x] `#141` P1 Log ticks outside the range (see §0).
- [x] `#142` P1 A stale `setTimeout` recalculation can overwrite the stats with the previous table (the stats lag one edit behind). Derive the stats with `useMemo`.
- [x] `#143` P2 Log minor gridlines are always base-10, even when base 2 or e is selected.
- [x] `#144` P2 The intercept shows "−1.78e-16"; snap near-zero values to 0.
- [x] `#145` P2 "Show RSS" does nothing unless the fit is on, and toggling a scale turns the fit off.
- [x] `#146` P2 Help: comparing R² across linear vs log fits is misleading (they're R² for different responses). "Adjust the fit" isn't possible in the tool.
- [ ] `#147` ⏸ *(pedagogy idea)* P3 Idea: show the back-transformed model (y ≈ A·bˣ, y ≈ A·xᵐ). A manual-line mode would make the RSS squares useful.

**discrete-modeling-practice** (answers verified correct over 100k samples ✔)
- [x] `#148` P1 77% of linear-decay problems go negative within the plot ("take away 7 apples from 5") ✔. Require initial ≥ 10·rate.
- [x] `#149` P1 Help: "percentages less than 100% indicate decay" is wrong (a 30% *increase* is less than 100%).
- [x] `#150` P2 The hidden graph's y-axis still reveals the answer's magnitude. The tool's "nice" ticks are never passed to the graph.
- [x] `#151` P2 Help writes ΔA = 4; the tool shows ΔA/Δt.
- [x] `#152` P3 The exponential MathML has an empty `<msup>` base. Negative rates are written with a hyphen inside `<mn>`. Define t's units. The loading canvas size differs from the tool's.

**trajectory-time-series-practice**
- [x] `#153` P1 Help: "one up, one down → horizontal/vertical" is wrong (it's diagonal). "Oscillations in sync → circle" is wrong (in-phase gives a line; a circle needs about a quarter-period shift).
- [x] `#154` P1 Spirals and circles use only 11 points, so they render as jagged polygons and zigzags. Sample about 200 points and mark integer times.
- [x] `#155` P2 The circle covers only 10/11 of a turn. The instructions say "click a new plot" (the button is "New Plots") and the text likely overflows its box.
- [x] `#156` P2 Help: "steep sections = rapid change" is misleading; speed shows in the spacing between points.
- [x] `#157` P3 Randomize direction (clockwise vs counterclockwise, left vs right). The legend's "Start" dot color doesn't match the markers.

### Lab 5: Randomness

**rapid-coin-flipper** (statistics check out ✔)
- [x] `#158` P2 Changing N after a run redraws the old walk against the new N.
- [x] `#159` 🧪 *(σ funnel instead of flat lines)* P2 The μ ± kσ lines are horizontal at the *endpoint* values across all flips. Draw the funnel n(2p−1) ± k·2√(np(1−p)) instead, and fix the help's "walk stays within ±2σ".
- [x] `#160` P2 Expected counts are rounded to integers (3.7 → "4").
- [x] `#161` P2 Help says results appear after the animation; they appear immediately.
- [x] `#162` P3 The button re-enables before the animation ends (double loop). Duplicate ticks at p = 0.5 or small N. Idea: a histogram of z-scores across runs.

**tree-ring-simulator** (statistics check out ✔)
- [x] `#163` P2 The "periodic" noise uses non-integer frequencies, so each ring has a kink at θ = 0 ✔.
- [x] `#164` 🧪 *(ring shapes changed)* P2 Independent per-ring noise lets thin rings disappear, so students miscount ✔.
- [x] `#165` P2 The registry promises z-scores; add one.
- [x] `#166` P3 It uses `alert()`, and Min == Max is rejected. Non-integer Years isn't rounded. Zoomed ring edges overpaint. Every frame is drawn twice. Idea: a histogram of totals across runs to show the CLT.

**growth-collapse-simulator** (dynamics check out ✔)
- [x] `#167` P1 Help: "collapses cascade through the population" is false; the samples are independent.
- [x] `#168` P2 Help: "Max Height" is the max of the *final* heights, not the maximum reached.
- [x] `#169` P2 The title and step counter read the live T input.
- [ ] `#170` ◐ *(theory overlay is a pedagogy idea)* P3 The old histogram stays visible during a rerun. At p = 0 the tick labels are NaN. Idea: overlay the theoretical geometric distribution and the mean p(1−pᵀ)/(1−p).

**yule-process-simulator**
- [x] `#171` P1 Write the help file. Outline:
  - Discrete-time branching: each step, an individual dies with probability D, and survivors divide with probability B.
  - Parameters and defaults: B 5%, D 2%, N₀ 10, T 50, 20 trials.
  - Log scale, the Results fields, and the 10,000 cap.
  - Growth factor (1−D)(1+B).
  - Extinction probability q^N₀, where q = min(1, D/((1−D)B)).
  - How it differs from a true Yule process.
- [ ] `#172` ⏸ *(rename not approved)* P2 Naming: this is a birth–death process, not a Yule process.
- [x] `#173` P2 The silent 10,000 cap makes Max/Avg meaningless for large B. Flag capped trials.
- [x] `#174` P2 The x-range reads the live T input.
- [x] `#175` P3 On the log scale, extinct (0) plots the same as 1. `logScaleY` isn't a real prop. There's one `Math.random()` per individual (up to 1e8 per run); use a binomial sampler. Label B and D as "% per step". Overlay the theoretical mean curve.

**brownian-motion** (Stokes–Einstein and Box–Muller are correct ✔)
- [x] `#176` P1 E(d²) = 4Dt fix (see §0). Help should say the slope of d² vs t is 4D.
- [x] `#177` P2 Float accumulation records the t = 3…9 rows one step late ✔. Use an integer step counter.
- [x] `#178` 🧪 *(auto zoom-out)* P2 Fast particles leave the fixed 15 μm view.
- [x] `#179` P2 The sliders stay live during a run, so D changes mid-trajectory.
- [x] `#180` P3 Frame-rate-dependent speed. Slider comments are wrong. Show the value of D. Idea: a many-particle mode, or an in-tool d² vs t plot.

**genetic-drift**
- [x] `#181` P1 Help has the Births effect backwards (see §0). Resolve the `[VERIFY]` with Ne ≈ N(1+b)/b.
- [x] `#182` P2 Rounding each type's offspring count separately acts like selection at small counts (1 A in 10 → expected 0.125 instead of 0.1 ✔).
- [x] `#183` P2 Changing N after a run rescales the old bars; they can overflow 10×.
- [x] `#184` P2 The status always says "Complete (300 generations)". Show the generation at fixation.
- [x] `#185` P2 Help: "one allele will eventually fix": at the defaults, 32% of runs don't fix within 300 generations ✔.
- [x] `#186` P3 The last bar is drawn off-canvas. Both branches of a theme ternary give `#ffffff`. Idea: 100 replicates to show P(fix) = p₀.

**atmospheric-molecule**
- [x] `#187` P1 Factor-of-2 scale height (see §0).
- [x] `#188` 🧪 *(molecules now bounce off a ceiling at h = 100)* P2 Particles above h = 100 are dropped from the histogram while the curve is renormalized; with weak gravity that's up to 52% of particles ✔. Add a ceiling or an "above" bin.
- [x] `#189` P2 While paused, the histogram redraw is throttled, so the curve can reflect old parameters.
- [x] `#190` P2 `title=` does nothing on GridWindow, and the density panel has no axis or legend. Show H and the mean height next to the theory.
- [ ] `#191` ◐ *(frame-rate independent; no speed slider (no room))* P3 Frame-rate-dependent speed with no speed slider. Help: "increase gravity toward −50" should say "stronger gravity".

### Lab 6: Markov & matrix tools

**ion-channel-simulator**
- [x] `#192` P2 Help: open dwell time is *exactly* geometric with mean 1/p. The real bias comes from truncation at the 350 ms window.
- [x] `#193` P2 Open current is plotted downward but labeled "+2 pA". Label it inward-negative.
- [x] `#194` P2 Add avg closed time, fraction open, and theoretical P_open = P_CO/(P_CO+P_OC).
- [x] `#195` P3 The trace and the stats are offset by 1 ms. The duplicate mount effect and `layout` should be hoisted to module scope. `[VERIFY]` markers remain.

**two-compartment-markov** (the stationary distribution checks out ✔)
- [x] `#196` P1 Help: every default and range is out of date. Populations are 500/1000 (not 50/200), sliders run 0–40% (not 0–10%), and the window is 200 points (not 100).
- [x] `#197` P1 The x-axis says "steps", but each point is 8 steps, so students reading relaxation times are 8× off.
- [ ] `#198` ◐ *(plots every step; predicted-equilibrium line intentionally omitted (lab Osm2 asks students to find it))* P2 Relaxation (τ ≈ 10 steps) finishes in about 1 plotted point. Plot every step and add a dashed line for the predicted equilibrium.
- [x] `#199` P2 While paused, name, slider, and population edits overprint labels, corrupt the status, and leave the time series stale.
- [x] `#200` P3 Odd y-ticks (0/251/502…). Round trips within a batch are invisible.

**three-compartment-matrix** (the default converges to 40/80/80, eigenvalues 1, 0.75, 0.6 ✔)
- [x] `#201` P2 Editing starting numbers doesn't update the panel or the t = 0 dots.
- [x] `#202` P2 Matrix edits after step 0 are silently ignored until Reset.
- [x] `#203` 🧪 *(full run now about 30 s — see #251)* P2 Run does one step per frame, so it finishes in about 1.7 s. Use a fixed interval, as Leslie does (300 ms).
- [x] `#204` P2 Negative or Infinity values break the y-axis. Add a finite check.
- [x] `#205` P2 Help: an absorbing compartment also needs diagonal = 1. Replace the `[VERIFY]` with the verified facts above.
- [x] `#206` P3 The opaque canvas hides GridGraph's own axes. Duplicate rounded ticks. No feedback after step 100. Replace the "Prey/Pred/Env" naming idea in the help.

**2d-matrix-visualizer**
- [x] `#207` P1 The discriminant is compared to exactly 0, so defective matrices show "0.700 ± 0.000i" or two equal "distinct" eigenvalues ✔. Use a relative tolerance.
- [x] `#208` P2 Scalar matrices (kI) vs defective shears: both are labeled "one repeated eigenvalue". Distinguish them, and draw both axes for kI.
- [x] `#209` P2 A zero eigenvalue draws a zero-length arrow, so the kernel direction is invisible.
- [x] `#210` P2 The "Mⁿ · shape" label becomes false if M is edited mid-sequence.
- [x] `#211` P2 "Zoom" actually zooms out and is integer-only.
- [x] `#212` 🧪 *(see #248)* P2 Add |λ|, arg λ, and a one-line long-run classification.
- [x] `#213` P3 Add point trails. Help: "lightness encodes radius" should say it's periodic bands.

**leslie-matrix**
- [x] `#214` *(fixed in GridTableInput (entries survive theme switch))* P1 Changing the theme wipes the table, and the next keystroke overwrites the student's parameters with blanks (GridTableInput reinit).
- [x] `#215` P1 λ₁ comes from 300 unchecked power iterations, and the primitivity test ignores zero survivals. It shows λ = 0.629 when the true value is 1.0003 ✔. Compute exactly by bisection on Euler–Lotka.
- [x] `#216` P2 λ₁ and the eigenvector are hidden for imprimitive matrices, but they still exist. Show them with an "oscillates" note.
- [x] `#217` P2 `pseudoLog` goes negative for 0 < v < 0.1, so declining populations fall off the plot.
- [ ] `#218` ⏸ *(default change not approved)* P2 Every field starts blank, so the tool opens on an all-zero matrix. Prefill an example: f = (0, 1.5, 2, 1, 0), s = (0.5, 0.8, 0.7, 0.4), giving λ = 1.252 ✔.
- [x] `#219` P2 Show t, N(t), and N(t+1)/N(t) converging to λ₁.
- [x] `#220` P2 Help: "fecundity in the top row of the table" is wrong (they're columns). The imprimitivity rule is garbled. "Eigenvector not unique" is wrong.
- [x] `#221` P3 Add reproductive values. Percentages don't sum to 100. The first Step press only initializes.

**matrix-vector-calculator** (dev): solid ✔. Minor: label style ("M × N" vs "Mv"), and 4×4 is cramped.

- [x] `#222` P2 Move the eigen code into `linearAlgebra.js`: `eig2x2(M, tol)` and `leslieLambda(f, s)`. Add Node unit tests for defective, scalar, complex, singular, and near-imprimitive cases.

---

## 3. Help-file pass (all tools)

- [x] `#223` **P2 Resolve every `[VERIFY]` marker.** Nearly every help file still has some. Many can be resolved with the verified facts in the sections above.
- [x] `#224` **P2 Fill or remove empty "References: [To be added]" sections.**
- [x] `#225` **P2 Re-check each help file's numbers** (defaults, ranges, axis limits, button names) against the code constants. Drift is common: SHO, two-compartment, logistic, shark-tuna, and gentamicin all have mismatches.
- [x] `#226` **P3 Add a math-check step to `/write-help`.** The command checks help against the code but not the *math*. Several wrong claims came in that way (Hutchinson regimes, SHO period, discrete-logistic equilibrium).
- [x] `#227` **P3 Standardize delay notation.** MathML uses undefined subscripts (P_τ, G_τ, L_τ) while the help uses P(t−τ). Use the explicit form everywhere. Also typeset parameters (like C) in italic rather than bold-italic.

---

## 4. Repo hygiene & docs

- [x] `#228` *(moved to _archive/chat-log-2026-02-19.md (excluded from git locally))* **P2 Remove or move the stray root file `## User`.** It's a 437 KB pasted chat log. It's currently *untracked*, so not public, but it's easy to commit by accident.
- [x] `#229` **P2 Delete dead code.**
  - `src/App.jsx` and `App.css` (not imported; lint `no-undef`).
  - `src_backup/`, `src/tools/old/`, and the `*.backup` files.
  - `equationParser.legacy.js` and `equationParserTest.js`.
  - Unused utils: `odeSolver.js`, `layoutPlanner.js`, `soundPresets.js`.
  - The empty `grid/index.jsx` and `tools/index.jsx`, and the stale `tools/index.js`.
  - Unused grid components, or move them to `dev/`: GridKnob, GridSlider, GridScreen, GridVectorField.
- [x] `#230` **P3 Add `.claude/worktrees/` and `.claude/settings.local.json` to `.gitignore`.** The worktree copy in your Dropbox folder is a full duplicate of the project.
- [x] `#231` **P2 README "Available Tools" is missing about 14 student tools.** Consider generating the list from `tools.js`.
  - "Open source and free for educational use" understates the MIT license.
  - "NOT YET Mobile friendly" → "Not yet mobile-friendly".
- [x] `#232` **P3 Update CONTRIBUTING.md** (dev tools list, Node version, the obsolete `npm run deploy`).
- [x] `#233` **P3 Update CLAUDE.md.**
  - It says "three patterns" but lists four.
  - It documents GridButton `w={2}` and GridDisplay `fontSize="small"`, which don't work.
  - Every shared component breaks its "no color detection" rule.
  - Its Lab 6 description doesn't match the Lab 6 tools.
- [x] `#234` *(guides kept — still current; test-equilibria.js became a Vitest test)* **P3 Retire stale notes.** `GRIDGRAPH_MIGRATION_GUIDE.md`, `SOUND_EFFECTS_GUIDE.md`, and `docs/GridLayoutGuide.md` are probably obsolete. `SESSION_NOTES.md` is dated 2025 (probably meant 2026). Turn `test-equilibria.js` into a real test (e.g., Vitest) and add math unit tests for the utils.
- [x] `#235` **P3 Clear the lint backlog.** There are 126 problems: 62 unused variables, 29 useless escapes, 27 hook-dependency warnings (most benign; the real ones are listed above), and 8 `no-undef` (all in dead `App.jsx`). Then add lint to CI.

---

## 5. Pedagogy ideas (highest leverage)

1. **Theory vs. simulation readouts in every stochastic tool.** Examples: P(fix) = p₀, P_open, 4Dt, the geometric distribution, Yule's mean and extinction probability, the coin-walk funnel. A side-by-side readout would also have caught both factor-of-2 bugs.
2. **Show stability classification (trace/det, eigenvalues) wherever an equilibrium is drawn.** For the delay tools, show aτ against 1/e and π/2.
3. **Accumulate results across runs** (histograms with theory overlays) for Coin Flipper, Tree Ring, Growth–Collapse, and Genetic Drift. This shows the CLT and fixation probabilities.
4. **Consistent controls:** Start/Pause/Reset and a speed slider in every animated tool; lock or restart on parameter change; say which trajectory the time series is following.
5. **Better defaults that show the phenomenon the lab is about:** oscillations in the Lab 4 tools, a prefilled Leslie example, sample data for Logistic.

---

## 6. New items found while fixing

- [ ] `#236` ⏸ *(needs Marty)* **Matrix & Vector Calculator is dev-only, but Lab Manual p.163 (Les3) says "you may wish to use the Matrix & Vector Calculator."** Students can't reach it (and now a direct link shows "not found" without `?dev=true`). Decide: make it a student tool (which lab?) or change the manual.
- [ ] `#237` ⏸ *(needs Marty)* **Logistic Growth Explorer b slider runs 0–1; the help says 0–2.** Pick one; the code change is one line either way.
- [x] `#238` P3 Yule passes `disabled` to GridButton, which ignores it.
- [x] `#239` P3 1D Calculator shows "-0.0" ticks and "X* = -0.000" for tiny values.
- [x] `#240` P3 Lazy-load the help modal (react-markdown, ~115 kB) so tool pages load faster.
- [x] `#241` P2 Help files show raw "[VERIFY: …]" markers to students (covered by #223; listed so it isn't missed).
- [x] `#242` GridWheelSelector's `<style jsx>` made React log an error in 4 tools (fixed in phase A).

### Decisions needed from Marty (raised while fixing)

- [ ] `#243` ⏸ **Insulin-Glucose Regulation integration.** The minimal tool now uses accurate RK4. The full tool still uses the old 0.1-h Euler steps (made safe: no clamping, substeps instead). With exact RK4 the IGO2 delay exercise looks different: lasting oscillations start near τ ≈ 45 min instead of ≈ 30 min, and at τ = 30–42 min the swings are small and die out (arguably closer to the manual's Figure B). Switching is one line (`simulateInsulinGlucose` instead of `simulateInsulinGlucoseEuler`). Your call.
- [ ] `#244` ⏸ **Logistic Growth Explorer vs. manual p.89.** The manual says "Note that t0 = 0 here", but the tool's default t₀ is 10.
- [ ] `#245` ⏸ **Atmospheric Molecule vs. manual p.161.** The manual asks how gravity and temperature affect vertical *velocities*, but the tool shows only positions (it's a position random walk).
- [ ] `#246` ⏸ **Glycolysis status now shows "Type (linearization): center / stable spiral / …".** This came with the stability-label fix, but it touches the deferred glycolysis teaching decision (#073). Keep or remove?
- [ ] `#247` ⏸ **Answers visible in tools?** A few new readouts may make lab exercises easier — decide whether to keep each:
  - Muscle Tremor status now says none / damped / sustained, switching exactly at the theoretical threshold (MT2 asks for the critical delay).
  - 2D Matrix Visualizer shows a "Long run: …" summary (partly answers Les5).
  - Ion Channel: theoretical P(open) is hidden behind a "Show theory" link (IC2).
  - Deliberately *not* added because they'd give away answers: SHO theoretical period, Two-Compartment equilibrium line, Hutchinson/Tremor/Discrete-Logistic threshold values in the help.
- [ ] `#248` ⏸ **GLV Pause scope.** Pause freezes the orange grid particles; clicked trajectories keep moving (as the old help described). Should Pause stop everything?
- [ ] `#249` ⏸ **Three-Compartment run speed** is now one step per 0.3 s (a full 100-step run ≈ 30 s, was ≈ 1.7 s on a 60 Hz screen). OK for p.179?
- [ ] `#250` ⏸ **Two-Compartment pace** is now 4 true Markov steps per second, each plotted (was ~12 hidden steps/s in batches of 8). OK for p.168–169?

### Small follow-ups

- [ ] `#251` P3 GridDisplay ignores `style.color` (e.g. error text in the calculators can't be red).
- [ ] `#252` P3 Matrix & Vector Calculator (2×2 mode) has an empty bottom row; Three-Compartment name inputs show a default letter above renamed boxes.
- [ ] `#253` P3 Linear Regression readout has 3 decimals, so small slopes lose precision (aspirin −0.031 vs equation −0.0311).
- [ ] `#254` P3 Discrete Modeling Practice pairs odd nouns ("a tank starts with 204 cars").
- [ ] `#255` P3 Growth & Collapse bars jump in height when the run ends (axis rescales).
- [ ] `#256` P3 Holling–Tanner's (0, m) saddle isn't drawn (m = 7 is outside the 0–6 window); GLV equilibria on the axes are drawn as half-circles.
- [ ] `#257` P3 Muscle Tremor: the hand leaves the forearm window near L = 10 or 30. Discrete Logistic: β slider follows typed βmin/βmax before "Set Window".
- [x] `#258` GridButton now supports `disabled` (several tools already passed it).
- [x] `#259` React "background/backgroundSize" style warning in shared components fixed.
