import {describe, it, expect} from 'vitest';

import {CSSParser} from '../CSSParser';
import {SelectorMatcher} from '../SelectorMatcher';
import {Window} from '../../../dom/classes/Window';

function createDocument() {
  const window = new Window();
  return window.document;
}

describe('SelectorMatcher', () => {
  const parser = new CSSParser();
  const matcher = new SelectorMatcher();

  describe('element selectors', () => {
    it('matches element by tag name', () => {
      const doc = createDocument();
      const div = doc.createElement('div');
      doc.body.appendChild(div);
      const {rules} = parser.parse('div { color: red; }');

      const matched = matcher.match(rules, div);

      expect(matched).toHaveLength(1);
      expect(matched[0]!.declaration).toEqual({property: 'color', value: 'red'});
    });

    it('does not match unrelated element', () => {
      const doc = createDocument();
      const span = doc.createElement('span');
      doc.body.appendChild(span);
      const {rules} = parser.parse('div { color: red; }');

      const matched = matcher.match(rules, span);

      expect(matched).toHaveLength(0);
    });
  });

  describe('id selectors', () => {
    it('matches element by id', () => {
      const doc = createDocument();
      const div = doc.createElement('div');
      div.setAttribute('id', 'main');
      doc.body.appendChild(div);
      const {rules} = parser.parse('#main { color: blue; }');

      const matched = matcher.match(rules, div);

      expect(matched).toHaveLength(1);
      expect(matched[0]!.declaration.value).toBe('blue');
    });
  });

  describe('class selectors', () => {
    it('matches element by class', () => {
      const doc = createDocument();
      const div = doc.createElement('div');
      div.setAttribute('class', 'container');
      doc.body.appendChild(div);
      const {rules} = parser.parse('.container { padding: 1; }');

      const matched = matcher.match(rules, div);

      expect(matched).toHaveLength(1);
      expect(matched[0]!.declaration).toEqual({property: 'padding', value: '1'});
    });

    it('matches element with multiple classes', () => {
      const doc = createDocument();
      const div = doc.createElement('div');
      div.setAttribute('class', 'box active');
      doc.body.appendChild(div);
      const {rules} = parser.parse('.active { color: green; }');

      const matched = matcher.match(rules, div);

      expect(matched).toHaveLength(1);
    });
  });

  describe('attribute selectors', () => {
    it('matches element by attribute presence', () => {
      const doc = createDocument();
      const div = doc.createElement('div');
      div.setAttribute('data-active', '');
      doc.body.appendChild(div);
      const {rules} = parser.parse('[data-active] { color: blue; }');

      const matched = matcher.match(rules, div);

      expect(matched).toHaveLength(1);
    });

    it('matches element by attribute value', () => {
      const doc = createDocument();
      const div = doc.createElement('div');
      div.setAttribute('data-type', 'panel');
      doc.body.appendChild(div);
      const {rules} = parser.parse('[data-type="panel"] { color: red; }');

      const matched = matcher.match(rules, div);

      expect(matched).toHaveLength(1);
    });
  });

  describe('combinators', () => {
    it('matches descendant combinator', () => {
      const doc = createDocument();
      const parent = doc.createElement('div');
      const child = doc.createElement('span');
      parent.appendChild(child);
      doc.body.appendChild(parent);
      const {rules} = parser.parse('div span { color: red; }');

      const matched = matcher.match(rules, child);

      expect(matched).toHaveLength(1);
    });

    it('matches child combinator', () => {
      const doc = createDocument();
      const parent = doc.createElement('div');
      const child = doc.createElement('span');
      parent.appendChild(child);
      doc.body.appendChild(parent);
      const {rules} = parser.parse('div > span { color: red; }');

      const matched = matcher.match(rules, child);

      expect(matched).toHaveLength(1);
    });

    it('does not match child combinator for non-direct child', () => {
      const doc = createDocument();
      const grandparent = doc.createElement('div');
      const parent = doc.createElement('section');
      const child = doc.createElement('span');
      grandparent.appendChild(parent);
      parent.appendChild(child);
      doc.body.appendChild(grandparent);
      const {rules} = parser.parse('div > span { color: red; }');

      const matched = matcher.match(rules, child);

      expect(matched).toHaveLength(0);
    });

    it('matches adjacent sibling combinator', () => {
      const doc = createDocument();
      const parent = doc.createElement('div');
      const first = doc.createElement('span');
      const second = doc.createElement('span');
      second.setAttribute('class', 'second');
      parent.appendChild(first);
      parent.appendChild(second);
      doc.body.appendChild(parent);
      const {rules} = parser.parse('span + .second { color: red; }');

      const matched = matcher.match(rules, second);

      expect(matched).toHaveLength(1);
    });

    it('matches general sibling combinator', () => {
      const doc = createDocument();
      const parent = doc.createElement('div');
      const first = doc.createElement('span');
      const second = doc.createElement('span');
      second.setAttribute('class', 'second');
      parent.appendChild(first);
      parent.appendChild(second);
      doc.body.appendChild(parent);
      const {rules} = parser.parse('span ~ .second { color: red; }');

      const matched = matcher.match(rules, second);

      expect(matched).toHaveLength(1);
    });
  });

  describe('specificity ordering', () => {
    it('orders id higher than class', () => {
      const doc = createDocument();
      const div = doc.createElement('div');
      div.setAttribute('id', 'main');
      div.setAttribute('class', 'box');
      doc.body.appendChild(div);

      const {rules} = parser.parse(`
        .box { color: blue; }
        #main { color: red; }
      `);

      const matched = matcher.match(rules, div);

      expect(matched).toHaveLength(2);
      // Higher specificity comes last (sorted ascending)
      expect(matched[0]!.declaration.value).toBe('blue'); // .box (0,1,0)
      expect(matched[1]!.declaration.value).toBe('red'); // #main (1,0,0)
    });

    it('orders class higher than element', () => {
      const doc = createDocument();
      const div = doc.createElement('div');
      div.setAttribute('class', 'box');
      doc.body.appendChild(div);

      const {rules} = parser.parse(`
        div { color: blue; }
        .box { color: red; }
      `);

      const matched = matcher.match(rules, div);

      expect(matched).toHaveLength(2);
      expect(matched[0]!.declaration.value).toBe('blue'); // div (0,0,1)
      expect(matched[1]!.declaration.value).toBe('red'); // .box (0,1,0)
    });

    it('uses source order for equal specificity', () => {
      const doc = createDocument();
      const div = doc.createElement('div');
      div.setAttribute('class', 'a b');
      doc.body.appendChild(div);

      const {rules} = parser.parse(`
        .a { color: blue; }
        .b { color: red; }
      `);

      const matched = matcher.match(rules, div);

      expect(matched).toHaveLength(2);
      // Same specificity — source order wins (later = higher priority)
      expect(matched[0]!.declaration.value).toBe('blue');
      expect(matched[1]!.declaration.value).toBe('red');
    });

    it('id > class > element in a single match set', () => {
      const doc = createDocument();
      const div = doc.createElement('div');
      div.setAttribute('id', 'main');
      div.setAttribute('class', 'box');
      doc.body.appendChild(div);

      const {rules} = parser.parse(`
        div { color: blue; }
        .box { color: green; }
        #main { color: red; }
      `);

      const matched = matcher.match(rules, div);

      expect(matched).toHaveLength(3);
      expect(matched[0]!.declaration.value).toBe('blue'); // (0,0,1)
      expect(matched[1]!.declaration.value).toBe('green'); // (0,1,0)
      expect(matched[2]!.declaration.value).toBe('red'); // (1,0,0)
    });
  });

  describe('comma-separated selectors', () => {
    it('matches when any selector in the list matches', () => {
      const doc = createDocument();
      const span = doc.createElement('span');
      doc.body.appendChild(span);
      const {rules} = parser.parse('div, span { color: red; }');

      const matched = matcher.match(rules, span);

      expect(matched).toHaveLength(1);
    });

    it('uses highest specificity from matching selectors', () => {
      const doc = createDocument();
      const div = doc.createElement('div');
      div.setAttribute('id', 'main');
      doc.body.appendChild(div);

      // Both selectors match — should use the higher specificity (#main)
      const {rules} = parser.parse('div, #main { color: red; }');

      const matched = matcher.match(rules, div);

      expect(matched).toHaveLength(1);
      expect(matched[0]!.specificity).toEqual([1, 0, 0]);
    });
  });

  describe('multiple declarations per rule', () => {
    it('returns all declarations from a matching rule', () => {
      const doc = createDocument();
      const div = doc.createElement('div');
      doc.body.appendChild(div);

      const {rules} = parser.parse(`
        div {
          color: red;
          font-weight: bold;
          padding: 1;
        }
      `);

      const matched = matcher.match(rules, div);

      expect(matched).toHaveLength(3);
      expect(matched.map((m) => m.declaration.property)).toEqual([
        'color',
        'font-weight',
        'padding',
      ]);
    });

    it('all declarations from the same rule share the same specificity', () => {
      const doc = createDocument();
      const div = doc.createElement('div');
      div.setAttribute('class', 'box');
      doc.body.appendChild(div);

      const {rules} = parser.parse('.box { color: red; padding: 1; }');

      const matched = matcher.match(rules, div);

      expect(matched).toHaveLength(2);
      expect(matched[0]!.specificity).toEqual(matched[1]!.specificity);
    });
  });

  describe('no matches', () => {
    it('returns empty array when no rules match', () => {
      const doc = createDocument();
      const div = doc.createElement('div');
      doc.body.appendChild(div);

      const {rules} = parser.parse('span { color: red; } .foo { padding: 1; }');

      const matched = matcher.match(rules, div);

      expect(matched).toHaveLength(0);
    });

    it('returns empty array for empty rules', () => {
      const doc = createDocument();
      const div = doc.createElement('div');
      doc.body.appendChild(div);

      const matched = matcher.match([], div);

      expect(matched).toHaveLength(0);
    });
  });
});
