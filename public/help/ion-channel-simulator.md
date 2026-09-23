# Ion Channel Simulator

## Overview

This tool simulates a patch-clamp recording of a single ion channel. The channel is either closed or open, and it switches at random: each millisecond, an open channel closes with probability P(Open→Closed), and a closed channel opens with probability P(Closed→Open). This two-state Markov model is the standard simplest model of single-channel gating. When the channel is open, 2 pA of current flows inward through it; following the usual convention (and the patch-clamp figure in the lab manual), inward current is negative and is drawn downward. A little Gaussian noise is added to mimic a real recording.

## Parameters

**P(Open→Closed):** Slider from 0.00 to 1.00, default 0.05. The probability per millisecond that an open channel closes.

**P(Closed→Open):** Slider from 0.00 to 1.00, default 0.05. The probability per millisecond that a closed channel opens.

## Components

**Patch Clamp Recording:** The simulated current over 350 ms. The right axis shows current in pA: 0 pA (closed) at the top and −2 pA (open, 2 pA inward) at the bottom. Grid lines are every 10 ms and every 0.5 pA, forming a square grid for measuring. The time axis is marked every 50 ms.

**Simulate Button:** Runs a new 350 ms recording with the current slider settings. The channel starts closed. Each millisecond, the current is drawn from a normal distribution (mean 0 pA when closed, −2 pA when open, standard deviation 0.2 pA), and then the channel may switch state. Each press gives a new random recording.

**Clear Button:** Clears the recording and the results.

**Info & Results Display:** A reminder of the model, and after a run:
- **Time open / Time closed:** Total milliseconds spent open and closed.
- **Fraction open:** Time open as a percentage of the 350 ms.
- **Avg open / Avg closed:** Average length of the open episodes and of the closed episodes, in ms.
- **Show theory:** Click to show the long-run fraction of time open predicted by the model.

If you move a slider after a run, a note reminds you which probabilities the displayed results used.

## What to Observe

- Click **Simulate** several times with the same settings. The recordings and statistics change from run to run because the switching is random.
- Hold one probability fixed and double or triple the other. Watch how the time open changes.
- Set both probabilities **low** (e.g. 0.01) for long, infrequent open and closed periods; set both **high** (0.50 or more) for rapid flickering.
- Use the **10 ms grid** to measure open and closed periods directly on the recording, and compare with Avg open and Avg closed.
- In the model, the length of an open period follows a geometric distribution with mean exactly 1 / P(Open→Closed) ms (and a closed period has mean 1 / P(Closed→Open) ms). The averages in one run differ from this because of randomness, and they come out a bit short because the period still in progress at 350 ms is cut off by the end of the recording.
