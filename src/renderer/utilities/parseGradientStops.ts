import {parseCSSFunction} from '../../css/utilities/parseCSSFunction';
import {parseColor} from './parseColor';

import type {RGBColor} from '../types';
import type {ColorStop} from './createLinearGradient';

/** Parsed result of a `linear-gradient()` CSS value. */
export interface ParsedGradient {
  /** CSS angle in degrees (default 180 = top to bottom). */
  angleDeg: number;
  /** Color stops with normalized positions (0.0–1.0). */
  stops: ColorStop[];
}

/**
 * Parses a `linear-gradient(...)` CSS value into an angle and color stops.
 *
 * Supports:
 * - `linear-gradient(#fff, #000)` — default 180° (top to bottom)
 * - `linear-gradient(90deg, #fff, #000)` — explicit angle
 * - `linear-gradient(#f00, #0f0, #00f)` — multi-stop, evenly distributed
 *
 * Returns `null` when the value is not a `linear-gradient()` or
 * contains fewer than 2 valid color stops.
 */
export function parseGradientStops(value: string): ParsedGradient | null {
  const fn = parseCSSFunction(value);

  if (fn === null || fn.name !== 'linear-gradient') {
    return null;
  }

  const parts = splitTopLevel(fn.args);
  let angleDeg = 180;
  let colorStartIndex = 0;

  /* Check if the first argument is an angle */
  const firstPart = parts[0]?.trim() ?? '';
  const angleMatch = firstPart.match(/^(-?\d+(?:\.\d+)?)\s*deg$/);

  if (angleMatch) {
    angleDeg = Number.parseFloat(angleMatch[1]!);
    colorStartIndex = 1;
  }

  const colors: RGBColor[] = [];

  for (let i = colorStartIndex; i < parts.length; i++) {
    const color = parseColor(parts[i]!.trim());

    if (color !== null) {
      colors.push(color);
    }
  }

  if (colors.length < 2) return null;

  /* Distribute stops evenly */
  const stops: ColorStop[] = colors.map((color, i) => ({
    color,
    position: colors.length === 1 ? 0 : i / (colors.length - 1),
  }));

  return {angleDeg, stops};
}

/**
 * Splits a string by commas that are not nested inside parentheses.
 */
function splitTopLevel(text: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;

  for (let i = 0; i < text.length; i++) {
    if (text[i] === '(') {
      depth++;
    } else if (text[i] === ')') {
      depth--;
    } else if (text[i] === ',' && depth === 0) {
      parts.push(text.slice(start, i));
      start = i + 1;
    }
  }

  parts.push(text.slice(start));

  return parts;
}
