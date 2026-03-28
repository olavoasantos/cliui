import type {RGBColor} from '../types';

/**
 * Linearly interpolates between two RGB colors.
 *
 * @param from - Start color.
 * @param to - End color.
 * @param factor - Interpolation factor (0 = `from`, 1 = `to`).
 * @returns The interpolated color with channels clamped to 0–255.
 */
export function lerpColor(from: RGBColor, to: RGBColor, factor: number): RGBColor {
  const t = Math.max(0, Math.min(1, factor));

  return {
    r: Math.round(from.r + (to.r - from.r) * t),
    g: Math.round(from.g + (to.g - from.g) * t),
    b: Math.round(from.b + (to.b - from.b) * t),
  };
}
