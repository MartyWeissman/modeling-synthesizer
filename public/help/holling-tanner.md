# Holling-Tanner Predator-Prey Model

## Overview

This tool simulates the Holling-Tanner predator-prey model for sharks (predators, S) and tuna (prey, T). It changes the Lotka-Volterra equations in two ways:

- **Sharks have a limited appetite.** Tuna are eaten at rate cST/(h + T): a Holling type II functional response. Each shark eats at most c tuna per unit time, however many tuna there are.
- **Tuna set the sharks' carrying capacity.** Sharks grow logistically with carrying capacity qT, so twice as many tuna can support twice as many sharks. There is no pST term; this form of the shark equation is known as the Leslie-Gower predator equation.

With these changes the model can have either a stable coexistence equilibrium or sustained oscillations (a limit cycle), depending on the parameters.

## The Model

- S′ = αS(1 − S/(qT))
- T′ = βT(1 − T/m) − cST/(h + T)

## Parameters

Each parameter is a number box: type a value and press Enter, or use the arrows.

### α (Shark growth rate): 0.01–1.0
Intrinsic growth rate of the shark population. Default: 0.1.

### β (Tuna growth rate): 0.1–3.0
Intrinsic growth rate of the tuna population without predation. Default: 1.0.

### c (Maximum tuna-eating rate per shark): 0.1–3.0
The most tuna one shark can eat per unit time (the shark's appetite). Default: 0.5.

### h (Half-saturation constant): 0.1–3.0
The number of tuna at which a shark eats at half its maximum rate. Larger h means sharks need more tuna around to hunt successfully. Default: 1.0.

### m (Tuna carrying capacity): 0.5–10.0
Largest tuna population the ocean supports without sharks. Default: 7.0.

### q (Sharks supported per tuna): 0.5–5.0
The shark carrying capacity is qT. Default: 1.0.

### Animation Speed: 0–4x
Controls how fast the simulation runs. Default: 2x. At 0 the animation stops.

## Components

### Phase Portrait (Main Graph)
Shark population S (horizontal axis, 0–6) against tuna population T (vertical axis, 0–6).

- **Gray arrows**: Direction of population change at each point.
- **Colored trajectories**: Click anywhere to start a trajectory there. A trajectory keeps being computed if it leaves the window; only the drawing is cut off.
- **Equilibrium dot**: The coexistence equilibrium, colored by its type: **blue** if stable, **orange** if unstable.
- **Dashed blue line** (with nullclines shown): the S-nullcline S = qT. The T axis (S = 0) is also part of it.
- **Dashed red curve** (with nullclines shown): the T-nullcline S = β(1 − T/m)(h + T)/c. The S axis (T = 0) is also part of it.

### Time Series Plot
Sharks (blue, solid) and tuna (red, dashed) over the last 20 time units, for the most recently started trajectory.

### Controls

**Show/Hide Nullclines**: Shows the curves where S′ = 0 and T′ = 0. Their crossing is the coexistence equilibrium.

**Reset**: Clears all trajectories and the time series, and sets time back to 0.

**Pause/Resume**: Pauses the trajectories. Resume (or click the plot) to continue. The animation also stops by itself once every trajectory has settled at an equilibrium.

### Equations Display
Shows the two change equations.

### Coexistence Equilibrium Display
Shows S* and T* and the type of the equilibrium (for example "Stable spiral" or "Unstable spiral"). The type comes from the eigenvalues of the Jacobian matrix at the equilibrium.

### Status Display
Number of trajectories, current time, animation state, and the current shark and tuna numbers of the latest trajectory.

## What to Observe

1. **Default parameters (c = 0.5)**: The coexistence equilibrium is a **stable spiral**. Trajectories spiral in toward it, so the oscillations in the time series die out.

2. **Increasing c**: Raise c step by step between 0.5 and 1.2 and watch the equilibrium type. When the equilibrium becomes an **unstable spiral**, trajectories spiral away from it and approach a closed loop, a **limit cycle**: the populations oscillate forever with a fixed size and period. Try c = 1.0 and start trajectories both near the equilibrium and far from it; both end up on the same loop.

3. **Phase relationship**: In the oscillations, tuna peak before sharks: prey increase first, then predators follow.

4. **Nullcline geometry**: Show the nullclines to see how their crossing moves as you change c, m, or q. The S-nullcline is always a straight line through the origin.

5. **Saturation (h)**: Change h to see how the sharks' hunting efficiency affects the equilibrium and whether oscillations persist.

## References

- Holling, C. S. (1959). Some characteristics of simple types of predation and parasitism. *The Canadian Entomologist* 91, 385–398.
- Tanner, J. T. (1975). The stability and the intrinsic growth rates of prey and predator populations. *Ecology* 56, 855–867.
