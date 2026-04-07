import {describe, it, expect, beforeEach} from 'vitest';
import {Window} from '@cliui/dom';
import {AnimationController} from '../AnimationController';

import type {KeyframeBlock} from '../../types';
import type {Element} from '@cliui/dom';

function blocks(
  ...defs: Array<{offsets: number[]; props: Record<string, string>}>
): KeyframeBlock[] {
  return defs.map((d) => ({
    offsets: d.offsets,
    declarations: Object.entries(d.props).map(([property, value]) => ({property, value})),
  }));
}

const fadeIn = blocks(
  {offsets: [0], props: {opacity: '0'}},
  {offsets: [100], props: {opacity: '1'}},
);

const defaultOpts = {
  duration: 1000,
  delay: 0,
  easing: 'linear',
  iterationCount: 1,
  direction: 'normal' as const,
  fillMode: 'none' as const,
  playState: 'running' as const,
};

describe('AnimationController', () => {
  let ctrl: AnimationController;
  let el: Element;

  beforeEach(() => {
    ctrl = new AnimationController();
    const win = new Window();
    el = win.document.createElement('div');
  });

  it('starts and tracks an animation', () => {
    ctrl.startAnimation(el, 'fadeIn', fadeIn, defaultOpts, 0);
    expect(ctrl.hasActive).toBe(true);
  });

  it('interpolates values at a given progress', () => {
    ctrl.startAnimation(el, 'fadeIn', fadeIn, defaultOpts, 0);
    const values = ctrl.getValues(el, 500);
    expect(parseFloat(values.get('opacity')!)).toBeCloseTo(0.5);
  });

  it('removes completed animations', () => {
    ctrl.startAnimation(el, 'fadeIn', fadeIn, defaultOpts, 0);
    const completed = ctrl.removeCompleted(1500);
    expect(completed.has(el)).toBe(true);
    expect(ctrl.hasActive).toBe(false);
  });

  it('supports infinite iteration count', () => {
    ctrl.startAnimation(el, 'pulse', fadeIn, {...defaultOpts, iterationCount: Infinity}, 0);
    ctrl.removeCompleted(99999);
    expect(ctrl.hasActive).toBe(true);
  });

  it('applies reverse direction', () => {
    ctrl.startAnimation(el, 'fadeIn', fadeIn, {...defaultOpts, direction: 'reverse'}, 0);
    const values = ctrl.getValues(el, 0);
    expect(parseFloat(values.get('opacity')!)).toBeCloseTo(1);

    const mid = ctrl.getValues(el, 500);
    expect(parseFloat(mid.get('opacity')!)).toBeCloseTo(0.5);
  });

  it('applies alternate direction', () => {
    ctrl.startAnimation(
      el,
      'fadeIn',
      fadeIn,
      {...defaultOpts, iterationCount: 2, direction: 'alternate'},
      0,
    );

    // First iteration: 0 → 1
    const first = ctrl.getValues(el, 500);
    expect(parseFloat(first.get('opacity')!)).toBeCloseTo(0.5);

    // Second iteration: 1 → 0
    const second = ctrl.getValues(el, 1500);
    expect(parseFloat(second.get('opacity')!)).toBeCloseTo(0.5);
  });

  it('applies forwards fill mode', () => {
    ctrl.startAnimation(el, 'fadeIn', fadeIn, {...defaultOpts, fillMode: 'forwards'}, 0);

    // After completion, should retain last keyframe
    const values = ctrl.getValues(el, 2000);
    expect(values.get('opacity')).toBe('1');
  });

  it('applies backwards fill mode during delay', () => {
    ctrl.startAnimation(
      el,
      'fadeIn',
      fadeIn,
      {...defaultOpts, delay: 500, fillMode: 'backwards'},
      0,
    );

    // During delay, should apply first keyframe
    const values = ctrl.getValues(el, 200);
    expect(values.get('opacity')).toBe('0');
  });

  it('returns empty map for none fill mode after completion', () => {
    ctrl.startAnimation(el, 'fadeIn', fadeIn, {...defaultOpts, fillMode: 'none'}, 0);
    const values = ctrl.getValues(el, 2000);
    expect(values.size).toBe(0);
  });

  it('pauses and resumes', () => {
    ctrl.startAnimation(el, 'fadeIn', fadeIn, defaultOpts, 0);

    // Pause at 500ms (50% progress)
    ctrl.setPlayState(el, 'fadeIn', 'paused', 500);
    const paused = ctrl.getValues(el, 1000); // time has passed, but paused
    expect(parseFloat(paused.get('opacity')!)).toBeCloseTo(0.5);

    // Resume at 1000ms
    ctrl.setPlayState(el, 'fadeIn', 'running', 1000);
    // 250ms after resume — total active elapsed is 750ms (50% + 25%)
    const resumed = ctrl.getValues(el, 1250);
    expect(parseFloat(resumed.get('opacity')!)).toBeCloseTo(0.75);
  });

  it('removes animation by name', () => {
    ctrl.startAnimation(el, 'fadeIn', fadeIn, defaultOpts, 0);
    ctrl.removeAnimation(el, 'fadeIn');
    expect(ctrl.hasActive).toBe(false);
  });

  it('supports multiple animations on one element', () => {
    const colorKf = blocks(
      {offsets: [0], props: {color: '#000000'}},
      {offsets: [100], props: {color: '#ffffff'}},
    );
    ctrl.startAnimation(el, 'fadeIn', fadeIn, defaultOpts, 0);
    ctrl.startAnimation(el, 'colorize', colorKf, defaultOpts, 0);

    const values = ctrl.getValues(el, 500);
    expect(values.has('opacity')).toBe(true);
    expect(values.has('color')).toBe(true);
  });
});
