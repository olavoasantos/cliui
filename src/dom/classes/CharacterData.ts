import {DATA, HOOKS} from '../constants';
import type {Hooks} from '../types';
import {ChildNode} from './ChildNode';

export class CharacterData extends ChildNode {
  [DATA] = '';

  constructor(data: unknown) {
    super();
    this[DATA] = data == null ? '' : String(data);
  }

  protected setData(data: unknown) {
    let str = '';
    if (data != null) {
      str = typeof data === 'string' ? data : String(data);
    }
    this[DATA] = str;
    (this[HOOKS] as Partial<Hooks>).setText?.(this as never, str);
  }

  get data(): string {
    return this[DATA];
  }

  set data(data: unknown) {
    this.setData(data);
  }
}
