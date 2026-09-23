# Linear Regression with Log Scaling

## Overview

This tool fits a straight line to data (simple linear regression), with optional logarithmic scaling of either or both axes. Log scaling turns exponential and power-law relationships into straight lines, so it helps you decide what kind of growth your data shows. The tool can also draw the squares behind the R² statistic (TSS and RSS).

## How It Works

Enter (X, Y) data points in the table. Each axis can be linear or logarithmic. When you click **Fit Linear Model**, the tool finds the least-squares line through the points *as they are plotted*, and reports its slope, intercept, and R²:
- X and Y both linear: fits Y ≈ mX + b
- Y log: fits log(Y) ≈ mX + b (exponential model)
- X and Y log: fits log(Y) ≈ m·log(X) + b (power-law model)

The fit updates as soon as you change the data, the scaling, or the logarithm base.

## Components

### Data Table
Enter your data points (up to 15 rows). Columns shown depend on the scaling:
- **X, Y**: Your data values (always shown, editable)
- **log(X), log(Y)** (or ln): The logarithms, computed for you (shown when log scaling is on, read-only)

Rows with a missing X or Y are ignored. A value that is zero or negative can't be log-transformed: it is highlighted in red and that point is left out of the plot and the fit while log scaling is on.

### Plot
Shows the data points and, when fitted, the regression line in red. The axis labels show the current scaling (X, Y, log₁₀(X), ln(Y), and so on). On a log axis the tick numbers are values of the logarithm: for example, 2 on an ln(Y) axis means Y = e² ≈ 7.4.

### Scaling Controls

**X Linear/Log**: Switch the horizontal axis between linear and logarithmic.

**Y Linear/Log**: Switch the vertical axis between linear and logarithmic.

**Logarithm base**: Use the arrows to choose:
- Base 10 (log₁₀), the default
- Base 2 (log₂), handy for doubling processes
- Natural (ln, base e)

### Fit and Squares

**Fit Linear Model**: Show or hide the fitted line and its statistics.

**Show TSS**: Draw the Total Sum of Squares: a green line at the mean of the plotted Y values, and a green square from each point to that line.

**Show RSS**: Draw the Residual Sum of Squares: a blue square from each point to the fitted line. Turning RSS on also turns on the fit.

### Data Analysis Display
Shows:
- **N**: Number of data points used
- **Slope**, **Intercept**, **R²** (when the fit is on), to 3 decimal places
- **Equation**: The fitted line in the current coordinates, to 3 significant figures

### Buttons

**Clear Data**: Remove all data points.

**Load Sample**: Load example exponential data (1, 2), (2, 4), (3, 8), (4, 16), (5, 32).

## What to Observe

1. **Exponential relationships**: Load the sample data and turn Y to Log. The curve becomes a straight line.

2. **Power laws**: For data following Y = C·X^p, turn both X and Y to Log. The slope of the line is the power p.

3. **R² and the choice of model**: R² tells you how much of the variation *of the plotted Y values* the line explains. With Y on a log scale, that is the variation of log(Y), not of Y, so R² values from linear and log plots are not directly comparable. To choose between models, look at the plots: which one makes the points fall on a straight line, without a curved pattern?

4. **TSS vs RSS**: RSS is the total area of the blue squares and TSS the total area of the green squares (in the plotted units). They are related by R² = 1 − RSS/TSS: the better the fit, the smaller the blue squares compared with the green ones.

5. **Log base effects**: Changing the base changes the slope for exponential data (log(Y) against X), but not R². For power laws (both axes log), the slope is the same in every base.

## Mathematical Background

If ln(Y) = mX + b, then Y = e^b · e^(mX), an exponential function.
If log₁₀(Y) = mX + b, then Y = 10^b · 10^(mX).

If ln(Y) = m·ln(X) + b, then Y = e^b · X^m, a power function.
If log₁₀(Y) = m·log₁₀(X) + b, then Y = 10^b · X^m.

In a power law the exponent m does not depend on which logarithm base you use; the intercept b does.
