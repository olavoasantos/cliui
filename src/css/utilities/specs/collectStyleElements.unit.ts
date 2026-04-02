import {describe, expect, it} from 'vitest';

import {Window} from '@cliui/dom';
import {collectStyleElements} from '../collectStyleElements';

describe('collectStyleElements', () => {
  it('returns an empty array when no style elements exist', () => {
    const window = new Window();

    expect(collectStyleElements(window.document)).toEqual([]);
  });

  it('collects style elements from head and body in document order by region', () => {
    const window = new Window();
    const headStyle = window.document.createElement('style');
    const otherHeadElement = window.document.createElement('meta');
    const bodyStyle = window.document.createElement('style');
    const nestedStyle = window.document.createElement('style');
    const wrapper = window.document.createElement('section');

    window.document.head.append(headStyle, otherHeadElement);
    wrapper.appendChild(nestedStyle);
    window.document.body.append(bodyStyle, wrapper);

    expect(collectStyleElements(window.document)).toEqual([headStyle, bodyStyle, nestedStyle]);
  });

  it('returns only body styles when the document head is missing', () => {
    const window = new Window();
    const bodyStyle = window.document.createElement('style');

    window.document.body.appendChild(bodyStyle);
    Object.defineProperty(window.document, 'head', {
      configurable: true,
      get() {
        return null;
      },
    });

    expect(collectStyleElements(window.document)).toEqual([]);
  });
});
