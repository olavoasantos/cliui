import {describe, it, expect} from 'vitest';
import {PerformanceEventTiming} from '../PerformanceEventTiming';

describe('PerformanceEventTiming', () => {
  const defaultOptions = {
    name: 'keydown',
    startTime: 100,
    processingStart: 105,
    processingEnd: 110,
    duration: 120,
    interactionId: 1,
    entryType: 'event' as const,
  };

  it('stores all properties from construction options', () => {
    const entry = new PerformanceEventTiming(defaultOptions);
    expect(entry.name).toBe('keydown');
    expect(entry.entryType).toBe('event');
    expect(entry.startTime).toBe(100);
    expect(entry.duration).toBe(120);
    expect(entry.processingStart).toBe(105);
    expect(entry.processingEnd).toBe(110);
    expect(entry.interactionId).toBe(1);
  });

  it('supports "first-input" entry type', () => {
    const entry = new PerformanceEventTiming({
      ...defaultOptions,
      entryType: 'first-input',
    });
    expect(entry.entryType).toBe('first-input');
  });

  it('supports "event" entry type', () => {
    const entry = new PerformanceEventTiming(defaultOptions);
    expect(entry.entryType).toBe('event');
  });

  it('has read-only properties', () => {
    const entry = new PerformanceEventTiming(defaultOptions);

    expect(() => {
      (entry as {processingStart: number}).processingStart = 999;
    }).toThrow();
    expect(() => {
      (entry as {processingEnd: number}).processingEnd = 999;
    }).toThrow();
    expect(() => {
      (entry as {interactionId: number}).interactionId = 999;
    }).toThrow();
  });

  it('serializes to JSON including additional properties', () => {
    const entry = new PerformanceEventTiming(defaultOptions);
    const json = entry.toJSON();
    expect(json).toEqual({
      name: 'keydown',
      entryType: 'event',
      startTime: 100,
      duration: 120,
      processingStart: 105,
      processingEnd: 110,
      interactionId: 1,
    });
  });

  it('works with click events', () => {
    const entry = new PerformanceEventTiming({
      name: 'click',
      startTime: 200,
      processingStart: 202,
      processingEnd: 208,
      duration: 216,
      interactionId: 42,
      entryType: 'event',
    });
    expect(entry.name).toBe('click');
    expect(entry.interactionId).toBe(42);
  });
});
