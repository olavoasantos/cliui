import {describe, it, expect, vi} from 'vitest';
import {Window} from '@cliui/dom';
import {Terminal} from '../Terminal';

import type {TerminalReadableInput} from '../../terminal/types';

function createOutput() {
  const chunks: string[] = [];
  return {
    stream: {
      columns: 40,
      rows: 15,
      write(chunk: string) {
        chunks.push(chunk);
        return true;
      },
    },
    chunks,
  };
}

function createInput(): TerminalReadableInput {
  return {
    setRawMode: vi.fn(),
    on: vi.fn().mockReturnThis(),
    off: vi.fn().mockReturnThis(),
    resume: vi.fn(),
    pause: vi.fn(),
  };
}

type Internals = {
  renderFrame(): void;
  styleEngine: {getComputedStyle(el: unknown): Map<string, string>; tick(t: number): void};
};

describe('Animation rendering correctness', () => {
  it('opacity on one element does not affect sibling elements', () => {
    vi.useFakeTimers();
    const output = createOutput();
    const win = new Window();
    const terminal = new Terminal({
      output: output.stream as unknown as NodeJS.WriteStream,
      input: createInput(),
      fps: 60,
      altScreen: false,
      window: win,
    });
    const doc = terminal.document;
    const style = doc.createElement('style');
    style.textContent = `
      .box { opacity: 1; transition: opacity 500ms linear; }
      .box.faded { opacity: 0; }
      .sibling { color: #ff0000; }
    `;
    doc.head.appendChild(style);

    const box = doc.createElement('div');
    box.className = 'box';
    box.textContent = 'fading';
    const sibling = doc.createElement('div');
    sibling.className = 'sibling';
    sibling.textContent = 'should stay opaque';
    doc.body.appendChild(box);
    doc.body.appendChild(sibling);

    const internals = terminal as unknown as Internals;
    vi.setSystemTime(1000);
    internals.renderFrame();

    // Trigger opacity fade
    box.className = 'box faded';
    vi.setSystemTime(1000); // same timestamp — transition starts
    internals.renderFrame();

    // Advance to mid-transition
    vi.setSystemTime(1250);
    internals.renderFrame();

    const boxOpacity = internals.styleEngine.getComputedStyle(box).get('opacity');
    const siblingOpacity = internals.styleEngine.getComputedStyle(sibling).get('opacity');

    expect(parseFloat(boxOpacity!)).toBeLessThan(1);
    // Sibling must NOT be affected
    expect(siblingOpacity).toBeOneOf([undefined, '1']);
  });

  it('width animation does not corrupt text in sibling elements', () => {
    vi.useFakeTimers();
    const output = createOutput();
    const win = new Window();
    const terminal = new Terminal({
      output: output.stream as unknown as NodeJS.WriteStream,
      input: createInput(),
      fps: 60,
      altScreen: false,
      window: win,
    });
    const doc = terminal.document;
    const style = doc.createElement('style');
    style.textContent = `
      @keyframes slide { from { width: 10; } to { width: 30; } }
      .animated { animation: slide 1000ms linear infinite; width: 10; }
      .static { color: #ff0000; }
    `;
    doc.head.appendChild(style);

    const staticAbove = doc.createElement('div');
    staticAbove.className = 'static';
    staticAbove.textContent = 'ABCDEFGHIJ';
    const animated = doc.createElement('div');
    animated.className = 'animated';
    animated.textContent = 'sliding';
    const staticBelow = doc.createElement('div');
    staticBelow.className = 'static';
    staticBelow.textContent = 'KLMNOPQRST';
    doc.body.appendChild(staticAbove);
    doc.body.appendChild(animated);
    doc.body.appendChild(staticBelow);

    const internals = terminal as unknown as Internals;

    // Render multiple frames
    vi.setSystemTime(0);
    internals.renderFrame();
    vi.setSystemTime(100);
    internals.renderFrame();
    vi.setSystemTime(200);
    internals.renderFrame();
    vi.setSystemTime(300);
    internals.renderFrame();

    // Static elements must retain their original computed styles
    const aboveColor = internals.styleEngine.getComputedStyle(staticAbove).get('color');
    const belowColor = internals.styleEngine.getComputedStyle(staticBelow).get('color');
    expect(aboveColor).toBe('#ff0000');
    expect(belowColor).toBe('#ff0000');

    // The animated element should have a changing width
    const animWidth = internals.styleEngine.getComputedStyle(animated).get('width');
    expect(animWidth).toBeDefined();
    expect(parseInt(animWidth!)).toBeGreaterThan(10);
  });
});
