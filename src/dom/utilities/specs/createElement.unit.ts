import {describe, expect, it} from 'vitest';

import {NamespaceURI} from '../../constants';
import {Element} from '../../classes/Element';
import {HTMLStyleElement} from '../../classes/HTMLStyleElement';
import {HTMLTemplateElement} from '../../classes/HTMLTemplateElement';
import {SVGElement} from '../../classes/SVGElement';
import {Window} from '../../classes/Window';
import {createElement} from '../createElement';

describe('createElement', () => {
  it('creates an SVGElement when namespace is SVG', () => {
    const window = new Window();

    expect(createElement(window.document, 'svg', NamespaceURI.SVG)).toBeInstanceOf(SVGElement);
  });

  it('creates an HTMLTemplateElement for template tag', () => {
    const window = new Window();

    expect(createElement(window.document, 'template')).toBeInstanceOf(HTMLTemplateElement);
  });

  it('creates an HTMLStyleElement for style tag', () => {
    const window = new Window();

    expect(createElement(window.document, 'style')).toBeInstanceOf(HTMLStyleElement);
  });

  it('creates a custom element instance when one is registered', () => {
    const window = new Window();

    class MyElement extends Element {}

    window.customElements.define('my-element', MyElement as unknown as CustomElementConstructor);

    expect(createElement(window.document, 'my-element')).toBeInstanceOf(MyElement);
  });

  it('creates a plain Element for unknown tag names', () => {
    const window = new Window();
    const element = createElement(window.document, 'unknown-tag');

    expect(element).toBeInstanceOf(Element);
    expect(element).not.toBeInstanceOf(HTMLTemplateElement);
    expect(element).not.toBeInstanceOf(HTMLStyleElement);
    expect(element).not.toBeInstanceOf(SVGElement);
  });

  it('lowercases the name for built-in element matching', () => {
    const window = new Window();

    expect(createElement(window.document, 'STYLE')).toBeInstanceOf(HTMLStyleElement);
  });

  it('associates the element with the owner document', () => {
    const window = new Window();
    const element = createElement(window.document, 'div');

    expect(element.ownerDocument).toBe(window.document);
  });
});
