# Genetic Drift Simulator

## Overview

This tool simulates genetic drift—the random change in allele frequencies over generations in a finite population. Each generation, individuals reproduce to create a breeding pool, then random sampling reduces the population back to a fixed size. This stochastic process can lead to the fixation (100% frequency) or loss (0% frequency) of alleles over time, even without natural selection. [VERIFY: standard Wright-Fisher model variant]

## Parameters

**Type A Name:** Text input for customizing the label of the first allele type, default "Type A". Maximum 12 characters.

**Type B Name:** Text input for customizing the label of the second allele type, default "Type B". Maximum 12 characters.

**Initial % Type A:** Slider adjusts between 0% and 100%, default 70%. Sets the starting frequency of Type A in the population.

**Initial % Type B:** Slider adjusts between 0% and 100%, default 30%. Linked to Type A slider—the two always sum to 100%.

**Population Size (N):** Numeric input adjusts between 10 and 1000, default 100, step 10. The number of individuals in the population each generation.

**Per Capita Births:** Numeric input adjusts between 0.1 and 10, default 1, step 0.1. Controls the size of the intermediate breeding pool. Each individual produces (1 + Births) offspring before random sampling back to population size N. Higher values reduce drift intensity; lower values increase drift intensity. [VERIFY: relationship to effective population size]

## Components

**Main Graph:** Displays Population vs Generations as a stacked bar chart over 300 generations. Type A (blue) is shown on the bottom, Type B (orange/amber) on top. The Y-axis range adjusts to the current population size N. After the simulation completes, initial and final counts are displayed as white labels on the left and right edges of the chart.

**Legend Display:** Shows color swatches for Type A and Type B with their current names. Also displays simulation status: "Click Simulate to start", "Generation X/300" during animation, or "Complete (300 generations)" when finished.

**Statistics Display:** After simulation completes, shows a two-column summary:
- Initial Type A count and Initial Type B count
- Final Type A count and Final Type B count
- If fixation occurred, displays "[Type name] fixed!" in the corresponding color

**Simulate Button:** Starts a new simulation. The animation runs for approximately 5 seconds, showing drift progression across 300 generations. Disabled while a simulation is running.

## What to Observe

- Click **Simulate** multiple times with the same parameters to see how different random outcomes lead to different final frequencies—this is the essence of genetic drift.

- Adjust **Population Size (N)** to observe drift intensity: smaller populations (N=10-50) show rapid, dramatic frequency changes and frequent fixation; larger populations (N=500-1000) show slower, more gradual changes.

- Set **Initial % Type A** to 50% to observe that even with equal starting frequencies, one allele will eventually fix due to random drift alone.

- Adjust **Per Capita Births** to control drift strength: lower values (0.1-0.5) create stronger drift with more erratic frequency changes; higher values (5-10) create weaker drift with smoother trajectories.

- Use the **Type A/B Name** inputs to label alleles with meaningful names (e.g., "Allele A" and "Allele a", or "Blue" and "Brown") for educational demonstrations.

- Watch for **fixation events** where one type reaches 100% and the other reaches 0%—this is more likely with small populations or extreme initial frequencies.

## References

[To be added]
