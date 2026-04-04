import {describe, it, expect} from 'vitest';
import {PerformanceMeasure} from '../PerformanceMeasure';

describe('PerformanceMeasure', () => {
  it('has entryType "measure"', () => {
    const measure = new PerformanceMeasure('my-measure', 0, 100);
    expect(measure.entryType).toBe('measure');
  });

  it('stores startTime and duration', () => {
    const measure = new PerformanceMeasure('my-measure', 10, 90);
    expect(measure.startTime).toBe(10);
    expect(measure.duration).toBe(90);
  });

  it('stores detail when provided', () => {
    const detail = {dirtyElements: 5, totalElements: 20};
    const measure = new PerformanceMeasure('terminal.frame', 0, 16, detail);
    expect(measure.detail).toBe(detail);
  });

  it('defaults detail to null', () => {
    const measure = new PerformanceMeasure('my-measure', 0, 100);
    expect(measure.detail).toBeNull();
  });

  it('serializes to JSON including detail', () => {
    const detail = {idle: true};
    const measure = new PerformanceMeasure('terminal.frame', 5, 12, detail);
    const json = measure.toJSON();
    expect(json).toEqual({
      name: 'terminal.frame',
      entryType: 'measure',
      startTime: 5,
      duration: 12,
      detail: {idle: true},
    });
  });

  it('has read-only properties', () => {
    const measure = new PerformanceMeasure('my-measure', 0, 100, 'original');

    expect(() => {
      (measure as {detail: unknown}).detail = 'changed';
    }).toThrow();
  });
});
