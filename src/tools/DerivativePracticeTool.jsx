// src/tools/DerivativePracticeTool.jsx
// Study aide: practice symbolic derivatives (lines, power laws, exponentials,
// sine and cosine) with vertical scaling, vertical shifts and extra
// constants. No chain rule, no product rule. Problems, answers, methods and
// answer checking live in derivativePracticeMath.js.

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
} from "./derivativePracticeMath";

const KIND_BUTTONS = [
  { key: "linear", lines: ["Linear"], tip: "Linear functions, like 3t + 2" },
  { key: "power", lines: ["Power", "law"], tip: "Power laws, like t², 1/t, √t" },
  { key: "exponential", lines: ["Expo-", "nential"], tip: "Exponentials, like eᵗ and 2ᵗ" },
  { key: "trig", lines: ["Sine &", "cosine"], tip: "sin(t) and cos(t)" },
];

const VARIANT_BUTTONS = [
  { key: "scaling", lines: ["Vertical", "scaling"], tip: "Multiply by a constant, like 5t² or −3 sin(t)" },
  { key: "shifting", lines: ["Vertical", "shift"], tip: "Add a constant, like t² + 7" },
  { key: "params", lines: ["Extra", "constants"], tip: "Letters for constants, like k t², c eᵗ, tⁿ, π" },
];

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

const DerivativePracticeTool = () => {
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

  const toggleKind = (key) => {
    const kinds = { ...options.kinds, [key]: !options.kinds[key] };
    if (!KINDS.some((k) => kinds[k])) return; // keep at least one kind
    updateOptions({ ...options, kinds });
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
    <ToolContainer title="Derivative Practice" canvasWidth={10} canvasHeight={7}>
      {/* Row 0: what to practice */}
      <GridLabel x={0} y={0} w={2} h={1} text="Function types" {...labelProps} />
      {KIND_BUTTONS.map((b, i) => (
        <GridButton
          key={b.key}
          x={2 + i}
          y={0}
          type="toggle"
          active={options.kinds[b.key]}
          onToggle={() => toggleKind(b.key)}
          tooltip={b.tip}
          ariaLabel={`Practice ${b.lines.join(" ").replace("- ", "")}`}
          theme={theme}
        >
          <ButtonText lines={b.lines} />
        </GridButton>
      ))}
      <GridLabel x={6} y={0} w={1} h={1} text="Variants" {...labelProps} />
      {VARIANT_BUTTONS.map((b, i) => (
        <GridButton
          key={b.key}
          x={7 + i}
          y={0}
          type="toggle"
          active={options[b.key]}
          onToggle={() => updateOptions({ ...options, [b.key]: !options[b.key] })}
          tooltip={b.tip}
          ariaLabel={b.lines.join(" ")}
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
        validate={(v) => /^[A-Za-z0-9_+\-*/^().,\s=′'·×⋅∙÷π√²³−–—[\]{}]*$/.test(v)}
        variable={`d${problem.dep}/dt`}
        placeholder="e.g. 4t or 3*sin(t)"
        ariaLabel={`Your answer for d${problem.dep}/dt`}
        tooltip="Type the derivative and press Enter or Check. Use * or a space for multiplication, ^ for powers, pi for π, ln( ) for the natural log, sqrt( ) for roots."
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

export default DerivativePracticeTool;
