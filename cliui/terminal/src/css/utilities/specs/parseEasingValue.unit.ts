import {describe, it, expect} from 'vitest';
import {parseEasingValue} from '../parseEasingValue';

describe('parseEasingValue', () => {
  it('parses named keywords', () => {
    expect(parseEasingValue('ease')).toEqual({
      type: 'cubic-bezier',
      x1: 0.25,
      y1: 0.1,
      x2: 0.25,
      y2: 1.0,
    });
    expect(parseEasingValue('linear')).toEqual({type: 'linear'});
    expect(parseEasingValue('ease-in-out')).toEqual({
      type: 'cubic-bezier',
      x1: 0.42,
      y1: 0,
      x2: 0.58,
      y2: 1.0,
    });
  });

  it('parses cubic-bezier()', () => {
    expect(parseEasingValue('cubic-bezier(0.4, 0, 0.2, 1)')).toEqual({
      type: 'cubic-bezier',
      x1: 0.4,
      y1: 0,
      x2: 0.2,
      y2: 1,
    });
  });

  it('parses steps()', () => {
    expect(parseEasingValue('steps(4, end)')).toEqual({
      type: 'steps',
      count: 4,
      position: 'jump-end',
    });
    expect(parseEasingValue('steps(3, start)')).toEqual({
      type: 'steps',
      count: 3,
      position: 'jump-start',
    });
    expect(parseEasingValue('steps(5)')).toEqual({type: 'steps', count: 5, position: 'jump-end'});
  });

  it('defaults to linear for unknown values', () => {
    expect(parseEasingValue('unknown')).toEqual({type: 'linear'});
  });
});
