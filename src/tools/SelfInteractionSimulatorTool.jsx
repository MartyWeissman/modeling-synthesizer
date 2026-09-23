import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  GridWindow,
  GridButton,
  GridInput,
  GridDisplay,
  GridLabel,
  GridSound,
} from "../components/grid";
import ToolContainer from "../components/ui/ToolContainer";
import { useTheme } from "../hooks/useTheme";
import { useSoundEffects } from "../hooks/useSoundEffects";
import { useAnimationLoop } from "../hooks/useAnimationLoop";
import { setupCanvas } from "../utils/canvas";

// Constants. The simulation lives in a fixed 400 × 400 "dish" (drawn scaled
// to the canvas size), so hit counts do not depend on screen size.
const SIM_SIZE = 400;
const SIM_RADIUS = SIM_SIZE / 2;
const PARTICLE_SIZE = 10;
const VELOCITY = 2; // dish pixels per 1/60 s (120 px/s), as before
const DIRECTION_CHANGE_INTERVAL = 1000; // ms
const RUN_SECONDS = 10; // lab manual: "each run should take 10 seconds"
const FRAME_MS = 1000 / 60;

// Particle Class
class Particle {
  constructor(id, canvasRadius = SIM_RADIUS, rng = Math.random) {
    this.id = id;
    this.canvasRadius = canvasRadius;
    this.rng = rng;
    this.initializePosition();
    this.angle = rng() * 2 * Math.PI;
    this.updateVelocity();
    // Time since the last direction change (random offset 0-1000 ms)
    this.sinceTurn = rng() * DIRECTION_CHANGE_INTERVAL;
  }

  initializePosition() {
    const r =
      Math.sqrt(this.rng()) * (this.canvasRadius - PARTICLE_SIZE / 2);
    const theta = this.rng() * 2 * Math.PI;
    this.x = this.canvasRadius + r * Math.cos(theta);
    this.y = this.canvasRadius + r * Math.sin(theta);
  }

  updateVelocity() {
    this.vx = VELOCITY * Math.cos(this.angle);
    this.vy = VELOCITY * Math.sin(this.angle);
  }

  // Advance by `frames` sixtieths of a second (frames <= 1).
  update(frames) {
    this.x += this.vx * frames;
    this.y += this.vy * frames;

    const dx = this.x - this.canvasRadius;
    const dy = this.y - this.canvasRadius;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance + PARTICLE_SIZE / 2 > this.canvasRadius) {
      // Reflect off circular boundary
      const nx = dx / distance;
      const ny = dy / distance;
      const dotProduct = this.vx * nx + this.vy * ny;
      this.vx -= 2 * dotProduct * nx;
      this.vy -= 2 * dotProduct * ny;
      this.angle = Math.atan2(this.vy, this.vx);

      // Push particle back inside boundary
      const overlapDistance = distance + PARTICLE_SIZE / 2 - this.canvasRadius;
      this.x -= overlapDistance * nx;
      this.y -= overlapDistance * ny;
    }

    // Change direction about once a second
    this.sinceTurn += frames * FRAME_MS;
    if (this.sinceTurn > DIRECTION_CHANGE_INTERVAL) {
      this.changeDirection();
      this.sinceTurn = 0;
    }
  }

  changeDirection() {
    const change = this.rng() < 0.5 ? Math.PI / 4 : -Math.PI / 4;
    this.angle += change;
    this.updateVelocity();
  }

  draw(ctx) {
    // Create radial gradient for sphere effect
    const gradient = ctx.createRadialGradient(
      this.x - PARTICLE_SIZE / 4,
      this.y - PARTICLE_SIZE / 4,
      0,
      this.x,
      this.y,
      PARTICLE_SIZE / 2,
    );
    gradient.addColorStop(0, "rgba(255, 200, 100, 0.9)"); // Light center
    gradient.addColorStop(0.5, "rgba(255, 140, 0, 0.8)"); // Orange middle
    gradient.addColorStop(1, "rgba(200, 100, 0, 0.7)"); // Dark edge

    ctx.beginPath();
    ctx.arc(this.x, this.y, PARTICLE_SIZE / 2, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
  }
}

// Firework Class
class Firework {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.particles = [];
    this.lifespan = 500; // 0.5 seconds

