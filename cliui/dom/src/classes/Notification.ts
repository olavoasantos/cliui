import {EventTarget} from './EventTarget';
import {Event} from './Event';

/**
 * Callback invoked when a notification is created.
 * The terminal layer uses this to emit the appropriate escape sequences.
 */
export type NotificationHandler = (title: string, body: string) => void;

/** Terminal-compatible subset of the Notification permission state. */
type NotificationPermissionState = 'default' | 'denied' | 'granted';

/** Options accepted by the `Notification` constructor. */
interface TerminalNotificationOptions {
  body?: string;
  icon?: string;
  tag?: string;
}

/**
 * Web Notification API implementation for terminal environments.
 *
 * In terminal context, creating a `Notification` triggers a terminal
 * notification via OSC 9 (iTerm2/Konsole), OSC 777 (rxvt-unicode),
 * or falls back to BEL (`\x07`) if neither is supported.
 *
 * Permission is always `'granted'` — terminal applications do not need
 * user permission to emit notifications.
 *
 * @example
 * ```ts
 * new Notification('Build complete', { body: 'All tests passed.' });
 * ```
 */
export class Notification extends EventTarget {
  /** The notification title. */
  readonly title: string;

  /** The notification body text. */
  readonly body: string;

  /** The notification icon URL (ignored in terminal context). */
  readonly icon: string;

  /** The notification tag for identification/replacement. */
  readonly tag: string;

  /**
   * Permission state. Always `'granted'` in terminal context — the
   * terminal emulator manages notification display.
   */
  static permission: NotificationPermissionState = 'granted';

  /**
   * Handler invoked when a notification is constructed.
   * Set by the terminal layer to wire escape sequence emission.
   */
  static handler: NotificationHandler | null = null;

  /** Event handler for the `click` event. */
  onclick: EventListener | null = null;

  /** Event handler for the `close` event. */
  onclose: EventListener | null = null;

  /** Event handler for the `error` event. */
  onerror: EventListener | null = null;

  /** Event handler for the `show` event. */
  onshow: EventListener | null = null;

  /**
   * Requests notification permission.
   *
   * Always resolves to `'granted'` — no permission prompt is needed
   * in terminal context.
   */
  static requestPermission(): Promise<NotificationPermissionState> {
    return Promise.resolve('granted');
  }

  /**
   * Creates a new notification.
   *
   * @param title - The notification title text.
   * @param options - Optional configuration (body, icon, tag).
   */
  constructor(title: string, options: TerminalNotificationOptions = {}) {
    super();
    this.title = title;
    this.body = options.body ?? '';
    this.icon = options.icon ?? '';
    this.tag = options.tag ?? '';

    // Notify the terminal layer
    Notification.handler?.(this.title, this.body);

    // Dispatch show event asynchronously (matching browser behavior)
    queueMicrotask(() => {
      const showEvent = new Event('show');
      this.dispatchEvent(showEvent);
      this.onshow?.(showEvent);
    });
  }

  /**
   * Closes the notification.
   *
   * In terminal context this is a no-op — terminal notifications are
   * transient and managed by the OS.
   */
  close(): void {
    const closeEvent = new Event('close');
    this.dispatchEvent(closeEvent);
    this.onclose?.(closeEvent);
  }
}
