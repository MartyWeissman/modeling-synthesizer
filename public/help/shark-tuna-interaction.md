# Shark-Tuna Interactions

## Overview

This tool places sharks and tuna at random in a patch of ocean and counts how many tuna end up next to a shark. Repeating this with different numbers of sharks and tuna shows how the number of shark-tuna interactions depends on the two populations.

## How It Works

The ocean is a 20 × 20 grid of cells. Each shark and each tuna is put in its own randomly chosen cell (no two creatures share a cell). A tuna is counted as **eaten** if a shark is in one of the 8 neighboring cells (including diagonals). One second after placement, eaten tuna are marked with a red X.

Because the placement is random, running again with the same numbers usually gives a different count.

## Parameters

### Number of Sharks (0–50)
The number of sharks placed. Default: 10.

### Number of Tuna (0–200)
The number of tuna placed. Default: 50.

## Components

### Ocean Window
- **🦈**: sharks
- **🐟**: tuna
- **❌**: eaten tuna (next to a shark), shown after one second

### Place Button
Places all sharks and tuna at random and counts the eaten tuna.

### Results Display
- **Tuna Eaten**: tuna that landed next to a shark
- **Surviving**: tuna that did not

## What to Observe

1. **Randomness**: Run several times with the same settings. The count varies from run to run, so average over several runs.

2. **Fix one population, vary the other**: Keep the number of sharks fixed and try several numbers of tuna (and the other way round). When sharks are not too crowded, the number eaten grows roughly in proportion to each population.

3. **The product ST**: The data are fit well by I ≈ kST, where I is the number of interactions and k is a constant. Estimate k from your runs.

4. **Crowding**: With many sharks, their neighborhoods overlap and a tuna next to two sharks is still eaten only once, so the count grows more slowly than kST.

5. **Clustering**: Sometimes sharks happen to cluster in one region while tuna are elsewhere, giving few interactions despite large populations.

## Connection to the Lotka-Volterra Equations

In the Lotka-Volterra model

- S′ = −δS + pST
- T′ = βT − qST

the interaction terms pST and −qST are proportional to the number of interactions I = kST. The coefficient p measures how much each interaction benefits the sharks, and q how many tuna each interaction removes. The same notation is used in the Shark-Tuna Trajectories tool.
