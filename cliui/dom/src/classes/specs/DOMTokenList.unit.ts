import {describe, it, expect, beforeEach} from 'vitest';
import {Window} from '../Window';
import type {Document} from '../Document';
import type {Element} from '../Element';

describe('DOMTokenList', () => {
  let doc: Document;
  let el: Element;

  beforeEach(() => {
    const window = new Window();
    doc = window.document;
    el = doc.createElement('div');
  });

  describe('className', () => {
    it('returns empty string by default', () => {
      expect(el.className).toBe('');
    });

    it('gets the class attribute value', () => {
      el.setAttribute('class', 'foo bar');
      expect(el.className).toBe('foo bar');
    });

    it('sets the class attribute', () => {
      el.className = 'baz qux';
      expect(el.getAttribute('class')).toBe('baz qux');
    });

    it('reflects changes from classList', () => {
      el.classList.add('hello');
      expect(el.className).toBe('hello');
    });
  });

  describe('classList.add', () => {
    it('adds a single class', () => {
      el.classList.add('foo');
      expect(el.getAttribute('class')).toBe('foo');
    });

    it('adds multiple classes', () => {
      el.classList.add('foo', 'bar', 'baz');
      expect(el.classList.contains('foo')).toBe(true);
      expect(el.classList.contains('bar')).toBe(true);
      expect(el.classList.contains('baz')).toBe(true);
    });

    it('does not add duplicates', () => {
      el.classList.add('foo');
      el.classList.add('foo');
      expect(el.getAttribute('class')).toBe('foo');
    });
  });

  describe('classList.remove', () => {
    it('removes a class', () => {
      el.className = 'foo bar baz';
      el.classList.remove('bar');
      expect(el.classList.contains('bar')).toBe(false);
      expect(el.classList.contains('foo')).toBe(true);
      expect(el.classList.contains('baz')).toBe(true);
    });

    it('removes multiple classes', () => {
      el.className = 'foo bar baz';
      el.classList.remove('foo', 'baz');
      expect(el.getAttribute('class')).toBe('bar');
    });

    it('does nothing for non-existent class', () => {
      el.className = 'foo';
      el.classList.remove('bar');
      expect(el.getAttribute('class')).toBe('foo');
    });
  });

  describe('classList.toggle', () => {
    it('adds class if not present', () => {
      expect(el.classList.toggle('foo')).toBe(true);
      expect(el.classList.contains('foo')).toBe(true);
    });

    it('removes class if present', () => {
      el.classList.add('foo');
      expect(el.classList.toggle('foo')).toBe(false);
      expect(el.classList.contains('foo')).toBe(false);
    });

    it('forces add with true', () => {
      el.classList.add('foo');
      expect(el.classList.toggle('foo', true)).toBe(true);
      expect(el.classList.contains('foo')).toBe(true);
    });

    it('forces remove with false', () => {
      expect(el.classList.toggle('foo', false)).toBe(false);
      expect(el.classList.contains('foo')).toBe(false);
    });
  });

  describe('classList.contains', () => {
    it('returns false for empty list', () => {
      expect(el.classList.contains('foo')).toBe(false);
    });

    it('returns true when class is present', () => {
      el.className = 'foo bar';
      expect(el.classList.contains('foo')).toBe(true);
      expect(el.classList.contains('bar')).toBe(true);
    });

    it('returns false for non-existent class', () => {
      el.className = 'foo';
      expect(el.classList.contains('bar')).toBe(false);
    });
  });

  describe('classList.replace', () => {
    it('replaces an existing token', () => {
      el.className = 'foo bar';
      expect(el.classList.replace('foo', 'baz')).toBe(true);
      expect(el.classList.contains('baz')).toBe(true);
      expect(el.classList.contains('foo')).toBe(false);
    });

    it('returns false if old token not found', () => {
      el.className = 'foo';
      expect(el.classList.replace('bar', 'baz')).toBe(false);
    });
  });

  describe('classList.length', () => {
    it('returns 0 for empty', () => {
      expect(el.classList.length).toBe(0);
    });

    it('returns correct count', () => {
      el.className = 'a b c';
      expect(el.classList.length).toBe(3);
    });

    it('deduplicates tokens', () => {
      el.setAttribute('class', 'a a b');
      expect(el.classList.length).toBe(2);
    });
  });

  describe('classList.item', () => {
    it('returns token at index', () => {
      el.className = 'foo bar';
      expect(el.classList.item(0)).toBe('foo');
      expect(el.classList.item(1)).toBe('bar');
    });

    it('returns null for out-of-range', () => {
      expect(el.classList.item(0)).toBeNull();
    });
  });

  describe('classList.value', () => {
    it('returns the attribute value', () => {
      el.className = 'foo bar';
      expect(el.classList.value).toBe('foo bar');
    });

    it('sets the attribute value', () => {
      el.classList.value = 'baz qux';
      expect(el.getAttribute('class')).toBe('baz qux');
    });
  });

  describe('classList iteration', () => {
    it('is iterable with for...of', () => {
      el.className = 'a b c';
      const result: string[] = [];
      for (const token of el.classList) {
        result.push(token);
      }
      expect(result).toEqual(['a', 'b', 'c']);
    });
  });

  describe('classList.toString', () => {
    it('returns the value string', () => {
      el.className = 'foo bar';
      expect(el.classList.toString()).toBe('foo bar');
    });
  });

  describe('synchronization', () => {
    it('classList reflects setAttribute changes', () => {
      el.setAttribute('class', 'x y');
      expect(el.classList.contains('x')).toBe(true);
      expect(el.classList.length).toBe(2);
    });

    it('className reflects classList changes', () => {
      el.classList.add('a', 'b');
      expect(el.className).toBe('a b');
    });

    it('getAttribute reflects classList changes', () => {
      el.classList.add('test');
      expect(el.getAttribute('class')).toBe('test');
    });
  });
});
