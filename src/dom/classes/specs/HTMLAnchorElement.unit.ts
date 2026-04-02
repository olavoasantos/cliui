import {describe, expect, it} from 'vitest';

import {Window} from '../Window';

describe('HTMLAnchorElement', () => {
  it('creates an <a> element via document.createElement', () => {
    const window = new Window();
    const anchor = window.document.createElement('a');

    expect(anchor.localName).toBe('a');
  });

  it('gets tabindex 0 when href is set', () => {
    const window = new Window();
    const anchor = window.document.createElement('a');

    anchor.setAttribute('href', 'https://example.com');

    expect(anchor.getAttribute('tabindex')).toBe('0');
  });

  it('does not set tabindex when no href is present', () => {
    const window = new Window();
    const anchor = window.document.createElement('a');

    expect(anchor.hasAttribute('tabindex')).toBe(false);
  });

  it('removes tabindex when href is removed', () => {
    const window = new Window();
    const anchor = window.document.createElement('a');

    anchor.setAttribute('href', 'https://example.com');
    expect(anchor.getAttribute('tabindex')).toBe('0');

    anchor.removeAttribute('href');
    expect(anchor.hasAttribute('tabindex')).toBe(false);
  });

  it('preserves explicit tabindex when href is set', () => {
    const window = new Window();
    const anchor = window.document.createElement('a');

    anchor.setAttribute('tabindex', '5');
    anchor.setAttribute('href', 'https://example.com');

    expect(anchor.getAttribute('tabindex')).toBe('5');
  });

  it('preserves explicit tabindex when href is removed', () => {
    const window = new Window();
    const anchor = window.document.createElement('a');

    anchor.setAttribute('tabindex', '3');
    anchor.setAttribute('href', 'https://example.com');
    anchor.removeAttribute('href');

    // Explicit tabindex was set before auto-tabindex, should keep it
    expect(anchor.getAttribute('tabindex')).toBe('3');
  });
});
