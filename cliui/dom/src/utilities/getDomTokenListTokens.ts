import {DOM_TOKEN_LIST_SPLIT_REGEX} from '../constants/domTokenList';

import type {DOMTokenList} from '../classes/DOMTokenList';

/** Returns the deduplicated token list for a DOMTokenList. */
export function getDomTokenListTokens(list: DOMTokenList): string[] {
  const value = list.ownerElement.getAttribute(list.attributeName) ?? '';

  if (value.trim().length === 0) {
    return [];
  }

  const items: string[] = [];

  for (const item of value.trim().split(DOM_TOKEN_LIST_SPLIT_REGEX)) {
    if (!items.includes(item)) {
      items.push(item);
    }
  }

  return items;
}
