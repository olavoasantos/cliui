import {describe, expect, it} from 'vitest';

import {Window} from '../../classes/Window';
import {setDomTokenListTokens} from '../setDomTokenListTokens';

describe('setDomTokenListTokens', () => {
  it('writes the serialized token list to the owner attribute', () => {
    const window = new Window();
    const element = window.document.createElement('div');

    setDomTokenListTokens(element.classList, ['foo', 'bar']);

    expect(element.getAttribute('class')).toBe('foo bar');
  });
});
