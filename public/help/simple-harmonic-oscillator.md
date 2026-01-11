# Simple Harmonic Oscillator

## Overview

The Simple Harmonic Oscillator is a fundamental model in physics describing periodic motion, such as a mass attached to a spring. [VERIFY: This model appears in classical mechanics and serves as a foundation for understanding oscillatory systems in biology, including molecular vibrations and membrane potential oscillations.]

The system is governed by Hamiltonian mechanics where:
- **X** represents position (displacement from equilibrium)
- **P** represents momentum

The phase portrait shows circular or elliptical trajectories, indicating conservation of energy in the system.

## Parameters

### u (Momentum Coefficient)
- **Range**: 0.1 to 2.0
- **Default**: 1.0
- Controls how momentum affects the rate of change of position
- Higher values create wider ellipses in the phase portrait

### k (Spring Constant)
- **Range**: 0.1 to 2.0
- **Default**: 1.0
- Controls the restoring force strength
- Higher values create taller ellipses in the phase portrait
- [VERIFY: In physical systems, k represents the stiffness of the spring in N/m]

### Animation Speed
- Controls the rate of trajectory animation
- Does not affect the underlying physics, only visualization speed

## Components

### Phase Portrait (Main Graph)
- **X-axis**: Position (X) ranging from -2 to 2
- **Y-axis**: Momentum (P) ranging from -2 to 2
- Click anywhere to start a new trajectory from that point
- Trajectories are color-coded for distinction
- Shows the characteristic elliptical orbits of harmonic motion

### Spring Visualization (3D View)
- Animated spring-mass system in the right panel
- Spring stretches and compresses as the mass oscillates
- Position corresponds to the X coordinate in the phase portrait
- Provides physical intuition for the abstract phase space

### Period Display
- Shows the calculated period of oscillation
- Period depends on the ratio of parameters u and k
- [VERIFY: For a standard SHO, period T = 2π√(m/k)]

### Control Buttons
- **Start/Pause**: Toggle animation on/off
- **Clear**: Remove all trajectories and reset
- **Reset**: Return to default parameter values

## What to Observe

1. **Conservation of Energy**: Trajectories form closed loops, never spiraling in or out, indicating energy conservation in this frictionless system.

2. **Effect of Parameters**: 
   - Increasing u stretches trajectories horizontally (more momentum range)
   - Increasing k stretches trajectories vertically (more position range)
   - When u = k, trajectories are perfect circles

3. **Period Independence**: The period of oscillation is the same regardless of the amplitude (initial distance from origin) - a key property of simple harmonic motion.

4. **Phase Space Interpretation**: Points moving clockwise around the origin represent the mass moving right (positive P) then slowing, reversing, moving left, and repeating.

5. **Spring Animation Correlation**: Watch how the spring visualization corresponds to movement along the trajectory - maximum compression/extension at the top/bottom of the ellipse.

## References

