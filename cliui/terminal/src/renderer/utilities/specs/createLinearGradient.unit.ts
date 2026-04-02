import {describe, expect, it} from 'vitest';
import {createLinearGradient} from '../createLinearGradient';

describe('createLinearGradient', () => {
  it('returns the start color at the top for a 180deg gradient', () => {
    const sample = createLinearGradient(
      180,
      [
        {color: {r: 255, g: 0, b: 0}, position: 0},
        {color: {r: 0, g: 0, b: 255}, position: 1},
      ],
      10,
      10,
    );

    expect(sample(5, 0)).toEqual({r: 255, g: 0, b: 0});
  });

  it('returns the end color at the bottom for a 180deg gradient', () => {
    const sample = createLinearGradient(
      180,
      [
        {color: {r: 255, g: 0, b: 0}, position: 0},
        {color: {r: 0, g: 0, b: 255}, position: 1},
      ],
      10,
      10,
    );

    const bottom = sample(5, 10);
    // Should be very close to the end color
    expect(bottom.b).toBeGreaterThan(200);
    expect(bottom.r).toBeLessThan(55);
  });

  it('interpolates at the midpoint', () => {
    const sample = createLinearGradient(
      180,
      [
        {color: {r: 0, g: 0, b: 0}, position: 0},
        {color: {r: 100, g: 100, b: 100}, position: 1},
      ],
      10,
      10,
    );

    const mid = sample(5, 5);
    expect(mid.r).toBeGreaterThan(40);
    expect(mid.r).toBeLessThan(60);
  });

  it('produces a left-to-right gradient at 90deg', () => {
    const sample = createLinearGradient(
      90,
      [
        {color: {r: 255, g: 0, b: 0}, position: 0},
        {color: {r: 0, g: 0, b: 255}, position: 1},
      ],
      200,
      100,
    );

    expect(sample(0, 50)).toEqual({r: 255, g: 0, b: 0});
    expect(sample(200, 50)).toEqual({r: 0, g: 0, b: 255});
  });

  it('returns consistent colors along the perpendicular axis', () => {
    const sample = createLinearGradient(
      90,
      [
        {color: {r: 255, g: 0, b: 0}, position: 0},
        {color: {r: 0, g: 0, b: 255}, position: 1},
      ],
      100,
      50,
    );

    const a = sample(50, 0);
    const b = sample(50, 25);
    const c = sample(50, 49);

    expect(a).toEqual(b);
    expect(b).toEqual(c);
  });
});
