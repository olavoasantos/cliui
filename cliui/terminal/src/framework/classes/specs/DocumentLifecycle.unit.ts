import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';

import {Window} from '@cliui/dom';
import {ScriptContext} from '../ScriptContext';
import {ScriptExecutor} from '../ScriptExecutor';
import {ModuleScriptExecutor} from '../ModuleScriptExecutor';
import {ResourceResolver} from '../ResourceResolver';
import {DocumentLifecycle} from '../DocumentLifecycle';

import type {HTMLScriptElement} from '@cliui/dom';

describe('DocumentLifecycle', () => {
  let tempDir: string;
  let window: Window;
  let scriptContext: ScriptContext;
  let resolver: ResourceResolver;
  let scriptExecutor: ScriptExecutor;
  let moduleExecutor: ModuleScriptExecutor;
  let lifecycle: DocumentLifecycle;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'lifecycle-'));
    window = new Window();
    scriptContext = new ScriptContext(window, {exit: () => {}});
    resolver = new ResourceResolver(tempDir);
    scriptExecutor = new ScriptExecutor(scriptContext, resolver, window);
    moduleExecutor = new ModuleScriptExecutor(scriptContext, resolver, window);
    lifecycle = new DocumentLifecycle(scriptExecutor, moduleExecutor, window);
  });

  afterEach(() => {
    moduleExecutor.cleanupGlobals();
    rmSync(tempDir, {recursive: true, force: true});
  });

  function createScript(attrs?: {
    src?: string;
    type?: string;
    text?: string;
    defer?: boolean;
    async?: boolean;
  }): HTMLScriptElement {
    const script = window.document.createElement('script') as HTMLScriptElement;

    if (attrs?.src) script.src = attrs.src;
    if (attrs?.type) script.type = attrs.type;
    if (attrs?.text) script.textContent = attrs.text;
    if (attrs?.defer) script.defer = true;
    if (attrs?.async) script.async = true;

    return script;
  }

  describe('classic script execution order', () => {
    it('executes head scripts immediately', () => {
      const script = createScript({text: 'globalThis.__headScript = true'});
      lifecycle.processScript(script, true);
      expect(scriptContext.run('globalThis.__headScript')).toBe(true);
    });

    it('executes body scripts immediately', () => {
      const script = createScript({text: 'globalThis.__bodyScript = true'});
      lifecycle.processScript(script, false);
      expect(scriptContext.run('globalThis.__bodyScript')).toBe(true);
    });

    it('executes scripts in document order', () => {
      lifecycle.processScript(
        createScript({text: 'globalThis.__order = (globalThis.__order || "") + "A"'}),
      );
      lifecycle.processScript(
        createScript({text: 'globalThis.__order = (globalThis.__order || "") + "B"'}),
      );
      lifecycle.processScript(
        createScript({text: 'globalThis.__order = (globalThis.__order || "") + "C"'}),
      );

      expect(scriptContext.run('globalThis.__order')).toBe('ABC');
    });
  });

  describe('deferred scripts', () => {
    it('does not execute defer scripts immediately', () => {
      const script = createScript({
        defer: true,
        text: 'globalThis.__deferRan = true',
      });

      lifecycle.processScript(script);
      expect(scriptContext.run('typeof globalThis.__deferRan')).toBe('undefined');
    });

    it('executes defer scripts during finishParsing', async () => {
      const script = createScript({
        defer: true,
        text: 'globalThis.__deferRan = true',
      });

      lifecycle.processScript(script);
      await lifecycle.finishParsing();
      expect(scriptContext.run('globalThis.__deferRan')).toBe(true);
    });

    it('executes defer scripts in document order', async () => {
      lifecycle.processScript(
        createScript({
          defer: true,
          text: 'globalThis.__deferOrder = (globalThis.__deferOrder || "") + "A"',
        }),
      );
      lifecycle.processScript(
        createScript({
          defer: true,
          text: 'globalThis.__deferOrder = (globalThis.__deferOrder || "") + "B"',
        }),
      );
      lifecycle.processScript(
        createScript({
          defer: true,
          text: 'globalThis.__deferOrder = (globalThis.__deferOrder || "") + "C"',
        }),
      );

      await lifecycle.finishParsing();
      expect(scriptContext.run('globalThis.__deferOrder')).toBe('ABC');
    });

    it('executes defer scripts before DOMContentLoaded', async () => {
      let dclFired = false;
      let deferRanBeforeDCL = false;

      window.document.addEventListener('DOMContentLoaded', () => {
        dclFired = true;
      });

      const script = createScript({
        defer: true,
        text: 'globalThis.__deferComplete = true',
      });

      lifecycle.processScript(script);
      await lifecycle.finishParsing();

      deferRanBeforeDCL = scriptContext.run('globalThis.__deferComplete') === true && dclFired;
      expect(deferRanBeforeDCL).toBe(true);
    });
  });

  describe('async scripts', () => {
    it('executes async scripts immediately (filesystem is instant)', () => {
      const script = createScript({
        async: true,
        text: 'globalThis.__asyncRan = true',
      });

      lifecycle.processScript(script);
      expect(scriptContext.run('globalThis.__asyncRan')).toBe(true);
    });
  });

  describe('module scripts', () => {
    it('defers module scripts by default', () => {
      const script = createScript({type: 'module', text: 'const x = 1;'});
      lifecycle.processScript(script);
      expect(lifecycle.deferredCount).toBe(1);
    });

    it('executes module scripts during finishParsing', async () => {
      writeFileSync(join(tempDir, 'mod.mjs'), 'globalThis.__moduleRan = true;');

      const script = createScript({type: 'module', src: './mod.mjs'});
      lifecycle.processScript(script);
      await lifecycle.finishParsing();

      expect((globalThis as Record<string, unknown>).__moduleRan).toBe(true);
      delete (globalThis as Record<string, unknown>).__moduleRan;
    });
  });

  describe('unrecognised type', () => {
    it('ignores scripts with unrecognised type', () => {
      const script = createScript({
        type: 'text/template',
        text: 'globalThis.__shouldNotRun = true',
      });

      lifecycle.processScript(script);
      expect(scriptContext.run('typeof globalThis.__shouldNotRun')).toBe('undefined');
    });
  });

  describe('DOMContentLoaded event', () => {
    it('fires DOMContentLoaded on document after finishParsing', async () => {
      let dclFired = false;
      window.document.addEventListener('DOMContentLoaded', () => {
        dclFired = true;
      });

      await lifecycle.finishParsing();
      expect(dclFired).toBe(true);
    });

    it('fires DOMContentLoaded after all deferred scripts execute', async () => {
      const order: string[] = [];

      const script = createScript({
        defer: true,
        text: 'globalThis.__deferForDCL = true',
      });

      lifecycle.processScript(script);

      window.document.addEventListener('DOMContentLoaded', () => {
        // At this point, the deferred script should have already run
        order.push(scriptContext.run('globalThis.__deferForDCL') === true ? 'defer' : 'no-defer');
        order.push('dcl');
      });

      await lifecycle.finishParsing();
      expect(order).toEqual(['defer', 'dcl']);
    });

    it('scripts can register DOMContentLoaded listeners', async () => {
      const script = createScript({
        text: `
          document.addEventListener('DOMContentLoaded', () => {
            globalThis.__dclFromScript = true;
          });
        `,
      });

      lifecycle.processScript(script);
      await lifecycle.finishParsing();
      expect(scriptContext.run('globalThis.__dclFromScript')).toBe(true);
    });
  });

  describe('load event', () => {
    it('fires load event on window', () => {
      let loadFired = false;
      window.addEventListener('load', () => {
        loadFired = true;
      });

      lifecycle.fireLoadEvent();
      expect(loadFired).toBe(true);
    });

    it('scripts can register load listeners', async () => {
      const script = createScript({
        text: `
          window.addEventListener('load', () => {
            globalThis.__loadFromScript = true;
          });
        `,
      });

      lifecycle.processScript(script);
      await lifecycle.finishParsing();
      lifecycle.fireLoadEvent();
      expect(scriptContext.run('globalThis.__loadFromScript')).toBe(true);
    });
  });

  describe('isParsed', () => {
    it('is false before finishParsing', () => {
      expect(lifecycle.isParsed).toBe(false);
    });

    it('is true after finishParsing', async () => {
      await lifecycle.finishParsing();
      expect(lifecycle.isParsed).toBe(true);
    });
  });

  describe('combined ordering', () => {
    it('sync scripts run before defer scripts, which run before DOMContentLoaded', async () => {
      lifecycle.processScript(
        createScript({text: 'globalThis.__execOrder = (globalThis.__execOrder || "") + "sync,"'}),
      );

      lifecycle.processScript(
        createScript({
          defer: true,
          text: 'globalThis.__execOrder = (globalThis.__execOrder || "") + "defer,"',
        }),
      );

      window.document.addEventListener('DOMContentLoaded', () => {
        scriptContext.run('globalThis.__execOrder = (globalThis.__execOrder || "") + "dcl,"');
      });

      await lifecycle.finishParsing();

      expect(scriptContext.run('globalThis.__execOrder')).toBe('sync,defer,dcl,');
    });
  });
});
