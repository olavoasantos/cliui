import {NAMED_COLORS} from '../constants/namedColors';

import type {RGBColor} from '../types';

/** Cache of previously parsed color values to avoid repeated regex matching. */
const COLOR_CACHE = new Map<string, RGBColor | null>();

/**
 * Parses a CSS color value into an RGB color object.
 *
 * Supports hex (`#rgb`, `#rrggbb`), `rgb(r, g, b)`, named colors,
 * and `inherit` / empty values (returns `null`).
 *
 * Results are cached by input string. Callers must not mutate
 * the returned object; they receive a fresh clone.
 */
export function parseColor(value: string | undefined): RGBColor | null {
  if (value === undefined || value === '' || value === 'inherit') {
    return null;
  }

  const cached = COLOR_CACHE.get(value);

  if (cached !== undefined) {
    return cached === null ? null : {r: cached.r, g: cached.g, b: cached.b};
  }

  const result = parseColorUncached(value);

  COLOR_CACHE.set(value, result);

  return result === null ? null : {r: result.r, g: result.g, b: result.b};
}

function parseColorUncached(value: string): RGBColor | null {
  const normalized = value.trim().toLowerCase();

  if (normalized in NAMED_COLORS) {
    return NAMED_COLORS[normalized]!;
  }

  if (normalized.charCodeAt(0) === 0x23 /* # */) {
    return parseHexColor(normalized);
  }

  if (normalized.length > 4 && normalized.charCodeAt(0) === 0x72 /* r */) {
    return parseRgbColor(normalized);
  }

  return null;
}

function parseHexColor(normalized: string): RGBColor | null {
  const len = normalized.length;

  if (len === 4) {
    const r = hexDigit(normalized.charCodeAt(1));
    const g = hexDigit(normalized.charCodeAt(2));
    const b = hexDigit(normalized.charCodeAt(3));

    if (r === -1 || g === -1 || b === -1) return null;

    return {r: r | (r << 4), g: g | (g << 4), b: b | (b << 4)};
  }

  if (len === 7) {
    const r =
      (hexDigit(normalized.charCodeAt(1)) << 4) | hexDigit(normalized.charCodeAt(2));
    const g =
      (hexDigit(normalized.charCodeAt(3)) << 4) | hexDigit(normalized.charCodeAt(4));
    const b =
      (hexDigit(normalized.charCodeAt(5)) << 4) | hexDigit(normalized.charCodeAt(6));

    if (r < 0 || g < 0 || b < 0) return null;

    return {r, g, b};
  }

  return null;
}

function parseRgbColor(normalized: string): RGBColor | null {
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

function hexDigit(code: number): number {
  if (code >= 0x30 && code <= 0x39) return code - 0x30;
  if (code >= 0x61 && code <= 0x66) return code - 0x61 + 10;
  if (code >= 0x41 && code <= 0x46) return code - 0x41 + 10;
  return -1;
}

function clampChannel(value: number): number {
  return Math.min(255, Math.max(0, value));
}
