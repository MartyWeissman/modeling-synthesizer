# 1D Dynamical System Calculator

## Overview

This tool explores one-dimensional dynamical systems given by a single change equation X' = f(X). It draws the phase line, with the equilibrium points, their stability and the direction of flow, and it plots time series of X. It also supports delay equations, using the delayed value X(t − τ), and optional random noise.

## The Model

A one-dimensional dynamical system has the form:

**X' = f(X, k)**

where X is the state variable, k is a parameter, and f describes how X changes over time. Where f(X) > 0, X increases; where f(X) < 0, X decreases; where f(X) = 0, X is at an equilibrium.

The simulation takes steps of length dt = 0.05. Each step uses the RK4 (fourth-order Runge–Kutta) method for the change equation, then adds a random Gaussian increment for the noise:

**X(t + dt) = X(t) + [RK4 step of f] + (ε/2) · √dt · N(0, 1)**

where N(0, 1) is a standard normal random number. With ε = 0 there is no noise.

## Parameters

### Equation Input
Type only the right-hand side of the change equation (for example `X-X^3`). You can use:
- Variable: X (lowercase x also works)
- Parameter: k (set with the slider)
- Delay variable: X_tau, meaning X(t − τ)
- Operators +, −, *, /, ^ (power), and parentheses
- Implicit multiplication: `2X`, `kX` and `X(1-X)` mean `2*X`, `k*X` and `X*(1-X)`
- Functions: sin, cos, tan, exp, sqrt, abs, and more. `ln(X)` and `log(X)` are both the natural logarithm; use `log10(X)` for base 10.
- Constants: pi, e

If the equation can't be used, the box at the bottom right explains why.

**Examples:**
- `k*X*(1-X)`: logistic growth (the default)
- `k-X`: exponential approach to k
- `X-X^3`: a bistable system, with stable equilibria at −1 and 1 and an unstable one at 0 (use Xmin = −1.5 and Xmax = 1.5 to see all three)
- `X*(1-X)*(X-0.5)`: another bistable system
- `2*X*(1-X_tau)`: logistic growth with a delay (see Delay Equations below)

### k: −1 to 1
The parameter k in your equation. Default: 0.5.

### Xmin, Xmax: −10 to 10
The range of X shown on the phase line and the time series. Default: −0.5 to 1.5.

### Noise ε: 0 to 1
The strength of the random noise added at each step. Default: 0 (no noise).

### Delay τ: 0 to 1
The time delay used for X_tau. Default: 0, where X_tau is simply X. The delay has an effect only if your equation uses X_tau.

## Components

### Phase Line
A horizontal number line (extending a little beyond Xmin and Xmax) showing:
- **Filled circles**: Stable equilibria
- **Open circles**: Unstable equilibria
- **Half-filled circles**: Semi-stable equilibria (flow toward the point on one side and away on the other)
- **Gray rectangles**: Intervals where X' = 0 everywhere (every point is an equilibrium)
- **Green/red shading** (with Show X'): the graph of X' against X, green where X' > 0 and red where X' < 0, scaled to fit
- **Green/red arrows** (with Show X'): the direction of flow, right (green) or left (red)

Stability is found from the sign of X' on each side of an equilibrium.

Click on the phase line to drop a "ball" at that value of X. The ball moves according to the change equation. When τ > 0 and the equation uses X_tau, a gray "ghost" ball shows the delayed value X(t − τ).

### Time Series Graph
Shows X against time t, from t = 0 to t = 10, for every ball you dropped. Each run lasts until t = 10 (about 3.3 seconds), then the ball stops.
- **Blue curves**: X(t) for each ball. A curve that leaves the window keeps being computed and reappears if it comes back.
- **Horizontal lines**: Equilibria. Solid = stable, dashed = unstable, dotted = semi-stable.
- **Gray bands**: Intervals where X' = 0 everywhere.
- The ticks on the X axis mark Xmin, Xmax and the equilibria.

### Controls

**Show/Hide X'**: Show or hide the graph of X' and the flow arrows on the phase line.

**Clear Plots**: Remove all balls and time series.

### Status Display
Shows the number of equilibria in the window, each value X* with its stability, any interval where X' = 0 everywhere, and the delay τ when it is not 0.

## What to Observe

1. **Phase line dynamics**: Drop balls at different places and watch them move toward stable equilibria and away from unstable ones.
2. **Bifurcations**: Change k and watch equilibria appear, disappear, or change stability.
3. **Reading the X' graph**: Where |X'| is large, X changes quickly; near equilibria, X' is close to 0 and X changes slowly.
4. **Noise**: Increase ε. With X' = 0 (type `0` as the equation), balls do a pure random walk. Near a stable equilibrium, small noise makes X fluctuate around it. In a bistable system such as `X-X^3`, enough noise can push X across the unstable equilibrium into the other basin.
5. **Delay effects**: With a delay, X can overshoot an equilibrium and oscillate (see below).
6. **Basins of attraction**: Find the set of starting values that flow to each stable equilibrium.

## Delay Equations

When your equation uses X_tau:
- X_tau is X(t − τ), the value of X from τ time units ago. Before the ball was dropped (t < 0), X is taken to be its starting value.
- The equilibria on the phase line are those of the equation with X_tau replaced by X, since at an equilibrium X does not change.
- A delay can make X overshoot and oscillate around an equilibrium that is stable without delay. For the delayed logistic equation X' = cX(1 − X(t − τ)), the oscillations die out when cτ < π/2 ≈ 1.57 and keep going when cτ > π/2.
- Because k ≤ 1 and τ ≤ 1, `k*X*(1-X_tau)` always has kτ ≤ 1, so its oscillations die out (try k = 1, τ = 1). To see sustained oscillations, use a larger coefficient, for example `2*X*(1-X_tau)` with τ = 1 and Xmax = 3.
