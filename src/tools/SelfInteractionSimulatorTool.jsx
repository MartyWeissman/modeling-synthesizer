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

// Constants
const PARTICLE_SIZE = 10;
const VELOCITY = 2;
const DIRECTION_CHANGE_INTERVAL = 1000; // ms

// Particle Class
class Particle {
  constructor(id, canvasRadius) {
    this.id = id;
    this.canvasRadius = canvasRadius;
    this.initializePosition();
    this.angle = Math.random() * 2 * Math.PI;
    this.updateVelocity();
    this.lastDirectionChange = Math.random() * DIRECTION_CHANGE_INTERVAL; // Random offset 0-1000ms
  }

  initializePosition() {
    const r =
      Math.sqrt(Math.random()) * (this.canvasRadius - PARTICLE_SIZE / 2);
    const theta = Math.random() * 2 * Math.PI;
    this.x = this.canvasRadius + r * Math.cos(theta);
    this.y = this.canvasRadius + r * Math.sin(theta);
  }

  updateVelocity() {
    this.vx = VELOCITY * Math.cos(this.angle);
    this.vy = VELOCITY * Math.sin(this.angle);
  }

  update(currentTime) {
    this.x += this.vx;
    this.y += this.vy;

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

    // Check if this particle should change direction
    if (currentTime - this.lastDirectionChange > DIRECTION_CHANGE_INTERVAL) {
      this.changeDirection();
      this.lastDirectionChange = currentTime;
    }
  }

