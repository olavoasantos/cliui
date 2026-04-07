import {evaluateEasing} from './evaluateEasing';
import {interpolateValue} from './interpolateValue';

import type {EasingDescriptor} from '../types';
import type {KeyframeBlock} from '../types';
import type {ComputedStyle} from '../types';

/** A resolved keyframe stop used internally by the resolver. */
interface ResolvedStop {
  offset: number;
  values: Map<string, string>;
}

/**
 * Resolves interpolated property values for a given animation progress
 * against a set of keyframe blocks.
 *
 * Finds the two bounding keyframe stops, computes local progress between
 * them, applies easing, and interpolates each animated property.
 *
 * @param blocks - Parsed keyframe blocks from a `@keyframes` rule.
 * @param progress - Overall animation progress (0–1).
 * @param easing - The easing function to apply to local progress between stops.
 * @param baseStyle - The element's computed style, used for implicit 0%/100% keyframes.
 * @returns A map of property name → interpolated value.
 */
export function resolveKeyframe(
  blocks: KeyframeBlock[],
  progress: number,
  easing: EasingDescriptor,
  baseStyle?: ComputedStyle,
): Map<string, string> {
  const stops = buildStops(blocks, baseStyle);
  const result = new Map<string, string>();

  if (stops.length === 0) return result;
  if (stops.length === 1) {
    for (const [prop, val] of stops[0]!.values) {
      result.set(prop, val);
    }
    return result;
  }

  // Clamp progress
  const p = Math.max(0, Math.min(1, progress));

  // Find bounding stops
  let lowerIdx = 0;
  let upperIdx = stops.length - 1;

  for (let i = 0; i < stops.length; i++) {
    if (stops[i]!.offset <= p) lowerIdx = i;
  }

  for (let i = stops.length - 1; i >= 0; i--) {
    if (stops[i]!.offset >= p) upperIdx = i;
  }

  if (lowerIdx === upperIdx) {
    for (const [prop, val] of stops[lowerIdx]!.values) {
      result.set(prop, val);
    }
    return result;
  }

  const lower = stops[lowerIdx]!;
  const upper = stops[upperIdx]!;

  // Local progress between the two bounding stops
  const range = upper.offset - lower.offset;
  const localProgress = range === 0 ? 0 : (p - lower.offset) / range;
  const easedProgress = evaluateEasing(easing, localProgress);

  // Collect all properties across both stops
  const allProps = new Set<string>();
  for (const prop of lower.values.keys()) allProps.add(prop);
  for (const prop of upper.values.keys()) allProps.add(prop);

  for (const prop of allProps) {
    const startVal = lower.values.get(prop);
    const endVal = upper.values.get(prop);

    if (startVal !== undefined && endVal !== undefined) {
      result.set(prop, interpolateValue(prop, startVal, endVal, easedProgress));
    } else if (endVal !== undefined) {
      result.set(prop, endVal);
    } else if (startVal !== undefined) {
      result.set(prop, startVal);
    }
  }

  return result;
}

function buildStops(blocks: KeyframeBlock[], baseStyle?: ComputedStyle): ResolvedStop[] {
  const stopMap = new Map<number, Map<string, string>>();

  for (const block of blocks) {
    for (const offset of block.offsets) {
      const normalizedOffset = offset / 100;
      let values = stopMap.get(normalizedOffset);

      if (!values) {
        values = new Map();
        stopMap.set(normalizedOffset, values);
      }

      for (const decl of block.declarations) {
        values.set(decl.property, decl.value);
      }
    }
  }

  // Synthesize implicit 0% and 100% from base style if missing
  if (baseStyle && !stopMap.has(0)) {
    const implicitStart = new Map<string, string>();

    for (const values of stopMap.values()) {
      for (const prop of values.keys()) {
        const baseVal = baseStyle.get(prop);
        if (baseVal !== undefined) implicitStart.set(prop, baseVal);
      }
    }

    if (implicitStart.size > 0) stopMap.set(0, implicitStart);
  }

  if (baseStyle && !stopMap.has(1)) {
    const implicitEnd = new Map<string, string>();

    for (const values of stopMap.values()) {
      for (const prop of values.keys()) {
        const baseVal = baseStyle.get(prop);
        if (baseVal !== undefined) implicitEnd.set(prop, baseVal);
      }
    }

    if (implicitEnd.size > 0) stopMap.set(1, implicitEnd);
  }

  const stops: ResolvedStop[] = [];
  for (const [offset, values] of stopMap) {
    stops.push({offset, values});
  }

  stops.sort((a, b) => a.offset - b.offset);
  return stops;
}
