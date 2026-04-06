import type {CDPTransport} from './CDPTransport';
import type {Performance, PerformanceEntry, PerformanceObserver} from '@cliui/dom';

/** Minimal PerformanceObserver constructor type. */
type PerformanceObserverConstructor = new (
  callback: (list: {getEntries(): PerformanceEntry[]}) => void,
) => PerformanceObserver;

/**
 * CDP Performance domain handler.
 *
 * Bridges `window.performance` from Milestone 7 to DevTools'
 * Performance panel.  Forwards performance entries as they are
 * recorded and supports metric retrieval and tracing windows.
 */
export class PerformanceDomainHandler {
  private readonly transport: CDPTransport;
  private readonly performance: Performance;
  private readonly PerformanceObserverCtor: PerformanceObserverConstructor;

  private enabled = false;
  private observer: PerformanceObserver | null = null;
  private tracingActive = false;
  private tracingEntries: PerformanceEntry[] = [];

  constructor(
    transport: CDPTransport,
    performance: Performance,
    PerformanceObserverCtor: PerformanceObserverConstructor,
  ) {
    this.transport = transport;
    this.performance = performance;
    this.PerformanceObserverCtor = PerformanceObserverCtor;
  }

  /** Registers all Performance and Tracing domain method handlers. */
  register(): void {
    this.transport.registerMethod('Performance.enable', () => this.enable());
    this.transport.registerMethod('Performance.disable', () => this.disable());
    this.transport.registerMethod('Performance.getMetrics', () => this.getMetrics());
    this.transport.registerMethod('Tracing.start', () => this.tracingStart());
    this.transport.registerMethod('Tracing.end', () => this.tracingEnd());
    this.transport.registerMethod('Tracing.getCategories', () => ({
      categories: ['devtools.timeline', 'v8.execute', 'terminal.frame'],
    }));
    this.transport.registerMethod('Tracing.requestMemoryDump', () => ({
      dumpGuid: 'terminal-dom-dump',
      success: true,
    }));
  }

  /** `Performance.enable` — starts forwarding entries. */
  private enable(): Record<string, unknown> {
    if (this.enabled) return {};

    this.enabled = true;
    this.observer = new this.PerformanceObserverCtor((list) => {
      const entries = list.getEntries();
      if (!this.enabled) return;

      // Forward as Performance.metrics event
      const metrics = entries.map((e) => ({
        name: e.entryType + '.' + e.name,
        value: e.duration ?? e.startTime,
      }));

      this.transport.broadcastEvent({
        method: 'Performance.metrics',
        params: {metrics, title: 'Terminal Performance'},
      });

      // Collect for tracing if active
      if (this.tracingActive) {
        this.tracingEntries.push(...entries);
      }
    });

    // Also observe entries that were already recorded before enable
    const existing = this.performance.getEntries();
    if (this.tracingActive && existing.length > 0) {
      this.tracingEntries.push(...existing);
    }

    // Observe all known entry types
    try {
      this.observer.observe({
        entryTypes: ['measure', 'mark', 'paint', 'event', 'first-input'],
        performance: this.performance,
      } as any);
    } catch {
      // Some entry types may not be supported; try individually
      for (const type of ['measure', 'mark']) {
        try {
          this.observer.observe({entryTypes: [type], performance: this.performance} as any);
        } catch {
          // ignore unsupported
        }
      }
    }

    return {};
  }

  /** `Performance.disable` — stops forwarding. */
  private disable(): Record<string, unknown> {
    this.enabled = false;
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    return {};
  }

  /**
   * `Performance.getMetrics` — returns current metric values.
   */
  private getMetrics(): Record<string, unknown> {
    const entries = this.performance.getEntries();
    const metrics: Array<{name: string; value: number}> = [];

    // Frame metrics
    const frameMeasures = entries.filter(
      (e) => e.entryType === 'measure' && e.name === 'terminal.frame',
    );
    metrics.push({name: 'FrameCount', value: frameMeasures.length});

    if (frameMeasures.length > 0) {
      const totalDuration = frameMeasures.reduce((sum, e) => sum + e.duration, 0);
      metrics.push({
        name: 'AverageFrameDuration',
        value: totalDuration / frameMeasures.length,
      });

      const droppedFrames = frameMeasures.filter((e) => e.duration > 16.67).length;
      metrics.push({name: 'DroppedFrameCount', value: droppedFrames});
    }

    // Paint timing
    const fcp = entries.find((e) => e.name === 'first-contentful-paint');
    if (fcp) {
      metrics.push({name: 'FirstContentfulPaint', value: fcp.startTime});
    }

    const lcp = entries.find((e) => e.name === 'largest-contentful-paint');
    if (lcp) {
      metrics.push({name: 'LargestContentfulPaint', value: lcp.startTime});
    }

    // Marks
    const marks = entries.filter((e) => e.entryType === 'mark');
    for (const mark of marks) {
      metrics.push({name: `Mark.${mark.name}`, value: mark.startTime});
    }

    return {metrics};
  }

  /** `Tracing.start` — begins collecting entries for a recording window. */
  private tracingStart(): Record<string, unknown> {
    this.tracingActive = true;
    this.tracingEntries = [];

    // Ensure Performance domain is enabled for collection
    if (!this.enabled) {
      this.enable();
    }

    return {};
  }

  /** `Tracing.end` — ends the recording and sends collected entries. */
  private tracingEnd(): Record<string, unknown> {
    // Grab entries before disabling
    const collected = this.tracingEntries.slice();
    this.tracingActive = false;

    // Also grab all current entries from Performance directly
    // in case the observer hadn't delivered them yet
    const allEntries = this.performance.getEntries();
    const seen = new Set(collected);
    for (const entry of allEntries) {
      if (!seen.has(entry)) {
        collected.push(entry);
      }
    }

    // Build trace events in Chrome Trace Event Format
    const traceEvents: Array<Record<string, unknown>> = [];

    // Metadata events that DevTools requires
    traceEvents.push(
      {cat: '__metadata', name: 'process_name', ph: 'M', ts: 0, pid: 1, tid: 1, args: {name: 'Terminal DOM'}},
      {cat: '__metadata', name: 'thread_name', ph: 'M', ts: 0, pid: 1, tid: 1, args: {name: 'Main'}},
    );

    // Convert performance entries to trace events
    for (const entry of collected) {
      traceEvents.push({
        cat: 'devtools.timeline',
        name: entry.name,
        ph: 'X',
        ts: Math.round(entry.startTime * 1000),
        dur: Math.max(1, Math.round(entry.duration * 1000)),
        pid: 1,
        tid: 1,
        args: {},
      });
    }

    // Send events in a single batch
    if (traceEvents.length > 0) {
      this.transport.broadcastEvent({
        method: 'Tracing.dataCollected',
        params: {value: traceEvents},
      });
    }

    this.transport.broadcastEvent({
      method: 'Tracing.tracingComplete',
      params: {dataLossOccurred: false},
    });

    this.tracingEntries = [];
    return {};
  }
}
