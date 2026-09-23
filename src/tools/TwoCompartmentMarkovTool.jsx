import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  GridSliderHorizontal,
  GridButton,
  GridWindow,
  GridGraph,
  GridDisplay,
  GridInput,
  GridTextInput,
} from "../components/grid";
import ToolContainer from "../components/ui/ToolContainer";
import { useTheme } from "../hooks/useTheme";
import { useAnimationLoop } from "../hooks/useAnimationLoop";
import { setupCanvas, clearCanvas } from "../utils/canvas";
import { linearTicks, niceTicks, ticksInRange } from "../utils/ticks";

// ---- Timing ----
// One Markov step (every particle may switch compartments once) happens
// STEPS_PER_SECOND times per second of real time; the time-series plot shows
// every step, over the last WINDOW_STEPS steps.
const STEPS_PER_SECOND = 4;
const WINDOW_STEPS = 200;
// A particle that switches flies through a tunnel for this long (seconds).
// Flights start at random times within the step, so motion is continuous.
const FLIGHT_SECONDS = 0.75;
// Brownian-motion velocities below are in pixels per frame at 60 Hz.
const FRAMES_PER_SECOND_REF = 60;

// ---- Model (pure) ----

/**
 * One Markov step for a list of compartments ("A"/"B"): each A switches to B
 * with probability pAB, each B to A with probability pBA (probabilities as
 * fractions). Returns the indices that switched. Mutates `comps`.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function markovStep(comps, pAB, pBA, rng = Math.random) {
  const switched = [];
  for (let i = 0; i < comps.length; i++) {
    if (comps[i] === "A") {
      if (rng() < pAB) {
        comps[i] = "B";
        switched.push(i);
      }
    } else if (rng() < pBA) {
      comps[i] = "A";
      switched.push(i);
    }
  }
  return switched;
}

// ---- Particle visuals ----
// Each particle has:
//   compartment: "A"|"B"  — authoritative, set by the Markov step
//   visual: "A"|"B"       — the compartment it is drawn in (lags during flight)
//   x, y, vx, vy          — visual position & velocity (Brownian motion)
//   flightDelay           — seconds until a scheduled flight starts (or null)
//   transitioning, transitionProgress, tp0..tp3 — Bézier flight arc

function createParticle(x, y, compartment) {
  return {
    x,
    y,
    vx: (Math.random() - 0.5) * 3,
    vy: (Math.random() - 0.5) * 3,
    compartment,
    visual: compartment,
    flightDelay: null,
    transitioning: false,
    transitionProgress: 0,
    tp0x: 0, tp0y: 0,
    tp1x: 0, tp1y: 0,
    tp2x: 0, tp2y: 0,
    tp3x: 0, tp3y: 0,
  };
}

function cubicBezier(t, p0, p1, p2, p3) {
  const t1 = 1 - t;
  return t1 * t1 * t1 * p0 + 3 * t * t1 * t1 * p1 + 3 * t * t * t1 * p2 + t * t * t * p3;
}

// Visual-only update over `frames` (= dt × 60): Brownian drift within the
// compartment, or progress along the flight arc.
function updateParticleVisual(p, layout, dt) {
  const frames = dt * FRAMES_PER_SECOND_REF;
  if (p.transitioning) {
    p.transitionProgress += dt / FLIGHT_SECONDS;
    if (p.transitionProgress >= 1) {
      p.transitioning = false;
      p.visual = p.compartment;
      p.x = p.tp3x;
      p.y = p.tp3y;
      p.vx = (Math.random() - 0.5) * 2;
      p.vy = (Math.random() - 0.5) * 2;
      return;
    }
    const t = p.transitionProgress;
    p.x = cubicBezier(t, p.tp0x, p.tp1x, p.tp2x, p.tp3x);
    p.y = cubicBezier(t, p.tp0y, p.tp1y, p.tp2y, p.tp3y);
    return;
  }

  const bounds = p.visual === "A" ? layout.compA : layout.compB;
  p.x += p.vx * frames;
  p.y += p.vy * frames;

  const r = 2;
  if (p.x - r < bounds.x) { p.x = bounds.x + r; p.vx = Math.abs(p.vx); }
  if (p.x + r > bounds.x + bounds.w) { p.x = bounds.x + bounds.w - r; p.vx = -Math.abs(p.vx); }
  if (p.y - r < bounds.y) { p.y = bounds.y + r; p.vy = Math.abs(p.vy); }
  if (p.y + r > bounds.y + bounds.h) { p.y = bounds.y + bounds.h - r; p.vy = -Math.abs(p.vy); }

  // Random perturbation (per 60 Hz frame)
  p.vx += (Math.random() - 0.5) * 0.4 * frames;
  p.vy += (Math.random() - 0.5) * 0.4 * frames;

  // Speed limit
  const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
  if (speed > 3) {
    p.vx = (p.vx / speed) * 3;
    p.vy = (p.vy / speed) * 3;
  }
}

// Start a flight arc from the current position to a random spot in the
// particle's (authoritative) compartment
function startVisualTransition(p, layout) {
  const { compA, compB, tunnelX, tunnelW, centerY } = layout;
  const isAtoB = p.compartment === "B";
  p.transitioning = true;
  p.transitionProgress = 0;
  p.flightDelay = null;

  const tunnelY = isAtoB ? centerY - 60 : centerY + 60;

  p.tp0x = p.x;
  p.tp0y = p.y;

  p.tp1x = isAtoB ? compA.x + compA.w : compB.x;
  p.tp1y = tunnelY;

  p.tp2x = tunnelX + tunnelW / 2;
  p.tp2y = tunnelY + (Math.random() - 0.5) * 20;

  const dest = isAtoB ? compB : compA;
  p.tp3x = dest.x + 20 + Math.random() * (dest.w - 40);
  p.tp3y = dest.y + 20 + Math.random() * (dest.h - 40);
}

// ---- Layout ----
function computeLayout(w, h) {
  const margin = 20;
  const tunnelW = w / 7;
  const compW = (w - tunnelW - margin * 2) / 2;
  const compH = h - margin * 2 - 30;
  const topOffset = margin + 25;

  const compA = { x: margin, y: topOffset, w: compW, h: compH };
  const compB = { x: w - margin - compW, y: topOffset, w: compW, h: compH };
  const tunnelX = compA.x + compA.w;
  const centerY = topOffset + compH / 2;

  return { compA, compB, tunnelX, tunnelW, centerY, w, h };
}

// ---- Component ----

const TwoCompartmentMarkovTool = () => {
  const { theme, currentTheme } = useTheme();

  // Canvas refs
  const staticCanvasRef = useRef(null);
  const dynamicCanvasRef = useRef(null);
  const tsCanvasRef = useRef(null);
  const tsTransformRef = useRef(null);

  // Parameters (UI state)
  const [nameA, setNameA] = useState("A");
  const [nameB, setNameB] = useState("B");
  const [popA, setPopA] = useState(500);
  const [popB, setPopB] = useState(500);
  const [probAB, setProbAB] = useState(5);
  const [probBA, setProbBA] = useState(5);

  // Run status: "stopped" (no run), "running", or "paused"
  const [status, setStatus] = useState("stopped");
  // Snapshot for display, refreshed every Markov step
  const [snapshot, setSnapshot] = useState({ step: 0, countA: 0, countB: 0 });
  // Starting populations of the current run (null when stopped)
  const [runPops, setRunPops] = useState(null);

  // Animation state — mutable ref, no React re-renders during animation
  const animRef = useRef({
    particles: [],
    step: 0,
    carry: 0, // fraction of a Markov step accumulated
    countA: 0,
    countB: 0,
    history: [], // { step, A, B } — every step, last WINDOW_STEPS steps
    layout: null,
  });

  // Keep the canvases sized to their layout size; returns the layout.
  const ensureLayout = useCallback(() => {
    const sCanvas = staticCanvasRef.current;
    if (!sCanvas) return null;
    const w = sCanvas.offsetWidth;
    const h = sCanvas.offsetHeight;
    const anim = animRef.current;
    if (!anim.layout || anim.layout.w !== w || anim.layout.h !== h) {
      const old = anim.layout;
      anim.layout = computeLayout(w, h);
      // Keep particles inside their compartments if the size changed
      if (old && anim.particles.length > 0) {
        const sx = w / old.w;
        const sy = h / old.h;
        anim.particles.forEach((p) => {
          p.x *= sx;
          p.y *= sy;
        });
      }
    }
    return anim.layout;
  }, []);

  // ---- Draw static background ----
  const drawStaticElements = useCallback(() => {
    const layout = ensureLayout();
    const setup = setupCanvas(staticCanvasRef.current);
    if (!setup || !layout) return;
    const { ctx, width: w, height: h } = setup;
    const isDark = currentTheme === "dark";

    ctx.fillStyle = isDark ? "#111827" : "#ffffff";
    ctx.fillRect(0, 0, w, h);

    const { compA, compB, tunnelX, tunnelW, centerY } = layout;

      // Compartment A
      ctx.beginPath();
      ctx.roundRect(compA.x, compA.y, compA.w, compA.h, 16);
      ctx.fillStyle = isDark ? "rgba(239, 68, 68, 0.12)" : "rgba(255, 99, 132, 0.08)";
      ctx.fill();
      ctx.strokeStyle = isDark ? "#ef4444" : "#b91c1c";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Compartment B
      ctx.beginPath();
      ctx.roundRect(compB.x, compB.y, compB.w, compB.h, 16);
      ctx.fillStyle = isDark ? "rgba(59, 130, 246, 0.12)" : "rgba(54, 162, 235, 0.08)";
      ctx.fill();
      ctx.strokeStyle = isDark ? "#3b82f6" : "#1d4ed8";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      const tunnelH = 54;
      const topTunnelY = centerY - 60;
      const bottomTunnelY = centerY + 60;

      // Compartment A
      ctx.beginPath();
      ctx.roundRect(compA.x, compA.y, compA.w, compA.h, 16);
      ctx.fillStyle = isDark ? "rgba(239, 68, 68, 0.12)" : "rgba(255, 99, 132, 0.08)";
      ctx.fill();
      ctx.strokeStyle = isDark ? "#ef4444" : "#b91c1c";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Compartment B
      ctx.beginPath();
      ctx.roundRect(compB.x, compB.y, compB.w, compB.h, 16);
      ctx.fillStyle = isDark ? "rgba(59, 130, 246, 0.12)" : "rgba(54, 162, 235, 0.08)";
      ctx.fill();
      ctx.strokeStyle = isDark ? "#3b82f6" : "#1d4ed8";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // ---- Flared tunnels ----
      const flareH = tunnelH * 1.8;
      const midH = tunnelH;
      const overlap = 8;
      const bgColor = isDark ? "#111827" : "#ffffff";

      const drawFlareTunnel = (leftX, rightX, tunnelCY, gradLeft, gradRight) => {
        const midX = (leftX + rightX) / 2;

        ctx.fillStyle = bgColor;
        ctx.fillRect(leftX - overlap, tunnelCY - flareH / 2, overlap + 4, flareH);
        ctx.fillRect(rightX - 4, tunnelCY - flareH / 2, overlap + 4, flareH);

        const grad = ctx.createLinearGradient(leftX, 0, rightX, 0);
        grad.addColorStop(0, gradLeft);
        grad.addColorStop(1, gradRight);

        ctx.beginPath();
        ctx.moveTo(leftX - overlap, tunnelCY - flareH / 2);
        ctx.quadraticCurveTo(midX, tunnelCY - midH / 2, rightX + overlap, tunnelCY - flareH / 2);
        ctx.lineTo(rightX + overlap, tunnelCY + flareH / 2);
        ctx.quadraticCurveTo(midX, tunnelCY + midH / 2, leftX - overlap, tunnelCY + flareH / 2);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();
      };

      const topTunnelLeft = tunnelX;
      const topTunnelRight = tunnelX + tunnelW;

      // Top tunnel (A → B)
      drawFlareTunnel(
        topTunnelLeft, topTunnelRight, topTunnelY,
        isDark ? "rgba(239,68,68,0.15)" : "rgba(255,99,132,0.15)",
        isDark ? "rgba(59,130,246,0.15)" : "rgba(54,162,235,0.15)",
      );

      // Top arrow
      const arrowSz = 6;
      const topArrX = tunnelX + tunnelW / 2;
      ctx.fillStyle = isDark ? "#6b7280" : "#888888";
      ctx.beginPath();
      ctx.moveTo(topArrX + arrowSz, topTunnelY);
      ctx.lineTo(topArrX - arrowSz, topTunnelY - arrowSz);
      ctx.lineTo(topArrX - arrowSz, topTunnelY + arrowSz);
      ctx.closePath();
      ctx.fill();

      // Bottom tunnel (B → A)
      drawFlareTunnel(
        topTunnelLeft, topTunnelRight, bottomTunnelY,
        isDark ? "rgba(239,68,68,0.15)" : "rgba(255,99,132,0.15)",
        isDark ? "rgba(59,130,246,0.15)" : "rgba(54,162,235,0.15)",
      );

      // Bottom arrow
      const bottomArrX = tunnelX + tunnelW / 2;
      ctx.fillStyle = isDark ? "#6b7280" : "#888888";
      ctx.beginPath();
      ctx.moveTo(bottomArrX - arrowSz, bottomTunnelY);
      ctx.lineTo(bottomArrX + arrowSz, bottomTunnelY - arrowSz);
      ctx.lineTo(bottomArrX + arrowSz, bottomTunnelY + arrowSz);
      ctx.closePath();
      ctx.fill();

      // Tunnel probability labels
      ctx.font = "11px monospace";
      ctx.fillStyle = isDark ? "#9ca3af" : "#666666";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`${probAB.toFixed(1)}%`, topArrX, topTunnelY - flareH / 2 - 10);
      ctx.fillText(`${probBA.toFixed(1)}%`, bottomArrX, bottomTunnelY + flareH / 2 + 10);

  }, [currentTheme, ensureLayout, probAB, probBA]);

  // ---- Draw particles and compartment labels (dynamic layer) ----
  const drawDynamic = useCallback(() => {
    const layout = ensureLayout();
    const setup = setupCanvas(dynamicCanvasRef.current);
    if (!setup || !layout) return;
    const { ctx, width, height } = setup;
    const anim = animRef.current;
    const isDark = currentTheme === "dark";
    const particles = anim.particles;
    const { compA, compB } = layout;

    ctx.clearRect(0, 0, width, height);

    const colorTransition = isDark ? "rgba(250, 204, 21, 0.8)" : "rgba(180, 130, 0, 0.7)";
    const colorA = isDark ? "rgba(248, 113, 113, 0.7)" : "rgba(220, 38, 38, 0.5)";
    const colorB = isDark ? "rgba(96, 165, 250, 0.7)" : "rgba(37, 99, 235, 0.5)";

    const drawBatch = (color, test) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (!test(p)) continue;
        ctx.moveTo(p.x + 2, p.y);
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
      }
      ctx.fill();
    };
    if (particles.length > 0) {
      drawBatch(colorA, (p) => !p.transitioning && p.visual === "A");
      drawBatch(colorB, (p) => !p.transitioning && p.visual === "B");
      drawBatch(colorTransition, (p) => p.transitioning);
    }

    // Compartment labels; with a run, the authoritative Markov counts
    const hasRun = particles.length > 0;
    ctx.font = "bold 14px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillStyle = isDark ? "#f87171" : "#dc2626";
    ctx.fillText(
      hasRun ? `${nameA}: ${anim.countA}` : nameA,
      compA.x + compA.w / 2,
      compA.y - 6,
    );
    ctx.fillStyle = isDark ? "#60a5fa" : "#2563eb";
    ctx.fillText(
      hasRun ? `${nameB}: ${anim.countB}` : nameB,
      compB.x + compB.w / 2,
      compB.y - 6,
    );
  }, [currentTheme, ensureLayout, nameA, nameB]);

  // ---- Draw time series (every step) ----
  const drawTimeSeries = useCallback(() => {
    const canvas = tsCanvasRef.current;
    const transform = tsTransformRef.current;
    if (!canvas || !transform) return;
    const setup = setupCanvas(canvas, {
      width: transform.plotWidth,
      height: transform.plotHeight,
    });
    if (!setup) return;
    const { ctx, width, height } = setup;
    const { dataToPixel } = transform;
    ctx.clearRect(0, 0, width, height);

    const history = animRef.current.history;
    if (history.length < 2) return;

    const isDark = currentTheme === "dark";
    const drawSeries = (key, color, dash) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.setLineDash(dash);
      ctx.beginPath();
      history.forEach((pt, i) => {
        const pixel = dataToPixel(pt.step, pt[key]);
        if (i === 0) ctx.moveTo(pixel.x, pixel.y);
        else ctx.lineTo(pixel.x, pixel.y);
      });
      ctx.stroke();
      ctx.setLineDash([]);
    };
    drawSeries("A", isDark ? "#f87171" : "rgba(220, 38, 38, 0.8)", []);
    // B dashed so the two series differ by more than color
    drawSeries("B", isDark ? "#60a5fa" : "rgba(37, 99, 235, 0.8)", [6, 3]);
  }, [currentTheme]);

  // ---- One Markov step for all particles ----
  const doMarkovStep = useCallback(() => {
    const anim = animRef.current;
    const layout = anim.layout;
    const particles = anim.particles;
    const comps = particles.map((p) => p.compartment);
    const switched = markovStep(comps, probAB / 100, probBA / 100);
    for (const i of switched) {
      const p = particles[i];
      p.compartment = comps[i];
      if (p.transitioning) {
        // Switched again mid-flight: turn around from where it is now
        if (layout) startVisualTransition(p, layout);
      } else if (p.flightDelay !== null) {
        // Switched back before its flight started: it never left
        p.flightDelay = null;
      } else {
        // Start the flight at a random moment within this step
        p.flightDelay = Math.random() / STEPS_PER_SECOND;
      }
    }
    let countA = 0;
    for (let i = 0; i < comps.length; i++) if (comps[i] === "A") countA++;
    anim.countA = countA;
    anim.countB = comps.length - countA;
    anim.step += 1;
    anim.history.push({ step: anim.step, A: anim.countA, B: anim.countB });
    // Trim by step window, not by sample count
    while (anim.history.length > 0 && anim.history[0].step < anim.step - WINDOW_STEPS) {
      anim.history.shift();
    }
  }, [probAB, probBA]);

  // ---- Animation loop (real elapsed time) ----
  const loop = useAnimationLoop((dt) => {
    const anim = animRef.current;
    const layout = ensureLayout();
    if (!layout) return true;

    // Markov steps due in this frame
    anim.carry += dt * STEPS_PER_SECOND;
    let stepped = false;
    while (anim.carry >= 1) {
      anim.carry -= 1;
      doMarkovStep();
      stepped = true;
    }

    // Visual update: scheduled flights, Brownian motion, flight arcs
    for (const p of anim.particles) {
      if (p.flightDelay !== null) {
        p.flightDelay -= dt;
        if (p.flightDelay <= 0) startVisualTransition(p, layout);
      }
      updateParticleVisual(p, layout, dt);
    }

    drawDynamic();
    if (stepped) {
      setSnapshot({ step: anim.step, countA: anim.countA, countB: anim.countB });
    }
    return true;
  });

  // Redraw static layer on theme / probability / resize
  useEffect(() => {
    drawStaticElements();
  }, [drawStaticElements]);

  // Redraw the dynamic layer when names or theme change (while not animating)
  useEffect(() => {
    if (!loop.isRunning()) drawDynamic();
  }, [drawDynamic, loop]);

  // Redraw the time series after every render that could change it
  // (new step, theme, axis range)
  useEffect(() => {
    drawTimeSeries();
  });

  // ---- Button handlers ----

  const handleStart = useCallback(() => {
    const anim = animRef.current;

    // If paused, resume
    if (status === "paused" && anim.particles.length > 0) {
      setStatus("running");
      loop.start();
      return;
    }

    loop.stop();
    const layout = ensureLayout();
    if (!layout) return;

    // Create particles
    const particles = [];
    const { compA, compB } = layout;
    for (let i = 0; i < popA; i++) {
      particles.push(
        createParticle(
          compA.x + 10 + Math.random() * (compA.w - 20),
          compA.y + 10 + Math.random() * (compA.h - 20),
          "A",
        ),
      );
    }
    for (let i = 0; i < popB; i++) {
      particles.push(
        createParticle(
          compB.x + 10 + Math.random() * (compB.w - 20),
          compB.y + 10 + Math.random() * (compB.h - 20),
          "B",
        ),
      );
    }

    anim.particles = particles;
    anim.step = 0;
    anim.carry = 0;
    anim.countA = popA;
    anim.countB = popB;
    anim.history = [{ step: 0, A: popA, B: popB }];

    setRunPops({ A: popA, B: popB });
    setSnapshot({ step: 0, countA: popA, countB: popB });
    setStatus("running");
    drawStaticElements();
    loop.start();
  }, [status, loop, ensureLayout, popA, popB, drawStaticElements]);

  const handlePause = useCallback(() => {
    if (status !== "running") return;
    loop.stop();
    setStatus("paused");
  }, [status, loop]);

  const handleReset = useCallback(() => {
    loop.stop();
    const anim = animRef.current;
    anim.particles = [];
    anim.step = 0;
    anim.carry = 0;
    anim.history = [];
    setRunPops(null);
    setSnapshot({ step: 0, countA: 0, countB: 0 });
    setStatus("stopped");
    clearCanvas(tsCanvasRef.current);
    drawStaticElements();
    drawDynamic();
  }, [loop, drawStaticElements, drawDynamic]);

  // Axes: the y-axis follows the run's total population; the x-axis shows
  // the last WINDOW_STEPS steps (scrolling once the window is full)
  const totalPop = runPops ? runPops.A + runPops.B : popA + popB;
  const maxPop = Math.max(totalPop, 10);
  const xStart = Math.max(0, snapshot.step - WINDOW_STEPS);
  const xRange = [xStart, xStart + WINDOW_STEPS];
  const xTicks = linearTicks(xRange[0], xRange[1], 50);
  const yTicks = ticksInRange(niceTicks(0, maxPop, 4), 0, maxPop);

  const hasRun = runPops !== null;
  const shownA = hasRun ? snapshot.countA : popA;
  const shownB = hasRun ? snapshot.countB : popB;
  const popsEdited = hasRun && (runPops.A !== popA || runPops.B !== popB);

  return (
    <ToolContainer
      title="Two Compartment Markov Model"
      canvasWidth={10}
      canvasHeight={6}
    >
      {/* Compartment Visualization */}
      <GridWindow
        x={0}
        y={0}
        w={7}
        h={4}
        variant="rectangular"
        tooltip="Compartment visualization"
        theme={theme}
      >
        <canvas
          ref={staticCanvasRef}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
          }}
        />
        <canvas
          ref={dynamicCanvasRef}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
          }}
        />
      </GridWindow>

      {/* Compartment A Name */}
      <GridTextInput
        x={7}
        y={0}
        w={2}
        h={1}
        value={nameA}
        onChange={setNameA}
        label="Compartment A Name"
        maxLength={8}
        title="Compartment A name"
        theme={theme}
      />

      {/* Population A */}
      <GridInput
        x={9}
        y={0}
        value={popA}
        onChange={setPopA}
        min={0}
        max={1000}
        step={1}
        variable={
          <span>
            N<sub style={{ fontSize: "0.7em" }}>A</sub>
          </span>
        }
        title="Starting population A"
        theme={theme}
      />

      {/* Compartment B Name */}
      <GridTextInput
        x={7}
        y={1}
        w={2}
        h={1}
        value={nameB}
        onChange={setNameB}
        label="Compartment B Name"
        maxLength={8}
        title="Compartment B name"
        theme={theme}
      />

      {/* Population B */}
      <GridInput
        x={9}
        y={1}
        value={popB}
        onChange={setPopB}
        min={0}
        max={1000}
        step={1}
        variable={
          <span>
            N<sub style={{ fontSize: "0.7em" }}>B</sub>
          </span>
        }
        title="Starting population B"
        theme={theme}
      />

      {/* P(A→B) slider */}
      <GridSliderHorizontal
        x={7}
        y={2}
        w={3}
        h={1}
        value={probAB * 2.5}
        onChange={(value) => setProbAB(value / 2.5)}
        variant="unipolar"
        label={`P(A→B) = ${probAB.toFixed(1)}%`}
        tooltip="Transition probability A to B per time step"
        theme={theme}
      />

      {/* P(B→A) slider */}
      <GridSliderHorizontal
        x={7}
        y={3}
        w={3}
        h={1}
        value={probBA * 2.5}
        onChange={(value) => setProbBA(value / 2.5)}
        variant="unipolar"
        label={`P(B→A) = ${probBA.toFixed(1)}%`}
        tooltip="Transition probability B to A per time step"
        theme={theme}
      />

      {/* Start Button */}
      <GridButton
        x={7}
        y={4}
        type="momentary"
        onPress={handleStart}
        tooltip="Start simulation"
        theme={theme}
      >
        <div style={{ textAlign: "center", lineHeight: "1.1" }}>
          <div>Start</div>
        </div>
      </GridButton>

      {/* Pause Button */}
      <GridButton
        x={8}
        y={4}
        type="momentary"
        onPress={handlePause}
        tooltip="Pause simulation"
        theme={theme}
      >
        <div style={{ textAlign: "center", lineHeight: "1.1" }}>
          <div>Pause</div>
        </div>
      </GridButton>

      {/* Reset Button */}
      <GridButton
        x={9}
        y={4}
        type="momentary"
        variant="function"
        onPress={handleReset}
        tooltip="Reset simulation"
        theme={theme}
      >
        <div style={{ textAlign: "center", lineHeight: "1.1" }}>
          <div>Reset</div>
        </div>
      </GridButton>

      {/* Status Display */}
      <GridDisplay
        x={7}
        y={5}
        w={3}
        h={1}
        variant="info"
        align="left"
        fontSize="small"
        theme={theme}
      >
        <div style={{ padding: "4px", fontSize: "0.85em" }}>
          <div>
            <strong>
              {status === "running"
                ? "Running"
                : status === "paused"
                  ? "Paused"
                  : "Stopped"}
            </strong>
            {hasRun && <span> | Step {snapshot.step}</span>}
          </div>
          <div style={{ marginTop: "3px", fontSize: "0.9em", opacity: 0.8 }}>
            <span
              style={{ color: currentTheme === "dark" ? "#f87171" : "#dc2626" }}
            >
              {"\u25A0"} {nameA}: {shownA}
            </span>
            <span
              style={{
                marginLeft: "8px",
                color: currentTheme === "dark" ? "#60a5fa" : "#2563eb",
              }}
            >
              {"\u25A0"} {nameB}: {shownB} (dashed)
            </span>
          </div>
          {popsEdited && (
            <div style={{ fontSize: "0.8em", opacity: 0.7 }}>
              New N applies after Reset
            </div>
          )}
        </div>
      </GridDisplay>

      {/* Time Series Graph */}
      <GridGraph
        x={0}
        y={4}
        w={7}
        h={2}
        xLabel="time"
        yLabel="population"
        xUnit="steps"
        variant="time-series-static"
        xRange={xRange}
        yRange={[0, maxPop]}
        xTicks={xTicks}
        yTicks={yTicks}
        tooltip="Population over time (every step)"
        theme={theme}
      >
        {(transform) => {
          tsTransformRef.current = transform;
          return (
            <canvas
              ref={tsCanvasRef}
              className="absolute pointer-events-none"
              style={transform.plotStyle}
            />
          );
        }}
      </GridGraph>
    </ToolContainer>
  );
};

export default TwoCompartmentMarkovTool;
