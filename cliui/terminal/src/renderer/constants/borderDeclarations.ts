import type {BorderCharacters} from '../types/BorderCharacters';

/** Property names allowed inside a `@border-style` at-rule. */
export const DECLARATION_TO_KEY: Record<string, keyof BorderCharacters> = {
  top: 'top',
  bottom: 'bottom',
  left: 'left',
  right: 'right',
  'top-left': 'topLeft',
  'top-right': 'topRight',
  'bottom-left': 'bottomLeft',
  'bottom-right': 'bottomRight',
};
