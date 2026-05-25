import {CONTENT} from '../constants';
import {parseHtml} from '../utilities/parseHtml';
import {serializeChildren} from '../utilities/serializeChildren';
import {Element} from './Element';

import type {DocumentFragment} from './DocumentFragment';

/**
 * Represents a `<template>` element whose content lives in an inert DocumentFragment.
 *
 * The `innerHTML` getter and setter operate on the content fragment, not on the element's own children.
 */
export class HTMLTemplateElement extends Element {
  [CONTENT]?: DocumentFragment;

  /** Inert document fragment holding the template's content. Lazily created on first access. */
  get content() {
    let content = this[CONTENT];
    if (!content) {
      content = this.ownerDocument.createDocumentFragment();
      this[CONTENT] = content;
    }
    return content;
  }

  set content(_value: DocumentFragment) {}

  /**
   * Replaces the content fragment's children by parsing the given HTML string.
   */
  set innerHTML(html: unknown) {
    this.content.replaceChildren(parseHtml(String(html), this));
  }

  /** Serialized HTML markup of the content fragment's children. Returns empty string if content is not yet created. */
  get innerHTML() {
    const content = this[CONTENT];
    return content ? serializeChildren(content) : '';
  }
}
