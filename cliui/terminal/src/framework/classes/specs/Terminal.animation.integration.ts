import {afterEach, describe, expect, it, vi} from 'vitest';

import {Window} from '@cliui/dom';
import {Terminal} from '../Terminal';

import type {TerminalReadableInput} from '../../../terminal/types';

type TerminalInternals = {
  renderFrame(): void;
  styleEngine: {
    tick(timestamp: number): void;
    getComputedStyle(element: unknown): Map<string, string>;
    hasActiveAnimations(): boolean;
  };
};

function createOutput() {
  const chunks: string[] = [];

  return {
    stream: {
      columns: 40,
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

describe('Animation frame loop integration', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('transition produces different output on consecutive renderFrame calls', () => {
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
      .box { color: #ff0000; transition: color 500ms linear; }
      .box.active { color: #0000ff; }
    `;
    doc.head.appendChild(style);

    const box = doc.createElement('div');
    box.className = 'box';
    box.textContent = 'Hello';
    doc.body.appendChild(box);

    const internals = terminal as unknown as TerminalInternals;

    // Initial render
    vi.setSystemTime(0);
    internals.renderFrame();
    output.chunks.length = 0;

    // Trigger transition
    box.className = 'box active';
    vi.setSystemTime(1);
    internals.renderFrame();
    output.chunks.length = 0;

    // Subsequent frames should produce output (interpolation changes each frame)
    const frameCounts: number[] = [];

    for (const t of [50, 100, 150, 200, 250, 300, 350, 400, 450, 500]) {
      vi.setSystemTime(t);
      internals.renderFrame();
      frameCounts.push(output.chunks.length);
      output.chunks.length = 0;
    }

    // At least half the subsequent frames should produce output (interpolation is changing)
    const framesWithOutput = frameCounts.filter((c) => c > 0).length;
    expect(framesWithOutput).toBeGreaterThan(5);
  });

  it('animation produces output on every frame while active', () => {
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
      @keyframes pulse {
        from { color: #ff0000; }
        to { color: #0000ff; }
      }
      .animated {
        animation: pulse 1000ms linear infinite;
      }
    `;
    doc.head.appendChild(style);

    const box = doc.createElement('div');
    box.className = 'animated';
    box.textContent = 'Pulsing';
    doc.body.appendChild(box);

    const internals = terminal as unknown as TerminalInternals;

    // Initial render sets up animation
    vi.setSystemTime(0);
    internals.renderFrame();
    output.chunks.length = 0;

    expect(internals.styleEngine.hasActiveAnimations()).toBe(true);

    // Subsequent frames should all produce output
    const frameCounts: number[] = [];

    for (let t = 50; t <= 500; t += 50) {
      vi.setSystemTime(t);
      internals.renderFrame();
      frameCounts.push(output.chunks.length);
      output.chunks.length = 0;
    }

    // Every frame should produce output (color is changing each frame)
    const framesWithOutput = frameCounts.filter((c) => c > 0).length;
    expect(framesWithOutput).toBe(frameCounts.length);
  });

  it('computed style shows interpolated color values during transition', () => {
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
      .box { color: #000000; transition: color 1000ms linear; }
      .box.active { color: #ffffff; }
    `;
    doc.head.appendChild(style);

    const box = doc.createElement('div');
    box.className = 'box';
    box.textContent = 'test';
    doc.body.appendChild(box);

    const internals = terminal as unknown as TerminalInternals;

    // Initial
    vi.setSystemTime(0);
    internals.renderFrame();
    expect(internals.styleEngine.getComputedStyle(box).get('color')).toBe('#000000');

    // Trigger
    box.className = 'box active';
    vi.setSystemTime(1);
    internals.renderFrame();

    // Mid-transition: color should be between #000000 and #ffffff
    vi.setSystemTime(500);
    internals.renderFrame();
    const midColor = internals.styleEngine.getComputedStyle(box).get('color');
    expect(midColor).toContain('rgb(');
    expect(midColor).not.toBe('rgb(0, 0, 0)');
    expect(midColor).not.toBe('rgb(255, 255, 255)');

    // Complete: color should be target
    vi.setSystemTime(1100);
    internals.renderFrame();
    const finalColor = internals.styleEngine.getComputedStyle(box).get('color');
    expect(finalColor).toBe('#ffffff');
  });

  it('computed style shows animated values from @keyframes', () => {
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
      @keyframes slide {
        from { width: 10; }
        to { width: 40; }
      }
      .sliding {
        animation: slide 1000ms linear 1 forwards;
      }
    `;
    doc.head.appendChild(style);

    const box = doc.createElement('div');
    box.className = 'sliding';
    box.textContent = 'test';
    doc.body.appendChild(box);

    const internals = terminal as unknown as TerminalInternals;

    vi.setSystemTime(0);
    internals.renderFrame();
    const w0 = internals.styleEngine.getComputedStyle(box).get('width');

    vi.setSystemTime(500);
    internals.renderFrame();
    const w500 = internals.styleEngine.getComputedStyle(box).get('width');

    vi.setSystemTime(1000);
    internals.renderFrame();
    const w1000 = internals.styleEngine.getComputedStyle(box).get('width');

    expect(w0).toBe('10');
    expect(w500).toBe('25'); // midpoint: 10 + (40-10)*0.5 = 25
    expect(w1000).toBe('40'); // fill-mode: forwards
  });
});
