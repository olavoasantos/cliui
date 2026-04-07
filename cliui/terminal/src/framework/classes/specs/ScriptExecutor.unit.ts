import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';

import {Window} from '@cliui/dom';
import {ScriptContext} from '../ScriptContext';
import {ScriptExecutor} from '../ScriptExecutor';
import {ResourceResolver} from '../ResourceResolver';

import type {HTMLScriptElement} from '@cliui/dom';

describe('ScriptExecutor', () => {
  let tempDir: string;
  let window: Window;
  let scriptContext: ScriptContext;
  let resolver: ResourceResolver;
  let executor: ScriptExecutor;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'script-executor-'));
    window = new Window();
    scriptContext = new ScriptContext(window, {exit: () => {}});
    resolver = new ResourceResolver(tempDir);
    executor = new ScriptExecutor(scriptContext, resolver, window);
  });

  afterEach(() => {
    rmSync(tempDir, {recursive: true, force: true});
  });

  function createScript(attrs?: {src?: string; type?: string; text?: string}): HTMLScriptElement {
    const script = window.document.createElement('script') as HTMLScriptElement;

    if (attrs?.src) {
      script.src = attrs.src;
    }

    if (attrs?.type) {
      script.type = attrs.type;
    }

    if (attrs?.text) {
      script.textContent = attrs.text;
    }

    return script;
  }

  describe('inline script execution', () => {
    it('executes inline script content', () => {
      const script = createScript({text: 'globalThis.__inlineResult = 42'});
      const result = executor.execute(script);
      expect(result).toBe(true);
      expect(scriptContext.run('globalThis.__inlineResult')).toBe(42);
    });

    it('executes multi-line inline scripts', () => {
      const script = createScript({
        text: `
          const a = 10;
          const b = 20;
          globalThis.__sum = a + b;
        `,
      });
      executor.execute(script);
      expect(scriptContext.run('globalThis.__sum')).toBe(30);
    });

    it('skips empty inline scripts', () => {
      const script = createScript({text: ''});
      expect(executor.execute(script)).toBe(true);
    });

    it('skips whitespace-only inline scripts', () => {
      const script = createScript({text: '   \n\t  '});
      expect(executor.execute(script)).toBe(true);
    });
  });

  describe('external script execution', () => {
    it('loads and executes an external script', () => {
      writeFileSync(join(tempDir, 'app.js'), 'globalThis.__externalResult = "loaded"');
      const script = createScript({src: './app.js'});

      const result = executor.execute(script);
      expect(result).toBe(true);
      expect(scriptContext.run('globalThis.__externalResult')).toBe('loaded');
    });

    it('returns false for missing external scripts', () => {
      const script = createScript({src: './nonexistent.js'});
      expect(executor.execute(script)).toBe(false);
    });

    it('dispatches error event on script element for missing files', () => {
      const script = createScript({src: './nonexistent.js'});

      let errorFired = false;
      script.addEventListener('error', () => {
        errorFired = true;
      });

      executor.execute(script);
      expect(errorFired).toBe(true);
    });

    it('dispatches error event on window for missing files', () => {
      const script = createScript({src: './nonexistent.js'});

      let windowErrorFired = false;
      window.addEventListener('error', () => {
        windowErrorFired = true;
      });

      executor.execute(script);
      expect(windowErrorFired).toBe(true);
    });
  });

  describe('error handling', () => {
    it('catches script errors and dispatches error event on element', () => {
      const script = createScript({text: 'throw new Error("test error")'});

      let errorEvent: unknown = null;
      script.addEventListener('error', (e: unknown) => {
        errorEvent = e;
      });

      executor.execute(script);
      expect(errorEvent).not.toBeNull();
    });

    it('catches script errors and dispatches error event on window', () => {
      const script = createScript({text: 'throw new Error("test error")'});

      let windowErrorFired = false;
      window.addEventListener('error', () => {
        windowErrorFired = true;
      });

      executor.execute(script);
      expect(windowErrorFired).toBe(true);
    });

    it('catches errors in external scripts', () => {
      writeFileSync(join(tempDir, 'bad.js'), 'throw new Error("external error")');
      const script = createScript({src: './bad.js'});

      let errorFired = false;
      script.addEventListener('error', () => {
        errorFired = true;
      });

      executor.execute(script);
      expect(errorFired).toBe(true);
    });
  });

  describe('script type handling', () => {
    it('executes scripts with empty type (default)', () => {
      const script = createScript({text: 'globalThis.__typeEmpty = true'});
      executor.execute(script);
      expect(scriptContext.run('globalThis.__typeEmpty')).toBe(true);
    });

    it('executes scripts with type="text/javascript"', () => {
      const script = createScript({type: 'text/javascript', text: 'globalThis.__typeJS = true'});
      executor.execute(script);
      expect(scriptContext.run('globalThis.__typeJS')).toBe(true);
    });

    it('ignores scripts with unrecognised type', () => {
      const script = createScript({
        type: 'text/template',
        text: 'globalThis.__shouldNotRun = true',
      });
      const result = executor.execute(script);
      expect(result).toBe(true); // intentionally skipped
      expect(scriptContext.run('typeof globalThis.__shouldNotRun')).toBe('undefined');
    });

    it('ignores scripts with type="application/json"', () => {
      const script = createScript({type: 'application/json', text: '{"key": "value"}'});
      expect(executor.execute(script)).toBe(true);
    });

    it('returns false for module scripts (handled elsewhere)', () => {
      const script = createScript({type: 'module', text: 'export const x = 1'});
      expect(executor.execute(script)).toBe(false);
    });
  });

  describe('DOM modifications from scripts', () => {
    it('scripts can modify the DOM', () => {
      const script = createScript({
        text: `
          const el = document.createElement('div');
          el.setAttribute('class', 'from-script');
          el.textContent = 'created by script';
          document.body.appendChild(el);
        `,
      });

      executor.execute(script);
      const div = window.document.body.querySelector('.from-script');
      expect(div).not.toBeNull();
      expect(div!.textContent).toBe('created by script');
    });

    it('scripts can access previously parsed DOM elements', () => {
      // Simulate a parsed element already in the DOM
      const target = window.document.createElement('div');
      target.setAttribute('id', 'target');
      target.textContent = 'original';
      window.document.body.appendChild(target);

      const script = createScript({
        text: 'document.querySelector("#target").textContent = "modified"',
      });

      executor.execute(script);
      expect(target.textContent).toBe('modified');
    });
  });
});
