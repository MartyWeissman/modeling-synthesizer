# Atmospheric Molecule Simulator

## Overview

This tool follows 200 gas molecules in a gravitational field. Each time step, every molecule's height changes by a small random amount: gravity adds a steady downward pull, and temperature sets the size of the random thermal jiggle. Molecules bounce off the ground, and off a ceiling at the top of the window (the molecules are in a closed box of height 100). Over time the molecules settle into an equilibrium where their density falls off exponentially with height, a simple version of the barometric formula for the atmosphere. Heights are in arbitrary units (0 at the ground, 100 at the ceiling).

## Parameters

**Gravity:** Slider from −50 to −1 m/s², default −10 m/s². The downward pull on the molecules; each step drifts down by |gravity| / 200. More negative values mean stronger gravity.

**Temperature:** Slider from 100 K to 500 K, default 300 K (about 80°F). The size of the random thermal motion: each step adds a normally distributed random amount with standard deviation √(temperature / 300).

## Components

**Atmosphere Window:** The 200 molecules (red dots) against a sky background, with the ground at the bottom. The top of the window is the ceiling (height 100).

**Density Window:** A histogram of the molecules' heights in 16 bins, lined up with the heights in the Atmosphere window (the height scale 0–100 is marked on the left). Each bar's length is the fraction of the 200 molecules in that height range. The amber line shows the theoretical equilibrium distribution for the current gravity and temperature. While the simulation runs, the histogram updates 5 times per second.

**Simulate/Stop Button:** Starts and stops the simulation. The simulation takes 60 steps per second.

**Reset Button:** Stops the simulation and puts all molecules back near the ground (height about 7.5).

**Statistics Display:**
- Particles: 200
- Mean height and Std dev (standard deviation) of the molecules' current heights
- Theory: the scale height H and the theoretical mean height at equilibrium
- Running... or Paused

## The Theory

For a random walk that drifts down by μ per step with random steps of variance σ², bouncing off the ground, the equilibrium density of molecules is proportional to e^(−h/H), where the scale height is

H = σ² / (2|μ|) = temperature / (3 × |gravity|).

At the defaults, H = 300 / 30 = 10. The density drops by a factor of e (about 2.7) for each H units of height. Higher temperature or weaker gravity gives a larger H: a taller, thinner atmosphere. When H is small compared with the ceiling (100), the mean height at equilibrium is about H; when H is large, the ceiling matters and the molecules spread almost evenly through the box.

## What to Observe

- Click **Simulate** and watch the molecules spread upward from near the ground and settle into an equilibrium. The histogram bars approach the amber theory line, with random fluctuations because there are only 200 molecules.

- Raise the **Temperature** to 500 K: the molecules spread higher and the theory line becomes flatter. Lower it to 100 K: the molecules crowd near the ground.

- Make gravity **stronger** (toward −50 m/s²): the atmosphere is compressed near the ground.

- Make gravity **weaker** (toward −1 m/s²): the molecules spread much higher, with a gradual falloff in density. With very weak gravity they fill most of the box.

- Compare the **Mean height** with the theoretical mean after the simulation has run for a while. Taking longer to settle is normal when H is large.

- Click **Reset** to start again near the ground, and see how long equilibrium takes to reach for different settings.
