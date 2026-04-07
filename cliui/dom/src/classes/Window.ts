import {Document} from './Document';
import {Event} from './Event';
import {EventTarget} from './EventTarget';
import {CustomEvent} from './CustomEvent';
import {ErrorEvent} from './ErrorEvent';
import {PromiseRejectionEvent} from './PromiseRejectionEvent';
import {ToggleEvent} from './ToggleEvent';
import {FocusEvent} from './FocusEvent';
import {ClipboardEvent} from './ClipboardEvent';
import {Location} from './Location';
import {MediaQueryList} from './MediaQueryList';
import {Navigator} from './Navigator';
import {Notification} from './Notification';
import {Node} from './Node';
import {ParentNode} from './ParentNode';
import {ChildNode} from './ChildNode';
import {Element} from './Element';
import {HTMLIFrameElement} from './HTMLIFrameElement';
import {HTMLElement} from './HTMLElement';
import {SVGElement} from './SVGElement';
import {CharacterData} from './CharacterData';
import {Text} from './Text';
import {Comment} from './Comment';
import {DocumentFragment} from './DocumentFragment';
import {HTMLTemplateElement} from './HTMLTemplateElement';
import {CustomElementRegistryImplementation} from './CustomElementRegistry';
import {MutationObserver} from './MutationObserver';
import {Performance} from './Performance';
import {PerformanceObserver} from './PerformanceObserver';
import {HOOKS} from '../constants';

import type {Hooks, OnErrorHandler} from '../types';
import type {HTMLDialogElement} from './HTMLDialogElement';

export class Window extends EventTarget {
  [HOOKS]: Partial<Hooks> = {};
  name = '';
  window = this;
  parent = this;
  self = this;
  top = this;
  document = new Document(this);
  customElements = new CustomElementRegistryImplementation();
  navigator = new Navigator();
  location = new Location();

  /** Legacy `window.event` property. Always `undefined` in terminal context. */
  event: Event | undefined = undefined;

  Event = Event;
  ErrorEvent = ErrorEvent;
  PromiseRejectionEvent = PromiseRejectionEvent;
  ToggleEvent = ToggleEvent;
  FocusEvent = FocusEvent;
  ClipboardEvent = ClipboardEvent;
  EventTarget = EventTarget;
  CustomEvent = CustomEvent;
  Node = Node;
  ParentNode = ParentNode;
  ChildNode = ChildNode;
  DocumentFragment = DocumentFragment;
  Document = Document;
  CharacterData = CharacterData;
  Comment = Comment;
  Text = Text;
  Element = Element;
  HTMLElement = HTMLElement;
  SVGElement = SVGElement;
  HTMLTemplateElement = HTMLTemplateElement;
  MutationObserver = MutationObserver;
  PerformanceObserver = PerformanceObserver;
  Navigator = Navigator;
  Notification = Notification;
  MediaQueryList = MediaQueryList;

  /**
   * The current color scheme detected from the terminal.
   * Set by the terminal layer; defaults to `'dark'`.
   */
  #colorScheme: 'dark' | 'light' = 'dark';

  /** Active MediaQueryList instances tracked for change notification. */
  #mediaQueryLists: MediaQueryList[] = [];
  Location = Location;

  performance = new Performance();

  /**
   * Evaluates a media query and returns a `MediaQueryList` object.
   *
   * Supported queries:
   * - `(prefers-color-scheme: dark)` — matches when terminal bg is dark
   * - `(prefers-color-scheme: light)` — matches when terminal bg is light
   *
   * Unsupported queries return `{ matches: false, media: query }`.
   *
   * @param query - The media query string to evaluate.
   */
  matchMedia(query: string): MediaQueryList {
    const normalized = query.replace(/\s+/g, ' ').trim().toLowerCase();
    let matches = false;

    if (normalized === '(prefers-color-scheme: dark)') {
      matches = this.#colorScheme === 'dark';
    } else if (normalized === '(prefers-color-scheme: light)') {
      matches = this.#colorScheme === 'light';
    }

    const mql = new MediaQueryList(query, matches);
    this.#mediaQueryLists.push(mql);
    return mql;
  }

