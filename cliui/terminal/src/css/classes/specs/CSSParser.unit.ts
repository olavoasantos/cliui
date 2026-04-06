import {describe, it, expect} from 'vitest';

import {CSSParser} from '../CSSParser';
import {SelectorCombinator, SelectorMatcherType} from '@cliui/dom';

describe('CSSParser', () => {
  const parser = new CSSParser();

  describe('basic parsing', () => {
    it('parses a single rule with one declaration', () => {
      const {rules} = parser.parse('div { color: red; }');

      expect(rules).toHaveLength(1);
      expect(rules[0]!.declarations).toEqual([{property: 'color', value: 'red'}]);
    });

    it('parses a single rule with multiple declarations', () => {
      const {rules} = parser.parse(`
        div {
          color: red;
          padding: 1 2;
          border-style: rounded;
        }
      `);

      expect(rules).toHaveLength(1);
      expect(rules[0]!.declarations).toEqual([
        {property: 'color', value: 'red'},
        {property: 'padding', value: '1 2'},
        {property: 'border-style', value: 'rounded'},
      ]);
    });

    it('parses multiple rules', () => {
      const {rules} = parser.parse(`
        div { color: red; }
        span { font-weight: bold; }
      `);

      expect(rules).toHaveLength(2);
      expect(rules[0]!.declarations).toEqual([{property: 'color', value: 'red'}]);
      expect(rules[1]!.declarations).toEqual([{property: 'font-weight', value: 'bold'}]);
    });

    it('parses declarations without trailing semicolons', () => {
      const {rules} = parser.parse('div { color: red }');

      expect(rules).toHaveLength(1);
      expect(rules[0]!.declarations).toEqual([{property: 'color', value: 'red'}]);
    });
  });

  describe('selector parsing', () => {
    it('parses element selectors', () => {
      const {rules} = parser.parse('div { color: red; }');

      expect(rules[0]!.selectors).toHaveLength(1);
      const parts = rules[0]!.selectors[0]!;
      expect(parts).toHaveLength(1);
      expect(parts[0]!.matchers[0]!.type).toBe(SelectorMatcherType.Element);
      expect(parts[0]!.matchers[0]!.name).toBe('div');
    });

    it('parses id selectors', () => {
      const {rules} = parser.parse('#main { color: red; }');

      const parts = rules[0]!.selectors[0]!;
      expect(parts[0]!.matchers[0]!.type).toBe(SelectorMatcherType.Id);
      expect(parts[0]!.matchers[0]!.name).toBe('main');
    });

    it('parses class selectors', () => {
      const {rules} = parser.parse('.container { padding: 1; }');

      const parts = rules[0]!.selectors[0]!;
      expect(parts[0]!.matchers[0]!.type).toBe(SelectorMatcherType.Class);
      expect(parts[0]!.matchers[0]!.name).toBe('container');
    });

    it('parses attribute selectors', () => {
      const {rules} = parser.parse('[data-active] { color: blue; }');

      const parts = rules[0]!.selectors[0]!;
      expect(parts[0]!.matchers[0]!.type).toBe(SelectorMatcherType.Attribute);
      expect(parts[0]!.matchers[0]!.name).toBe('data-active');
    });

    it('parses compound selectors', () => {
      const {rules} = parser.parse('div.container#main { color: red; }');

      const parts = rules[0]!.selectors[0]!;
      expect(parts).toHaveLength(1);
      expect(parts[0]!.matchers).toHaveLength(3);
      expect(parts[0]!.matchers[0]!.type).toBe(SelectorMatcherType.Element);
      expect(parts[0]!.matchers[1]!.type).toBe(SelectorMatcherType.Class);
      expect(parts[0]!.matchers[2]!.type).toBe(SelectorMatcherType.Id);
    });

    it('parses descendant combinators', () => {
      const {rules} = parser.parse('div span { color: red; }');

      const parts = rules[0]!.selectors[0]!;
      expect(parts).toHaveLength(2);
      // parseSelector stores the combinator on the first part, not the second
      expect(parts[0]!.combinator).toBe(SelectorCombinator.Descendant);
      expect(parts[0]!.matchers[0]!.name).toBe('div');
      expect(parts[1]!.combinator).toBe(SelectorCombinator.Inner);
      expect(parts[1]!.matchers[0]!.name).toBe('span');
    });

    it('parses child combinators', () => {
      const {rules} = parser.parse('div > span { color: red; }');

      const parts = rules[0]!.selectors[0]!;
      expect(parts).toHaveLength(2);
    });

    it('parses comma-separated selector lists', () => {
      const {rules} = parser.parse('div, span, .box { color: red; }');

      expect(rules[0]!.selectors).toHaveLength(3);
    });

    it('parses complex selectors with multiple combinators', () => {
      const {rules} = parser.parse('.parent > .child + .sibling { color: red; }');

      const parts = rules[0]!.selectors[0]!;
      expect(parts.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('declaration values', () => {
    it('preserves hex color values', () => {
      const {rules} = parser.parse('div { color: #7c3aed; }');

      expect(rules[0]!.declarations[0]!.value).toBe('#7c3aed');
    });

    it('preserves rgb() function values', () => {
      const {rules} = parser.parse('div { color: rgb(124, 58, 237); }');

      expect(rules[0]!.declarations[0]!.value).toBe('rgb(124, 58, 237)');
    });

    it('preserves multi-value shorthand properties', () => {
      const {rules} = parser.parse('div { padding: 1 2 3 4; }');

      expect(rules[0]!.declarations[0]!.value).toBe('1 2 3 4');
    });

    it('trims property names and values', () => {
      const {rules} = parser.parse('div {  color :  red  ; }');

      expect(rules[0]!.declarations[0]!.property).toBe('color');
      expect(rules[0]!.declarations[0]!.value).toBe('red');
    });
  });

  describe('comments', () => {
    it('skips block comments between rules', () => {
      const {rules} = parser.parse(`
        /* This is a comment */
        div { color: red; }
      `);

      expect(rules).toHaveLength(1);
    });

    it('skips comments inside declaration blocks', () => {
      const {rules} = parser.parse(`
        div {
          color: red;
          /* This is a comment */
          font-weight: bold;
        }
      `);

      expect(rules).toHaveLength(1);
      expect(rules[0]!.declarations).toHaveLength(2);
    });

    it('skips comments between rules', () => {
      const {rules} = parser.parse(`
        div { color: red; }
        /* separator */
        span { color: blue; }
      `);

      expect(rules).toHaveLength(2);
    });
  });

  describe('edge cases and malformed input', () => {
    it('returns empty result for empty string', () => {
      expect(parser.parse('')).toEqual({
        rules: [],
        atRules: [],
        keyframeRules: [],
        conditionalRules: [],
      });
    });

    it('returns empty result for whitespace only', () => {
      expect(parser.parse('   \n\t  ')).toEqual({
        rules: [],
        atRules: [],
        keyframeRules: [],
        conditionalRules: [],
      });
    });

    it('returns empty result for comments only', () => {
      expect(parser.parse('/* nothing here */')).toEqual({
        rules: [],
        atRules: [],
        keyframeRules: [],
        conditionalRules: [],
      });
    });

    it('handles missing closing brace gracefully', () => {
      const {rules} = parser.parse('div { color: red;');

      expect(rules).toEqual([]);
    });

    it('handles empty declaration blocks', () => {
      const {rules} = parser.parse('div { }');

      expect(rules).toEqual([]);
    });

    it('handles empty selector text', () => {
      const {rules} = parser.parse('{ color: red; }');

      expect(rules).toEqual([]);
    });

    it('skips declarations missing colons', () => {
      const {rules} = parser.parse('div { color red; font-weight: bold; }');

      expect(rules).toHaveLength(1);
      expect(rules[0]!.declarations).toHaveLength(1);
      expect(rules[0]!.declarations[0]!.property).toBe('font-weight');
    });

    it('handles declarations without values', () => {
      const {rules} = parser.parse('div { color: ; font-weight: bold; }');

      expect(rules).toHaveLength(1);
      expect(rules[0]!.declarations).toHaveLength(1);
      expect(rules[0]!.declarations[0]!.property).toBe('font-weight');
    });

    it('handles consecutive semicolons', () => {
      const {rules} = parser.parse('div { color: red;; font-weight: bold; }');

      expect(rules).toHaveLength(1);
      expect(rules[0]!.declarations).toHaveLength(2);
    });

    it('handles unclosed comment', () => {
      const {rules} = parser.parse('/* unclosed');

      expect(rules).toEqual([]);
    });
  });

  describe('real-world CSS', () => {
    it('parses a typical terminal-dom stylesheet', () => {
      const {rules} = parser.parse(`
        .container {
          display: flex;
          flex-direction: column;
          padding: 1;
          border-style: rounded;
          border-color: #7c3aed;
        }

        .title {
          font-weight: bold;
          color: #7c3aed;
        }

        div > span.highlight {
          background-color: #f5f3ff;
          text-decoration: underline;
        }
      `);

      expect(rules).toHaveLength(3);

      expect(rules[0]!.declarations).toHaveLength(5);
      expect(rules[0]!.declarations[0]).toEqual({property: 'display', value: 'flex'});

      expect(rules[1]!.declarations).toHaveLength(2);
      expect(rules[1]!.declarations[0]).toEqual({property: 'font-weight', value: 'bold'});

      expect(rules[2]!.declarations).toHaveLength(2);
      expect(rules[2]!.selectors).toHaveLength(1);
    });

    it('parses selector lists with whitespace variations', () => {
      const {rules} = parser.parse(`
        h1,
        h2,
        h3 {
          font-weight: bold;
        }
      `);

      expect(rules).toHaveLength(1);
      expect(rules[0]!.selectors).toHaveLength(3);
    });
  });

  describe('at-rules', () => {
    it('parses a @border-style at-rule into atRules', () => {
      const result = parser.parse(`
        @border-style stars {
          top: "★";
          bottom: "★";
          left: "☆";
          right: "☆";
          top-left: "✦";
          top-right: "✦";
          bottom-left: "✦";
          bottom-right: "✦";
        }
      `);

      expect(result.rules).toHaveLength(0);
      expect(result.atRules).toHaveLength(1);
      expect(result.atRules[0]!.identifier).toBe('border-style');
      expect(result.atRules[0]!.prelude).toBe('stars');
      expect(result.atRules[0]!.declarations).toHaveLength(8);
      expect(result.atRules[0]!.declarations[0]).toEqual({property: 'top', value: '"★"'});
    });

    it('parses at-rules alongside normal rules', () => {
      const result = parser.parse(`
        .box { color: red; }

        @border-style custom {
          top: "=";
          bottom: "=";
        }

        .other { padding: 1; }
      `);

      expect(result.rules).toHaveLength(2);
      expect(result.atRules).toHaveLength(1);
      expect(result.atRules[0]!.identifier).toBe('border-style');
      expect(result.atRules[0]!.prelude).toBe('custom');
    });

    it('parses at-rules with no prelude', () => {
      const result = parser.parse(`
        @font-face {
          font-family: "MyFont";
        }
      `);

      expect(result.atRules).toHaveLength(1);
      expect(result.atRules[0]!.identifier).toBe('font-face');
      expect(result.atRules[0]!.prelude).toBe('');
    });

    it('parses at-rules with empty body', () => {
      const result = parser.parse(`
        @border-style empty {}
      `);

      expect(result.atRules).toHaveLength(1);
      expect(result.atRules[0]!.identifier).toBe('border-style');
      expect(result.atRules[0]!.prelude).toBe('empty');
      expect(result.atRules[0]!.declarations).toHaveLength(0);
    });
  });

  describe('conditional at-rules (@media/@container)', () => {
    it('parses @media with nested rules into conditionalRules', () => {
      const result = parser.parse(`
        @media (min-width: 80) {
          .sidebar { display: none; }
          .main { flex-grow: 1; }
        }
      `);

      expect(result.rules).toHaveLength(0);
      expect(result.atRules).toHaveLength(0);
      expect(result.conditionalRules).toHaveLength(1);

      const rule = result.conditionalRules[0]!;
      expect(rule.identifier).toBe('media');
      expect(rule.prelude).toBe('(min-width: 80)');
      expect(rule.rules).toHaveLength(2);
      expect(rule.rules[0]!.declarations).toEqual([{property: 'display', value: 'none'}]);
      expect(rule.rules[1]!.declarations).toEqual([{property: 'flex-grow', value: '1'}]);
    });

    it('parses @container with nested rules', () => {
      const result = parser.parse(`
        @container (min-width: 40) {
          .panel-content { display: flex; }
        }
      `);

      expect(result.conditionalRules).toHaveLength(1);

      const rule = result.conditionalRules[0]!;
      expect(rule.identifier).toBe('container');
      expect(rule.prelude).toBe('(min-width: 40)');
      expect(rule.rules).toHaveLength(1);
    });

    it('parses named @container rules', () => {
      const result = parser.parse(`
        @container sidebar (min-width: 30) {
          .item { color: red; }
        }
      `);

      const rule = result.conditionalRules[0]!;
      expect(rule.identifier).toBe('container');
      expect(rule.prelude).toBe('sidebar (min-width: 30)');
    });

    it('parses multiple @media rules', () => {
      const result = parser.parse(`
        @media (min-width: 80) {
          .wide { display: flex; }
        }
        @media (max-width: 79) {
          .narrow { display: none; }
        }
      `);

      expect(result.conditionalRules).toHaveLength(2);
      expect(result.conditionalRules[0]!.prelude).toBe('(min-width: 80)');
      expect(result.conditionalRules[1]!.prelude).toBe('(max-width: 79)');
    });

    it('parses nested @container inside @media', () => {
      const result = parser.parse(`
        @media (min-width: 80) {
          @container (min-width: 40) {
            .item { color: red; }
          }
        }
      `);

      expect(result.conditionalRules).toHaveLength(1);

      const media = result.conditionalRules[0]!;
      expect(media.identifier).toBe('media');
      expect(media.rules).toHaveLength(0);
      expect(media.conditionalRules).toHaveLength(1);

      const container = media.conditionalRules[0]!;
      expect(container.identifier).toBe('container');
      expect(container.prelude).toBe('(min-width: 40)');
      expect(container.rules).toHaveLength(1);
      expect(container.rules[0]!.declarations).toEqual([{property: 'color', value: 'red'}]);
    });

    it('parses nested @media inside @container', () => {
      const result = parser.parse(`
        @container (min-width: 40) {
          @media (min-width: 80) {
            .item { font-weight: bold; }
          }
        }
      `);

      const container = result.conditionalRules[0]!;
      expect(container.identifier).toBe('container');
      expect(container.conditionalRules).toHaveLength(1);

      const media = container.conditionalRules[0]!;
      expect(media.identifier).toBe('media');
      expect(media.rules).toHaveLength(1);
    });

    it('mixes conditional at-rules with regular rules', () => {
      const result = parser.parse(`
        .always { color: red; }

        @media (min-width: 80) {
          .wide { display: flex; }
        }

        .also-always { padding: 1; }
      `);

      expect(result.rules).toHaveLength(2);
      expect(result.conditionalRules).toHaveLength(1);
    });

    it('mixes conditional at-rules with flat at-rules and keyframes', () => {
      const result = parser.parse(`
        @border-style custom { top: "*"; }

        @media (min-width: 80) {
          .wide { display: flex; }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `);

      expect(result.atRules).toHaveLength(1);
      expect(result.conditionalRules).toHaveLength(1);
      expect(result.keyframeRules).toHaveLength(1);
    });

    it('handles @media with boolean combinators in prelude', () => {
      const result = parser.parse(`
        @media (min-width: 80) and (max-height: 40) {
          .compact { padding: 0; }
        }
      `);

      const rule = result.conditionalRules[0]!;
      expect(rule.prelude).toBe('(min-width: 80) and (max-height: 40)');
      expect(rule.rules).toHaveLength(1);
    });

    it('handles @media with rules and nested conditionals mixed', () => {
      const result = parser.parse(`
        @media (min-width: 80) {
          .sidebar { width: 30; }
          @container panel (min-width: 40) {
            .panel-content { gap: 2; }
          }
          .main { flex-grow: 1; }
        }
      `);

      const media = result.conditionalRules[0]!;
      expect(media.rules).toHaveLength(2);
      expect(media.conditionalRules).toHaveLength(1);
    });

    it('handles three levels of nesting', () => {
      const result = parser.parse(`
        @media (min-width: 120) {
          @container sidebar (min-width: 30) {
            @container card (min-width: 20) {
              .deep { color: blue; }
            }
          }
        }
      `);

      const media = result.conditionalRules[0]!;
      const sidebar = media.conditionalRules[0]!;
      const card = sidebar.conditionalRules[0]!;
      expect(card.identifier).toBe('container');
      expect(card.rules).toHaveLength(1);
      expect(card.rules[0]!.declarations).toEqual([{property: 'color', value: 'blue'}]);
    });

    it('handles empty conditional at-rule body', () => {
      const result = parser.parse(`
        @media (min-width: 80) {}
      `);

      expect(result.conditionalRules).toHaveLength(1);
      expect(result.conditionalRules[0]!.rules).toHaveLength(0);
      expect(result.conditionalRules[0]!.conditionalRules).toHaveLength(0);
    });

    it('parses minified @media without space before paren', () => {
      const result = parser.parse(`@media(min-width:70){.wide{flex-direction:row}}`);

      expect(result.conditionalRules).toHaveLength(1);

      const rule = result.conditionalRules[0]!;
      expect(rule.identifier).toBe('media');
      expect(rule.prelude).toBe('(min-width:70)');
      expect(rule.rules).toHaveLength(1);
      expect(rule.rules[0]!.declarations).toEqual([{property: 'flex-direction', value: 'row'}]);
    });

    it('parses minified @container without space before paren', () => {
      const result = parser.parse(`@container(min-width:40){.item{color:red}}`);

      expect(result.conditionalRules).toHaveLength(1);

      const rule = result.conditionalRules[0]!;
      expect(rule.identifier).toBe('container');
      expect(rule.prelude).toBe('(min-width:40)');
      expect(rule.rules).toHaveLength(1);
    });

    it('parses minified named @container without space', () => {
      const result = parser.parse(`@container sidebar(min-width:30){.item{color:red}}`);

      expect(result.conditionalRules).toHaveLength(1);

      const rule = result.conditionalRules[0]!;
      expect(rule.identifier).toBe('container');
      expect(rule.prelude).toBe('sidebar(min-width:30)');
    });

    it('parses fully minified CSS with multiple @media blocks', () => {
      const result = parser.parse(
        `.base{color:red}@media(min-width:80){.wide{display:flex}}@media(max-width:79){.narrow{display:none}}`,
      );

      expect(result.rules).toHaveLength(1);
      expect(result.conditionalRules).toHaveLength(2);
      expect(result.conditionalRules[0]!.prelude).toBe('(min-width:80)');
      expect(result.conditionalRules[1]!.prelude).toBe('(max-width:79)');
    });
  });

  describe('@keyframes', () => {
    it('parses a basic @keyframes rule with from/to', () => {
      const result = parser.parse(`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `);

      expect(result.keyframeRules).toHaveLength(1);
      expect(result.keyframeRules[0]!.name).toBe('fadeIn');
      expect(result.keyframeRules[0]!.blocks).toHaveLength(2);
      expect(result.keyframeRules[0]!.blocks[0]!.offsets).toEqual([0]);
      expect(result.keyframeRules[0]!.blocks[1]!.offsets).toEqual([100]);
    });

    it('parses multiple @keyframes rules', () => {
      const result = parser.parse(`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes pulse {
          0% { color: red; }
          50% { color: blue; }
          100% { color: red; }
        }
      `);

      expect(result.keyframeRules).toHaveLength(2);
      expect(result.keyframeRules[0]!.name).toBe('fadeIn');
      expect(result.keyframeRules[1]!.name).toBe('pulse');
      expect(result.keyframeRules[1]!.blocks).toHaveLength(3);
    });

    it('does not treat @keyframes as a regular at-rule', () => {
      const result = parser.parse(`
        @keyframes slide { from { top: 0; } to { top: 10; } }
      `);

      expect(result.atRules).toHaveLength(0);
      expect(result.keyframeRules).toHaveLength(1);
    });

    it('coexists with regular rules and at-rules', () => {
      const result = parser.parse(`
        .box { color: red; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @border-style custom { top: "*"; }
      `);

      expect(result.rules).toHaveLength(1);
      expect(result.keyframeRules).toHaveLength(1);
      expect(result.atRules).toHaveLength(1);
    });
  });
});
