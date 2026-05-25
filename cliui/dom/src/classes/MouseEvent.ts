import {UIEvent} from './UIEvent';
import type {EventTarget as DOMEventTarget} from './EventTarget';
import type {MouseEventInit} from '../types';

/**
 * Represents a mouse event dispatched from terminal input.
 */
export class MouseEvent extends UIEvent {
  /** Horizontal position relative to the screen. */
  readonly screenX: number;
  /** Vertical position relative to the screen. */
  readonly screenY: number;
  /** Horizontal position relative to the viewport. */
  readonly clientX: number;
  /** Vertical position relative to the viewport. */
  readonly clientY: number;
  /** Horizontal position relative to the target element. */
  readonly offsetX: number;
  /** Vertical position relative to the target element. */
  readonly offsetY: number;
  /** Whether the Control key was held. */
  readonly ctrlKey: boolean;
  /** Whether the Shift key was held. */
  readonly shiftKey: boolean;
  /** Whether the Alt key was held. */
  readonly altKey: boolean;
  /** Whether the Meta key was held. */
  readonly metaKey: boolean;
  /** Button number that triggered the event (0 = primary, 1 = middle, 2 = secondary). */
  readonly button: number;
  /** Bitmask of currently pressed buttons. */
  readonly buttons: number;
  /** Secondary target involved in the event (e.g. the element being exited during `mouseover`). `null` when there is no counterpart. */
  readonly relatedTarget: DOMEventTarget | null;

  /**
   * Creates a mouse event.
   *
   * @param type - Event type string.
   * @param eventInitDict - Optional init dict with coordinates, modifier flags, and button info.
   */
  constructor(type: string, eventInitDict?: MouseEventInit) {
    super(type, eventInitDict);

    this.screenX = eventInitDict?.screenX ?? 0;
    this.screenY = eventInitDict?.screenY ?? 0;
    this.clientX = eventInitDict?.clientX ?? 0;
    this.clientY = eventInitDict?.clientY ?? 0;
    this.offsetX = eventInitDict?.offsetX ?? 0;
    this.offsetY = eventInitDict?.offsetY ?? 0;
    this.ctrlKey = eventInitDict?.ctrlKey ?? false;
    this.shiftKey = eventInitDict?.shiftKey ?? false;
    this.altKey = eventInitDict?.altKey ?? false;
    this.metaKey = eventInitDict?.metaKey ?? false;
    this.button = eventInitDict?.button ?? 0;
    this.buttons = eventInitDict?.buttons ?? 0;
    this.relatedTarget = eventInitDict?.relatedTarget ?? null;
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
