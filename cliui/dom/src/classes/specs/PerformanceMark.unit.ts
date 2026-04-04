import {describe, it, expect} from 'vitest';
import {PerformanceMark} from '../PerformanceMark';

describe('PerformanceMark', () => {
  it('has entryType "mark"', () => {
    const mark = new PerformanceMark('my-mark');
    expect(mark.entryType).toBe('mark');
  });

  it('defaults startTime to 0 when no options given', () => {
    const mark = new PerformanceMark('my-mark');
    expect(mark.startTime).toBe(0);
    expect(mark.duration).toBe(0);
  });

  it('accepts an explicit startTime', () => {
    const mark = new PerformanceMark('my-mark', {startTime: 42.5});
    expect(mark.startTime).toBe(42.5);
  });

  it('stores detail when provided', () => {
    const detail = {phase: 'layout', count: 3};
    const mark = new PerformanceMark('my-mark', {detail});
    expect(mark.detail).toBe(detail);
  });

  it('defaults detail to null', () => {
    const mark = new PerformanceMark('my-mark');
    expect(mark.detail).toBeNull();
  });

  it('serializes to JSON including detail', () => {
    const mark = new PerformanceMark('my-mark', {startTime: 10, detail: {key: 'value'}});
    const json = mark.toJSON();
    expect(json).toEqual({
      name: 'my-mark',
      entryType: 'mark',
      startTime: 10,
      duration: 0,
      detail: {key: 'value'},
    });
  });

  it('has read-only properties', () => {
    const mark = new PerformanceMark('my-mark', {detail: 'original'});

    expect(() => {
      (mark as {detail: unknown}).detail = 'changed';
    }).toThrow();
  });
});
