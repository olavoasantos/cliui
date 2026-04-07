import {describe, it, expect} from 'vitest';
import {resolveKeyframe} from '../resolveKeyframe';

import type {KeyframeBlock} from '../../types';
import type {EasingDescriptor} from '../../types';

const linear: EasingDescriptor = {type: 'linear'};

function blocks(
  ...defs: Array<{offsets: number[]; props: Record<string, string>}>
): KeyframeBlock[] {
  return defs.map((d) => ({
    offsets: d.offsets,
    declarations: Object.entries(d.props).map(([property, value]) => ({property, value})),
  }));
}

describe('resolveKeyframe', () => {
  it('interpolates between from/to at midpoint', () => {
    const kf = blocks(
      {offsets: [0], props: {opacity: '0'}},
      {offsets: [100], props: {opacity: '1'}},
    );

    const result = resolveKeyframe(kf, 0.5, linear);
    expect(parseFloat(result.get('opacity')!)).toBeCloseTo(0.5);
  });

  it('returns start values at progress 0', () => {
    const kf = blocks(
      {offsets: [0], props: {opacity: '0'}},
      {offsets: [100], props: {opacity: '1'}},
    );

    const result = resolveKeyframe(kf, 0, linear);
    expect(result.get('opacity')).toBe('0');
  });

  it('returns end values at progress 1', () => {
    const kf = blocks(
      {offsets: [0], props: {opacity: '0'}},
      {offsets: [100], props: {opacity: '1'}},
    );

    const result = resolveKeyframe(kf, 1, linear);
    expect(result.get('opacity')).toBe('1');
  });

  it('interpolates with three stops', () => {
    const kf = blocks(
      {offsets: [0], props: {opacity: '0'}},
      {offsets: [50], props: {opacity: '1'}},
      {offsets: [100], props: {opacity: '0'}},
    );

    // At 25% — between 0% and 50%, local progress 0.5
    const at25 = resolveKeyframe(kf, 0.25, linear);
    expect(parseFloat(at25.get('opacity')!)).toBeCloseTo(0.5);

    // At 75% — between 50% and 100%, local progress 0.5
    const at75 = resolveKeyframe(kf, 0.75, linear);
    expect(parseFloat(at75.get('opacity')!)).toBeCloseTo(0.5);
  });

  it('applies easing to local progress', () => {
    const kf = blocks(
      {offsets: [0], props: {opacity: '0'}},
      {offsets: [100], props: {opacity: '1'}},
    );

    const easeIn: EasingDescriptor = {type: 'cubic-bezier', x1: 0.42, y1: 0, x2: 1.0, y2: 1.0};
    const result = resolveKeyframe(kf, 0.5, easeIn);

    // ease-in at 50% gives output < 0.5
    expect(parseFloat(result.get('opacity')!)).toBeLessThan(0.5);
  });

  it('handles multiple properties', () => {
    const kf = blocks(
      {offsets: [0], props: {opacity: '0', color: '#000000'}},
      {offsets: [100], props: {opacity: '1', color: '#ffffff'}},
    );

    const result = resolveKeyframe(kf, 0.5, linear);
    expect(parseFloat(result.get('opacity')!)).toBeCloseTo(0.5);
    expect(result.get('color')).toBe('rgb(128, 128, 128)');
  });

  it('synthesizes implicit 0% keyframe from base style', () => {
    const kf = blocks({offsets: [100], props: {opacity: '1'}});
    const baseStyle = new Map([['opacity', '0']]);

    const result = resolveKeyframe(kf, 0.5, linear, baseStyle);
    expect(parseFloat(result.get('opacity')!)).toBeCloseTo(0.5);
  });

  it('returns empty map for empty blocks', () => {
    const result = resolveKeyframe([], 0.5, linear);
    expect(result.size).toBe(0);
  });

  it('handles property only in one stop', () => {
    const kf = blocks(
      {offsets: [0], props: {opacity: '0'}},
      {offsets: [100], props: {opacity: '1', color: '#ff0000'}},
    );

    const result = resolveKeyframe(kf, 0.5, linear);
    expect(result.has('opacity')).toBe(true);
    expect(result.has('color')).toBe(true);
  });
});
