# Discrete Modeling Practice

## Overview

This study aide generates randomized practice problems for discrete-time mathematical modeling. Each problem presents a real-world scenario involving linear or exponential growth/decay, and challenges you to identify the state variable, write the change equation, derive the predictive equation, and visualize the solution.

## How It Works

Click "New Question" to generate a random scenario. The tool randomly selects:
- A container (basket, pond, field, etc.)
- An object type (apples, fish, birds, etc.)
- A time unit (hour, day, week, month)
- Growth or decay
- Linear (constant change) or exponential (percentage change)

Work through each section mentally, then click "Reveal" to check your answer.

## Problem Types

### Linear Growth/Decay
Problems where a constant amount is added or removed each time step.

**Example**: "A basket starts with 25 apples. Every day, someone adds 4 apples."

- **Change equation**: ΔA = 4
- **Prediction equation**: A(t) = 4t + 25

### Exponential Growth/Decay
Problems where a percentage increase or decrease occurs each time step.

**Example**: "A pond starts with 200 fish. Every month, the number of fish increases by 30%."

- **Change equation**: ΔF = 0.30·F
- **Prediction equation**: F(t) = 200·(1.30)^t

## Components

### Situation
The randomly generated word problem describing the scenario.

### State Variable
The variable definition (e.g., "Let A be the number of apples in the basket").

### Change Equation
The discrete-time equation showing how the variable changes each time step:
- Linear: ΔX = rate
- Exponential: ΔX = rate·X

### Predictive Equation
The closed-form solution for X(t):
- Linear: X(t) = rate·t + initial
- Exponential: X(t) = initial·(factor)^t

### Time Series Plot
A graph showing the variable over 10 time steps, with points at integer times.

### Controls

**New Question**: Generate a fresh random problem.

**Reveal/Hide buttons**: Toggle visibility of each answer section.

**Hide All**: Conceal all answers to start fresh.

## Study Tips

1. **Work before revealing**: Always try to write down your answer before clicking Reveal.

2. **Identify the pattern**: Is the change described as a fixed amount (linear) or a percentage (exponential)?

3. **Watch for decay**: Negative rates or percentages less than 100% indicate decay.

4. **Check with the graph**: After deriving your equation, predict what the graph should look like before revealing it.

5. **Practice both types**: Make sure you're comfortable with both linear and exponential scenarios.

## Mathematical Notation

- **ΔX**: Change in X (X at next time minus X at current time)
- **X(t)**: Value of X at time t
- **Factor**: For exponential, this is (1 + rate) for growth or (1 - rate) for decay

## References

