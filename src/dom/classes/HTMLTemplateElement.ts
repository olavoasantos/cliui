import {CONTENT} from '../constants/index';
import type {DocumentFragment} from './DocumentFragment';
import {Element} from './Element';
import {parseHtml, serializeChildren} from '../utilities/serialization';

export class HTMLTemplateElement extends Element {
  [CONTENT]?: DocumentFragment;

  get content() {
    let content = this[CONTENT];
    if (!content) {
      content = this.ownerDocument.createDocumentFragment();
      this[CONTENT] = content;
    }
    return content;
  }

  set content(_value: DocumentFragment) {}

  set innerHTML(html: unknown) {
    this.content.replaceChildren(parseHtml(String(html), this));
  }

  get innerHTML() {
    const content = this[CONTENT];
    return content ? serializeChildren(content) : '';
  }
}
