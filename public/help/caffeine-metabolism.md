# Caffeine Metabolism Simulator

## Overview

This tool models the amount of caffeine in the body over 72 hours (3 days). You choose up to three daily doses; the same schedule repeats every day. The body removes caffeine at a rate proportional to the amount present (first-order elimination, the standard simple model for caffeine), so the change equation is

C′ = Intake − μC,

where C is the amount of caffeine (mg) and μ is the metabolic rate (per hour). Each dose is taken all at once, and then decays exponentially: a dose D taken at time t₀ contributes D·e^(−μ(t − t₀)).

## Parameters

**Dose 1, 2, 3 time:** Time pickers, in 15-minute steps. Defaults: 7:00 AM, 12:00 PM and 4:00 PM.

**Dose 1, 2, 3 amount:** Staircase selectors with levels 0, 40, 80, 120, 160 and 200 mg. Defaults: 120 mg, 80 mg and 40 mg. (A cup of brewed coffee has roughly 80–100 mg of caffeine.)

**Metabolic rate (μ):** Slider from 0.01 to 0.50 per hour, default 0.20. The label also shows the half-life t½ = ln 2 / μ, the time for the amount of caffeine to fall by half. The default μ = 0.20 gives t½ ≈ 3.5 hours. In healthy adults the half-life is typically about 3–7 hours, around 5 hours on average (μ ≈ 0.1–0.23); it is longer during pregnancy and with some medications, and shorter in smokers.

## Components

**Caffeine graph:** The amount of caffeine in the body (mg) versus time (hours, 0–72; midnight of day 1 is t = 0). The curve jumps up at each dose and decays exponentially in between. The vertical axis runs from 0 to 320 mg and extends automatically when the curve goes higher.

**Daily caffeine display:** The total caffeine taken each day (the sum of the three doses).

**Equation display:** The change equation C′ = Intake − μC.

**Dose labels:** "Dose 1", "Dose 2" and "Dose 3" label each row of controls.

## What to Observe

- Move the **metabolic rate** slider: a larger μ (shorter half-life) gives steeper decay and lower levels between doses.
- Set a dose to **0 mg** to skip it.
- Move **dose times closer together** to see caffeine build up when a new dose arrives before the last one has cleared.
- Move a dose later in the day and look at how much caffeine is left at bedtime.
- Compare the three days. With a short half-life each day looks the same; with a long half-life (small μ) caffeine carries over from one day to the next and the levels creep upward.
