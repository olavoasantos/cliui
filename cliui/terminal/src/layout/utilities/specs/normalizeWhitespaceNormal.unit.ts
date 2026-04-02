import {describe, it, expect} from 'vitest';

import {normalizeWhitespaceNormal} from '../normalizeWhitespaceNormal';

describe('normalizeWhitespaceNormal', () => {
  it('returns the same string when no normalization is needed', () => {
    expect(normalizeWhitespaceNormal('hello world')).toBe('hello world');
  });

  it('collapses multiple spaces into one', () => {
    expect(normalizeWhitespaceNormal('hello   world')).toBe('hello world');
  });

  it('collapses tabs into spaces', () => {
    expect(normalizeWhitespaceNormal('hello\tworld')).toBe('hello world');
  });

  it('collapses newlines into spaces', () => {
    expect(normalizeWhitespaceNormal('hello\nworld')).toBe('hello world');
  });

  it('collapses carriage returns into spaces', () => {
    expect(normalizeWhitespaceNormal('hello\rworld')).toBe('hello world');
  });

  it('collapses form feeds into spaces', () => {
    expect(normalizeWhitespaceNormal('hello\fworld')).toBe('hello world');
  });

  it('collapses mixed whitespace runs into a single space', () => {
    expect(normalizeWhitespaceNormal('hello \t\n\r\f world')).toBe('hello world');
  });

  it('trims leading whitespace', () => {
    expect(normalizeWhitespaceNormal('  hello')).toBe('hello');
  });

  it('trims trailing whitespace', () => {
    expect(normalizeWhitespaceNormal('hello  ')).toBe('hello');
  });

  it('returns empty string for whitespace-only input', () => {
    expect(normalizeWhitespaceNormal('   ')).toBe('');
  });

  it('returns empty string for empty input', () => {
    expect(normalizeWhitespaceNormal('')).toBe('');
  });

  it('fast-paths already-normalized text', () => {
    const input = 'already normalized text';
    expect(normalizeWhitespaceNormal(input)).toBe(input);
  });
});
