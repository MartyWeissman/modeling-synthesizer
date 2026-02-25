# Three-Compartment Matrix Model

## Overview

Models the discrete-time dynamics of three interacting compartments using matrix multiplication. At each time step the state vector **v** = [A, B, C]ᵀ is updated by **v**(t+1) = **M** · **v**(t), where **M** is a 3×3 transition matrix whose entry M[i][j] gives the amount (or fraction) transferred from compartment j to compartment i per step. The compartments can represent biological populations, chemical concentrations, disease states, age classes, or any other quantity that flows between three pools. [VERIFY: appropriate biological contexts]

## The Transition Matrix

The **Transition Matrix** occupies the top-left 4×4 block of the interface. Row labels read "To A", "To B", "To C" and column labels read "From A", "From B", "From C", so the entry in row i, column j represents flow **from** compartment j **to** compartment i.

Each matrix entry accepts values between **-1000 and 1000** in steps of 0.01. Negative entries are allowed, which can represent net outflows, inhibition, or other decreasing interactions. The label on each entry shows the two-character abbreviation of the source and destination compartments (e.g., "Ap→Ba" for Apples→Bananas).

**Default matrix values:**

- **To A:** From A = 0.70, From B = 0.10, From C = 0.05
- **To B:** From A = 0.20, From B = 0.80, From C = 0.10
- **To C:** From A = 0.10, From B = 0.10, From C = 0.85

**Conservation note:** If the columns each sum to 1.0, the total population is conserved at every step (a proper Markov/stochastic matrix). The panel on the right displays the column sums so you can monitor this. The tool does not require columns to sum to 1 — any values are permitted.

## Parameters

**Compartment names:** Three text inputs (max 12 characters each), defaults "A", "B", "C". The names appear on the row and column labels of the matrix, in the time-series legend, and on the matrix entry labels. Changing a name updates all labels immediately.

**Starting number (A):** Numeric input, range 0–9999, step 1, default 100. The initial population of compartment A used when Run or Step is first pressed.

**Starting number (B):** Numeric input, range 0–9999, step 1, default 50. The initial population of compartment B.

**Starting number (C):** Numeric input, range 0–9999, step 1, default 50. The initial population of compartment C.

## Controls

**Run (green button):** Starts the simulation, advancing one time step per animation frame (up to 100 steps). The matrix and starting populations are locked in at the moment Run is first pressed. The button label changes to "Running" while the simulation is active. Pressing Run again while running has no effect.

**Step (yellow button):** Advances the simulation by exactly one time step and then stops. Useful for examining the state at each individual step. The matrix and starting populations are locked in on the first Step press, just as with Run. Can be used to single-step after pausing a running simulation.

**Pause (red button):** Stops the animation loop, freezing the simulation at the current step. The graph and population readout remain visible. Press Run to resume from where it stopped.

**Reset (gray button):** Stops the simulation and returns to t=0, restoring the starting populations from the current "Starting number" inputs. The graph shows only the initial dots at t=0.

## Time-Series Graph

Occupies the bottom-left of the interface. The x-axis (Time Step) **scales dynamically** to the current data: after 5 steps it spans 0–5, after 50 steps it spans 0–50, up to a maximum of 100 steps. The y-axis scales to fit all values including the total.

- **Colored lines** (red, blue, green by default) track each compartment's population over time.
- **Black dashed line** tracks the total population (sum of all three compartments).
- **Filled dots** mark the current (most recent) value of each series. At t=0, only dots are shown — one for each compartment and one for the total — giving a clear starting reference before any steps are taken.

## Results Panel

The panel to the right of the time-series graph shows:

**Step counter:** The current time step out of the maximum (100).

**Legend and current populations:** A colored swatch and name for each compartment, followed by its current (rounded) population value. The total population appears directly below, separated by a thin line, reading as the sum of the three values above it. The total's swatch mimics the dashed line style used in the graph.

**Column sums:** The sum of each column of the transition matrix, displayed as plain numbers. If columns sum to 1.0 the total population is conserved; departures from 1.0 indicate net growth or decay in the system.

## What to Observe

- With the default matrix (columns summing to 1.0), press Run and observe the populations converging toward a steady state — the long-run eigenvector of **M**. [VERIFY: steady-state convergence claim for these default values]
- Use the Step button repeatedly to watch the matrix multiplication unfold one step at a time. Compare each new population vector to **M** times the previous one.
- Set a diagonal entry (e.g., A→A) above 1.0 to model exponential growth in that compartment and observe the total population increasing over time.
- Set all off-diagonal entries in a column to 0 to make a compartment absorbing — all individuals that enter stay indefinitely.
- Rename the compartments (e.g., "Prey", "Pred", "Env") to match a biological scenario and set matrix entries to reflect known transfer rates. [VERIFY: example naming suggestions]
- After running, press Reset and modify the starting numbers to explore how the long-run behavior depends (or does not depend) on initial conditions.
- Set one column sum above 1.0 and another below 1.0 and observe the total population (black dashed line) growing or shrinking over time.

## References

[To be added]