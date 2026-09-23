# Hutchinson Population Growth Simulator

## Overview

This simulator solves Hutchinson's delayed logistic equation

- **P′ = β · P(t) · (1 − P(t − τ)/k)**

where P(t) is the population at time t, P(t − τ) is the population τ time units earlier, β is the net birth rate under ideal conditions, k is the carrying capacity, and τ is the time delay. Crowding does not slow growth immediately: if the population is above k at some moment, the effect is felt τ time units later. G. Evelyn Hutchinson proposed this model in 1948, in part to explain the oscillations Pratt observed in laboratory populations of the water flea *Daphnia*.

With τ = 0 it is ordinary logistic growth. A delay can make the population overshoot k, and then oscillate.

## Parameters

### Carrying capacity (k)
- **Range**: 1 to 300, **default** 100
- Shown as the red dashed line.

### Birth rate (β)
- **Range**: 0 to 0.1 (steps of 0.001), **default** 0.1

### Time delay (τ)
- **Range**: 0 to 100, **default** 10

### Initial population (P₀)
- **Range**: 0 to 300 (steps of 3), **default** 50
- The population at t = 0, and also before t = 0 (the delay term uses P₀ until t reaches τ).

Moving a slider does not change the curve by itself: press **Solve**. If you change a parameter after solving, the old curve is shown faded with a reminder to press Solve.

## Components

### Population graph
- **X-axis**: time t from 0 to 1000
- **Y-axis**: population P, from 0 to 300. If the population goes higher, the axis grows so the whole curve stays visible (the scale is shown by the tick labels).
- **Red dashed line**: carrying capacity k
- **Green dot**: the initial population, at t = 0, P = P₀
- **Green curve**: the solution P(t)
- **Black dot** (while solving or paused): the current time and population
- **Gray dot** (while solving or paused, once t > τ): the population τ time units ago, P(t − τ), which is what controls the current growth rate

### Buttons
- **Solve**: solves from t = 0 with the current parameters. The curve is drawn over about 3 seconds. Pressing Solve again restarts.
- **Stop**: pauses the solution. The button then reads **Resume**; press it to continue.

## What to Observe

1. **No delay**: with τ = 0 the population rises smoothly to k (logistic growth).
2. **Three kinds of behavior** as the delay grows (try β = 0.1, k = 100, P₀ = 50):
   - τ = 3: a smooth approach to k, with no overshoot;
   - τ = 10: damped oscillations: the population overshoots k, then the swings shrink;
   - τ = 20: sustained oscillations that do not die out.
3. **Critical delay**: for each birth rate there is a critical delay τc. Below it the oscillations die out; above it they persist. Find τc for several birth rates.
4. **Ghost dot**: watch the gray dot while solving. The population keeps growing while the delayed value P(t − τ) is still below k, even after P(t) has passed k.
5. **Boom and bust**: with a long delay and a high birth rate (for example β = 0.1, τ = 50), the population shoots far above k and then crashes almost to zero. In a real population, a crash like that would mean extinction.
6. **Initial population**: P₀ changes the early part of the curve, but not whether the oscillations eventually die out or persist (as long as P₀ > 0).
