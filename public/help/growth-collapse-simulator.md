# Growth & Collapse Simulator

## Overview

This tool simulates a Markov process where a quantity grows by 1 with probability p, or collapses to 0 with probability (1-p), at each time step. It runs 500 independent trials with an animated visualization showing the growth and collapse dynamics in real-time.

## Parameters

**P(Growth):** Slider adjusts between 0.00 and 1.00, default 0.90. The probability that height increases by 1 at each time step.

**P(Collapse):** Slider adjusts between 0.00 and 1.00, default 0.10. The probability that height resets to 0 at each time step. This is linked to P(Growth) such that P(Growth) + P(Collapse) = 1.

**Time:** Input accepts integers from 1 to 100, default 50. The number of time steps in each trial simulation. Each step is displayed for 0.1 seconds during animation, so Time=100 produces a 10-second animation.

## Components

**Samples Window:** Displays an animated bar chart showing the current height of all 500 trials. During animation, bars grow upward (height +1) or collapse to zero at each time step. Bar colors follow a "hot" gradient from blue (low heights) through purple, pink, red, orange to yellow (high heights). After animation completes, a green dashed line shows the average height.

**Run! Button:** Starts the animated simulation with current parameters. All 500 trials run simultaneously, updating every 0.1 seconds per time step. Clicks during a run are ignored; changing the parameters during a run affects only the next run.

**Results Display:** During animation, shows "Simulating..." with the current step count. After completion, displays:
- Max Height: The largest *final* height among the 500 trials (the height at the last time step, not the tallest height reached along the way)
- Average: The mean final height across all 500 trials

**Histogram:** Appears after the simulation completes (the previous run's histogram is cleared when a new run starts). Shows the distribution of final heights across 10 equal-sized bins with the same hot color gradient as the samples display.

## What to Observe

- Watch the animation to see growth and collapse dynamics unfold in real-time
- Notice that each collapse is dramatic: a sample drops from its current height all the way to zero. The 500 samples are independent, so a collapse in one sample has no effect on the others
- Set P(Growth) high (0.95) and observe tall towers building up, with occasional dramatic collapses
- Set P(Growth) low (0.50) and observe most trials repeatedly collapsing before gaining much height
- The color gradient helps track which samples have grown tallest (yellow) versus recently collapsed (blue)
- Compare the histogram shape at different P(Growth) values - concentrated near zero for low p, spread out for high p. In every case the bars tend to get shorter as the height increases: to reach height h, a sample needs h growths in a row since its last collapse, and each extra step of height multiplies the chance by p
