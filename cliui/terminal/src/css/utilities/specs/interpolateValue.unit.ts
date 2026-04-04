import {describe, it, expect} from 'vitest';
import {interpolateValue} from '../interpolateValue';

describe('interpolateValue', () => {
  describe('color interpolation', () => {
    it('interpolates between two hex colors', () => {
      expect(interpolateValue('color', '#000000', '#ffffff', 0.5)).toBe('rgb(128, 128, 128)');
    });

    it('returns start color at progress 0', () => {
      expect(interpolateValue('color', '#ff0000', '#0000ff', 0)).toBe('rgb(255, 0, 0)');
    });

    it('returns end color at progress 1', () => {
      expect(interpolateValue('color', '#ff0000', '#0000ff', 1)).toBe('rgb(0, 0, 255)');
    });

    it('works for background-color', () => {
      expect(interpolateValue('background-color', '#000', '#fff', 0.5)).toBe('rgb(128, 128, 128)');
    });

    it('falls back to discrete for unparseable colors', () => {
      expect(interpolateValue('color', 'invalid', '#fff', 0.3)).toBe('invalid');
      expect(interpolateValue('color', 'invalid', '#fff', 0.7)).toBe('#fff');
    });
  });

  describe('number-cell interpolation (rounded)', () => {
    it('interpolates and rounds to integer', () => {
      expect(interpolateValue('width', '10', '20', 0.5)).toBe('15');
      expect(interpolateValue('width', '10', '20', 0.33)).toBe('13');
    });

    it('returns start at progress 0', () => {
      expect(interpolateValue('padding-top', '5', '15', 0)).toBe('5');
    });

    it('returns end at progress 1', () => {
      expect(interpolateValue('padding-top', '5', '15', 1)).toBe('15');
    });

    it('works for gap', () => {
      expect(interpolateValue('gap', '1', '5', 0.5)).toBe('3');
    });
  });

  describe('number-continuous interpolation', () => {
    it('interpolates without rounding', () => {
      const result = interpolateValue('opacity', '0', '1', 0.33);
      expect(parseFloat(result)).toBeCloseTo(0.33);
    });

    it('works for flex-grow', () => {
      const result = interpolateValue('flex-grow', '0', '2', 0.5);
      expect(parseFloat(result)).toBeCloseTo(1);
    });
  });

  describe('discrete interpolation', () => {
    it('snaps to start value below 50%', () => {
      expect(interpolateValue('display', 'flex', 'none', 0.49)).toBe('flex');
    });

    it('snaps to end value at 50%', () => {
      expect(interpolateValue('display', 'flex', 'none', 0.5)).toBe('none');
    });

    it('works for border-style', () => {
      expect(interpolateValue('border-style', 'single', 'rounded', 0.3)).toBe('single');
      expect(interpolateValue('border-style', 'single', 'rounded', 0.7)).toBe('rounded');
    });
  });

  describe('unknown properties', () => {
    it('defaults to discrete for unknown properties', () => {
      expect(interpolateValue('unknown-prop', 'a', 'b', 0.3)).toBe('a');
      expect(interpolateValue('unknown-prop', 'a', 'b', 0.7)).toBe('b');
    });
  });
});
