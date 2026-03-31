import {describe, expect, it} from 'vitest';

import {UiBadge} from '../component';
import {Window} from '../../../dom/classes/Window';

function createEnv() {
  const window = new Window();
  const document = window.document;

  window.customElements.define(UiBadge.tagName, UiBadge);

  return {window, document};
}

describe('UiBadge', () => {
  it('registers the custom element under its tag name', () => {
    const {window} = createEnv();

    expect(window.customElements.get('ui-badge')).toBe(UiBadge);
  });

  it('defaults to default tone', () => {
    const {document} = createEnv();
    const badge = document.createElement('ui-badge') as UiBadge;

    expect(badge.getTone()).toBe('default');
  });

  it('reads tone from attribute', () => {
    const {document} = createEnv();
    const badge = document.createElement('ui-badge') as UiBadge;
    badge.setAttribute('tone', 'success');

    expect(badge.getTone()).toBe('success');
  });

  it('falls back to default for invalid tone', () => {
    const {document} = createEnv();
    const badge = document.createElement('ui-badge') as UiBadge;
    badge.setAttribute('tone', 'invalid');

    expect(badge.getTone()).toBe('default');
  });

  it('renders text content inline', () => {
    const {document} = createEnv();
    const badge = document.createElement('ui-badge');
    badge.textContent = 'NEW';
    document.body.appendChild(badge);

    expect(badge.textContent).toBe('NEW');
    expect(badge.tagName).toBe('UI-BADGE');
  });
});
