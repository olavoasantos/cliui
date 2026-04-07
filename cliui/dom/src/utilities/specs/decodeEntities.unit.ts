import {describe, expect, it} from 'vitest';
import {decodeEntities} from '../decodeEntities';

describe('decodeEntities', () => {
  describe('named entities', () => {
    it('decodes &amp;', () => {
      expect(decodeEntities('&amp;')).toBe('&');
    });

    it('decodes &lt;', () => {
      expect(decodeEntities('&lt;')).toBe('<');
    });

    it('decodes &gt;', () => {
      expect(decodeEntities('&gt;')).toBe('>');
    });

    it('decodes &quot;', () => {
      expect(decodeEntities('&quot;')).toBe('"');
    });

    it('decodes &apos;', () => {
      expect(decodeEntities('&apos;')).toBe("'");
    });

    it('decodes &nbsp;', () => {
      expect(decodeEntities('&nbsp;')).toBe('\u00A0');
    });

    it('decodes &mdash;', () => {
      expect(decodeEntities('&mdash;')).toBe('\u2014');
    });

    it('decodes &ndash;', () => {
      expect(decodeEntities('&ndash;')).toBe('\u2013');
    });

    it('is case-insensitive for named entities', () => {
      expect(decodeEntities('&AMP;')).toBe('&');
      expect(decodeEntities('&Lt;')).toBe('<');
    });
  });

  describe('numeric entities', () => {
    it('decodes decimal references', () => {
      expect(decodeEntities('&#60;')).toBe('<');
      expect(decodeEntities('&#62;')).toBe('>');
      expect(decodeEntities('&#38;')).toBe('&');
    });

    it('decodes hexadecimal references', () => {
      expect(decodeEntities('&#x3C;')).toBe('<');
      expect(decodeEntities('&#x3E;')).toBe('>');
      expect(decodeEntities('&#x26;')).toBe('&');
    });

    it('handles uppercase hex digits', () => {
      expect(decodeEntities('&#x3c;')).toBe('<');
      expect(decodeEntities('&#X3C;')).toBe('<');
    });
  });

  describe('mixed content', () => {
    it('decodes entities within plain text', () => {
      expect(decodeEntities('Hello &amp; World')).toBe('Hello & World');
    });

    it('decodes multiple entities', () => {
      expect(decodeEntities('&lt;div&gt;')).toBe('<div>');
    });

    it('preserves text without entities', () => {
      expect(decodeEntities('Hello World')).toBe('Hello World');
    });

    it('returns empty string for empty input', () => {
      expect(decodeEntities('')).toBe('');
    });

    it('leaves unrecognised named entities as-is', () => {
      expect(decodeEntities('&unknown;')).toBe('&unknown;');
    });

    it('leaves bare ampersands as-is', () => {
      expect(decodeEntities('a & b')).toBe('a & b');
    });

    it('handles real-world HTML content', () => {
      expect(decodeEntities('Use &lt;link rel=&quot;stylesheet&quot;&gt;')).toBe(
        'Use <link rel="stylesheet">',
      );
    });
  });
});
