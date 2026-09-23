# Dynamical Systems Calculator

## Overview

This is a general-purpose tool for exploring two-dimensional dynamical systems given by change equations X' = f(X, Y) and Y' = g(X, Y). Type any formulas for X' and Y', and see the vector field and moving particles that follow the flow. The particle trails are inspired by wind-map visualizations.

## How It Works

The tool solves your change equations numerically with the RK4 (fourth-order Runge–Kutta) method. Two kinds of particles show the flow:

- **Red particles**: Click anywhere on the graph to start a trajectory there. Red particles move as soon as you click (you don't need to press Start) and stay until you press Reset.
- **Blue particles**: Press **Start** to launch a grid of particles that flow with the vector field, revealing the overall flow pattern.

Trajectories keep being computed when they leave the window, so a trajectory that goes out and comes back (for example, around a large closed orbit) reappears.

## Parameters

### Viewport Controls
- **Xmin, Xmax** (−50 to 50): Horizontal range of the window. Default: −5 to 5.
- **Ymin, Ymax** (−50 to 50): Vertical range of the window. Default: −5 to 5.

### Equation Inputs
- **X'**: The formula for X' (dX/dt). Default: `Y`.
- **Y'**: The formula for Y' (dY/dt). Default: `-X`.

Type only the right-hand side of each equation (for example `1 - Y*X`, not `X' = 1 - Y*X`).

**Supported syntax:**
- Variables: X and Y. Lowercase x and y also work.
- Operators: +, −, *, /, ^ (power)
- Implicit multiplication: `2X`, `XY`, `X(1-X)` and `(1-X)(1+Y)` are understood as `2*X`, `X*Y`, and so on.
- Functions: sin, cos, tan, exp, sqrt, abs, and more
- Logarithms: `ln(X)` and `log(X)` are both the natural logarithm (base e); use `log10(X)` for base 10 and `log2(X)` for base 2.
- Constants: pi, e
- Parentheses for grouping

If a formula can't be used, the status box (bottom right) explains the problem, and no vector field is drawn until it is fixed.

**Examples:**
- Simple harmonic oscillator: X' = `Y`, Y' = `-X` (circles)
- Insulin–glucose (Lab Manual): X' = `1 - Y*X`, Y' = `(X*X/(1+X*X))-Y`, with Xmin = 0, Xmax = 2, Ymin = 0, Ymax = 2
- Van der Pol oscillator: X' = `Y`, Y' = `-X + (1-X^2)*Y` (a limit cycle)
- Predator–prey (Lotka–Volterra): X' = `X - X*Y`, Y' = `-Y + X*Y`

### Simulation Controls
- **Particle Grid**: Size of the blue particle grid, from 20×20 to 100×100. Default: 75×75. The grid extends past the edges of the window so that particles flow in from outside; the status box shows how many start inside the window.
- **Animation Speed**: 0% (stopped) to 100% (full speed). Default: 100%. The speed is the same on every computer, whatever its screen refresh rate.

## Components

### Vector Field Display
The main graph, with X on the horizontal axis and Y on the vertical axis:
- **Gray arrows**: The direction of motion at each point. All arrows have the same length; they show direction, not speed.
- **Red trails**: Trajectories from the points you clicked
- **Blue trails**: The flow of the particle grid (while running)
- **Background grid**: Reference lines dividing each axis into 10 parts (can be hidden)

### Control Buttons
- **Start/Pause**: Start launches a fresh grid of blue particles. Pause stops and removes the blue particles (their trails fade out); red trajectories keep moving. Press Start again for a new blue grid.
- **Reset**: Remove all particles (red and blue) and clear the trails.
- **Show/Hide Vectors**: Show or hide the vector field arrows.
- **Show/Hide Grid**: Show or hide the background grid lines.

### Status Display
Shows whether the equations are valid, and the number of blue particles (and how many of them start inside the window). If an equation has a mistake, it shows the error instead.

## What to Observe

1. **Equilibria (fixed points)**: Points where X' = 0 and Y' = 0. Trajectories near a stable equilibrium move toward it; near an unstable one they move away.

2. **Limit cycles**: Closed loops that nearby trajectories spiral toward (or away from) from both sides.

3. **Saddle points**: Equilibria that trajectories approach along one direction and leave along another.

4. **Separatrices**: Special trajectories that divide regions with different long-term behaviors.

5. **Flow patterns**: The blue particle grid shows the overall structure of the flow: which way it goes everywhere, and where it is fast or slow.

## Tips

- Start with a simple system (like X' = Y, Y' = −X, which gives circles) to get used to the tool.
- Click several points to compare trajectories from different starting conditions.
- Change Xmin, Xmax, Ymin and Ymax to zoom in on an interesting region.
- Press Reset to clear old trajectories before starting a new experiment.
- Lower the animation speed to see the motion near equilibria in detail.
