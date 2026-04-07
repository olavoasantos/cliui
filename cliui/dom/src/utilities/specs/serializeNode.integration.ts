import {describe, expect, it} from 'vitest';

import {Window} from '../../classes/Window';
import {parseHtml} from '../parseHtml';
import {serializeNode} from '../serializeNode';

describe('serializeNode integration', () => {
  it('serializes parsed elements with nested comments, text, and template content', () => {
    const window = new Window();
    const host = window.document.createElement('div');
    const fragment = parseHtml(
      '<article data-id="42"><!--note--><h1>Title &amp; More</h1><template><span>Hidden</span></template></article>',
      host,
    );
    const article = fragment.firstChild!;

    expect(serializeNode(article)).toBe(
      '<article data-id="42"><!--note--><h1>Title &amp; More</h1><template><span>Hidden</span></template></article>',
    );
  });
});
