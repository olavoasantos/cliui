import type {DOMTokenList} from '../classes/DOMTokenList';

/** Writes token list values back to the owner attribute. */
export function setDomTokenListTokens(list: DOMTokenList, tokens: string[]): void {
  list.ownerElement.setAttribute(list.attributeName, tokens.join(' '));
}
