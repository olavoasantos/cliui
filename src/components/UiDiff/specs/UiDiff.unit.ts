import {describe, expect, it} from 'vitest';

import {UiDiff} from '../component';
import {UI_DIFF_ADDED_COLOR, UI_DIFF_REMOVED_COLOR} from '../constants';
import {Window} from '../../../dom/classes/Window';

function createEnv() {
  const window = new Window();
  const document = window.document;

  window.customElements.define(UiDiff.tagName, UiDiff);

  return {window, document};
}

describe('UiDiff', () => {
  it('registers the custom element under its tag name', () => {
    const {window} = createEnv();

    expect(window.customElements.get('ui-diff')).toBe(UiDiff);
  });

  it('colors added lines green', () => {
    const {document} = createEnv();
    const diff = document.createElement('ui-diff') as UiDiff;
    diff.textContent = '+added line';
    document.body.appendChild(diff);

    const line = diff.childNodes[0] as import('../../../dom').Element;

    expect(line.style.color).toBe(UI_DIFF_ADDED_COLOR);
  });

  it('colors removed lines red', () => {
    const {document} = createEnv();
    const diff = document.createElement('ui-diff') as UiDiff;
    diff.textContent = '-removed line';
    document.body.appendChild(diff);

    const line = diff.childNodes[0] as import('../../../dom').Element;

    expect(line.style.color).toBe(UI_DIFF_REMOVED_COLOR);
  });

  it('renders multiple lines from unified diff', () => {
    const {document} = createEnv();
    const diff = document.createElement('ui-diff') as UiDiff;
    diff.textContent = '@@ -1,3 +1,3 @@\n context\n-old\n+new';
    document.body.appendChild(diff);

    expect(diff.childNodes.length).toBe(4);
  });
});
