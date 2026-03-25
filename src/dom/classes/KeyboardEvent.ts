import {UIEvent} from './UIEvent';
import type {KeyboardEventInit} from '../types';

/**
 * Represents a keyboard event dispatched from terminal input.
 */
export class KeyboardEvent extends UIEvent {
  static DOM_KEY_LOCATION_STANDARD = 0;
  static DOM_KEY_LOCATION_LEFT = 1;
  static DOM_KEY_LOCATION_RIGHT = 2;
  static DOM_KEY_LOCATION_NUMPAD = 3;

  readonly key: string;
  readonly code: string;
  readonly location: number;
  readonly ctrlKey: boolean;
  readonly shiftKey: boolean;
  readonly altKey: boolean;
  readonly metaKey: boolean;
  readonly repeat: boolean;
  readonly isComposing: boolean;

  constructor(type: string, eventInitDict?: KeyboardEventInit) {
    super(type, eventInitDict);

    this.key = eventInitDict?.key ?? '';
    this.code = eventInitDict?.code ?? '';
    this.location = eventInitDict?.location ?? 0;
    this.ctrlKey = eventInitDict?.ctrlKey ?? false;
    this.shiftKey = eventInitDict?.shiftKey ?? false;
    this.altKey = eventInitDict?.altKey ?? false;
    this.metaKey = eventInitDict?.metaKey ?? false;
    this.repeat = eventInitDict?.repeat ?? false;
    this.isComposing = eventInitDict?.isComposing ?? false;
  }

  /**
   * Returns the state of a modifier key.
   */
  getModifierState(key: string): boolean {
    switch (key.toLowerCase()) {
      case 'alt':
      case 'altgraph':
        return this.altKey;
      case 'control':
        return this.ctrlKey;
      case 'meta':
        return this.metaKey;
      case 'shift':
        return this.shiftKey;
      default:
        return false;
    }
  }
}
