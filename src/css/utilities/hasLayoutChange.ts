import {LAYOUT_PROPERTIES} from '../constants/layoutProperties';

import type {ComputedStyle} from '../types';

/** Returns whether layout-affecting computed style values changed. */
export function hasLayoutChange(oldStyle: ComputedStyle | null, newStyle: ComputedStyle): boolean {
  if (oldStyle === null) {
    return true;
  }

  for (const property of LAYOUT_PROPERTIES) {
    if (oldStyle.get(property) !== newStyle.get(property)) {
      return true;
    }
  }

  return false;
}
