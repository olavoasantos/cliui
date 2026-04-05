import {describe, it, expect} from 'vitest';

import {evaluateContainerCondition} from '../evaluateContainerCondition';

import type {MediaCondition} from '../../types/MediaCondition';
import type {ContainerValues} from '../../types/ContainerValues';

describe('evaluateContainerCondition', () => {
  const defaultValues: ContainerValues = {
    width: 60,
    height: 20,
  };

  describe('width features', () => {
    it('matches min-width when width >= value', () => {
      const condition: MediaCondition = {type: 'feature', name: 'min-width', value: '40'};

      expect(evaluateContainerCondition(condition, defaultValues)).toBe(true);
    });

    it('does not match min-width when width < value', () => {
      const condition: MediaCondition = {type: 'feature', name: 'min-width', value: '80'};

      expect(evaluateContainerCondition(condition, defaultValues)).toBe(false);
    });

    it('matches max-width when width <= value', () => {
      const condition: MediaCondition = {type: 'feature', name: 'max-width', value: '80'};

      expect(evaluateContainerCondition(condition, defaultValues)).toBe(true);
    });

    it('does not match max-width when width > value', () => {
      const condition: MediaCondition = {type: 'feature', name: 'max-width', value: '40'};

      expect(evaluateContainerCondition(condition, defaultValues)).toBe(false);
    });

    it('matches exact width', () => {
      const condition: MediaCondition = {type: 'feature', name: 'width', value: '60'};

      expect(evaluateContainerCondition(condition, defaultValues)).toBe(true);
    });
  });

  describe('height features', () => {
    it('matches min-height when height >= value', () => {
      const condition: MediaCondition = {type: 'feature', name: 'min-height', value: '10'};

      expect(evaluateContainerCondition(condition, defaultValues)).toBe(true);
    });

    it('matches max-height when height <= value', () => {
      const condition: MediaCondition = {type: 'feature', name: 'max-height', value: '30'};

      expect(evaluateContainerCondition(condition, defaultValues)).toBe(true);
    });

    it('matches exact height', () => {
      const condition: MediaCondition = {type: 'feature', name: 'height', value: '20'};

      expect(evaluateContainerCondition(condition, defaultValues)).toBe(true);
    });
  });

  describe('orientation', () => {
    it('matches landscape when width > height', () => {
      const condition: MediaCondition = {type: 'feature', name: 'orientation', value: 'landscape'};

      expect(evaluateContainerCondition(condition, defaultValues)).toBe(true);
    });

    it('matches portrait when height > width', () => {
      const condition: MediaCondition = {type: 'feature', name: 'orientation', value: 'portrait'};
      const values: ContainerValues = {width: 10, height: 30};

      expect(evaluateContainerCondition(condition, values)).toBe(true);
    });

    it('matches portrait when height equals width', () => {
      const condition: MediaCondition = {type: 'feature', name: 'orientation', value: 'portrait'};
      const values: ContainerValues = {width: 20, height: 20};

      expect(evaluateContainerCondition(condition, values)).toBe(true);
    });
  });

  describe('preference features are rejected', () => {
    it('returns false for prefers-color-scheme', () => {
      const condition: MediaCondition = {
        type: 'feature',
        name: 'prefers-color-scheme',
        value: 'dark',
      };

      expect(evaluateContainerCondition(condition, defaultValues)).toBe(false);
    });

    it('returns false for prefers-reduced-motion', () => {
      const condition: MediaCondition = {
        type: 'feature',
        name: 'prefers-reduced-motion',
        value: 'reduce',
      };

      expect(evaluateContainerCondition(condition, defaultValues)).toBe(false);
    });
  });

  describe('boolean combinators', () => {
    it('evaluates and — both true', () => {
      const condition: MediaCondition = {
        type: 'and',
        conditions: [
          {type: 'feature', name: 'min-width', value: '40'},
          {type: 'feature', name: 'max-height', value: '30'},
        ],
      };

      expect(evaluateContainerCondition(condition, defaultValues)).toBe(true);
    });

    it('evaluates and — one false', () => {
      const condition: MediaCondition = {
        type: 'and',
        conditions: [
          {type: 'feature', name: 'min-width', value: '40'},
          {type: 'feature', name: 'max-height', value: '10'},
        ],
      };

      expect(evaluateContainerCondition(condition, defaultValues)).toBe(false);
    });

    it('evaluates or — one true', () => {
      const condition: MediaCondition = {
        type: 'or',
        conditions: [
          {type: 'feature', name: 'min-width', value: '200'},
          {type: 'feature', name: 'max-height', value: '30'},
        ],
      };

      expect(evaluateContainerCondition(condition, defaultValues)).toBe(true);
    });

    it('evaluates not', () => {
      const condition: MediaCondition = {
        type: 'not',
        condition: {type: 'feature', name: 'min-width', value: '200'},
      };

      expect(evaluateContainerCondition(condition, defaultValues)).toBe(true);
    });
  });

  describe('named container matching', () => {
    it('evaluates conditions against provided container dimensions', () => {
      const condition: MediaCondition = {type: 'feature', name: 'min-width', value: '30'};
      const values: ContainerValues = {width: 35, height: 10};

      expect(evaluateContainerCondition(condition, values)).toBe(true);
    });
  });

  describe('unsupported features', () => {
    it('returns false for unknown features', () => {
      const condition: MediaCondition = {type: 'feature', name: 'resolution', value: '2'};

      expect(evaluateContainerCondition(condition, defaultValues)).toBe(false);
    });
  });
});
