/**
 * Minimal `Location` implementation for the terminal DOM environment.
 *
 * Backed by a `URL` instance internally.  In terminal context the URL
 * defaults to `about:blank`.  Setter mutations update the internal URL
 * but do not trigger navigation (there is nowhere to navigate in a
 * terminal).
 */
export class Location {
  #url: URL;

  constructor(url = 'about:blank') {
    this.#url = new URL(url);
  }

  /** Full URL string. */
  get href(): string {
    return this.#url.href;
  }

  set href(value: string) {
    this.#url = new URL(value);
  }

  /** URL protocol scheme (e.g. `"https:"`). */
  get protocol(): string {
    return this.#url.protocol;
  }

  set protocol(value: string) {
    const url = new URL(this.#url.href);
    url.protocol = value;
    this.#url = url;
  }

  /** Hostname portion of the URL. */
  get hostname(): string {
    return this.#url.hostname;
  }

  set hostname(value: string) {
    const url = new URL(this.#url.href);
    url.hostname = value;
    this.#url = url;
  }

  /** Port number string. */
  get port(): string {
    return this.#url.port;
  }

  set port(value: string) {
    const url = new URL(this.#url.href);
    url.port = value;
    this.#url = url;
  }

  /** Combined host and port. */
  get host(): string {
    return this.#url.host;
  }

  set host(value: string) {
    const url = new URL(this.#url.href);
    url.host = value;
    this.#url = url;
  }

  /** URL path. */
  get pathname(): string {
    return this.#url.pathname;
  }

  set pathname(value: string) {
    const url = new URL(this.#url.href);
    url.pathname = value;
    this.#url = url;
  }

  /** Query string including the leading `?`. */
  get search(): string {
    return this.#url.search;
  }

  set search(value: string) {
    const url = new URL(this.#url.href);
    url.search = value;
    this.#url = url;
  }

  /** Fragment identifier including the leading `#`. */
  get hash(): string {
    return this.#url.hash;
  }

  set hash(value: string) {
    const url = new URL(this.#url.href);
    url.hash = value;
    this.#url = url;
  }

  /** URL origin. */
  get origin(): string {
    return this.#url.origin;
  }

  /**
   * Navigates to the given URL.  In terminal context this only updates
   * the internal URL — no navigation occurs.
   */
  assign(url: string | URL): void {
    this.href = String(url);
  }

  /**
   * Replaces the current URL without creating a history entry.  In
   * terminal context this only updates the internal URL.
   */
  replace(url: string | URL): void {
    this.href = String(url);
  }

  /**
   * Reloads the current resource.  No-op in terminal context.
   */
  reload(): void {
    /* no-op */
  }

  toString(): string {
    return this.#url.toString();
  }
}
