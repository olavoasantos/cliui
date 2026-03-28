import {TERMINAL_DOM_USER_AGENT} from '../constants/environment';

/**
 * Minimal `Navigator` implementation for the terminal DOM environment.
 *
 * Provides the standard Web API shape with terminal-appropriate defaults.
 * Properties that reference browser-only subsystems (`clipboard`,
 * `permissions`, `geolocation`) return `null`.
 */
export class Navigator {
  /** User agent string identifying the terminal DOM runtime. */
  get userAgent(): string {
    return TERMINAL_DOM_USER_AGENT;
  }

  /** Preferred language of the runtime. */
  get language(): string {
    return 'en-US';
  }

  /** Array of preferred languages. */
  get languages(): readonly string[] {
    return ['en-US', 'en'];
  }

  /** Whether the runtime has network connectivity. Always `true`. */
  get onLine(): boolean {
    return true;
  }

  /** Number of logical processors available. */
  get hardwareConcurrency(): number {
    // Use actual value when available (Node.js exposes os.cpus())
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return require('node:os').cpus().length;
    } catch {
      return 1;
    }
  }

  /** Whether cookies are enabled. Always `false` in terminal context. */
  get cookieEnabled(): boolean {
    return false;
  }

  /** Browser app code name. */
  get appCodeName(): string {
    return 'Mozilla';
  }

  /** Browser app name. */
  get appName(): string {
    return 'Netscape';
  }

  /** Browser app version derived from the user agent string. */
  get appVersion(): string {
    const ua = this.userAgent;
    const index = ua.indexOf('/');

    return index > -1 ? ua.substring(index + 1) : '';
  }

  /** Runtime platform identifier. */
  get platform(): string {
    return typeof process !== 'undefined' ? process.platform : '';
  }

  /** Browser product identifier. */
  get product(): string {
    return 'Gecko';
  }

  /** Browser product sub-version. */
  get productSub(): string {
    return '20100101';
  }

  /** Browser vendor. Empty in terminal context. */
  get vendor(): string {
    return '';
  }

  /** Browser vendor sub-version. Empty in terminal context. */
  get vendorSub(): string {
    return '';
  }

  /** Maximum simultaneous touch contact points. Always `0`. */
  get maxTouchPoints(): number {
    return 0;
  }

  /** Whether the runtime is controlled by automation. */
  get webdriver(): boolean {
    return false;
  }

  /** Do Not Track preference. */
  get doNotTrack(): string {
    return 'unspecified';
  }

  /** Clipboard API. Not available in terminal context. */
  get clipboard(): null {
    return null;
  }

  /** Permissions API. Not available in terminal context. */
  get permissions(): null {
    return null;
  }

  /** Geolocation API. Not available in terminal context. */
  get geolocation(): null {
    return null;
  }

  toString(): string {
    return '[object Navigator]';
  }
}
