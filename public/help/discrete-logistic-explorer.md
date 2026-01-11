# Discrete Logistic Model Explorer

## Overview

The Discrete Logistic Model Explorer visualizes the dynamics of population growth in discrete time steps, featuring a bifurcation diagram that reveals how the system's behavior changes dramatically as the birth rate parameter increases.

The model uses the discrete logistic equation:
- **ΔP/Δt = βP(1 - P)**

Where P is the population (normalized between 0 and 1), and β is the birth rate parameter. [VERIFY: This is sometimes called the discrete logistic map and is a foundational model in chaos theory, popularized by Robert May's 1976 Nature paper.]

As β increases, the system transitions from stable equilibrium → periodic oscillations → chaos, demonstrating period-doubling bifurcations.

## Parameters

### Birth Rate (β)
- **Range**: 0.0 to 3.0 (adjustable window)
- **Default**: 2.0
- Controls the rate of population growth
- Low β (< 1): Population decays to zero
- Medium β (1-2): Stable equilibrium at P = 1 - 1/β
- Higher β (2-2.5): Period-2 oscillations
- High β (> 2.5): Period-doubling cascade into chaos
- [VERIFY: The onset of chaos occurs at approximately β ≈ 2.57]

### Initial Population (P₀)
- **Range**: 0.0 to 1.5
- **Default**: 0.1
- Starting population for the time series simulation
- Affects transient behavior but not long-term attractors

### Beta Window Controls (βₘᵢₙ and βₘₐₓ)
- **Range**: 0.0 to 3.0
- **Default**: 0.0 to 3.0
- Allows zooming into specific regions of the bifurcation diagram
- Use "Set Window" button to regenerate the diagram with new range

## Components

### Bifurcation Diagram (Main Plot)
- **X-axis**: Birth rate parameter β
- **Y-axis**: Population P (steady-state values)
- Shows long-term behavior after transients die out
- Single line = stable equilibrium
- Two branches = period-2 oscillation
- Multiple branches = higher-period cycles
- Dense cloud = chaotic behavior
- **Green marker**: Current β value (vertical line with triangular indicators)

### Time Series Plot (Bottom)
- **X-axis**: Time steps (0 to 50)
- **Y-axis**: Population P
- Shows the actual trajectory from the initial condition
- Blue dots connected by lines show discrete iterations
- Reveals transient behavior before reaching steady state

### Window Controls
- **βₘᵢₙ input**: Set minimum β for bifurcation diagram
- **βₘₐₓ input**: Set maximum β for bifurcation diagram  
- **Set Window button**: Regenerate bifurcation diagram with current range

### Parameter Sliders
- **Birth rate slider**: Adjust β within the current window range
- **Initial population slider**: Set P₀ for time series

### Info Display
- Shows the discrete logistic equation
- Displays current parameter values
- Shows the current β range

## What to Observe

1. **Period-Doubling Route to Chaos**: Slowly increase β from 1.0 to 3.0. Watch the bifurcation diagram show successively more branches: 1 → 2 → 4 → 8 → ... → chaos. This is the famous period-doubling cascade.

2. **Windows of Order in Chaos**: Within the chaotic region (β > 2.57), there are "windows" where periodic behavior reappears. Zoom in with the window controls to explore these islands of stability.

3. **Sensitive Dependence**: In the chaotic region, try slightly different initial conditions. The time series will diverge rapidly - this is the hallmark of chaos.

4. **Stable Equilibrium**: For β between 1 and 2, the population converges to a single stable value. The bifurcation diagram shows a single curve.

5. **Period-2 Oscillations**: For β around 2.0-2.45, the population alternates between two values. The bifurcation diagram shows two distinct branches.

6. **Transient vs Steady-State**: Compare the time series (which shows transients) with the bifurcation diagram (which only shows long-term behavior). Early time points may not match the attractor.

7. **Zooming In**: Use the window controls to zoom into interesting regions. Try βₘᵢₙ = 2.4, βₘₐₓ = 2.6 to see the first few period doublings in detail.

## References

