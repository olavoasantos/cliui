import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';

import {Window} from '@cliui/dom';
import {StyleEngine} from '../../../css/classes/StyleEngine';
import {ResourceResolver} from '../ResourceResolver';
import {StylesheetLoader} from '../StylesheetLoader';

import type {Document} from '@cliui/dom';
import type {HTMLLinkElement} from '@cliui/dom';

describe('StylesheetLoader', () => {
  let tempDir: string;
  let window: Window;
  let document: Document;
  let styleEngine: StyleEngine;
  let resolver: ResourceResolver;
  let loader: StylesheetLoader;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'stylesheet-loader-'));
    writeFileSync(join(tempDir, 'styles.css'), '.app { color: red; }');
    writeFileSync(join(tempDir, 'other.css'), '.other { color: blue; }');

    window = new Window();
    document = window.document;
    styleEngine = new StyleEngine();
    styleEngine.attach(document);
    resolver = new ResourceResolver(tempDir);
    loader = new StylesheetLoader(resolver, styleEngine);
  });

  afterEach(() => {
    rmSync(tempDir, {recursive: true, force: true});
  });

  function createLink(href: string): HTMLLinkElement {
    const link = document.createElement('link') as HTMLLinkElement;
    link.rel = 'stylesheet';
    link.href = href;
    return link;
  }

  describe('load', () => {
    it('loads a stylesheet and sets the sheet property', () => {
      const link = createLink('./styles.css');
      document.head.appendChild(link);

      const result = loader.load(link);
      expect(result).toBe(true);
      expect(link.sheet).toBe('.app { color: red; }');
    });

    it('returns false for non-stylesheet links', () => {
      const link = document.createElement('link') as HTMLLinkElement;
      link.rel = 'icon';
      link.href = './favicon.ico';

      expect(loader.load(link)).toBe(false);
    });

    it('returns false for links without href', () => {
      const link = document.createElement('link') as HTMLLinkElement;
      link.rel = 'stylesheet';

      expect(loader.load(link)).toBe(false);
    });

    it('returns false for missing files', () => {
      const link = createLink('./nonexistent.css');
      document.head.appendChild(link);

      expect(loader.load(link)).toBe(false);
      expect(link.sheet).toBeNull();
    });

    it('dispatches error event for missing files', () => {
      const link = createLink('./nonexistent.css');
      document.head.appendChild(link);

      let errorFired = false;
      link.addEventListener('error', () => {
        errorFired = true;
      });

      loader.load(link);
      expect(errorFired).toBe(true);
    });

    it('marks style engine stylesheets as dirty', () => {
      const link = createLink('./styles.css');
      document.head.appendChild(link);

      const invalidateSpy = vi.spyOn(styleEngine, 'invalidateStylesheets');
      loader.load(link);
      expect(invalidateSpy).toHaveBeenCalled();
    });

    it('tracks the loaded element', () => {
      const link = createLink('./styles.css');
      document.head.appendChild(link);

      loader.load(link);
      expect(loader.isLoaded(link)).toBe(true);
      expect(loader.loadedCount).toBe(1);
    });
  });

  describe('loadAsync', () => {
    it('loads a stylesheet asynchronously', async () => {
      const link = createLink('./styles.css');
      document.head.appendChild(link);

      const result = await loader.loadAsync(link);
      expect(result).toBe(true);
      expect(link.sheet).toBe('.app { color: red; }');
    });

    it('returns false for missing files', async () => {
      const link = createLink('./nonexistent.css');
      document.head.appendChild(link);

      expect(await loader.loadAsync(link)).toBe(false);
    });
  });

  describe('unload', () => {
    it('clears the sheet property', () => {
      const link = createLink('./styles.css');
      document.head.appendChild(link);
      loader.load(link);

      loader.unload(link);
      expect(link.sheet).toBeNull();
    });

    it('removes the element from loaded tracking', () => {
      const link = createLink('./styles.css');
      document.head.appendChild(link);
      loader.load(link);

      loader.unload(link);
      expect(loader.isLoaded(link)).toBe(false);
      expect(loader.loadedCount).toBe(0);
    });

    it('marks stylesheets dirty on unload', () => {
      const link = createLink('./styles.css');
      document.head.appendChild(link);
      loader.load(link);

      const invalidateSpy = vi.spyOn(styleEngine, 'invalidateStylesheets');
      loader.unload(link);
      expect(invalidateSpy).toHaveBeenCalled();
    });

    it('is a no-op for elements that were not loaded', () => {
      const link = createLink('./styles.css');
      const invalidateSpy = vi.spyOn(styleEngine, 'invalidateStylesheets');
      loader.unload(link);
      expect(invalidateSpy).not.toHaveBeenCalled();
    });
  });

  describe('reload', () => {
    it('reloads with new href content', () => {
      const link = createLink('./styles.css');
      document.head.appendChild(link);
      loader.load(link);
      expect(link.sheet).toBe('.app { color: red; }');

      // Change the file and href
      link.href = './other.css';
      const result = loader.reload(link);
      expect(result).toBe(true);
      expect(link.sheet).toBe('.other { color: blue; }');
    });
  });

  describe('multiple stylesheets', () => {
    it('supports loading multiple link elements', () => {
      const link1 = createLink('./styles.css');
      const link2 = createLink('./other.css');
      document.head.appendChild(link1);
      document.head.appendChild(link2);

      loader.load(link1);
      loader.load(link2);

      expect(loader.loadedCount).toBe(2);
      expect(link1.sheet).toBe('.app { color: red; }');
      expect(link2.sheet).toBe('.other { color: blue; }');
    });
  });

  describe('integration with style engine', () => {
    it('loaded stylesheets participate in cascade', () => {
      const link = createLink('./styles.css');
      document.head.appendChild(link);
      loader.load(link);

      // Create an element that matches the CSS rule
      const div = document.createElement('div');
      div.setAttribute('class', 'app');
      document.body.appendChild(div);

      // Recompute styles — the loaded CSS should be applied
      styleEngine.recomputeDirty();
      const computed = styleEngine.getComputedStyle(div);
      expect(computed.get('color')).toBe('red');
    });

    it('unloading removes rules from cascade', () => {
      const link = createLink('./styles.css');
      document.head.appendChild(link);
      loader.load(link);

      const div = document.createElement('div');
      div.setAttribute('class', 'app');
      document.body.appendChild(div);

      styleEngine.recomputeDirty();
      expect(styleEngine.getComputedStyle(div).get('color')).toBe('red');

      // Unload and recompute
      loader.unload(link);
      document.head.removeChild(link);
      styleEngine.recomputeDirty();
      expect(styleEngine.getComputedStyle(div).get('color')).not.toBe('red');
    });

    it('multiple external stylesheets cascade in document order', () => {
      // Both files target the same class with different colors
      writeFileSync(join(tempDir, 'first.css'), '.target { color: red; }');
      writeFileSync(join(tempDir, 'second.css'), '.target { color: blue; }');

      const link1 = createLink('./first.css');
      const link2 = createLink('./second.css');
      document.head.appendChild(link1);
      document.head.appendChild(link2);

      loader.load(link1);
      loader.load(link2);

      const div = document.createElement('div');
      div.setAttribute('class', 'target');
      document.body.appendChild(div);

      styleEngine.recomputeDirty();
      // Second stylesheet wins (same specificity, later in document order)
      expect(styleEngine.getComputedStyle(div).get('color')).toBe('blue');
    });
  });
});
