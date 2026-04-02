import {describe, expect, it} from 'vitest';

import {Window} from '../../classes/Window';
import {parseHtml} from '../parseHtml';
import {querySelector} from '../querySelector';

describe('querySelector integration', () => {
  it('returns the first matching element from parsed markup using selector combinators', () => {
    const window = new Window();
    const host = window.document.createElement('div');
    const fragment = parseHtml(
      '<article><h1 class="title">First</h1><section><h1 class="title">Second</h1></section><p data-kind="summary">Done</p></article>',
      host,
    );

    host.append(fragment);

    expect(querySelector(host, 'article > .title')?.textContent).toBe('First');
    expect(querySelector(host, '[data-kind="summary"]')?.textContent).toBe('Done');
    expect(querySelector(host, '.missing')).toBeNull();
  });
});
