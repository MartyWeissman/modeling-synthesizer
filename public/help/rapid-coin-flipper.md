# Rapid Coin Flipper

## Overview

Simulates sequences of biased or fair coin flips and visualizes the results as a random walk. Compares observed outcomes to statistical expectations and highlights notable events in the sequence.

## Parameters

**Number of Flips (N):** Input field adjusts between 1 and 200, default 100. Sets how many coin flips to simulate in each trial.

**Prob(Heads):** Slider adjusts between 0.00 and 1.00, default 0.50. Sets the probability that each flip results in heads.

**Prob(Tails):** Slider adjusts between 0.00 and 1.00, default 0.50. Linked to Prob(Heads) so that Prob(Heads) + Prob(Tails) = 1. Adjusting either slider automatically updates the other.

## Components

**Flip Sequence Window:** Displays the sequence of H (heads) and T (tails) outcomes arranged in groups of 5, with 25 flips per row. During simulation, shows an animated coin-flipping effect. After simulation:
- The first occurrence of H is circled in green
- The first occurrence of T is circled in red
- The longest run of consecutive H's is underlined in green
- The longest run of consecutive T's is underlined in red

**Flip! Button:** Triggers a new simulation with the current parameter settings. Displays a 1.5-second coin-flipping animation, then reveals the flip sequence, graph, results, and events together. Clicks during the animation are ignored.

**Random Walk Graph:** Displays the cumulative difference (heads minus tails) vs flip number. The left y-axis marks 0 and the expected final difference. The right y-axis marks the expected final difference (μ) and ±1σ, ±2σ, ±3σ at the last flip. Reference curves show what to expect after each number of flips n:
- Gray dashed line: the expected difference after n flips, n(2p − 1), where p = Prob(Heads)
- Green dashed curves: n(2p − 1) + kσₙ for k = 1, 2, 3 (fading with distance from the mean)
- Red dashed curves: n(2p − 1) − kσₙ for k = 1, 2, 3

Here σₙ = 2√(np(1 − p)) is the standard deviation of the difference after n flips. Because σₙ grows like √n, the curves open into a funnel. The blue path traces the random walk, with a dot marking the final position. The graph always shows the most recent run; changing N or the probabilities takes effect on the next Flip!.

**Results Display:** Shows a table comparing expected and observed values:
- **Outcomes column:** Heads, Tails, Difference
- **Expected column:** Shows μ ± σ for each outcome (expected value plus/minus one standard deviation). For N flips, Heads is Np ± √(Np(1 − p)), Tails is N(1 − p) ± √(Np(1 − p)), and Difference is N(2p − 1) ± 2√(Np(1 − p)). Expected counts need not be whole numbers (for example, 10 flips with Prob(Heads) = 0.37 gives 3.7 heads).
- **Observed column:** Shows the actual count from the simulation

Below the table, displays the Z-score of the difference, (observed − expected)/σ, with an interpretation:
- |Z| < 1: "typical"
- 1 ≤ |Z| < 2: "a bit unusual"
- 2 ≤ |Z| < 3: "unusual"
- |Z| ≥ 3: "surprising"

**Events Display:** Shows four statistics about the flip sequence:
- First occurrence of H (position in sequence, 1-indexed) - displayed in green
- First occurrence of T (position in sequence, 1-indexed) - displayed in red
- Longest run of H (consecutive heads count) - displayed in green
- Longest run of T (consecutive tails count) - displayed in red

## What to Observe

- With a fair coin (Prob(Heads) = 0.50), run multiple simulations and notice where the walk ends: about 2 runs in 3 end within ±1σ, about 95% end within ±2σ, and ending beyond ±3σ is rare. (Over a whole run the walk wanders more; it often crosses the ±1σ curves somewhere along the way.)
- Adjust Prob(Heads) to 0.70 and observe how the random walk drifts upward, with the expected difference shifting positive
- Set N to 200 and notice how the funnel widens (the standard deviation grows like √N)
- Compare the longest runs to your intuition - even with a fair coin, runs of 5-7 are common in 100 flips
- Watch how the Z-score interpretation matches visual deviation from the expected line on the graph
- With extreme probabilities (0.90 or 0.10), observe how one outcome dominates and the first occurrence of the rare outcome may be delayed
