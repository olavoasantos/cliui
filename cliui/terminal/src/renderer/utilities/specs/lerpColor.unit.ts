import {describe, expect, it} from 'vitest';
import {lerpColor} from '../lerpColor';

describe('lerpColor', () => {
  it('returns the start color at factor 0', () => {
    expect(lerpColor({r: 255, g: 0, b: 0}, {r: 0, g: 0, b: 255}, 0)).toEqual({
      r: 255,
      g: 0,
      b: 0,
    });
  });

  it('returns the end color at factor 1', () => {
    expect(lerpColor({r: 255, g: 0, b: 0}, {r: 0, g: 0, b: 255}, 1)).toEqual({
      r: 0,
      g: 0,
      b: 255,
    });
  });

  it('returns the midpoint at factor 0.5', () => {
    expect(lerpColor({r: 0, g: 0, b: 0}, {r: 100, g: 200, b: 50}, 0.5)).toEqual({
      r: 50,
      g: 100,
      b: 25,
    });
  });

  it('clamps factor below 0 to the start color', () => {
    expect(lerpColor({r: 100, g: 100, b: 100}, {r: 200, g: 200, b: 200}, -1)).toEqual({
      r: 100,
      g: 100,
      b: 100,
    });
  });

  it('clamps factor above 1 to the end color', () => {
    expect(lerpColor({r: 100, g: 100, b: 100}, {r: 200, g: 200, b: 200}, 2)).toEqual({
      r: 200,
      g: 200,
      b: 200,
    });
  });

  it('rounds channel values to integers', () => {
    const result = lerpColor({r: 0, g: 0, b: 0}, {r: 255, g: 255, b: 255}, 1 / 3);

    expect(result.r).toBe(85);
    expect(result.g).toBe(85);
    expect(result.b).toBe(85);
  });
});