  changeDirection() {
    const change = Math.random() < 0.5 ? Math.PI / 4 : -Math.PI / 4;
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
    this.particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
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

const SelfInteractionSimulatorTool = () => {
  const { theme, currentTheme } = useTheme();

  // Sound effects
  const { volume, setVolume, isEnabled, setIsEnabled, collisionPing } =
    useSoundEffects();

  // State
  const [numParticles, setNumParticles] = useState(10);
  const [isRunning, setIsRunning] = useState(false);
  const [timer, setTimer] = useState(10.0);
  const [hits, setHits] = useState(0);

  // Refs for animation
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const fireworksRef = useRef([]);
  const hitMatrixRef = useRef([]);
  const animationIdRef = useRef(null);
  const lastTimeRef = useRef(null);
  const timerRef = useRef(null);
  const hitsCountRef = useRef(0);
  const isRunningRef = useRef(false);
  const timerValueRef = useRef(10.0);
  const currentThemeRef = useRef(currentTheme);

  // Sync currentTheme to ref
  useEffect(() => {
    currentThemeRef.current = currentTheme;
  }, [currentTheme]);

  // Initialize simulation
  const initSimulation = useCallback(
    (startTime) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const canvasRadius = canvas.width / 2;
      particlesRef.current = [];
      fireworksRef.current = [];
      hitsCountRef.current = 0;

      // Create particles with staggered initial direction change times
      for (let i = 0; i < numParticles; i++) {
        const particle = new Particle(i, canvasRadius);
        // Set lastDirectionChange relative to startTime with random offset
        particle.lastDirectionChange =
          startTime - Math.random() * DIRECTION_CHANGE_INTERVAL;
        particlesRef.current.push(particle);
      }

      // Initialize hit matrix
      hitMatrixRef.current = Array(numParticles)
        .fill()
        .map(() => Array(numParticles).fill(false));

      setHits(0);
    },
    [numParticles],
  );

  // Check collisions
  const checkCollisions = useCallback(() => {
    const particles = particlesRef.current;
    const hitMatrix = hitMatrixRef.current;
    const fireworks = fireworksRef.current;

    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < PARTICLE_SIZE && !hitMatrix[i][j]) {
          hitMatrix[i][j] = true;
          hitsCountRef.current++;
          const midX = (particles[i].x + particles[j].x) / 2;
          const midY = (particles[i].y + particles[j].y) / 2;
          fireworks.push(new Firework(midX, midY));
          setHits(hitsCountRef.current);

          // Play collision sound (rate-limited automatically)
          collisionPing();
        }
      }
    }
  }, [collisionPing]);

  // Animation loop
  const animate = useCallback(
    (timestamp) => {
      // Check if we should continue using refs (no state dependency)
      if (!isRunningRef.current || timerValueRef.current <= 0) {
        isRunningRef.current = false;
        setIsRunning(false);
        return;
      }

      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      const canvasRadius = canvas.width / 2;
      const deltaTime = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;

      // Clear and draw background circle
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.beginPath();
      ctx.arc(canvasRadius, canvasRadius, canvasRadius, 0, Math.PI * 2);
      ctx.fillStyle =
        currentThemeRef.current === "dark" ? "#1f2937" : "#e6f3ff";
      ctx.fill();

      // Update and draw particles (each checks its own direction change timing)
      particlesRef.current.forEach((particle) => {
        particle.update(timestamp);
        particle.draw(ctx);
      });

      // Update and draw fireworks
      fireworksRef.current = fireworksRef.current.filter((firework) => {
        firework.update(deltaTime);
        firework.draw(ctx);
        return firework.lifespan > 0;
      });

      // Check collisions
      checkCollisions();

      // Continue animation
      animationIdRef.current = requestAnimationFrame(animate);
    },
    [checkCollisions],
  );

  // Control handlers
  const handleStart = useCallback(() => {
    if (timerValueRef.current <= 0) {
      timerValueRef.current = 10.0;
      setTimer(10.0);
    }
    isRunningRef.current = true;
    setIsRunning(true);
    const startTime = performance.now();
    initSimulation(startTime);
    lastTimeRef.current = startTime;
    animationIdRef.current = requestAnimationFrame(animate);
  }, [initSimulation, animate]);

  const handleStop = useCallback(() => {
    isRunningRef.current = false;
    setIsRunning(false);
    if (animationIdRef.current) {
      cancelAnimationFrame(animationIdRef.current);
      animationIdRef.current = null;
    }
  }, []);

  const handleReset = useCallback(() => {
    isRunningRef.current = false;
    setIsRunning(false);
    timerValueRef.current = 10.0;
    setTimer(10.0);
    setHits(0);
    hitsCountRef.current = 0;
    if (animationIdRef.current) {
      cancelAnimationFrame(animationIdRef.current);
      animationIdRef.current = null;
    }
    const startTime = performance.now();
    initSimulation(startTime);

    // Draw initial state
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      const canvasRadius = canvas.width / 2;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.beginPath();
      ctx.arc(canvasRadius, canvasRadius, canvasRadius, 0, Math.PI * 2);
      ctx.fillStyle = currentTheme === "dark" ? "#1f2937" : "#e6f3ff";
      ctx.fill();
      particlesRef.current.forEach((particle) => particle.draw(ctx));
    }
  }, [initSimulation, currentTheme]);

  // Timer countdown effect
  useEffect(() => {
    if (isRunning && timer > 0) {
      const startTime = Date.now();
      const startTimer = timer;

      timerRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        const newTimer = startTimer - elapsed;

        if (newTimer <= 0) {
          timerValueRef.current = 0;
          setTimer(0);
          isRunningRef.current = false;
          setIsRunning(false);
          if (animationIdRef.current) {
            cancelAnimationFrame(animationIdRef.current);
            animationIdRef.current = null;
          }
        } else {
          timerValueRef.current = newTimer;
          setTimer(newTimer);
        }
      }, 100);

      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [isRunning, timer]);

  // Initialize canvas on mount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = 400;
      canvas.height = 400;
      const startTime = performance.now();
      initSimulation(startTime);

      // Draw initial state
      const ctx = canvas.getContext("2d");
      const canvasRadius = canvas.width / 2;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.beginPath();
      ctx.arc(canvasRadius, canvasRadius, canvasRadius, 0, Math.PI * 2);
      ctx.fillStyle = currentTheme === "dark" ? "#1f2937" : "#e6f3ff";
      ctx.fill();
      particlesRef.current.forEach((particle) => particle.draw(ctx));
    }
  }, [initSimulation, currentTheme]);

  // Redraw canvas when theme changes (while not animating)
  useEffect(() => {
    if (!isRunning) {
      const canvas = canvasRef.current;
      if (canvas && particlesRef.current.length > 0) {
        const ctx = canvas.getContext("2d");
        const canvasRadius = canvas.width / 2;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.beginPath();
        ctx.arc(canvasRadius, canvasRadius, canvasRadius, 0, Math.PI * 2);
        ctx.fillStyle = currentTheme === "dark" ? "#1f2937" : "#e6f3ff";
        ctx.fill();
        particlesRef.current.forEach((particle) => particle.draw(ctx));
      }
    }
  }, [currentTheme, isRunning]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  return (
    <ToolContainer
      title="Self-Interaction Simulator"
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
              N = {numParticles} Particles
            </span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "4px",
            }}
          >
            <span style={{ fontWeight: "bold" }}>Timer:</span>
            <span>{timer.toFixed(1)}s</span>
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
        onVolumeChange={setVolume}
        onEnabledChange={setIsEnabled}
        title="Collision sound effects"
      />
    </ToolContainer>
  );
};

export default SelfInteractionSimulatorTool;
