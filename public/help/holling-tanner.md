# Holling-Tanner Predator-Prey Model

## Overview

This tool simulates the Holling-Tanner predator-prey model, an extension of the classic Lotka-Volterra equations that incorporates more realistic biological mechanisms. The model features a Type II functional response (predator satiation) and ratio-dependent predator dynamics, producing richer dynamical behaviors including limit cycle oscillations.

[VERIFY: Historical development of the Holling-Tanner model and its biological motivation]

## The Model

The Holling-Tanner model describes interactions between sharks (predators, S) and tuna (prey, T):

**Key features:**
- **Type II functional response**: Predation rate saturates at high prey density (predators can only eat so fast)
- **Ratio-dependent predator growth**: Shark carrying capacity depends on tuna availability
- **Logistic prey growth**: Tuna population has a carrying capacity

## Parameters

### α (Shark growth rate): 0.01-1.0
Intrinsic growth rate of the shark population. Default: 0.1.

### β (Tuna growth rate): 0.1-3.0
Intrinsic growth rate of the tuna population in the absence of predation. Default: 1.0.

### c (Predation rate): 0.1-3.0
Maximum rate at which sharks consume tuna. Default: 0.5.

### h (Half-saturation constant): 0.1-3.0
Tuna density at which predation rate is half-maximal. Larger values mean predators saturate more slowly. Default: 1.0.

### m (Tuna carrying capacity): 0.5-10.0
Maximum tuna population in the absence of predation. Default: 7.0.

### q (Shark carrying capacity ratio): 0.5-5.0
Ratio determining shark carrying capacity relative to tuna population. Default: 1.0.

### Animation Speed: 0-4x
Controls simulation speed. Default: 2x.

## Components

### Phase Portrait (Main Graph)
Displays shark population (x-axis) vs tuna population (y-axis).

- **Gray arrows**: Vector field showing direction of population change
- **Colored trajectories**: Click anywhere to start a new trajectory
- **Orange circle**: Coexistence equilibrium point
- **Blue line** (when nullclines shown): S-nullcline (dS/dt = 0)
- **Red line** (when nullclines shown): T-nullcline (dT/dt = 0)

### Time Series Plot
Shows population sizes over time in a sliding 20-unit window.

- **Blue line**: Shark population
- **Red line**: Tuna population

### Controls

**Show Nullclines**: Displays curves where each derivative equals zero.
- S-nullcline: Straight line S = qT
- T-nullcline: Curved line determined by predation and growth balance

**Reset**: Clears all trajectories and resets time.

### Equations Display
Shows the differential equations governing the system.

### Equilibrium Display
Shows the coordinates of the coexistence equilibrium point.

### Status Display
Current trajectory count, time, animation state, and population values.

## What to Observe

1. **Limit cycles**: With default parameters, trajectories converge to a closed orbit - sustained oscillations in both populations.

2. **Predator-prey phase relationship**: In oscillations, observe that tuna peaks before sharks - prey increase first, then predators follow.

3. **Effect of predation rate (c)**: Increase c to see how stronger predation affects cycle amplitude and stability.

4. **Carrying capacity effects**: Adjust m to see how prey carrying capacity affects equilibrium location and dynamics.

5. **Nullcline geometry**: Enable nullclines to see how their intersection determines equilibrium. The S-nullcline is always a straight line through the origin.

6. **Saturation effects (h)**: Increase h to see how predator satiation affects the dynamics. Higher h means predators take longer to become saturated.

## References

