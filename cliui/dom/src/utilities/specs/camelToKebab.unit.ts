import {describe, expect, it} from 'vitest';

import {camelToKebab} from '../camelToKebab';

describe('camelToKebab', () => {
  it('converts a single uppercase letter', () => {
    expect(camelToKebab('aB')).toBe('a-b');
  });

  it('converts multiple uppercase letters', () => {
    expect(camelToKebab('backgroundColorRGB')).toBe('background-color-r-g-b');
  });

  it('returns lowercase strings unchanged', () => {
    expect(camelToKebab('margin')).toBe('margin');
  });

  it('handles leading uppercase for vendor prefixes', () => {
    expect(camelToKebab('WebkitLineClamp')).toBe('-webkit-line-clamp');
  });

  it('handles empty string', () => {
    expect(camelToKebab('')).toBe('');
  });
});
