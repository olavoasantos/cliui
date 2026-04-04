import {describe, it, expect, beforeEach} from 'vitest';
import {Window} from '@cliui/dom';
import {TransitionController} from '../TransitionController';

import type {ComputedStyle} from '../../types';
import type {Element} from '@cliui/dom';

function style(props: Record<string, string>): ComputedStyle {
  return new Map(Object.entries(props));
}

describe('TransitionController', () => {
  let controller: TransitionController;
  let el: Element;

  beforeEach(() => {
    controller = new TransitionController();
    const win = new Window();
    el = win.document.createElement('div');
  });

  it('starts a transition when a value changes', () => {
    const oldS = style({
      color: '#000000',
      'transition-property': 'color',
      'transition-duration': '200ms',
    });
    const newS = style({
      color: '#ffffff',
      'transition-property': 'color',
      'transition-duration': '200ms',
    });

    controller.detectChanges(el, oldS, newS, 0);
    expect(controller.hasActive).toBe(true);
  });

  it('interpolates values at a given timestamp', () => {
    const oldS = style({
      color: '#000000',
      'transition-property': 'color',
      'transition-duration': '200ms',
      'transition-timing-function': 'linear',
    });
    const newS = style({
      color: '#ffffff',
      'transition-property': 'color',
      'transition-duration': '200ms',
      'transition-timing-function': 'linear',
    });

    controller.detectChanges(el, oldS, newS, 0);

    const values = controller.getValues(el, 100); // 50% through
    expect(values.get('color')).toBe('rgb(128, 128, 128)');
  });

  it('returns start value during delay period', () => {
    const oldS = style({
      color: '#000000',
      'transition-property': 'color',
      'transition-duration': '200ms',
      'transition-delay': '100ms',
    });
    const newS = style({
      color: '#ffffff',
      'transition-property': 'color',
      'transition-duration': '200ms',
      'transition-delay': '100ms',
    });

    controller.detectChanges(el, oldS, newS, 0);

    const values = controller.getValues(el, 50); // still in delay
    expect(values.get('color')).toBe('#000000');
  });

  it('removes completed transitions', () => {
    const oldS = style({
      color: '#000000',
      'transition-property': 'color',
      'transition-duration': '200ms',
    });
    const newS = style({
      color: '#ffffff',
      'transition-property': 'color',
      'transition-duration': '200ms',
    });

    controller.detectChanges(el, oldS, newS, 0);
    expect(controller.hasActive).toBe(true);

    const completed = controller.removeCompleted(300);
    expect(completed.has(el)).toBe(true);
    expect(controller.hasActive).toBe(false);
  });

  it('handles transition-property: all', () => {
    const oldS = style({
      color: '#000000',
      'background-color': '#111111',
      'transition-property': 'all',
      'transition-duration': '200ms',
    });
    const newS = style({
      color: '#ffffff',
      'background-color': '#eeeeee',
      'transition-property': 'all',
      'transition-duration': '200ms',
    });

    controller.detectChanges(el, oldS, newS, 0);
    const values = controller.getValues(el, 100);
    expect(values.has('color')).toBe(true);
    expect(values.has('background-color')).toBe(true);
  });

  it('does not start transition when property is none', () => {
    const oldS = style({
      color: '#000000',
      'transition-property': 'none',
      'transition-duration': '200ms',
    });
    const newS = style({
      color: '#ffffff',
      'transition-property': 'none',
      'transition-duration': '200ms',
    });

    controller.detectChanges(el, oldS, newS, 0);
    expect(controller.hasActive).toBe(false);
  });

  it('cancels and reverses mid-transition', () => {
    const oldS = style({
      color: '#000000',
      'transition-property': 'color',
      'transition-duration': '200ms',
    });
    const newS = style({
      color: '#ffffff',
      'transition-property': 'color',
      'transition-duration': '200ms',
    });

    controller.detectChanges(el, oldS, newS, 0);

    // At 50ms, the current interpolated value is somewhere between start and end
    const midValues = controller.getValues(el, 50);
    const midColor = midValues.get('color')!;

    // Now reverse — new target goes back to black
    const reverseS = style({
      color: '#000000',
      'transition-property': 'color',
      'transition-duration': '200ms',
    });
    controller.detectChanges(el, newS, reverseS, 50);

    // The new transition should start from the mid-point value
    const values = controller.getValues(el, 50); // At start of new transition
    expect(values.get('color')).toBe(midColor);
  });

  it('supports multi-property transitions', () => {
    const oldS = style({
      color: '#000000',
      opacity: '0',
      'transition-property': 'color, opacity',
      'transition-duration': '200ms, 100ms',
    });
    const newS = style({
      color: '#ffffff',
      opacity: '1',
      'transition-property': 'color, opacity',
      'transition-duration': '200ms, 100ms',
    });

    controller.detectChanges(el, oldS, newS, 0);
    const values = controller.getValues(el, 50);
    expect(values.has('color')).toBe(true);
    expect(values.has('opacity')).toBe(true);
  });
});