    for (let i = 0; i < 10; i++) {
      this.particles.push({
        x: this.x,
        y: this.y,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        radius: Math.random() + 0.5,
        alpha: 1,
      });
    }
  }

  update(deltaTime) {
    this.lifespan -= deltaTime;
    const frames = deltaTime / FRAME_MS;
    this.particles.forEach((p) => {
      p.x += p.vx * frames;
      p.y += p.vy * frames;
      p.alpha = Math.max(0, p.alpha - deltaTime / 500);
    });
  }

  draw(ctx) {
    this.particles.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 0, 0, ${p.alpha})`;
      ctx.fill();
    });
  }
}

/** A fresh run with n particles: { n, particles, hitMatrix, hits, remaining }. */
// eslint-disable-next-line react-refresh/only-export-components
export function createRun(n, rng = Math.random) {
  const particles = [];
  for (let i = 0; i < n; i++) particles.push(new Particle(i, SIM_RADIUS, rng));
  return {
    n,
    particles,
    hitMatrix: Array.from({ length: n }, () => Array(n).fill(false)),
    hits: 0,
    remaining: RUN_SECONDS,
  };
}

/**
 * Advance a run by dtSeconds of real time, in sub-steps no longer than one
 * 1/60 s frame (so a 120 Hz display gives the same motion and hit counts as
 * a 60 Hz one). Calls onHit(x, y) for every new pair collision. Returns the
 * number of new hits.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function stepRun(run, dtSeconds, onHit) {
  const dt = Math.min(dtSeconds, run.remaining);
  if (!(dt > 0)) return 0;
  const n = Math.max(1, Math.ceil(dt * 60 - 1e-9));
  const frames = (dt * 60) / n;
  const { particles, hitMatrix } = run;
  let newHits = 0;
  for (let s = 0; s < n; s++) {
    particles.forEach((particle) => particle.update(frames));
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        if (hitMatrix[i][j]) continue;
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        if (Math.sqrt(dx * dx + dy * dy) < PARTICLE_SIZE) {
          hitMatrix[i][j] = true;
          run.hits++;
          newHits++;
          onHit?.(
            (particles[i].x + particles[j].x) / 2,
            (particles[i].y + particles[j].y) / 2,
          );
        }
      }
    }
  }
  run.remaining = Math.max(0, run.remaining - dt);
  if (run.remaining < 1e-9) run.remaining = 0;
  return newHits;
}

const SelfInteractionSimulatorTool = () => {
  const { theme, currentTheme } = useTheme();

  // Sound effects (on/off toggle)
  const { setIsEnabled, collisionPing } = useSoundEffects();

  // State
  const [numParticles, setNumParticles] = useState(10);
  // "ready" (not started) | "running" | "paused" | "finished"
  const [status, setStatus] = useState("ready");
  const [timer, setTimer] = useState(RUN_SECONDS);
  const [hits, setHits] = useState(0);
  const [runN, setRunN] = useState(10); // N used by the current run

  // Refs for animation
  const canvasRef = useRef(null);
  const runRef = useRef(null);
  const fireworksRef = useRef([]);
  const statusRef = useRef("ready");

  const setRunStatus = useCallback((s) => {
    statusRef.current = s;
    setStatus(s);
  }, []);

  // Draw the dish, particles and fireworks (dish coordinates scaled to the
  // canvas's CSS size; sharp on HiDPI screens)
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const setup = setupCanvas(canvas);
    if (!setup) return;
    const { ctx, width, height } = setup;
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.scale(width / SIM_SIZE, height / SIM_SIZE);
    ctx.beginPath();
    ctx.arc(SIM_RADIUS, SIM_RADIUS, SIM_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = currentTheme === "dark" ? "#1f2937" : "#e6f3ff";
    ctx.fill();
    runRef.current?.particles.forEach((particle) => particle.draw(ctx));
    fireworksRef.current.forEach((firework) => firework.draw(ctx));
    ctx.restore();
  }, [currentTheme]);

  // Start a new (not yet running) run with n particles
  const newRun = useCallback(
    (n) => {
      runRef.current = createRun(n);
      fireworksRef.current = [];
      setRunN(n);
      setHits(0);
      setTimer(RUN_SECONDS);
    },
    [],
  );

  // Animation loop: advances by real elapsed time
  const { start: startLoop, stop: stopLoop } = useAnimationLoop((dtSeconds) => {
    const run = runRef.current;
    if (!run || statusRef.current !== "running") return false;

    const newHits = stepRun(run, dtSeconds, (x, y) => {
      fireworksRef.current.push(new Firework(x, y));
    });
    if (newHits > 0) {
      setHits(run.hits);
      collisionPing(); // rate-limited automatically
    }
    fireworksRef.current = fireworksRef.current.filter((firework) => {
      firework.update(dtSeconds * 1000);
      return firework.lifespan > 0;
    });
    draw();

    // Timer display (tenths of a second)
    setTimer(Math.round(run.remaining * 10) / 10);
    if (run.remaining <= 0) {
      setRunStatus("finished");
      return false;
    }
    return true;
  });

  // Control handlers
  const handleStart = useCallback(() => {
    // After a finished run, Start begins a new 10-second run; otherwise it
    // starts or resumes the current one.
    if (statusRef.current === "finished" || !runRef.current) {
      newRun(numParticles);
    }
    setRunStatus("running");
    startLoop();
  }, [newRun, numParticles, setRunStatus, startLoop]);

  const handleStop = useCallback(() => {
    stopLoop();
    if (statusRef.current === "running") setRunStatus("paused");
  }, [setRunStatus, stopLoop]);

  const handleReset = useCallback(() => {
    stopLoop();
    newRun(numParticles);
    setRunStatus("ready");
    draw();
  }, [draw, newRun, numParticles, setRunStatus, stopLoop]);

  // Initial run on mount
  useEffect(() => {
    newRun(10);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Changing N before a run has started shows the new particles right away.
  // During a run (or while paused) the run keeps its N; the new N is used
  // for the next run (Reset, or Start after the run ends).
  useEffect(() => {
    if (statusRef.current === "ready" && runRef.current?.n !== numParticles) {
      newRun(numParticles);
    }
  }, [numParticles, newRun]);

  // Redraw on theme change or new run (without touching the particles)
  useEffect(() => {
    draw();
  }, [draw, runN, hits]);

  const isRunning = status === "running";
  const nPending = numParticles !== runN;

  return (
    <ToolContainer
      title="Self-Interaction Explorer"
      canvasWidth={7}
      canvasHeight={4}
    >
      {/* Circular Animation Window */}
      <GridWindow x={0} y={0} w={4} h={4} variant="circular" theme={theme}>
        <canvas
          ref={canvasRef}
          style={{
            width: "100%",
            height: "100%",
            borderRadius: "50%",
          }}
        />
      </GridWindow>

      {/* Start Button */}
      <GridButton
        x={4}
        y={0}
        w={1}
        h={1}
        type="momentary"
        onPress={handleStart}
        theme={theme}
        disabled={isRunning}
      >
        <div style={{ fontSize: "14px" }}>Start</div>
      </GridButton>

      {/* Stop Button */}
      <GridButton
        x={5}
        y={0}
        w={1}
        h={1}
        type="momentary"
        onPress={handleStop}
        theme={theme}
        disabled={!isRunning}
      >
        <div style={{ fontSize: "14px" }}>Stop</div>
      </GridButton>

      {/* Reset Button */}
      <GridButton
        x={6}
        y={0}
        w={1}
        h={1}
        type="momentary"
        onPress={handleReset}
        theme={theme}
      >
        <div style={{ fontSize: "14px" }}>Reset</div>
      </GridButton>

      {/* Number of Particles Label */}
      <GridLabel
        x={4}
        y={1}
        w={2}
        h={1}
        text="Number of particles"
        textAlign="left"
        fontWeight="bold"
        fontSize="small"
        theme={theme}
      />

      {/* Number of Particles Input */}
      <GridInput
        x={6}
        y={1}
        value={numParticles}
        onChange={setNumParticles}
        min={2}
        max={50}
        step={1}
        variable="N"
        title="Number of particles"
        theme={theme}
      />

      {/* Results Display */}
      <GridDisplay
        x={4}
        y={2}
        w={2}
        h={2}
        variant="info"
        align="left"
        fontSize="medium"
        theme={theme}
      >
        <div style={{ padding: "8px", fontSize: "14px", lineHeight: "1.6" }}>
          <div style={{ marginBottom: "4px" }}>
            <span style={{ fontWeight: "bold" }}>
              N = {runN} Particles
            </span>
            {nPending && (
              <div style={{ fontSize: "12px", opacity: 0.8, lineHeight: "1.3" }}>
                Next run: N = {numParticles}
              </div>
            )}
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "4px",
            }}
          >
            <span style={{ fontWeight: "bold" }}>Timer:</span>
            <span>
              {timer.toFixed(1)}s{status === "paused" ? " (paused)" : ""}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontWeight: "bold" }}>Hits:</span>
            <span>{hits}</span>
          </div>
        </div>
      </GridDisplay>

      {/* Sound Control */}
      <GridSound
        x={6}
        y={3}
        theme={theme}
        onEnabledChange={setIsEnabled}
        title="Collision sound effects"
      />
    </ToolContainer>
  );
};

export default SelfInteractionSimulatorTool;
