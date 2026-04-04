import {describe, it, expect} from 'vitest';
import {PerformancePaintTiming} from '../PerformancePaintTiming';

describe('PerformancePaintTiming', () => {
  it('has entryType "paint"', () => {
    const entry = new PerformancePaintTiming('first-contentful-paint', 42);
    expect(entry.entryType).toBe('paint');
  });

  it('stores name and startTime', () => {
    const entry = new PerformancePaintTiming('first-contentful-paint', 150);
    expect(entry.name).toBe('first-contentful-paint');
    expect(entry.startTime).toBe(150);
  });

  it('has zero duration', () => {
    const entry = new PerformancePaintTiming('first-contentful-paint', 100);
    expect(entry.duration).toBe(0);
  });

  it('serializes to JSON', () => {
    const entry = new PerformancePaintTiming('first-contentful-paint', 50);
    expect(entry.toJSON()).toEqual({
      name: 'first-contentful-paint',
      entryType: 'paint',
      startTime: 50,
      duration: 0,
    });
  });
});
