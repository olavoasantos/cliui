import {describe, it, expect, vi, beforeEach} from 'vitest';
import {
  Performance,
  PerformanceEventTiming,
  PerformancePaintTiming,
  LargestContentfulPaint,
  Window,
} from '@cliui/dom';
import {TerminalVitals} from '../TerminalVitals';

import type {TerminalVitalsMetric} from '../../types/TerminalVitalsMetric';

describe('TerminalVitals', () => {
  let perf: Performance;
  let vitals: TerminalVitals;

  beforeEach(() => {
    const win = new Window();
    perf = win.performance;
    vitals = new TerminalVitals(perf, {fps: 60});
  });

  function recordFrame(
    detail: {
      dirtyElements: number;
      totalElements: number;
      outputBytes: number;
      idle: boolean;
    },
    duration = 5,
  ): void {
    perf.measure('terminal.frame', {start: 0, duration, detail});
  }

  function recordIdleFrame(): void {
    recordFrame({dirtyElements: 0, totalElements: 10, outputBytes: 0, idle: true}, 0.1);
  }

  function recordActiveFrame(
    duration = 5,
    dirtyElements = 3,
    totalElements = 10,
    outputBytes = 500,
  ): void {
    recordFrame({dirtyElements, totalElements, outputBytes, idle: false}, duration);
  }

  describe('dropped frames', () => {
    it('counts frames exceeding the frame budget', async () => {
      const cb = vi.fn();
      vitals.onMetric('dropped-frames', cb);

      // 60fps budget = 16.67ms; 20ms exceeds it
      recordActiveFrame(20);
      await Promise.resolve();

      expect(cb).toHaveBeenCalled();
      const last = cb.mock.calls[cb.mock.calls.length - 1]![0] as TerminalVitalsMetric;
      expect(last.value).toBe(1);
    });

    it('does not count frames within budget', async () => {
      const cb = vi.fn();
      vitals.onMetric('dropped-frames', cb);

      recordActiveFrame(5); // well under 16.67ms
      await Promise.resolve();

      const last = cb.mock.calls[cb.mock.calls.length - 1]![0] as TerminalVitalsMetric;
      expect(last.value).toBe(0);
    });
  });

  describe('frame budget utilization', () => {
    it('reports duration/budget ratio as running average', async () => {
      const cb = vi.fn();
      vitals.onMetric('frame-budget-utilization', cb);

      recordActiveFrame(8.33); // ~50% of 16.67ms budget
      await Promise.resolve();

      const last = cb.mock.calls[cb.mock.calls.length - 1]![0] as TerminalVitalsMetric;
      expect(last.value).toBeCloseTo(8.33 / (1000 / 60), 1);
    });
  });

  describe('idle frame ratio', () => {
    it('reports proportion of idle frames', async () => {
      const cb = vi.fn();
      vitals.onMetric('idle-frame-ratio', cb);

      recordActiveFrame(5);
      recordIdleFrame();
      await Promise.resolve();

      const last = cb.mock.calls[cb.mock.calls.length - 1]![0] as TerminalVitalsMetric;
      expect(last.value).toBe(0.5); // 1 idle out of 2 total
    });
  });

  describe('dirty element ratio', () => {
    it('reports dirtyElements/totalElements as running average', async () => {
      const cb = vi.fn();
      vitals.onMetric('dirty-element-ratio', cb);

      recordActiveFrame(5, 5, 10); // ratio = 0.5
      await Promise.resolve();

      const last = cb.mock.calls[cb.mock.calls.length - 1]![0] as TerminalVitalsMetric;
      expect(last.value).toBeCloseTo(0.5);
    });
  });

  describe('frame output size', () => {
    it('reports average outputBytes per non-idle frame', async () => {
      const cb = vi.fn();
      vitals.onMetric('frame-output-size', cb);

      recordActiveFrame(5, 3, 10, 1000);
      recordActiveFrame(5, 3, 10, 2000);
      await Promise.resolve();

      const last = cb.mock.calls[cb.mock.calls.length - 1]![0] as TerminalVitalsMetric;
      expect(last.value).toBe(1500); // (1000+2000)/2
    });
  });

  describe('input dispatch latency', () => {
    it('reports per-event latency', async () => {
      const cb = vi.fn();
      vitals.onMetric('input-dispatch-latency', cb);

      const entry = new PerformanceEventTiming({
        name: 'keydown',
        startTime: 100,
        processingStart: 105,
        processingEnd: 110,
        duration: 120,
        interactionId: 1,
        entryType: 'event',
      });
      perf.recordEntry(entry);
      await Promise.resolve();

      expect(cb).toHaveBeenCalled();
      const last = cb.mock.calls[cb.mock.calls.length - 1]![0] as TerminalVitalsMetric;
      expect(last.value).toBe(5); // processingStart - startTime
    });
  });

  describe('interaction-to-next-paint', () => {
    it('reports p98 of event durations', async () => {
      const cb = vi.fn();
      vitals.onMetric('interaction-to-next-paint', cb);

      // Record 100 events with varying durations
      for (let i = 1; i <= 100; i++) {
        perf.recordEntry(
          new PerformanceEventTiming({
            name: 'keydown',
            startTime: i,
            processingStart: i + 1,
            processingEnd: i + 2,
            duration: i, // durations 1-100
            interactionId: i,
            entryType: 'event',
          }),
        );
      }

      await Promise.resolve();

      const last = cb.mock.calls[cb.mock.calls.length - 1]![0] as TerminalVitalsMetric;
      expect(last.value).toBe(98); // p98 of 1-100 = 98
    });
  });

  describe('first-contentful-paint', () => {
    it('reports startTime from first-contentful-paint entry', async () => {
      const cb = vi.fn();
      vitals.onMetric('first-contentful-paint', cb);

      perf.recordEntry(new PerformancePaintTiming('first-contentful-paint', 42));
      await Promise.resolve();

      expect(cb).toHaveBeenCalledTimes(1);
      expect(cb.mock.calls[0]![0].value).toBe(42);
    });
  });

  describe('largest-contentful-paint', () => {
    it('reports renderTime from largest-contentful-paint entry', async () => {
      const cb = vi.fn();
      vitals.onMetric('largest-contentful-paint', cb);

      const win = new Window();
      const el = win.document.createElement('div');
      perf.recordEntry(new LargestContentfulPaint({renderTime: 77, size: 200, element: el}));
      await Promise.resolve();

      expect(cb).toHaveBeenCalledTimes(1);
      expect(cb.mock.calls[0]![0].value).toBe(77);
    });
  });

  describe('disconnect', () => {
    it('stops all observation and clears listeners', async () => {
      const cb = vi.fn();
      vitals.onMetric('first-contentful-paint', cb);
      vitals.disconnect();

      perf.recordEntry(new PerformancePaintTiming('first-contentful-paint', 42));
      await Promise.resolve();

      expect(cb).not.toHaveBeenCalled();
    });
  });

  describe('offMetric', () => {
    it('removes a specific listener', async () => {
      const cb = vi.fn();
      vitals.onMetric('first-contentful-paint', cb);
      vitals.offMetric('first-contentful-paint', cb);

      perf.recordEntry(new PerformancePaintTiming('first-contentful-paint', 42));
      await Promise.resolve();

      expect(cb).not.toHaveBeenCalled();
    });
  });
});