  /**
   * Sets the detected color scheme and notifies all tracked `MediaQueryList`
   * instances. Called by the terminal layer when the terminal background
   * luminance is determined.
   *
   * @param scheme - The detected color scheme.
   */
  setColorScheme(scheme: 'dark' | 'light'): void {
    if (scheme === this.#colorScheme) {
      return;
    }

    this.#colorScheme = scheme;

    for (const mql of this.#mediaQueryLists) {
      const normalized = mql.media.replace(/\s+/g, ' ').trim().toLowerCase();
      let newMatches = false;

      if (normalized === '(prefers-color-scheme: dark)') {
        newMatches = scheme === 'dark';
      } else if (normalized === '(prefers-color-scheme: light)') {
        newMatches = scheme === 'light';
      }

      mql.update(newMatches);
    }
  }

  /**
   * Returns the current color scheme.
   */
  getColorScheme(): 'dark' | 'light' {
    return this.#colorScheme;
  }

  /**
   * Schedules a callback before the next repaint.
   *
   * In a terminal context, uses setTimeout(cb, 0) since there's no
   * real vsync. Returns a numeric ID for cancellation.
   */
  requestAnimationFrame(callback: (timestamp: number) => void): number {
    return setTimeout(() => callback(this.performance.now()), 0) as unknown as number;
  }

  /** Cancels a scheduled requestAnimationFrame callback. */
  cancelAnimationFrame(id: number): void {
    clearTimeout(id);
  }

  /**
   * Schedules a callback during idle time.
   *
   * In a terminal context, uses setTimeout(cb, 0).
   */
  requestIdleCallback(callback: () => void): number {
    return setTimeout(callback, 0) as unknown as number;
  }

  /** Cancels a scheduled requestIdleCallback. */
  cancelIdleCallback(id: number): void {
    clearTimeout(id);
  }

  HTMLIFrameElement = HTMLIFrameElement;

  #currentOnErrorHandler: EventListener | null = null;
  #currentOriginalOnErrorHandler: OnErrorHandler = null;
  #currentOnUnhandledRejectionHandler: EventListener | null = null;

  get onerror() {
    return this.#currentOriginalOnErrorHandler;
  }
  set onerror(handler: OnErrorHandler) {
    if (this.#currentOnErrorHandler) {
      this.removeEventListener('error', this.#currentOnErrorHandler);
    }
    if (handler && typeof handler === 'function') {
      this.#currentOriginalOnErrorHandler = handler;
      this.#currentOnErrorHandler = (event: unknown) => {
        const e = event as ErrorEvent;
        handler(e.message ?? 'Error', e.filename, e.lineno, e.colno, e.error);
      };
      this.addEventListener('error', this.#currentOnErrorHandler);
    } else {
      this.#currentOnErrorHandler = null;
      this.#currentOriginalOnErrorHandler = null;
    }
  }

  get onunhandledrejection() {
    return this.#currentOnUnhandledRejectionHandler;
  }
  set onunhandledrejection(handler: EventListener | null) {
    if (this.#currentOnUnhandledRejectionHandler) {
      this.removeEventListener('unhandledrejection', this.#currentOnUnhandledRejectionHandler);
    }
    if (handler && typeof handler === 'function') {
      this.#currentOnUnhandledRejectionHandler = handler;
      this.addEventListener('unhandledrejection', this.#currentOnUnhandledRejectionHandler);
    } else {
      this.#currentOnUnhandledRejectionHandler = null;
    }
  }

  constructor() {
    super();
    this.customElements.setOwner(this);
  }

  /**
   * Displays a modal alert dialog with a message and an OK button.
   *
   * Returns a `Promise` that resolves when the user dismisses the dialog.
   * In browsers this is blocking; in terminal-dom it is async to remain
   * non-blocking while providing the same mental model with `await`.
   *
   * @param message - The message to display.
   */
  alert(message = ''): Promise<void> {
    return new Promise<void>((resolve) => {
      const doc = this.document;
      const dialog = doc.createElement('dialog') as HTMLDialogElement;

      const msgEl = doc.createElement('div');
      msgEl.textContent = String(message);
      dialog.appendChild(msgEl);

      const actions = doc.createElement('div');
      actions.setAttribute('style', 'display:flex;justify-content:flex-end;margin-top:1');

      const okBtn = doc.createElement('button');
      okBtn.textContent = 'OK';
      okBtn.setAttribute('tabindex', '0');
      actions.appendChild(okBtn);
      dialog.appendChild(actions);

      const dismiss = (): void => {
        dialog.close();
        dialog.parentNode?.removeChild(dialog);
        resolve();
      };

      okBtn.addEventListener('click', dismiss);
      dialog.addEventListener('close', dismiss);

      doc.body.appendChild(dialog);
      dialog.showModal();
    });
  }

  /**
   * Displays a modal confirmation dialog with OK and Cancel buttons.
   *
   * Returns a `Promise` that resolves to `true` if the user clicks OK
   * (or presses Enter), or `false` if the user clicks Cancel (or
   * presses Escape).
   *
   * @param message - The message to display.
   */
  confirm(message = ''): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      const doc = this.document;
      const dialog = doc.createElement('dialog') as HTMLDialogElement;

      const msgEl = doc.createElement('div');
      msgEl.textContent = String(message);
      dialog.appendChild(msgEl);

      const actions = doc.createElement('div');
      actions.setAttribute('style', 'display:flex;justify-content:flex-end;gap:1;margin-top:1');

      const cancelBtn = doc.createElement('button');
      cancelBtn.textContent = 'Cancel';
      cancelBtn.setAttribute('tabindex', '0');
      actions.appendChild(cancelBtn);

      const okBtn = doc.createElement('button');
      okBtn.textContent = 'OK';
      okBtn.setAttribute('tabindex', '0');
      actions.appendChild(okBtn);
      dialog.appendChild(actions);

      let resolved = false;

      const cleanup = (): void => {
        dialog.close();
        dialog.parentNode?.removeChild(dialog);
      };

      okBtn.addEventListener('click', () => {
        if (resolved) return;
        resolved = true;
        cleanup();
        resolve(true);
      });

      cancelBtn.addEventListener('click', () => {
        if (resolved) return;
        resolved = true;
        cleanup();
        resolve(false);
      });

      dialog.addEventListener('close', () => {
        if (resolved) return;
        resolved = true;
        dialog.parentNode?.removeChild(dialog);
        resolve(false);
      });

      doc.body.appendChild(dialog);
      dialog.showModal();
    });
  }

