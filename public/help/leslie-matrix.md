# Leslie Matrix Population Model

## Overview

This tool simulates age-structured population dynamics using a Leslie matrix. The population is divided into discrete age classes (strata), each with its own fecundity and survival rate. At each time step, the Leslie matrix multiplies the current population vector to produce the next generation's age distribution.

## Parameters

The parameters are entered in the **Age Class Parameters** table (top right). Each row corresponds to one age stratum.

**Fecundity:** Table input, per age class, range 0–1000, default blank (treated as 0). The average number of offspring produced per individual in that age class per time step.

**Survival:** Table input, per age class, range 0.0–1.0, default blank (treated as 0). The fraction of individuals in each age class that survive to the next class. The final age class is fixed at 0 (no survival beyond the last stratum).

**Start Population:** Table input, per age class, range 0 and up, default blank (treated as 0). The initial number of individuals in each age class at t = 0.

**Number of Strata:** Integer input, range 2–10, default 5. Sets the number of age classes. Changing this resets the simulation.

## Components

**Time Series Graph (top left, 6×3):** Displays population count (pseudolog scale) vs. time step. Each age stratum is drawn as a colored line, shading from green (youngest) to amber-brown (oldest). The y-axis uses a pseudo-logarithmic scale: 0 maps to 0, then 1, 10, 100, 1000, … are evenly spaced. The x-axis expands gradually as the simulation runs. A filled dot marks each stratum's value at t = 0.

**Leslie Matrix / Population / Eigenvector display (bottom left, 6×3):** A canvas rendering three column vectors side by side:

- **Leslie Matrix** — the n×n matrix M. Fecundity entries (top row) are shown in blue, survival entries (sub-diagonal) in green, and zeros in gray. Bezier-curve brackets surround the matrix.
- **Current Population** — the population vector at the current time step, colored by stratum (green → amber-brown). Values use a compact format (scientific notation for very large numbers).
- **Dominant Eigenvector** — the stable age distribution corresponding to the dominant eigenvalue, displayed as rounded percentages summing to 100%. Shown in stratum colors. If the matrix is imprimitive (fecundity concentrated in a single age class whose index shares a common factor > 1 with others), this column shows dashes and a tooltip explains why. The label also shows the dominant eigenvalue λ₁ to 3 significant figures.

**Age Class Parameters table (top right, 3×4):** Editable table with columns Age Strata (computed), Fecundity, Survival, and Start Population. Column text is color-coded to match the Leslie matrix display. The last survival cell is locked to 0.

**Start button (green):** Begins the simulation, advancing one time step every 300 ms. If no simulation has been initialized, it initializes from the Start Population column first.

**Step button (amber):** Advances the simulation by a single time step. Initializes first if needed.

**Stop button (red):** Pauses a running simulation.

**Reset button (gray):** Clears the simulation history and returns the display to t = 0. Does not clear the parameter table entries.

## What to Observe

- Enter fecundity values in the top row of the table and survival values in the remaining rows, then click **Start** to watch the population evolve.
- Watch how different age classes grow or decline relative to each other as the simulation runs.
- The **Dominant Eigenvector** panel updates immediately when you edit parameters — it shows the theoretical stable age distribution the population would reach in the long run.
- **Eigenvalue λ₁ > 1** means the population grows without bound; **λ₁ < 1** means it declines to extinction; **λ₁ = 1** means a stable steady state.
- Set fecundity in only one age class (e.g., only age 3) to see the "imprimitive" label appear — power iteration cannot extract a unique dominant eigenvector in that case.
- Increase **Number of Strata** to model populations with more age structure. The simulation resets automatically.
- The time series y-axis is pseudo-logarithmic, so both small and very large population counts remain visible simultaneously.
- Click **Stop**, adjust a parameter, and click **Start** again to continue from the current state with updated parameters.

## References

- Bacaër, N. (2011). "The Leslie matrix (1945)." In *A Short History of Mathematical Population Dynamics*. Springer London, pp. 117–120. [https://doi.org/10.1007/978-0-85729-115-8_21](https://doi.org/10.1007/978-0-85729-115-8_21)
