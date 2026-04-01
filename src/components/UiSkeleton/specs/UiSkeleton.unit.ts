import {describe, expect, it} from 'vitest';

import {UiSkeleton} from '../component';
import {UI_SKELETON_BASE_CHAR, UI_SKELETON_SHIMMER_CHAR} from '../constants';
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

  it('renders base characters at specified dimensions', () => {
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

  it('advances shimmer position on terminal frame ticks', () => {
    const {document} = createEnv();
    const skeleton = document.createElement('ui-skeleton') as UiSkeleton;
    skeleton.setAttribute('width', '20');
    skeleton.setAttribute('height', '1');
    document.body.appendChild(skeleton);

    const before = skeleton.textContent ?? '';

    skeleton.onTerminalFrame(0);
    skeleton.onTerminalFrame(500);

    const after = skeleton.textContent ?? '';

    /* The shimmer should have moved, producing a different pattern */
    expect(after).not.toBe(before);
  });

  it('contains both base and shimmer characters', () => {
    const {document} = createEnv();
    const skeleton = document.createElement('ui-skeleton') as UiSkeleton;
    skeleton.setAttribute('width', '20');
    skeleton.setAttribute('height', '1');
    document.body.appendChild(skeleton);

    /* Advance enough for shimmer to be inside the visible area */
    skeleton.onTerminalFrame(0);
    skeleton.onTerminalFrame(1000);

    const text = skeleton.textContent ?? '';

    expect(text).toContain(UI_SKELETON_BASE_CHAR);
    expect(text).toContain(UI_SKELETON_SHIMMER_CHAR);
  });
});
