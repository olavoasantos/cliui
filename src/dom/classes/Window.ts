import {Document} from './Document';
import {Event} from './Event';
import {EventTarget} from './EventTarget';
import {CustomEvent} from './CustomEvent';
import {ErrorEvent} from './ErrorEvent';
import {PromiseRejectionEvent} from './PromiseRejectionEvent';
import {ToggleEvent} from './ToggleEvent';
import {FocusEvent} from './FocusEvent';
import {ClipboardEvent} from './ClipboardEvent';
import {Node} from './Node';
import {ParentNode} from './ParentNode';
import {ChildNode} from './ChildNode';
import {Element} from './Element';
import {HTMLElement} from './HTMLElement';
import {SVGElement} from './SVGElement';
import {CharacterData} from './CharacterData';
import {Text} from './Text';
import {Comment} from './Comment';
import {DocumentFragment} from './DocumentFragment';
import {HTMLTemplateElement} from './HTMLTemplateElement';
import {CustomElementRegistryImplementation} from './CustomElementRegistry';
import {MutationObserver} from './MutationObserver';
import {HOOKS} from '../constants';

import type {Hooks} from '../types';
import type {OnErrorHandler} from '../types/OnErrorHandler';

export class Window extends EventTarget {
  [HOOKS]: Partial<Hooks> = {};
  name = '';
  window = this;
  parent = this;
  self = this;
  top = this;
  document = new Document(this);
  customElements = (() => {
    const registry = new CustomElementRegistryImplementation();
    registry.setOwner(this);
    return registry;
  })();
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
}
