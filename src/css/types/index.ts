import type {SelectorPart} from '../../dom/types/index';

/** A single CSS property declaration (e.g. `color: red`). */
export interface CSSDeclaration {
  property: string;
  value: string;
}

/** A parsed CSS rule: a selector list paired with its declarations. */
export interface CSSRule {
  /** Each element is a sequence of SelectorParts representing one selector in the comma-separated list. */
  selectors: SelectorPart[][];
  declarations: CSSDeclaration[];
}
