import {resolveEasingKeyword} from './resolveEasingKeyword';

import type {EasingDescriptor, StepPosition} from '../types';

/**
 * Parses a CSS easing function value into a structured descriptor.
 *
 * Supports named keywords (`ease`, `linear`, etc.), `cubic-bezier(...)`,
 * and `steps(...)`.
 *
 * @param value - A CSS timing function string.
 * @returns The parsed easing descriptor.
 */
export function parseEasingValue(value: string): EasingDescriptor {
  const trimmed = value.trim().toLowerCase();

  if (trimmed.startsWith('cubic-bezier(') && trimmed.endsWith(')')) {
    const args = trimmed
      .slice(13, -1)
      .split(',')
      .map((s) => parseFloat(s.trim()));

    if (args.length === 4 && args.every((n) => !Number.isNaN(n))) {
      return {type: 'cubic-bezier', x1: args[0]!, y1: args[1]!, x2: args[2]!, y2: args[3]!};
    }
  }

  if (trimmed.startsWith('steps(') && trimmed.endsWith(')')) {
    const inner = trimmed.slice(6, -1);
    const parts = inner.split(',').map((s) => s.trim());
    const count = parseInt(parts[0]!, 10);

    if (!Number.isNaN(count) && count > 0) {
      const posMap: Record<string, StepPosition> = {
        start: 'jump-start',
        end: 'jump-end',
        'jump-start': 'jump-start',
        'jump-end': 'jump-end',
        'jump-both': 'jump-both',
        'jump-none': 'jump-none',
      };
      const position: StepPosition = posMap[parts[1] ?? 'end'] ?? 'jump-end';
      return {type: 'steps', count, position};
    }
  }

  return resolveEasingKeyword(trimmed);
}
