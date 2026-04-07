import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';

import {Window} from '@cliui/dom';
import {ScriptContext} from '../ScriptContext';
import {ModuleScriptExecutor} from '../ModuleScriptExecutor';
import {ResourceResolver} from '../ResourceResolver';

import type {HTMLScriptElement} from '@cliui/dom';

describe('ModuleScriptExecutor', () => {
  let tempDir: string;
  let window: Window;
  let scriptContext: ScriptContext;
  let resolver: ResourceResolver;
  let executor: ModuleScriptExecutor;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'module-executor-'));
    window = new Window();
    scriptContext = new ScriptContext(window, {exit: () => {}});
    resolver = new ResourceResolver(tempDir);
    executor = new ModuleScriptExecutor(scriptContext, resolver, window);
  });

  afterEach(() => {
    executor.cleanupGlobals();
    rmSync(tempDir, {recursive: true, force: true});
  });

  function createModuleScript(attrs?: {src?: string; text?: string}): HTMLScriptElement {
    const script = window.document.createElement('script') as HTMLScriptElement;
    script.type = 'module';

    if (attrs?.src) {
      script.src = attrs.src;
    }

    if (attrs?.text) {
      script.textContent = attrs.text;
    }

    return script;
  }

  describe('enqueue', () => {
    it('enqueues an external module script', () => {
      const script = createModuleScript({src: './app.mjs'});
      executor.enqueue(script);
      expect(executor.deferredCount).toBe(1);
    });

    it('enqueues an inline module script', () => {
      const script = createModuleScript({text: 'const x = 1;'});
      executor.enqueue(script);
      expect(executor.deferredCount).toBe(1);
    });

    it('ignores empty inline module scripts', () => {
      const script = createModuleScript({text: ''});
      executor.enqueue(script);
      expect(executor.deferredCount).toBe(0);
    });

    it('ignores whitespace-only inline module scripts', () => {
      const script = createModuleScript({text: '  \n\t  '});
      executor.enqueue(script);
      expect(executor.deferredCount).toBe(0);
    });
  });

  describe('executeDeferredModules', () => {
    it('executes external module scripts', async () => {
      writeFileSync(join(tempDir, 'app.mjs'), 'globalThis.__moduleLoaded = true;');

      const script = createModuleScript({src: './app.mjs'});
      executor.enqueue(script);
      await executor.executeDeferredModules();

      expect((globalThis as Record<string, unknown>).__moduleLoaded).toBe(true);
      delete (globalThis as Record<string, unknown>).__moduleLoaded;
    });

    it('executes inline module scripts', async () => {
      const script = createModuleScript({
        text: 'globalThis.__inlineModuleLoaded = true;',
      });

      executor.enqueue(script);
      await executor.executeDeferredModules();

      expect((globalThis as Record<string, unknown>).__inlineModuleLoaded).toBe(true);
      delete (globalThis as Record<string, unknown>).__inlineModuleLoaded;
    });

    it('executes modules in document order', async () => {
      writeFileSync(
        join(tempDir, 'first.mjs'),
        'globalThis.__moduleOrder = (globalThis.__moduleOrder || "") + "A";',
      );
      writeFileSync(
        join(tempDir, 'second.mjs'),
        'globalThis.__moduleOrder = (globalThis.__moduleOrder || "") + "B";',
      );

      executor.enqueue(createModuleScript({src: './first.mjs'}));
      executor.enqueue(createModuleScript({src: './second.mjs'}));
      await executor.executeDeferredModules();

      expect((globalThis as Record<string, unknown>).__moduleOrder).toBe('AB');
      delete (globalThis as Record<string, unknown>).__moduleOrder;
    });

    it('clears the deferred queue after execution', async () => {
      writeFileSync(join(tempDir, 'app.mjs'), '// noop');

      executor.enqueue(createModuleScript({src: './app.mjs'}));
      await executor.executeDeferredModules();

      expect(executor.deferredCount).toBe(0);
    });
  });

  describe('error handling', () => {
    it('dispatches error event for missing external modules', async () => {
      const script = createModuleScript({src: './nonexistent.mjs'});

      let errorFired = false;
      script.addEventListener('error', () => {
        errorFired = true;
      });

      executor.enqueue(script);
      await executor.executeDeferredModules();

      expect(errorFired).toBe(true);
    });

    it('dispatches error event on window for missing modules', async () => {
      const script = createModuleScript({src: './nonexistent.mjs'});

      let windowErrorFired = false;
      window.addEventListener('error', () => {
        windowErrorFired = true;
      });

      executor.enqueue(script);
      await executor.executeDeferredModules();

      expect(windowErrorFired).toBe(true);
    });

    it('dispatches error event for syntax errors in modules', async () => {
      writeFileSync(join(tempDir, 'bad.mjs'), 'const {{{= broken syntax');

      const script = createModuleScript({src: './bad.mjs'});

      let errorFired = false;
      script.addEventListener('error', () => {
        errorFired = true;
      });

      executor.enqueue(script);
      await executor.executeDeferredModules();

      expect(errorFired).toBe(true);
    });

    it('continues executing remaining modules after an error', async () => {
      writeFileSync(join(tempDir, 'bad.mjs'), 'throw new Error("fail");');
      writeFileSync(join(tempDir, 'good.mjs'), 'globalThis.__afterError = true;');

      executor.enqueue(createModuleScript({src: './bad.mjs'}));
      executor.enqueue(createModuleScript({src: './good.mjs'}));
      await executor.executeDeferredModules();

      expect((globalThis as Record<string, unknown>).__afterError).toBe(true);
      delete (globalThis as Record<string, unknown>).__afterError;
    });
  });

  describe('global injection', () => {
    it('makes window available in modules', async () => {
      writeFileSync(
        join(tempDir, 'check-globals.mjs'),
        'globalThis.__hasWindow = typeof window !== "undefined";',
      );

      executor.enqueue(createModuleScript({src: './check-globals.mjs'}));
      await executor.executeDeferredModules();

      expect((globalThis as Record<string, unknown>).__hasWindow).toBe(true);
      delete (globalThis as Record<string, unknown>).__hasWindow;
    });

    it('makes document available in modules', async () => {
      writeFileSync(
        join(tempDir, 'check-doc.mjs'),
        'globalThis.__hasDocument = typeof document !== "undefined";',
      );

      executor.enqueue(createModuleScript({src: './check-doc.mjs'}));
      await executor.executeDeferredModules();

      expect((globalThis as Record<string, unknown>).__hasDocument).toBe(true);
      delete (globalThis as Record<string, unknown>).__hasDocument;
    });
  });

  describe('cleanupGlobals', () => {
    it('removes injected globals', async () => {
      writeFileSync(join(tempDir, 'noop.mjs'), '// noop');

      executor.enqueue(createModuleScript({src: './noop.mjs'}));
      await executor.executeDeferredModules();

      executor.cleanupGlobals();

      // Globals should be cleaned up
      expect((globalThis as Record<string, unknown>).terminal).toBeUndefined();
    });
  });

  describe('resolveImport', () => {
    it('resolves relative imports against the referrer path', () => {
      const resolved = executor.resolveImport('./utils.js', '/app/main.js');
      expect(resolved).toBe(join('/app', 'utils.js'));
    });

    it('resolves parent-relative imports', () => {
      const resolved = executor.resolveImport('../shared.js', '/app/src/main.js');
      expect(resolved).toBe(join('/app', 'shared.js'));
    });

    it('returns bare specifiers as-is', () => {
      const resolved = executor.resolveImport('lodash', '/app/main.js');
      expect(resolved).toBe('lodash');
    });
  });
});
