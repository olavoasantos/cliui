import {describe, expect, it} from 'vitest';

import {Element} from '../Element';
import {HTMLHeadElement} from '../HTMLHeadElement';
import {Window} from '../Window';

describe('HTMLHeadElement', () => {
  it('is created as the head element of the document', () => {
    const document = new Window().document;

    expect(document.head).toBeInstanceOf(HTMLHeadElement);
  });

  it('is an instance of Element', () => {
    const document = new Window().document;

    expect(document.head).toBeInstanceOf(Element);
  });

  it('has localName head', () => {
    const document = new Window().document;

    expect(document.head.localName).toBe('head');
  });
});
