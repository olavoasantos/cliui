import {parseCSSFunction} from '../../css/utilities/parseCSSFunction';
import {parseColor} from './parseColor';

import type {RGBColor} from '../types';

/**
 * Parses a `linear-gradient(color1, color2, ...)` CSS value into an
 * array of RGB color stops.
 *
 * Returns `null` when the value is not a `linear-gradient()` call or
 * contains no valid color stops.
 */
export function parseGradientStops(value: string): RGBColor[] | null {
  const fn = parseCSSFunction(value);

  if (fn === null || fn.name !== 'linear-gradient') {
    return null;
  }

  const stops: RGBColor[] = [];

  for (const part of splitTopLevel(fn.args)) {
    const color = parseColor(part.trim());

    if (color !== null) {
      stops.push(color);
    }
  }

  return stops.length >= 2 ? stops : null;
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
