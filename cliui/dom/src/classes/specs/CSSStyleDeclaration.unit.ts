import {describe, it, expect, beforeEach, vi} from 'vitest';
import {expandShorthand} from '../../utilities/expandShorthand';
import {Window} from '../Window';
import {HOOKS} from '../../constants';
import type {Document} from '../Document';
import type {Element} from '../Element';

describe('CSSStyleDeclaration', () => {
  let doc: Document;
  let el: Element;

  beforeEach(() => {
    const window = new Window();
    doc = window.document;
    el = doc.createElement('div');
  });

  describe('property get/set', () => {
    it('gets and sets a longhand property via camelCase', () => {
      el.style.color = '#ff0000';
      expect(el.style.color).toBe('#ff0000');
    });

    it('gets and sets a longhand property via setProperty/getPropertyValue', () => {
      el.style.setProperty('background-color', '#00ff00');
      expect(el.style.getPropertyValue('background-color')).toBe('#00ff00');
    });

    it('returns empty string for unset properties', () => {
      expect(el.style.color).toBe('');
      expect(el.style.getPropertyValue('color')).toBe('');
    });

    it('supports kebab-case properties via setProperty', () => {
      el.style.setProperty('font-weight', 'bold');
      expect(el.style.getPropertyValue('font-weight')).toBe('bold');
    });

    it('supports camelCase access for hyphenated properties', () => {
      el.style.backgroundColor = 'blue';
      expect(el.style.getPropertyValue('background-color')).toBe('blue');
      expect(el.style.backgroundColor).toBe('blue');
    });

    it('removes property when value is empty string', () => {
      el.style.color = 'red';
      expect(el.style.color).toBe('red');
      el.style.setProperty('color', '');
      expect(el.style.color).toBe('');
    });
  });

  describe('removeProperty', () => {
    it('removes a property and returns old value', () => {
      el.style.color = 'red';
      const old = el.style.removeProperty('color');
      expect(old).toBe('red');
      expect(el.style.color).toBe('');
    });

    it('returns empty string when removing unset property', () => {
      expect(el.style.removeProperty('color')).toBe('');
    });
  });

  describe('cssText', () => {
    it('returns empty string when no properties set', () => {
      expect(el.style.cssText).toBe('');
    });

    it('serializes all set properties', () => {
      el.style.color = 'red';
      el.style.setProperty('font-weight', 'bold');
      expect(el.style.cssText).toContain('color: red');
      expect(el.style.cssText).toContain('font-weight: bold');
    });

    it('sets multiple properties from cssText', () => {
      el.style.cssText = 'color: red; font-weight: bold';
      expect(el.style.color).toBe('red');
      expect(el.style.getPropertyValue('font-weight')).toBe('bold');
    });

    it('clears properties when set to empty', () => {
      el.style.color = 'red';
      el.style.cssText = '';
      expect(el.style.color).toBe('');
      expect(el.style.length).toBe(0);
    });
  });

  describe('length and item', () => {
    it('reports correct length', () => {
      expect(el.style.length).toBe(0);
      el.style.color = 'red';
      expect(el.style.length).toBe(1);
      el.style.setProperty('font-weight', 'bold');
      expect(el.style.length).toBe(2);
    });

    it('returns property name by index', () => {
      el.style.color = 'red';
      el.style.setProperty('font-weight', 'bold');
      const names = [el.style.item(0), el.style.item(1)];
      expect(names).toContain('color');
      expect(names).toContain('font-weight');
    });

    it('returns empty string for out-of-range index', () => {
      expect(el.style.item(99)).toBe('');
    });
  });

  describe('shorthand expansion', () => {
    it('expands padding with 1 value', () => {
      el.style.padding = '5';
      expect(el.style.getPropertyValue('padding-top')).toBe('5');
      expect(el.style.getPropertyValue('padding-right')).toBe('5');
      expect(el.style.getPropertyValue('padding-bottom')).toBe('5');
      expect(el.style.getPropertyValue('padding-left')).toBe('5');
    });

    it('expands padding with 2 values', () => {
      el.style.padding = '1 2';
      expect(el.style.getPropertyValue('padding-top')).toBe('1');
      expect(el.style.getPropertyValue('padding-right')).toBe('2');
      expect(el.style.getPropertyValue('padding-bottom')).toBe('1');
      expect(el.style.getPropertyValue('padding-left')).toBe('2');
    });

    it('expands padding with 3 values', () => {
      el.style.padding = '1 2 3';
      expect(el.style.getPropertyValue('padding-top')).toBe('1');
      expect(el.style.getPropertyValue('padding-right')).toBe('2');
      expect(el.style.getPropertyValue('padding-bottom')).toBe('3');
      expect(el.style.getPropertyValue('padding-left')).toBe('2');
    });

    it('expands padding with 4 values', () => {
      el.style.padding = '1 2 3 4';
      expect(el.style.getPropertyValue('padding-top')).toBe('1');
      expect(el.style.getPropertyValue('padding-right')).toBe('2');
      expect(el.style.getPropertyValue('padding-bottom')).toBe('3');
      expect(el.style.getPropertyValue('padding-left')).toBe('4');
    });

    it('expands margin shorthand', () => {
      el.style.margin = '1 2';
      expect(el.style.getPropertyValue('margin-top')).toBe('1');
      expect(el.style.getPropertyValue('margin-right')).toBe('2');
      expect(el.style.getPropertyValue('margin-bottom')).toBe('1');
      expect(el.style.getPropertyValue('margin-left')).toBe('2');
    });

    it('expands gap shorthand', () => {
      el.style.gap = '5 10';
      expect(el.style.getPropertyValue('row-gap')).toBe('5');
      expect(el.style.getPropertyValue('column-gap')).toBe('10');
    });

    it('expands gap with single value', () => {
      el.style.gap = '5';
      expect(el.style.getPropertyValue('row-gap')).toBe('5');
      expect(el.style.getPropertyValue('column-gap')).toBe('5');
    });

    it('expands flex shorthand with single number', () => {
      el.style.flex = '2';
      expect(el.style.getPropertyValue('flex-grow')).toBe('2');
      expect(el.style.getPropertyValue('flex-shrink')).toBe('1');
      expect(el.style.getPropertyValue('flex-basis')).toBe('0');
    });

    it('expands flex: none', () => {
      el.style.flex = 'none';
      expect(el.style.getPropertyValue('flex-grow')).toBe('0');
      expect(el.style.getPropertyValue('flex-shrink')).toBe('0');
      expect(el.style.getPropertyValue('flex-basis')).toBe('auto');
    });

    it('expands flex: auto', () => {
      el.style.flex = 'auto';
      expect(el.style.getPropertyValue('flex-grow')).toBe('1');
      expect(el.style.getPropertyValue('flex-shrink')).toBe('1');
      expect(el.style.getPropertyValue('flex-basis')).toBe('auto');
    });

    it('expands flex with 3 values', () => {
      el.style.flex = '1 0 auto';
      expect(el.style.getPropertyValue('flex-grow')).toBe('1');
      expect(el.style.getPropertyValue('flex-shrink')).toBe('0');
      expect(el.style.getPropertyValue('flex-basis')).toBe('auto');
    });

    it('removes longhand properties when shorthand is removed', () => {
      el.style.padding = '5';
      expect(el.style.getPropertyValue('padding-top')).toBe('5');
      el.style.removeProperty('padding');
      expect(el.style.getPropertyValue('padding-top')).toBe('');
      expect(el.style.getPropertyValue('padding-right')).toBe('');
    });
  });

  describe('hooks notification', () => {
    it('notifies the hooks bridge when a property is set', () => {
      const setAttr = vi.fn();
      const window = new Window();
      window[HOOKS] = {setAttribute: setAttr};
      const d = window.document;
      const e = d.createElement('div');
      d.body.appendChild(e);

      e.style.color = 'red';
      expect(setAttr).toHaveBeenCalledWith(e, 'style', 'color: red', null, null);
    });
  });

  describe('all layout properties', () => {
    it('supports display', () => {
      el.style.display = 'flex';
      expect(el.style.display).toBe('flex');
    });

    it('supports flex-direction', () => {
      el.style.flexDirection = 'row';
      expect(el.style.getPropertyValue('flex-direction')).toBe('row');
    });

    it('supports justify-content', () => {
      el.style.justifyContent = 'center';
      expect(el.style.getPropertyValue('justify-content')).toBe('center');
    });

    it('supports align-items', () => {
      el.style.alignItems = 'stretch';
      expect(el.style.getPropertyValue('align-items')).toBe('stretch');
    });

    it('supports width and height', () => {
      el.style.width = '100';
      el.style.height = '50';
      expect(el.style.width).toBe('100');
      expect(el.style.height).toBe('50');
    });

    it('supports position, top, left, z-index', () => {
      el.style.position = 'absolute';
      el.style.top = '10';
      el.style.left = '20';
      el.style.zIndex = '5';
      expect(el.style.position).toBe('absolute');
      expect(el.style.top).toBe('10');
      expect(el.style.left).toBe('20');
      expect(el.style.getPropertyValue('z-index')).toBe('5');
    });
  });
});

