import {describe, it, expect} from 'vitest';
import {LargestContentfulPaint} from '../LargestContentfulPaint';
import {Element} from '../Element';
import {Window} from '../Window';

describe('LargestContentfulPaint', () => {
  function createElement(): Element {
    const win = new Window();
    return win.document.createElement('div');
  }

  it('has entryType "largest-contentful-paint"', () => {
    const el = createElement();
    const entry = new LargestContentfulPaint({renderTime: 100, size: 200, element: el});
    expect(entry.entryType).toBe('largest-contentful-paint');
  });

  it('has name "largest-contentful-paint"', () => {
    const el = createElement();
    const entry = new LargestContentfulPaint({renderTime: 100, size: 200, element: el});
    expect(entry.name).toBe('largest-contentful-paint');
  });

  it('stores element, size, and renderTime', () => {
    const el = createElement();
    const entry = new LargestContentfulPaint({renderTime: 42, size: 300, element: el});
    expect(entry.element).toBe(el);
    expect(entry.size).toBe(300);
    expect(entry.renderTime).toBe(42);
  });

  it('uses renderTime as startTime', () => {
    const el = createElement();
    const entry = new LargestContentfulPaint({renderTime: 77, size: 100, element: el});
    expect(entry.startTime).toBe(77);
  });

  it('has read-only properties', () => {
    const el = createElement();
    const entry = new LargestContentfulPaint({renderTime: 100, size: 200, element: el});

    expect(() => {
      (entry as {element: unknown}).element = null;
    }).toThrow();
    expect(() => {
      (entry as {size: number}).size = 999;
    }).toThrow();
    expect(() => {
      (entry as {renderTime: number}).renderTime = 999;
    }).toThrow();
  });

  it('serializes to JSON excluding element reference', () => {
    const el = createElement();
    const entry = new LargestContentfulPaint({renderTime: 50, size: 400, element: el});
    const json = entry.toJSON();

    expect(json).toEqual({
      name: 'largest-contentful-paint',
      entryType: 'largest-contentful-paint',
      startTime: 50,
      duration: 0,
      size: 400,
      renderTime: 50,
    });
    expect(json).not.toHaveProperty('element');
  });
});
