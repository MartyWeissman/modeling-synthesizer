# Logistic Growth Explorer

## Overview

This tool allows you to fit a logistic growth model to experimental data. By adjusting three parameters (carrying capacity, growth rate, and time shift), you can visually match the characteristic S-curve to your data points and measure goodness of fit using RSS (Residual Sum of Squares).

## The Logistic Model

The logistic growth equation describes population growth with an upper limit:

**Differential equation**: P' = bP(1 - P/C)

**Solution**: P(t) = C·e^(b(t-t₀)) / (1 + e^(b(t-t₀)))

This produces the characteristic S-shaped (sigmoid) curve that starts with slow growth, accelerates to maximum rate, then decelerates as the population approaches carrying capacity.

## Parameters

### C (Carrying Capacity): 1-10000
The upper limit of population growth - the maximum sustainable population. The curve asymptotically approaches this value. Default: 100.

### b (Growth Rate): 0-2
Controls the steepness of the S-curve. Higher values produce faster transitions from low to high population. Default: 0.5.

### t₀ (Time Shift): 0-30
The time at which the population reaches exactly half the carrying capacity (C/2). Shifts the curve left or right. Default: 10.

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
Shows the Residual Sum of Squares - the total squared distance from data points to the model curve. Lower values indicate better fit.

### Control Buttons
- **Clear Data**: Remove all data points
- **Show RSS**: Toggle visual residual squares
- **Reset Params**: Return parameters to defaults

### Equation Displays
Three representations of the model:
1. Solution form: P(t) with exponential
2. Differential form: P' = bP(1 - P/C)
3. Expanded form with current parameter values

## What to Observe

1. **Parameter effects**: Adjust each slider to see how it changes the curve shape. C affects height, b affects steepness, t₀ shifts horizontally.

2. **Fitting strategy**: Start by matching C to your maximum data value, then adjust t₀ to center the curve, finally tune b for the right steepness.

3. **RSS minimization**: Watch the RSS value as you adjust parameters. Try to minimize it by finding the best fit.

4. **Residual visualization**: Enable "Show RSS" to see the squared errors as gray boxes. Large boxes indicate poor fit at those points.

5. **Growth phases**: The logistic curve has three phases:
   - **Lag phase**: Slow growth when P << C
   - **Exponential phase**: Rapid growth around t₀
   - **Saturation phase**: Growth slows as P approaches C

## Data Entry Tips

- Enter data in the table cells directly
- Use tab or enter to move between cells
- The graph automatically scales to fit your data
- Empty rows are ignored

## References

