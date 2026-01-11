# 1D Dynamical System Calculator

## Overview

This tool explores one-dimensional dynamical systems defined by a single differential equation X' = f(X). It provides phase line analysis showing equilibrium points, stability, and flow direction, along with time series visualization of trajectories. The tool also supports delay differential equations using X(t-τ).

## The Model

A one-dimensional dynamical system has the form:

**X' = f(X, k)**

Where X is the state variable, k is a parameter, and f describes how X changes over time. The sign of f(X) determines whether X increases or decreases.

## Parameters

### Equation Input
Enter any expression for X' using:
- Variable: X (current state)
- Parameter: k (adjustable)
- Delay variable: X_tau (for X(t-τ))
- Standard functions: sin, cos, exp, log, sqrt, etc.

**Examples:**
- `k*X*(1-X)` - Logistic growth
- `k-X` - Exponential decay toward k
- `X*(1-X)*(X-0.5)` - Bistable system
- `k*X_tau*(1-X)` - Delayed logistic (uses X at time t-τ)

### k: -1 to 1
Adjustable parameter in your equation. Default: 0.5.

### Xmin, Xmax: -10 to 10
Viewing range for the phase line and time series. Default: -0.5 to 1.5.

### Delay τ: 0 to 1
Time delay for X_tau variable. When τ > 0, the equation uses past values of X. Default: 0.

## Components

### Phase Line
A horizontal number line showing:
- **Thick black line**: The X-axis
- **Filled circles**: Stable equilibria (attractors)
- **Open circles**: Unstable equilibria (repellers)
- **Half-filled circles**: Semi-stable equilibria
- **Gray rectangles**: Degenerate intervals where X' = 0 everywhere
- **Green/red arrows**: Direction of flow (when X' plot is shown)
- **Green/red humps**: The derivative X' as a function of X

Click anywhere on the phase line to drop a "ball" that will evolve according to the dynamics.

### Time Series Graph
Shows X(t) over time for dropped balls.
- **Blue trajectories**: Evolution of each initial condition
- **Dashed horizontal lines**: Equilibrium values
- **Gray shading**: Degenerate intervals

### Controls

**Show/Hide X'**: Toggle the derivative plot showing f(X) above/below the phase line.

**Clear Plots**: Remove all trajectories.

### Status Display
Shows:
- Number and location of equilibria
- Stability classification (stable/unstable/semi-stable)
- Delay parameter τ when active

## What to Observe

1. **Phase line dynamics**: Drop balls at different locations and watch them flow toward stable equilibria or away from unstable ones.

2. **Bifurcations**: Adjust k and watch equilibria appear, disappear, or change stability.

3. **Derivative plot interpretation**: The X' plot shows where dynamics are fast (large |X'|) vs slow (near zero).

4. **Delay effects**: With τ > 0, observe oscillations that can emerge from delayed feedback.

5. **Basins of attraction**: Find the regions of initial conditions that flow to each stable equilibrium.

## Delay Equations

When using the delay variable X_tau:
- X_tau refers to X(t - τ), the value of X from τ time units ago
- Delay can cause oscillations even in systems that are stable without delay
- The phase line analysis shows equilibria of the non-delayed system (where X = X_tau)

## References

