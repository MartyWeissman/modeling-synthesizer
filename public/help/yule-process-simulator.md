# Yule Process Simulator

## Overview

This tool simulates a stochastic birth and death process for a population of cells (for example, bacteria in a well). Time moves in whole steps. In each time step, every cell independently may die, and every surviving cell may divide in two. Deaths happen before divisions. The tool runs many independent trials from the same starting population and plots each trial's population P(t) over time, so you can see how much chance alone makes identical populations differ.

## The Model

In each time step, for each cell:
1. The cell dies with probability D.
2. If it survives, it divides into two cells with probability B.

All cells act independently of one another. So after one step, each cell has become 0 cells (probability D), 1 cell (probability (1 − D)(1 − B)), or 2 cells (probability (1 − D)B).

**Expected growth:** On average, each cell becomes (1 − D)(1 + B) cells per step. So the expected population after t steps is

E(P(t)) = N₀ · [(1 − D)(1 + B)]ᵗ,

which is exponential growth (or decay). On a semilog plot, log₁₀ of this expectation is a straight line with slope log₁₀((1 − D)(1 + B)) per step. For example, with B = 5% and D = 0%, the growth factor is 1.05 per step, the slope is log₁₀(1.05) ≈ 0.021, and a population starting at 10 is expected to reach about 115 after 50 steps. Individual trials scatter around this expectation.

**Extinction:** Even when the population is expected to grow, a trial can die out by chance, most often early on while the population is small. Each starting cell's family line eventually dies out with probability

q = min(1, D / ((1 − D)B)),

and the whole population eventually dies out with probability q^N₀. With the defaults (B = 5%, D = 2%, N₀ = 10), q ≈ 0.41, and q¹⁰ ≈ 0.0001, so extinction is rare; starting from a single cell (N₀ = 1), the population eventually dies out about 41% of the time. If D ≥ (1 − D)B, then q = 1: the population eventually dies out with certainty. (These are probabilities of dying out *eventually*; within the T steps shown, extinction is somewhat less likely.)

## Parameters

**Division (B):** Slider adjusts between 0.0% and 10.0% per step, in steps of 0.1%, default 5.0%. The probability that a surviving cell divides during one time step.

**Death (D):** Slider adjusts between 0.0% and 10.0% per step, in steps of 0.1%, default 2.0%. The probability that a cell dies during one time step.

**Pop:** Input adjusts between 1 and 100, default 10. The starting population N₀ of each trial.

**T:** Input adjusts between 1 and 100, default 50. The number of time steps in each trial.

**N:** Input adjusts between 1 and 50, default 20. The number of independent trials.

## Components

**Run! Button:** Runs N new trials with the current settings and replaces the previous results. The graph and Results always describe the most recent run; changing the settings takes effect on the next Run!.

**Log Scale Button:** Toggles the vertical axis between a linear scale and a logarithmic (semilog) scale with ticks at 1, 10, 100, 1000, .... On the log scale, exponential growth appears as a straight line, so you can compare slopes. A population of 0 cannot be shown on a log scale, so extinct trials are drawn on a separate level labeled "0" at the bottom of the axis, below 1.

**Population Trajectories Graph:** Shows P(t) for each trial as a colored line, with Time (steps) on the horizontal axis and Population on the vertical axis. When a trial goes extinct, a dot of the same color marks the time of extinction at the bottom of the graph.

**Results Display:** After a run, shows:
- **Extinctions:** How many of the N trials ended with population 0, and the percentage.
- **Survivors Avg:** The average final population of the trials that did not go extinct.
- **Min Final** and **Max Final:** The smallest and largest final populations among all trials.

**Population cap:** To keep the simulation fast, a trial's population is never allowed to exceed 10,000. If any trial reaches this cap, the Results display adds a line "*Hit 10,000 cap" with the number of such trials, and marks Survivors Avg and Max Final with *, since those numbers are then smaller than the true values would be. To avoid the cap, lower B, T, or the starting population.

## What to Observe

- Set B = 5%, D = 0%, and Pop = 10 (as in the Lab Manual). Turn on Log Scale: the trajectories are roughly straight lines, with slopes near log₁₀(1.05) ≈ 0.021 per step, but they do not all coincide. Early random divisions give some trials a head start that they keep.
- Compare the spread of final populations to the single curve of an exponential model. Identical starting conditions can end with populations differing by a factor of 2 or more.
- Raise D and lower Pop to see extinctions, which an exponential model can never produce (its population never reaches 0). Extinction is most likely when the population is small.
- Find settings where (1 − D)(1 + B) is close to 1: the expected population barely changes, yet individual trials wander far up or down, and many go extinct.

## How This Differs From a True Yule Process

G. Udny Yule's original process (1925) is a pure *birth* process in *continuous* time: individuals never die, and each one splits at a constant rate. This tool is a discrete-time version with deaths added, so it is really a birth–death process (in probability, a Galton–Watson branching process). With D = 0% it is a discrete-time analog of the Yule process. Yule was interested in speciation, the evolutionary events in which one species splits into two, rather than in the division of cells.

## References

- G. Udny Yule, "A mathematical theory of evolution, based on the conclusions of Dr. J. C. Willis, F.R.S.," *Philosophical Transactions of the Royal Society of London, Series B* 213 (1925): 21–87.
