import {afterEach, describe, expect, it} from 'vitest';
import {Window} from '../../classes/Window';
import {Event} from '../../classes/Event';
import {polyfillEnvironment} from '../polyfillEnvironment';

describe('polyfillEnvironment', () => {
  const propertiesToClean: string[] = [];

  afterEach(() => {
    for (const key of propertiesToClean) {
      delete (globalThis as Record<string, unknown>)[key];
    }

    propertiesToClean.length = 0;
  });

  function trackGlobal(...keys: string[]) {
    propertiesToClean.push(...keys);
  }

  it('installs document onto globalThis', () => {
    const window = new Window();
    trackGlobal(
      'document',
      'window',
      'self',
      'parent',
      'top',
      'name',
      'customElements',
      'navigator',
      'location',
      'event',
      'Event',
      'Node',
      'Element',
      'Document',
      'Text',
      'Comment',
      'DocumentFragment',
      'CustomEvent',
      'HTMLElement',
      'SVGElement',
      'MutationObserver',
      'EventTarget',
      'ErrorEvent',
      'PromiseRejectionEvent',
      'ToggleEvent',
      'FocusEvent',
      'ClipboardEvent',
      'ParentNode',
      'ChildNode',
      'CharacterData',
      'HTMLTemplateElement',
    );

    polyfillEnvironment(window);

    expect((globalThis as Record<string, unknown>).document).toBe(window.document);
  });

  it('redirects self-referencing properties to globalThis', () => {
    const window = new Window();
    trackGlobal(
      'document',
      'window',
      'self',
      'parent',
      'top',
      'name',
      'customElements',
      'navigator',
      'location',
      'event',
      'Event',
      'Node',
      'Element',
      'Document',
      'Text',
      'Comment',
      'DocumentFragment',
      'CustomEvent',
      'HTMLElement',
      'SVGElement',
      'MutationObserver',
      'EventTarget',
      'ErrorEvent',
      'PromiseRejectionEvent',
      'ToggleEvent',
      'FocusEvent',
      'ClipboardEvent',
      'ParentNode',
      'ChildNode',
      'CharacterData',
      'HTMLTemplateElement',
    );

    polyfillEnvironment(window);

    expect((globalThis as Record<string, unknown>).window).toBe(globalThis);
    expect((globalThis as Record<string, unknown>).self).toBe(globalThis);
    expect((globalThis as Record<string, unknown>).parent).toBe(globalThis);
    expect((globalThis as Record<string, unknown>).top).toBe(globalThis);
  });

  it('installs navigator with a terminal user agent', () => {
    const window = new Window();
    trackGlobal(
      'document',
      'window',
      'self',
      'parent',
      'top',
      'name',
      'customElements',
      'navigator',
      'location',
      'event',
      'Event',
      'Node',
      'Element',
      'Document',
      'Text',
      'Comment',
      'DocumentFragment',
      'CustomEvent',
      'HTMLElement',
      'SVGElement',
      'MutationObserver',
      'EventTarget',
      'ErrorEvent',
      'PromiseRejectionEvent',
      'ToggleEvent',
      'FocusEvent',
      'ClipboardEvent',
      'ParentNode',
      'ChildNode',
      'CharacterData',
      'HTMLTemplateElement',
    );

    polyfillEnvironment(window);

    const nav = (globalThis as Record<string, unknown>).navigator as {userAgent: string};
    expect(nav.userAgent).toContain('TerminalDOM');
  });

  it('installs DOM class constructors', () => {
    const window = new Window();
    trackGlobal(
      'document',
      'window',
      'self',
      'parent',
      'top',
      'name',
      'customElements',
      'navigator',
      'location',
      'event',
      'Event',
      'Node',
      'Element',
      'Document',
      'Text',
      'Comment',
      'DocumentFragment',
      'CustomEvent',
      'HTMLElement',
      'SVGElement',
      'MutationObserver',
      'EventTarget',
      'ErrorEvent',
      'PromiseRejectionEvent',
      'ToggleEvent',
      'FocusEvent',
      'ClipboardEvent',
      'ParentNode',
      'ChildNode',
      'CharacterData',
      'HTMLTemplateElement',
    );

    polyfillEnvironment(window);

    expect((globalThis as Record<string, unknown>).Event).toBe(Event);
  });

  it('binds addEventListener to the window instance', () => {
    const window = new Window();
    trackGlobal(
      'document',
      'window',
      'self',
      'parent',
      'top',
      'name',
      'customElements',
      'navigator',
      'location',
      'event',
      'Event',
      'Node',
      'Element',
      'Document',
      'Text',
      'Comment',
      'DocumentFragment',
      'CustomEvent',
      'HTMLElement',
      'SVGElement',
      'MutationObserver',
      'EventTarget',
      'ErrorEvent',
      'PromiseRejectionEvent',
      'ToggleEvent',
      'FocusEvent',
      'ClipboardEvent',
      'ParentNode',
      'ChildNode',
      'CharacterData',
      'HTMLTemplateElement',
      'addEventListener',
      'removeEventListener',
      'dispatchEvent',
    );

    polyfillEnvironment(window);

    let called = false;
    const addFn = (globalThis as unknown as {addEventListener: typeof window.addEventListener})
      .addEventListener;
    addFn('test-event', () => {
      called = true;
    });
    window.dispatchEvent(new Event('test-event'));
    expect(called).toBe(true);
  });
});
