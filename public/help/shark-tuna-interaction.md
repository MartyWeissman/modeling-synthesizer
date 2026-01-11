# Shark and Tuna Interaction Counter

## Overview

This tool simulates random spatial encounters between sharks and tuna in an ocean environment. By randomly placing predators and prey on a grid, it demonstrates how encounter rates depend on population densities - a foundational concept for understanding predator-prey dynamics and the law of mass action in ecology.

## How It Works

Sharks and tuna are placed at random positions on a 20x20 grid. A tuna is considered "eaten" if it lands adjacent to a shark (within one grid unit in any direction, including diagonals). After placement, eaten tuna are marked with a red X.

This simple spatial model illustrates that the number of predator-prey encounters scales with the product of population sizes - the basis for the interaction terms in Lotka-Volterra equations.

## Parameters

### Number of Sharks (0-50)
The number of shark predators to place on the grid. Default: 10.

### Number of Tuna (0-200)
The number of tuna prey to place on the grid. Default: 50.

## Components

### Ocean Window
A visual display of the ocean grid showing:
- **🦈 Shark emoji**: Predator locations
- **🐟 Fish emoji**: Tuna locations
- **❌ Red X**: Appears after 1 second to mark eaten tuna (those adjacent to sharks)

### Place Button
Randomly places all sharks and tuna on the grid and calculates interactions. Each creature occupies a unique grid position.

### Results Display
Shows:
- **Tuna Eaten**: Number of tuna that landed adjacent to a shark
- **Surviving**: Number of tuna that avoided predation

## What to Observe

1. **Density dependence**: Run multiple trials with the same settings. Notice the variability in outcomes due to random placement.

2. **Scaling with population**: Double the number of sharks and observe how the number of eaten tuna changes. Does it double?

3. **Saturation effects**: With very high shark density, what happens? Can all tuna be eaten, or do sharks "compete" for the same prey?

4. **Mass action approximation**: The expected number of encounters is approximately proportional to (sharks × tuna) / (grid area). Test this by varying both populations.

5. **Spatial clustering**: Sometimes sharks cluster in one region while tuna are elsewhere, leading to few interactions despite high populations.

## Connection to Differential Equations

The interaction term in Lotka-Volterra equations (βST) assumes that encounter rate is proportional to the product of population sizes. This simulation shows why: each shark has a probability of encountering each tuna, so total encounters scale with both populations.

## References

