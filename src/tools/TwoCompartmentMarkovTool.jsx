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

// ---- Particle visual state (lightweight plain objects) ----
// Each particle has:
//   compartment: "A"|"B"  — authoritative, set by Markov engine
//   x, y, vx, vy         — visual position & velocity (Brownian motion)
//   transitioning: bool   — true while flying between compartments
//   transitionProgress: 0..1
//   tp0..tp3 x/y          — Bézier control points for transition arc

function createParticle(x, y, compartment, batchOffset) {
  return {
    x,
    y,
    vx: (Math.random() - 0.5) * 3,
    vy: (Math.random() - 0.5) * 3,
    compartment,
    prevCompartment: compartment, // snapshot before current batch
    batchOffset,                  // staggered frame offset for this particle's batch
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

// Visual-only update: Brownian drift within compartment bounds, or Bézier arc
function updateParticleVisual(p, bounds, transitionSpeed) {
  if (p.transitioning) {
    p.transitionProgress += transitionSpeed;
    if (p.transitionProgress >= 1) {
      p.transitioning = false;
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

  // Brownian motion within compartment
  p.x += p.vx;
  p.y += p.vy;

  const r = 2;
  if (p.x - r < bounds.x) { p.x = bounds.x + r; p.vx = Math.abs(p.vx); }
  if (p.x + r > bounds.x + bounds.w) { p.x = bounds.x + bounds.w - r; p.vx = -Math.abs(p.vx); }
  if (p.y - r < bounds.y) { p.y = bounds.y + r; p.vy = Math.abs(p.vy); }
  if (p.y + r > bounds.y + bounds.h) { p.y = bounds.y + bounds.h - r; p.vy = -Math.abs(p.vy); }

  // Random perturbation
  p.vx += (Math.random() - 0.5) * 0.4;
  p.vy += (Math.random() - 0.5) * 0.4;

  // Speed limit
  const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
  if (speed > 3) {
    p.vx = (p.vx / speed) * 3;
    p.vy = (p.vy / speed) * 3;
  }
}

// Start visual transition arc from current position to random spot in destination
function startVisualTransition(p, compA, compB, tunnelX, tunnelW, centerY, isAtoB) {
  p.transitioning = true;
  p.transitionProgress = 0;

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

  // Simulation display state
  const [isRunning, setIsRunning] = useState(false);
  const [displayPopA, setDisplayPopA] = useState(500);
  const [displayPopB, setDisplayPopB] = useState(500);
  const [displayStep, setDisplayStep] = useState(0);

  // Markov steps per particle batch: run this many discrete steps per particle,
  // then animate only if the particle's compartment has a net change.
  const STEPS_PER_BATCH = 8;

  // Animation frames between a particle's batch evaluations.
  // Each particle has a random offset so batches are staggered across all frames,
  // producing a continuous trickle of transitions rather than synchronized bursts.
  const FRAMES_PER_BATCH = 40;

  // Animation state — mutable ref, no React re-renders during animation
  const animRef = useRef({
    particles: [],
    isRunning: false,
    animationId: null,
    markovStep: 0,       // discrete Markov step counter
    frameCount: 0,       // animation frame counter within current step
    history: { A: [], B: [] },
    compA: null,
    compB: null,
    tunnelX: 0,
    tunnelW: 0,
    centerY: 0,
    paused: false,
    probAB: 5,
    probBA: 5,
    nameA: "A",
    nameB: "B",
  });

  // Sync UI params to animation ref
  useEffect(() => {
    animRef.current.probAB = probAB;
    animRef.current.probBA = probBA;
    animRef.current.nameA = nameA;
    animRef.current.nameB = nameB;
  }, [probAB, probBA, nameA, nameB]);

  // ---- Compute layout ----
  const computeLayout = useCallback((w, h) => {
    const margin = 20;
    const tunnelW = w / 7;
    const compW = (w - tunnelW - margin * 2) / 2;
    const compH = h - margin * 2 - 30;
    const topOffset = margin + 25;

    const compA = { x: margin, y: topOffset, w: compW, h: compH };
    const compB = { x: w - margin - compW, y: topOffset, w: compW, h: compH };
    const tunnelX = compA.x + compA.w;
    const centerY = topOffset + compH / 2;

    return { compA, compB, tunnelX, tunnelW, centerY };
  }, []);

  // ---- Draw static background ----
  const drawStaticElements = useCallback(
    (canvas, ctx) => {
      const w = canvas.width;
      const h = canvas.height;
      const anim = animRef.current;
      const isDark = currentTheme === "dark";

      ctx.fillStyle = isDark ? "#111827" : "#ffffff";
      ctx.fillRect(0, 0, w, h);

      const { compA, compB, tunnelX, tunnelW, centerY } = anim;
      if (!compA) return;

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
      ctx.fillText(`${anim.probAB.toFixed(1)}%`, topArrX, topTunnelY - flareH / 2 - 10);
      ctx.fillText(`${anim.probBA.toFixed(1)}%`, bottomArrX, bottomTunnelY + flareH / 2 + 10);

      // Compartment name labels (static when not running)
      if (!anim.isRunning) {
        ctx.font = "bold 14px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillStyle = isDark ? "#f87171" : "#dc2626";
        ctx.fillText(anim.nameA, compA.x + compA.w / 2, compA.y - 6);
        ctx.fillStyle = isDark ? "#60a5fa" : "#2563eb";
        ctx.fillText(anim.nameB, compB.x + compB.w / 2, compB.y - 6);
      }
    },
    [currentTheme],
  );

  // ---- Draw particles (dynamic layer, every frame) ----
  const drawParticles = useCallback(
    (canvas, ctx) => {
      const anim = animRef.current;
      const isDark = currentTheme === "dark";
      const particles = anim.particles;
      const { compA, compB } = anim;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (!compA || particles.length === 0) return;

      const colorTransition = isDark ? "rgba(250, 204, 21, 0.8)" : "rgba(180, 130, 0, 0.7)";
      const colorA = isDark ? "rgba(248, 113, 113, 0.7)" : "rgba(220, 38, 38, 0.5)";
      const colorB = isDark ? "rgba(96, 165, 250, 0.7)" : "rgba(37, 99, 235, 0.5)";

      // Sort into batches by visual state (minimizes fillStyle changes)
      const batchA = [];
      const batchB = [];
      const batchT = [];
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (p.transitioning) {
          batchT.push(p);
        } else if (p.compartment === "A") {
          batchA.push(p);
        } else {
          batchB.push(p);
        }
      }

      // Draw A particles
      ctx.fillStyle = colorA;
      ctx.beginPath();
      for (let i = 0; i < batchA.length; i++) {
        const p = batchA[i];
        ctx.moveTo(p.x + 2, p.y);
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
      }
      ctx.fill();

      // Draw B particles
      ctx.fillStyle = colorB;
      ctx.beginPath();
      for (let i = 0; i < batchB.length; i++) {
        const p = batchB[i];
        ctx.moveTo(p.x + 2, p.y);
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
      }
      ctx.fill();

      // Draw transitioning particles
      if (batchT.length > 0) {
        ctx.fillStyle = colorTransition;
        ctx.beginPath();
        for (let i = 0; i < batchT.length; i++) {
          const p = batchT[i];
          ctx.moveTo(p.x + 2, p.y);
          ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
        }
        ctx.fill();
      }

      // Population count labels — use authoritative Markov counts, not visual counts
      const countA = anim._markovCountA;
      const countB = anim._markovCountB;

      ctx.font = "bold 14px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillStyle = isDark ? "#f87171" : "#dc2626";
      ctx.fillText(`${anim.nameA}: ${countA}`, compA.x + compA.w / 2, compA.y - 6);
      ctx.fillStyle = isDark ? "#60a5fa" : "#2563eb";
      ctx.fillText(`${anim.nameB}: ${countB}`, compB.x + compB.w / 2, compB.y - 6);
    },
    [currentTheme],
  );

  // ---- Draw time series ----
  const drawTimeSeries = useCallback(() => {
    const canvas = tsCanvasRef.current;
    const transform = tsTransformRef.current;
    if (!canvas || !transform) return;

    const ctx = canvas.getContext("2d");
    const { dataToPixel } = transform;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const history = animRef.current.history;
    if (history.A.length < 2) return;

    const isDark = currentTheme === "dark";

    ctx.strokeStyle = isDark ? "#f87171" : "rgba(220, 38, 38, 0.8)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    history.A.forEach((pop, i) => {
      const pixel = dataToPixel(i, pop);
      if (i === 0) ctx.moveTo(pixel.x, pixel.y);
      else ctx.lineTo(pixel.x, pixel.y);
    });
    ctx.stroke();

    ctx.strokeStyle = isDark ? "#60a5fa" : "rgba(37, 99, 235, 0.8)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    history.B.forEach((pop, i) => {
      const pixel = dataToPixel(i, pop);
      if (i === 0) ctx.moveTo(pixel.x, pixel.y);
      else ctx.lineTo(pixel.x, pixel.y);
    });
    ctx.stroke();
  }, [currentTheme]);

  // ---- Run a Markov batch for a single particle ----
  // Pure math: run STEPS_PER_BATCH coin flips. If net compartment changed,
  // trigger a visual transition arc.
  const runParticleBatch = useCallback((p, pAB, pBA, compA, compB, tunnelX, tunnelW, centerY) => {
    const before = p.compartment;

    for (let step = 0; step < STEPS_PER_BATCH; step++) {
      if (p.compartment === "A") {
        if (Math.random() < pAB) p.compartment = "B";
      } else {
        if (Math.random() < pBA) p.compartment = "A";
      }
    }

    // Only animate if net compartment changed
    if (p.compartment !== before) {
      const isAtoB = before === "A";
      startVisualTransition(p, compA, compB, tunnelX, tunnelW, centerY, isAtoB);
    }
  }, []);

  // ---- Animation loop ----
  const animationLoop = useCallback(() => {
    const anim = animRef.current;
    if (!anim.isRunning) return;

    const canvas = dynamicCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const { compA, compB, particles, tunnelX, tunnelW, centerY } = anim;
    const n = particles.length;

    // Transition animation speed: complete arc in ~2x FRAMES_PER_BATCH for a leisurely drift
    const transitionSpeed = 1.0 / (FRAMES_PER_BATCH * 2);

    // Visual update: move all particles (Brownian + Bézier arcs)
    for (let i = 0; i < n; i++) {
      const p = particles[i];
      if (p.transitioning) {
        updateParticleVisual(p, null, transitionSpeed);
      } else {
        updateParticleVisual(p, p.compartment === "A" ? compA : compB, transitionSpeed);
      }
    }

    // Staggered Markov batches: each particle runs its batch when
    // (frameCount + batchOffset) hits its FRAMES_PER_BATCH boundary.
    // This spreads transitions evenly across all frames.
    anim.frameCount++;
    const frame = anim.frameCount;
    const pAB = anim.probAB / 100;
    const pBA = anim.probBA / 100;

    for (let i = 0; i < n; i++) {
      const p = particles[i];
      if ((frame + p.batchOffset) % FRAMES_PER_BATCH === 0) {
        runParticleBatch(p, pAB, pBA, compA, compB, tunnelX, tunnelW, centerY);
      }
    }

    // Count from authoritative compartment fields (every frame for smooth display)
    let countA = 0;
    let countB = 0;
    for (let i = 0; i < n; i++) {
      if (particles[i].compartment === "A") countA++;
      else countB++;
    }
    anim._markovCountA = countA;
    anim._markovCountB = countB;

    // Record history every FRAMES_PER_BATCH frames (global clock, not per-particle)
    if (frame % FRAMES_PER_BATCH === 0) {
      anim.markovStep += STEPS_PER_BATCH;

      anim.history.A.push(countA);
      anim.history.B.push(countB);
      if (anim.history.A.length > 200) {
        anim.history.A.shift();
        anim.history.B.shift();
      }

      setDisplayPopA(countA);
      setDisplayPopB(countB);
      setDisplayStep(anim.markovStep);
      drawTimeSeries();
    }

    // Draw particles every frame
    drawParticles(canvas, ctx);

    anim.animationId = requestAnimationFrame(animationLoop);
  }, [drawParticles, drawTimeSeries, runParticleBatch]);

  // ---- Draw static (non-animated) state ----
  const drawStatic = useCallback(() => {
    const sCanvas = staticCanvasRef.current;
    const dCanvas = dynamicCanvasRef.current;
    if (!sCanvas) return;

    const rect = sCanvas.parentElement.getBoundingClientRect();
    sCanvas.width = rect.width;
    sCanvas.height = rect.height;
    if (dCanvas) {
      dCanvas.width = rect.width;
      dCanvas.height = rect.height;
    }

    const layout = computeLayout(sCanvas.width, sCanvas.height);
    animRef.current.compA = layout.compA;
    animRef.current.compB = layout.compB;
    animRef.current.tunnelX = layout.tunnelX;
    animRef.current.tunnelW = layout.tunnelW;
    animRef.current.centerY = layout.centerY;

    const ctx = sCanvas.getContext("2d");
    drawStaticElements(sCanvas, ctx);

    if (dCanvas) {
      const dCtx = dCanvas.getContext("2d");
      dCtx.clearRect(0, 0, dCanvas.width, dCanvas.height);
    }
  }, [computeLayout, drawStaticElements]);

  // Redraw static layer on theme/param changes
  useEffect(() => {
    if (!animRef.current.isRunning && !animRef.current.paused) {
      drawStatic();
    } else {
      const sCanvas = staticCanvasRef.current;
      if (sCanvas) {
        const ctx = sCanvas.getContext("2d");
        drawStaticElements(sCanvas, ctx);
      }
      if (animRef.current.paused) {
        const dCanvas = dynamicCanvasRef.current;
        if (dCanvas) {
          const dCtx = dCanvas.getContext("2d");
          drawParticles(dCanvas, dCtx);
        }
      }
    }
  }, [drawStatic, drawStaticElements, drawParticles, currentTheme, nameA, nameB, probAB, probBA]);

  // Initialize
  useEffect(() => {
    drawStatic();
  }, []);

  // ---- Button handlers ----

  const handleStart = useCallback(() => {
    const anim = animRef.current;

    // If paused, resume
    if (anim.paused && anim.particles.length > 0) {
      anim.paused = false;
      anim.isRunning = true;
      setIsRunning(true);
      animationLoop();
      return;
    }

    // Stop any running animation
    if (anim.animationId) {
      cancelAnimationFrame(anim.animationId);
      anim.animationId = null;
    }

    // Initialize canvases and layout
    const sCanvas = staticCanvasRef.current;
    const dCanvas = dynamicCanvasRef.current;
    if (!sCanvas || !dCanvas) return;
    const rect = sCanvas.parentElement.getBoundingClientRect();
    sCanvas.width = rect.width;
    sCanvas.height = rect.height;
    dCanvas.width = rect.width;
    dCanvas.height = rect.height;

    const layout = computeLayout(sCanvas.width, sCanvas.height);
    anim.compA = layout.compA;
    anim.compB = layout.compB;
    anim.tunnelX = layout.tunnelX;
    anim.tunnelW = layout.tunnelW;
    anim.centerY = layout.centerY;

    // Create particles with staggered batch offsets
    const particles = [];
    const { compA, compB } = layout;
    for (let i = 0; i < popA; i++) {
      particles.push(
        createParticle(
          compA.x + 10 + Math.random() * (compA.w - 20),
          compA.y + 10 + Math.random() * (compA.h - 20),
          "A",
          Math.floor(Math.random() * FRAMES_PER_BATCH),
        ),
      );
    }
    for (let i = 0; i < popB; i++) {
      particles.push(
        createParticle(
          compB.x + 10 + Math.random() * (compB.w - 20),
          compB.y + 10 + Math.random() * (compB.h - 20),
          "B",
          Math.floor(Math.random() * FRAMES_PER_BATCH),
        ),
      );
    }

    anim.particles = particles;
    anim.markovStep = 0;
    anim.frameCount = 0;
    anim._markovCountA = popA;
    anim._markovCountB = popB;
    anim.history = { A: [popA], B: [popB] };
    anim.isRunning = true;
    anim.paused = false;

    setIsRunning(true);
    setDisplayPopA(popA);
    setDisplayPopB(popB);
    setDisplayStep(0);

    // Draw static background once
    const sCtx = sCanvas.getContext("2d");
    drawStaticElements(sCanvas, sCtx);

    // Clear time series
    const tsCanvas = tsCanvasRef.current;
    if (tsCanvas) {
      const ctx = tsCanvas.getContext("2d");
      ctx.clearRect(0, 0, tsCanvas.width, tsCanvas.height);
    }

    // Start animation
    animationLoop();
  }, [popA, popB, computeLayout, drawStaticElements, animationLoop]);

  const handlePause = useCallback(() => {
    const anim = animRef.current;
    if (!anim.isRunning) return;

    if (anim.animationId) {
      cancelAnimationFrame(anim.animationId);
      anim.animationId = null;
    }
    anim.isRunning = false;
    anim.paused = true;

    setIsRunning(false);
  }, []);

  const handleReset = useCallback(() => {
    const anim = animRef.current;

    if (anim.animationId) {
      cancelAnimationFrame(anim.animationId);
      anim.animationId = null;
    }
    anim.isRunning = false;
    anim.paused = false;
    anim.particles = [];
    anim.markovStep = 0;
    anim.frameCount = 0;
    anim.history = { A: [], B: [] };

    setIsRunning(false);
    setDisplayPopA(popA);
    setDisplayPopB(popB);
    setDisplayStep(0);

    const tsCanvas = tsCanvasRef.current;
    if (tsCanvas) {
      const ctx = tsCanvas.getContext("2d");
      ctx.clearRect(0, 0, tsCanvas.width, tsCanvas.height);
    }

    drawStatic();
  }, [popA, popB, drawStatic]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const anim = animRef.current;
      if (anim.animationId) {
        cancelAnimationFrame(anim.animationId);
      }
      anim.isRunning = false;
    };
  }, []);

  const totalPop = popA + popB;
  const maxPop = Math.max(totalPop, 10);

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
        onChange={(value) => {
          setPopA(value);
          if (!animRef.current.isRunning) setDisplayPopA(value);
        }}
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
        onChange={(value) => {
          setPopB(value);
          if (!animRef.current.isRunning) setDisplayPopB(value);
        }}
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
              {isRunning
                ? "Running"
                : animRef.current.paused
                  ? "Paused"
                  : "Stopped"}
            </strong>
            {displayStep > 0 && <span> | Step {displayStep}</span>}
          </div>
          <div style={{ marginTop: "3px", fontSize: "0.9em", opacity: 0.8 }}>
            <span
              style={{ color: currentTheme === "dark" ? "#f87171" : "#dc2626" }}
            >
              {"■"} {nameA}: {displayPopA}
            </span>
            <span
              style={{
                marginLeft: "8px",
                color: currentTheme === "dark" ? "#60a5fa" : "#2563eb",
              }}
            >
              {"■"} {nameB}: {displayPopB}
            </span>
          </div>
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
        xRange={[0, 200]}
        yRange={[0, maxPop]}
        xTicks={[0, 50, 100, 150, 200]}
        yTicks={(() => {
          const step = Math.ceil(maxPop / 4);
          return [0, step, step * 2, step * 3, step * 4].filter(
            (v) => v <= maxPop,
          );
        })()}
        tooltip="Population over time"
        theme={theme}
      >
        {(transform) => {
          tsTransformRef.current = transform;
          return (
            <canvas
              ref={tsCanvasRef}
              className="absolute pointer-events-none"
              style={transform.plotStyle}
              width={transform.plotWidth}
              height={transform.plotHeight}
            />
          );
        }}
      </GridGraph>
    </ToolContainer>
  );
};

export default TwoCompartmentMarkovTool;
