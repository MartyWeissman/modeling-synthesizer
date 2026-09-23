# Self-Interaction Explorer

## Overview

This tool simulates random particle motion and collisions within a circular boundary. It demonstrates how collision frequency scales with population size, providing intuition for the mathematical basis of self-interaction terms in population models (like the logistic equation's -N² term).

## How It Works

Particles move at a constant speed in straight lines, bouncing off the circular boundary. About once a second, each particle randomly turns 45° left or right, creating unpredictable motion. When two particles touch, a hit is recorded (with a small red "firework").

Each pair of particles can only collide once per simulation run, preventing multiple counts from the same sustained contact.

## Parameters

### Number of Particles (N): 2-50
The number of particles in the simulation. Default: 10. If you change N before pressing Start, the new particles appear right away. If you change it during a run (or while it is stopped), the current run keeps its N; the new N is used for the next run (press Reset, or press Start after the run ends).

## Components

### Animation Window
A circular arena showing:
- **Orange spheres**: Moving particles
- **Red firework**: Collision effect (brief flash at collision point)

### Control Buttons
- **Start**: Start the 10-second run. After Stop, Start resumes the same run where it left off. After a run has ended, Start begins a new run with new particles.
- **Stop**: Pause the run; the particles and the timer both stop.
- **Reset**: Place new particles, set the timer back to 10 seconds and the hits to 0.

The run is timed by the simulation itself, so every run is exactly 10 seconds of motion, and the results do not depend on your screen's refresh rate.

### Results Display
Shows:
- **N**: Number of particles in the current run
- **Timer**: Countdown from 10 seconds
- **Hits**: Total unique collisions recorded

### Sound Control
Turn the collision sound (a short ping for each hit) on or off. Sound is off by default.

## What to Observe

1. **Scaling with N**: Double the number of particles. Do the hits roughly quadruple? For example, 10 particles give about 10 hits per run on average, and 20 particles about 40. This N² scaling underlies the self-interaction term in logistic growth.

2. **Maximum possible collisions**: With N particles, the maximum number of unique pairs is N(N-1)/2. For N=10, that's 45 possible collisions.

3. **Random variation**: Run the same configuration multiple times. Observe the variability in collision counts due to random motion.

4. **Density effects**: More particles in the same space means more crowding and more frequent collisions - the basis for density-dependent population regulation.

5. **Time dependence**: Watch how collision rate changes over time. Early on, many pairs haven't met. Later, most pairs have already collided.

## Mathematical Connection

In the logistic equation P' = βP − γP², the −γP² term represents self-interaction (crowding). This simulation shows why:
- Each individual can encounter every other individual
- The number of pairs is N(N−1)/2, which grows like N²
- So the harm from crowding grows like the square of the population
