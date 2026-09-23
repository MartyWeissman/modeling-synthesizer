# Minimal Insulin-Glucose Simulator

## Overview

A first model of how blood glucose (G) and insulin (I) regulate each other, with no liver term and no time delays:

- ΔG/Δt = m − s·I·G
- ΔI/Δt = q·B·G² / (1 + G²) − γ·I

Insulin lowers glucose, and glucose raises insulin production. Parameters are in simplified model units, with time in hours. You can simulate a baseline day, three meals, meals with sugary snacks, or a glucose challenge. The curves are computed with very small time steps, so they follow the change equations accurately.

## Parameters

All five parameters are input fields from 0 to 10 in steps of 0.1.

**Glucose production (m):** default 0.5. The steady rate at which glucose enters the bloodstream (for example from digested food).

**Insulin sensitivity (s):** default 1.0. How strongly insulin makes muscle and fat cells take up glucose. The removal term s·I·G grows with both insulin and glucose.

**Insulin production rate (q):** default 1.0. How much insulin the beta cells release per unit of beta-cell mass when glucose is high.

**Beta cell mass (B):** default 1.0. The total mass of insulin-producing beta cells in the pancreas (called b in the Lab Manual).

**Insulin degradation rate (γ):** default 1.0. The rate at which insulin is cleared from the blood.

## Components

**Graph:** glucose (red solid line, left axis, 0–12 mM) and insulin (blue dashed line, right axis, 0–200 pM) over a 20-hour window. Model values are converted with G × 5 = glucose in mM (mmol/L) and I × 100 = insulin in pM (pmol/L). At the default parameters the system starts at its equilibrium, 5 mM glucose and 50 pM insulin, so both lines are flat. The green band marks the healthy fasting glucose range, about 3.9–5.5 mM. If a curve goes above the top of its axis, a small ▲ marks where it leaves the graph and the legend shows its peak value. The legend moves to the corner that covers the least data.

**Model display:** the two change equations shown above.

**Scenario buttons** (grouped together below the parameters):

- **Baseline:** constant glucose production m.
- **Meals:** three meals at t = 6, 10 and 16 hours. Each adds a glucose pulse lasting 30 minutes. Dashed lines mark the meals.
- **Meals & Snacks:** the same meals plus three sugary snacks, at t = 8 (mid-morning), 13 (mid-afternoon) and 17 hours (an hour after dinner). Each snack pulse is a little higher and lasts a little longer (about 50 minutes) than a meal pulse. Snacks are marked in amber.
- **Challenge:** one large glucose pulse centered at t = 5 hours, like drinking a sugary drink in a glucose tolerance test.

Changing any parameter re-runs the scenario that is currently shown.

## What to Observe

- At the defaults, read off the equilibrium glucose and insulin levels (with units).
- Double **m** from 0.5 to 1 and compare the new equilibrium levels with the old ones.
- With m = 1, find the beta cell mass **B** that brings glucose back to 5 mM. What happens to insulin?
- Insulin resistance: try B = 1.5 and lower **s** to 0.2.
- Click **Meals**, then **Meals & Snacks**: the snacks keep glucose from returning to baseline between meals.
- Click **Challenge** to see how the system returns to equilibrium after a large glucose load.

## References

- Uri Alon, *Systems Medicine: Physiological Circuits and the Dynamics of Disease*, Chapter 1. The minimal insulin-glucose model is drawn from this chapter.
