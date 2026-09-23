# Logistic Growth Explorer

## Overview

This tool allows you to fit a logistic growth model to experimental data. By adjusting three parameters (carrying capacity, growth rate, and time shift), you can visually match the characteristic S-curve to your data points and measure goodness of fit using RSS (Residual Sum of Squares).

## The Logistic Model

The logistic growth equation describes population growth with an upper limit:

**Differential equation**: P' = bP(1 - P/C)

**Solution**: P(t) = C·e^(b(t-t₀)) / (1 + e^(b(t-t₀)))

This produces the characteristic S-shaped (sigmoid) curve. While P is small compared with C, the population grows almost exponentially, with rate b. Growth is fastest at t = t₀, when P = C/2. After that, growth slows as the population approaches the carrying capacity.

## Parameters

### C (Carrying Capacity): 1–10000
The upper limit of population growth - the maximum sustainable population. The curve asymptotically approaches this value. Default: 100.

### b (Growth Rate): 0–1
The birth rate (growth rate when the population is small). It controls the steepness of the S-curve: higher values give a faster rise from low to high population. Slider in steps of 0.01. Default: 0.5.

### t₀ (Time Shift): 0–30
The time at which the population reaches exactly half the carrying capacity (C/2); this is also when P is growing fastest. Changing t₀ shifts the curve left or right. The slider normally runs from 0 to 30; if you enter data with times outside that range, it widens to cover your data. Default: 10.

## Components

### Data Table
Enter (t, P) data points. The tool automatically adjusts axis ranges to accommodate your data.

### Main Graph
Shows:
- **Red S-curve**: The logistic model with current parameters
- **Green dashed line**: Carrying capacity C
- **Blue circles**: Your data points
- **Gray squares** (when RSS shown): Visual representation of residuals

### RSS Display
Shows the Residual Sum of Squares: the sum, over your data points, of (data P − model P)². Lower values indicate a better fit. Values of 10⁸ or more are shown in scientific notation.

### Control Buttons
- **Clear Data**: Remove all data points
- **Show RSS**: Toggle visual residual squares
- **Reset Params**: Return C, b and t₀ to their defaults (100, 0.5, 10)

### Equation Displays
Three representations of the model:
1. Solution form: P(t) with exponential
2. Differential form: P' = bP(1 - P/C)
3. Expanded form with current parameter values

## What to Observe

1. **Parameter effects**: Adjust each slider to see how it changes the curve shape. C affects height, b affects steepness, t₀ shifts horizontally.

2. **Fitting strategy**: Start by matching C to your maximum data value, then adjust t₀ to center the curve, finally tune b for the right steepness.

3. **RSS minimization**: Watch the RSS value as you adjust parameters. Try to minimize it by finding the best fit.

4. **Residual visualization**: Enable "Show RSS" to see the squared errors as gray squares (each square's side is the vertical distance from the point to the curve). Large squares indicate poor fit at those points.

5. **Growth phases**: The logistic curve has three phases:
   - **Early (near-exponential) growth**: While P is much smaller than C, P' ≈ bP, so the population grows almost exponentially. The curve looks flat at first only because P itself is small.
   - **Fastest growth at t₀**: The growth rate P' is largest when P = C/2, which happens at t = t₀. This is the steepest point (inflection point) of the S-curve.
   - **Saturation**: Growth slows as P approaches C.

## Data Entry Tips

- Enter data in the table cells directly
- Use Tab to move between cells
- The graph automatically scales to fit your data
- Empty rows are ignored
