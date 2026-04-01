import {describe, expect, it} from 'vitest';

import {UiSkeleton} from '../component';
import {Window} from '../../../dom/classes/Window';

function createEnv() {
  const window = new Window();
  const document = window.document;

  window.customElements.define(UiSkeleton.tagName, UiSkeleton);

  return {window, document};
}

describe('UiSkeleton', () => {
  it('registers the custom element under its tag name', () => {
    const {window} = createEnv();

    expect(window.customElements.get('ui-skeleton')).toBe(UiSkeleton);
  });

  it('fills content with spaces at specified dimensions', () => {
    const {document} = createEnv();
    const skeleton = document.createElement('ui-skeleton') as UiSkeleton;
    skeleton.setAttribute('width', '10');
    skeleton.setAttribute('height', '2');
    document.body.appendChild(skeleton);

    const text = skeleton.textContent ?? '';
    const lines = text.split('\n');

    expect(lines.length).toBe(2);
    expect(lines[0]!.length).toBe(10);
  });

  it('sets a linear-gradient background-color', () => {
    const {document} = createEnv();
    const skeleton = document.createElement('ui-skeleton') as UiSkeleton;
    skeleton.setAttribute('width', '20');
    skeleton.setAttribute('height', '1');
    document.body.appendChild(skeleton);

    expect(skeleton.style.backgroundColor).toContain('linear-gradient');
  });

  it('advances gradient angle on terminal frame ticks', () => {
    const {document} = createEnv();
    const skeleton = document.createElement('ui-skeleton') as UiSkeleton;
    skeleton.setAttribute('width', '20');
    skeleton.setAttribute('height', '1');
    document.body.appendChild(skeleton);

    const before = skeleton.style.backgroundColor;

    skeleton.onTerminalFrame(0);
    skeleton.onTerminalFrame(1000);

    const after = skeleton.style.backgroundColor;

    expect(after).not.toBe(before);
  });
});