  /**
   * Displays a modal prompt dialog with a text input, OK and Cancel buttons.
   *
   * Returns a `Promise` that resolves to the entered text if the user
   * clicks OK (or presses Enter), or `null` if cancelled.
   *
   * @param message - The message to display.
   * @param defaultValue - Optional pre-filled value for the text input.
   */
  prompt(message = '', defaultValue = ''): Promise<string | null> {
    return new Promise<string | null>((resolve) => {
      const doc = this.document;
      const dialog = doc.createElement('dialog') as HTMLDialogElement;

      const msgEl = doc.createElement('div');
      msgEl.textContent = String(message);
      dialog.appendChild(msgEl);

      const input = doc.createElement('input');
      input.setAttribute('tabindex', '0');
      input.setAttribute('value', String(defaultValue));
      dialog.appendChild(input);

      const actions = doc.createElement('div');
      actions.setAttribute('style', 'display:flex;justify-content:flex-end;gap:1;margin-top:1');

      const cancelBtn = doc.createElement('button');
      cancelBtn.textContent = 'Cancel';
      cancelBtn.setAttribute('tabindex', '0');
      actions.appendChild(cancelBtn);

      const okBtn = doc.createElement('button');
      okBtn.textContent = 'OK';
      okBtn.setAttribute('tabindex', '0');
      actions.appendChild(okBtn);
      dialog.appendChild(actions);

      let resolved = false;

      const getValue = (): string => {
        // Use the `value` property if available (e.g. from @cliui/elements input),
        // otherwise fall back to the attribute.
        const el = input as Element & {value?: string};
        return el.value !== undefined
          ? String(el.value)
          : (input.getAttribute('value') ?? defaultValue);
      };

      const cleanup = (): void => {
        dialog.close();
        dialog.parentNode?.removeChild(dialog);
      };

      okBtn.addEventListener('click', () => {
        if (resolved) return;
        resolved = true;
        const value = getValue();
        cleanup();
        resolve(value);
      });

      cancelBtn.addEventListener('click', () => {
        if (resolved) return;
        resolved = true;
        cleanup();
        resolve(null);
      });

      dialog.addEventListener('close', () => {
        if (resolved) return;
        resolved = true;
        dialog.parentNode?.removeChild(dialog);
        resolve(null);
      });

      doc.body.appendChild(dialog);
      dialog.showModal();
    });
  }
}
