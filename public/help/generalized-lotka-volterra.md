# Generalized Lotka-Volterra Model

## Overview

This tool simulates the generalized Lotka-Volterra equations for two interacting populations. By adjusting six parameters, you can model predator-prey dynamics, competition, cooperation (mutualism), or other interactions. The tool shows the vector field, the nullclines, and every equilibrium point in the window together with its type (saddle, node, spiral, ...).

## The Model

The generalized Lotka-Volterra equations describe two populations P and Q:

- **P' = αP − γP² + uPQ**
- **Q' = βQ − δQ² + vPQ**

Each equation has three terms:
1. **Linear growth/decline** (αP, βQ): each population's own birth or death rate
2. **Self-limitation** (−γP², −δQ²): crowding within the same species
3. **Interaction** (uPQ, vPQ): effects of meeting the other species

## Parameters

All six parameters can be typed in or stepped with the arrows; each ranges from −5 to 5.

### α (Alpha)
Growth rate of P on its own. Positive = P grows, negative = P declines. Default: 1.5.

### β (Beta)
Growth rate of Q on its own. Default: −2.0.

### γ (Gamma)
Crowding (self-limitation) coefficient for P. Positive γ gives P a carrying capacity α/γ. Default: 0.0.

### δ (Delta)
Crowding coefficient for Q. Positive δ gives Q a carrying capacity β/δ. Default: 0.5.

### u
Effect of Q on P (the uPQ term in P'). Positive = P benefits from meeting Q, negative = P is harmed. Default: −1.0.

### v
Effect of P on Q (the vPQ term in Q'). Positive = Q benefits from meeting P, negative = Q is harmed. Default: 1.0.

### Pmax, Qmax: 1–9999
Right and top edges of the phase portrait (the axes start at 0). Default: 5 and 5. Increase them for large populations.

## Example Presets

**Default**: α = 1.5, β = −2, γ = 0, δ = 0.5, u = −1, v = 1. P is the prey and Q the predator; trajectories spiral in to the equilibrium (2.75, 1.5).

**Predator-Prey**: The classic Lotka-Volterra model (γ = δ = 0). P is the predator and Q the prey. The equilibrium (10, 10) is a center: every trajectory around it is a closed loop.

**Competition**: Both species are harmed by meeting (u, v < 0). This example is *bistable*: (9, 0) and (0, 3.6) are both stable, and the coexistence equilibrium near (1.48, 0.94) is a saddle. Which species survives depends on where you start. Trajectories on one side of the saddle end at (9, 0) (only P survives); on the other side they end at (0, 3.6) (only Q survives). This preset sets Pmax = 10 so that (9, 0) is visible.

**Cooperation**: Both species benefit from meeting (u, v > 0). Trajectories approach the stable equilibrium (6, 4).

Choosing a preset clears all trajectories and particles.

## Components

### Phase Portrait
Shows population P (horizontal axis) against population Q (vertical axis).

- **Gray arrows**: Vector field (the direction of change at each point)
- **Green trajectories**: Click anywhere in the plot to start a trajectory from that point
- **Orange particles**: A grid of particles that flows with the vector field after you press Start
- **Purple circles**: Equilibrium points. A filled circle is stable (nearby trajectories approach it); a hollow circle is not.
- **Blue lines** (nullclines): Where P' = 0 (the line P = 0 and the line α − γP + uQ = 0)
- **Red lines** (nullclines): Where Q' = 0 (the line Q = 0 and the line β − δQ + vP = 0)

Trajectories keep being computed when they leave the window, so they can come back in. A trajectory stops once it has settled at an equilibrium.

### Time Series Plot
Shows P and Q over the last 20 time units for the first trajectory you clicked.

- **Blue solid line**: Population P
- **Red dashed line**: Population Q

### Controls

**Show/Hide Vectors**: Toggle the vector field.

**Show/Hide Nullclines**: Toggle the nullclines.

**Start/Pause**: Start sets the orange grid particles flowing. Pause freezes them where they are, and Start resumes. (Clicked trajectories move whether or not Start is on.)

**Reset**: Clear all trajectories and particles.

**Animation Speed**: 0x–4x (default 1x). Changes how fast trajectories and particles move, not the model.

**Examples**: Load a preset (see above).

### Equilibrium Points Panel
Lists every equilibrium inside the window with its type, found from the eigenvalues of the Jacobian matrix at that point:
- **Stable node**: nearby trajectories approach without circling
- **Unstable node**: nearby trajectories move away without circling
- **Saddle**: trajectories approach along one direction and leave along another
- **Stable spiral**: trajectories spiral in (damped oscillations)
- **Unstable spiral**: trajectories spiral out (growing oscillations)
- **Center**: trajectories circle around on closed loops
- **Degenerate node** (stable or unstable): a node whose two eigenvalues are equal; trajectories approach (or leave) tangent to a single direction
- **Degenerate (det = 0)**: the linear test cannot decide; the equilibrium may not be isolated

The status panel below repeats the type of the equilibrium with both P and Q positive, if there is one.

## What to Observe

1. **Predator-prey oscillations**: With the Predator-Prey preset, click to start trajectories and watch the closed orbits and the oscillating time series.

2. **Competitive exclusion and bistability**: With the Competition preset, start trajectories on both sides of the saddle. Some end with only P, others with only Q.

3. **Stable coexistence**: With Cooperation (or your own parameters), find conditions where both species persist at a positive equilibrium.

4. **Changing the type of an equilibrium**: Change the parameters and watch an equilibrium change type, for example from a stable spiral to an unstable spiral. At the switch the equilibrium is a center. The two-species model never has a limit cycle (an isolated closed orbit): closed orbits only appear at a center, where all nearby orbits are closed.

5. **Nullcline geometry**: Turn on nullclines to see that the equilibria are exactly where a blue line meets a red line.
