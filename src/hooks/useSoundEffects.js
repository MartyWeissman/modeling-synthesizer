// src/hooks/useSoundEffects.js
// React hook for managing sound effects using Web Audio API

import { useRef, useCallback, useState } from "react";

/**
 * Hook for managing sound effects in modeling tools
 * Uses Web Audio API for synthesized sounds (no external files needed)
 *
 * @returns {Object} Sound control functions and state
 */
export const useSoundEffects = () => {
  const [volume, setVolume] = useState(0.5);
  const [isEnabled, setIsEnabled] = useState(false); // Default off
  const audioContextRef = useRef(null);
  const lastPlayTimeRef = useRef(0);

  // Initialize Web Audio API context lazily (on first use)
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext ||
        window.webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  /**
   * Rate limiter to prevent sound spam
   * @param {number} minInterval - Minimum ms between sounds
   */
  const shouldPlay = useCallback((minInterval = 50) => {
    const now = Date.now();
    if (now - lastPlayTimeRef.current < minInterval) {
      return false;
    }
    lastPlayTimeRef.current = now;
    return true;
  }, []);

  /**
   * Play a simple synthesized tone
   * @param {number} frequency - Frequency in Hz (200-2000 recommended)
   * @param {number} duration - Duration in seconds
   * @param {string} type - Oscillator type ('sine', 'square', 'triangle', 'sawtooth')
   * @param {number} volumeMultiplier - Additional volume scaling (0-1)
   */
  const playTone = useCallback(
    (frequency = 440, duration = 0.1, type = "sine", volumeMultiplier = 1) => {
      if (!isEnabled || !shouldPlay()) return;

      try {
        const ctx = getAudioContext();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.frequency.value = frequency;
        oscillator.type = type;

        // Gentle attack and exponential decay for smooth sound
        const maxVolume = volume * volumeMultiplier * 0.3; // Cap at 30% for safety
        gainNode.gain.setValueAtTime(maxVolume, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(
          0.01,
          ctx.currentTime + duration
        );

        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + duration);
      } catch (error) {
        console.warn("Sound playback failed:", error);
      }
    },
    [isEnabled, volume, shouldPlay, getAudioContext]
  );

  /**
   * Play two tones simultaneously (chord)
   * @param {number} freq1 - First frequency
   * @param {number} freq2 - Second frequency
   * @param {number} duration - Duration in seconds
   */
  const playChord = useCallback(
    (freq1 = 440, freq2 = 550, duration = 0.15) => {
      if (!isEnabled || !shouldPlay()) return;

      try {
        const ctx = getAudioContext();
        const maxVolume = volume * 0.2; // Lower for chords

        [freq1, freq2].forEach((freq) => {
          const oscillator = ctx.createOscillator();
          const gainNode = ctx.createGain();

          oscillator.connect(gainNode);
          gainNode.connect(ctx.destination);

          oscillator.frequency.value = freq;
          oscillator.type = "sine";

          gainNode.gain.setValueAtTime(maxVolume, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(
            0.01,
            ctx.currentTime + duration
          );

          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + duration);
        });
      } catch (error) {
        console.warn("Chord playback failed:", error);
      }
    },
    [isEnabled, volume, shouldPlay, getAudioContext]
  );

  /**
   * Play a chirp (frequency sweep)
   * @param {number} startFreq - Starting frequency
   * @param {number} endFreq - Ending frequency
   * @param {number} duration - Duration in seconds
   */
  const playChirp = useCallback(
    (startFreq = 200, endFreq = 400, duration = 0.1) => {
      if (!isEnabled || !shouldPlay()) return;

      try {
        const ctx = getAudioContext();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.type = "sine";

        // Frequency sweep
        oscillator.frequency.setValueAtTime(startFreq, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(
          endFreq,
          ctx.currentTime + duration
        );

        // Volume envelope
        const maxVolume = volume * 0.25;
        gainNode.gain.setValueAtTime(maxVolume, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(
          0.01,
          ctx.currentTime + duration
        );

        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + duration);
      } catch (error) {
        console.warn("Chirp playback failed:", error);
      }
    },
    [isEnabled, volume, shouldPlay, getAudioContext]
  );

  // Pre-defined common sound effects
  const sounds = {
    // Collision/impact sounds
    collisionPing: useCallback(() => playTone(800, 0.05, "sine", 0.8), [
      playTone,
    ]),
    softBounce: useCallback(() => playTone(400, 0.08, "triangle", 0.7), [
      playTone,
    ]),
    hardBounce: useCallback(() => playTone(600, 0.06, "square", 0.6), [
      playTone,
    ]),

    // UI interaction sounds
    click: useCallback(() => playTone(300, 0.03, "square", 0.5), [playTone]),
    softClick: useCallback(() => playTone(200, 0.03, "sine", 0.5), [playTone]),
    buttonPress: useCallback(() => playTone(500, 0.04, "triangle", 0.6), [
      playTone,
    ]),

    // State change sounds
    start: useCallback(() => playChirp(200, 400, 0.15), [playChirp]),
    stop: useCallback(() => playChirp(400, 200, 0.15), [playChirp]),
    success: useCallback(() => playChord(523, 659, 0.2), [playChord]), // C + E
    error: useCallback(() => playChord(220, 233, 0.15), [playChord]), // A + A#

    // Data/calculation sounds
    dataPoint: useCallback(() => playTone(500, 0.04, "sine", 0.6), [playTone]),
    calculation: useCallback(() => playTone(700, 0.06, "triangle", 0.5), [
      playTone,
    ]),

    // Oscillator/equilibrium sounds
    equilibrium: useCallback(() => playChord(440, 554, 0.25), [playChord]), // A + C#
    oscillation: useCallback(() => playTone(600, 0.08, "sine", 0.4), [
      playTone,
    ]),
  };

  return {
    // State
    volume,
    setVolume,
    isEnabled,
    setIsEnabled,

    // Low-level functions
    playTone,
    playChord,
    playChirp,

    // Pre-defined sounds
    ...sounds,
  };
};
