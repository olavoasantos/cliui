import type {CDPTransport} from './CDPTransport';
import type {RuntimeDomainHandler} from './RuntimeDomainHandler';
import type {ObjectRegistry} from './ObjectRegistry';

/** Console method names we intercept. */
const CONSOLE_METHODS = ['log', 'warn', 'error', 'info'] as const;

/** Maps console method names to CDP Log.entryAdded level values. */
const LEVEL_MAP: Record<string, string> = {
  log: 'info',
  info: 'info',
  warn: 'warning',
  error: 'error',
};

/**
 * CDP Log domain handler for console message forwarding.
 *
 * Intercepts `console.log`, `console.warn`, `console.error`, and
 * `console.info` and forwards them to DevTools as `Log.entryAdded`
 * and `Runtime.consoleAPICalled` events.
 *
 * Interception is non-destructive — original console output to
 * stdout/stderr is preserved (messages are tee'd, not redirected).
 */
export class LogDomainHandler {
  private readonly transport: CDPTransport;
  private readonly objectRegistry: ObjectRegistry;
  private readonly runtimeHandler: RuntimeDomainHandler;

  private enabled = false;
  private readonly originals = new Map<string, (...args: unknown[]) => void>();

  constructor(
    transport: CDPTransport,
    objectRegistry: ObjectRegistry,
    runtimeHandler: RuntimeDomainHandler,
  ) {
    this.transport = transport;
    this.objectRegistry = objectRegistry;
    this.runtimeHandler = runtimeHandler;
  }

  /** Registers all Log domain method handlers. */
  register(): void {
    this.transport.registerMethod('Log.enable', () => this.enable());
    this.transport.registerMethod('Log.disable', () => this.disable());
    this.transport.registerMethod('Log.clear', () => ({}));
    this.transport.registerMethod('Log.startViolationsReport', () => ({}));
    this.transport.registerMethod('Log.stopViolationsReport', () => ({}));
  }

  /** Whether console interception is currently active. */
  get isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Restores original console methods.
   *
   * Called during bridge shutdown to ensure clean teardown.
   */
  restore(): void {
    this.disable();
  }

  /**
   * `Log.enable` — begins intercepting console methods.
   */
  private enable(): Record<string, unknown> {
    if (this.enabled) return {};
    this.enabled = true;

    for (const method of CONSOLE_METHODS) {
      const original = console[method].bind(console);
      this.originals.set(method, original);

      console[method] = (...args: unknown[]) => {
        // Preserve original output
        original(...args);

        if (!this.enabled) return;

        const timestamp = Date.now() / 1000;

        // Emit Log.entryAdded
        this.transport.broadcastEvent({
          method: 'Log.entryAdded',
          params: {
            entry: {
              source: 'javascript',
              level: LEVEL_MAP[method] ?? 'info',
              text: args.map(formatArg).join(' '),
              timestamp,
            },
          },
        });

        // Also emit Runtime.consoleAPICalled
        this.runtimeHandler.emitConsoleAPICalled(method, args, timestamp);
      };
    }

    return {};
  }

  /**
   * `Log.disable` — stops interception and restores console methods.
   */
  private disable(): Record<string, unknown> {
    if (!this.enabled) return {};
    this.enabled = false;

    for (const method of CONSOLE_METHODS) {
      const original = this.originals.get(method);
      if (original) {
        console[method] = original as typeof console.log;
      }
    }
    this.originals.clear();

    return {};
  }
}

/**
 * Formats an argument for the `text` field of Log.entryAdded.
 */
function formatArg(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}
