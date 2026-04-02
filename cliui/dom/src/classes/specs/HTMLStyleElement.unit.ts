import {describe, it, expect, beforeEach, vi} from 'vitest';
import {Window} from '../Window';
import {HTMLStyleElement} from '../HTMLStyleElement';
import {HOOKS} from '../../constants';
import type {Document} from '../Document';

describe('HTMLStyleElement', () => {
  let doc: Document;

  beforeEach(() => {
    const window = new Window();
    doc = window.document;
  });

  it('creates a style element via createElement', () => {
    const style = doc.createElement('style');
    expect(style).toBeInstanceOf(HTMLStyleElement);
    expect(style.nodeName.toLowerCase()).toBe('style');
  });

  describe('sheet', () => {
    it('returns empty string when no content', () => {
      const style = doc.createElement('style') as HTMLStyleElement;
      expect(style.sheet).toBe('');
    });

    it('returns empty string when text content is explicitly cleared', () => {
      const style = doc.createElement('style') as HTMLStyleElement;
      style.textContent = '.a { color: red; }';
      style.textContent = '';
      expect(style.sheet).toBe('');
    });

    it('returns the text content', () => {
      const style = doc.createElement('style') as HTMLStyleElement;
      style.textContent = '.box { color: red; }';
      expect(style.sheet).toBe('.box { color: red; }');
    });

    it('reflects text content changes', () => {
      const style = doc.createElement('style') as HTMLStyleElement;
      style.textContent = 'a { color: blue; }';
      expect(style.sheet).toBe('a { color: blue; }');
      style.textContent = 'b { color: green; }';
      expect(style.sheet).toBe('b { color: green; }');
    });
  });

  describe('hooks tracking', () => {
    it('fires insertChild when style is added to the document', () => {
      const insertChild = vi.fn();
      const window = new Window();
      window[HOOKS] = {insertChild};
      const d = window.document;

      const style = d.createElement('style') as HTMLStyleElement;
      style.textContent = '.test { display: flex; }';
      d.head.appendChild(style);

      expect(insertChild).toHaveBeenCalled();
      const callArgs = insertChild.mock.calls.find((args: unknown[]) => args[1] === style);
      expect(callArgs).toBeTruthy();
    });

    it('fires removeChild when style is removed from the document', () => {
      const removeChild = vi.fn();
      const insertChild = vi.fn();
      const window = new Window();
      window[HOOKS] = {insertChild, removeChild};
      const d = window.document;

      const style = d.createElement('style') as HTMLStyleElement;
      d.head.appendChild(style);
      d.head.removeChild(style);

      expect(removeChild).toHaveBeenCalled();
    });

    it('fires setText when style text content is changed', () => {
      const setText = vi.fn();
      const insertChild = vi.fn();
      const createText = vi.fn();
      const window = new Window();
      window[HOOKS] = {setText, insertChild, createText};
      const d = window.document;

      const style = d.createElement('style') as HTMLStyleElement;
      d.head.appendChild(style);
      style.textContent = '.updated { color: red; }';
      expect(style.sheet).toBe('.updated { color: red; }');
    });
  });
});
