# Brownian Motion Simulator

## Overview

This tool simulates Brownian motion—the random movement of a microscopic particle suspended in a fluid due to collisions with surrounding molecules. The simulation uses the Stokes–Einstein diffusion coefficient to model how particle size, fluid viscosity, and temperature affect the random walk behavior.

## Parameters

**Particle Radius (r):** Slider adjusts between 0.10 and 2.00 μm in steps of 0.01 μm, default 0.50 μm. The radius of the diffusing particle. Smaller particles experience larger displacements due to reduced drag.

**Viscosity (η):** Slider adjusts between 0.20 and 5.00 cP (centipoise) in steps of 0.01 cP, default 1.00 cP. The viscosity of the surrounding fluid. Water at 20 °C has a viscosity of about 1 cP (1 cP = 10⁻³ Pa·s).

**Temperature (T):** Slider adjusts between 0 and 80 °C in steps of 1 °C, default 25 °C. Higher temperatures increase thermal energy, resulting in larger random displacements. (The formulas use the absolute temperature in kelvin, T + 273.15.)

The sliders are locked while a run is in progress, so each trajectory has a single set of parameters. Change them before clicking **Diffuse!**.

## Components

**Circular Viewport:** A 6×6 circular window displaying the particle's position and trajectory, centered at the origin. Normally it shows about 15 μm from the center to the edge, with grid lines every 5 μm and a scale arrow labeled "5 μm". If the particle (or the expectation circle) would leave the window, the view zooms out by a factor of 2 (grid and scale arrow 10 μm, then 20 μm, ...); the scale arrow always shows the current grid spacing. The particle is rendered as a sphere-shaded orange circle, and its trajectory is shown as a gray trail.

**Position Display:** Shows the current simulation time (t), particle position (x, y) in microns, squared displacement (d² = x² + y²) in μm², and the diffusion coefficient D = k_BT/(6πηr) in μm²/s for the current settings.

**Data Table:** Records displacement data at integer second intervals from t = 0 to t = 10 seconds. Columns show time t (s), x-displacement (μm), y-displacement (μm), and squared displacement d² (μm²). The table data can be selected and copied (Cmd+C / Ctrl+C) for pasting into spreadsheet software.

**Equation Display:** Shows Einstein's formula for the expected squared displacement in two dimensions: E(d²) = (2 k_B T)/(3πrη) · t, where k_B is Boltzmann's constant. This is the same as E(d²) = 4Dt, with the Stokes–Einstein diffusion coefficient D = k_BT/(6πηr).

**Diffuse!/Stop! Button:** Starts a new simulation run (resetting position to origin) or stops a running simulation. The simulation runs for 10 seconds of simulated time, in steps of 0.05 s; in each step, x and y each change by an independent normal random amount with standard deviation √(2DΔt), Δt = 0.05 s. The 10 simulated seconds play in about 3.3 seconds of real time.

**Reset Button:** Stops the simulation and clears the trajectory and data table.

**Show/Hide Expectation Button:** Toggle button that displays or hides a green circle on the viewport. When shown, this circle represents the root-mean-square displacement √(E(d²)) predicted by the Einstein-Stokes equation for the current time and parameters. It uses the parameters of the current (or most recent) run. Note: this is the square root of the expected squared displacement, not the expected displacement itself—a subtle but important distinction since E(d) ≠ √(E(d²)) for random walks.

## What to Observe

- Click **Diffuse!** to start a simulation and watch the particle undergo a random walk from the origin. The trajectory builds up over 10 seconds.

- Adjust **Particle Radius (r)** to smaller values and observe larger, more erratic displacements. Larger particles move more slowly due to increased drag.

- Increase **Temperature (T)** and notice that the particle moves more vigorously due to increased thermal energy.

- Increase **Viscosity (η)** to simulate a thicker fluid (like honey vs water) and observe reduced particle mobility.

- Toggle **Show Expectation** to display the theoretical root-mean-square displacement circle. Compare where the particle actually ends up versus the expected distance from the origin.

- Run multiple simulations with the same parameters to see the stochastic variation—sometimes the particle ends up inside the expectation circle, sometimes outside.

- Copy the data table values into a spreadsheet to analyze d² vs t. Einstein's formula predicts that E(d²) grows linearly with time, with slope 2k_BT/(3πrη) = 4D. With multiple experiments, average d² at each time and fit a line: the slope estimates 4D, where D = k_BT/(6πηr) is the diffusion coefficient. Since you know T, r, and η, you can then estimate Boltzmann's constant k_B. This mirrors the experiment of Perrin, who used this method to estimate Avogadro's number. (The factor is 4D because the motion is in two dimensions: each of x² and y² contributes 2Dt.)
