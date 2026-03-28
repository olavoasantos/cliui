import {NAMED_COLORS} from '../constants/namedColors';

import type {RGBColor} from '../types';

/**
 * Parses a CSS color value into an RGB color object.
 *
 * Supports hex (`#rgb`, `#rrggbb`), `rgb(r, g, b)`, named colors,
 * and `inherit` / empty values (returns `null`).
 */
export function parseColor(value: string | undefined): RGBColor | null {
  if (value === undefined || value === '' || value === 'inherit') {
    return null;
  }

  const normalized = value.trim().toLowerCase();

  if (normalized in NAMED_COLORS) {
    return {...NAMED_COLORS[normalized]!};
  }

  const shortHexMatch = normalized.match(/^#([0-9a-f]{3})$/i);

  if (shortHexMatch !== null) {
    const [r, g, b] = shortHexMatch[1]!.split('');

    return {
      r: Number.parseInt(`${r}${r}`, 16),
      g: Number.parseInt(`${g}${g}`, 16),
      b: Number.parseInt(`${b}${b}`, 16),
    };
  }

  const hexMatch = normalized.match(/^#([0-9a-f]{6})$/i);

  if (hexMatch !== null) {
    return {
      r: Number.parseInt(hexMatch[1]!.slice(0, 2), 16),
      g: Number.parseInt(hexMatch[1]!.slice(2, 4), 16),
      b: Number.parseInt(hexMatch[1]!.slice(4, 6), 16),
    };
  }

  const rgbMatch = normalized.match(/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/);

  if (rgbMatch !== null) {
    return {
      r: clampChannel(Number.parseInt(rgbMatch[1]!, 10)),
      g: clampChannel(Number.parseInt(rgbMatch[2]!, 10)),
      b: clampChannel(Number.parseInt(rgbMatch[3]!, 10)),
    };
  }

  return null;
}

function clampChannel(value: number): number {
  return Math.min(255, Math.max(0, value));
}
