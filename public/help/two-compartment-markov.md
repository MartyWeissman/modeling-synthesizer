# Two Compartment Markov Model

## Overview

Simulates stochastic transitions of particles between two compartments using a discrete-time Markov process. Particles move with Brownian-like motion within their compartment and transition through flared tunnels along cubic Bézier curves, with transition probabilities set by the user. [VERIFY: appropriate as a model for membrane transport, pharmacokinetic compartment models, or other two-state systems]

## Parameters

**Compartment A Name:** Text input (max 8 characters), default "A". Sets the display name for compartment A, shown on the visualization and status legend.

**Compartment B Name:** Text input (max 8 characters), default "B". Sets the display name for compartment B, shown on the visualization and status legend.

**Population A (N_A):** Numeric input adjusts between 0 and 200, default 50. Sets the initial number of particles in compartment A when the simulation starts.

**Population B (N_B):** Numeric input adjusts between 0 and 200, default 50. Sets the initial number of particles in compartment B when the simulation starts.

**P(A→B):** Slider adjusts between 0.0% and 10.0%, default 5.0%. The probability per time step that a particle in compartment A will transition to compartment B. Can be adjusted during a running simulation.

**P(B→A):** Slider adjusts between 0.0% and 10.0%, default 5.0%. The probability per time step that a particle in compartment B will transition to compartment A. Can be adjusted during a running simulation.

## Components

**Compartment Visualization:** A large canvas (7x4 grid cells) displaying two rounded-rectangle compartments (A in pink/red, B in blue) connected by two flared gradient tunnels. The upper tunnel carries A→B transitions and the lower tunnel carries B→A transitions. Each tunnel shows a directional arrow and its current transition probability. Particles appear as small colored dots: red in compartment A, blue in compartment B, and gold while transitioning through a tunnel. Live population counts are displayed above each compartment.

**Time Series Graph:** Displays population vs time (steps) over a rolling window of 100 data points. The red curve tracks compartment A population and the blue curve tracks compartment B population. Updates in real time as the simulation runs.

**Start Button:** Starts a new simulation with the current population and probability settings. If the simulation is paused, resumes from where it left off.

**Pause Button:** Freezes the simulation in place, stopping all particle motion and time series updates. The visualization remains visible for static inspection. Press Start to resume.

**Reset Button:** Stops the simulation entirely, clears all particles from the visualization, clears the time series graph, and restores the display to its initial state.

**Status Display:** Shows the current simulation state (Running, Paused, or Stopped), the current step count, and a color-coded legend showing each compartment's name and current population count.

## What to Observe

- Press Start with default settings (50/50 population, 5%/5% probabilities) and observe the populations fluctuating around their initial values in the time series graph — this demonstrates stochastic equilibrium with equal transition rates.
- Set P(A→B) to 10% and P(B→A) to 2%, then press Start to observe particles gradually accumulating in compartment B as the asymmetric rates drive the system toward a new steady state.
- Set one compartment population to 0 and the other to 200, then Start to watch the system approach equilibrium from an extreme initial condition.
- Use the Pause button to freeze the simulation and inspect the current particle positions and population counts, then press Start to resume.
- Adjust the probability sliders while the simulation is running to observe how the system responds in real time to changing transition rates.
- Change compartment names (e.g., "Cell" and "Blood") to label the model for a specific biological context. [VERIFY: naming suggestions appropriate for educational use]

## References

[To be added]
