import {HTMLElement} from './HTMLElement';

/**
 * Stub `HTMLIFrameElement` so that `instanceof` checks in frameworks
 * like React 19 (`element instanceof window.HTMLIFrameElement`) do not
 * throw.  No element in the terminal DOM will ever be an instance of
 * this class.
 */
export class HTMLIFrameElement extends HTMLElement {}
