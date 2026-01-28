# Atmospheric Molecule Simulator

## Overview

This tool simulates gas molecules undergoing random thermal motion in a gravitational field. Each timestep, particles move according to a random walk with a gravitational bias pulling them downward and thermal energy causing random displacement scaled by temperature. Particles bounce elastically off the ground. The simulation demonstrates how temperature and gravity interact to create an exponential atmospheric density profile.  Realistic units of height are not provided. 

## Parameters

**Gravity:** Slider adjusts between -50 and -1 m/s², default -10 m/s². Controls the downward pull on molecules. The gravitational contribution to each step is `gravity / 200`. Stronger gravity (more negative) compresses molecules closer to the ground.

**Temperature:** Slider adjusts between 100K and 500K, default 300K (~80°F). Controls the intensity of random thermal motion. The thermal contribution scales as `√(temperature / 300)` times a normally-distributed random value. Higher temperatures cause molecules to spread higher into the atmosphere.

## Components

**Atmosphere Window:** A 6x5 display showing 200 red/orange particles moving against a gradient sky background with faint clouds. The sky gradient transitions from deeper color at the top to lighter near the horizon. A green ground strip appears at the bottom. Particles undergo continuous random motion affected by gravity and temperature, bouncing elastically when they reach the ground.

**Density Histogram:** A 2x5 display showing the distribution of particle heights across 16 bins. Horizontal bars extend rightward proportional to the fraction of particles in each height range, scaled so that all 200 particles in one bin would equal full width. An amber/orange line overlays the histogram showing the theoretical expected distribution based on current gravity and temperature settings. 

**Simulate/Stop Button:** Toggles the simulation on and off. Shows "Simulate" when paused, "Stop" when running.

**Reset Button:** Stops the simulation and resets all particles to near the ground (height ~7.5 with small random offset).

**Statistics Display:** Shows real-time statistics:
- Particles: Total count (200)
- Mean height: Average height of all particles
- Std dev: Standard deviation of particle heights  
- Running status: "Running..." or "Paused"

## What to Observe

- Click **Simulate** and observe particles spreading upward from their initial positions near the ground, eventually reaching an equilibrium distribution.

- Watch the **histogram bars** converge toward the **amber expected distribution line** as the simulation runs—this demonstrates the system reaching its theoretical steady state.

- Increase **Temperature** to 500K and observe particles spreading more uniformly throughout the atmosphere as thermal energy overcomes gravity. The expected distribution line will flatten.

- Decrease **Temperature** to 100K and observe particles clustering more tightly near the ground. The expected distribution line will become steeper.

- Increase **Gravity** toward -50 m/s² and observe a more compressed atmosphere with particles concentrated near the ground.

- Decrease **Gravity** toward -1 m/s² and observe particles spreading much higher, with a more gradual density falloff.

- Watch the **Mean height** and **Std dev** statistics change as you adjust parameters—higher temperature or weaker gravity leads to higher mean height and larger standard deviation.

- Click **Reset** to restart with particles near the ground, then observe how quickly equilibrium is reached under different parameter settings.

## References

[To be added]
