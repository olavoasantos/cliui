import styles from './styles.css?inline';

import {UI_BREADCRUMB_OBSERVED_ATTRIBUTES, UI_BREADCRUMB_TAG_NAME} from './constants';
import {HTMLElement} from '@cliui/dom';

/**
 * Built-in terminal breadcrumb segment custom element.
 *
 * Represents a single navigation segment inside a `<ui-breadcrumbs>`
 * container. Displays its text content inline.
 *
 * Register with `window.customElements.define(UiBreadcrumb.tagName, UiBreadcrumb)`
 * before creating `<ui-breadcrumb>` elements in a window.
 */
export class UiBreadcrumb extends HTMLElement {
  static override readonly observedAttributes = UI_BREADCRUMB_OBSERVED_ATTRIBUTES;
  static readonly styles = styles;
  static readonly tagName = UI_BREADCRUMB_TAG_NAME;
}
