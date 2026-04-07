import {parseSelector} from '@cliui/dom';

import type {SelectorList} from '../types';

/** Parses a comma-separated selector list into selector parts. */
export function parseSelectorList(selectorText: string): SelectorList {
  const rawSelectors = selectorText.split(',');
  const result: SelectorList = [];

  for (const selector of rawSelectors) {
    const trimmed = selector.trim();

    if (trimmed.length === 0) {
      continue;
    }

    try {
      const parts = parseSelector(trimmed);

      if (parts.length > 0 && parts[0]!.matchers.length > 0) {
        result.push(parts);
      }
    } catch {
      // Skip malformed selectors gracefully.
    }
  }

  return result;
}
