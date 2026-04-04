import {PerformanceObserverEntryList} from './PerformanceObserverEntryList';

import type {PerformanceEntry} from './PerformanceEntry';
import type {Performance} from './Performance';
import type {PerformanceObserverObserveOptions} from '../types/PerformanceObserverObserveOptions';

/** Callback signature for {@link PerformanceObserver}. */
export type PerformanceObserverCallback = (
  list: PerformanceObserverEntryList,
  observer: PerformanceObserver,
) => void;

/**
 * Observes performance entries as they are recorded and delivers them via
 * microtask-batched callbacks — matching browser `PerformanceObserver` semantics.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/PerformanceObserver
 */
export class PerformanceObserver {
  #callback: PerformanceObserverCallback;
  #performance: Performance | null = null;
  #entryTypes: Set<string> = new Set();
  #buffer: PerformanceEntry[] = [];
  #scheduled = false;

  /**
   * The entry listener registered with the {@link Performance} instance.
   * Stored as a bound reference so it can be added and removed cleanly.
   */
  #entryListener = (entry: PerformanceEntry): void => {
    if (this.#entryTypes.has(entry.entryType)) {
      this.#buffer.push(entry);
      this.#scheduleDelivery();
    }
  };

  constructor(callback: PerformanceObserverCallback) {
    this.#callback = callback;
  }

  /**
   * Subscribes to performance entries of the specified types.
   *
   * Supports `{ entryTypes: string[] }` for multiple types or
   * `{ type: string }` for single-type observation.
   *
   * @param options - The entry types to observe.
   */
  observe(options: PerformanceObserverObserveOptions & {performance: Performance}): void {
    this.#performance = options.performance;

    if (options.entryTypes) {
      for (const type of options.entryTypes) {
        this.#entryTypes.add(type);
      }
    } else if (options.type) {
      this.#entryTypes.add(options.type);
    }

    this.#performance.addEntryListener(this.#entryListener);
  }

  /**
   * Stops all observation and removes the entry listener.
   */
  disconnect(): void {
    if (this.#performance) {
      this.#performance.removeEntryListener(this.#entryListener);
    }

    this.#entryTypes.clear();
    this.#buffer.length = 0;
    this.#scheduled = false;
    this.#performance = null;
  }

  /**
   * Returns buffered entries and clears the buffer.
   */
  takeRecords(): PerformanceEntry[] {
    const entries = this.#buffer.slice();
    this.#buffer.length = 0;
    return entries;
  }

  #scheduleDelivery(): void {
    if (this.#scheduled) {
      return;
    }

    this.#scheduled = true;

    queueMicrotask(() => {
      this.#scheduled = false;

      if (this.#buffer.length === 0) {
        return;
      }

      const entries = this.#buffer.slice();
      this.#buffer.length = 0;
      const list = new PerformanceObserverEntryList(entries);
      this.#callback(list, this);
    });
  }
}
