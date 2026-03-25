import {describe, expect, it} from 'vitest';

import {Window} from '../../../dom/classes/Window';
import {collectStyleElements} from '../collectStyleElements';

describe('collectStyleElements', () => {
  it('collects style elements from head and body', () => {
    const window = new Window();
    const headStyle = window.document.createElement('style');
    const bodyStyle = window.document.createElement('style');

    window.document.head.appendChild(headStyle);
    window.document.body.appendChild(bodyStyle);

    expect(collectStyleElements(window.document)).toEqual([headStyle, bodyStyle]);
  });
});
