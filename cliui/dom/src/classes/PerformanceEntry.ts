/**
 * Base class for all performance timeline entries.
 *
 * Follows the standard browser {@link https://developer.mozilla.org/en-US/docs/Web/API/PerformanceEntry | PerformanceEntry} API.
 * All properties are read-only after construction.
 */
export class PerformanceEntry {
  #name: string;
  #entryType: string;
  #startTime: number;
  #duration: number;

  constructor(name: string, entryType: string, startTime: number, duration: number) {
    this.#name = name;
    this.#entryType = entryType;
    this.#startTime = startTime;
    this.#duration = duration;
  }

  /** The name identifying this entry. */
  get name(): string {
    return this.#name;
  }

  /** The type of this entry (e.g. `'mark'`, `'measure'`). */
  get entryType(): string {
    return this.#entryType;
  }

  /** High-resolution timestamp marking when the entry began. */
  get startTime(): number {
    return this.#startTime;
  }

  /** Duration of the entry in milliseconds. */
  get duration(): number {
    return this.#duration;
  }

  /**
   * Returns a JSON-serializable representation of this entry.
   *
   * Matches the browser `PerformanceEntry.toJSON()` shape.
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.#name,
      entryType: this.#entryType,
      startTime: this.#startTime,
      duration: this.#duration,
    };
  }
}
