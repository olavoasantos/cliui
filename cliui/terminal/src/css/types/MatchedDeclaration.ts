import type {CSSDeclaration} from './index';

/** A matched declaration with its source specificity and rule order. */
export interface MatchedDeclaration {
  declaration: CSSDeclaration;
  specificity: [number, number, number];
  order: number;
}
