import styles from './styles.css?inline';

import {BREADCRUMB_OBSERVED_ATTRIBUTES, BREADCRUMB_TAG_NAME} from './constants';
import {HTMLElement} from '@cliui/dom';

/**
 * Built-in terminal breadcrumb segment custom element.
 *
 * Represents a single navigation segment inside a `<breadcrumbs>`
 * container. Displays its text content inline.
 *
 * Register with `window.customElements.define(Breadcrumb.tagName, Breadcrumb)`
 * before creating `<breadcrumb>` elements in a window.
 */
export class Breadcrumb extends HTMLElement {
  static override readonly observedAttributes = BREADCRUMB_OBSERVED_ATTRIBUTES;
  static readonly styles = styles;
  static readonly tagName = BREADCRUMB_TAG_NAME;
}
