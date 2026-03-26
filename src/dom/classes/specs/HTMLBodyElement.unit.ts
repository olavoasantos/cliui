import {describe, expect, it} from 'vitest';

import {Element} from '../Element';
import {HTMLBodyElement} from '../HTMLBodyElement';
import {Window} from '../Window';

describe('HTMLBodyElement', () => {
  it('is created as the body element of the document', () => {
    const document = new Window().document;

    expect(document.body).toBeInstanceOf(HTMLBodyElement);
  });

  it('is an instance of Element', () => {
    const document = new Window().document;

    expect(document.body).toBeInstanceOf(Element);
  });

  it('has localName body', () => {
    const document = new Window().document;

    expect(document.body.localName).toBe('body');
  });
});
