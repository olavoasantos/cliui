import {describe, expect, it} from 'vitest';
import {parseGradientStops} from '../parseGradientStops';

describe('parseGradientStops', () => {
  it('returns null for a plain color value', () => {
    expect(parseGradientStops('#ff0000')).toBeNull();
    expect(parseGradientStops('red')).toBeNull();
  });

  it('parses a two-stop gradient with hex colors', () => {
    const stops = parseGradientStops('linear-gradient(#ff0000, #0000ff)');

    expect(stops).toEqual([
      {r: 255, g: 0, b: 0},
      {r: 0, g: 0, b: 255},
    ]);
  });

  it('parses a three-stop gradient', () => {
    const stops = parseGradientStops('linear-gradient(#ff0000, #00ff00, #0000ff)');

    expect(stops).toHaveLength(3);
    expect(stops![0]).toEqual({r: 255, g: 0, b: 0});
    expect(stops![1]).toEqual({r: 0, g: 255, b: 0});
    expect(stops![2]).toEqual({r: 0, g: 0, b: 255});
  });

  it('parses named colors as stops', () => {
    const stops = parseGradientStops('linear-gradient(red, blue)');

    expect(stops).not.toBeNull();
    expect(stops).toHaveLength(2);
  });

  it('parses rgb() colors as stops', () => {
    const stops = parseGradientStops('linear-gradient(rgb(100, 200, 50), rgb(0, 0, 0))');

    expect(stops).toEqual([
      {r: 100, g: 200, b: 50},
      {r: 0, g: 0, b: 0},
    ]);
  });

  it('returns null for a single-stop gradient', () => {
    expect(parseGradientStops('linear-gradient(#ff0000)')).toBeNull();
  });

  it('returns null for non-gradient functions', () => {
    expect(parseGradientStops('var(--color)')).toBeNull();
    expect(parseGradientStops('rgb(255, 0, 0)')).toBeNull();
  });

  it('ignores invalid color stops', () => {
    const stops = parseGradientStops('linear-gradient(#ff0000, invalid, #0000ff)');

    expect(stops).toEqual([
      {r: 255, g: 0, b: 0},
      {r: 0, g: 0, b: 255},
    ]);
  });
});
