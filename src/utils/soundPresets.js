// src/utils/soundPresets.js
// Pre-defined sound effect presets for common modeling tool scenarios

/**
 * Sound effect presets for different biological/physical scenarios
 *
 * Each preset defines:
 * - frequency: Base frequency in Hz (200-2000 is pleasant range)
 * - duration: Length in seconds (keep under 0.15 for non-jarring)
 * - type: Waveform ('sine', 'triangle', 'square', 'sawtooth')
 * - volume: Additional volume multiplier (0-1)
 *
 * Usage with useSoundEffects hook:
 * const { playTone } = useSoundEffects();
 * playTone(...Object.values(SOUND_PRESETS.collision));
 */

export const SOUND_PRESETS = {
  // Particle physics
  collision: {
    frequency: 800,
    duration: 0.05,
    type: "sine",
    volume: 0.8,
    description: "High-pitched ping for particle collisions",
  },

  bounce: {
    frequency: 400,
    duration: 0.08,
    type: "triangle",
    volume: 0.7,
    description: "Soft bounce for boundary reflections",
  },

  // Population dynamics
  birth: {
    frequency: 600,
    duration: 0.06,
    type: "sine",
    volume: 0.6,
    description: "Gentle tone for population increase",
  },

  death: {
    frequency: 300,
    duration: 0.08,
    type: "triangle",
    volume: 0.5,
    description: "Lower tone for population decrease",
  },

  // Chemical/molecular events
  reaction: {
    frequency: 700,
    duration: 0.05,
    type: "sine",
    volume: 0.6,
    description: "Quick blip for chemical reactions",
  },

  catalysis: {
    frequency: 900,
    duration: 0.04,
    type: "triangle",
    volume: 0.5,
    description: "Sharp click for enzyme catalysis",
  },

  // System states
  equilibriumReached: {
    frequency: 440, // A note
    duration: 0.2,
    type: "sine",
    volume: 0.7,
    description: "Sustained tone for reaching equilibrium",
  },

  thresholdCrossed: {
    frequency: 800,
    duration: 0.1,
    type: "square",
    volume: 0.6,
    description: "Alert for crossing critical threshold",
  },

  // UI interactions
  parameterChange: {
    frequency: 300,
    duration: 0.03,
    type: "square",
    volume: 0.5,
    description: "Soft click for parameter adjustments",
  },

  dataPointAdded: {
    frequency: 500,
    duration: 0.04,
    type: "sine",
    volume: 0.6,
    description: "Gentle blip when adding data points",
  },

  calculationComplete: {
    frequency: 650,
    duration: 0.08,
    type: "triangle",
    volume: 0.7,
    description: "Success tone for completed calculations",
  },
};

/**
 * Chord presets (two frequencies played simultaneously)
 */
export const CHORD_PRESETS = {
  success: {
    freq1: 523, // C
    freq2: 659, // E
    duration: 0.2,
    description: "Major third chord for success/completion",
  },

  warning: {
    freq1: 440, // A
    freq2: 466, // A#
    duration: 0.15,
    description: "Dissonant interval for warnings",
  },

  equilibrium: {
    freq1: 440, // A
    freq2: 554, // C#
    duration: 0.25,
    description: "Perfect fourth for equilibrium states",
  },

  harmonicOscillation: {
    freq1: 440, // A
    freq2: 880, // A (octave)
    duration: 0.15,
    description: "Octave for harmonic oscillations",
  },
};

/**
 * Chirp presets (frequency sweeps)
 */
export const CHIRP_PRESETS = {
  ascending: {
    startFreq: 200,
    endFreq: 400,
    duration: 0.1,
    description: "Rising chirp for starting simulations",
  },

  descending: {
    startFreq: 400,
    endFreq: 200,
    duration: 0.1,
    description: "Falling chirp for stopping simulations",
  },

  alert: {
    startFreq: 800,
    endFreq: 400,
    duration: 0.08,
    description: "Rapid descending alert",
  },

  growth: {
    startFreq: 300,
    endFreq: 600,
    duration: 0.15,
    description: "Slower rise for population/exponential growth",
  },
};

/**
 * Tool-specific sound profiles
 * Maps tool types to appropriate sound events
 */
export const TOOL_SOUND_PROFILES = {
  particleSimulation: {
    collision: SOUND_PRESETS.collision,
    boundaryBounce: SOUND_PRESETS.bounce,
    start: CHIRP_PRESETS.ascending,
    stop: CHIRP_PRESETS.descending,
  },

  populationDynamics: {
    birth: SOUND_PRESETS.birth,
    death: SOUND_PRESETS.death,
    equilibrium: CHORD_PRESETS.equilibrium,
    extinction: CHIRP_PRESETS.descending,
  },

  chemicalKinetics: {
    reaction: SOUND_PRESETS.reaction,
    catalysis: SOUND_PRESETS.catalysis,
    equilibrium: CHORD_PRESETS.equilibrium,
    saturation: SOUND_PRESETS.thresholdCrossed,
  },

  dataVisualization: {
    addPoint: SOUND_PRESETS.dataPointAdded,
    calculate: SOUND_PRESETS.calculationComplete,
    clear: CHIRP_PRESETS.descending,
  },

  oscillatorTools: {
    start: CHIRP_PRESETS.ascending,
    stop: CHIRP_PRESETS.descending,
    equilibrium: CHORD_PRESETS.equilibrium,
    oscillation: SOUND_PRESETS.oscillation,
  },
};

/**
 * Accessibility considerations
 */
export const ACCESSIBILITY_SETTINGS = {
  // Maximum safe volume (30% of full scale)
  MAX_VOLUME: 0.3,

  // Minimum time between sounds to prevent overwhelming
  MIN_SOUND_INTERVAL_MS: 50,

  // Frequency range for pleasant, non-jarring sounds
  SAFE_FREQUENCY_RANGE: {
    min: 200,
    max: 2000,
  },

  // Maximum duration to keep sounds brief
  MAX_DURATION: 0.25,
};

/**
 * Helper function to apply a preset
 * @param {Function} playTone - The playTone function from useSoundEffects
 * @param {Object} preset - A preset from SOUND_PRESETS
 */
export const applyPreset = (playTone, preset) => {
  if (!preset) return;
  playTone(preset.frequency, preset.duration, preset.type, preset.volume);
};

/**
 * Helper function to apply a chord preset
 * @param {Function} playChord - The playChord function from useSoundEffects
 * @param {Object} preset - A preset from CHORD_PRESETS
 */
export const applyChordPreset = (playChord, preset) => {
  if (!preset) return;
  playChord(preset.freq1, preset.freq2, preset.duration);
};

/**
 * Helper function to apply a chirp preset
 * @param {Function} playChirp - The playChirp function from useSoundEffects
 * @param {Object} preset - A preset from CHIRP_PRESETS
 */
export const applyChirpPreset = (playChirp, preset) => {
  if (!preset) return;
  playChirp(preset.startFreq, preset.endFreq, preset.duration);
};
