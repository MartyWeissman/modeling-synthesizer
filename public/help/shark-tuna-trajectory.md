# Shark-Tuna Trajectories

## Overview

Models predator-prey dynamics using the Lotka-Volterra equations. Displays phase space trajectories, vector fields, equilibrium points, and population time series for interactive exploration of shark-tuna interactions.

## Parameters

**Predation Coefficient (p):** Horizontal slider adjusts between 0.0 and 0.1, default 0.03. Represents the rate at which shark-tuna encounters result in successful predation. [VERIFY: ecological interpretation]

**Consumption Rate (q):** Horizontal slider adjusts between 0.0 and 0.4, default 0.04. Represents the conversion efficiency of consumed tuna into shark population growth. [VERIFY: ecological interpretation]

**Tuna Growth Rate (β):** Horizontal slider adjusts between 0.0 and 2.0, default 0.6. Represents the intrinsic growth rate of the tuna population in the absence of predation. [VERIFY: ecological interpretation]

**Shark Death Rate (δ):** Horizontal slider adjusts between 0.0 and 4.0, default 0.4. Represents the natural mortality rate of sharks in the absence of prey. [VERIFY: ecological interpretation]

**Animation Speed:** Horizontal slider adjusts between 0.0x and 4.0x, default 2.0x. Controls the speed of trajectory animation.

## Components

**Phase Portrait Graph:** Displays Tuna Population (T, y-axis) versus Shark Population (S, x-axis) from 0 to 50 for both axes. Shows vector field (gray arrows indicating direction of population change), equilibrium points (blue dot for stable equilibrium, orange dot for saddle point), and animated trajectories. Click anywhere on the graph to start a trajectory from that initial population state.

**Time Series Graph:** Displays population levels over time for both species. Shows the last 20 time units of simulation data. Orange line represents shark population, teal line represents tuna population. The x-axis range slides as the simulation progresses.

**Lotka-Volterra Model Display:** Info panel showing the differential equations for predator dynamics (dS/dt) and prey dynamics (dT/dt) using MathML equation rendering.

**Equilibrium Point Display:** Status panel showing the non-trivial equilibrium point coordinates: S* = β/q and T* = δ/p. Values update dynamically as parameters change.

**Reset Button:** Momentary button that clears all trajectories and stops the animation, returning to initial state.

**Kill 10 Tuna Button:** Momentary button that instantly removes 10 individuals from the tuna population of all active trajectories.

**Kill 10 Sharks Button:** Momentary button that instantly removes 10 individuals from the shark population of all active trajectories.

**Simulation Status Display:** Info panel showing the number of active trajectories, current simulation time, and animation status (Running/Stopped). Includes instructions for adding trajectories.

## What to Observe

- Click on the phase portrait to add trajectory starting points. Each click creates a new colored trajectory that evolves according to the Lotka-Volterra equations.
- Adjust **Predation Coefficient (p)** to observe how predation efficiency affects the equilibrium point position (T* = δ/p) and the size of population cycles.
- Adjust **Tuna Growth Rate (β)** to observe how prey reproduction affects the equilibrium point position (S* = β/q) and cycle dynamics.
- Set **Animation Speed** to 0 to pause trajectories and examine the current state, or increase to 4x for faster dynamics.
- Click near the blue equilibrium point to observe small oscillations around the stable state. Click far from equilibrium to observe large population cycles.
- Click **Kill 10 Tuna** during a simulation to observe how sudden prey population drops affect the predator-prey cycle in the time series graph.
- Observe the vector field arrows to predict trajectory direction before clicking. Arrows show the instantaneous rate of change at each point in state space.
- Watch the time series graph to see how the circular phase portrait trajectories correspond to periodic oscillations in population levels over time.

## References

[To be added]
