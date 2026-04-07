import {PerformancePaintTiming, LargestContentfulPaint, type Element, type Performance} from '@cliui/dom';
import type {LayoutBox} from '../layout/types';
import type {FrameDetail} from '../types';

/**
 * Encapsulates all render-frame performance instrumentation.
 *
 * Records `terminal.frame` and sub-phase measures, tracks FCP
 * (first contentful paint) and LCP (largest contentful paint).
 * Intended for use exclusively by the `Terminal` class.
 */
export class FrameInstrumentation {
  #performance: Performance;
  #fcpRecorded = false;
  #lcpSize = 0;
  #lcpFrozen = false;

  constructor(performance: Performance) {
    this.#performance = performance;
  }

  /** Freezes LCP tracking — called on first user interaction. */
  freezeLcp(): void {
    this.#lcpFrozen = true;
  }

  /**
   * Instruments a single render frame.
   *
   * @param phases - Callbacks for each render phase that return phase-specific data.
   */
  instrumentFrame(phases: {
    checkDirty: () => {
      resized: boolean;
      hasStyleChanges: boolean;
      hasLayoutChanges: boolean;
      hasScrollChanges: boolean;
      caretChanged: boolean;
      dirtyCount: number;
    };
    runResize: () => void;
    runStyle: () => void;
    runLayout: () => LayoutBox;
    runPostLayout: (layout: LayoutBox) => void;
    runPaint: (layout: LayoutBox) => string;
    runWrite: (output: string) => void;
    totalElements: () => number;
  }): void {
    const perf = this.#performance;
    const frameStart = perf.now();

    const dirty = phases.checkDirty();
    const isIdle =
      !dirty.resized &&
      !dirty.hasStyleChanges &&
      !dirty.hasLayoutChanges &&
      !dirty.hasScrollChanges &&
      !dirty.caretChanged;

    if (isIdle) {
      perf.measure('terminal.frame', {
        start: frameStart,
        duration: perf.now() - frameStart,
        detail: {
          dirtyElements: 0,
          totalElements: phases.totalElements(),
          outputBytes: 0,
          idle: true,
        } satisfies FrameDetail,
      });
      return;
    }

    if (dirty.resized) {
      phases.runResize();
    }

    // Style phase
    const styleStart = perf.now();
    phases.runStyle();
    perf.measure('terminal.frame.style', {start: styleStart, end: perf.now()});

    // Layout phase
    const layoutStart = perf.now();
    const layout = phases.runLayout();
    perf.measure('terminal.frame.layout', {start: layoutStart, end: perf.now()});

    phases.runPostLayout(layout);

    // Paint + diff + ansi + write (Renderer.render encompasses paint, diff, ansi)
    const paintStart = perf.now();
    const output = phases.runPaint(layout);
    const paintEnd = perf.now();
    perf.measure('terminal.frame.paint', {start: paintStart, end: paintEnd});

    // Write phase
    const writeStart = perf.now();
    phases.runWrite(output);
    perf.measure('terminal.frame.write', {start: writeStart, end: perf.now()});

    const outputBytes = Buffer.byteLength(output, 'utf8');
    const frameEnd = perf.now();

    // Record FCP on first non-empty ANSI output.
    // frameEnd is a raw performance.now() value — milliseconds since
    // process start — so it captures the full startup cost (module
    // loading, DOM construction, style setup, run()), matching how
    // browser FCP is measured from navigation start.
    if (!this.#fcpRecorded && outputBytes > 0) {
      this.#fcpRecorded = true;
      const fcp = new PerformancePaintTiming('first-contentful-paint', frameEnd);
      perf.recordEntry(fcp);
    }

    // Track LCP — find largest element by cell area
    if (!this.#lcpFrozen) {
      this.#trackLcp(layout, frameEnd);
    }

    // Record overall frame measure
    perf.measure('terminal.frame', {
      start: frameStart,
      duration: frameEnd - frameStart,
      detail: {
        dirtyElements: dirty.dirtyCount,
        totalElements: phases.totalElements(),
        outputBytes,
        idle: false,
      } satisfies FrameDetail,
    });
  }

  #trackLcp(layout: LayoutBox, renderTime: number): void {
    let largestElement: Element | null = null;
    let largestSize = 0;

    const visit = (box: LayoutBox): void => {
      const area = box.contentWidth * box.contentHeight;

      if (area > largestSize) {
        largestElement = box.element;
        largestSize = area;
      }

      for (const child of box.children) {
        visit(child);
      }
    };

    visit(layout);

    if (largestElement !== null && largestSize > this.#lcpSize) {
      this.#lcpSize = largestSize;
      const lcp = new LargestContentfulPaint({
        renderTime,
        size: largestSize,
        element: largestElement,
      });
      this.#performance.recordEntry(lcp);
    }
  }
}
