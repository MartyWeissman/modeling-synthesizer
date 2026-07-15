# Minimal Insulin-Glucose Simulator

## Overview

A stripped-down model of the dynamic interaction between blood glucose and insulin, intended as a first introduction to the system. Uses difference equations (ΔG/Δt and ΔI/Δt) with no liver-production term and no time delays. Simulates baseline conditions, daily meals, meals with sugary snacks, and a glucose challenge test.

## Parameters

**Glucose Production (m):** Input field adjusts between 0 and 10, step 0.1, default 0.5. Represents the baseline rate of glucose entering the bloodstream. [VERIFY: physiological interpretation]

**Insulin Sensitivity (s):** Input field adjusts between 0 and 10, step 0.1, default 1.0. Represents how effectively insulin removes glucose from the blood. [VERIFY: typical physiological range]

**Insulin Production Rate (q):** Input field adjusts between 0 and 10, step 0.1, default 1.0. Represents the rate at which pancreatic beta cells produce insulin in response to glucose. [VERIFY: physiological interpretation]

**Beta Cell Mass (B):** Input field adjusts between 0 and 10, step 0.1, default 1.0. Represents the functional mass of insulin-producing cells in the pancreas. [VERIFY: physiological interpretation]

**Insulin Degradation Rate (γ):** Input field adjusts between 0 and 10, step 0.1, default 1.0. Represents the rate at which insulin is cleared from the bloodstream. [VERIFY: typical physiological range]

## Components

**Insulin-Glucose Dynamics Graph:** Dual Y-axis graph displaying glucose concentration (mmol/L, left axis 0–12, red line) and insulin concentration (pmol/L, right axis 0–200, blue line) versus time (hours) over a 20-hour period. A green shaded region shows the normal glucose range (3.9–5.5 mmol/L). [VERIFY: normal glucose range]

**Insulin-Glucose Model Display:** Info panel showing the difference equations for the glucose dynamics (ΔG/Δt) and insulin dynamics (ΔI/Δt) using MathML equation rendering.

**Baseline Button:** Momentary button that runs a baseline simulation with no glucose disturbances.

**Meals Button:** Momentary button that simulates three daily meals at t=6, t=10, and t=16 hours, each causing a roughly 30-minute glucose surge.

**Meals & Snacks Button:** Momentary button that runs the same three meals and adds three sugary snacks between them — mid-morning (t=8), mid-afternoon (t=13), and an hour after dinner (t=17). The snacks are stronger and slightly longer than meals, keeping glucose elevated between meals. Snack times are marked in amber on the graph. [VERIFY: physiological interpretation]

**Challenge Button:** Momentary button that simulates a glucose challenge test with a spike at t=5 hours.

## What to Observe

- Adjust **Insulin Sensitivity (s)** to observe how the rate of glucose removal changes. Higher values cause faster glucose decline after meals.
- Adjust **Beta Cell Mass (B)** to observe how the insulin response amplitude changes. Lower values reduce insulin production capacity.
- Adjust **Insulin Production Rate (q)** to observe how strongly insulin rises in response to elevated glucose.
- Adjust **Insulin Degradation Rate (γ)** to observe how insulin clearance affects the duration of insulin elevation.
- Adjust **Glucose Production (m)** to observe how the baseline glucose level shifts.
- Click **Meals** and observe the glucose and insulin spikes at breakfast (6h), lunch (10h), and dinner (16h).
- Click **Meals & Snacks** and compare with **Meals**: notice how the between-meal snacks keep glucose from returning to baseline.
- Click **Challenge** to observe the system's response to a sudden glucose load at t=5 hours.

## References

- Uri Alon, *Systems Medicine: Physiological Circuits and the Dynamics of Disease*, Chapter 1. The minimal insulin-glucose model is drawn from this chapter.
