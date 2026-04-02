import {DATA} from '../constants';

import type {Node} from '../classes/Node';
import type {CharacterData} from '../classes/CharacterData';

/** Returns whether a node implements the CharacterData shape at runtime. */
export function CharacterDataGuard(node: Node): node is CharacterData {
  return DATA in node;
}
