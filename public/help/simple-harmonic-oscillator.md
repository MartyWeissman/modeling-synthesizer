# Simple Harmonic Oscillator

## Overview

The Simple Harmonic Oscillator (SHO) is the basic model of periodic motion, such as a mass bouncing on a spring. It simulates the change equations

- **X′ = uP**
- **P′ = −kX**

where **X** is the position (displacement from rest) and **P** is the momentum. Unlike the discrete-time approximation (ΔX/Δt = P, ΔP/Δt = −X), which spirals outward, the continuous-time trajectories are closed loops: ellipses around the origin.

## Parameters

### u (Momentum coefficient)
- **Range**: 0.01 to 3
- **Default**: 1.0
- Converts momentum into velocity (X′ = uP). In the spring picture, u plays the role of 1/mass, so the ball is drawn smaller when u is larger.

### k (Spring constant)
- **Range**: 0.01 to 3
- **Default**: 1.0
- Sets the strength of the restoring force (P′ = −kX): a larger k means a stiffer spring.

Type a value and press Enter (or click away), or use the arrows. Changing u or k while trajectories are running changes their motion immediately.

### Animation Speed
- **Range**: 0× to 2× (default 1×)
- Changes only how fast the animation plays, not the model. At 1×, about 1.2 units of model time pass per second. At 0× the animation pauses.

## Components

### Phase Portrait (main graph)
- **X-axis**: Position (X), from −3 to 3
- **Y-axis**: Momentum (P), from −3 to 3
- Gray arrows show the direction of motion at each point.
- **Click anywhere** to start a trajectory from that point. You can start several; each gets its own color. Each trajectory leaves a trail about one full cycle long.
- Trajectories keep moving even if part of their loop lies outside the window.
- The green dot marks the equilibrium point, labeled with its type.

### Time Series (bottom graph)
- Shows X (solid blue) and P (dashed red) against time for the **first** trajectory you started, over the last 20 time units.

### Spring (bottom right)
- A mass on a spring that moves with X of the first trajectory: positive X raises the ball (the spring is compressed), negative X lowers it (the spring is stretched).

### Buttons
- **Show/Hide Nullclines**: draws the X-nullcline (P = 0, blue) and the P-nullcline (X = 0, red).
- **Show/Hide Period**: draws a dashed purple line at X = 0 and measures the period of the first trajectory: the time between two successive crossings of X = 0 going to the right (with P > 0). It needs one full cycle after you turn it on (or change u or k) before it shows a value.
- **Reset**: removes all trajectories and clears the graphs. Parameter values are kept.

The status box shows the elapsed model time and the measured period.

## What to Observe

1. **Closed orbits**: trajectories return exactly to where they started; they never spiral in or out.
2. **Shapes**: with u = k the trajectories are circles. Change u and k and watch how the ellipses stretch horizontally or vertically.
3. **Direction**: trajectories go clockwise. Where P > 0 (top half), X increases.
4. **Period**: use Show Period to measure how long one cycle takes. Try different starting points, then different values of u and k. (In lab SHO3 you use these measurements to find a formula for the period.)
5. **Spring**: the spring is most compressed or stretched when the trajectory is at the right or left end of its ellipse (largest |X|, P = 0), and the ball moves fastest as the trajectory crosses X = 0.
