# Tree Ring Simulator

## Overview

Simulates annual tree ring growth over multiple years using random variation. Each year's growth is drawn from either a uniform distribution or a binary (coin-flip) distribution. Visualizes the resulting ring patterns in both circular cross-section and linear views, and compares the total growth to statistical expectations.

## Parameters

**Min:** Input field adjusts between 0.1 and 10 mm, default 1 mm. Sets the minimum possible annual ring growth.

**Max:** Input field adjusts between 0.1 and 10 mm, default 5 mm. Sets the maximum possible annual ring growth.

**Years:** Input field adjusts between 1 and 100, default 20. Sets how many years of growth to simulate.

**Distribution:** Wheel selector toggles between "Uniform" and "Binary", default "Uniform".
- **Uniform:** Each year's growth is randomly chosen from anywhere in the [Min, Max] interval with equal probability.
- **Binary:** Each year's growth is a 50/50 coin flip between exactly Min or exactly Max (no intermediate values).

## Components

**Tree Cross-Section Window:** Displays a circular cross-section view of the simulated tree trunk. Rings grow outward from a central pith, with each ring representing one year of growth. Ring boundaries have organic, slightly irregular shapes generated using periodic noise functions. After simulation completes, a red dashed rectangle indicates the horizontal slice shown in the zoomed view, with a label displaying the total radius in mm.

**Zoomed View Window:** Displays a linear (flattened) view of the tree rings as a horizontal slice from center to bark. This corresponds to the region highlighted by the red dashed rectangle in the cross-section view. Ring boundaries show the same organic variation as the circular view. Year labels appear below the first and last rings. A red dashed border indicates this is the magnified region.

**Results Display:** Shows two lines of statistics after simulation:
- **Total:** The actual sum of all yearly growth values in mm
- **Expected:** The theoretical expected total ± one standard deviation in mm

The expected value equals (Min + Max) / 2 × Years for both distribution types. The standard deviation differs: for Uniform distribution, σ = √(Years × (Max - Min)² / 12); for Binary distribution, σ = √(Years × (Max - Min)² / 4).

**Grow! Button:** Triggers a new simulation with the current parameter settings. Plays a 1.5-second animation showing rings appearing progressively from the center outward.

## What to Observe

- Run multiple simulations with the same parameters and notice how the total growth varies around the expected value
- Switch between Uniform and Binary distributions and observe how Binary produces more dramatic variation in ring widths (each ring is either thin or thick, never medium)
- With Binary distribution, notice the larger standard deviation - the ± value is about 1.7× larger than with Uniform distribution for the same Min/Max range
- Increase the number of Years and observe how the standard deviation grows (proportional to √Years), but the relative variation (σ/expected) decreases
- Set Min and Max close together (e.g., 2.9 and 3.1) to see nearly uniform ring widths
- Set Min and Max far apart (e.g., 1 and 9) to see highly variable ring patterns
- Compare the radius label on the cross-section to the Total in the results display - they show the same value

## References

[To be added]
