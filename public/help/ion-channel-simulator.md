# Ion Channel Simulator

## Overview

This tool simulates a single ion channel as a two-state Markov process. The channel is either closed (0 pA) or open (2 pA), with random transitions between states at each millisecond time step. Gaussian noise is added to the current to mimic a patch clamp recording. [VERIFY: two-state Markov model is a standard simplification for single-channel patch clamp recordings]

## Parameters

**P(Open->Closed):** Horizontal slider adjusts between 0.00 and 1.00, default 0.05. The probability per millisecond that an open channel transitions to the closed state.

**P(Closed->Open):** Horizontal slider adjusts between 0.00 and 1.00, default 0.05. The probability per millisecond that a closed channel transitions to the open state.

## Components

**Patch Clamp Recording:** Custom canvas display showing the simulated current trace over 350 ms. The y-axis (right side) shows current in picoamperes (pA) with 0 at the top and 2 at the bottom, mimicking the convention in electrophysiology recordings. Grid lines are spaced every 10 ms horizontally and every 0.5 pA vertically, forming a square grid for quantitative reading. The time axis runs along the bottom with tick marks every 50 ms.

**Simulate Button:** Runs a new 350 ms simulation. The channel starts in the closed state. At each 1 ms step, the current is sampled from a Gaussian distribution (mean 0 pA when closed, mean 2 pA when open, standard deviation 0.2 pA in both states), and a state transition may occur based on the set probabilities. Each press generates a new random trace.

**Clear Button:** Clears the current trace and resets the statistics display.

**Info & Results Display:** Shows channel model information (Closed <-> Open, two-state Markov channel, current levels, and noise level). After a simulation runs, displays three statistics:
- **Time open:** Total milliseconds the channel spent in the open state.
- **Time closed:** Total milliseconds the channel spent in the closed state.
- **Avg open:** Average duration of consecutive open-state episodes, in milliseconds.

## What to Observe

- Click **Simulate** multiple times with the same parameters to see how randomness produces different traces each time. Compare the statistics across runs.
- Increase **P(Closed->Open)** while keeping P(Open->Closed) fixed to see the channel spend more time in the open state, with the trace hovering near 2 pA more often.
- Increase **P(Open->Closed)** while keeping P(Closed->Open) fixed to see shorter open episodes and more time near 0 pA.
- Set both probabilities **very low** (e.g., 0.01) to observe long dwell times in each state, producing a trace with infrequent but sustained transitions.
- Set both probabilities **very high** (e.g., 0.50 or above) to see rapid flickering between open and closed states.
- Use the **10 ms grid lines** to measure individual open or closed durations directly from the trace and compare with the reported average open-time.
- Note that the **average open-time** is related to P(Open->Closed): for small probabilities, the expected open duration is approximately 1/P(Open->Closed) ms. [VERIFY: geometric distribution mean for Markov transition probability]

## References

[To be added]
