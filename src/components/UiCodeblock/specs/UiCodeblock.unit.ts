import {describe, expect, it} from 'vitest';

import {Window} from '../../../dom';
import {UiCodeblock} from '../component';
import {UI_CODEBLOCK_CONTENT_CLASS, UI_CODEBLOCK_GUTTER_CLASS} from '../constants';

import type {CustomElementConstructor} from '../../../dom/types';

function createCodeblock(
  window = new Window(),
  code = '',
  attributes: Record<string, string | boolean> = {},
): {window: Window; codeblock: UiCodeblock} {
  window.customElements.define(
    UiCodeblock.tagName,
    UiCodeblock as unknown as CustomElementConstructor,
  );

  const codeblock = window.document.createElement('ui-codeblock') as UiCodeblock;

  for (const [name, value] of Object.entries(attributes)) {
    if (typeof value === 'boolean') {
      if (value) codeblock.setAttribute(name, '');
    } else {
      codeblock.setAttribute(name, value);
    }
  }

  if (code) {
    codeblock.textContent = code;
  }

  window.document.body.appendChild(codeblock);

  return {window, codeblock};
}

function getLineContents(codeblock: UiCodeblock): string[] {
  const lines: string[] = [];

  for (let i = 0; i < codeblock.childNodes.length; i++) {
    const child = codeblock.childNodes[i] as import('../../../dom').Element;

    if (child.getAttribute?.('class')?.includes('ui-codeblock-line')) {
      /* Find the content div */
      for (let j = 0; j < child.childNodes.length; j++) {
        const inner = child.childNodes[j] as import('../../../dom').Element;

        if (inner.getAttribute?.('class') === UI_CODEBLOCK_CONTENT_CLASS) {
          lines.push(inner.textContent ?? '');
        }
      }
    }
  }

  return lines;
}

function getGutterContents(codeblock: UiCodeblock): string[] {
  const gutters: string[] = [];

  for (let i = 0; i < codeblock.childNodes.length; i++) {
    const child = codeblock.childNodes[i] as import('../../../dom').Element;

    if (child.getAttribute?.('class')?.includes('ui-codeblock-line')) {
      for (let j = 0; j < child.childNodes.length; j++) {
        const inner = child.childNodes[j] as import('../../../dom').Element;

        if (inner.getAttribute?.('class') === UI_CODEBLOCK_GUTTER_CLASS) {
          gutters.push(inner.textContent ?? '');
        }
      }
    }
  }

  return gutters;
}

function getTokenColors(codeblock: UiCodeblock, lineIndex: number): string[] {
  const colors: string[] = [];
  const lineEl = codeblock.childNodes[lineIndex] as import('../../../dom').Element;
  if (!lineEl) return colors;

  for (let j = 0; j < lineEl.childNodes.length; j++) {
    const inner = lineEl.childNodes[j] as import('../../../dom').Element;

    if (inner.getAttribute?.('class') === UI_CODEBLOCK_CONTENT_CLASS) {
      for (let k = 0; k < inner.childNodes.length; k++) {
        const span = inner.childNodes[k] as import('../../../dom').Element;

        if (span.style) {
          colors.push(span.style.getPropertyValue('color'));
        }
      }
    }
  }

  return colors;
}

