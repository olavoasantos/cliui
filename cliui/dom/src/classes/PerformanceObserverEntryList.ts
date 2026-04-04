import type {PerformanceEntry} from './PerformanceEntry';

/**
 * A read-only list of performance entries delivered to a {@link PerformanceObserver} callback.
 *
 * Provides filtered access to the batch of entries that triggered the observer.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/PerformanceObserverEntryList
 */
export class PerformanceObserverEntryList {
  #entries: PerformanceEntry[];

  constructor(entries: PerformanceEntry[]) {
    this.#entries = entries.slice();
  }

  /** Returns all entries in this list sorted by `startTime`. */
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
   * @param type - Entry type to match.
   */
  getEntriesByType(type: string): PerformanceEntry[] {
    return this.#entries
      .filter((e) => e.entryType === type)
      .sort((a, b) => a.startTime - b.startTime);
  }
}
