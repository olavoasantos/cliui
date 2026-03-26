import {describe, expect, it} from 'vitest';

import {Window} from '../../classes/Window';
import {parseHtml} from '../parseHtml';
import {querySelectorAll} from '../querySelectorAll';

describe('querySelectorAll integration', () => {
  it('collects all matching elements from parsed markup in document order', () => {
    const window = new Window();
    const host = window.document.createElement('div');
    const fragment = parseHtml(
      '<section><p class="item">One</p><div><p class="item">Two</p></div><p>Three</p></section>',
      host,
    );

    host.append(fragment);

    expect(querySelectorAll(host, 'section .item').map((element) => element.textContent)).toEqual([
      'One',
      'Two',
    ]);
  });
});
