import {describe, it, expect, vi, beforeEach} from 'vitest';
import {PerformanceObserver} from '../PerformanceObserver';
import {Performance} from '../Performance';

describe('PerformanceObserver', () => {
  let perf: Performance;

  beforeEach(() => {
    perf = new Performance();
  });

  it('receives entries matching subscribed entry types', async () => {
    const callback = vi.fn();
    const observer = new PerformanceObserver(callback);
    observer.observe({performance: perf, entryTypes: ['mark']});

    perf.mark('test', {startTime: 1});

    // Wait for microtask delivery
    await Promise.resolve();

    expect(callback).toHaveBeenCalledTimes(1);
    const list = callback.mock.calls[0]![0]!;
    expect(list.getEntries()).toHaveLength(1);
    expect(list.getEntries()[0]!.name).toBe('test');
  });

  it('does not receive entries of non-subscribed types', async () => {
    const callback = vi.fn();
    const observer = new PerformanceObserver(callback);
    observer.observe({performance: perf, entryTypes: ['measure']});

    perf.mark('test', {startTime: 1});

    await Promise.resolve();

    expect(callback).not.toHaveBeenCalled();
    observer.disconnect();
  });

  it('batches multiple entries into one callback invocation', async () => {
    const callback = vi.fn();
    const observer = new PerformanceObserver(callback);
    observer.observe({performance: perf, entryTypes: ['mark']});

    perf.mark('a', {startTime: 1});
    perf.mark('b', {startTime: 2});
    perf.mark('c', {startTime: 3});

    await Promise.resolve();

    expect(callback).toHaveBeenCalledTimes(1);
    const list = callback.mock.calls[0]![0]!;
    expect(list.getEntries()).toHaveLength(3);
    observer.disconnect();
  });

  it('delivers entries via microtask (not synchronously)', () => {
    const callback = vi.fn();
    const observer = new PerformanceObserver(callback);
    observer.observe({performance: perf, entryTypes: ['mark']});

    perf.mark('test', {startTime: 1});

    // Should not have been called synchronously
    expect(callback).not.toHaveBeenCalled();
    observer.disconnect();
  });

  it('passes the observer as the second callback argument', async () => {
    const callback = vi.fn();
    const observer = new PerformanceObserver(callback);
    observer.observe({performance: perf, entryTypes: ['mark']});

    perf.mark('test', {startTime: 1});
    await Promise.resolve();

    expect(callback.mock.calls[0]![1]).toBe(observer);
    observer.disconnect();
  });

  it('stops observation after disconnect()', async () => {
    const callback = vi.fn();
    const observer = new PerformanceObserver(callback);
    observer.observe({performance: perf, entryTypes: ['mark']});

    observer.disconnect();
    perf.mark('test', {startTime: 1});

    await Promise.resolve();

    expect(callback).not.toHaveBeenCalled();
  });

  it('returns buffered entries via takeRecords() and clears the buffer', async () => {
    const callback = vi.fn();
    const observer = new PerformanceObserver(callback);
    observer.observe({performance: perf, entryTypes: ['mark']});

    perf.mark('a', {startTime: 1});
    perf.mark('b', {startTime: 2});

    const records = observer.takeRecords();
    expect(records).toHaveLength(2);
    expect(records[0]!.name).toBe('a');
    expect(records[1]!.name).toBe('b');

    // Buffer should be empty now; microtask should deliver nothing
    await Promise.resolve();
    expect(callback).not.toHaveBeenCalled();
    observer.disconnect();
  });

  it('supports single-type observation via { type }', async () => {
    const callback = vi.fn();
    const observer = new PerformanceObserver(callback);
    observer.observe({performance: perf, type: 'measure'});

    perf.measure('test', {start: 0, end: 10});

    await Promise.resolve();

    expect(callback).toHaveBeenCalledTimes(1);
    const list = callback.mock.calls[0]![0]!;
    expect(list.getEntries()[0]!.name).toBe('test');
    observer.disconnect();
  });

  it('supports observing multiple entry types', async () => {
    const callback = vi.fn();
    const observer = new PerformanceObserver(callback);
    observer.observe({performance: perf, entryTypes: ['mark', 'measure']});

    perf.mark('m', {startTime: 1});
    perf.measure('x', {start: 2, end: 5});

    await Promise.resolve();

    expect(callback).toHaveBeenCalledTimes(1);
    const list = callback.mock.calls[0]![0]!;
    expect(list.getEntries()).toHaveLength(2);
    observer.disconnect();
  });

  it('allows multiple observers on the same Performance instance', async () => {
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    const obs1 = new PerformanceObserver(cb1);
    const obs2 = new PerformanceObserver(cb2);

    obs1.observe({performance: perf, entryTypes: ['mark']});
    obs2.observe({performance: perf, entryTypes: ['mark']});

    perf.mark('test', {startTime: 1});

    await Promise.resolve();

    expect(cb1).toHaveBeenCalledTimes(1);
    expect(cb2).toHaveBeenCalledTimes(1);
    obs1.disconnect();
    obs2.disconnect();
  });

  it('filters entry list getEntriesByType() correctly', async () => {
    const callback = vi.fn();
    const observer = new PerformanceObserver(callback);
    observer.observe({performance: perf, entryTypes: ['mark', 'measure']});

    perf.mark('a', {startTime: 1});
    perf.measure('b', {start: 2, end: 5});

    await Promise.resolve();

    const list = callback.mock.calls[0]![0]!;
    expect(list.getEntriesByType('mark')).toHaveLength(1);
    expect(list.getEntriesByType('measure')).toHaveLength(1);
    observer.disconnect();
  });
});
