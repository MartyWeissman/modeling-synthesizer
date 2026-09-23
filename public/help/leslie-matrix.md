# Leslie Matrix Population Model

## Overview

This tool simulates age-structured population dynamics using a Leslie matrix. The population is divided into discrete age classes (strata), each with its own fecundity and survival rate. At each time step, the Leslie matrix multiplies the current population vector to produce the next generation's age distribution.

## Parameters

The parameters are entered in the **Age Class Parameters** table (top right). Each row corresponds to one age stratum.

**Fecundity:** Table input, per age class, range 0–1000, default blank (treated as 0). The average number of offspring produced per individual in that age class per time step.

**Survival:** Table input, per age class, range 0.0–1.0, default blank (treated as 0). The fraction of individuals in each age class that survive and move to the next class. The last age class's survival is fixed at 0 (no one lives beyond the last stratum).

**Start Population:** Table input, per age class, range 0 and up, default blank (treated as 0). The initial number of individuals in each age class at t = 0.

**Number of Strata:** Integer input, range 2–10, default 5. Sets the number of age classes. Changing this resets the simulation.

All fields start blank, so enter fecundities, survivals and starting numbers before pressing Start or Step.

## Components

**Time Series Graph (top left, 6×3):** Displays population count (pseudolog scale) vs. time step. Each age stratum is drawn as a colored line, shading from green (youngest) to amber-brown (oldest). The y-axis uses a pseudo-logarithmic scale: between 0 and 1 it is linear, and above 1 the values 1, 10, 100, 1000, … are evenly spaced. So a population that dies out slides smoothly down to 0 instead of dropping off the graph. The x-axis expands gradually as the simulation runs. A filled dot marks each stratum's value at t = 0.

**Leslie Matrix display (bottom left, 6×3):** Four bracketed columns side by side, shrunk to fit when there are many strata:

- **Leslie Matrix** — the n×n matrix M. The fecundities form the top row (blue), the survivals form the sub-diagonal just below the main diagonal (green), and all other entries are 0 (gray).
- **Current Population** — the population vector at the current time step, colored by stratum (green → amber-brown). Before the simulation starts it shows the Start Population column.
- **Dominant Eigenvector** — the stable age distribution: the proportions of the population in each age class in the long run, as whole percentages that add up to 100%. Above it is the dominant eigenvalue λ₁ (4 significant figures). λ₁ is computed exactly from the Euler–Lotka equation Σ fᵢ lᵢ λ^−(i+1) = 1, where lᵢ is the fraction of newborns that survive to age class i.
- **Reproductive Value** — how much an individual of each age class contributes to future population growth, relative to a newborn (age 0 has value 1). A class that can no longer reproduce has value 0.

Below the columns a readout shows the time step t, the total population N(t), the growth ratio N(t)/N(t−1), and λ₁. For most matrices the growth ratio converges to λ₁ as the age structure settles into the stable distribution.

If the only age classes that reproduce are, say, ages 2 and 5 (positions 3 and 6 counting from 1), and these positions have a common factor greater than 1 (here 3), the matrix is **imprimitive**: the age structure keeps oscillating with that period and never settles, so N(t)/N(t−1) keeps changing. λ₁ and the eigenvectors still exist and are shown; a note below the readout gives the period. Over one full period the population is multiplied by λ₁ raised to the period.

If no age class that newborns can reach has a positive fecundity, λ₁ = 0 and the population dies out; the eigenvector columns show dashes.

**Age Class Parameters table (top right, 3×4):** Editable table with columns Age Strata (computed), Fecundity, Survival, and Start Population. Column text is color-coded to match the Leslie matrix display. The last survival cell is locked to 0.

**Start button (green):** Begins the simulation, advancing one time step every 300 ms. If the simulation has not started yet, it starts from the Start Population column. The button darkens while running.

**Step button (amber):** Advances the simulation by one time step (the first press starts from the Start Population column and takes one step).

**Stop button (red):** Pauses a running simulation.

**Reset button (gray):** Clears the simulation history and returns the display to t = 0. Does not clear the parameter table entries. The simulation stops by itself if the numbers become too large for the computer.

## What to Observe

- Enter fecundity values in the Fecundity column and survival values in the Survival column of the table, then click **Start** to watch the population evolve. For example, fecundities 0, 1.5, 2, 1, 0 and survivals 0.5, 0.8, 0.7, 0.4 give λ₁ ≈ 1.252.
- Watch how different age classes grow or decline relative to each other as the simulation runs.
- The **Dominant Eigenvector** column updates immediately when you edit parameters — it shows the stable age distribution the population approaches in the long run. Watch N(t)/N(t−1) in the readout approach λ₁.
- **λ₁ > 1** means the population eventually grows exponentially; **λ₁ < 1** means it declines toward extinction; **λ₁ = 1** means the total population levels off (for a primitive matrix, at a steady state with the stable age distribution).
- Set a positive fecundity in only one age class (e.g., only age 2, with survivals 0.5 and 1/3 and fecundity 6 in a 3-stratum model) to see the imprimitive note: the population cycles with period 3 forever instead of settling. The eigenvector is still unique; the population just never converges to it.
- Increase **Number of Strata** to model populations with more age structure. The simulation resets automatically.
- The time series y-axis is pseudo-logarithmic, so both small and very large population counts remain visible simultaneously.
- Click **Stop**, adjust a parameter, and click **Start** again to continue from the current state with updated parameters.

## References

- Bacaër, N. (2011). "The Leslie matrix (1945)." In *A Short History of Mathematical Population Dynamics*. Springer London, pp. 117–120. [https://doi.org/10.1007/978-0-85729-115-8_21](https://doi.org/10.1007/978-0-85729-115-8_21)
