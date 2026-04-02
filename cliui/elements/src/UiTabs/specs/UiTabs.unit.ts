import {describe, expect, it} from 'vitest';

import {UiTabs} from '../component';
import {UiTab} from '../../UiTab/component';
import {KeyboardEvent} from '@cliui/dom';
import {Window} from '@cliui/dom';

function createEnv() {
  const window = new Window();
  const document = window.document;

  window.customElements.define(UiTabs.tagName, UiTabs);
  window.customElements.define(UiTab.tagName, UiTab);

  return {window, document};
}

function buildTabs(document: any, titles: string[]) {
  const tabs = document.createElement('ui-tabs');

  for (const title of titles) {
    const tab = document.createElement('ui-tab');
    tab.setAttribute('title', title);
    tab.textContent = `${title} content`;
    tabs.appendChild(tab);
  }

  document.body.appendChild(tabs);

  return tabs as UiTabs;
}

describe('UiTabs', () => {
  it('registers the custom element under its tag name', () => {
    const {window} = createEnv();

    expect(window.customElements.get('ui-tabs')).toBe(UiTabs);
  });

  it('shows only the active tab content', () => {
    const {document} = createEnv();
    const tabs = buildTabs(document, ['A', 'B', 'C']);

    const tabEls = tabs.querySelectorAll('ui-tab');

    expect(tabEls[0]!.hasAttribute('hidden')).toBe(false);
    expect(tabEls[1]!.hasAttribute('hidden')).toBe(true);
    expect(tabEls[2]!.hasAttribute('hidden')).toBe(true);
  });

  it('switches tabs with ArrowRight', () => {
    const {document} = createEnv();
    const tabs = buildTabs(document, ['A', 'B', 'C']);

    tabs.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowRight', bubbles: true}));

    expect(tabs.getActiveIndex()).toBe(1);

    const tabEls = tabs.querySelectorAll('ui-tab');

    expect(tabEls[0]!.hasAttribute('hidden')).toBe(true);
    expect(tabEls[1]!.hasAttribute('hidden')).toBe(false);
  });

  it('wraps around from last to first tab', () => {
    const {document} = createEnv();
    const tabs = buildTabs(document, ['A', 'B']);
    tabs.setAttribute('active', '1');

    tabs.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowRight', bubbles: true}));

    expect(tabs.getActiveIndex()).toBe(0);
  });

  it('skips disabled tabs', () => {
    const {document} = createEnv();
    const tabs = buildTabs(document, ['A', 'B', 'C']);
    const tabEls = tabs.querySelectorAll('ui-tab');
    tabEls[1]!.setAttribute('disabled', '');

    tabs.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowRight', bubbles: true}));

    expect(tabs.getActiveIndex()).toBe(2);
  });

  it('dispatches input event on tab change', () => {
    const {document} = createEnv();
    const tabs = buildTabs(document, ['A', 'B']);

    let fired = false;
    tabs.addEventListener('input', () => {
      fired = true;
    });
    tabs.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowRight', bubbles: true}));

    expect(fired).toBe(true);
  });

  it('renders a tab bar with header elements', () => {
    const {document} = createEnv();
    const tabs = buildTabs(document, ['Overview', 'Details']);

    const bar = tabs.querySelector('.ui-tabs-bar');

    expect(bar).not.toBeNull();

    const headers = bar!.querySelectorAll('[data-tab-index]');

    expect(headers.length).toBe(2);
    expect(headers[0]!.textContent).toBe('Overview');
    expect(headers[1]!.textContent).toBe('Details');
  });
});
