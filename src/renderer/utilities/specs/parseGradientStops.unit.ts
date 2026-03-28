import {describe, expect, it} from 'vitest';
import {parseGradientStops} from '../parseGradientStops';

describe('parseGradientStops', () => {
  it('returns null for a plain color value', () => {
    expect(parseGradientStops('#ff0000')).toBeNull();
    expect(parseGradientStops('red')).toBeNull();
  });

  it('parses a two-stop gradient with hex colors', () => {
    const result = parseGradientStops('linear-gradient(#ff0000, #0000ff)');

    expect(result).not.toBeNull();
    expect(result!.angleDeg).toBe(180);
    expect(result!.stops).toHaveLength(2);
    expect(result!.stops[0]!.color).toEqual({r: 255, g: 0, b: 0});
    expect(result!.stops[0]!.position).toBe(0);
    expect(result!.stops[1]!.color).toEqual({r: 0, g: 0, b: 255});
    expect(result!.stops[1]!.position).toBe(1);
  });

  it('parses a three-stop gradient', () => {
    const result = parseGradientStops('linear-gradient(#ff0000, #00ff00, #0000ff)');

    expect(result!.stops).toHaveLength(3);
    expect(result!.stops[1]!.position).toBeCloseTo(0.5);
  });

  it('parses named colors as stops', () => {
    const result = parseGradientStops('linear-gradient(red, blue)');

    expect(result).not.toBeNull();
    expect(result!.stops).toHaveLength(2);
  });

  it('parses rgb() colors as stops', () => {
    const result = parseGradientStops('linear-gradient(rgb(100, 200, 50), rgb(0, 0, 0))');

    expect(result!.stops[0]!.color).toEqual({r: 100, g: 200, b: 50});
    expect(result!.stops[1]!.color).toEqual({r: 0, g: 0, b: 0});
  });

  it('returns null for a single-stop gradient', () => {
    expect(parseGradientStops('linear-gradient(#ff0000)')).toBeNull();
  });

  it('returns null for non-gradient functions', () => {
    expect(parseGradientStops('var(--color)')).toBeNull();
    expect(parseGradientStops('rgb(255, 0, 0)')).toBeNull();
  });

  it('ignores invalid color stops', () => {
    const result = parseGradientStops('linear-gradient(#ff0000, invalid, #0000ff)');

    expect(result!.stops).toHaveLength(2);
    expect(result!.stops[0]!.color).toEqual({r: 255, g: 0, b: 0});
    expect(result!.stops[1]!.color).toEqual({r: 0, g: 0, b: 255});
  });

  it('parses an explicit angle', () => {
    const result = parseGradientStops('linear-gradient(90deg, #fff, #000)');

    expect(result!.angleDeg).toBe(90);
    expect(result!.stops).toHaveLength(2);
  });

  it('defaults to 180deg when no angle is specified', () => {
    const result = parseGradientStops('linear-gradient(#fff, #000)');

    expect(result!.angleDeg).toBe(180);
  });
});
