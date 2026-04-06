import {PerformanceEntry} from './PerformanceEntry';
import {PerformanceMark} from './PerformanceMark';
import {PerformanceMeasure} from './PerformanceMeasure';
import {performance as nodePerformance} from 'node:perf_hooks';

import type {PerformanceMarkOptions} from '../types/PerformanceMarkOptions';
import type {PerformanceMeasureOptions} from '../types/PerformanceMeasureOptions';

/**
 * Callback invoked when a new entry is recorded.
 *
 * Used internally to notify {@link PerformanceObserver} instances.
 */
export type PerformanceEntryListener = (entry: PerformanceEntry) => void;

/**
 * Standard browser-compatible Performance API for the terminal DOM polyfill.
 *
 * Provides high-resolution timing via Node's `perf_hooks`, mark/measure
 * recording, and entry query/clear methods.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Performance
 */
export class Performance {
  #entries: PerformanceEntry[] = [];
  #listeners: Set<PerformanceEntryListener> = new Set();

  /**
   * Returns a high-resolution timestamp in milliseconds.
   *
   * Delegates to Node's `performance.now()` from `perf_hooks`.
   */
  now(): number {
    return nodePerformance.now();
  }

  /**
   * Creates a named timestamp mark in the performance timeline.
   *
   * @param name - The mark name.
   * @param options - Optional start time and detail metadata.
   * @returns The created `PerformanceMark`.
   */
  mark(name: string, options?: PerformanceMarkOptions): PerformanceMark {
    const mark = new PerformanceMark(name, {
      startTime: options?.startTime ?? this.now(),
      detail: options?.detail,
    });
    this.#record(mark);
    return mark;
  }

  /**
   * Creates a named duration measurement in the performance timeline.
   *
   * Supports `start`/`end` as mark names or timestamps, and an explicit
   * `duration` override.
   *
   * @param name - The measure name.
   * @param options - Start, end, duration, and detail metadata.
   * @returns The created `PerformanceMeasure`.
   */
  measure(name: string, options?: PerformanceMeasureOptions): PerformanceMeasure {
    const startTime = this.#resolveTimestamp(options?.start);
    let duration: number;

    if (options?.duration !== undefined) {
      duration = options.duration;
    } else {
      const endTime = this.#resolveTimestamp(options?.end) ?? this.now();
      duration = endTime - startTime;
    }

    const measure = new PerformanceMeasure(name, startTime, duration, options?.detail);
    this.#record(measure);
    return measure;
  }

  /**
   * Returns all stored entries sorted by `startTime`.
   */
  getEntries(): PerformanceEntry[] {
    return this.#entries.slice().sort((a, b) => a.startTime - b.startTime);
  }

  /**
   * Returns entries matching the given name, optionally filtered by type.
   *
   * @param name - Entry name to match.
   * @param type - Optional entry type filter.
   */
  getEntriesByName(name: string, type?: string): PerformanceEntry[] {
    return this.#entries
      .filter((e) => e.name === name && (type === undefined || e.entryType === type))
      .sort((a, b) => a.startTime - b.startTime);
  }

  /**
   * Returns all entries of the given type.
   *
   * @param type - Entry type to match (e.g. `'mark'`, `'measure'`).
   */
  getEntriesByType(type: string): PerformanceEntry[] {
    if (type === 'navigation') {
      // Return a minimal PerformanceNavigationTiming-like entry.
      // Chrome's web-vitals script reads responseStart, activationStart,
      // domInteractive, domContentLoadedEventStart, domComplete, and type.
      return [
        {
          entryType: 'navigation',
          name: '',
          startTime: 0,
          duration: 0,
          responseStart: 1,
          activationStart: 0,
          domInteractive: 1,
          domContentLoadedEventStart: 1,
          domComplete: 1,
          type: 'navigate',
          fetchStart: 0,
          workerStart: 0,
          domainLookupStart: 0,
          connectStart: 0,
          connectEnd: 0,
          toJSON() { return this; },
        } as unknown as PerformanceEntry,
      ];
    }
    return this.#entries
      .filter((e) => e.entryType === type)
      .sort((a, b) => a.startTime - b.startTime);
  }

  /**
   * Removes stored marks. If a name is provided, only marks with that name
   * are removed; otherwise all marks are cleared.
   *
   * @param name - Optional mark name to clear.
   */
  clearMarks(name?: string): void {
    this.#entries = this.#entries.filter(
      (e) => e.entryType !== 'mark' || (name !== undefined && e.name !== name),
    );
  }

  /**
   * Removes stored measures. If a name is provided, only measures with that
   * name are removed; otherwise all measures are cleared.
   *
   * @param name - Optional measure name to clear.
   */
  clearMeasures(name?: string): void {
    this.#entries = this.#entries.filter(
      (e) => e.entryType !== 'measure' || (name !== undefined && e.name !== name),
    );
  }

  /**
   * Registers a listener invoked whenever a new entry is recorded.
   *
   * Used internally by `PerformanceObserver` — not part of the public API.
   */
  addEntryListener(listener: PerformanceEntryListener): void {
    this.#listeners.add(listener);
  }

  /**
   * Removes a previously registered entry listener.
   */
  removeEntryListener(listener: PerformanceEntryListener): void {
    this.#listeners.delete(listener);
  }

  /**
   * Records an externally-created entry into the timeline.
   *
   * Used by instrumentation code that creates specialised entry subclasses
   * (e.g. `PerformanceEventTiming`, `PerformancePaintTiming`).
   */
  recordEntry(entry: PerformanceEntry): void {
    this.#record(entry);
  }

  #record(entry: PerformanceEntry): void {
    this.#entries.push(entry);

    for (const listener of this.#listeners) {
      listener(entry);
    }
  }

  #resolveTimestamp(value: string | number | undefined): number {
    if (value === undefined) {
      return this.now();
    }

    if (typeof value === 'number') {
      return value;
    }

    // Look up a mark by name
    const marks = this.#entries.filter((e) => e.entryType === 'mark' && e.name === value);

    if (marks.length === 0) {
      throw new DOMException(
        `Failed to execute 'measure' on 'Performance': The mark '${value}' does not exist.`,
        'SyntaxError',
      );
    }

    return marks[marks.length - 1]!.startTime;
  }
}
