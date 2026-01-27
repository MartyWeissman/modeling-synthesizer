# Brownian Motion Simulator

## Overview

This tool simulates Brownian motion—the random movement of a microscopic particle suspended in a fluid due to collisions with surrounding molecules. The simulation uses the Einstein-Stokes diffusion equation to model how particle size, fluid viscosity, and temperature affect the random walk behavior.

## Parameters

**Particle Radius (r):** Slider adjusts between 0.1 and 2.0 μm, default 0.5 μm. The radius of the diffusing particle. Smaller particles experience larger displacements due to reduced drag.

**Viscosity (η):** Slider adjusts between 0.2 and 5.0 cP (centiPoise), default 1.0 cP. The viscosity of the surrounding fluid. Water at room temperature has a viscosity of approximately 1 cP. 

**Temperature (T):** Slider adjusts between 0 and 80 °C, default 25 °C. Higher temperatures increase thermal energy, resulting in larger random displacements.

## Components

**Circular Viewport:** A 6×6 circular window displaying the particle's position and trajectory. The viewport shows a 30 μm × 30 μm area centered at the origin. Grid lines are spaced at 5 μm intervals. A scale arrow labeled "5 μm" indicates the scale. The particle is rendered as a sphere-shaded orange circle, and its trajectory is shown as a gray trail.

**Position Display:** Shows the current simulation time (t), particle position (x, y) in microns, and squared displacement (d² = x² + y²) in μm².

**Data Table:** Records displacement data at integer second intervals from t = 0 to t = 10 seconds. Columns show time t (s), x-displacement (μm), y-displacement (μm), and squared displacement d² (μm²). The table data can be selected and copied (Cmd+C / Ctrl+C) for pasting into spreadsheet software.

**Equation Display:** Shows the Einstein-Stokes formula for expected squared displacement: E(d²) = (k_B T)/(3πrη) · t, where k_B is Boltzmann's constant.

**Diffuse!/Stop! Button:** Starts a new simulation run (resetting position to origin) or stops a running simulation. The simulation runs for 10 seconds of simulated time.

**Reset Button:** Stops the simulation and clears the trajectory and data table.

**Show/Hide Expectation Button:** Toggle button that displays or hides a green circle on the viewport. When shown, this circle represents the root-mean-square displacement √(E(d²)) predicted by the Einstein-Stokes equation for the current time and parameters. Note: this is the square root of the expected squared displacement, not the expected displacement itself—a subtle but important distinction since E(d) ≠ √(E(d²)) for random walks.

## What to Observe

- Click **Diffuse!** to start a simulation and watch the particle undergo a random walk from the origin. The trajectory builds up over 10 seconds.

- Adjust **Particle Radius (r)** to smaller values and observe larger, more erratic displacements. Larger particles move more slowly due to increased drag.

- Increase **Temperature (T)** and notice that the particle moves more vigorously due to increased thermal energy.

- Increase **Viscosity (η)** to simulate a thicker fluid (like honey vs water) and observe reduced particle mobility.

- Toggle **Show Expectation** to display the theoretical root-mean-square displacement circle. Compare where the particle actually ends up versus the expected distance from the origin.

- Run multiple simulations with the same parameters to see the stochastic variation—sometimes the particle ends up inside the expectation circle, sometimes outside.

- Copy the data table values into a spreadsheet to analyze d² vs t. The Einstein-Stokes equation predicts that E(d²) grows linearly with time.  With multiple experiments, you can estimate the slope of the line to determine the diffusion coefficient D = kT/6πη, and use this to estimate Boltzmann's constant k_B.  This mirrors the experiment of Perrin, who used this method to estimate Avogadro's number.

## References

[To be added]
