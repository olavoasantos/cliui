import {Event} from './Event';
import {EventTarget} from './EventTarget';

/**
 * Represents the result of evaluating a media query.
 *
 * Supports `(prefers-color-scheme: dark)` and
 * `(prefers-color-scheme: light)` in terminal context.
 * Unsupported queries return `matches: false`.
 *
 * @example
 * ```ts
 * const mql = window.matchMedia('(prefers-color-scheme: dark)');
 * console.log(mql.matches); // true or false
 * mql.addEventListener('change', (e) => {
 *   console.log('Dark mode:', e.matches);
 * });
 * ```
 */
export class MediaQueryList extends EventTarget {
  /** The serialized media query string. */
  readonly media: string;

  /** Whether the media query currently matches. */
  matches: boolean;

  /**
   * Legacy `onchange` handler.
   */
  onchange: ((event: MediaQueryListEvent) => void) | null = null;

  /**
   * Creates a new `MediaQueryList` for the given query.
   *
   * @param media - The media query string.
   * @param matches - Initial match state.
   */
  constructor(media: string, matches: boolean) {
    super();
    this.media = media;
    this.matches = matches;
  }

  /**
   * Updates the match state and dispatches a `change` event if it changed.
   *
   * Called by the terminal layer when the color scheme changes.
   *
   * @param newMatches - The new match state.
   */
  update(newMatches: boolean): void {
    if (this.matches === newMatches) {
      return;
    }

    this.matches = newMatches;
    const event = new MediaQueryListEvent('change', {matches: newMatches, media: this.media});
    this.dispatchEvent(event);
    this.onchange?.(event);
  }
}

/**
 * Event dispatched when a `MediaQueryList`'s match state changes.
 */
export class MediaQueryListEvent extends Event {
  /** Whether the media query now matches. */
  readonly matches: boolean;

  /** The media query string. */
  readonly media: string;

  constructor(type: string, init: {matches: boolean; media: string}) {
    super(type);
    this.matches = init.matches;
    this.media = init.media;
  }
}
