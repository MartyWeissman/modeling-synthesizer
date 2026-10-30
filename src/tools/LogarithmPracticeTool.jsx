// src/tools/LogarithmPracticeTool.jsx
// Study aide: practice logarithms in base 10, base 2 and base e: evaluate
// logs of numbers (log10(0.01), log2(8), ln(sqrt(e))) and expand or simplify
// symbolic expressions with the rules of logarithms. Problems, answers,
// methods and answer checking live in logarithmPracticeMath.js.

import React, { useState, useCallback } from "react";
import {
  GridButton,
  GridDisplay,
  GridLabel,
  GridEquationInput,
} from "../components/grid";
import ToolContainer from "../components/ui/ToolContainer";
import { useTheme } from "../hooks/useTheme";
import {
  makeProblem,
  checkAnswer,
  DEFAULT_OPTIONS,
  KINDS,
  BASES,
} from "./logarithmPracticeMath";

const BASE_BUTTONS = [
  { key: "10", lines: ["log₁₀"], label: "Practice base 10", tip: "Base 10: log₁₀(1000), log₁₀(0.01), ..." },
  { key: "2", lines: ["log₂"], label: "Practice base 2", tip: "Base 2: log₂(8), log₂(1/16), ..." },
  { key: "e", lines: ["ln"], label: "Practice base e", tip: "Base e (natural log): ln(e³), ln(1/e), ..." },
];

const PRACTICE_BUTTONS = [
  { key: "numbers", lines: ["Numbers"], tip: "Evaluate logs of numbers, like log₁₀(0.01) or log₂(8)" },
  { key: "expressions", lines: ["Expres-", "sions"], tip: "Use the log rules on expressions, like log₁₀(100x³) or log₂(8ᵗ)" },
  { key: "roots", lines: ["Roots &", "fractions"], tip: "Include roots and fractional powers, like ln(√e), log₂(4√2), log₁₀(√(10x))" },
];

const PLACEHOLDERS = {
  number: "e.g. -2 or 3/2",
  logs: "e.g. 2 + 3 log10(x)",
  linear: "e.g. 3t - 1",
};

// MathML fonts look small next to the sans-serif text; enlarge them a bit.
const MATH_STYLE = { fontSize: "1.2em" };

/** Text and MathML pieces: strings, or {ml} objects holding a <math> element. */
const Segments = ({ segs }) =>
  segs.map((seg, i) =>
    typeof seg === "string" ? (
      <span key={i}>{seg}</span>
    ) : (
      <span key={i} style={MATH_STYLE} dangerouslySetInnerHTML={{ __html: seg.ml }} />
    ),
  );

const ButtonText = ({ lines, size = 13 }) => (
  <div style={{ textAlign: "center", lineHeight: "1.1", fontSize: `${size}px` }}>
    {lines.map((line) => (
      <div key={line}>{line}</div>
    ))}
  </div>
);

