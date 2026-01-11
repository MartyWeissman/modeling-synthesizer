# Muscle Tremor Simulator

## Overview

The Muscle Tremor Simulator models physiological tremor caused by delayed feedback in the neuromuscular reflex arc. [VERIFY: Physiological tremor occurs in all humans at frequencies typically between 8-12 Hz and is influenced by the time delay in neural signal transmission.]

The model uses a delay differential equation:
- **L'(t) = r(L_eq - L(t - τ))**

Where L is muscle length, L_eq is the equilibrium length (20 cm), r is the reflex magnitude, and τ is the neural time delay. The time delay creates the potential for oscillatory behavior - if the reflex responds to old information about muscle position, it can overshoot and create tremor.

## Parameters

### Initial Length (L₀)
- **Range**: 10 to 30 cm
- **Default**: 25 cm
- Starting muscle length at t=0
- Values above 20 cm start with the arm angled upward
- Values below 20 cm start with the arm angled downward

### Reflex Magnitude (r)
- **Range**: 0 to 100
- **Default**: 50
- Controls the strength of the corrective reflex response
- Higher values create faster corrections but may increase oscillation amplitude
- [VERIFY: In real muscles, reflex gain can be modulated by the nervous system]

### Time Delay (τ)
- **Range**: 0 to 30 ms
- **Default**: 10 ms
- Neural transmission delay in the reflex arc
- Longer delays increase the tendency for oscillation
- [VERIFY: Typical human reflex delays are 20-50 ms for spinal reflexes]

## Components

### Time Series Graph (Main Display)
- **X-axis**: Time from 0 to 2000 ms (2 seconds)
- **Y-axis**: Muscle length from 0 to 40 cm
- **Green curve**: Muscle length trajectory over time
- **Red dashed line**: Equilibrium length (L_eq = 20 cm)
- **Green dot**: Initial condition (L₀)
- **White/Black dot**: Current state at end of simulation
- **Shaded regions**: Invalid muscle lengths (< 10 cm or > 30 cm)

### Forearm Visualization (Right Panel)
- Animated arm showing muscle length as elbow angle
- Upper arm extends from top of panel
- Forearm rotates around elbow joint
- Horizontal position corresponds to L = 20 cm (equilibrium)
- Red fingertip dot shows hand position
- Play button animates the 2-second simulation in real time

### Oscillation Analysis (Bottom Right)
- **Period**: Time between oscillation peaks (in ms)
- **Frequency**: Oscillations per second (in Hz)
- Uses FFT analysis on the second half of simulation (1000-2000 ms)
- Displays "No oscillations detected" for stable, non-oscillating solutions

### Control Buttons
- **Play**: Start forearm animation synchronized with simulation
- **Reset**: Return forearm to initial position

## What to Observe

1. **Stability vs. Oscillation**: With small time delays (τ ≈ 0), the system smoothly approaches equilibrium. As τ increases, oscillations emerge and can persist indefinitely.

2. **Delay-Induced Instability**: Compare τ = 5 ms vs τ = 25 ms with the same reflex magnitude. Longer delays lead to larger amplitude oscillations because the reflex responds to outdated position information.

3. **Reflex Gain Effects**: With fixed delay, increasing r speeds up the return to equilibrium but can also amplify oscillations. There's a trade-off between responsiveness and stability.

4. **Physiological Tremor Frequencies**: Observe that oscillation frequencies typically fall in the 5-15 Hz range, similar to real physiological tremor. [VERIFY: Normal physiological tremor is typically 8-12 Hz]

5. **Critical Parameter Combinations**: Find parameter combinations where the system transitions from stable to oscillatory. This illustrates how small changes in neural delay or reflex gain can dramatically affect motor control.

6. **Forearm Animation**: Watch how the abstract time series translates to physical arm movement. Notice how tremor appears as rapid oscillation of the forearm.

## References

