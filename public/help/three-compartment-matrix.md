# Three-Compartment Matrix Model

## Overview

Models the discrete-time dynamics of three compartments using matrix multiplication. At each time step the state vector **v** = [A, B, C]ᵀ is updated by **v**(t+1) = **M** · **v**(t), where **M** is a 3×3 transition matrix whose entry in row i, column j gives the fraction (or amount per individual) that moves **from** compartment j **to** compartment i in one step. The compartments can be cell states (for example stem-like, basal and luminal tumor cells), disease states (susceptible, infected, immune), or age classes (eggs, hoppers, adults in a Leslie matrix).

## The Transition Matrix

The **Transition Matrix** occupies the top-left 4×4 block of the interface. Row labels read "To A", "To B", "To C" and column labels read "From A", "From B", "From C", so the entry in row i, column j represents flow **from** compartment j **to** compartment i.

Each matrix entry accepts values between **-1000 and 1000**. Type a value and press Enter (or click elsewhere) to commit it. The label on each entry shows the first two characters of the source and destination names (e.g. "St→Ba" for Stem→Basal).

**Default matrix values:**

- **To A:** From A = 0.70, From B = 0.10, From C = 0.05
- **To B:** From A = 0.20, From B = 0.80, From C = 0.10
- **To C:** From A = 0.10, From B = 0.10, From C = 0.85

**Conservation note:** If every column sums to 1, the total population stays the same at every step (a Markov, or stochastic, matrix). The panel on the right displays the column sums so you can check this. The tool does not require columns to sum to 1: Leslie matrices, for example, have column sums other than 1.

**Editing the matrix during a run:** A matrix edit takes effect from the next step. If you edit the matrix after the run has started, a dashed vertical line labeled "M edited" marks that step on the graph. Press Reset to start over with the new matrix.

## Parameters

**Compartment names:** Three text inputs (up to 12 characters each), defaults "A", "B", "C". The names appear on the row and column labels of the matrix, on the matrix entry labels, and in the legend.

**Starting number (A, B, C):** Whole numbers from 0 to 9999; defaults 100, 50 and 50. Before the first step, editing a starting number immediately updates the t = 0 points on the graph and the numbers in the panel. After the run has started, new starting numbers take effect when you press Reset.

## Controls

**Run (green button):** Advances the model one time step every 0.3 seconds, up to 100 steps (a full run takes about 30 seconds). The label changes to "Running" while it runs.

**Step (yellow button):** Advances the model by exactly one time step. Useful for checking each multiplication by hand.

**Pause (red button):** Stops the run at the current step. Press Run to continue or Step to go one step at a time.

**Reset (gray button):** Stops the run and returns to t = 0, using the current starting numbers and the current matrix.

After step 100 (or if the numbers become too large for the computer to handle), the panel shows a message and Run and Step do nothing until you press Reset.

## Time-Series Graph

Occupies the bottom-left of the interface. The time axis grows with the run: it always shows at least steps 0–10 and extends up to step 100. The vertical axis rescales to fit all values, including the total (and negative values, if the matrix has negative entries).

- **Colored lines** (red, blue, green) track each compartment. The current value of each is marked with its own symbol (circle, square, triangle), matching the legend.
- **Dashed line** tracks the total population (sum of all three compartments).

## Results Panel

The panel to the right of the graph shows:

**Step counter:** The current time step out of the maximum (100), plus any status message.

**Legend and current populations:** The name and current value of each compartment (whole numbers above 100, three significant figures below 100, scientific notation above one million), and the total.

**Column sums:** The sum of each column of the matrix. Column sums of 1 conserve the total population; column sums above or below 1 make the total grow or shrink.

## What to Observe

- With the default matrix (columns summing to 1), press Run and watch the populations settle to a steady state. For the default starting numbers (total 200) the steady state is A = 40, B = 80, C = 80, which is the eigenvector of **M** with eigenvalue 1, scaled to the total. The other eigenvalues are 0.75 and 0.6, so the approach is fast: after about 15 steps each population is within 0.5 of its steady-state value.
- Change the starting numbers but keep the total the same, press Reset and Run again: the steady state does not change. Change the total and the steady state scales with it.
- Use the Step button to watch the matrix multiplication one step at a time. Compare each new population vector with **M** times the previous one.
- To make a compartment absorbing (individuals that enter never leave), set its diagonal entry to 1 and the other two entries in its column to 0.
- Rename the compartments to match a biological scenario (for example "Stem", "Basal", "Luminal", or "S", "I", "M") and enter the transition probabilities.
- Enter a Leslie matrix (fecundities in the top row, survival probabilities below the diagonal). For eggs, hoppers and adults with 2% and 5% survival and 1000 eggs per adult, the populations repeat every 3 steps.
- Set one column sum above 1 and another below 1 and watch the total population (dashed line) grow or shrink.
