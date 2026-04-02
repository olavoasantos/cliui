import {describe, expect, it} from 'vitest';
import {resolveVar} from '../resolveVar';

describe('resolveVar', () => {
  it('returns the value unchanged when no var() is present', () => {
    const props = new Map<string, string>();

    expect(resolveVar('red', props)).toBe('red');
    expect(resolveVar('1 2 3', props)).toBe('1 2 3');
  });

  it('resolves a simple var() reference', () => {
    const props = new Map([['--color', 'red']]);

    expect(resolveVar('var(--color)', props)).toBe('red');
  });

  it('resolves var() embedded in a larger value', () => {
    const props = new Map([['--size', '2']]);

    expect(resolveVar('var(--size) 4', props)).toBe('2 4');
  });

  it('resolves multiple var() references in one value', () => {
    const props = new Map([
      ['--top', '1'],
      ['--right', '2'],
    ]);

    expect(resolveVar('var(--top) var(--right)', props)).toBe('1 2');
  });

  it('uses the fallback when the property is not defined', () => {
    const props = new Map<string, string>();

    expect(resolveVar('var(--missing, blue)', props)).toBe('blue');
  });

  it('uses the fallback with leading/trailing whitespace trimmed', () => {
    const props = new Map<string, string>();

    expect(resolveVar('var(--missing,  #ff0  )', props)).toBe('#ff0');
  });

  it('prefers the property value over the fallback', () => {
    const props = new Map([['--color', 'green']]);

    expect(resolveVar('var(--color, red)', props)).toBe('green');
  });

  it('resolves nested var() in fallback', () => {
    const props = new Map([['--fallback-color', 'orange']]);

    expect(resolveVar('var(--primary, var(--fallback-color))', props)).toBe('orange');
  });

  it('resolves nested var() in resolved value', () => {
    const props = new Map([
      ['--ref', 'var(--actual)'],
      ['--actual', 'pink'],
    ]);

    expect(resolveVar('var(--ref)', props)).toBe('pink');
  });

  it('returns empty string for unresolvable var() without fallback', () => {
    const props = new Map<string, string>();

    expect(resolveVar('var(--nope)', props)).toBe('');
  });

  it('handles deeply nested fallbacks', () => {
    const props = new Map([['--deep', 'found']]);

    expect(resolveVar('var(--a, var(--b, var(--deep)))', props)).toBe('found');
  });

  it('stops at max recursion depth', () => {
    const props = new Map([['--loop', 'var(--loop)']]);

    // Should not stack overflow — returns the unresolved var() at max depth
    const result = resolveVar('var(--loop)', props);

    expect(result).toContain('var(--loop)');
  });

  it('handles fallback containing a comma inside nested var()', () => {
    const props = new Map([['--pad', '1 2']]);

    expect(resolveVar('var(--missing, var(--pad))', props)).toBe('1 2');
  });

  it('resolves var() inside other CSS functions like linear-gradient()', () => {
    const props = new Map([
      ['--start', '#ff0000'],
      ['--end', '#0000ff'],
    ]);

    expect(resolveVar('linear-gradient(var(--start), var(--end))', props)).toBe(
      'linear-gradient(#ff0000, #0000ff)',
    );
  });

  it('resolves var() inside nested function arguments', () => {
    const props = new Map([['--color', 'red']]);

    expect(resolveVar('rgb(var(--color))', props)).toBe('rgb(red)');
  });
});
