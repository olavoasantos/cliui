import {lerpColor} from './lerpColor';

import type {RGBColor} from '../types';
import type {ColorStop} from '../types/ColorStop';

/**
 * Creates a function that samples a CSS `linear-gradient` at any `(x, y)`
 * coordinate within a bounding box.
 *
 * The math follows the W3C specification for CSS linear gradients:
 *
 * 1. CSS angles start at 12 o'clock and rotate clockwise (0° = to top,
 *    90° = to right, 180° = to bottom).
 * 2. The gradient line passes through the center of the box. Its length
 *    is determined by projecting the box corners onto the direction vector.
 * 3. Each `(x, y)` coordinate is projected onto the gradient line via a
 *    dot product to determine its position along the gradient.
 *
 * @param angleDeg - CSS angle in degrees.
 * @param stops - Color stops with normalized positions (0.0–1.0).
 * @param width - Width of the bounding box.
 * @param height - Height of the bounding box.
 * @returns A sampler function: `(x, y) => RGBColor`.
 */
export function createLinearGradient(
  angleDeg: number,
  stops: ColorStop[],
  width: number,
  height: number,
): (x: number, y: number) => RGBColor {
  const sorted = [...stops].sort((a, b) => a.position - b.position);

  const angleRad = (angleDeg * Math.PI) / 180;
  const ux = Math.sin(angleRad);
  const uy = -Math.cos(angleRad);

  const cx = width / 2;
  const cy = height / 2;

  /* Half-length of the gradient line (center to edge projection). */
  const L = (width / 2) * Math.abs(ux) + (height / 2) * Math.abs(uy);

  return function sampleAt(x: number, y: number): RGBColor {
    const p = (x - cx) * ux + (y - cy) * uy;
    const t = L === 0 ? 0.5 : (p + L) / (2 * L);

    if (t <= sorted[0]!.position) return sorted[0]!.color;
    if (t >= sorted[sorted.length - 1]!.position) return sorted[sorted.length - 1]!.color;

    for (let i = 0; i < sorted.length - 1; i++) {
      const start = sorted[i]!;
      const end = sorted[i + 1]!;

      if (t >= start.position && t <= end.position) {
        const range = end.position - start.position;

        if (range === 0) return end.color;

        return lerpColor(start.color, end.color, (t - start.position) / range);
      }
    }

    return sorted[0]!.color;
  };
}
