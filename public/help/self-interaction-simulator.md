# Self-Interaction Explorer

## Overview

This tool simulates random particle motion and collisions within a circular boundary. It demonstrates how collision frequency scales with population size, providing intuition for the mathematical basis of self-interaction terms in population models (like the logistic equation's -N² term).

## How It Works

Particles move in straight lines, bouncing off the circular boundary. Each particle randomly changes direction by ±45° every second, creating unpredictable motion. When two particles come within contact distance, a collision is recorded (with a visual firework effect).

Each pair of particles can only collide once per simulation run, preventing multiple counts from the same sustained contact.

## Parameters

### Number of Particles (N): 2-50
The number of particles in the simulation. Default: 10.

## Components

### Animation Window
A circular arena showing:
- **Orange spheres**: Moving particles
- **Red firework**: Collision effect (brief flash at collision point)

### Control Buttons
- **Start**: Begin the simulation and 10-second timer
- **Stop**: Pause the simulation (timer continues)
- **Reset**: Return to initial state, reset timer to 10 seconds

### Results Display
Shows:
- **N**: Current number of particles
- **Timer**: Countdown from 10 seconds
- **Hits**: Total unique collisions recorded

### Sound Control
Toggle collision sound effects on/off and adjust volume.

## What to Observe

1. **Scaling with N**: Double the number of particles. Do collisions approximately quadruple? This N² scaling underlies the self-interaction term in logistic growth.

2. **Maximum possible collisions**: With N particles, the maximum number of unique pairs is N(N-1)/2. For N=10, that's 45 possible collisions.

3. **Random variation**: Run the same configuration multiple times. Observe the variability in collision counts due to random motion.

4. **Density effects**: More particles in the same space means more crowding and more frequent collisions - the basis for density-dependent population regulation.

5. **Time dependence**: Watch how collision rate changes over time. Early on, many pairs haven't met. Later, most pairs have already collided.

## Mathematical Connection

In the logistic equation dN/dt = rN(1 - N/K), the N² term (hidden in N·N/K) represents self-interaction. This simulation shows why:
- Each individual can encounter each other individual
- The number of possible encounters scales as N²
- This leads to density-dependent growth limitation

## References

