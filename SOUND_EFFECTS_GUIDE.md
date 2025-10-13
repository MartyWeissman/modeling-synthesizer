# Sound Effects Guide

## Overview

The Modeling Synthesizer includes a lightweight sound system built on the Web Audio API. This system provides non-jarring audio feedback for interactive simulations without requiring external audio files.

## Quick Start

### 1. Import Components and Hook

```jsx
import { useSoundEffects } from "../hooks/useSoundEffects";
import { GridSound } from "../components/grid";
```

### 2. Initialize Sound in Your Tool

```jsx
const YourTool = () => {
  const { theme } = useTheme();
  const { 
    volume, 
    setVolume, 
    isEnabled, 
    setIsEnabled, 
    collisionPing  // Pre-defined sound effect
  } = useSoundEffects();

  // Your tool logic...
};
```

### 3. Add GridSound Control Component

```jsx
return (
  <ToolContainer canvasWidth={8} canvasHeight={5}>
    {/* Your existing components */}
    
    {/* Sound control in bottom corner */}
    <GridSound
      x={7}
      y={4}
      theme={theme}
      onVolumeChange={setVolume}
      onEnabledChange={setIsEnabled}
    />
  </ToolContainer>
);
```

### 4. Trigger Sounds on Events

```jsx
const handleCollision = () => {
  // Play collision sound
  collisionPing();
  
  // Your collision logic...
};
```

## Complete Example: Self-Interaction Simulator

Here's how to add collision sounds to the Self-Interaction Simulator:

```jsx
import React, { useState, useCallback } from "react";
import { useSoundEffects } from "../hooks/useSoundEffects";
import { GridWindow, GridButton, GridSound } from "../components/grid";
import ToolContainer from "../components/ui/ToolContainer";
import { useTheme } from "../hooks/useTheme";

const SelfInteractionSimulatorTool = () => {
  const { theme } = useTheme();
  
  // Sound effects setup
  const { 
    volume, 
    setVolume, 
    isEnabled, 
    setIsEnabled, 
    collisionPing,
    start: startSound,
    stop: stopSound
  } = useSoundEffects();

  // Collision detection (modified)
  const checkCollisions = useCallback(() => {
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const distance = getDistance(particles[i], particles[j]);
        
        if (distance < PARTICLE_SIZE && !hitMatrix[i][j]) {
          hitMatrix[i][j] = true;
          hits++;
          
          // Play collision sound!
          collisionPing();
          
          // Create firework...
        }
      }
    }
  }, [collisionPing]);

  // Button handlers with sounds
  const handleStart = useCallback(() => {
    startSound(); // Ascending chirp
    // Start simulation...
  }, [startSound]);

  const handleStop = useCallback(() => {
    stopSound(); // Descending chirp
    // Stop simulation...
  }, [stopSound]);

  return (
    <ToolContainer canvasWidth={7} canvasHeight={5}>
      <GridWindow x={0} y={0} w={4} h={4} variant="circular" theme={theme}>
        {/* Canvas */}
      </GridWindow>

      <GridButton x={4} y={0} onPress={handleStart}>Start</GridButton>
      <GridButton x={5} y={0} onPress={handleStop}>Stop</GridButton>
      
      {/* Sound control */}
      <GridSound
        x={6}
        y={4}
        theme={theme}
        onVolumeChange={setVolume}
        onEnabledChange={setIsEnabled}
      />
    </ToolContainer>
  );
};
```

## Available Sound Effects

### Pre-defined Sounds (from `useSoundEffects`)

```javascript
// Collision/impact
collisionPing()      // High-pitched ping (800Hz, 50ms)
softBounce()         // Gentle bounce (400Hz, 80ms)
hardBounce()         // Sharp bounce (600Hz, 60ms)

// UI interactions
click()              // Generic click (300Hz, 30ms)
softClick()          // Gentle click (200Hz, 30ms)
buttonPress()        // Button feedback (500Hz, 40ms)

// State changes
start()              // Rising chirp (200→400Hz)
stop()               // Falling chirp (400→200Hz)
success()            // C+E chord (523+659Hz)
error()              // Dissonant A+A# (220+233Hz)

// Data/calculations
dataPoint()          // Point added (500Hz, 40ms)
calculation()        // Calculation done (700Hz, 60ms)

// Oscillator/equilibrium
equilibrium()        // A+C# chord (440+554Hz)
oscillation()        // Periodic tone (600Hz, 80ms)
```

### Custom Sounds

