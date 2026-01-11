# Hutchinson Population Growth Simulator

## Overview

The Hutchinson Growth Simulator models population dynamics with a time delay, extending the classic logistic growth model to account for the lag between when population density is sensed and when its effects are realized.

The model uses Hutchinson's delay differential equation:
- **P'(t) = βP(t)(1 - P(t-τ)/k)**

Where P(t) is the current population, P(t-τ) is the population τ time units ago, β is the birth rate, and k is the carrying capacity. [VERIFY: This model was proposed by G. Evelyn Hutchinson in 1948 to explain oscillations in populations of organisms like Daphnia.]

The time delay can cause oscillations that would not occur in the standard logistic model, providing insight into why real populations often fluctuate rather than smoothly approaching equilibrium.

## Parameters

### Carrying Capacity (k)
- **Range**: 0 to 300
- **Default**: 100
- Maximum sustainable population
- Shown as a red dashed horizontal line on the graph
- Population oscillates around this value in the oscillatory regime

### Birth Rate (β)
- **Range**: 0.0 to 0.1
- **Default**: 0.1
- Intrinsic growth rate coefficient
- Higher values lead to faster growth and potentially larger oscillations
- [VERIFY: Typical values depend on the organism's generation time]

### Time Delay (τ)
- **Range**: 0 to 100
- **Default**: 10
- Lag period for population feedback
- Represents biological delays such as maturation time
- Critical parameter for determining stability vs oscillation
- [VERIFY: Oscillations occur when βτ > π/2 ≈ 1.57]

### Initial Population (P₀)
- **Range**: 0 to 300
- **Default**: 50
- Starting population at t=0
- Shown as a green dot at the origin
- Affects transient behavior but not long-term dynamics

## Components

### Population Time Series Graph
- **X-axis**: Time from 0 to 1000
- **Y-axis**: Population from 0 to 300
- **Red dashed line**: Carrying capacity (k)
- **Green dot**: Initial condition at t=0
- **Green curve**: Population trajectory over time
- **Black dot**: Current population position during animation
- **Gray "ghost" dot**: Population at t-τ (delayed value used in the equation)

### Parameter Sliders
- **Carrying capacity (k)**: Sets the equilibrium population level
- **Birth rate (β)**: Controls growth speed and oscillation amplitude
- **Time delay (τ)**: Critical parameter for stability analysis
- **Initial population (P₀)**: Starting point for simulation

### Control Buttons
- **Solve**: Start the numerical integration from t=0
- **Stop**: Pause the simulation at current time

### Equation Display
- Shows the Hutchinson delay differential equation

## What to Observe

1. **Delay-Induced Oscillations**: With τ = 0, the model behaves like standard logistic growth (smooth approach to k). Increase τ to see oscillations emerge. The critical threshold is approximately βτ > π/2.

2. **Ghost Dot Visualization**: Watch the gray ghost dot - it shows where the population was τ time units ago. The current growth rate depends on this delayed value, which explains why oscillations occur.

3. **Overshoot and Undershoot**: When τ is large, the population "doesn't know" it has reached carrying capacity until it's too late. It overshoots, then overcorrects in the opposite direction.

4. **Amplitude Depends on βτ Product**: The amplitude of oscillations increases with the product βτ. Try β = 0.1, τ = 30 (product = 3) for dramatic oscillations.

5. **Effect of Initial Condition**: Start below or above carrying capacity. Below: population rises, potentially overshooting. Above: population falls, potentially undershooting. The transient differs but the eventual oscillation pattern is the same.

6. **Stable vs Unstable**: Compare τ = 5 (stable, smooth approach) with τ = 30 (sustained oscillations). Find the critical delay where behavior transitions.

7. **Damped vs Sustained Oscillations**: Near the stability boundary, oscillations are damped (gradually decrease). Far into the unstable regime, oscillations persist indefinitely.

## References

