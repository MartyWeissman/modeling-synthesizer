# Insulin-Glucose Regulation

## Overview

Models the dynamic interaction between blood glucose and insulin levels using differential equations with time delays. Simulates baseline conditions, daily meals, and glucose challenge tests.

## Parameters

**Glucose Production (m):** Input field adjusts between 0 and 10, step 0.1, default 0.5. Represents the baseline rate of glucose entering the bloodstream. [VERIFY: physiological interpretation]

**Insulin Sensitivity (s):** Input field adjusts between 0 and 10, step 0.1, default 1.0. Represents how effectively insulin removes glucose from the blood. [VERIFY: typical physiological range]

**Insulin Production Rate (q):** Input field adjusts between 0 and 10, step 0.1, default 1.0. Represents the rate at which pancreatic beta cells produce insulin in response to glucose. [VERIFY: physiological interpretation]

**Beta Cell Mass (B):** Input field adjusts between 0 and 10, step 0.1, default 1.0. Represents the functional mass of insulin-producing cells in the pancreas. [VERIFY: physiological interpretation]

**Insulin Degradation Rate (γ):** Input field adjusts between 0 and 10, step 0.1, default 1.0. Represents the rate at which insulin is cleared from the bloodstream. [VERIFY: typical physiological range]

**Liver Production Amplitude (α):** Input field adjusts between 0 and 10, step 0.1, default 0.0. Represents the maximum rate of glucose production by the liver. [VERIFY: physiological interpretation]

**Insulin Sensitivity of Liver (k):** Input field adjusts between 0 and 10, step 0.1, default 1.0. Represents how strongly insulin suppresses liver glucose production. [VERIFY: physiological interpretation]

**Threshold Parameter (c):** Input field adjusts between 0 and 10, step 0.1, default 1.0. Represents the insulin level at which liver glucose production is half-maximally suppressed. [VERIFY: physiological interpretation]

**G → I Delay (τ):** Horizontal slider adjusts between 0 and 60 minutes, default 0. Represents the time delay between glucose changes and the pancreatic insulin response. [VERIFY: physiological significance of delay]

**I → G Delay (σ):** Horizontal slider adjusts between 0 and 60 minutes, default 0. Represents the time delay between insulin changes and liver glucose production response. [VERIFY: physiological significance of delay]

## Components

**Insulin-Glucose Dynamics Graph:** Dual Y-axis graph displaying glucose concentration (mmol/L, left axis, red line) and insulin concentration (pmol/L, right axis, blue line) versus time (hours) over a 20-hour period. Green shaded region shows normal glucose range (3.9-5.5 mmol/L). [VERIFY: normal glucose range]

**Insulin-Glucose Model Display:** Info panel showing the differential equations for the glucose dynamics (G') and insulin dynamics (I') using MathML equation rendering.

**Baseline Button:** Momentary button that runs a baseline simulation with no glucose disturbances.

**Meals Button:** Momentary button that simulates three daily meals at t=6, t=10, and t=16 hours, each causing a 30-minute glucose surge.

**Challenge Button:** Momentary button that simulates a glucose challenge test with a spike at t=5 hours.

## What to Observe

- Adjust **Insulin Sensitivity (s)** to observe how the rate of glucose removal changes. Higher values cause faster glucose decline after meals.
- Adjust **Beta Cell Mass (B)** to observe how the insulin response amplitude changes. Lower values reduce insulin production capacity.
- Set **Liver Production Amplitude (α)** to non-zero values (e.g., 2.0) to observe liver glucose production effects between meals.
- Adjust **G → I Delay (τ)** to observe how delayed pancreatic response affects glucose regulation after the Challenge test.
- Click **Meals** button and observe the glucose and insulin spikes at breakfast (6h), lunch (10h), and dinner (16h).
- Click **Challenge** button to observe the system's response to a sudden glucose load at t=5 hours.
- Adjust **Insulin Degradation Rate (γ)** to observe how insulin clearance affects the duration of insulin elevation.

## References

[To be added]