const LogarithmPracticeTool = () => {
  const { theme, currentTheme } = useTheme();
  const dark = currentTheme === "dark";

  const [options, setOptions] = useState(DEFAULT_OPTIONS);
  const [problem, setProblem] = useState(() => makeProblem(DEFAULT_OPTIONS));
  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [showMethod, setShowMethod] = useState(false);

  const newProblem = useCallback((opts) => {
    setProblem(makeProblem(opts));
    setInput("");
    setFeedback(null);
    setShowAnswer(false);
    setShowMethod(false);
  }, []);

  const updateOptions = (next) => {
    setOptions(next);
    newProblem(next);
  };

  const toggleBase = (key) => {
    const bases = { ...options.bases, [key]: !options.bases[key] };
    if (!BASES.some((k) => bases[k])) return; // keep at least one base
    updateOptions({ ...options, bases });
  };

  const togglePractice = (key) => {
    const next = { ...options, [key]: !options[key] };
    if (!KINDS.some((k) => next[k])) return; // numbers or expressions
    updateOptions(next);
  };

  const check = (value = input) => setFeedback(checkAnswer(problem, value));

  const hiddenBg = dark ? "#374151" : "#f3f4f6";
  const feedbackColor = !feedback
    ? undefined
    : feedback.status === "correct"
      ? dark ? "#4ade80" : "#15803d"
      : feedback.status === "close"
        ? dark ? "#fbbf24" : "#b45309"
        : feedback.status === "incorrect"
          ? dark ? "#f87171" : "#b91c1c"
          : undefined;
  const feedbackIcon = !feedback
    ? ""
    : feedback.status === "correct"
      ? "✓ "
      : feedback.status === "close"
        ? "≈ "
        : feedback.status === "incorrect"
          ? "✗ "
          : "";

  const labelProps = { textAlign: "left", fontWeight: "bold", theme };

  return (
    <ToolContainer title="Logarithm Practice" canvasWidth={10} canvasHeight={7}>
      {/* Row 0: what to practice */}
      <GridLabel x={0} y={0} w={2} h={1} text="Bases" {...labelProps} />
      {BASE_BUTTONS.map((b, i) => (
        <GridButton
          key={b.key}
          x={2 + i}
          y={0}
          type="toggle"
          active={options.bases[b.key]}
          onToggle={() => toggleBase(b.key)}
          tooltip={b.tip}
          ariaLabel={b.label}
          theme={theme}
        >
          <ButtonText lines={b.lines} size={17} />
        </GridButton>
      ))}
      <GridLabel x={5} y={0} w={2} h={1} text="Practice" {...labelProps} />
      {PRACTICE_BUTTONS.map((b, i) => (
        <GridButton
          key={b.key}
          x={7 + i}
          y={0}
          type="toggle"
          active={options[b.key]}
          onToggle={() => togglePractice(b.key)}
          tooltip={b.tip}
          ariaLabel={`Practice ${b.lines.join(" ").replace("- ", "")}`}
          theme={theme}
        >
          <ButtonText lines={b.lines} />
        </GridButton>
      ))}

      {/* Row 1: the question */}
      <GridLabel x={0} y={1} w={2} h={1} text="Question" {...labelProps} />
      <GridDisplay x={2} y={1} w={7} h={1} variant="info" align="left" theme={theme}>
        <div style={{ padding: "4px 8px", fontSize: "18px", lineHeight: 1.5 }}>
          <div>
            <Segments segs={problem.question} />
          </div>
          {problem.note.length > 0 && (
            <div style={{ fontSize: "14px", opacity: 0.8 }}>
              <Segments segs={problem.note} />
            </div>
          )}
        </div>
      </GridDisplay>
      <GridButton
        x={9}
        y={1}
        type="momentary"
        onPress={() => newProblem(options)}
        theme={theme}
      >
        <ButtonText lines={["New", "question"]} size={14} />
      </GridButton>

      {/* Row 2: the student's answer */}
      <GridLabel x={0} y={2} w={2} h={1} text="Your answer" {...labelProps} />
      <GridEquationInput
        x={2}
        y={2}
        w={4}
        h={1}
        value={input}
        onChange={(v) => {
          setInput(v);
          if (feedback) setFeedback(null);
        }}
        onSubmit={(v) => check(v)}
        validate={(v) => /^[A-Za-z0-9_+\-*/^().,\s=·×⋅∙÷π√∛²³−–—₁₀₂ₑ[\]{}]*$/.test(v)}
        placeholder={PLACEHOLDERS[problem.type]}
        ariaLabel="Your answer"
        tooltip="Type your answer and press Enter or Check. Fractions like 3/2 are fine. Write logs as log10(x), log2(x) and ln(x) (plain log means log10)."
        fontSize="lg"
        theme={theme}
      />
      <GridButton x={6} y={2} type="momentary" onPress={() => check()} theme={theme}>
        <ButtonText lines={["Check"]} size={14} />
      </GridButton>
      <GridDisplay x={7} y={2} w={3} h={1} variant="info" align="left" theme={theme}>
        <div
          role="status"
          aria-live="polite"
          style={{ padding: "2px 6px", fontSize: "13px", lineHeight: 1.3 }}
        >
          {feedback ? (
            <>
              <div style={{ color: feedbackColor, fontWeight: 600 }}>
                {feedbackIcon}
                {feedback.message}
              </div>
              {feedback.readAs && feedback.status !== "correct" && (
                <div style={{ opacity: 0.75, fontSize: "12px" }}>
                  Read as: {feedback.readAs}
                </div>
              )}
            </>
          ) : (
            <div style={{ opacity: 0.6 }}>
              Type your answer and press Enter or Check.
            </div>
          )}
        </div>
      </GridDisplay>

      {/* Row 3: the answer */}
      <GridLabel x={0} y={3} w={2} h={1} text="Answer" {...labelProps} />
      <GridDisplay
        x={2}
        y={3}
        w={7}
        h={1}
        variant="info"
        align="left"
        theme={theme}
        style={{ backgroundColor: showAnswer ? "transparent" : hiddenBg }}
      >
        <div style={{ padding: "4px 8px", fontSize: "18px" }}>
          {showAnswer && (
            <span style={MATH_STYLE} dangerouslySetInnerHTML={{ __html: problem.answerML }} />
          )}
        </div>
      </GridDisplay>
      <GridButton
        x={9}
        y={3}
        type="toggle"
        active={showAnswer}
        onToggle={setShowAnswer}
        theme={theme}
      >
        <ButtonText lines={[showAnswer ? "Hide" : "Show", "answer"]} size={14} />
      </GridButton>

      {/* Rows 4-6: the method */}
      <GridLabel x={0} y={4} w={2} h={1} text="Method" {...labelProps} />
      <GridDisplay
        x={2}
        y={4}
        w={7}
        h={3}
        variant="info"
        align="left"
        theme={theme}
        style={{ backgroundColor: showMethod ? "transparent" : hiddenBg }}
      >
        {showMethod && (
          // GridDisplay centers its content; this box fills it and scrolls,
          // so long methods start at the top instead of being cut off.
          <div
            style={{
              // full height of the display's content area (3 rows)
              height: "272px",
              width: "100%",
              overflowY: "auto",
            }}
          >
            <ol
              style={{
                padding: "6px 10px 6px 30px",
                margin: 0,
                fontSize: "15px",
                lineHeight: 1.45,
                listStyle: "decimal",
              }}
            >
              {problem.steps.map((step, i) => (
                <li key={i} style={{ marginBottom: "6px" }}>
                  <strong>{step.label}.</strong> <Segments segs={step.segs} />
                </li>
              ))}
            </ol>
          </div>
        )}
      </GridDisplay>
      <GridButton
        x={9}
        y={4}
        type="toggle"
        active={showMethod}
        onToggle={setShowMethod}
        theme={theme}
      >
        <ButtonText lines={[showMethod ? "Hide" : "Show", "method"]} size={14} />
      </GridButton>
    </ToolContainer>
  );
};

export default LogarithmPracticeTool;
