import type {VisualLineCache} from '../types';

/** Creates a fresh empty cache. */
export function createVisualLineCache(): VisualLineCache {
  return {
    graphemes: null,
    graphemeCount: 0,
    viewportWidth: 0,
    wordWrap: false,
    lines: null,
  };
}
