import {describe, expect, it} from 'vitest';

import {CSSParser} from '../CSSParser';
import {SelectorMatcher} from '../SelectorMatcher';
import {StyleResolver} from '../StyleResolver';
import {Window} from '../../../dom/classes/Window';

describe('CSSParser integration', () => {
  it('parses a stylesheet with comments and multiple selector blocks into declarations consumed by the style pipeline', () => {
    const parser = new CSSParser();
    const matcher = new SelectorMatcher();
    const resolver = new StyleResolver();
    const document = new Window().document;

    const rules = parser.parse(`
      /* layout */
      .app, .shell {
        display: flex;
        padding: 1 2;
      }

      .app .title {
        color: rgb(124, 58, 237);
      }

      [data-kind="summary"] {
        font-weight: bold;
      }
    `);

    const app = document.createElement('div');
    app.className = 'app';
    const title = document.createElement('span');
    title.className = 'title';
    title.setAttribute('data-kind', 'summary');
    app.appendChild(title);
    document.body.appendChild(app);

    const appStyle = resolver.resolve(matcher.match(rules, app), app.style, null);
    const titleStyle = resolver.resolve(matcher.match(rules, title), title.style, appStyle);

    expect(rules).toHaveLength(3);
    expect(appStyle.get('display')).toBe('flex');
    expect(appStyle.get('padding-left')).toBe('2');
    expect(titleStyle.get('color')).toBe('rgb(124, 58, 237)');
    expect(titleStyle.get('font-weight')).toBe('bold');
  });
});
