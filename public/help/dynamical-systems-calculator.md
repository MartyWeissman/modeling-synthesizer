# Dynamical Systems Calculator

## Overview

This is a general-purpose tool for exploring two-dimensional dynamical systems defined by custom differential equations. Enter any equations for dx/dt and dy/dt, and visualize the resulting vector field and particle trajectories. Inspired by wind visualization techniques, the tool uses particle trails to reveal flow patterns.

## How It Works

The tool numerically integrates your differential equations using RK4 (Runge-Kutta 4th order) integration. Two types of particles visualize the flow:

- **Red particles**: Click anywhere on the graph to place a trajectory that persists until reset
- **Blue particles**: Press "Start" to launch a grid of particles that flow with the vector field

## Parameters

### Viewport Controls
- **Xmin, Xmax** (-50 to 50): Horizontal range of the viewing window. Default: -5 to 5.
- **Ymin, Ymax** (-50 to 50): Vertical range of the viewing window. Default: -5 to 5.

### Equation Inputs
- **X'**: The equation for dx/dt. Can use X, Y, and mathematical functions.
- **Y'**: The equation for dy/dt. Can use X, Y, and mathematical functions.

**Supported syntax:**
- Variables: X, Y (case insensitive)
- Operators: +, -, *, /, ^ (power)
- Functions: sin, cos, tan, exp, log, sqrt, abs
- Constants: pi, e
- Parentheses for grouping

**Examples:**
- Simple harmonic oscillator: X' = Y, Y' = -X
- Van der Pol oscillator: X' = Y, Y' = -X + (1-X^2)*Y
- Predator-prey: X' = X - X*Y, Y' = -Y + X*Y

### Simulation Controls
- **Particle Grid**: Size of the blue particle grid (20×20 to 100×100). Default: 75×75.
- **Animation Speed**: 0% (paused) to 100% (full speed). Default: 100%.

## Components

### Vector Field Display
The main visualization area showing:
- **Gray arrows**: Direction of flow at each point (normalized to same length)
- **Red trails**: Trajectories from clicked points
- **Blue trails**: Grid particle flow (when running)
- **Background grid**: Reference lines (toggleable)

### Control Buttons
- **Start/Pause**: Toggle blue particle animation
- **Reset**: Clear all particles and trails
- **Show/Hide Vectors**: Toggle vector field arrows
- **Show/Hide Grid**: Toggle background grid lines

### Status Display
Shows equation validity and current particle count.

## What to Observe

1. **Fixed points**: Look for locations where all vectors point inward (stable) or outward (unstable).

2. **Limit cycles**: Closed loops where trajectories spiral in from both directions.

3. **Saddle points**: Points where trajectories approach along one direction and leave along another.

4. **Separatrices**: Special trajectories that divide regions with different long-term behaviors.

5. **Flow patterns**: The blue particle grid reveals the global structure of the vector field - how fast and which direction the flow moves everywhere.

## Tips

- Start with simple systems (like X' = Y, Y' = -X for circles) to understand the tool.
- Click multiple points to compare trajectories from different starting conditions.
- Adjust viewport to zoom in on interesting regions.
- Use "Pause" to freeze the blue particles while still animating red trajectories.
- Slow down animation speed to see detailed behavior near equilibria.

## References

