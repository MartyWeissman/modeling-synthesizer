# Linear Regression with Log Scaling

## Overview

This tool performs linear regression analysis with optional logarithmic scaling on either or both axes. It's particularly useful for analyzing exponential and power-law relationships, which become linear when plotted on log scales. The tool also provides visual representations of variance (TSS) and residuals (RSS) to help understand regression concepts.

## How It Works

Enter (x, y) data points in the table. The tool can display data on linear or logarithmic scales for each axis independently. When regression is enabled, it fits a line to the data in the current coordinate system and reports slope, intercept, and R².

## Components

### Data Table
Enter your data points. Columns shown depend on current scaling:
- **X, Y**: Raw data values (always shown, editable)
- **log(X), log(Y)**: Computed logarithms (shown when log scaling is active, read-only)

Red highlighting indicates invalid values for log transformation (zero or negative).

### Plot
Displays data points and optional regression line. Axis labels update to reflect current scaling (X, Y, log₁₀(X), ln(Y), etc.).

### Scaling Controls

**X Linear/Log**: Toggle between linear and logarithmic scaling for the x-axis.

**Y Linear/Log**: Toggle between linear and logarithmic scaling for the y-axis.

**Logarithm Base**: Choose between:
- Base 10 (log₁₀) - common for scientific data
- Base 2 (log₂) - useful for doubling processes
- Natural (ln, base e) - natural for continuous growth

### Regression Controls

**Fit Linear Model**: Enable/disable the regression line fit.

**Show TSS**: Display Total Sum of Squares - green squares showing variance from the mean.

**Show RSS**: Display Residual Sum of Squares - blue squares showing variance from the regression line.

### Statistics Display
When regression is enabled, shows:
- **N**: Number of valid data points
- **Slope**: Regression line slope
- **Intercept**: Regression line y-intercept
- **R²**: Coefficient of determination (1.0 = perfect fit)
- **Equation**: The fitted equation in current coordinates

### Action Buttons

**Clear Data**: Remove all data points.

**Load Sample**: Load example exponential data (1,2), (2,4), (3,8), (4,16), (5,32).

## What to Observe

1. **Exponential relationships**: Load sample data and view with Y on log scale. The exponential curve becomes a straight line.

2. **Power laws**: For data following y = ax^b, try log scaling on both axes. The power b becomes the slope.

3. **R² interpretation**: Compare R² values between linear-linear and log-linear fits to determine which model better describes your data.

4. **TSS vs RSS**: The ratio RSS/TSS = 1 - R². Watch how these squares change as you adjust the fit.

5. **Log base effects**: Changing log base affects the slope value but not R². Compare slopes when using different bases.

## Mathematical Background

When fitting log(y) = m·log(x) + b, this corresponds to:
- y = 10^b · x^m (for log₁₀)
- y = e^b · x^m (for ln)

The slope m is the power-law exponent, regardless of which logarithm base is used.

## References

