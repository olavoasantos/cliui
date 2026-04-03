import {describe, expect, it} from 'vitest';

import {Window} from '@cliui/dom';
import {StyleEngine} from '@cliui/terminal';
import {Button} from '../Button/component';
import {registerHTMLElements} from '../registerHTMLElements';
import {registerPrimitives} from '../registerPrimitives';
import {registerStyledComponents} from '../registerStyledComponents';
import {registerAll} from '../registerAll';

function createEnv() {
  const window = new Window();
  const engine = new StyleEngine();
  engine.attach(window.document);
  return {window, engine};
}

describe('registerHTMLElements', () => {
  it('registers all tier 1 HTML element tag names', () => {
    const {window} = createEnv();
    registerHTMLElements(window);

    const expectedTags = [
      'button',
      'details',
      'fieldset',
      'form',
      'input',
      'label',
      'meter',
      'optgroup',
      'option',
      'progress',
      'select',
      'table',
      'tbody',
      'td',
      'textarea',
      'tfoot',
      'th',
      'thead',
      'tr',
    ];

    for (const tag of expectedTags) {
      expect(window.customElements.get(tag), `Expected '${tag}' to be registered`).toBeDefined();
    }
  });

  it('is idempotent — calling twice does not throw', () => {
    const {window} = createEnv();
    registerHTMLElements(window);

    expect(() => registerHTMLElements(window)).not.toThrow();
  });
});

describe('registerPrimitives', () => {
  it('registers all tier 2 primitive tag names', () => {
    const {window} = createEnv();
    registerPrimitives(window);

    const expectedTags = [
      'breadcrumb',
      'breadcrumbs',
      'dropdown',
      'listbox',
      'navmenu',
      'navmenuitem',
      'paginator',
      'statusline',
      'tab',
      'tabs',
      'toolbar',
      'tree',
      'treeitem',
    ];

    for (const tag of expectedTags) {
      expect(window.customElements.get(tag), `Expected '${tag}' to be registered`).toBeDefined();
    }
  });

  it('is idempotent', () => {
    const {window} = createEnv();
    registerPrimitives(window);

    expect(() => registerPrimitives(window)).not.toThrow();
  });
});

describe('registerStyledComponents', () => {
  it('registers all tier 3 styled component tag names', () => {
    const {window} = createEnv();
    registerStyledComponents(window);

    const expectedTags = [
      'ui-badge',
      'ui-card',
      'ui-codeblock',
      'ui-confirmation',
      'ui-diff',
      'ui-log',
      'ui-message',
      'ui-prompt',
      'ui-sidebar',
      'ui-skeleton',
      'ui-spinner',
      'ui-toast',
    ];

    for (const tag of expectedTags) {
      expect(window.customElements.get(tag), `Expected '${tag}' to be registered`).toBeDefined();
    }
  });

  it('is idempotent', () => {
    const {window} = createEnv();
    registerStyledComponents(window);

    expect(() => registerStyledComponents(window)).not.toThrow();
  });
});

describe('registerAll', () => {
  it('registers all tiers', () => {
    const {window} = createEnv();
    registerAll(window);

    // Spot-check one from each tier
    expect(window.customElements.get('button')).toBeDefined();
    expect(window.customElements.get('tabs')).toBeDefined();
    expect(window.customElements.get('ui-card')).toBeDefined();
  });

  it('individual registration still works alongside helpers', () => {
    const {window} = createEnv();

    // Register one manually first
    window.customElements.define('button', Button as never);

    // Then register all — should not throw
    expect(() => registerAll(window)).not.toThrow();
    expect(window.customElements.get('button')).toBe(Button as never);
  });
});
