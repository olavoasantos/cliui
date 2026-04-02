import {describe, expect, it, vi} from 'vitest';

import {updateElementAttribute} from '../updateElementAttribute';
import {Window} from '../../classes/Window';

import type {CustomElementWithAttributeChangedCallback} from '../../types/CustomElementWithAttributeChangedCallback';

interface TestElement extends CustomElementWithAttributeChangedCallback {
  constructor: {observedAttributes: string[]};
}

describe('updateElementAttribute', () => {
  it('invokes attributeChangedCallback for observed attributes', () => {
    const window = new Window();
    const element = window.document.createElement('div') as TestElement;
    const attributeChangedCallback =
      vi.fn<(name: string, oldValue: string | null, newValue: string | null) => void>();

    element.attributeChangedCallback = attributeChangedCallback;
    element.constructor = {observedAttributes: ['data-id']};

    updateElementAttribute(element, 'data-id', '1', '2');

    expect(attributeChangedCallback).toHaveBeenCalledWith('data-id', '1', '2');
  });

  it('does nothing for unobserved attributes', () => {
    const window = new Window();
    const element = window.document.createElement('div') as TestElement;
    const attributeChangedCallback =
      vi.fn<(name: string, oldValue: string | null, newValue: string | null) => void>();

    element.attributeChangedCallback = attributeChangedCallback;
    element.constructor = {observedAttributes: ['data-id']};

    updateElementAttribute(element, 'class', null, 'card');

    expect(attributeChangedCallback).not.toHaveBeenCalled();
  });
});
