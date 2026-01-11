# Higgins-Sel'kov Glycolysis Model

## Overview

This tool simulates the Higgins-Sel'kov model of glycolytic oscillations, a simplified representation of the biochemical pathway that converts glucose to pyruvate. The model captures the essential feedback mechanism that produces sustained oscillations in metabolite concentrations, a phenomenon observed experimentally in yeast and muscle cells.

[VERIFY: Historical context of Higgins-Sel'kov model and experimental observations of glycolytic oscillations]

## The Model

The Higgins-Sel'kov equations describe the dynamics of two metabolites:

- **F (F6P)**: Fructose-6-phosphate concentration
- **A (ADP)**: Adenosine diphosphate concentration

The key feature is the autocatalytic feedback where ADP activates the enzyme phosphofructokinase (PFK), which converts F6P. This creates positive feedback that can destabilize the equilibrium and produce limit cycle oscillations.

## Parameters

### Glucose Input (v): 0-2
Rate at which glucose enters the system and is converted to F6P. Higher values increase substrate availability. Default: 1.0.

### Enzyme Rate (c): 0-5
Rate constant for the PFK-catalyzed reaction. Controls how quickly F6P is converted when activated by ADP. Default: 1.0.

### ADP Utilization (k): 0-2
Rate at which ADP is consumed by downstream reactions. Affects how quickly ADP is removed from the system. Default: 1.0.

### Animation Speed: 0-4x
Controls the simulation speed. Default: 2x.

## Components

### Phase Portrait (Main Graph)
Displays F6P concentration (x-axis) vs ADP concentration (y-axis).

- **Gray arrows**: Vector field showing direction of flow
- **Colored trajectories**: Click anywhere to start a new trajectory
- **Colored dots**: Current position of each active trajectory
- **Orange circle**: Equilibrium point (unstable when oscillations occur)

### Time Series Plot
Shows metabolite concentrations over time in a sliding 20-unit window.

- **Blue line**: F6P concentration
- **Red line**: ADP concentration

### Controls

**Show Nullclines**: Displays the curves where each derivative equals zero.
- Blue curve: F-nullcline (dF/dt = 0)
- Red curve: A-nullcline (dA/dt = 0)
The equilibrium occurs where nullclines intersect.

**Show Period**: Enables period detection using a Poincaré section.
- Purple dashed line: Reference line at equilibrium F value
- Measures time between upward crossings to detect oscillation period

**Reset**: Clears all trajectories and resets time to zero.

### Equations Display
Shows the differential equations with current parameter values.

### Status Display
Shows number of active trajectories, current time, animation state, and detected period when period detection is enabled.

## What to Observe

1. **Limit cycle oscillations**: With default parameters, trajectories spiral outward from the equilibrium and settle onto a closed loop (limit cycle).

2. **Parameter effects on oscillations**: Adjust v, c, and k to find parameter combinations that produce oscillations vs. stable equilibrium.

3. **Nullcline geometry**: Enable nullclines to see how their intersection determines the equilibrium location and stability.

4. **Period measurement**: Enable period detection to quantify the oscillation frequency under different parameter settings.

5. **Phase relationships**: In the time series, observe that F6P and ADP oscillate with a phase difference - one peaks before the other.

6. **Transient dynamics**: Click near the equilibrium to see how trajectories spiral away from an unstable fixed point.

## References

