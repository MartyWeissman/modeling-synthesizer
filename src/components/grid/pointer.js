// src/components/grid/pointer.js

/**
 * Position of a mouse/pointer event relative to `element`'s top-left corner,
 * in the element's own (unscaled) CSS pixels.
 *
 * `event.clientX - rect.left` is in *screen* pixels, which differ from the
 * element's CSS pixels whenever an ancestor is scaled with a CSS transform
 * (ToolContainer scales tools down to fit narrow windows). Dividing by the
 * ratio rect.width / offsetWidth undoes that scale; at scale 1 this returns
 * exactly `clientX - rect.left`.
 */
export function localPointer(event, element) {
  const rect = element.getBoundingClientRect();
  const sx = rect.width > 0 && element.offsetWidth > 0 ? element.offsetWidth / rect.width : 1;
  const sy =
    rect.height > 0 && element.offsetHeight > 0 ? element.offsetHeight / rect.height : 1;
  return {
    x: (event.clientX - rect.left) * sx,
    y: (event.clientY - rect.top) * sy,
  };
}
