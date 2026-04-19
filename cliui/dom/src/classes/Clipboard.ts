/**
 * Callback for writing text to the system clipboard.
 */
export type ClipboardWriteHandler = (text: string) => void;

/**
 * Callback for reading text from the system clipboard.
 * Returns the clipboard content as a string.
 */
export type ClipboardReadHandler = () => string;

/**
 * Web Clipboard API implementation for terminal environments.
 *
 * The DOM-layer Clipboard is stateless — it has no internal buffer.
 * Static handlers (`writeHandler`, `readHandler`) are set by the
 * environment layer to provide platform-specific behavior. When no
 * handler is wired, `writeText()` is a no-op and `readText()` returns
 * an empty string.
 *
 * If read-after-write behavior is needed (returning the last written
 * value), the environment's `readHandler` closure owns that buffer.
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
   * Calls `writeHandler` if wired; otherwise silently drops the text.
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
   * Calls `readHandler` if wired; otherwise returns an empty string.
   *
   * @returns The clipboard text content.
   */
  readText(): Promise<string> {
    const text = Clipboard.readHandler?.() ?? '';
    return Promise.resolve(text);
  }
}
