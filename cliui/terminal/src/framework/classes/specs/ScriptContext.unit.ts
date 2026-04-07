import {describe, expect, it} from 'vitest';
import {Window} from '@cliui/dom';
import {ScriptContext} from '../ScriptContext';

describe('ScriptContext', () => {
  function createEnv() {
    const window = new Window();
    const terminal = {exit: () => {}};
    const ctx = new ScriptContext(window, terminal);
    return {window, terminal, ctx};
  }

  describe('global access', () => {
    it('exposes window as a global', () => {
      const {ctx, window} = createEnv();
      const result = ctx.run('window');
      expect(result).toBe(window);
    });

    it('exposes document as a global', () => {
      const {ctx, window} = createEnv();
      const result = ctx.run('document');
      expect(result).toBe(window.document);
    });

    it('exposes console as a global', () => {
      const {ctx} = createEnv();
      const result = ctx.run('typeof console.log');
      expect(result).toBe('function');
    });

    it('exposes terminal as a global', () => {
      const {ctx, terminal} = createEnv();
      const result = ctx.run('terminal');
      expect(result).toBe(terminal);
    });

    it('exposes performance as a global', () => {
      const {ctx, window} = createEnv();
      const result = ctx.run('performance');
      expect(result).toBe(window.performance);
    });

    it('exposes navigator as a global', () => {
      const {ctx, window} = createEnv();
      const result = ctx.run('navigator');
      expect(result).toBe(window.navigator);
    });

    it('exposes setTimeout as a global', () => {
      const {ctx} = createEnv();
      const result = ctx.run('typeof setTimeout');
      expect(result).toBe('function');
    });

    it('exposes setInterval as a global', () => {
      const {ctx} = createEnv();
      const result = ctx.run('typeof setInterval');
      expect(result).toBe('function');
    });

    it('exposes clearTimeout as a global', () => {
      const {ctx} = createEnv();
      const result = ctx.run('typeof clearTimeout');
      expect(result).toBe('function');
    });

    it('exposes clearInterval as a global', () => {
      const {ctx} = createEnv();
      const result = ctx.run('typeof clearInterval');
      expect(result).toBe('function');
    });

    it('exposes queueMicrotask as a global', () => {
      const {ctx} = createEnv();
      const result = ctx.run('typeof queueMicrotask');
      expect(result).toBe('function');
    });

    it('exposes Event class', () => {
      const {ctx} = createEnv();
      const result = ctx.run('typeof Event');
      expect(result).toBe('function');
    });

    it('exposes CustomEvent class', () => {
      const {ctx} = createEnv();
      const result = ctx.run('typeof CustomEvent');
      expect(result).toBe('function');
    });

    it('exposes MutationObserver class', () => {
      const {ctx} = createEnv();
      const result = ctx.run('typeof MutationObserver');
      expect(result).toBe('function');
    });
  });

  describe('DOM mutation from inside context', () => {
    it('can create elements via document.createElement', () => {
      const {ctx, window} = createEnv();
      ctx.run('document.body.appendChild(document.createElement("div"))');

      expect(window.document.body.querySelector('div')).not.toBeNull();
    });

    it('can set element attributes', () => {
      const {ctx, window} = createEnv();
      ctx.run(`
        const el = document.createElement('div');
        el.setAttribute('class', 'test');
        document.body.appendChild(el);
      `);

      const div = window.document.body.querySelector('.test');
      expect(div).not.toBeNull();
    });

    it('can modify textContent', () => {
      const {ctx, window} = createEnv();
      const div = window.document.createElement('div');
      div.setAttribute('id', 'target');
      window.document.body.appendChild(div);

      ctx.run('document.querySelector("#target").textContent = "hello"');
      expect(div.textContent).toBe('hello');
    });

    it('mutations affect the real DOM', () => {
      const {ctx, window} = createEnv();
      ctx.run(`
        const container = document.createElement('div');
        container.setAttribute('class', 'container');
        const child = document.createElement('span');
        child.textContent = 'inside';
        container.appendChild(child);
        document.body.appendChild(container);
      `);

      const container = window.document.body.querySelector('.container');
      expect(container).not.toBeNull();
      expect(container!.querySelector('span')!.textContent).toBe('inside');
    });
  });

  describe('event listener registration', () => {
    it('can add event listeners that fire on real DOM events', () => {
      const {ctx, window} = createEnv();
      ctx.run(`
        globalThis.__eventFired = false;
        document.body.addEventListener('click', () => {
          globalThis.__eventFired = true;
        });
      `);

      window.document.body.dispatchEvent(new window.Event('click', {bubbles: true}));
      const result = ctx.run('globalThis.__eventFired');
      expect(result).toBe(true);
    });
  });

  describe('object identity', () => {
    it('document inside context is the same object as outside', () => {
      const {ctx, window} = createEnv();
      const result = ctx.run('document');
      expect(result).toBe(window.document);
    });

    it('document.body inside is the same as outside', () => {
      const {ctx, window} = createEnv();
      const result = ctx.run('document.body');
      expect(result).toBe(window.document.body);
    });
  });

  describe('script execution', () => {
    it('returns the result of the last expression', () => {
      const {ctx} = createEnv();
      expect(ctx.run('1 + 2')).toBe(3);
    });

    it('supports multi-line scripts', () => {
      const {ctx} = createEnv();
      const result = ctx.run(`
        const a = 10;
        const b = 20;
        a + b;
      `);
      expect(result).toBe(30);
    });

    it('preserves state between executions', () => {
      const {ctx} = createEnv();
      ctx.run('globalThis.counter = 0');
      ctx.run('globalThis.counter += 1');
      ctx.run('globalThis.counter += 1');
      expect(ctx.run('globalThis.counter')).toBe(2);
    });

    it('uses provided filename for error traces', () => {
      const {ctx} = createEnv();
      try {
        ctx.run('throw new Error("test")', 'my-script.js');
      } catch (error) {
        expect((error as Error).stack).toContain('my-script.js');
      }
    });
  });

  describe('context without terminal', () => {
    it('works without terminal global', () => {
      const window = new Window();
      const ctx = new ScriptContext(window);
      expect(ctx.run('typeof terminal')).toBe('undefined');
    });
  });

  describe('getContext', () => {
    it('returns the vm context object', () => {
      const {ctx} = createEnv();
      expect(ctx.getContext()).toBeDefined();
    });
  });

  describe('getWindow', () => {
    it('returns the window instance', () => {
      const {ctx, window} = createEnv();
      expect(ctx.getWindow()).toBe(window);
    });
  });
});
