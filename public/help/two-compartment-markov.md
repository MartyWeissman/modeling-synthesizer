# Two Compartment Markov Model

## Overview

Particles (for example, water molecules) move between two compartments, A and B. The model is a discrete-time Markov chain: at each time step, every particle in A moves to B with probability P(A→B), and every particle in B moves to A with probability P(B→A), independently of the others. Over time the numbers in A and B settle into a random fluctuation around an equilibrium. The animation shows particles drifting around inside their compartments and flying through tunnels when they switch; the upper tunnel carries A→B moves and the lower tunnel carries B→A moves.

## Parameters

**Compartment A Name / Compartment B Name:** Text inputs (at most 8 characters), default "A" and "B". Labels for the compartments, used in the picture and the status box.

**Population A (N_A) / Population B (N_B):** Numeric inputs from 0 to 1000, default 500 each. The starting number of particles in each compartment. A new value is used the next time a run starts from scratch (press Reset, then Start).

**P(A→B):** Slider from 0% to 40%, default 5%. The probability per time step that a particle in A moves to B. It can be changed during a run.

**P(B→A):** Slider from 0% to 40%, default 5%. The probability per time step that a particle in B moves to A. It can be changed during a run.

## Components

**Compartment Visualization:** Compartment A (red) on the left and compartment B (blue) on the right, joined by two tunnels labeled with their transition probabilities. Particles are red in A, blue in B, and gold while they fly through a tunnel. The current counts are shown above the compartments.

**Time Series Graph:** The number of particles in A (solid red line) and B (dashed blue line) against time in steps, with one point for every step. The graph shows the last 200 steps and scrolls once the run passes step 200. The simulation runs at 4 steps per second.

**Start Button:** Starts a new run with the current populations and probabilities. If the run is paused, Start resumes it instead.

**Pause Button:** Freezes the run. Press Start to continue.

**Reset Button:** Stops the run and clears the particles and the graph.

**Status Display:** Running, Paused, or Stopped; the current step; and the current count in each compartment.

## What to Observe

- Press **Start** with the defaults (500 and 500, 5% and 5%). The counts fluctuate around 500 each: with equal transition probabilities the equilibrium is an even split.
- Make the probabilities unequal, for example P(A→B) = 20% and P(B→A) = 10%, starting from 1000 particles in each compartment. The counts move quickly toward a new equilibrium and then fluctuate around it. At equilibrium, the number of particles moving A→B each step balances the number moving B→A.
- Start with all the particles in one compartment (for example N_A = 1000, N_B = 0) and watch the approach to equilibrium.
- Double both probabilities and compare: how does that change the equilibrium, and how fast it is reached?
- Use **Pause** to freeze the picture and read off the counts, then **Start** to continue.
- Rename the compartments to fit a biological setting, for example the two sides of a membrane.