describe('expandShorthand', () => {
  it('returns null for non-shorthand properties', () => {
    expect(expandShorthand('color', 'red')).toBeNull();
  });

  it('expands padding', () => {
    const result = expandShorthand('padding', '1 2 3 4');
    expect(result).toEqual({
      'padding-top': '1',
      'padding-right': '2',
      'padding-bottom': '3',
      'padding-left': '4',
    });
  });

  it('expands transition shorthand', () => {
    const result = expandShorthand('transition', 'color 200ms ease 100ms');
    expect(result).toEqual({
      'transition-property': 'color',
      'transition-duration': '200ms',
      'transition-timing-function': 'ease',
      'transition-delay': '100ms',
    });
  });

  it('expands multi-value transition shorthand', () => {
    const result = expandShorthand(
      'transition',
      'color 200ms ease, background-color 300ms ease-in 50ms',
    );
    expect(result).toEqual({
      'transition-property': 'color, background-color',
      'transition-duration': '200ms, 300ms',
      'transition-timing-function': 'ease, ease-in',
      'transition-delay': '0ms, 50ms',
    });
  });

  it('expands animation shorthand', () => {
    const result = expandShorthand('animation', 'fadeIn 1s ease-out');
    expect(result).toEqual({
      'animation-name': 'fadeIn',
      'animation-duration': '1s',
      'animation-timing-function': 'ease-out',
      'animation-delay': '0ms',
      'animation-iteration-count': '1',
      'animation-direction': 'normal',
      'animation-fill-mode': 'none',
      'animation-play-state': 'running',
    });
  });

  it('expands animation shorthand with all values', () => {
    const result = expandShorthand(
      'animation',
      'pulse 2s linear 100ms infinite alternate both paused',
    );
    expect(result).toEqual({
      'animation-name': 'pulse',
      'animation-duration': '2s',
      'animation-timing-function': 'linear',
      'animation-delay': '100ms',
      'animation-iteration-count': 'infinite',
      'animation-direction': 'alternate',
      'animation-fill-mode': 'both',
      'animation-play-state': 'paused',
    });
  });

  it('expands transition shorthand with leading-dot time values', () => {
    const result = expandShorthand(
      'transition',
      'background-color .5s ease, color .3s ease-in .1s',
    );
    expect(result).toEqual({
      'transition-property': 'background-color, color',
      'transition-duration': '.5s, .3s',
      'transition-timing-function': 'ease, ease-in',
      'transition-delay': '0ms, .1s',
    });
  });

  it('expands animation shorthand with leading-dot time values', () => {
    const result = expandShorthand('animation', 'fadeIn .5s ease-out');
    expect(result).toEqual({
      'animation-name': 'fadeIn',
      'animation-duration': '.5s',
      'animation-timing-function': 'ease-out',
      'animation-delay': '0ms',
      'animation-iteration-count': '1',
      'animation-direction': 'normal',
      'animation-fill-mode': 'none',
      'animation-play-state': 'running',
    });
  });
});
