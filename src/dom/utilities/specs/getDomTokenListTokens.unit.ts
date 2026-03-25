import {describe, expect, it} from 'vitest';

import {Window} from '../../classes/Window';
import {getDomTokenListTokens} from '../getDomTokenListTokens';

describe('getDomTokenListTokens', () => {
  it('returns deduplicated tokens from the backing attribute', () => {
    const window = new Window();
    const element = window.document.createElement('div');
    element.setAttribute('class', 'a a b');

    expect(getDomTokenListTokens(element.classList)).toEqual(['a', 'b']);
  });
});
