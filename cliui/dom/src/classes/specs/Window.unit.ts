import {describe, it, expect, vi} from 'vitest';
import {Window} from '../Window';
import {Event} from '../Event';
import {ErrorEvent} from '../ErrorEvent';

import type {HTMLDialogElement} from '../HTMLDialogElement';

describe('Window', () => {
  describe('basic properties', () => {
    it('self-references window, self, parent, top', () => {
      const window = new Window();
      expect(window.window).toBe(window);
      expect(window.self).toBe(window);
      expect(window.parent).toBe(window);
      expect(window.top).toBe(window);
    });

    it('has a document', () => {
      const window = new Window();
      expect(window.document).toBeDefined();
      expect(window.document.defaultView).toBe(window);
    });

    it('has customElements registry', () => {
      const window = new Window();
      expect(window.customElements).toBeDefined();
    });

    it('has empty name by default', () => {
      const window = new Window();
      expect(window.name).toBe('');
    });

    it('has a navigator with a user agent string', () => {
      const window = new Window();
      expect(window.navigator).toBeDefined();
      expect(window.navigator.userAgent).toContain('TerminalDOM');
      expect(window.navigator.language).toBe('en-US');
      expect(window.navigator.onLine).toBe(true);
      expect(window.navigator.toString()).toBe('[object Navigator]');
    });

    it('has a location defaulting to about:blank', () => {
      const window = new Window();
      expect(window.location).toBeDefined();
      expect(window.location.href).toBe('about:blank');
      expect(window.location.protocol).toBe('about:');
      expect(window.location.toString()).toBe('about:blank');
    });

    it('has event as undefined', () => {
      const window = new Window();
      expect(window.event).toBeUndefined();
    });
  });

  describe('class references', () => {
    it('exposes DOM constructors', () => {
      const window = new Window();
      expect(window.Event).toBeDefined();
      expect(window.Node).toBeDefined();
      expect(window.Element).toBeDefined();
      expect(window.Document).toBeDefined();
      expect(window.Text).toBeDefined();
      expect(window.Comment).toBeDefined();
      expect(window.DocumentFragment).toBeDefined();
      expect(window.CustomEvent).toBeDefined();
      expect(window.HTMLElement).toBeDefined();
      expect(window.SVGElement).toBeDefined();
      expect(window.MutationObserver).toBeDefined();
    });
  });

  describe('event target', () => {
    it('can add and dispatch events', () => {
      const window = new Window();
      const handler = vi.fn();
      window.addEventListener('test', handler);
      window.dispatchEvent(new Event('test'));
      expect(handler).toHaveBeenCalledOnce();
    });
  });

  describe('onerror', () => {
    it('registers an error handler', () => {
      const window = new Window();
      const handler = vi.fn();
      window.onerror = handler;
      expect(window.onerror).toBe(handler);
    });

    it('calls onerror when error event is dispatched', () => {
      const window = new Window();
      const handler = vi.fn();
      window.onerror = handler;
      const event = new ErrorEvent('error', {message: 'test error'});
      window.dispatchEvent(event);
      expect(handler).toHaveBeenCalledWith(
        'test error',
        undefined,
        undefined,
        undefined,
        undefined,
      );
    });

    it('removes previous handler when setting a new one', () => {
      const window = new Window();
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      window.onerror = handler1;
      window.onerror = handler2;
      window.dispatchEvent(new ErrorEvent('error', {message: 'test'}));
      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalledOnce();
    });

    it('clears handler when set to null', () => {
      const window = new Window();
      const handler = vi.fn();
      window.onerror = handler;
      window.onerror = null;
      expect(window.onerror).toBeNull();
      window.dispatchEvent(new ErrorEvent('error', {message: 'test'}));
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('onunhandledrejection', () => {
    it('registers an unhandled rejection handler', () => {
      const window = new Window();
      const handler = vi.fn();
      window.onunhandledrejection = handler;
      expect(window.onunhandledrejection).toBe(handler);
    });

    it('calls handler when unhandledrejection event is dispatched', () => {
      const window = new Window();
      const handler = vi.fn();
      window.onunhandledrejection = handler;
      window.dispatchEvent(new Event('unhandledrejection'));
      expect(handler).toHaveBeenCalledOnce();
    });

    it('clears handler when set to null', () => {
      const window = new Window();
      const handler = vi.fn();
      window.onunhandledrejection = handler;
      window.onunhandledrejection = null;
      expect(window.onunhandledrejection).toBeNull();
      window.dispatchEvent(new Event('unhandledrejection'));
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('alert', () => {
    it('returns a Promise that resolves when dialog is closed', async () => {
      const window = new Window();
      const promise = window.alert('Hello');

      // Dialog should be appended to body
      const dialog = window.document.body.querySelector('dialog');
      expect(dialog).not.toBeNull();
      expect(dialog!.hasAttribute('open')).toBe(true);
      expect(dialog!.textContent).toContain('Hello');

      // Click OK button
      const okBtn = dialog!.querySelector('button');
      expect(okBtn).not.toBeNull();
      okBtn!.dispatchEvent(new Event('click', {bubbles: true}));

      await promise; // should resolve

      // Dialog should be removed from DOM
      expect(window.document.body.querySelector('dialog')).toBeNull();
    });

    it('resolves when Escape is pressed (dialog close)', async () => {
      const window = new Window();
      const promise = window.alert('Escape test');

      const dialog = window.document.body.querySelector('dialog');
      expect(dialog).not.toBeNull();

      // Simulate dialog close (Escape triggers close via HTMLDialogElement)
      (dialog as unknown as HTMLDialogElement).close();

      await promise;
      expect(window.document.body.querySelector('dialog')).toBeNull();
    });
  });

  describe('confirm', () => {
    it('resolves true when OK is clicked', async () => {
      const window = new Window();
      const promise = window.confirm('Are you sure?');

      const dialog = window.document.body.querySelector('dialog');
      expect(dialog).not.toBeNull();

      // The last button should be OK
      const buttons = dialog!.querySelectorAll('button');
      expect(buttons.length).toBe(2);
      const okBtn = buttons[1]!;
      expect(okBtn.textContent).toBe('OK');
      okBtn.dispatchEvent(new Event('click', {bubbles: true}));

      const result = await promise;
      expect(result).toBe(true);
    });

    it('resolves false when Cancel is clicked', async () => {
      const window = new Window();
      const promise = window.confirm('Are you sure?');

      const dialog = window.document.body.querySelector('dialog');
      const buttons = dialog!.querySelectorAll('button');
      const cancelBtn = buttons[0]!;
      expect(cancelBtn.textContent).toBe('Cancel');
      cancelBtn.dispatchEvent(new Event('click', {bubbles: true}));

      const result = await promise;
      expect(result).toBe(false);
    });

    it('resolves false when dialog is closed via Escape', async () => {
      const window = new Window();
      const promise = window.confirm('Escape test');

      const dialog = window.document.body.querySelector('dialog');
      (dialog as unknown as HTMLDialogElement).close();

      const result = await promise;
      expect(result).toBe(false);
    });
  });

  describe('prompt', () => {
    it('resolves with the default value when OK is clicked', async () => {
      const window = new Window();
      const promise = window.prompt('Enter name:', 'John');

      const dialog = window.document.body.querySelector('dialog');
      expect(dialog).not.toBeNull();

      // Find OK button (last button)
      const buttons = dialog!.querySelectorAll('button');
      const okBtn = buttons[buttons.length - 1]!;
      okBtn.dispatchEvent(new Event('click', {bubbles: true}));

      const result = await promise;
      expect(result).toBe('John');
    });

    it('resolves null when Cancel is clicked', async () => {
      const window = new Window();
      const promise = window.prompt('Enter name:');

      const dialog = window.document.body.querySelector('dialog');
      const buttons = dialog!.querySelectorAll('button');
      const cancelBtn = buttons[0]!;
      cancelBtn.dispatchEvent(new Event('click', {bubbles: true}));

      const result = await promise;
      expect(result).toBeNull();
    });

    it('resolves null when dialog is closed via Escape', async () => {
      const window = new Window();
      const promise = window.prompt('Escape test');

      const dialog = window.document.body.querySelector('dialog');
      (dialog as unknown as HTMLDialogElement).close();

      const result = await promise;
      expect(result).toBeNull();
    });

    it('renders an input element inside the dialog', () => {
      const window = new Window();
      void window.prompt('Enter name:', 'default');

      const dialog = window.document.body.querySelector('dialog');
      const input = dialog!.querySelector('input');
      expect(input).not.toBeNull();
      expect(input!.getAttribute('value')).toBe('default');

      // Cleanup
      (dialog as unknown as HTMLDialogElement).close();
    });

    it('removes dialog from DOM after resolution', async () => {
      const window = new Window();
      const promise = window.prompt('test');

      const dialog = window.document.body.querySelector('dialog');
      const buttons = dialog!.querySelectorAll('button');
      buttons[buttons.length - 1]!.dispatchEvent(new Event('click', {bubbles: true}));

      await promise;
      expect(window.document.body.querySelector('dialog')).toBeNull();
    });
  });

  describe('matchMedia', () => {
    it('returns matches=true for prefers-color-scheme: dark when scheme is dark', () => {
      const window = new Window();
      // Default scheme is 'dark'
      const mql = window.matchMedia('(prefers-color-scheme: dark)');
      expect(mql.matches).toBe(true);
      expect(mql.media).toBe('(prefers-color-scheme: dark)');
    });

    it('returns matches=false for prefers-color-scheme: light when scheme is dark', () => {
      const window = new Window();
      const mql = window.matchMedia('(prefers-color-scheme: light)');
      expect(mql.matches).toBe(false);
    });

    it('returns matches=false for unsupported queries', () => {
      const window = new Window();
      const mql = window.matchMedia('(min-width: 100px)');
      expect(mql.matches).toBe(false);
    });

    it('updates tracked media query lists when color scheme changes', () => {
      const window = new Window();
      const darkMql = window.matchMedia('(prefers-color-scheme: dark)');
      const lightMql = window.matchMedia('(prefers-color-scheme: light)');

      expect(darkMql.matches).toBe(true);
      expect(lightMql.matches).toBe(false);

      window.setColorScheme('light');

      expect(darkMql.matches).toBe(false);
      expect(lightMql.matches).toBe(true);
    });

    it('dispatches change events when color scheme changes', () => {
      const window = new Window();
      const mql = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = vi.fn();
      mql.addEventListener('change', handler);

      window.setColorScheme('light');

      expect(handler).toHaveBeenCalledOnce();
    });

    it('does not dispatch when setting the same scheme', () => {
      const window = new Window();
      const mql = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = vi.fn();
      mql.addEventListener('change', handler);

      window.setColorScheme('dark');

      expect(handler).not.toHaveBeenCalled();
    });

    it('getColorScheme returns current scheme', () => {
      const window = new Window();
      expect(window.getColorScheme()).toBe('dark');
      window.setColorScheme('light');
      expect(window.getColorScheme()).toBe('light');
    });
  });
});
