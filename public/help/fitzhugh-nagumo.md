# FitzHugh-Nagumo Neuron Model

## Overview

The FitzHugh-Nagumo model is a simplified two-dimensional representation of neuronal excitability. [VERIFY: It was developed by Richard FitzHugh in 1961 as a reduction of the four-dimensional Hodgkin-Huxley model, and independently by Jin-ichi Nagumo as an electronic circuit.]

The model captures the essential dynamics of action potential generation:
- **X (Membrane Potential)**: Represents the fast voltage-like variable
- **Y (Recovery Variable)**: Represents a slow recovery process (like potassium channel activation)

The system exhibits excitability, limit cycles, and bistability depending on parameter values, making it a fundamental model for understanding neural dynamics.

## Parameters

### u (Time-scale Separation)
- **Range**: 0.01 to 1.0
- **Default**: 0.1
- Controls the speed of the recovery variable relative to membrane potential
- Small u means Y changes slowly compared to X, creating relaxation oscillations
- [VERIFY: Typical biological values correspond to the ratio of membrane and ionic time constants]

### a (X-axis Shift)
- **Range**: -2.0 to 2.0
- **Default**: 0.7
- Shifts the Y-nullcline horizontally
- Affects the location and number of equilibrium points
- Controls excitability threshold

### b (Y Feedback Coefficient)
- **Range**: 0.0 to 2.0
- **Default**: 0.8
- Determines the slope of the Y-nullcline
- Affects stability of equilibrium points
- When b = 0, the Y-nullcline becomes vertical

### z (External Input Current)
- **Range**: -1.0 to 1.0
- **Default**: 0.0
- Represents external stimulation applied to the neuron
- Shifts the X-nullcline vertically
- Can push the system from excitable to oscillatory regime

### Animation Speed
- **Range**: 0 to 4x
- **Default**: 2x
- Controls the rate of trajectory animation

## Components

### Phase Portrait (Main Graph)
- **X-axis**: Membrane Potential (X) from -3 to 3
- **Y-axis**: Recovery Variable (Y) from -3 to 3
- **Vector field**: Gray arrows showing flow direction at each point
- **Nullclines** (toggle): Blue cubic curve (X-nullcline), Red line (Y-nullcline)
- **Equilibrium points**: Orange dots with white centers where nullclines intersect
- **Trajectories**: Colored curves showing system evolution from click points
- Click anywhere in the plot area to start a new trajectory

### Time Series Plot (Bottom)
- Shows X (blue) and Y (red) as functions of time
- Scrolling 20-unit time window
- Displays oscillatory behavior, action potentials, or convergence to equilibrium

### Preset Buttons
- **Default**: Standard FitzHugh-Nagumo parameters (u=0.1, a=0.7, b=0.8, z=0)
- **van der Pol**: Sets a=0, b=0 to obtain the van der Pol oscillator (a related relaxation oscillator)

### Nullclines Toggle
- Shows/hides the nullclines (curves where X'=0 and Y'=0)
- Blue: X-nullcline (cubic curve Y = X - X³/3 + z)
- Red: Y-nullcline (line X + a - bY = 0)
- Equilibria occur where these curves intersect

### Status Display
- Active trajectory count
- Current simulation time
- Current X and Y values for the most recent trajectory
- Legend for time series colors

## What to Observe

1. **Excitability**: With default parameters, the equilibrium is stable. Click near it - small perturbations return to rest, but larger perturbations trigger a full "action potential" excursion before returning.

2. **Limit Cycles**: Increase z (external current) to around 0.4. The equilibrium becomes unstable and the system oscillates indefinitely - this represents repetitive firing.

3. **Nullcline Geometry**: Enable nullclines to see why the system behaves as it does. The cubic X-nullcline creates the characteristic "all-or-none" response of neurons.

4. **Relaxation Oscillations**: With small u (0.05-0.1), oscillations have distinct fast and slow phases - rapid jumps along the X direction, slow drift along the Y direction.

5. **van der Pol Preset**: With a=0 and b=0, the model reduces to the van der Pol oscillator. All trajectories are drawn toward a single stable limit cycle regardless of starting point.

6. **Bistability**: For certain parameter combinations, multiple stable states can coexist. Explore by adjusting a and b while watching the equilibrium count.

7. **Phase-Time Correspondence**: Compare the phase portrait motion with the time series. Fast horizontal motion in phase space corresponds to rapid spikes in X(t).

## References

