# FitzHugh-Nagumo Neuron Model

## Overview

The FitzHugh-Nagumo model is a simplified, two-variable model of a neuron's electrical activity. Richard FitzHugh introduced it in 1961 as a simplification of the four-variable Hodgkin-Huxley model (1952), and Jin-ichi Nagumo and colleagues built an equivalent electronic circuit in 1962. The change equations are

- **X′ = X − X³/3 − Y + z**
- **Y′ = u(X + a − bY)**

- **X** stands for the membrane potential (a fast variable).
- **Y** stands for the state of the "recovery" ion channels (a slow variable).

When a = 0, b = 0 and z = 0, this is the **van der Pol oscillator**. Depending on the parameters, the model shows a resting state, excitability (a spike in response to a large enough kick), repeated spiking (a limit cycle), or two stable resting states.

## Parameters

Type a value and press Enter (or click away), or use the arrows. Trajectories that are already running continue with the new values.

### u (time-scale separation)
- **Range**: 0.01 to 1, **default** 0.1
- How fast Y changes compared with X. Small u means Y is slow, so spikes have fast jumps and slow drifts (relaxation oscillations). u does not change the nullclines.

### a
- **Range**: −2 to 2, **default** 0.7
- Shifts the Y-nullcline (the red line X + a − bY = 0) left or right: it crosses Y = 0 at X = −a.

### b
- **Range**: 0 to 2, **default** 0.8
- Sets the slope of the Y-nullcline, Y = (X + a)/b (slope 1/b). When b = 0 the line is vertical (X = −a).

### z (external input current)
- **Range**: −1 to 1, **default** 0
- Stimulation applied to the neuron. It shifts the X-nullcline (the blue cubic) up or down.

### Animation Speed
- **Range**: 0× to 4×, **default** 2×
- Changes only how fast the animation plays (at 1×, about 3 units of model time per second), not the accuracy of the calculation. At 0× the animation pauses.

## Components

### Phase portrait (main graph)
- **X-axis**: membrane potential X, from −3 to 3. **Y-axis**: recovery variable Y, from −3 to 3.
- Gray arrows show the direction of motion at each point.
- **Click anywhere** to start a trajectory there. Each trajectory has its own color and leaves a trail about one spike cycle long. Trajectories keep moving even when they leave the window.
- **Equilibrium points** are drawn where the nullclines cross, colored by type: green = stable, red = unstable, orange = saddle.

### Time series (bottom graph)
- X (solid blue) and Y (dashed red) against time for the **first** trajectory you started, over the last 20 time units.

### Buttons
- **Default**: sets u = 0.1, a = 0.7, b = 0.8, z = 0 and removes all trajectories.
- **van der Pol**: sets u = 0.1, a = 0, b = 0, z = 0 and removes all trajectories.
- **Show/Hide Nullclines**: the X-nullcline (blue cubic, Y = X − X³/3 + z) and the Y-nullcline (red line, X + a − bY = 0).
- **Reset**: removes all trajectories and clears the graphs; parameters are kept.

### Equilibrium box
- Lists each equilibrium in the window with its type (stable/unstable node or spiral, saddle, ...), found from the Jacobian matrix. For this model, trace = 1 − X*² − ub and determinant = u(1 − b(1 − X*²)).

### Status box
- Number of trajectories, the model time, whether the animation is running, and the current X and Y of the first trajectory.

## What to Observe

1. **Excitability**: at the default parameters the single equilibrium is stable. Start near it and the trajectory returns directly; start farther to the right and it makes a full spike (a big loop) before returning.
2. **Repeated spiking**: raise z to about 0.4. The equilibrium becomes unstable and trajectories settle onto a limit cycle: the neuron fires again and again.
3. **Nullclines**: turn them on to see how a and b move the red line, and how z moves the cubic.
4. **Spike shape**: compare the time series for small u (for example 0.05) and larger u (for example 0.5).
5. **van der Pol oscillator**: with a = b = z = 0 the only equilibrium (the origin) is unstable and every other trajectory approaches the same limit cycle. From there, change a or b and watch when the limit cycle disappears.
6. **Two resting states (bistability)**: with u = 0.1, a = 0, b = 2, z = 0 there are three equilibria: two stable spirals at about (1.22, 0.61) and (−1.22, −0.61), and a saddle at the origin. Trajectories starting on different sides end at different equilibria.
7. **Phase and time**: fast horizontal motion in the phase portrait shows up as steep jumps in X(t).
