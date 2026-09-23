# Discrete Modeling Practice

## Overview

This study aide generates random practice problems for discrete-time modeling. Each problem describes a situation with linear or exponential growth or decay. Your job is to name the state variable, write the change equation, find the predictive equation, and sketch the time series.

## How It Works

Click **New Question** to get a new random situation. The tool picks at random:
- A container (basket, pond, field, etc.)
- A kind of object (apples, fish, birds, etc.)
- A time unit (hour, day, week, month)
- Growth or decay
- Linear (the same amount added or removed each time step) or exponential (the same percentage increase or decrease each time step)

Work out each part on paper first, then click **Reveal** to check your answer.

## Problem Types

### Linear Growth/Decay
A fixed amount is added or removed at each time step.

**Example**: "A basket starts with 25 apples. Every day, someone adds 4 apples."

- **Change equation**: ΔA/Δt = 4
- **Predictive equation**: A(t) = 4t + 25

In decay problems ("takes away"), the starting amount is always large enough that the number never goes below zero during the 10 time steps shown.

### Exponential Growth/Decay
The amount increases or decreases by a fixed percentage at each time step.

**Example**: "A pond starts with 200 fish. Every month, the number of fish increases by 30%."

- **Change equation**: ΔF/Δt = 0.30·F
- **Predictive equation**: F(t) = 200 × (1.30)^t

For a decrease by 30%, the change equation is ΔF/Δt = −0.30·F and the predictive equation is F(t) = 200 × (0.70)^t.

## Components

### Situation
The randomly generated word problem.

### State Variable
The variable and its meaning (for example, "Let A be the number of apples in the basket, and t the time in days").

### Change Equation
How much the variable changes in one time step (Δt = 1):
- Linear: ΔX/Δt = rate (negative for decay)
- Exponential: ΔX/Δt = rate · X, with the rate written as a decimal (0.30 for 30%; negative for decay)

### Predictive Equation
A formula for X at any time t:
- Linear: X(t) = rate · t + starting amount
- Exponential: X(t) = starting amount × (factor)^t

### Time Series Plot
A graph of the variable at the times t = 0, 1, 2, …, 10. The numbers on the vertical axis appear only when the graph is revealed.

### Controls

**New Question**: Get a new random problem (all answers are hidden again).

**Reveal/Hide buttons**: Show or hide each answer.

**Hide All**: Hide all answers.

## Study Tips

1. **Work before revealing**: Always write down your answer before clicking Reveal.

2. **Identify the pattern**: Is the change a fixed amount (linear) or a percentage (exponential)?

3. **Watch for decay**: In the change equation, a negative rate means decay. In the predictive equation of an exponential model, decay means a factor between 0 and 1 (for example 0.70 for a 30% decrease), and growth means a factor greater than 1 (1.30 for a 30% increase).

4. **Check with the graph**: After finding your equation, predict what the graph looks like before revealing it.

5. **Practice both types**: Make sure you are comfortable with both linear and exponential situations.

## Mathematical Notation

- **ΔX/Δt**: The change in X during one time step (X at the next time minus X now), divided by the length of the time step Δt = 1
- **X(t)**: The value of X at time t
- **Factor**: For exponential models, 1 + rate for growth, or 1 − rate for decay
