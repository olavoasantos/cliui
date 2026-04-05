import {describe, it, expect} from 'vitest';

import {parseCondition} from '../parseCondition';

describe('parseCondition', () => {
  describe('single feature queries', () => {
    it('parses a min-width feature', () => {
      const result = parseCondition('(min-width: 80)');

      expect(result).toEqual({type: 'feature', name: 'min-width', value: '80'});
    });

    it('parses a max-width feature', () => {
      const result = parseCondition('(max-width: 119)');

      expect(result).toEqual({type: 'feature', name: 'max-width', value: '119'});
    });

    it('parses a height feature', () => {
      const result = parseCondition('(height: 24)');

      expect(result).toEqual({type: 'feature', name: 'height', value: '24'});
    });

    it('parses a prefers-color-scheme feature', () => {
      const result = parseCondition('(prefers-color-scheme: dark)');

      expect(result).toEqual({type: 'feature', name: 'prefers-color-scheme', value: 'dark'});
    });

    it('parses an orientation feature', () => {
      const result = parseCondition('(orientation: landscape)');

      expect(result).toEqual({type: 'feature', name: 'orientation', value: 'landscape'});
    });

    it('normalizes feature names to lowercase', () => {
      const result = parseCondition('(MIN-WIDTH: 80)');

      expect(result).toEqual({type: 'feature', name: 'min-width', value: '80'});
    });
  });

  describe('not combinator', () => {
    it('parses not prefix', () => {
      const result = parseCondition('not (min-width: 80)');

      expect(result).toEqual({
        type: 'not',
        condition: {type: 'feature', name: 'min-width', value: '80'},
      });
    });

    it('parses not without space before paren', () => {
      const result = parseCondition('not(min-width: 80)');

      expect(result).toEqual({
        type: 'not',
        condition: {type: 'feature', name: 'min-width', value: '80'},
      });
    });
  });

  describe('and combinator', () => {
    it('parses two conditions with and', () => {
      const result = parseCondition('(min-width: 80) and (max-height: 40)');

      expect(result).toEqual({
        type: 'and',
        conditions: [
          {type: 'feature', name: 'min-width', value: '80'},
          {type: 'feature', name: 'max-height', value: '40'},
        ],
      });
    });

    it('parses three conditions with and', () => {
      const result = parseCondition('(min-width: 80) and (max-width: 200) and (min-height: 24)');

      expect(result).toEqual({
        type: 'and',
        conditions: [
          {type: 'feature', name: 'min-width', value: '80'},
          {type: 'feature', name: 'max-width', value: '200'},
          {type: 'feature', name: 'min-height', value: '24'},
        ],
      });
    });
  });

  describe('or combinator (comma-separated)', () => {
    it('parses comma-separated alternatives', () => {
      const result = parseCondition('(min-width: 80), (orientation: portrait)');

      expect(result).toEqual({
        type: 'or',
        conditions: [
          {type: 'feature', name: 'min-width', value: '80'},
          {type: 'feature', name: 'orientation', value: 'portrait'},
        ],
      });
    });

    it('parses three comma-separated alternatives', () => {
      const result = parseCondition('(width: 80), (width: 120), (width: 160)');

      expect(result).toEqual({
        type: 'or',
        conditions: [
          {type: 'feature', name: 'width', value: '80'},
          {type: 'feature', name: 'width', value: '120'},
          {type: 'feature', name: 'width', value: '160'},
        ],
      });
    });
  });

  describe('explicit or keyword', () => {
    it('parses explicit or between conditions', () => {
      const result = parseCondition('(min-width: 80) or (orientation: portrait)');

      expect(result).toEqual({
        type: 'or',
        conditions: [
          {type: 'feature', name: 'min-width', value: '80'},
          {type: 'feature', name: 'orientation', value: 'portrait'},
        ],
      });
    });
  });

  describe('edge cases', () => {
    it('returns null for empty string', () => {
      expect(parseCondition('')).toBeNull();
    });

    it('returns null for whitespace only', () => {
      expect(parseCondition('   ')).toBeNull();
    });

    it('returns null for invalid expression without parens', () => {
      expect(parseCondition('min-width: 80')).toBeNull();
    });

    it('returns null for missing value', () => {
      expect(parseCondition('(min-width:)')).toBeNull();
    });

    it('returns null for missing colon', () => {
      expect(parseCondition('(min-width 80)')).toBeNull();
    });

    it('handles extra whitespace', () => {
      const result = parseCondition('  ( min-width :  80 )  ');

      expect(result).toEqual({type: 'feature', name: 'min-width', value: '80'});
    });

    it('parses minified condition without spaces', () => {
      const result = parseCondition('(min-width:70)');

      expect(result).toEqual({type: 'feature', name: 'min-width', value: '70'});
    });

    it('parses minified and combinator', () => {
      const result = parseCondition('(min-width:80) and (max-height:40)');

      expect(result).toEqual({
        type: 'and',
        conditions: [
          {type: 'feature', name: 'min-width', value: '80'},
          {type: 'feature', name: 'max-height', value: '40'},
        ],
      });
    });
  });
});
