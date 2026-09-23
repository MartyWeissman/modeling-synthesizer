# Trajectory & Time Series Practice

## Overview

This study aide helps you translate between two ways of picturing a two-variable system: the trajectory in state space and the time series. Being able to go back and forth between these views is essential for understanding population dynamics and other two-variable models.

## How It Works

Each time you click **New Plots**, the tool makes up a random two-species example, with one of three kinds of trajectory:
- **Line**: Both populations change at constant rates, so the trajectory is a straight line.
- **Circle**: The populations cycle, going once around a closed loop (like predator–prey oscillations).
- **Spiral**: The populations oscillate with a growing or shrinking amplitude, going around twice.

The direction is random too: a line can run left or right, and circles and spirals can turn clockwise or counterclockwise.

## The Two Representations

### Trajectory Plot (State Space)
Shows how the two populations relate to each other at each moment.
- **Horizontal axis**: Population of species 1 (e.g., sharks)
- **Vertical axis**: Population of species 2 (e.g., tuna)
- **Green curve**: The path of the system over time
- **Dots**: The state at times t = 0, 1, 2, …, 10
- **Ring**: The starting point (t = 0)

Time is not shown directly: the curve shows the order of the states, and the spacing of the dots shows the speed. Widely spaced dots mean the state is changing quickly; closely spaced dots mean it is changing slowly.

### Time Series Plot
Shows each population against time.
- **Horizontal axis**: Time, from 0 to 10
- **Vertical axis**: Population size
- **Solid blue line**: Species 1
- **Dashed red line**: Species 2
- **Dots**: Values at t = 0, 1, 2, …, 10
- **Rings**: Starting values (t = 0)

Here the relationship between the two species is not shown directly: you see each one separately.

## Practice Method

1. Show both plots and work out how they are related.
2. Click **New Plots**, then show only one of the plots.
3. Sketch the other plot on paper.
4. Click **Show** to check your answer.
5. Repeat with new plots.

## Key Insights to Develop

### Trajectory → Time Series
- **Moving right**: Species 1 is increasing. **Moving left**: species 1 is decreasing.
- **Moving up**: Species 2 is increasing. **Moving down**: species 2 is decreasing.
- **Horizontal movement**: Species 1 is changing while species 2 stays constant.
- **Vertical movement**: Species 2 is changing while species 1 stays constant.
- **Circular trajectory**: Both time series are waves with the same period, shifted by about a quarter of a period.
- **Spacing of the dots**: Far apart means the populations are changing quickly (steep time series); close together means slowly (flat time series).

### Time Series → Trajectory
- **Both increasing, or both decreasing**: The trajectory moves diagonally up-right or down-left.
- **One increasing, the other decreasing**: The trajectory also moves diagonally, but up-left or down-right.
- **One constant, one changing**: The trajectory moves horizontally or vertically.
- **Oscillations exactly in step** (peaks at the same time): The trajectory goes back and forth along a line.
- **Oscillations shifted by a quarter period**: The trajectory goes around a circle or ellipse.

## Pattern Recognition

### Line Trajectory
- Time series: both are straight lines.
- Trajectory going up and to the right: both populations increasing.
- Trajectory going down and to the right: species 1 increasing, species 2 decreasing.

### Circular Trajectory
- Time series: both are waves.
- When one species is at its peak, the other is at its middle value.
- The direction around the circle (clockwise or counterclockwise) tells you which species peaks first.

### Spiral Trajectory
- Time series: waves with a changing amplitude.
- Outward spiral: growing oscillations.
- Inward spiral: shrinking (damped) oscillations, approaching an equilibrium.
