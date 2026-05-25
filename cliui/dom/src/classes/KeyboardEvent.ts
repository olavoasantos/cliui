import {UIEvent} from './UIEvent';
import type {KeyboardEventInit} from '../types';

/**
 * Represents a keyboard event dispatched from terminal input.
 */
export class KeyboardEvent extends UIEvent {
  /** Standard key location. */
  static DOM_KEY_LOCATION_STANDARD = 0;
  /** Left-side modifier key location. */
  static DOM_KEY_LOCATION_LEFT = 1;
  /** Right-side modifier key location. */
  static DOM_KEY_LOCATION_RIGHT = 2;
  /** Numpad key location. */
  static DOM_KEY_LOCATION_NUMPAD = 3;

  /** Key value string (e.g. `"a"`, `"Enter"`, `"ArrowUp"`). */
  readonly key: string;
  /** Physical key code string (e.g. `"KeyA"`, `"Enter"`). */
  readonly code: string;
  /** Key location on the keyboard (`DOM_KEY_LOCATION_*`). */
  readonly location: number;
  /** Whether the Control key was held. */
  readonly ctrlKey: boolean;
  /** Whether the Shift key was held. */
  readonly shiftKey: boolean;
  /** Whether the Alt key was held. */
  readonly altKey: boolean;
  /** Whether the Meta key was held. */
  readonly metaKey: boolean;
  /** Whether the key event is part of a repeated key press. */
  readonly repeat: boolean;
  /** Whether the key event occurred during an active composition session. */
  readonly isComposing: boolean;

  /**
   * Creates a keyboard event.
   *
   * @param type - Event type string.
   * @param eventInitDict - Optional init dict with key information and modifier flags.
   */
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
   *
   * @param key - Modifier key name (e.g. `"Alt"`, `"Control"`, `"Meta"`, `"Shift"`).
   * @returns `true` when the modifier is active for this event.
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