```javascript
const { playTone, playChord, playChirp } = useSoundEffects();

// Custom tone
playTone(
  frequency,      // Hz (200-2000 recommended)
  duration,       // seconds (keep < 0.15)
  type,           // 'sine', 'triangle', 'square', 'sawtooth'
  volumeMultiplier // 0-1 additional scaling
);

// Custom chord (two frequencies)
playChord(freq1, freq2, duration);

// Custom chirp (frequency sweep)
playChirp(startFreq, endFreq, duration);
```

## Sound Presets

For more organized sound management, use the preset system:

```javascript
import { SOUND_PRESETS, applyPreset } from "../utils/soundPresets";
import { useSoundEffects } from "../hooks/useSoundEffects";

const { playTone } = useSoundEffects();

// Apply a preset
applyPreset(playTone, SOUND_PRESETS.collision);
applyPreset(playTone, SOUND_PRESETS.equilibriumReached);
```

### Available Presets

See `src/utils/soundPresets.js` for complete list:

- **Particle physics**: collision, bounce
- **Population dynamics**: birth, death
- **Chemical/molecular**: reaction, catalysis
- **System states**: equilibriumReached, thresholdCrossed
- **UI interactions**: parameterChange, dataPointAdded, calculationComplete

## Tool-Specific Sound Profiles

Pre-configured sound mappings for different tool types:

```javascript
import { TOOL_SOUND_PROFILES } from "../utils/soundPresets";

// For particle simulations
const profile = TOOL_SOUND_PROFILES.particleSimulation;
// Includes: collision, boundaryBounce, start, stop

// Other profiles available:
// - populationDynamics
// - chemicalKinetics
// - dataVisualization
// - oscillatorTools
```

## Best Practices

### 1. Volume and Frequency

- **Always cap volume** at 30% (built into hook)
- **Use pleasant frequencies**: 200-2000 Hz range
- **Keep sounds brief**: Under 150ms duration
- **Lower volume for chords**: Multiple tones are louder

### 2. Rate Limiting

The hook automatically prevents sound spam (minimum 50ms between sounds). For events that fire rapidly:

```javascript
// Collision detection runs every frame, but sounds are rate-limited
const checkCollisions = () => {
  particles.forEach(p => {
    if (colliding(p)) {
      collisionPing(); // Only plays if >50ms since last sound
    }
  });
};
```

### 3. User Control

- **Default to OFF**: `initialEnabled={false}` in GridSound
- **Always provide volume control**: GridSound includes slider
- **Respect user settings**: Hook manages enabled/disabled state

### 4. Accessibility

```javascript
// Check user preferences for reduced motion
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  // Consider disabling sounds or using gentler effects
  setIsEnabled(false);
}
```

### 5. Theme Integration

GridSound automatically adapts to light/dark/unicorn themes. No additional work needed!

## Troubleshooting

### Sounds not playing?

1. **Check browser console** for Web Audio API errors
2. **User interaction required**: Some browsers block audio until user interaction
3. **Check isEnabled state**: Default is `false`
4. **Volume level**: Check both hook volume and GridSound slider

### Sounds too loud/jarring?

1. **Reduce volumeMultiplier** in playTone calls
2. **Lower frequency**: Use 300-600 Hz range for gentler tones
3. **Shorter duration**: Try 30-50ms
4. **Use sine waves**: Smoother than square/sawtooth

### Performance issues?

1. **Rate limiting is active**: Sounds won't spam
2. **Web Audio API is efficient**: Minimal CPU impact
3. **No external files**: Everything is synthesized

## Advanced: Creating New Presets

Add to `src/utils/soundPresets.js`:

```javascript
export const SOUND_PRESETS = {
  // ... existing presets
  
  myCustomSound: {
    frequency: 650,
    duration: 0.07,
    type: "triangle",
    volume: 0.6,
    description: "My custom sound for X event",
  },
};
```

Then use it:

```javascript
import { SOUND_PRESETS, applyPreset } from "../utils/soundPresets";

const { playTone } = useSoundEffects();
applyPreset(playTone, SOUND_PRESETS.myCustomSound);
```

## Future Enhancements

Potential additions (not yet implemented):

- Loading external audio files (MP3/OGG)
- More complex synthesis (FM, AM modulation)
- Spatial audio for 2D positioning
- Recording/playback of sound sequences
- MIDI note support for musical tools

## Files Reference

- `src/components/grid/GridSound.jsx` - 1x1 sound control component
- `src/hooks/useSoundEffects.js` - Main sound effects hook
- `src/utils/soundPresets.js` - Pre-defined sound presets
- `SOUND_EFFECTS_GUIDE.md` - This documentation

## License

Sound system is part of Modeling Synthesizer
MIT License - Martin H. Weissman, 2025
