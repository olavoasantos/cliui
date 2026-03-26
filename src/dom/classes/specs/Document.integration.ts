import {describe, expect, it} from 'vitest';

import {Window} from '../Window';

describe('Document integration', () => {
  it('coordinates document creation, element insertion, querying, and serialization across the DOM layer', () => {
    const document = new Window().document;
    const section = document.createElement('section');
    section.setAttribute('id', 'app');
    section.className = 'shell';

    const article = document.createElement('article');
    article.className = 'panel';
    article.setAttribute('data-padding', '1 2');
    article.innerHTML = '<h1 class="title">Hello</h1><p>World</p>';

    const note = document.createComment('hydrated');
    section.append(article, note);
    document.body.appendChild(section);

    expect(document.querySelector('#app')).toBe(section);
    expect(document.querySelectorAll('.title')).toHaveLength(1);
    expect(section.outerHTML).toContain('<article class="panel" data-padding="1 2">');
    expect(section.outerHTML).toContain('<!--hydrated-->');
    expect(document.body.textContent).toContain('HelloWorld');
  });
});
