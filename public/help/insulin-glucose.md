# Insulin-Glucose Regulation

## Overview

Models how blood glucose (G) and insulin (I) regulate each other, including glucose release by the liver and two time delays. It extends the minimal model from Lab 1:

- G′ = m + α / (1 + e^(k·I(t − σ) − c)) − s·I·G
- I′ = q·B·G(t − τ)² / (1 + G(t − τ)²) − γ·I

Here G(t − τ) means the glucose level τ minutes earlier, and I(t − σ) the insulin level σ minutes earlier. Parameters are in simplified model units, with time in hours. You can simulate a baseline day, three meals, or a glucose challenge.

## Parameters

All eight parameters are input fields from 0 to 10 in steps of 0.1.

**Glucose production (m):** default 0.5. The steady rate at which glucose enters the bloodstream (for example from digested food).

**Insulin sensitivity (s):** default 1.0. How strongly insulin makes muscle and fat cells take up glucose. The removal term s·I·G grows with both insulin and glucose.

**Insulin production rate (q):** default 1.0. How much insulin the beta cells release per unit of beta-cell mass when glucose is high.

**Beta cell mass (B):** default 1.0. The total mass of insulin-producing beta cells in the pancreas (called b in the Lab Manual).

**Insulin degradation rate (γ):** default 1.0. The rate at which insulin is cleared from the blood.

**Liver production amplitude (α):** default 0.0. The largest rate at which the liver releases glucose. When insulin is low, the alpha cells release glucagon, which tells the liver to release glucose. With α = 0 the liver term is switched off and the model is the minimal model.

**Insulin sensitivity of liver (k):** default 1.0. How sharply the liver's glucose release shuts off as insulin rises. Larger k gives a steeper switch.

**Threshold parameter (c):** default 1.0. Together with k, it sets where the switch happens: liver production is half of its maximum α/2 when k·I = c, that is at I = c/k (in model units; on the graph that is 100·c/k pM).

**G → I delay (τ):** slider from 0 to 60 minutes, default 0. The time it takes for a change in glucose to change insulin production.

**I → G delay (σ):** slider from 0 to 60 minutes, default 0. The time it takes for a change in insulin to change the liver's glucose release. σ acts only through the liver term, so it has **no effect when α = 0**. The slider is dimmed and labeled "no effect: α = 0" until you set α above 0.

The simulator works in 6-minute time steps, so each delay is rounded to the nearest 6 minutes.

## Components

**Graph:** glucose (red solid line, left axis, 0–12 mM) and insulin (blue dashed line, right axis, 0–200 pM) over a 20-hour window. Model values are converted with G × 5 = glucose in mM (mmol/L) and I × 100 = insulin in pM (pmol/L). At the default parameters the system starts at its steady state, 5 mM glucose and 50 pM insulin, so both lines are flat. The green band marks the healthy fasting glucose range, about 3.9–5.5 mM. If a curve goes above the top of its axis, a small ▲ marks where it leaves the graph and the legend shows its peak value. The legend moves to the corner that covers the least data.

**Model display:** the two change equations shown above.

**Baseline:** runs the model with constant glucose production m.

**Meals:** adds three meals at t = 6, 10 and 16 hours. Each adds a glucose pulse lasting 30 minutes. Dashed lines mark the meals.

**Challenge:** adds one large glucose pulse centered at t = 5 hours, like drinking a sugary drink in a glucose tolerance test. A dashed line marks it.

Changing any parameter re-runs the scenario that is currently shown.

## What to Observe

- Start from the Lab Manual values m = 2, s = 7, q = 3, B = 2, γ = 5, α = 1, k = 2, c = 2. Then change m (for example m = 0 for sleeping, m = 3 for high intake) and α, and watch whether glucose stays in the green band.
- Click **Challenge** and increase the G → I delay τ. How do glucose and insulin return to equilibrium? How does the timing of any oscillation depend on τ?
- Compare τ with σ (set α > 0 first). Which delay matters more for producing oscillations?
- Click **Meals** and watch glucose and insulin rise after each meal and fall back.
- Lower **s** (insulin resistance) or **B** and see how high glucose climbs.

## References

- J. Sturis, K. S. Polonsky, E. Mosekilde, E. Van Cauter, "Computer model for mechanisms underlying ultradian oscillations of insulin and glucose," *American Journal of Physiology – Endocrinology and Metabolism* 260 (1991), E801–E809. (Used in the Lab Manual's ultradian-oscillation exercise.)
