import {describe, expect, it, vi} from 'vitest';
import {Window} from '@cliui/dom';
import {Terminal} from '../Terminal';

import type {TerminalReadableInput} from '../../../terminal/types';

function createOutput() {
  const chunks: string[] = [];
  return {
    stream: {
      columns: 60,
      rows: 10,
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

describe('Animation rendering stability', () => {
  it('produces consistent output across many animation frames without degradation', () => {
    vi.useFakeTimers();
    const output = createOutput();
    const win = new Window();
    const terminal = new Terminal({
      output: output.stream as unknown as NodeJS.WriteStream,
      input: createInput(),
      fps: 30,
      altScreen: false,
      window: win,
    });

    const doc = terminal.document;
    const style = doc.createElement('style');
    style.textContent = `
      @keyframes pulse { 0% { background-color: #334155; } 50% { background-color: #7c3aed; } 100% { background-color: #334155; } }
      .animated { animation: pulse 2s ease-in-out infinite; background-color: #334155; color: #ffffff; padding: 0 2; }
      .static { color: #94a3b8; }
    `;
    doc.head.appendChild(style);

    const staticAbove = doc.createElement('div');
    staticAbove.className = 'static';
    staticAbove.textContent = 'ABOVE';
    const animated = doc.createElement('div');
    animated.className = 'animated';
    animated.textContent = 'PULSING';
    const staticBelow = doc.createElement('div');
    staticBelow.className = 'static';
    staticBelow.textContent = 'BELOW';
    doc.body.appendChild(staticAbove);
    doc.body.appendChild(animated);
    doc.body.appendChild(staticBelow);

    const internals = terminal as unknown as Internals;

    // Initial frame
    vi.setSystemTime(0);
    internals.renderFrame();
    output.chunks.length = 0;

    // Collect frame sizes over many frames
    const frameSizes: number[] = [];
    for (let i = 1; i <= 100; i++) {
      vi.setSystemTime(i * 33);
      output.chunks.length = 0;
      internals.renderFrame();
      const totalBytes = output.chunks.reduce((sum, c) => sum + c.length, 0);
      frameSizes.push(totalBytes);
    }

    // Frame sizes should be bounded — no progressive growth
    const maxSize = Math.max(...frameSizes);
    const avgSize = frameSizes.reduce((a, b) => a + b, 0) / frameSizes.length;
    expect(maxSize).toBeLessThan(avgSize * 5);

    // Static elements must never have their colors contaminated
    const staticAboveColor = internals.styleEngine.getComputedStyle(staticAbove).get('color');
    const staticBelowColor = internals.styleEngine.getComputedStyle(staticBelow).get('color');
    expect(staticAboveColor).toBe('#94a3b8');
    expect(staticBelowColor).toBe('#94a3b8');
  });

  it('animated element gets a fresh ComputedStyle Map each frame', () => {
    vi.useFakeTimers();
    const output = createOutput();
    const win = new Window();
    const terminal = new Terminal({
      output: output.stream as unknown as NodeJS.WriteStream,
      input: createInput(),
      fps: 30,
      altScreen: false,
      window: win,
    });

    const doc = terminal.document;
    const style = doc.createElement('style');
    style.textContent = `
      @keyframes pulse { 0% { color: #ff0000; } 100% { color: #0000ff; } }
      .animated { animation: pulse 1000ms linear infinite; color: #ff0000; }
    `;
    doc.head.appendChild(style);

    const el = doc.createElement('div');
    el.className = 'animated';
    el.textContent = 'test';
    doc.body.appendChild(el);

    const internals = terminal as unknown as Internals;

    // Frame 1
    vi.setSystemTime(0);
    internals.renderFrame();
    const map1 = internals.styleEngine.getComputedStyle(el);
    const color1 = map1.get('color');

    // Frame 2 — different animation progress
    vi.setSystemTime(500);
    internals.renderFrame();
    const map2 = internals.styleEngine.getComputedStyle(el);
    const color2 = map2.get('color');

    // The Map references MUST be different objects because the animation
    // overlay creates a new Map each frame to avoid Painter cache staleness.
    expect(map1).not.toBe(map2);

    // And the colors must be different (frame 1 is at 0%, frame 2 at 50%)
    expect(color1).not.toBe(color2);
  });
});
