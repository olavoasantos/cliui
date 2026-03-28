import {describe, expect, it} from 'vitest';
import {parseCSSFunction} from '../parseCSSFunction';

describe('parseCSSFunction', () => {
  it('returns null when no function is present', () => {
    expect(parseCSSFunction('red')).toBeNull();
    expect(parseCSSFunction('#fff')).toBeNull();
    expect(parseCSSFunction('1 2 3')).toBeNull();
  });

  it('parses a simple function call', () => {
    const result = parseCSSFunction('var(--color)');

    expect(result).toEqual({name: 'var', args: '--color', start: 0, end: 12});
  });

  it('parses a function with multiple arguments', () => {
    const result = parseCSSFunction('rgb(255, 128, 0)');

    expect(result).toEqual({name: 'rgb', args: '255, 128, 0', start: 0, end: 16});
  });

  it('parses a function with nested parentheses', () => {
    const result = parseCSSFunction('var(--a, var(--b))');

    expect(result).toEqual({name: 'var', args: '--a, var(--b)', start: 0, end: 18});
  });

  it('parses a function embedded in a larger value', () => {
    const result = parseCSSFunction('1px solid var(--color)');

    expect(result).toEqual({name: 'var', args: '--color', start: 10, end: 22});
  });

  it('parses linear-gradient', () => {
    const result = parseCSSFunction('linear-gradient(#fff, #000)');

    expect(result).toEqual({name: 'linear-gradient', args: '#fff, #000', start: 0, end: 27});
  });

  it('returns null for bare parentheses without a name', () => {
    expect(parseCSSFunction('(abc)')).toBeNull();
  });

  it('returns null for unmatched parentheses', () => {
    expect(parseCSSFunction('var(--broken')).toBeNull();
  });

  it('searches from the given offset', () => {
    const result = parseCSSFunction('foo(1) bar(2)', 5);

    expect(result).toEqual({name: 'bar', args: '2', start: 7, end: 13});
  });

  it('handles deeply nested functions', () => {
    const result = parseCSSFunction('a(b(c(d)))');

    expect(result).toEqual({name: 'a', args: 'b(c(d))', start: 0, end: 10});
  });
});
