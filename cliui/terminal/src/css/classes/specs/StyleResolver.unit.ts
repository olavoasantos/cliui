import {describe, it, expect} from 'vitest';

import {StyleResolver} from '../StyleResolver';
import {CSSStyleDeclaration} from '@cliui/dom';

import type {MatchedDeclaration} from '../../types/MatchedDeclaration';
import type {ComputedStyle} from '../../types';

function makeMatched(
  property: string,
  value: string,
  specificity: [number, number, number] = [0, 0, 0],
  order = 0,
): MatchedDeclaration {
  return {declaration: {property, value}, specificity, order};
}

describe('StyleResolver', () => {
  const resolver = new StyleResolver();

  describe('basic cascade', () => {
    it('applies a single matched declaration', () => {
      const matched = [makeMatched('color', 'red')];

      const style = resolver.resolve(matched, null, null);

      expect(style.get('color')).toBe('red');
    });

    it('applies multiple matched declarations', () => {
      const matched = [
        makeMatched('color', 'red', [0, 0, 1], 0),
        makeMatched('font-weight', 'bold', [0, 0, 1], 1),
      ];

      const style = resolver.resolve(matched, null, null);

      expect(style.get('color')).toBe('red');
      expect(style.get('font-weight')).toBe('bold');
    });

    it('later declarations with same property overwrite earlier ones', () => {
      const matched = [
        makeMatched('color', 'blue', [0, 0, 1], 0),
        makeMatched('color', 'red', [0, 1, 0], 1),
      ];

      const style = resolver.resolve(matched, null, null);

      expect(style.get('color')).toBe('red');
    });
  });

  describe('inline style priority', () => {
    it('inline styles override matched declarations', () => {
      const matched = [makeMatched('color', 'blue', [1, 0, 0], 0)];
      const inline = new CSSStyleDeclaration();
      inline.setProperty('color', 'red');

      const style = resolver.resolve(matched, inline, null);

      expect(style.get('color')).toBe('red');
    });

    it('inline styles merge with matched declarations', () => {
      const matched = [makeMatched('font-weight', 'bold')];
      const inline = new CSSStyleDeclaration();
      inline.setProperty('color', 'red');

      const style = resolver.resolve(matched, inline, null);

      expect(style.get('color')).toBe('red');
      expect(style.get('font-weight')).toBe('bold');
    });
  });

  describe('specificity ordering', () => {
    it('higher specificity declarations win', () => {
      // Matched declarations arrive pre-sorted (ascending specificity)
      const matched = [
        makeMatched('color', 'blue', [0, 0, 1], 0), // element
        makeMatched('color', 'green', [0, 1, 0], 1), // class
        makeMatched('color', 'red', [1, 0, 0], 2), // id
      ];

      const style = resolver.resolve(matched, null, null);

      expect(style.get('color')).toBe('red');
    });

    it('source order wins at equal specificity', () => {
      const matched = [
        makeMatched('color', 'blue', [0, 1, 0], 0),
        makeMatched('color', 'red', [0, 1, 0], 1),
      ];

      const style = resolver.resolve(matched, null, null);

      expect(style.get('color')).toBe('red');
    });
  });

  describe('inheritance', () => {
    it('inherits color from parent', () => {
      const parentStyle: ComputedStyle = new Map([['color', '#7c3aed']]);

      const style = resolver.resolve([], null, parentStyle);

      expect(style.get('color')).toBe('#7c3aed');
    });

    it('inherits font-weight from parent', () => {
      const parentStyle: ComputedStyle = new Map([['font-weight', 'bold']]);

      const style = resolver.resolve([], null, parentStyle);

      expect(style.get('font-weight')).toBe('bold');
    });

    it('inherits all inheritable properties', () => {
      const parentStyle: ComputedStyle = new Map([
        ['color', 'red'],
        ['font-weight', 'bold'],
        ['font-style', 'italic'],
        ['text-decoration', 'underline'],
        ['text-align', 'center'],
        ['white-space', 'pre'],
      ]);

      const style = resolver.resolve([], null, parentStyle);

      expect(style.get('color')).toBe('red');
      expect(style.get('font-weight')).toBe('bold');
      expect(style.get('font-style')).toBe('italic');
      expect(style.get('text-decoration')).toBe('underline');
      expect(style.get('text-align')).toBe('center');
      expect(style.get('white-space')).toBe('pre');
    });

    it('does not inherit non-inheritable properties', () => {
      const parentStyle: ComputedStyle = new Map([
        ['padding-top', '2'],
        ['display', 'flex'],
        ['border-style', 'rounded'],
        ['width', '50'],
      ]);

      const style = resolver.resolve([], null, parentStyle);

      expect(style.has('padding-top')).toBe(false);
      expect(style.has('display')).toBe(false);
      expect(style.has('border-style')).toBe(false);
      expect(style.has('width')).toBe(false);
    });

    it('explicit values override inheritance', () => {
      const parentStyle: ComputedStyle = new Map([['color', 'blue']]);
      const matched = [makeMatched('color', 'red')];

      const style = resolver.resolve(matched, null, parentStyle);

      expect(style.get('color')).toBe('red');
    });

    it('uses initial values when no parent exists', () => {
      const style = resolver.resolve([], null, null);

      expect(style.get('font-weight')).toBe('normal');
      expect(style.get('font-style')).toBe('normal');
      expect(style.get('text-decoration')).toBe('none');
      expect(style.get('text-align')).toBe('left');
      expect(style.get('white-space')).toBe('normal');
    });

    it('resolves inherit keyword to parent value', () => {
      const parentStyle: ComputedStyle = new Map([['color', '#7c3aed']]);
      const matched = [makeMatched('color', 'inherit')];

      const style = resolver.resolve(matched, null, parentStyle);

      expect(style.get('color')).toBe('#7c3aed');
    });

    it('multi-level inheritance chain works via parent computed style', () => {
      // Grandparent sets color
      const grandparentStyle: ComputedStyle = new Map([['color', 'red']]);
      // Parent inherits from grandparent
      const parentStyle = resolver.resolve([], null, grandparentStyle);
      expect(parentStyle.get('color')).toBe('red');
      // Child inherits from parent
      const childStyle = resolver.resolve([], null, parentStyle);
      expect(childStyle.get('color')).toBe('red');
    });
  });

  describe('shorthand expansion', () => {
    it('expands padding shorthand', () => {
      const matched = [makeMatched('padding', '1 2')];

      const style = resolver.resolve(matched, null, null);

      expect(style.get('padding-top')).toBe('1');
      expect(style.get('padding-right')).toBe('2');
      expect(style.get('padding-bottom')).toBe('1');
      expect(style.get('padding-left')).toBe('2');
    });

    it('expands margin shorthand with four values', () => {
      const matched = [makeMatched('margin', '1 2 3 4')];

      const style = resolver.resolve(matched, null, null);

      expect(style.get('margin-top')).toBe('1');
      expect(style.get('margin-right')).toBe('2');
      expect(style.get('margin-bottom')).toBe('3');
      expect(style.get('margin-left')).toBe('4');
    });

    it('expands gap shorthand', () => {
      const matched = [makeMatched('gap', '2 4')];

      const style = resolver.resolve(matched, null, null);

      expect(style.get('row-gap')).toBe('2');
      expect(style.get('column-gap')).toBe('4');
    });

    it('expands flex shorthand', () => {
      const matched = [makeMatched('flex', '1')];

      const style = resolver.resolve(matched, null, null);

      expect(style.get('flex-grow')).toBe('1');
      expect(style.get('flex-shrink')).toBe('1');
      expect(style.get('flex-basis')).toBe('0');
    });

    it('expands shorthand from inline styles', () => {
      const inline = new CSSStyleDeclaration();
      inline.setProperty('padding', '1 2 3 4');

      const style = resolver.resolve([], inline, null);

      expect(style.get('padding-top')).toBe('1');
      expect(style.get('padding-right')).toBe('2');
      expect(style.get('padding-bottom')).toBe('3');
      expect(style.get('padding-left')).toBe('4');
    });
  });

  describe('percentage deferral', () => {
    it('preserves percentage values as-is', () => {
      const matched = [makeMatched('width', '50%')];

      const style = resolver.resolve(matched, null, null);

      expect(style.get('width')).toBe('50%');
    });

    it('preserves auto values as-is', () => {
      const matched = [makeMatched('width', 'auto')];

      const style = resolver.resolve(matched, null, null);

      expect(style.get('width')).toBe('auto');
    });
  });

  describe('empty inputs', () => {
    it('returns style with only initial inheritable values when no inputs', () => {
      const style = resolver.resolve([], null, null);

      // Should have initial values for inheritable properties
      expect(style.get('font-weight')).toBe('normal');
      // Should not have non-inheritable properties
      expect(style.has('display')).toBe(false);
    });
  });

  describe('custom properties', () => {
    it('passes through --* declarations from stylesheets', () => {
      const style = resolver.resolve([makeMatched('--brand', '#7c3aed')], null, null);

      expect(style.get('--brand')).toBe('#7c3aed');
    });

    it('passes through --* declarations from inline styles', () => {
      const inline = new CSSStyleDeclaration();
      inline.setProperty('--gap', '2');

      const style = resolver.resolve([], inline, null);

      expect(style.get('--gap')).toBe('2');
    });

    it('inherits custom properties from the parent style', () => {
      const parent: ComputedStyle = new Map([['--theme', 'dark']]);
      const style = resolver.resolve([], null, parent);

      expect(style.get('--theme')).toBe('dark');
    });

    it('overrides inherited custom properties with local declarations', () => {
      const parent: ComputedStyle = new Map([['--color', 'red']]);
      const style = resolver.resolve([makeMatched('--color', 'blue')], null, parent);

      expect(style.get('--color')).toBe('blue');
    });

    it('resolves var() references in property values', () => {
      const style = resolver.resolve(
        [makeMatched('--fg', '#fff'), makeMatched('color', 'var(--fg)')],
        null,
        null,
      );

      expect(style.get('color')).toBe('#fff');
    });

    it('resolves var() with fallback when property is missing', () => {
      const style = resolver.resolve([makeMatched('color', 'var(--missing, red)')], null, null);

      expect(style.get('color')).toBe('red');
    });

    it('resolves var() referencing an inherited custom property', () => {
      const parent: ComputedStyle = new Map([['--accent', '#7c3aed']]);
      const style = resolver.resolve([makeMatched('border-color', 'var(--accent)')], null, parent);

      expect(style.get('border-color')).toBe('#7c3aed');
    });

    it('resolves nested var() in fallback', () => {
      const style = resolver.resolve(
        [
          makeMatched('--fallback', 'green'),
          makeMatched('color', 'var(--primary, var(--fallback))'),
        ],
        null,
        null,
      );

      expect(style.get('color')).toBe('green');
    });

    it('inherits custom properties through multiple levels', () => {
      const grandparent: ComputedStyle = new Map([['--root-color', 'navy']]);
      const parent = resolver.resolve([], null, grandparent);
      const child = resolver.resolve([makeMatched('color', 'var(--root-color)')], null, parent);

      expect(child.get('color')).toBe('navy');
    });
  });
});
