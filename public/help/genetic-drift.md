# Genetic Drift Simulator

## Overview

This tool simulates genetic drift: random change in the make-up of a population from one generation to the next, with no natural selection at all. The population contains two types (Type A and Type B, which you can rename, e.g. spotted and nonspotted banana slugs). Each generation, every individual has offspring to form a larger breeding pool, and then a fixed number N of survivors is chosen at random from that pool. Because the survivors are a random sample, the numbers of each type wander over time, and one type can be lost entirely. When only one type remains, that type has become **fixed**.

This is a version of the Wright–Fisher model, a standard starting point for studying genetic drift.

## Parameters

**Type A Name / Type B Name:** Text inputs for the labels of the two types (default "Type A" and "Type B", at most 12 characters).

**Initial % Type A:** Slider from 0% to 100%, default 70%. The starting share of Type A.

**Initial % Type B:** Slider from 0% to 100%, default 30%. Linked to the Type A slider, so the two always add to 100%.

**Population Size (N):** Numeric input from 10 to 1000, default 100, step 10. The number of individuals in every generation.

**Per Capita Births (Births):** Numeric input from 0.1 to 10, default 1, step 0.1. Each individual has 1 + Births offspring on average, so the breeding pool has N × (1 + Births) individuals, and N survivors are drawn from it at random.

More births give **stronger** drift. With few births, the pool is only a little larger than N, so almost everyone survives and the make-up hardly changes. With many births, the N survivors are a small random sample of a big pool, so the make-up changes a lot. Roughly, the population drifts like an ideal Wright–Fisher population of size N × (1 + Births) / Births: about 11N at Births = 0.1, 2N at the default Births = 1, and 1.1N at Births = 10.

When N × (1 + Births) is not a whole number, the pool is rounded at random in a way that favors neither type.

## Components

**Main Graph:** Population vs Generations, as a stacked bar chart with one bar per generation (0 to 300). Type A (blue) is on the bottom and Type B (orange) on top. The y-axis runs from 0 to the N used for the displayed run. When the run is finished, the initial counts are printed on the left edge of the chart and the final counts on the right edge (when there is room).

**Legend and status:** Color swatches with the current type names, and the status: "Click Simulate to start", "Generation X/300" while the run is drawn, then "Fixed at generation X" or "No fixation in 300 generations".

**Statistics:** After a run, the initial and final counts of each type, and "[type name] fixed!" if one type was lost.

**Simulate Button:** Runs a new 300-generation simulation with the current settings and draws it over about 5 seconds. Disabled while a run is being drawn. Changing N afterwards does not change the displayed run; press Simulate again to use the new value.

## What to Observe

- Click **Simulate** several times with the same settings. Each run is different: this randomness is genetic drift.

- Estimate how often fixation happens by counting over many runs. Not every run reaches fixation within the 300 generations shown: some runs still have both types at the end. (Given enough generations, one type would eventually be lost in every run.)

- Change **Population Size (N)**. Small populations (N = 10–50) show rapid, dramatic changes; large populations (N = 500–1000) change slowly.

- Change the **Initial %** and see how it affects which type becomes fixed, and how often.

- Change **Per Capita Births**. Low values (0.1–0.5) give smooth bars and rare fixation; high values (5–10) give jumpy bars and fast fixation.

- Watch the status line for the **generation at which fixation happened**. Compare it across runs and population sizes.
