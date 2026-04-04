import {describe, it, expect, vi, beforeEach} from 'vitest';
import {Performance} from '../Performance';
import {PerformanceEntry} from '../PerformanceEntry';

describe('Performance', () => {
  let perf: Performance;

  beforeEach(() => {
    perf = new Performance();
  });

  describe('now()', () => {
    it('returns a high-resolution timestamp', () => {
      const t = perf.now();
      expect(typeof t).toBe('number');
      expect(t).toBeGreaterThan(0);
    });

    it('returns increasing values', () => {
      const t1 = perf.now();
      const t2 = perf.now();
      expect(t2).toBeGreaterThanOrEqual(t1);
    });
  });

  describe('mark()', () => {
    it('creates a mark with a name and auto start time', () => {
      const mark = perf.mark('test-mark');
      expect(mark.name).toBe('test-mark');
      expect(mark.entryType).toBe('mark');
      expect(mark.startTime).toBeGreaterThan(0);
      expect(mark.duration).toBe(0);
    });

    it('accepts explicit startTime', () => {
      const mark = perf.mark('test-mark', {startTime: 42});
      expect(mark.startTime).toBe(42);
    });

    it('stores detail metadata', () => {
      const detail = {phase: 'layout'};
      const mark = perf.mark('test-mark', {detail});
      expect(mark.detail).toBe(detail);
    });

    it('stores the mark in the entry list', () => {
      perf.mark('a');
      perf.mark('b');
      const entries = perf.getEntries();
      expect(entries).toHaveLength(2);
      expect(entries[0]!.name).toBe('a');
      expect(entries[1]!.name).toBe('b');
    });
  });

  describe('measure()', () => {
    it('creates a measure with auto start and end', () => {
      const measure = perf.measure('test-measure');
      expect(measure.name).toBe('test-measure');
      expect(measure.entryType).toBe('measure');
      expect(measure.startTime).toBeGreaterThan(0);
      expect(measure.duration).toBeGreaterThanOrEqual(0);
    });

    it('accepts explicit start and end timestamps', () => {
      const measure = perf.measure('test-measure', {start: 10, end: 30});
      expect(measure.startTime).toBe(10);
      expect(measure.duration).toBe(20);
    });

    it('accepts start and duration override', () => {
      const measure = perf.measure('test-measure', {start: 10, duration: 50});
      expect(measure.startTime).toBe(10);
      expect(measure.duration).toBe(50);
    });

    it('resolves start from a named mark', () => {
      perf.mark('start-mark', {startTime: 100});
      const measure = perf.measure('test-measure', {start: 'start-mark', end: 200});
      expect(measure.startTime).toBe(100);
      expect(measure.duration).toBe(100);
    });

    it('resolves end from a named mark', () => {
      perf.mark('end-mark', {startTime: 200});
      const measure = perf.measure('test-measure', {start: 50, end: 'end-mark'});
      expect(measure.startTime).toBe(50);
      expect(measure.duration).toBe(150);
    });

    it('uses the latest mark when multiple have the same name', () => {
      perf.mark('m', {startTime: 10});
      perf.mark('m', {startTime: 90});
      const measure = perf.measure('test', {start: 'm', end: 100});
      expect(measure.startTime).toBe(90);
      expect(measure.duration).toBe(10);
    });

    it('throws when referencing a non-existent mark', () => {
      expect(() => perf.measure('test', {start: 'nonexistent', end: 100})).toThrow(
        /does not exist/,
      );
    });

    it('stores detail metadata', () => {
      const detail = {dirtyElements: 5};
      const measure = perf.measure('terminal.frame', {start: 0, end: 16, detail});
      expect(measure.detail).toBe(detail);
    });
  });

  describe('getEntries()', () => {
    it('returns entries sorted by startTime', () => {
      perf.mark('b', {startTime: 20});
      perf.mark('a', {startTime: 10});
      perf.measure('c', {start: 5, end: 30});
      const entries = perf.getEntries();
      expect(entries.map((e) => e.startTime)).toEqual([5, 10, 20]);
    });

    it('returns a copy (not the internal array)', () => {
      perf.mark('a');
      const entries = perf.getEntries();
      entries.pop();
      expect(perf.getEntries()).toHaveLength(1);
    });
  });

  describe('getEntriesByName()', () => {
    it('filters by name', () => {
      perf.mark('alpha', {startTime: 1});
      perf.mark('beta', {startTime: 2});
      perf.mark('alpha', {startTime: 3});
      const entries = perf.getEntriesByName('alpha');
      expect(entries).toHaveLength(2);
      expect(entries.every((e) => e.name === 'alpha')).toBe(true);
    });

    it('filters by name and type', () => {
      perf.mark('x', {startTime: 1});
      perf.measure('x', {start: 2, end: 5});
      const marks = perf.getEntriesByName('x', 'mark');
      expect(marks).toHaveLength(1);
      expect(marks[0]!.entryType).toBe('mark');
    });
  });

  describe('getEntriesByType()', () => {
    it('filters by type', () => {
      perf.mark('a', {startTime: 1});
      perf.mark('b', {startTime: 2});
      perf.measure('c', {start: 3, end: 4});
      const marks = perf.getEntriesByType('mark');
      expect(marks).toHaveLength(2);
      const measures = perf.getEntriesByType('measure');
      expect(measures).toHaveLength(1);
    });
  });

  describe('clearMarks()', () => {
    it('clears all marks', () => {
      perf.mark('a');
      perf.mark('b');
      perf.measure('c', {start: 0, end: 1});
      perf.clearMarks();
      expect(perf.getEntriesByType('mark')).toHaveLength(0);
      expect(perf.getEntriesByType('measure')).toHaveLength(1);
    });

    it('clears marks by name', () => {
      perf.mark('a');
      perf.mark('b');
      perf.clearMarks('a');
      const marks = perf.getEntriesByType('mark');
      expect(marks).toHaveLength(1);
      expect(marks[0]!.name).toBe('b');
    });
  });

  describe('clearMeasures()', () => {
    it('clears all measures', () => {
      perf.measure('a', {start: 0, end: 1});
      perf.measure('b', {start: 1, end: 2});
      perf.mark('c');
      perf.clearMeasures();
      expect(perf.getEntriesByType('measure')).toHaveLength(0);
      expect(perf.getEntriesByType('mark')).toHaveLength(1);
    });

    it('clears measures by name', () => {
      perf.measure('a', {start: 0, end: 1});
      perf.measure('b', {start: 1, end: 2});
      perf.clearMeasures('a');
      const measures = perf.getEntriesByType('measure');
      expect(measures).toHaveLength(1);
      expect(measures[0]!.name).toBe('b');
    });
  });

  describe('entry listeners', () => {
    it('notifies listeners when a mark is recorded', () => {
      const listener = vi.fn();
      perf.addEntryListener(listener);
      const mark = perf.mark('test');
      expect(listener).toHaveBeenCalledWith(mark);
    });

    it('notifies listeners when a measure is recorded', () => {
      const listener = vi.fn();
      perf.addEntryListener(listener);
      const measure = perf.measure('test', {start: 0, end: 10});
      expect(listener).toHaveBeenCalledWith(measure);
    });

    it('notifies listeners when an external entry is recorded', () => {
      const listener = vi.fn();
      perf.addEntryListener(listener);

      const entry = new PerformanceEntry('custom', 'paint', 0, 0);
      perf.recordEntry(entry);
      expect(listener).toHaveBeenCalledWith(entry);
    });

    it('stops notifying after removal', () => {
      const listener = vi.fn();
      perf.addEntryListener(listener);
      perf.mark('a');
      perf.removeEntryListener(listener);
      perf.mark('b');
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });
});
