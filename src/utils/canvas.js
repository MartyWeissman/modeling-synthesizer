// src/utils/canvas.js
// HiDPI-aware canvas setup. Draw in CSS pixels; the backing store is scaled by
// devicePixelRatio so lines and text are sharp on Retina screens.

/**
 * Size a canvas's backing store to its displayed CSS size × devicePixelRatio
 * and scale the 2D context so drawing code can keep using CSS-pixel coordinates.
 *
 * Returns { ctx, width, height, dpr } where width/height are in CSS pixels.
 * Safe to call repeatedly (e.g. before every redraw): it only resizes when needed,
 * and always resets the transform.
 *
 * Options:
 *   width/height: explicit CSS size to use instead of measuring the element.
 */
export function setupCanvas(canvas, options = {}) {
  if (!canvas) return null;
  const dpr = (typeof window !== "undefined" && window.devicePixelRatio) || 1;
  let width = options.width;
  let height = options.height;
  if (width === undefined || height === undefined) {
    // Use layout size (unaffected by CSS transforms such as ToolContainer's
    // scale-to-fit); fall back to the bounding rect if layout size is 0.
    let w = canvas.offsetWidth;
    let h = canvas.offsetHeight;
    if (!w || !h) {
      const rect = canvas.getBoundingClientRect();
      w = w || rect.width;
      h = h || rect.height;
    }
    width = width ?? w;
    height = height ?? h;
  }
  width = Math.max(1, Math.round(width));
  height = Math.max(1, Math.round(height));
  const bw = Math.round(width * dpr);
  const bh = Math.round(height * dpr);
  if (canvas.width !== bw || canvas.height !== bh) {
    canvas.width = bw;
    canvas.height = bh;
  }
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  // Remember CSS size for code that reads it later.
  canvas._cssWidth = width;
  canvas._cssHeight = height;
  return { ctx, width, height, dpr };
}

/** CSS-pixel size of a canvas previously set up with setupCanvas (or measured). */
export function canvasCssSize(canvas) {
  if (!canvas) return { width: 0, height: 0 };
  if (canvas._cssWidth) return { width: canvas._cssWidth, height: canvas._cssHeight };
  if (canvas.offsetWidth) return { width: canvas.offsetWidth, height: canvas.offsetHeight };
  const rect = canvas.getBoundingClientRect();
  return { width: rect.width, height: rect.height };
}

/** Clear a canvas regardless of its current transform. */
export function clearCanvas(canvas) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
}
