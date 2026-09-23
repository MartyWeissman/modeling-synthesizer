// src/hooks/useAnimationLoop.js
// A single, guarded requestAnimationFrame loop that always calls the LATEST
// version of your frame callback (no stale closures), can never run twice,
// and passes real elapsed time so speed does not depend on the display's
// refresh rate.
//
// Usage:
//   const loop = useAnimationLoop((dtSeconds, now) => {
//     // advance physics by dtSeconds (already clamped to <= maxDt), draw
//     // return false to stop the loop automatically (e.g. nothing left to animate)
//   });
//   loop.start();  loop.stop();  loop.isRunning();
//
// The loop stops automatically on unmount.

import { useCallback, useEffect, useRef } from "react";

export function useAnimationLoop(onFrame, { maxDt = 0.05 } = {}) {
  const callbackRef = useRef(onFrame);
  const idRef = useRef(null);
  const lastRef = useRef(null);

  // Always call the latest callback.
  useEffect(() => {
    callbackRef.current = onFrame;
  });

  const tick = useCallback(
    (now) => {
      const last = lastRef.current ?? now;
      lastRef.current = now;
      const dt = Math.min(maxDt, Math.max(0, (now - last) / 1000));
      const keepGoing = callbackRef.current?.(dt, now);
      if (keepGoing === false) {
        idRef.current = null;
        lastRef.current = null;
        return;
      }
      if (idRef.current !== null) idRef.current = requestAnimationFrame(tick);
    },
    [maxDt],
  );

  const start = useCallback(() => {
    if (idRef.current !== null) return; // already running — never start twice
    lastRef.current = null;
    idRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const stop = useCallback(() => {
    if (idRef.current !== null) cancelAnimationFrame(idRef.current);
    idRef.current = null;
    lastRef.current = null;
  }, []);

  const isRunning = useCallback(() => idRef.current !== null, []);

  useEffect(() => stop, [stop]);

  return { start, stop, isRunning };
}

export default useAnimationLoop;
