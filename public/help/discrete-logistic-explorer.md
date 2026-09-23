# Discrete Logistic Model Explorer

## Overview

This explorer studies the discrete logistic model

- **ΔP/Δt = βP(1 − P)**, with Δt = 1, so **P(t + 1) = P(t) + βP(t)(1 − P(t))**

where P is the population measured as a fraction of the carrying capacity (so P = 1 is the carrying capacity) and β is the birth rate. Models like this became a classic example of chaos after Robert May's 1976 article in *Nature*, "Simple mathematical models with very complicated dynamics."

The model has two equilibria, P = 0 and P = 1. For every β > 0, P = 0 is unstable. P = 1 is stable when the birth rate is small enough. For larger β the long-term behavior goes through period doubling (2, 4, 8, ... values) into chaos.

## Parameters

### Birth rate (β)
- **Range**: the current view window (0 to 3 at first). **Default**: 2.0
- The slider covers the β window of the bifurcation plot, so zooming in the window also gives finer control of β.

### Initial population (P₀)
- **Range**: 0 to 1.5 (steps of 0.01). **Default**: 0.1
- The starting value for the time series. It does not change the bifurcation plot.

### View window (βmin and βmax)
- **Range**: 0 to 3. **Default**: 0 to 3
- Type the β range you want to see and press **Set Window** to redraw the bifurcation plot. The window must be at least 0.01 wide.

## Components

### Bifurcation plot (top)
- **X-axis**: birth rate β (the current window). **Y-axis**: population P, 0 to 1.5.
- For each β, the plot shows the values P visits in the long run: it starts at P = 0.5, discards the first 150 steps, and plots the next 100.
  - one curve: a stable equilibrium
  - two branches: a 2-cycle (P alternates between two values); four branches: a 4-cycle, and so on
  - a dense cloud: chaos
- The green line with triangles marks the current β.

### Time series (bottom)
- **X-axis**: time t = 0 to 50. **Y-axis**: population P, 0 to 1.5.
- The blue dots are P(0) = P₀, P(1), P(2), ... for the current β and P₀, joined by lines.

### Info box
- The equation, the current P₀ and β, and the current β window.

## What to Observe

1. **Equilibrium**: for small β, P approaches the carrying capacity P = 1. For β < 1 the approach is steady; for somewhat larger β it overshoots and alternates above and below 1 while settling.
2. **Period doubling**: at the first bifurcation point the equilibrium becomes unstable and a 2-cycle appears. At the second bifurcation point the 2-cycle splits into a 4-cycle, then 8, 16, ... ever faster. (Lab RC2 asks you to find these values of β: zoom in with the view window to pin them down.)
3. **Onset of chaos**: the period doublings pile up at the onset of chaos. Beyond it, most values of β give chaos.
4. **Windows of order**: inside the chaotic region there are narrow windows of periodic behavior, including a 3-cycle. Zoom in to find them.
5. **Sensitive dependence**: in the chaotic region (for example β = 3.0), compare time series from nearby starting values such as P₀ = 0.30 and 0.31. They agree at first, then become completely different.
6. **Transients**: the time series shows the early steps too, before P settles onto the pattern shown in the bifurcation plot.
7. **Starting values that don't reach the attractor**: P₀ = 0 stays at 0 forever. If P₀ is above (1 + β)/β (for example above 1.33 when β = 3), the next value is negative and the population then runs off to −∞ (off the bottom of the graph). P₀ = (1 + β)/β exactly lands on 0. Almost every other starting value between 0 and (1 + β)/β ends up on the pattern in the bifurcation plot.
