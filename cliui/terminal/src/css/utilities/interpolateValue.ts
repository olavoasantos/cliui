import {ANIMATABLE_PROPERTIES} from '../constants/animatableProperties';
import {parseColor} from '../../renderer/utilities/parseColor';
import {lerpColor} from '../../renderer/utilities/lerpColor';

/**
 * Interpolates between two CSS property values at a given progress.
 *
 * Dispatches to the appropriate interpolation method based on the property's
 * classification in the animatable property registry: color (RGB lerp),
 * number-cell (linear + round), number-continuous (linear), or discrete (snap at 50%).
 *
 * @param property - The CSS property name.
 * @param startValue - The start value as a CSS string.
 * @param endValue - The end value as a CSS string.
 * @param progress - Interpolation progress (0–1), typically already eased.
 * @returns The interpolated value as a CSS string.
 */
export function interpolateValue(
  property: string,
  startValue: string,
  endValue: string,
  progress: number,
): string {
  const type = ANIMATABLE_PROPERTIES[property] ?? 'discrete';

  switch (type) {
    case 'color':
      return interpolateColor(startValue, endValue, progress);
    case 'number-cell':
      return interpolateNumber(startValue, endValue, progress, true);
    case 'number-continuous':
      return interpolateNumber(startValue, endValue, progress, false);
    case 'discrete':
      return progress < 0.5 ? startValue : endValue;
  }
}

function interpolateColor(startValue: string, endValue: string, progress: number): string {
  const from = parseColor(startValue);
  const to = parseColor(endValue);

  if (!from || !to) {
    return progress < 0.5 ? startValue : endValue;
  }

  const result = lerpColor(from, to, progress);
  return `rgb(${result.r}, ${result.g}, ${result.b})`;
}

function interpolateNumber(
  startValue: string,
  endValue: string,
  progress: number,
  round: boolean,
): string {
  const startNum = parseFloat(startValue);
  const endNum = parseFloat(endValue);

  if (Number.isNaN(startNum) || Number.isNaN(endNum)) {
    return progress < 0.5 ? startValue : endValue;
  }

  const result = startNum + (endNum - startNum) * progress;
  return round ? String(Math.round(result)) : String(result);
}
