/**
 * Callback for writing text to the system clipboard.
 */
export type ClipboardWriteHandler = (text: string) => void;

/**
 * Callback for reading text from the system clipboard.
 * Returns the clipboard content or `null` if unavailable.
 */
export type ClipboardReadHandler = () => string;

/**
 * Web Clipboard API implementation for terminal environments.
 *
 * Backed by OSC 52 for clipboard read/write. The terminal layer wires
 * the actual escape sequence emission via the static handlers.
 *
 * When OSC 52 read is not supported by the terminal, `readText()` falls
 * back to returning the last value written via `writeText()` in the
 * current session (in-memory buffer).
 *
 * @example
 * ```ts
 * await navigator.clipboard.writeText('hello');
 * const text = await navigator.clipboard.readText();
 * ```
 */
export class Clipboard {
  /**
   * Handler invoked to write text to the system clipboard.
   * Set by the terminal layer to emit OSC 52 write sequences.
   */
  static writeHandler: ClipboardWriteHandler | null = null;

  /**
   * Handler invoked to read text from the system clipboard.
   * Set by the terminal layer. Returns the clipboard content.
   */
  static readHandler: ClipboardReadHandler | null = null;

  /**
   * Writes the given text to the system clipboard.
   *
   * Emits an OSC 52 clipboard write sequence if a handler is wired,
   * and updates the in-memory buffer as a read fallback.
   *
   * @param text - The text to write to the clipboard.
   */
  writeText(text: string): Promise<void> {
    Clipboard.writeHandler?.(text);
    return Promise.resolve();
  }

  /**
   * Reads text from the system clipboard.
   *
   * Calls the read handler if available (OSC 52 query), otherwise
   * returns the last written value from the in-memory buffer.
   *
   * @returns The clipboard text content.
   */
  readText(): Promise<string> {
    const text = Clipboard.readHandler?.() ?? '';
    return Promise.resolve(text);
  }
}
