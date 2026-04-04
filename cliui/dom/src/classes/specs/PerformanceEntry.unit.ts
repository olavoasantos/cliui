import {describe, it, expect} from 'vitest';
import {PerformanceEntry} from '../PerformanceEntry';

describe('PerformanceEntry', () => {
  it('stores name, entryType, startTime, and duration', () => {
    const entry = new PerformanceEntry('test', 'mark', 100, 50);
    expect(entry.name).toBe('test');
    expect(entry.entryType).toBe('mark');
    expect(entry.startTime).toBe(100);
    expect(entry.duration).toBe(50);
  });

  it('has read-only properties', () => {
    const entry = new PerformanceEntry('test', 'mark', 100, 50);

    expect(() => {
      (entry as {name: string}).name = 'changed';
    }).toThrow();
    expect(() => {
      (entry as {entryType: string}).entryType = 'changed';
    }).toThrow();
    expect(() => {
      (entry as {startTime: number}).startTime = 999;
    }).toThrow();
    expect(() => {
      (entry as {duration: number}).duration = 999;
    }).toThrow();
  });

  it('serializes to JSON', () => {
    const entry = new PerformanceEntry('metric', 'measure', 10, 20);
    const json = entry.toJSON();
    expect(json).toEqual({
      name: 'metric',
      entryType: 'measure',
      startTime: 10,
      duration: 20,
    });
  });
});
