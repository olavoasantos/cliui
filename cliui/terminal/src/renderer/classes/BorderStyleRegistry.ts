import {BORDER_CHARACTERS} from '../constants/borders';
import {DECLARATION_TO_KEY} from '../constants/borderDeclarations';
import {unquote} from '../utilities/unquote';

import type {BorderCharacters} from '../types/BorderCharacters';
import type {CSSAtRule} from '../../css/types';

/**
 * Registry of border character sets used by the renderer's `Painter`.
 *
 * Pre-populated with the built-in styles (`single`, `rounded`, `double`,
 * `thick`, `ascii`, `hidden`, `block`, `half-block`).  Custom styles
 * registered via `@border-style` at-rules in `<style>` blocks are added
 * on top and override built-ins of the same name.
 */
export class BorderStyleRegistry {
  private readonly styles = new Map<string, BorderCharacters>();

  constructor() {
    for (const [name, chars] of Object.entries(BORDER_CHARACTERS)) {
      this.styles.set(name, chars);
    }
  }

  /**
   * Registers a border style from a parsed `@border-style` at-rule.
   * The at-rule's `prelude` is used as the style name.  Declarations
   * map CSS property names (`top`, `bottom-left`, etc.) to character
   * values (optionally quoted).
   */
  register(rule: CSSAtRule): void {
    const base: BorderCharacters = {
      topLeft: ' ',
      topRight: ' ',
      bottomLeft: ' ',
      bottomRight: ' ',
      top: ' ',
      bottom: ' ',
      left: ' ',
      right: ' ',
    };

    for (const {property, value} of rule.declarations) {
      const key = DECLARATION_TO_KEY[property];

      if (key) {
        base[key] = unquote(value);
      }
    }

    this.styles.set(rule.prelude, base);
  }

  /**
   * Resolves a border style name to its character set.
   * Falls back to `single` when the name is not registered.
   */
  get(name: string): BorderCharacters {
    return this.styles.get(name) ?? this.styles.get('single')!;
  }

  /** Returns whether a style name is registered. */
  has(name: string): boolean {
    return this.styles.has(name);
  }
}
