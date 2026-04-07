import {describe, it, expect} from 'vitest';
import {evaluateEasing} from '../evaluateEasing';
import {resolveEasingKeyword} from '../resolveEasingKeyword';

import type {EasingDescriptor} from '../../types';

describe('evaluateEasing', () => {
  describe('linear', () => {
    const linear: EasingDescriptor = {type: 'linear'};

    it('returns identity values', () => {
      expect(evaluateEasing(linear, 0)).toBe(0);
      expect(evaluateEasing(linear, 0.5)).toBe(0.5);
      expect(evaluateEasing(linear, 1)).toBe(1);
    });
  });

  describe('cubic-bezier', () => {
    it('evaluates ease (0.25, 0.1, 0.25, 1.0)', () => {
      const ease = resolveEasingKeyword('ease');
      expect(evaluateEasing(ease, 0)).toBeCloseTo(0, 4);
      expect(evaluateEasing(ease, 1)).toBeCloseTo(1, 4);
      // ease accelerates slowly, then fast — at 0.5 input, output > 0.5
      const mid = evaluateEasing(ease, 0.5);
      expect(mid).toBeGreaterThan(0.5);
      expect(mid).toBeLessThan(1);
    });

    it('evaluates ease-in (0.42, 0, 1.0, 1.0)', () => {
      const easeIn = resolveEasingKeyword('ease-in');
      expect(evaluateEasing(easeIn, 0)).toBeCloseTo(0, 4);
      expect(evaluateEasing(easeIn, 1)).toBeCloseTo(1, 4);
      // ease-in is slow at start — at 0.5 input, output < 0.5
      expect(evaluateEasing(easeIn, 0.5)).toBeLessThan(0.5);
    });

    it('evaluates ease-out (0, 0, 0.58, 1.0)', () => {
      const easeOut = resolveEasingKeyword('ease-out');
      expect(evaluateEasing(easeOut, 0)).toBeCloseTo(0, 4);
      expect(evaluateEasing(easeOut, 1)).toBeCloseTo(1, 4);
      // ease-out is fast at start — at 0.5 input, output > 0.5
      expect(evaluateEasing(easeOut, 0.5)).toBeGreaterThan(0.5);
    });

    it('evaluates ease-in-out (0.42, 0, 0.58, 1.0)', () => {
      const easeInOut = resolveEasingKeyword('ease-in-out');
      expect(evaluateEasing(easeInOut, 0)).toBeCloseTo(0, 4);
      expect(evaluateEasing(easeInOut, 1)).toBeCloseTo(1, 4);
      // ease-in-out is symmetric — at 0.5 input, output ≈ 0.5
      expect(evaluateEasing(easeInOut, 0.5)).toBeCloseTo(0.5, 1);
    });

    it('handles linear cubic-bezier (0, 0, 1, 1)', () => {
      const linear: EasingDescriptor = {type: 'cubic-bezier', x1: 0, y1: 0, x2: 1, y2: 1};
      expect(evaluateEasing(linear, 0.25)).toBeCloseTo(0.25, 2);
      expect(evaluateEasing(linear, 0.75)).toBeCloseTo(0.75, 2);
    });

    it('handles custom cubic-bezier', () => {
      const custom: EasingDescriptor = {type: 'cubic-bezier', x1: 0.4, y1: 0, x2: 0.2, y2: 1};
      const result = evaluateEasing(custom, 0.5);
      expect(result).toBeGreaterThan(0.4);
      expect(result).toBeLessThan(1);
    });
  });

  describe('steps', () => {
    it('evaluates steps(4, jump-end) — default CSS steps()', () => {
      const steps: EasingDescriptor = {type: 'steps', count: 4, position: 'jump-end'};
      expect(evaluateEasing(steps, 0)).toBe(0);
      expect(evaluateEasing(steps, 0.24)).toBe(0);
      expect(evaluateEasing(steps, 0.25)).toBe(0.25);
      expect(evaluateEasing(steps, 0.49)).toBe(0.25);
      expect(evaluateEasing(steps, 0.5)).toBe(0.5);
      expect(evaluateEasing(steps, 0.99)).toBe(0.75);
      expect(evaluateEasing(steps, 1)).toBe(1);
    });

    it('evaluates steps(4, jump-start)', () => {
      const steps: EasingDescriptor = {type: 'steps', count: 4, position: 'jump-start'};
      // At progress 0, jump-start immediately goes to first step
      expect(evaluateEasing(steps, 0)).toBe(0.25);
      expect(evaluateEasing(steps, 0.25)).toBe(0.5);
      expect(evaluateEasing(steps, 0.5)).toBe(0.75);
      expect(evaluateEasing(steps, 1)).toBe(1);
    });

    it('evaluates steps(3, jump-both)', () => {
      const steps: EasingDescriptor = {type: 'steps', count: 3, position: 'jump-both'};
      // jump-both has count+1 intervals
      expect(evaluateEasing(steps, 0)).toBeCloseTo(0.25, 4);
      expect(evaluateEasing(steps, 1)).toBe(1);
    });

    it('evaluates steps(3, jump-none)', () => {
      const steps: EasingDescriptor = {type: 'steps', count: 3, position: 'jump-none'};
      // jump-none has count-1 intervals
      expect(evaluateEasing(steps, 0)).toBe(0);
      expect(evaluateEasing(steps, 1)).toBe(1);
    });

    it('evaluates steps(1, jump-end) — single step', () => {
      const steps: EasingDescriptor = {type: 'steps', count: 1, position: 'jump-end'};
      expect(evaluateEasing(steps, 0)).toBe(0);
      expect(evaluateEasing(steps, 0.5)).toBe(0);
      expect(evaluateEasing(steps, 1)).toBe(1);
    });
  });

  describe('resolveEasingKeyword', () => {
    it('resolves named keywords', () => {
      expect(resolveEasingKeyword('linear')).toEqual({type: 'linear'});
      expect(resolveEasingKeyword('ease')).toEqual({
        type: 'cubic-bezier',
        x1: 0.25,
        y1: 0.1,
        x2: 0.25,
        y2: 1.0,
      });
      expect(resolveEasingKeyword('ease-in')).toEqual({
        type: 'cubic-bezier',
        x1: 0.42,
        y1: 0,
        x2: 1.0,
        y2: 1.0,
      });
    });

    it('defaults unknown keywords to linear', () => {
      expect(resolveEasingKeyword('unknown')).toEqual({type: 'linear'});
    });
  });
});
