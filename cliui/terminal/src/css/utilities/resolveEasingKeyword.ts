import type {EasingDescriptor} from '../types';

/**
 * Resolves a named CSS easing keyword to its `EasingDescriptor`.
 *
 * @param keyword - A named easing keyword (e.g. `'ease'`, `'ease-in-out'`).
 * @returns The corresponding descriptor, or a linear descriptor for unknown keywords.
 */
export function resolveEasingKeyword(keyword: string): EasingDescriptor {
  switch (keyword) {
    case 'linear':
      return {type: 'linear'};
    case 'ease':
      return {type: 'cubic-bezier', x1: 0.25, y1: 0.1, x2: 0.25, y2: 1.0};
    case 'ease-in':
      return {type: 'cubic-bezier', x1: 0.42, y1: 0, x2: 1.0, y2: 1.0};
    case 'ease-out':
      return {type: 'cubic-bezier', x1: 0, y1: 0, x2: 0.58, y2: 1.0};
    case 'ease-in-out':
      return {type: 'cubic-bezier', x1: 0.42, y1: 0, x2: 0.58, y2: 1.0};
    default:
      return {type: 'linear'};
  }
}
