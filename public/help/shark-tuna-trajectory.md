# Shark-Tuna Trajectories

## Overview

Models predator-prey dynamics with the Lotka-Volterra equations

- S′ = −δS + pST
- T′ = βT − qST

where S is the number of sharks and T the number of tuna. The tool shows the vector field, the equilibrium points, trajectories you start by clicking, and a time series of the populations.

## Parameters

**Predation Coefficient (p):** Slider from 0 to 0.1, default 0.03. How much each shark-tuna interaction benefits the sharks: the interaction term +pST in the shark equation.

**Consumption Rate (q):** Slider from 0 to 0.4, default 0.04. How many tuna are lost to each shark-tuna interaction: the interaction term −qST in the tuna equation.

**Tuna Growth Rate (β):** Slider from 0 to 2, default 0.6. Per-capita growth rate of the tuna when there are no sharks.

**Shark Death Rate (δ):** Slider from 0 to 1, default 0.4. Per-capita death rate of the sharks when there are no tuna.

**Animation Speed:** Slider from 0x to 4x, default 2x. Controls how fast trajectories are drawn. At 0 the animation stops.

## Components

**Phase Portrait Graph:** Tuna Population (T, vertical axis) against Shark Population (S, horizontal axis), both from 0 to 50. Gray arrows (the vector field) show the direction of population change at each point. Click anywhere to start a trajectory from that starting population. A trajectory keeps being computed when it leaves the window, and comes back into view when the populations do; only the drawing is cut off at the edges.

**Equilibrium points:** Colored by type. The interior equilibrium (S*, T*) = (β/q, δ/p) is a **center** (purple dot): nearby trajectories go around it in closed orbits instead of approaching it or moving away. The origin (0, 0) is a **saddle** (orange dot).

**Time Series Graph:** Sharks (orange, solid) and tuna (teal, dashed) over the last 20 time units, for the most recently started trajectory. The time axis slides as the simulation runs.

**Lotka-Volterra Model Display:** The two change equations.

**Equilibrium Point Display:** The interior equilibrium S* = β/q and T* = δ/p and its type. If p = 0 or q = 0 there is no interior equilibrium, and the display says so.

**Reset Button:** Clears all trajectories and the time series, and stops the animation.

**Kill 10 Tuna Button:** Instantly removes 10 tuna from every trajectory that is running.

**Kill 10 Sharks Button:** Instantly removes 10 sharks from every trajectory that is running.

**Simulation Status Display:** Number of active trajectories, current time, and whether the animation is running.

## What to Observe

- Click on the phase portrait to add trajectories. Each click starts a new colored trajectory.
- Trajectories are **closed orbits** around the equilibrium: the populations return to where they started and repeat. In the time series this shows up as regular oscillations, with tuna peaking before sharks.
- Click near the equilibrium for small oscillations; click far from it for large ones. Large orbits can leave the window and come back.
- Adjust **p** to move T* = δ/p, and **β** or **q** to move S* = β/q.
- Click **Kill 10 Tuna** or **Kill 10 Sharks** at different points of an orbit. The trajectory jumps to a different closed orbit, which may be larger or smaller than the one it was on.
- Use the vector field arrows to predict where a trajectory will go before you click.
