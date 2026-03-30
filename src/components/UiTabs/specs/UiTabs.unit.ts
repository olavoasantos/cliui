import {describe, expect, it} from 'vitest';

import {UiTabs} from '../component';
import {UiTab} from '../../UiTab/component';
import {UiTabPanel} from '../../UiTabPanel/component';
import {KeyboardEvent} from '../../../dom/classes/KeyboardEvent';
import {Window} from '../../../dom/classes/Window';

function createEnv() {
  const window = new Window();
  const document = window.document;

  window.customElements.define(UiTabs.tagName, UiTabs);
  window.customElements.define(UiTab.tagName, UiTab);
  window.customElements.define(UiTabPanel.tagName, UiTabPanel);

  return {window, document};
}

function buildTabs(document: any, labels: string[]) {
  const tabs = document.createElement('ui-tabs');

  for (const label of labels) {
    const tab = document.createElement('ui-tab');
    tab.textContent = label;
    tabs.appendChild(tab);
  }

  for (let i = 0; i < labels.length; i++) {
    const panel = document.createElement('ui-tab-panel');
    panel.textContent = `Content ${i}`;
    tabs.appendChild(panel);
  }

  document.body.appendChild(tabs);

  return tabs as UiTabs;
}

describe('UiTabs', () => {
  it('registers the custom element under its tag name', () => {
    const {window} = createEnv();

    expect(window.customElements.get('ui-tabs')).toBe(UiTabs);
  });

  it('selects the first tab by default', () => {
    const {document} = createEnv();
    const tabs = buildTabs(document, ['A', 'B', 'C']);

    expect(tabs.getActiveIndex()).toBe(0);

    const tabEls = tabs.querySelectorAll('ui-tab');

    expect(tabEls[0]!.hasAttribute('selected')).toBe(true);
    expect(tabEls[1]!.hasAttribute('selected')).toBe(false);
  });

  it('shows only the active panel', () => {
    const {document} = createEnv();
    const tabs = buildTabs(document, ['A', 'B', 'C']);

    const panels = tabs.querySelectorAll('ui-tab-panel');

    expect(panels[0]!.hasAttribute('hidden')).toBe(false);
    expect(panels[1]!.hasAttribute('hidden')).toBe(true);
    expect(panels[2]!.hasAttribute('hidden')).toBe(true);
  });

  it('switches tabs with ArrowRight', () => {
    const {document} = createEnv();
    const tabs = buildTabs(document, ['A', 'B', 'C']);

    tabs.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowRight', bubbles: true}));

    expect(tabs.getActiveIndex()).toBe(1);

    const panels = tabs.querySelectorAll('ui-tab-panel');

    expect(panels[0]!.hasAttribute('hidden')).toBe(true);
    expect(panels[1]!.hasAttribute('hidden')).toBe(false);
  });

  it('wraps around from last to first tab', () => {
    const {document} = createEnv();
    const tabs = buildTabs(document, ['A', 'B']);
    tabs.setAttribute('active', '1');

    tabs.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowRight', bubbles: true}));

    expect(tabs.getActiveIndex()).toBe(0);
  });

  it('wraps around from first to last with ArrowLeft', () => {
    const {document} = createEnv();
    const tabs = buildTabs(document, ['A', 'B', 'C']);

    tabs.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowLeft', bubbles: true}));

    expect(tabs.getActiveIndex()).toBe(2);
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
});
