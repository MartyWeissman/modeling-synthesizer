# Caffeine Metabolism Simulator

## Overview

This tool models caffeine concentration in the bloodstream over a 72-hour (3-day) period. It simulates up to three daily doses with exponential decay kinetics. [VERIFY: first-order exponential decay is the standard pharmacokinetic model for caffeine]

## Parameters

**Dose 1 Time:** Time picker selects the hour for the first daily dose. Default: 7:00 AM.

**Dose 1 Amount:** Staircase selector with levels: 0mg, 40mg, 80mg, 120mg, 160mg, 200mg. Default: 120mg (level 3).

**Dose 2 Time:** Time picker selects the hour for the second daily dose. Default: 12:00 PM.

**Dose 2 Amount:** Staircase selector with levels: 0mg, 40mg, 80mg, 120mg, 160mg, 200mg. Default: 80mg (level 2).

**Dose 3 Time:** Time picker selects the hour for the third daily dose. Default: 4:00 PM.

**Dose 3 Amount:** Staircase selector with levels: 0mg, 40mg, 80mg, 120mg, 160mg, 200mg. Default: 40mg (level 1).

**Metabolic Rate (μ):** Horizontal slider adjusts between 0.0 and 0.5 hr⁻¹, default 0.2 hr⁻¹. Controls how quickly caffeine is eliminated from the bloodstream. [VERIFY: typical adult caffeine half-life range corresponds to μ values in this range]

## Components

**Caffeine Graph:** Displays caffeine concentration (mg) vs time (hours) over a 72-hour period (x-axis: 0-72 hours, y-axis: 0-320 mg). A blue curve shows the caffeine level rising after each dose and decaying exponentially between doses. The same dose schedule repeats each of the three days.

**Daily Caffeine Display:** Shows the total daily caffeine intake in mg, calculated as the sum of all three dose amounts.

**Equation Display:** Shows the differential equation governing caffeine metabolism (dC/dt = -μC).

**Dose Labels:** Three labels ("Dose 1", "Dose 2", "Dose 3") identify each row of time and amount controls.

## What to Observe

- Adjust the **metabolic rate slider** to see how faster elimination (higher μ) causes steeper decay curves and lower trough levels between doses.
- Set a **dose amount to 0mg** to simulate skipping that dose and observe how the curve changes.
- Move **dose times closer together** to see how caffeine accumulates when doses overlap before the previous dose has cleared.
- Compare **morning vs afternoon dosing** by changing dose times - notice how late doses may still have significant levels at typical bedtime hours.
- Watch the **72-hour pattern** to see how the same daily schedule produces consistent peak and trough levels by day 2-3.
- Increase the **daily total** (shown in the status display) by using higher dose amounts and observe higher peak concentrations.

## References

[To be added]
