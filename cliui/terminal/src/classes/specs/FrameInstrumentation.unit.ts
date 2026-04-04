import {describe, it, expect, vi, beforeEach} from 'vitest';
import {Performance, PerformanceObserver} from '@cliui/dom';
import {FrameInstrumentation} from '../FrameInstrumentation';

import type {LayoutBox} from '../../layout/types';
import type {Element} from '@cliui/dom';

function createLayoutBox(overrides: Partial<LayoutBox> = {}): LayoutBox {
  return {
    element: {} as Element,
    x: 0,
    y: 0,
    width: 10,
    height: 5,
    contentX: 1,
    contentY: 1,
    contentWidth: 8,
    contentHeight: 3,
    computedStyle: new Map(),
    children: [],
    zIndex: 0,
    ...overrides,
  } as LayoutBox;
}

describe('FrameInstrumentation', () => {
  let perf: Performance;
  let instr: FrameInstrumentation;

  beforeEach(() => {
    perf = new Performance();
    instr = new FrameInstrumentation(perf);
    instr.setRunStartTime(perf.now());
  });

  it('records a terminal.frame measure with idle detail on no-op frames', () => {
    instr.instrumentFrame({
      checkDirty: () => ({
        resized: false,
        hasStyleChanges: false,
        hasLayoutChanges: false,
        hasScrollChanges: false,
        caretChanged: false,
        dirtyCount: 0,
      }),
      runResize: vi.fn(),
      runStyle: vi.fn(),
      runLayout: vi.fn() as () => LayoutBox,
      runPostLayout: vi.fn(),
      runPaint: vi.fn(() => ''),
      runWrite: vi.fn(),
      totalElements: () => 5,
    });

    const entries = perf.getEntriesByName('terminal.frame');
    expect(entries).toHaveLength(1);
    const measure = entries[0]!;
    expect(measure.entryType).toBe('measure');

    const detail = (measure as {detail: unknown}).detail as {idle: boolean; totalElements: number};
    expect(detail.idle).toBe(true);
    expect(detail.totalElements).toBe(5);
    expect(detail.dirtyElements).toBe(0);
  });

  it('records sub-phase measures for non-idle frames', () => {
    const layout = createLayoutBox();

    instr.instrumentFrame({
      checkDirty: () => ({
        resized: false,
        hasStyleChanges: true,
        hasLayoutChanges: true,
        hasScrollChanges: false,
        caretChanged: false,
        dirtyCount: 3,
      }),
      runResize: vi.fn(),
      runStyle: vi.fn(),
      runLayout: () => layout,
      runPostLayout: vi.fn(),
      runPaint: () => '\u001B[1mhello\u001B[0m',
      runWrite: vi.fn(),
      totalElements: () => 10,
    });

    expect(perf.getEntriesByName('terminal.frame.style')).toHaveLength(1);
    expect(perf.getEntriesByName('terminal.frame.layout')).toHaveLength(1);
    expect(perf.getEntriesByName('terminal.frame.paint')).toHaveLength(1);
    expect(perf.getEntriesByName('terminal.frame.write')).toHaveLength(1);

    const frame = perf.getEntriesByName('terminal.frame');
    expect(frame).toHaveLength(1);
    const detail = (frame[0] as {detail: unknown}).detail as {
      idle: boolean;
      dirtyElements: number;
      outputBytes: number;
    };
    expect(detail.idle).toBe(false);
    expect(detail.dirtyElements).toBe(3);
    expect(detail.outputBytes).toBeGreaterThan(0);
  });

  it('records first-contentful-paint on first non-empty output', () => {
    const layout = createLayoutBox();

    instr.instrumentFrame({
      checkDirty: () => ({
        resized: false,
        hasStyleChanges: true,
        hasLayoutChanges: false,
        hasScrollChanges: false,
        caretChanged: false,
        dirtyCount: 1,
      }),
      runResize: vi.fn(),
      runStyle: vi.fn(),
      runLayout: () => layout,
      runPostLayout: vi.fn(),
      runPaint: () => 'output',
      runWrite: vi.fn(),
      totalElements: () => 1,
    });

    const paintEntries = perf.getEntriesByType('paint');
    expect(paintEntries).toHaveLength(1);
    expect(paintEntries[0]!.name).toBe('first-contentful-paint');
  });

  it('records FCP only once', () => {
    const layout = createLayoutBox();
    const phases = {
      checkDirty: () => ({
        resized: false,
        hasStyleChanges: true,
        hasLayoutChanges: false,
        hasScrollChanges: false,
        caretChanged: false,
        dirtyCount: 1,
      }),
      runResize: vi.fn(),
      runStyle: vi.fn(),
      runLayout: () => layout,
      runPostLayout: vi.fn(),
      runPaint: () => 'output',
      runWrite: vi.fn(),
      totalElements: () => 1,
    };

    instr.instrumentFrame(phases);
    instr.instrumentFrame(phases);

    const paintEntries = perf.getEntriesByType('paint');
    expect(paintEntries).toHaveLength(1);
  });

  it('records largest-contentful-paint for the largest element', () => {
    const child1 = createLayoutBox({contentWidth: 5, contentHeight: 3}); // area=15
    const child2 = createLayoutBox({contentWidth: 10, contentHeight: 8}); // area=80
    const root = createLayoutBox({contentWidth: 20, contentHeight: 10, children: [child1, child2]}); // area=200

    instr.instrumentFrame({
      checkDirty: () => ({
        resized: false,
        hasStyleChanges: true,
        hasLayoutChanges: false,
        hasScrollChanges: false,
        caretChanged: false,
        dirtyCount: 1,
      }),
      runResize: vi.fn(),
      runStyle: vi.fn(),
      runLayout: () => root,
      runPostLayout: vi.fn(),
      runPaint: () => 'output',
      runWrite: vi.fn(),
      totalElements: () => 3,
    });

    const lcpEntries = perf.getEntriesByType('largest-contentful-paint');
    expect(lcpEntries).toHaveLength(1);
    expect((lcpEntries[0] as {size?: number}).size).toBe(200);
  });

  it('updates LCP when a larger element renders on subsequent frame', () => {
    const small = createLayoutBox({contentWidth: 5, contentHeight: 3}); // area=15
    const phases = (layout: LayoutBox) => ({
      checkDirty: () => ({
        resized: false,
        hasStyleChanges: true,
        hasLayoutChanges: false,
        hasScrollChanges: false,
        caretChanged: false,
        dirtyCount: 1,
      }),
      runResize: vi.fn(),
      runStyle: vi.fn(),
      runLayout: () => layout,
      runPostLayout: vi.fn(),
      runPaint: () => 'output',
      runWrite: vi.fn(),
      totalElements: () => 1,
    });

    instr.instrumentFrame(phases(small));
    expect(perf.getEntriesByType('largest-contentful-paint')).toHaveLength(1);

    const big = createLayoutBox({contentWidth: 20, contentHeight: 10}); // area=200
    instr.instrumentFrame(phases(big));
    expect(perf.getEntriesByType('largest-contentful-paint')).toHaveLength(2);
  });

  it('freezes LCP tracking after freezeLcp() is called', () => {
    const small = createLayoutBox({contentWidth: 5, contentHeight: 3});
    const phases = (layout: LayoutBox) => ({
      checkDirty: () => ({
        resized: false,
        hasStyleChanges: true,
        hasLayoutChanges: false,
        hasScrollChanges: false,
        caretChanged: false,
        dirtyCount: 1,
      }),
      runResize: vi.fn(),
      runStyle: vi.fn(),
      runLayout: () => layout,
      runPostLayout: vi.fn(),
      runPaint: () => 'output',
      runWrite: vi.fn(),
      totalElements: () => 1,
    });

    instr.instrumentFrame(phases(small));
    instr.freezeLcp();

    const big = createLayoutBox({contentWidth: 100, contentHeight: 100});
    instr.instrumentFrame(phases(big));

    // Should still be 1, not 2
    expect(perf.getEntriesByType('largest-contentful-paint')).toHaveLength(1);
  });

  it('delivers entries to PerformanceObserver subscribers', async () => {
    const callback = vi.fn();
    const observer = new PerformanceObserver(callback);
    observer.observe({performance: perf, entryTypes: ['measure']});

    const layout = createLayoutBox();

    instr.instrumentFrame({
      checkDirty: () => ({
        resized: false,
        hasStyleChanges: true,
        hasLayoutChanges: false,
        hasScrollChanges: false,
        caretChanged: false,
        dirtyCount: 1,
      }),
      runResize: vi.fn(),
      runStyle: vi.fn(),
      runLayout: () => layout,
      runPostLayout: vi.fn(),
      runPaint: () => 'output',
      runWrite: vi.fn(),
      totalElements: () => 1,
    });

    await Promise.resolve();

    expect(callback).toHaveBeenCalledTimes(1);
    const list = callback.mock.calls[0]![0]!;
    const entries = list.getEntries();
    const names = entries.map((e: {name: string}) => e.name);
    expect(names).toContain('terminal.frame');
    expect(names).toContain('terminal.frame.style');
    expect(names).toContain('terminal.frame.layout');
    expect(names).toContain('terminal.frame.paint');
    expect(names).toContain('terminal.frame.write');

    observer.disconnect();
  });
});
