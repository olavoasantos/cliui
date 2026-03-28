import {describe, expect, it} from 'vitest';

import {StyleResolver} from '../StyleResolver';
import {CSSParser} from '../CSSParser';
import {SelectorMatcher} from '../SelectorMatcher';
import {Window} from '../../../dom/classes/Window';

describe('StyleResolver integration', () => {
  it('resolves matched stylesheet declarations, inline overrides, inheritance, and shorthand expansion across the style pipeline', () => {
    const window = new Window();
    const document = window.document;
    const parser = new CSSParser();
    const matcher = new SelectorMatcher();
    const resolver = new StyleResolver();

    const {rules} = parser.parse(`
      .panel {
        color: red;
        text-align: left;
      }

      .panel > .label {
        font-weight: bold;
        margin: 1 2;
      }

      #primary.label {
        color: green;
      }
    `);

    const panel = document.createElement('div');
    panel.className = 'panel';
    const label = document.createElement('span');
    label.className = 'label';
    label.id = 'primary';
    label.style.color = 'purple';
    panel.appendChild(label);
    document.body.appendChild(panel);

    const panelStyle = resolver.resolve(matcher.match(rules, panel), panel.style, null);
    const labelStyle = resolver.resolve(matcher.match(rules, label), label.style, panelStyle);

    expect(panelStyle.get('color')).toBe('red');
    expect(panelStyle.get('text-align')).toBe('left');
    expect(labelStyle.get('font-weight')).toBe('bold');
    expect(labelStyle.get('margin-top')).toBe('1');
    expect(labelStyle.get('margin-right')).toBe('2');
    expect(labelStyle.get('text-align')).toBe('left');
    expect(labelStyle.get('color')).toBe('purple');
  });
});
