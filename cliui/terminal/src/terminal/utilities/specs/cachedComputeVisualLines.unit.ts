import {describe, expect, it} from 'vitest';

import {cachedComputeVisualLines} from '../cachedComputeVisualLines';
import {createVisualLineCache} from '../createVisualLineCache';

function g(text: string): string[] {
  return [...new Intl.Segmenter('en', {granularity: 'grapheme'}).segment(text)].map(
    (s) => s.segment,
  );
}

describe('cachedComputeVisualLines', () => {
  it('returns correct visual lines on first call', () => {
    const cache = createVisualLineCache();
    const graphemes = g('hello world');
    const lines = cachedComputeVisualLines(cache, graphemes, 20, false);

    expect(lines.length).toBe(1);
    expect(lines[0]!.start).toBe(0);
    expect(lines[0]!.end).toBe(11);
  });

  it('returns cached result on second call with same inputs', () => {
    const cache = createVisualLineCache();
    const graphemes = g('hello world');
    const result1 = cachedComputeVisualLines(cache, graphemes, 20, false);
    const result2 = cachedComputeVisualLines(cache, graphemes, 20, false);

    expect(result2).toBe(result1); // Same reference
  });

  it('invalidates cache when grapheme array reference changes', () => {
    const cache = createVisualLineCache();
    const graphemes1 = g('hello');
    const graphemes2 = g('hello');
    const result1 = cachedComputeVisualLines(cache, graphemes1, 20, false);
    const result2 = cachedComputeVisualLines(cache, graphemes2, 20, false);

    expect(result2).not.toBe(result1); // Different references
    expect(result2).toEqual(result1); // Same content
  });

  it('invalidates cache when viewport width changes', () => {
    const cache = createVisualLineCache();
    const graphemes = g('hello world test');
    const result1 = cachedComputeVisualLines(cache, graphemes, 20, false);
    const result2 = cachedComputeVisualLines(cache, graphemes, 8, true);

    expect(result2).not.toBe(result1);
    expect(result2.length).toBeGreaterThan(result1.length);
  });

  it('invalidates cache when grapheme count changes (splice)', () => {
    const cache = createVisualLineCache();
    const graphemes = g('hello');
    const result1 = cachedComputeVisualLines(cache, graphemes, 20, false);

    // Simulate in-place splice (same array reference, different length)
    graphemes.push(...g(' world'));
    const result2 = cachedComputeVisualLines(cache, graphemes, 20, false);

    expect(result2).not.toBe(result1);
  });
});
