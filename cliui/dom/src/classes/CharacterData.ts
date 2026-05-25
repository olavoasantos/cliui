import {DATA, HOOKS} from '../constants';
import type {Hooks} from '../types';
import {ChildNode} from './ChildNode';

/**
 * Base class for text-bearing nodes (`Text`, `Comment`).
 *
 * Provides a `data` property that holds the node's character content.
 * Setting `data` notifies the hooks bridge.
 */
export class CharacterData extends ChildNode {
  [DATA] = '';

  /**
   * @param data - Initial text content. Converted to a string; `null` and `undefined` become empty string.
   */
  constructor(data: unknown) {
    super();
    this[DATA] = data == null ? '' : String(data);
  }

  /** Updates character data and notifies the hooks bridge. */
  protected setData(data: unknown) {
    let str = '';
    const oldValue = this[DATA];
    if (data != null) {
      str = typeof data === 'string' ? data : String(data);
    }
    this[DATA] = str;
    (this[HOOKS] as Partial<Hooks>).setText?.(this as never, str, oldValue);
  }

  /** Character content of this node. */
  get data(): string {
    return this[DATA];
  }

  /** Sets the character content and notifies the hooks bridge. */
  set data(data: unknown) {
    this.setData(data);
  }
}
