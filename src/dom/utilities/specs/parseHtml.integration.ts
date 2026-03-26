import {describe, expect, it} from 'vitest';

import {Window} from '../../classes/Window';
import {parseHtml} from '../parseHtml';

describe('parseHtml integration', () => {
  it('parses markup into a document fragment that can be queried, styled, and serialized without losing structure', () => {
    const window = new Window();
    const host = window.document.createElement('div');
    const fragment = parseHtml(
      '<section class="card"><style>.card { color: red; }</style><!--note--><h1>Title</h1><template><span>Hidden</span></template></section>',
      host,
    );

    host.append(fragment);

    const section = host.querySelector('.card');
    const style = host.querySelector('style');
    const template = host.querySelector('template');

    expect(section?.tagName).toBe('SECTION');
    expect(style?.textContent).toBe('.card { color: red; }');
    expect(template?.innerHTML).toBe('');
    expect(template?.outerHTML).toBe('<template><span>Hidden</span></template>');
    expect(host.outerHTML).toContain('<!--note-->');
    expect(host.outerHTML).toContain('<h1>Title</h1>');
  });
});
