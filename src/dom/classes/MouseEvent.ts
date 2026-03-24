import {UIEvent} from './UIEvent';
import type {EventTarget as DOMEventTarget} from './EventTarget';
import type {MouseEventInit} from '../types/index';

/**
 * Represents a mouse event dispatched from terminal input.
 */
export class MouseEvent extends UIEvent {
  readonly screenX: number;
  readonly screenY: number;
  readonly clientX: number;
  readonly clientY: number;
  readonly ctrlKey: boolean;
  readonly shiftKey: boolean;
  readonly altKey: boolean;
  readonly metaKey: boolean;
  readonly button: number;
  readonly buttons: number;
  readonly relatedTarget: DOMEventTarget | null;

  constructor(type: string, eventInitDict?: MouseEventInit) {
    super(type, eventInitDict);

    this.screenX = eventInitDict?.screenX ?? 0;
    this.screenY = eventInitDict?.screenY ?? 0;
    this.clientX = eventInitDict?.clientX ?? 0;
    this.clientY = eventInitDict?.clientY ?? 0;
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
