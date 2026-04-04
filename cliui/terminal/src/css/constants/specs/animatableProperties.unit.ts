import {describe, it, expect} from 'vitest';
import {ANIMATABLE_PROPERTIES} from '../animatableProperties';

describe('ANIMATABLE_PROPERTIES', () => {
  it('classifies color properties as color', () => {
    expect(ANIMATABLE_PROPERTIES['color']).toBe('color');
    expect(ANIMATABLE_PROPERTIES['background-color']).toBe('color');
    expect(ANIMATABLE_PROPERTIES['border-color']).toBe('color');
    expect(ANIMATABLE_PROPERTIES['text-decoration-color']).toBe('color');
  });

  it('classifies cell-based properties as number-cell', () => {
    expect(ANIMATABLE_PROPERTIES['width']).toBe('number-cell');
    expect(ANIMATABLE_PROPERTIES['height']).toBe('number-cell');
    expect(ANIMATABLE_PROPERTIES['padding-top']).toBe('number-cell');
    expect(ANIMATABLE_PROPERTIES['margin-left']).toBe('number-cell');
    expect(ANIMATABLE_PROPERTIES['gap']).toBe('number-cell');
    expect(ANIMATABLE_PROPERTIES['top']).toBe('number-cell');
  });

  it('classifies continuous properties as number-continuous', () => {
    expect(ANIMATABLE_PROPERTIES['opacity']).toBe('number-continuous');
    expect(ANIMATABLE_PROPERTIES['flex-grow']).toBe('number-continuous');
    expect(ANIMATABLE_PROPERTIES['flex-shrink']).toBe('number-continuous');
  });

  it('classifies layout keywords as discrete', () => {
    expect(ANIMATABLE_PROPERTIES['display']).toBe('discrete');
    expect(ANIMATABLE_PROPERTIES['flex-direction']).toBe('discrete');
    expect(ANIMATABLE_PROPERTIES['position']).toBe('discrete');
  });

  it('returns undefined for unregistered properties', () => {
    expect(ANIMATABLE_PROPERTIES['unknown']).toBeUndefined();
  });
});
