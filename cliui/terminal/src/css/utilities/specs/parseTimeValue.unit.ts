import {describe, it, expect} from 'vitest';
import {parseTimeValue} from '../parseTimeValue';

describe('parseTimeValue', () => {
  it('parses millisecond values', () => {
    expect(parseTimeValue('200ms')).toBe(200);
    expect(parseTimeValue('0ms')).toBe(0);
    expect(parseTimeValue('1500ms')).toBe(1500);
  });

  it('parses second values', () => {
    expect(parseTimeValue('0.5s')).toBe(500);
    expect(parseTimeValue('1s')).toBe(1000);
    expect(parseTimeValue('2.5s')).toBe(2500);
  });

  it('returns 0 for invalid values', () => {
    expect(parseTimeValue('')).toBe(0);
    expect(parseTimeValue('abc')).toBe(0);
  });

  it('handles bare numbers as milliseconds', () => {
    expect(parseTimeValue('100')).toBe(100);
  });
});
