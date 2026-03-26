import {describe, expect, it} from 'vitest';

import {CSSParser} from '../CSSParser';
import {SelectorMatcher} from '../SelectorMatcher';
import {Window} from '../../../dom/classes/Window';

describe('SelectorMatcher integration', () => {
  it('matches compound and descendant selectors against realistic DOM trees produced by the document implementation', () => {
    const parser = new CSSParser();
    const matcher = new SelectorMatcher();
    const document = new Window().document;

    const rules = parser.parse(`
      .app .panel > .title.active {
        color: red;
      }

      .app [data-state="active"] {
        font-weight: bold;
      }

      section > .title {
        text-align: center;
      }
    `);

    const app = document.createElement('div');
    app.className = 'app';
    const panel = document.createElement('section');
    panel.className = 'panel';
    const title = document.createElement('span');
    title.className = 'title active';
    title.setAttribute('data-state', 'active');
    panel.appendChild(title);
    app.appendChild(panel);
    document.body.appendChild(app);

    const matched = matcher.match(rules, title);

    expect(matched.map(({declaration}) => declaration)).toEqual([
      {property: 'text-align', value: 'center'},
      {property: 'font-weight', value: 'bold'},
      {property: 'color', value: 'red'},
    ]);
  });
});
