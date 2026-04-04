import {describe, it, expect} from 'vitest';
import {PerformanceObserverEntryList} from '../PerformanceObserverEntryList';
import {PerformanceEntry} from '../PerformanceEntry';

describe('PerformanceObserverEntryList', () => {
  function makeEntry(name: string, type: string, startTime: number): PerformanceEntry {
    return new PerformanceEntry(name, type, startTime, 0);
  }

  it('returns all entries sorted by startTime', () => {
    const entries = [makeEntry('b', 'mark', 20), makeEntry('a', 'mark', 10)];
    const list = new PerformanceObserverEntryList(entries);
    const result = list.getEntries();
    expect(result.map((e) => e.name)).toEqual(['a', 'b']);
  });

  it('filters by name', () => {
    const entries = [
      makeEntry('alpha', 'mark', 1),
      makeEntry('beta', 'mark', 2),
      makeEntry('alpha', 'measure', 3),
    ];
    const list = new PerformanceObserverEntryList(entries);
    const result = list.getEntriesByName('alpha');
    expect(result).toHaveLength(2);
    expect(result.every((e) => e.name === 'alpha')).toBe(true);
  });

  it('filters by name and type', () => {
    const entries = [makeEntry('x', 'mark', 1), makeEntry('x', 'measure', 2)];
    const list = new PerformanceObserverEntryList(entries);
    const result = list.getEntriesByName('x', 'mark');
    expect(result).toHaveLength(1);
    expect(result[0]!.entryType).toBe('mark');
  });

  it('filters by type', () => {
    const entries = [
      makeEntry('a', 'mark', 1),
      makeEntry('b', 'measure', 2),
      makeEntry('c', 'mark', 3),
    ];
    const list = new PerformanceObserverEntryList(entries);
    const result = list.getEntriesByType('mark');
    expect(result).toHaveLength(2);
  });

  it('returns a copy of entries (not the internal array)', () => {
    const entries = [makeEntry('a', 'mark', 1)];
    const list = new PerformanceObserverEntryList(entries);
    const result1 = list.getEntries();
    result1.pop();
    expect(list.getEntries()).toHaveLength(1);
  });
});
