import {describe, expect, it} from 'vitest';

import {UiSidebar} from '../component';
import {Window} from '@cliui/dom';

function createEnv() {
  const window = new Window();
  const document = window.document;

  window.customElements.define(UiSidebar.tagName, UiSidebar);

  return {window, document};
}

describe('UiSidebar', () => {
  it('registers the custom element under its tag name', () => {
    const {window} = createEnv();

    expect(window.customElements.get('ui-sidebar')).toBe(UiSidebar);
  });

  it('applies width from attribute', () => {
    const {document} = createEnv();
    const sidebar = document.createElement('ui-sidebar') as UiSidebar;
    sidebar.setAttribute('width', '30');
    document.body.appendChild(sidebar);

    expect(sidebar.style.width).toBe('30');
  });

  it('toggles collapsed state', () => {
    const {document} = createEnv();
    const sidebar = document.createElement('ui-sidebar') as UiSidebar;
    document.body.appendChild(sidebar);

    expect(sidebar.isCollapsed()).toBe(false);

    sidebar.toggle();

    expect(sidebar.isCollapsed()).toBe(true);

    sidebar.toggle();

    expect(sidebar.isCollapsed()).toBe(false);
  });
});
