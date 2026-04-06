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

    // Observe all known entry types
    try {
      this.observer.observe({entryTypes: ['measure', 'mark', 'paint', 'event', 'first-input'], performance: this.performance} as any);
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
    this.tracingActive = false;

    // Send collected entries as Tracing.dataCollected events
    if (this.tracingEntries.length > 0) {
      const traceEvents = this.tracingEntries.map((entry) => ({
        cat: entry.entryType,
        name: entry.name,
        ph: 'X', // complete event
        ts: Math.round(entry.startTime * 1000), // microseconds
        dur: Math.round(entry.duration * 1000),
        pid: 1,
        tid: 1,
      }));

      this.transport.broadcastEvent({
        method: 'Tracing.dataCollected',
        params: {value: traceEvents},
      });
    }

    this.transport.broadcastEvent({
      method: 'Tracing.tracingComplete',
      params: {},
    });

    this.tracingEntries = [];
    return {};
  }
}
