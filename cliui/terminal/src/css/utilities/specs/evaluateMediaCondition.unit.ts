import {describe, it, expect} from 'vitest';

import {evaluateMediaCondition} from '../evaluateMediaCondition';

import type {MediaCondition} from '../../types/MediaCondition';
import type {MediaValues} from '../../types/MediaValues';

describe('evaluateMediaCondition', () => {
  const defaultValues: MediaValues = {
    width: 120,
    height: 40,
    'prefers-color-scheme': 'dark',
    'prefers-reduced-motion': 'no-preference',
    orientation: 'landscape',
  };

  describe('width features', () => {
    it('matches min-width when width >= value', () => {
      const condition: MediaCondition = {type: 'feature', name: 'min-width', value: '80'};

      expect(evaluateMediaCondition(condition, defaultValues)).toBe(true);
    });

    it('does not match min-width when width < value', () => {
      const condition: MediaCondition = {type: 'feature', name: 'min-width', value: '200'};

      expect(evaluateMediaCondition(condition, defaultValues)).toBe(false);
    });

    it('matches min-width when width equals value exactly', () => {
      const condition: MediaCondition = {type: 'feature', name: 'min-width', value: '120'};

      expect(evaluateMediaCondition(condition, defaultValues)).toBe(true);
    });

    it('matches max-width when width <= value', () => {
      const condition: MediaCondition = {type: 'feature', name: 'max-width', value: '200'};

      expect(evaluateMediaCondition(condition, defaultValues)).toBe(true);
    });

    it('does not match max-width when width > value', () => {
      const condition: MediaCondition = {type: 'feature', name: 'max-width', value: '80'};

      expect(evaluateMediaCondition(condition, defaultValues)).toBe(false);
    });

    it('matches exact width', () => {
      const condition: MediaCondition = {type: 'feature', name: 'width', value: '120'};

      expect(evaluateMediaCondition(condition, defaultValues)).toBe(true);
    });

    it('does not match different exact width', () => {
      const condition: MediaCondition = {type: 'feature', name: 'width', value: '80'};

      expect(evaluateMediaCondition(condition, defaultValues)).toBe(false);
    });
  });

  describe('height features', () => {
    it('matches min-height', () => {
      const condition: MediaCondition = {type: 'feature', name: 'min-height', value: '24'};

      expect(evaluateMediaCondition(condition, defaultValues)).toBe(true);
    });

    it('does not match min-height when too small', () => {
      const condition: MediaCondition = {type: 'feature', name: 'min-height', value: '50'};

      expect(evaluateMediaCondition(condition, defaultValues)).toBe(false);
    });

    it('matches max-height', () => {
      const condition: MediaCondition = {type: 'feature', name: 'max-height', value: '50'};

      expect(evaluateMediaCondition(condition, defaultValues)).toBe(true);
    });

    it('matches exact height', () => {
      const condition: MediaCondition = {type: 'feature', name: 'height', value: '40'};

      expect(evaluateMediaCondition(condition, defaultValues)).toBe(true);
    });
  });

  describe('orientation', () => {
    it('matches landscape when width > height', () => {
      const condition: MediaCondition = {type: 'feature', name: 'orientation', value: 'landscape'};

      expect(evaluateMediaCondition(condition, defaultValues)).toBe(true);
    });

    it('does not match portrait when width > height', () => {
      const condition: MediaCondition = {type: 'feature', name: 'orientation', value: 'portrait'};

      expect(evaluateMediaCondition(condition, defaultValues)).toBe(false);
    });

    it('matches portrait when height > width', () => {
      const condition: MediaCondition = {type: 'feature', name: 'orientation', value: 'portrait'};
      const values: MediaValues = {...defaultValues, width: 30, height: 80, orientation: 'portrait'};

      expect(evaluateMediaCondition(condition, values)).toBe(true);
    });
  });

  describe('preference features', () => {
    it('matches prefers-color-scheme: dark', () => {
      const condition: MediaCondition = {type: 'feature', name: 'prefers-color-scheme', value: 'dark'};

      expect(evaluateMediaCondition(condition, defaultValues)).toBe(true);
    });

    it('does not match prefers-color-scheme: light when dark', () => {
      const condition: MediaCondition = {type: 'feature', name: 'prefers-color-scheme', value: 'light'};

      expect(evaluateMediaCondition(condition, defaultValues)).toBe(false);
    });

    it('matches prefers-reduced-motion: no-preference', () => {
      const condition: MediaCondition = {type: 'feature', name: 'prefers-reduced-motion', value: 'no-preference'};

      expect(evaluateMediaCondition(condition, defaultValues)).toBe(true);
    });

    it('matches prefers-reduced-motion: reduce when set', () => {
      const condition: MediaCondition = {type: 'feature', name: 'prefers-reduced-motion', value: 'reduce'};
      const values: MediaValues = {...defaultValues, 'prefers-reduced-motion': 'reduce'};

      expect(evaluateMediaCondition(condition, values)).toBe(true);
    });
  });

  describe('boolean combinators', () => {
    it('evaluates and — both true', () => {
      const condition: MediaCondition = {
        type: 'and',
        conditions: [
          {type: 'feature', name: 'min-width', value: '80'},
          {type: 'feature', name: 'max-height', value: '50'},
        ],
      };

      expect(evaluateMediaCondition(condition, defaultValues)).toBe(true);
    });

    it('evaluates and — one false', () => {
      const condition: MediaCondition = {
        type: 'and',
        conditions: [
          {type: 'feature', name: 'min-width', value: '80'},
          {type: 'feature', name: 'max-height', value: '30'},
        ],
      };

      expect(evaluateMediaCondition(condition, defaultValues)).toBe(false);
    });

    it('evaluates or — one true', () => {
      const condition: MediaCondition = {
        type: 'or',
        conditions: [
          {type: 'feature', name: 'min-width', value: '200'},
          {type: 'feature', name: 'orientation', value: 'landscape'},
        ],
      };

      expect(evaluateMediaCondition(condition, defaultValues)).toBe(true);
    });

    it('evaluates or — none true', () => {
      const condition: MediaCondition = {
        type: 'or',
        conditions: [
          {type: 'feature', name: 'min-width', value: '200'},
          {type: 'feature', name: 'orientation', value: 'portrait'},
        ],
      };

      expect(evaluateMediaCondition(condition, defaultValues)).toBe(false);
    });

    it('evaluates not', () => {
      const condition: MediaCondition = {
        type: 'not',
        condition: {type: 'feature', name: 'min-width', value: '200'},
      };

      expect(evaluateMediaCondition(condition, defaultValues)).toBe(true);
    });

    it('evaluates not — negating a true condition', () => {
      const condition: MediaCondition = {
        type: 'not',
        condition: {type: 'feature', name: 'min-width', value: '80'},
      };

      expect(evaluateMediaCondition(condition, defaultValues)).toBe(false);
    });
  });

  describe('unsupported features', () => {
    it('returns false for unknown features', () => {
      const condition: MediaCondition = {type: 'feature', name: 'color', value: '8'};

      expect(evaluateMediaCondition(condition, defaultValues)).toBe(false);
    });
  });
});
