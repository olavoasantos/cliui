import {describe, expect, it} from 'vitest';

import {UiSkeleton} from '../component';
import {UI_SKELETON_FRAMES, UI_SKELETON_PULSE_INTERVAL} from '../constants';
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

  it('renders placeholder characters at specified dimensions', () => {
    const {document} = createEnv();
    const skeleton = document.createElement('ui-skeleton') as UiSkeleton;
    skeleton.setAttribute('width', '10');
    skeleton.setAttribute('height', '2');
    document.body.appendChild(skeleton);

    const line = UI_SKELETON_FRAMES[0]!.repeat(10);

    expect(skeleton.textContent).toBe(`${line}\n${line}`);
  });

  it('pulses between frames on terminal ticks', () => {
    const {document} = createEnv();
    const skeleton = document.createElement('ui-skeleton') as UiSkeleton;
    skeleton.setAttribute('width', '5');
    skeleton.setAttribute('height', '1');
    document.body.appendChild(skeleton);

    const frame0 = UI_SKELETON_FRAMES[0]!.repeat(5);
    const frame1 = UI_SKELETON_FRAMES[1]!.repeat(5);

    expect(skeleton.textContent).toBe(frame0);

    skeleton.onTerminalFrame(0);
    skeleton.onTerminalFrame(UI_SKELETON_PULSE_INTERVAL);

    expect(skeleton.textContent).toBe(frame1);
  });
});
