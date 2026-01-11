# Generalized Lotka-Volterra Model

## Overview

This tool simulates the generalized Lotka-Volterra equations for two interacting populations. By adjusting six parameters, you can model predator-prey dynamics, competition, cooperation (mutualism), or custom ecological interactions. The tool provides vector field visualization, nullclines, and stability analysis of equilibrium points.

## The Model

The generalized Lotka-Volterra equations describe two populations P and Q:

- **P' = αP - γP² + uPQ**
- **Q' = βQ - δQ² + vPQ**

Each equation has three terms:
1. **Linear growth/decline** (αP, βQ): Intrinsic population change
2. **Intraspecific competition** (γP², δQ²): Self-limiting density dependence
3. **Interspecific interaction** (uPQ, vPQ): Effects between species

## Parameters

### α (Alpha): -5 to 5
Intrinsic growth rate of population P. Positive = growth, negative = decline. Default: 1.5.

### β (Beta): -5 to 5
Intrinsic growth rate of population Q. Default: -2.0.

### γ (Gamma): -5 to 5
Intraspecific competition coefficient for P. Positive = self-limitation. Default: 0.0.

### δ (Delta): -5 to 5
Intraspecific competition coefficient for Q. Default: 0.5.

### u: -5 to 5
Interaction coefficient affecting P. Positive = P benefits from Q, negative = P harmed by Q. Default: -1.0.

### v: -5 to 5
Interaction coefficient affecting Q. Positive = Q benefits from P, negative = Q harmed by P. Default: 1.0.

### Pmax, Qmax: 1-9999
Axis ranges for the phase portrait. Adjust to view different scales of population dynamics.

## Example Presets

**Default**: Custom parameters for exploration.

**Predator-Prey**: Classic oscillatory dynamics where one species consumes the other.

**Competition**: Both species are harmed by interaction (negative u and v).

**Cooperation**: Both species benefit from interaction (positive u and v).

## Components

### Phase Portrait
Shows population P (x-axis) vs population Q (y-axis).

- **Gray arrows**: Vector field showing direction of change
- **Green trajectories**: Click to start new trajectories
- **Orange particles**: Grid flow when "Start" is pressed
- **Orange circles**: Equilibrium points
- **Blue line** (nullclines): Where dP/dt = 0
- **Red line** (nullclines): Where dQ/dt = 0

### Time Series Plot
Shows populations over time for the first clicked trajectory.

- **Blue line**: Population P
- **Red line**: Population Q

### Controls

**Show Vectors**: Toggle vector field display.

**Show Nullclines**: Display curves where each derivative equals zero.

**Start/Pause**: Toggle orange grid particle animation.

**Reset**: Clear all trajectories and particles.

**Example Selector**: Load preset parameter combinations.

### Equilibrium Display
Lists equilibrium points and their stability classification:
- Stable Node: All trajectories approach
- Unstable Node: All trajectories leave
- Saddle: Some approach, some leave
- Stable Spiral: Damped oscillations approaching
- Unstable Spiral: Growing oscillations leaving
- Center: Perfect closed orbits (rare)

## What to Observe

1. **Predator-prey oscillations**: With the Predator-Prey preset, watch closed orbits in the phase portrait and oscillating time series.

2. **Competitive exclusion**: With Competition preset, observe that one species often drives the other to extinction.

3. **Stable coexistence**: With Cooperation or tuned parameters, find conditions where both species persist at positive equilibrium.

4. **Stability transitions**: Adjust parameters to watch equilibria change from stable spirals to unstable spirals (Hopf bifurcation).

5. **Nullcline geometry**: Enable nullclines to see how their intersection determines equilibrium locations. Stability depends on the angle of intersection.

## References

