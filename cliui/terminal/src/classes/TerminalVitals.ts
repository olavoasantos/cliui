import {PerformanceObserver} from '@cliui/dom';

import type {Performance, PerformanceEntry} from '@cliui/dom';
import type {FrameDetail} from './FrameInstrumentation';
import type {TerminalVitalsCallback, TerminalVitalsMetricName} from '../types/TerminalVitalsMetric';

/**
 * Higher-level utility that consumes raw `PerformanceObserver` entries and
 * computes derived terminal vitals — analogous to the `web-vitals` library.
 *
 * Subscribes to `measure`, `paint`, `largest-contentful-paint`, `event`,
 * and `first-input` entry types and reports derived metrics via a
 * callback-based API.
 *
 * @example
 * ```ts
 * const vitals = new TerminalVitals(window.performance, { fps: 60 });
 * vitals.onMetric('first-contentful-paint', (metric) => console.log(metric));
 * ```
 */
export class TerminalVitals {
  #performance: Performance;
  #frameBudget: number;
  #listeners = new Map<TerminalVitalsMetricName, Set<TerminalVitalsCallback>>();
  #observers: PerformanceObserver[] = [];

  // Running state for derived metrics
  #totalFrames = 0;
  #idleFrames = 0;
  #droppedFrameCount = 0;
  #budgetUtilizationSum = 0;
  #dirtyRatioSum = 0;
  #outputSizeSum = 0;
  #eventDurations: number[] = [];
  #dispatchLatencies: number[] = [];

  /**
   * Creates a new TerminalVitals instance.
   *
   * @param performance - The `window.performance` instance to observe.
   * @param options - Configuration including the target FPS for budget calculations.
   */
  constructor(performance: Performance, options: {fps?: number} = {}) {
    this.#performance = performance;
    this.#frameBudget = 1000 / (options.fps ?? 60);

    this.#subscribeToMeasures();
    this.#subscribeToPaintEntries();
    this.#subscribeToEventEntries();
  }

  /**
   * Registers a callback for a specific metric.
   *
   * @param name - The metric to listen for.
   * @param callback - Invoked each time the metric is updated.
   */
  onMetric(name: TerminalVitalsMetricName, callback: TerminalVitalsCallback): void {
    let listeners = this.#listeners.get(name);

    if (!listeners) {
      listeners = new Set();
      this.#listeners.set(name, listeners);
    }

    listeners.add(callback);
  }

  /**
   * Removes a previously registered metric callback.
   */
  offMetric(name: TerminalVitalsMetricName, callback: TerminalVitalsCallback): void {
    this.#listeners.get(name)?.delete(callback);
  }

  /**
   * Stops all observation and cleans up.
   */
  disconnect(): void {
    for (const observer of this.#observers) {
      observer.disconnect();
    }

    this.#observers.length = 0;
    this.#listeners.clear();
  }

  #emit(name: TerminalVitalsMetricName, value: number): void {
    const listeners = this.#listeners.get(name);

    if (!listeners) {
      return;
    }

    for (const callback of listeners) {
      callback({name, value});
    }
  }

  #subscribeToMeasures(): void {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'terminal.frame') {
          this.#processFrame(entry);
        }
      }
    });

    observer.observe({performance: this.#performance, entryTypes: ['measure']});
    this.#observers.push(observer);
  }

  #subscribeToPaintEntries(): void {
    const paintObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          this.#emit('first-contentful-paint', entry.startTime);
        }
      }
    });

    paintObserver.observe({performance: this.#performance, entryTypes: ['paint']});
    this.#observers.push(paintObserver);

    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const latest = entries[entries.length - 1];

      if (latest) {
        const renderTime = (latest as unknown as {renderTime: number}).renderTime;
        this.#emit('largest-contentful-paint', renderTime);
      }
    });

    lcpObserver.observe({
      performance: this.#performance,
      entryTypes: ['largest-contentful-paint'],
    });
    this.#observers.push(lcpObserver);
  }

  #subscribeToEventEntries(): void {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.#processEventTiming(entry);
      }
    });

    observer.observe({
      performance: this.#performance,
      entryTypes: ['event', 'first-input'],
    });
    this.#observers.push(observer);
  }

  #processFrame(entry: PerformanceEntry): void {
    const detail = (entry as unknown as {detail: FrameDetail}).detail;

    this.#totalFrames += 1;

    if (detail.idle) {
      this.#idleFrames += 1;
      this.#emit('idle-frame-ratio', this.#idleFrames / this.#totalFrames);
      return;
    }

    // Dropped frames
    if (entry.duration > this.#frameBudget) {
      this.#droppedFrameCount += 1;
    }

    this.#emit('dropped-frames', this.#droppedFrameCount);

    // Frame budget utilization
    const utilization = entry.duration / this.#frameBudget;
    this.#budgetUtilizationSum += utilization;
    const nonIdleFrames = this.#totalFrames - this.#idleFrames;
    this.#emit('frame-budget-utilization', this.#budgetUtilizationSum / nonIdleFrames);

    // Idle frame ratio
    this.#emit('idle-frame-ratio', this.#idleFrames / this.#totalFrames);

    // Dirty element ratio
    if (detail.totalElements > 0) {
      const dirtyRatio = detail.dirtyElements / detail.totalElements;
      this.#dirtyRatioSum += dirtyRatio;
      this.#emit('dirty-element-ratio', this.#dirtyRatioSum / nonIdleFrames);
    }

    // Frame output size
    this.#outputSizeSum += detail.outputBytes;
    this.#emit('frame-output-size', this.#outputSizeSum / nonIdleFrames);
  }

  #processEventTiming(entry: PerformanceEntry): void {
    const processingStart = (entry as unknown as {processingStart: number}).processingStart;
    const latency = processingStart - entry.startTime;

    this.#dispatchLatencies.push(latency);
    this.#emit('input-dispatch-latency', latency);

    this.#eventDurations.push(entry.duration);
    this.#emit('interaction-to-next-paint', this.#percentile(this.#eventDurations, 98));
  }

  #percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) {
      return 0;
    }

    const copy = sorted.slice().sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * copy.length) - 1;
    return copy[Math.max(0, index)]!;
  }
}