describe('UiCodeblock', () => {
  it('registers the custom element under its tag name', () => {
    const window = new Window();

    window.customElements.define(
      UiCodeblock.tagName,
      UiCodeblock as unknown as CustomElementConstructor,
    );

    expect(window.customElements.get('ui-codeblock')).toBe(
      UiCodeblock as unknown as CustomElementConstructor,
    );
  });

  describe('plain rendering', () => {
    it('renders code lines preserving whitespace', () => {
      UiCodeblock.resetHighlighter();

      const {codeblock} = createCodeblock(undefined, 'line 1\n  line 2\nline 3');
      const lines = getLineContents(codeblock);

      expect(lines).toEqual(['line 1', '  line 2', 'line 3']);
    });

    it('handles single line code', () => {
      UiCodeblock.resetHighlighter();

      const {codeblock} = createCodeblock(undefined, 'hello world');
      const lines = getLineContents(codeblock);

      expect(lines).toEqual(['hello world']);
    });

    it('handles empty code', () => {
      UiCodeblock.resetHighlighter();

      const {codeblock} = createCodeblock(undefined, '');
      const lines = getLineContents(codeblock);

      expect(lines).toEqual(['']);
    });

    it('strips trailing empty line from final newline', () => {
      UiCodeblock.resetHighlighter();

      const {codeblock} = createCodeblock(undefined, 'a\nb\n');
      const lines = getLineContents(codeblock);

      expect(lines).toEqual(['a', 'b']);
    });
  });

  describe('syntax highlighting', () => {
    it('tokenizes code when highlighter is loaded and language is set', async () => {
      const js = (await import('shiki/langs/javascript.mjs')).default;
      const nord = (await import('shiki/themes/nord.mjs')).default;
      await UiCodeblock.loadHighlighter({langs: [js], themes: [nord]});

      const {codeblock} = createCodeblock(undefined, 'const x = 1;', {
        language: 'javascript',
        theme: 'nord',
      });

      const colors = getTokenColors(codeblock, 0);

      /* Shiki should produce colored tokens */
      expect(colors.length).toBeGreaterThanOrEqual(1);
      expect(colors.some((c) => c.length > 0)).toBe(true);

      /* Verify tokens reconstruct the original line */
      const lineContent = getLineContents(codeblock);
      expect(lineContent[0]).toBe('const x = 1;');
    });

    it('applies theme background color', async () => {
      const js = (await import('shiki/langs/javascript.mjs')).default;
      const nord = (await import('shiki/themes/nord.mjs')).default;
      await UiCodeblock.loadHighlighter({langs: [js], themes: [nord]});

      const {codeblock} = createCodeblock(undefined, 'const x = 1;', {
        language: 'javascript',
        theme: 'nord',
      });

      const bg = codeblock.style.getPropertyValue('background-color');

      expect(bg).toBeTruthy();
    });

    it('falls back to plain rendering when no highlighter is loaded', () => {
      UiCodeblock.resetHighlighter();

      const {codeblock} = createCodeblock(undefined, 'const x = 1;', {language: 'javascript'});
      const lines = getLineContents(codeblock);

      expect(lines).toEqual(['const x = 1;']);
    });

    it('falls back to plain rendering when language is not set', async () => {
      const js = (await import('shiki/langs/javascript.mjs')).default;
      const nord = (await import('shiki/themes/nord.mjs')).default;
      await UiCodeblock.loadHighlighter({langs: [js], themes: [nord]});

      const {codeblock} = createCodeblock(undefined, 'const x = 1;');
      const colors = getTokenColors(codeblock, 0);

      /* No tokens with explicit colors — plain text */
      expect(colors).toHaveLength(0);
    });

    it('falls back when language is not loaded', async () => {
      const js = (await import('shiki/langs/javascript.mjs')).default;
      const nord = (await import('shiki/themes/nord.mjs')).default;
      await UiCodeblock.loadHighlighter({langs: [js], themes: [nord]});

      const {codeblock} = createCodeblock(undefined, 'fn main() {}', {language: 'rust'});
      const lines = getLineContents(codeblock);

      expect(lines).toEqual(['fn main() {}']);
    });
  });

  describe('line numbers', () => {
    it('shows line numbers when attribute is set', () => {
      UiCodeblock.resetHighlighter();

      const {codeblock} = createCodeblock(undefined, 'a\nb\nc', {'line-numbers': true});
      const gutters = getGutterContents(codeblock);

      expect(gutters).toEqual(['1 ', '2 ', '3 ']);
    });

    it('pads line numbers for multi-digit counts', () => {
      UiCodeblock.resetHighlighter();

      const code = Array.from({length: 12}, (_, i) => `line ${i + 1}`).join('\n');
      const {codeblock} = createCodeblock(undefined, code, {'line-numbers': true});
      const gutters = getGutterContents(codeblock);

      expect(gutters[0]).toBe(' 1 ');
      expect(gutters[8]).toBe(' 9 ');
      expect(gutters[9]).toBe('10 ');
      expect(gutters[11]).toBe('12 ');
    });

    it('does not show line numbers by default', () => {
      UiCodeblock.resetHighlighter();

      const {codeblock} = createCodeblock(undefined, 'a\nb');
      const gutters = getGutterContents(codeblock);

      expect(gutters).toHaveLength(0);
    });
  });

  describe('wrapping', () => {
    it('uses nowrap by default', () => {
      UiCodeblock.resetHighlighter();

      const {codeblock} = createCodeblock(undefined, 'long line here');
      const lineEl = codeblock.childNodes[0] as import('../../../dom').Element;

      /* Find content div */
      for (let j = 0; j < lineEl.childNodes.length; j++) {
        const inner = lineEl.childNodes[j] as import('../../../dom').Element;

        if (inner.getAttribute?.('class') === UI_CODEBLOCK_CONTENT_CLASS) {
          expect(inner.style.getPropertyValue('white-space')).toBe('nowrap');
        }
      }
    });

    it('uses pre-wrap when wrap attribute is set', () => {
      UiCodeblock.resetHighlighter();

      const {codeblock} = createCodeblock(undefined, 'long line here', {wrap: true});
      const lineEl = codeblock.childNodes[0] as import('../../../dom').Element;

      for (let j = 0; j < lineEl.childNodes.length; j++) {
        const inner = lineEl.childNodes[j] as import('../../../dom').Element;

        if (inner.getAttribute?.('class') === UI_CODEBLOCK_CONTENT_CLASS) {
          expect(inner.style.getPropertyValue('white-space')).toBe('pre-wrap');
        }
      }
    });
  });

  describe('inline layout', () => {
    it('sets display inline on content elements so tokens flow horizontally', async () => {
      const js = (await import('shiki/langs/javascript.mjs')).default;
      const nord = (await import('shiki/themes/nord.mjs')).default;
      await UiCodeblock.loadHighlighter({langs: [js], themes: [nord]});

      const {codeblock} = createCodeblock(undefined, 'const x = 1;', {
        language: 'javascript',
        theme: 'nord',
      });

      /* Content div must be display: inline so token children flow as a row */
      const lineEl = codeblock.childNodes[0] as import('../../../dom').Element;
      let contentEl: import('../../../dom').Element | null = null;

      for (let j = 0; j < lineEl.childNodes.length; j++) {
        const inner = lineEl.childNodes[j] as import('../../../dom').Element;

        if (inner.getAttribute?.('class') === UI_CODEBLOCK_CONTENT_CLASS) {
          contentEl = inner;
        }
      }

      expect(contentEl).not.toBeNull();
      expect(contentEl!.style.getPropertyValue('display')).toBe('inline');
    });

    it('sets display inline on each token span', async () => {
      const js = (await import('shiki/langs/javascript.mjs')).default;
      const nord = (await import('shiki/themes/nord.mjs')).default;
      await UiCodeblock.loadHighlighter({langs: [js], themes: [nord]});

      const {codeblock} = createCodeblock(undefined, 'const x = 1;', {
        language: 'javascript',
        theme: 'nord',
      });

      const lineEl = codeblock.childNodes[0] as import('../../../dom').Element;

      for (let j = 0; j < lineEl.childNodes.length; j++) {
        const inner = lineEl.childNodes[j] as import('../../../dom').Element;

        if (inner.getAttribute?.('class') === UI_CODEBLOCK_CONTENT_CLASS) {
          for (let k = 0; k < inner.childNodes.length; k++) {
            const span = inner.childNodes[k] as import('../../../dom').Element;

            if (span.style) {
              expect(span.style.getPropertyValue('display')).toBe('inline');
            }
          }
        }
      }
    });

    it('sets display inline on gutter elements', () => {
      UiCodeblock.resetHighlighter();

      const {codeblock} = createCodeblock(undefined, 'a\nb', {'line-numbers': true});
      const lineEl = codeblock.childNodes[0] as import('../../../dom').Element;

      for (let j = 0; j < lineEl.childNodes.length; j++) {
        const inner = lineEl.childNodes[j] as import('../../../dom').Element;

        if (inner.getAttribute?.('class') === UI_CODEBLOCK_GUTTER_CLASS) {
          expect(inner.style.getPropertyValue('display')).toBe('inline');
        }
      }
    });

    it('uses flex-wrap nowrap on content so tokens do not wrap by default', async () => {
      const js = (await import('shiki/langs/javascript.mjs')).default;
      const nord = (await import('shiki/themes/nord.mjs')).default;
      await UiCodeblock.loadHighlighter({langs: [js], themes: [nord]});

      const {codeblock} = createCodeblock(undefined, 'const x = 1;', {
        language: 'javascript',
        theme: 'nord',
      });

      const lineEl = codeblock.childNodes[0] as import('../../../dom').Element;

      for (let j = 0; j < lineEl.childNodes.length; j++) {
        const inner = lineEl.childNodes[j] as import('../../../dom').Element;

        if (inner.getAttribute?.('class') === UI_CODEBLOCK_CONTENT_CLASS) {
          expect(inner.style.getPropertyValue('flex-wrap')).toBe('nowrap');
        }
      }
    });
  });

  describe('setCode', () => {
    it('re-renders with new code', () => {
      UiCodeblock.resetHighlighter();

      const {codeblock} = createCodeblock(undefined, 'original');

      expect(getLineContents(codeblock)).toEqual(['original']);

      codeblock.setCode('updated\ncontent');

      expect(getLineContents(codeblock)).toEqual(['updated', 'content']);
    });

    it('getCode returns the current code', () => {
      UiCodeblock.resetHighlighter();

      const {codeblock} = createCodeblock(undefined, 'hello');

      expect(codeblock.getCode()).toBe('hello');

      codeblock.setCode('world');

      expect(codeblock.getCode()).toBe('world');
    });
  });

  describe('attribute changes', () => {
    it('re-renders when language changes', async () => {
      const js = (await import('shiki/langs/javascript.mjs')).default;
      const nord = (await import('shiki/themes/nord.mjs')).default;
      await UiCodeblock.loadHighlighter({langs: [js], themes: [nord]});

      const {codeblock} = createCodeblock(undefined, 'const x = 1;');
      const colorsWithout = getTokenColors(codeblock, 0);

      codeblock.setAttribute('language', 'javascript');
      codeblock.setAttribute('theme', 'nord');
      const colorsWith = getTokenColors(codeblock, 0);

      expect(colorsWithout).toHaveLength(0);
      expect(colorsWith.length).toBeGreaterThan(0);
    });

    it('re-renders when line-numbers is toggled', () => {
      UiCodeblock.resetHighlighter();

      const {codeblock} = createCodeblock(undefined, 'a\nb');

      expect(getGutterContents(codeblock)).toHaveLength(0);

      codeblock.setAttribute('line-numbers', '');

      expect(getGutterContents(codeblock)).toHaveLength(2);
    });
  });
});
