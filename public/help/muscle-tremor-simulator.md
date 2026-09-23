# Muscle Tremor Simulator

## Overview

The Muscle Tremor Simulator models tremor caused by a delay in the reflex loop that holds your elbow in place. If the elbow drifts from its set position, the sensory signal takes a time τ to turn into a motor signal that pulls the arm back. The model is the delay differential equation

- **L′ = r(20 − L(t − τ))**

where L is the muscle length (cm), 20 cm is the set-point length, r is the reflex magnitude, and τ is the time delay. The rate of change now depends on the length τ milliseconds ago, so the reflex responds to old information and can overshoot, producing oscillations (tremor).

Units: time is in milliseconds and r is per second (s⁻¹), so over one millisecond the length changes by (r/1000)·(20 − L(t − τ)) cm. The muscle length is kept between 10 cm and 30 cm, because muscles cannot get too long or too short.

## Parameters

### Initial length (L₀)
- **Range**: 10 to 30 cm (steps of 0.2 cm)
- **Default**: 25 cm
- The muscle length at t = 0 (and before it: the history the delay looks back to).

### Reflex magnitude (r)
- **Range**: 0 to 100 s⁻¹
- **Default**: 50
- How strongly the reflex corrects a length error. Larger r gives faster corrections, but together with a delay it also makes overshooting more likely.

### Time delay (τ)
- **Range**: 0 to 30 ms (steps of 1 ms)
- **Default**: 10 ms
- The time the reflex loop takes to respond. Longer delays make oscillations more likely.

The simulation reruns automatically whenever you move a slider.

## Components

### Time series graph (left)
- **X-axis**: time, 0 to 2000 ms (2 seconds)
- **Y-axis**: muscle length, 0 to 40 cm
- **Green curve**: muscle length L(t)
- **Red dashed line**: the set point, L = 20 cm
- **Green dot**: the initial length L₀
- **Black (white in dark mode) dot**: the length at the end, t = 2000 ms
- **Red dot**: the delayed length L(t − τ) at the end, i.e. the old value the reflex is reacting to at t = 2000 ms
- **Shaded bands**: lengths outside 10–30 cm, which the muscle cannot reach
- **Thin vertical line**: the current time while the forearm animation plays

### Forearm (top right)
- Shows the muscle length as an elbow angle. At L = 20 cm the forearm is horizontal. Longer muscle (L above 20) angles the forearm **downward**; shorter muscle (L below 20) angles it **upward**.
- **Play** animates the 2-second simulation in real time (1 ms of model time per millisecond). The box next to the buttons shows the animation time.
- **Reset** returns the forearm to its starting position.

### Oscillation Analysis (bottom right)
- Says whether the model gives **no oscillations** (L returns smoothly to 20 cm), **damped oscillations** (they die out), or **sustained oscillations** (they grow until the 10–30 cm limits stop them). This comes from the mathematical theory of this delay equation (it depends on both r and τ), not from eyeballing the graph.
- **Period** and **Frequency** are measured from the simulated curve between 1000 and 2000 ms. If damped oscillations have already died out by then, no frequency is shown.

At the defaults (r = 50, τ = 10 ms) the oscillations are damped: the length overshoots 20 cm a little and settles within about 100 ms.

## What to Observe

1. **Delay causes tremor**: with τ = 0 the length returns smoothly to 20 cm. Increase τ and watch the approach start to overshoot, then oscillate, then oscillate without dying out.
2. **Critical values**: fix r and increase τ (or fix τ and increase r) until the analysis says "Sustained oscillations". Note the frequency just past that point.
3. **Two routes to tremor**: a stronger reflex (larger r) and a slower reflex (larger τ) can both cause sustained tremor. Compare the frequencies you get each way: longer delays give slower tremors.
4. **Frequencies**: the sustained tremors in this simulator are roughly 8–16 Hz, similar to normal physiological tremor (about 8–12 Hz). Pathological tremors are slower (about 3–6 Hz); in this model a slow tremor would need a long delay.
5. **Forearm**: press Play to see what the curve means as movement of the arm.
