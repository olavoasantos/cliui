import {describe, expect, it} from 'vitest';

import {expandShorthand} from '../expandShorthand';

describe('expandShorthand', () => {
  describe('padding', () => {
    it('expands 1 value to all four sides', () => {
      expect(expandShorthand('padding', '1rem')).toEqual({
        'padding-top': '1rem',
        'padding-right': '1rem',
        'padding-bottom': '1rem',
        'padding-left': '1rem',
      });
    });

    it('expands 2 values to vertical and horizontal', () => {
      expect(expandShorthand('padding', '1rem 2rem')).toEqual({
        'padding-top': '1rem',
        'padding-right': '2rem',
        'padding-bottom': '1rem',
        'padding-left': '2rem',
      });
    });

    it('expands 3 values to top, horizontal, and bottom', () => {
      expect(expandShorthand('padding', '1rem 2rem 3rem')).toEqual({
        'padding-top': '1rem',
        'padding-right': '2rem',
        'padding-bottom': '3rem',
        'padding-left': '2rem',
      });
    });

    it('expands 4 values to top, right, bottom, left', () => {
      expect(expandShorthand('padding', '1rem 2rem 3rem 4rem')).toEqual({
        'padding-top': '1rem',
        'padding-right': '2rem',
        'padding-bottom': '3rem',
        'padding-left': '4rem',
      });
    });
  });

  describe('margin', () => {
    it('expands 1 value to all four sides', () => {
      expect(expandShorthand('margin', '1rem')).toEqual({
        'margin-top': '1rem',
        'margin-right': '1rem',
        'margin-bottom': '1rem',
        'margin-left': '1rem',
      });
    });

    it('expands 2 values to vertical and horizontal', () => {
      expect(expandShorthand('margin', '1rem 2rem')).toEqual({
        'margin-top': '1rem',
        'margin-right': '2rem',
        'margin-bottom': '1rem',
        'margin-left': '2rem',
      });
    });

    it('expands 3 values to top, horizontal, and bottom', () => {
      expect(expandShorthand('margin', '1rem 2rem 3rem')).toEqual({
        'margin-top': '1rem',
        'margin-right': '2rem',
        'margin-bottom': '3rem',
        'margin-left': '2rem',
      });
    });

    it('expands 4 values to top, right, bottom, left', () => {
      expect(expandShorthand('margin', '1rem 2rem 3rem 4rem')).toEqual({
        'margin-top': '1rem',
        'margin-right': '2rem',
        'margin-bottom': '3rem',
        'margin-left': '4rem',
      });
    });
  });

  describe('gap', () => {
    it('expands 1 value to row-gap and column-gap', () => {
      expect(expandShorthand('gap', '1rem')).toEqual({
        'row-gap': '1rem',
        'column-gap': '1rem',
      });
    });

    it('expands 2 values to row-gap and column-gap', () => {
      expect(expandShorthand('gap', '1rem 2rem')).toEqual({
        'row-gap': '1rem',
        'column-gap': '2rem',
      });
    });
  });

  describe('flex', () => {
    it('expands none to grow 0, shrink 0, basis auto', () => {
      expect(expandShorthand('flex', 'none')).toEqual({
        'flex-grow': '0',
        'flex-shrink': '0',
        'flex-basis': 'auto',
      });
    });

    it('expands auto to grow 1, shrink 1, basis auto', () => {
      expect(expandShorthand('flex', 'auto')).toEqual({
        'flex-grow': '1',
        'flex-shrink': '1',
        'flex-basis': 'auto',
      });
    });

    it('expands a single numeric value to grow, shrink 1, basis 0', () => {
      expect(expandShorthand('flex', '2')).toEqual({
        'flex-grow': '2',
        'flex-shrink': '1',
        'flex-basis': '0',
      });
    });

    it('expands 2 values to grow and shrink with basis 0', () => {
      expect(expandShorthand('flex', '2 3')).toEqual({
        'flex-grow': '2',
        'flex-shrink': '3',
        'flex-basis': '0',
      });
    });

    it('expands 3 values to grow, shrink, and basis', () => {
      expect(expandShorthand('flex', '2 3 auto')).toEqual({
        'flex-grow': '2',
        'flex-shrink': '3',
        'flex-basis': 'auto',
      });
    });

    it('returns null for 4 or more values', () => {
      expect(expandShorthand('flex', '1 2 3 4')).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('returns null for unrecognized properties', () => {
      expect(expandShorthand('border', '1px solid')).toBeNull();
    });

    it('handles values with extra whitespace', () => {
      expect(expandShorthand('gap', '  1rem   2rem  ')).toEqual({
        'row-gap': '1rem',
        'column-gap': '2rem',
      });
    });
  });

  describe('container shorthand', () => {
    it('expands container with name and type', () => {
      expect(expandShorthand('container', 'sidebar / inline-size')).toEqual({
        'container-name': 'sidebar',
        'container-type': 'inline-size',
      });
    });

    it('expands container with type only', () => {
      expect(expandShorthand('container', 'inline-size')).toEqual({
        'container-name': 'none',
        'container-type': 'inline-size',
      });
    });

    it('expands container with size type', () => {
      expect(expandShorthand('container', 'panel / size')).toEqual({
        'container-name': 'panel',
        'container-type': 'size',
      });
    });

    it('handles whitespace around slash', () => {
      expect(expandShorthand('container', '  sidebar  /  inline-size  ')).toEqual({
        'container-name': 'sidebar',
        'container-type': 'inline-size',
      });
    });
  });
});
