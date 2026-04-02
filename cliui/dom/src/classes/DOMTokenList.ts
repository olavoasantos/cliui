import {getDomTokenListTokens} from '../utilities/getDomTokenListTokens';
import {setDomTokenListTokens} from '../utilities/setDomTokenListTokens';

import type {Element} from './Element';

/**
 * A DOMTokenList-like object backed by an element attribute.
 * Provides add, remove, toggle, contains, replace, and iteration.
 */
export class DOMTokenList {
  readonly ownerElement: Element;
  readonly attributeName: string;

  constructor(element: Element, attributeName: string) {
    this.ownerElement = element;
    this.attributeName = attributeName;
  }

  /**
   * Returns the number of tokens.
   */
  get length(): number {
    return getDomTokenListTokens(this).length;
  }

  /**
   * Returns the serialized string value.
   */
  get value(): string {
    return this.ownerElement.getAttribute(this.attributeName) ?? '';
  }

  set value(val: string) {
    this.ownerElement.setAttribute(this.attributeName, val);
  }

  /**
   * Returns the token at the given index, or null.
   */
  item(index: number): string | null {
    return getDomTokenListTokens(this)[index] ?? null;
  }

  /**
   * Returns true if the list contains the given token.
   */
  contains(token: string): boolean {
    return getDomTokenListTokens(this).includes(token);
  }

  /**
   * Adds one or more tokens to the list.
   */
  add(...tokens: string[]): void {
    const list = getDomTokenListTokens(this);
    const existing = new Set(list);

    for (const token of tokens) {
      if (!existing.has(token)) {
        existing.add(token);
        list.push(token);
      }
    }

    setDomTokenListTokens(this, list);
  }

  /**
   * Removes one or more tokens from the list.
   */
  remove(...tokens: string[]): void {
    const toRemove = new Set(tokens);
    setDomTokenListTokens(
      this,
      getDomTokenListTokens(this).filter((tokenValue) => !toRemove.has(tokenValue)),
    );
  }

  /**
   * Toggles a token. Returns true if the token is present after the call.
   */
  toggle(token: string, force?: boolean): boolean {
    const shouldAdd = force !== undefined ? force : !this.contains(token);
    if (shouldAdd) {
      this.add(token);
      return true;
    }
    this.remove(token);
    return false;
  }

  /**
   * Replaces a token with another. Returns true if the old token was found.
   */
  replace(oldToken: string, newToken: string): boolean {
    const list = getDomTokenListTokens(this);
    const index = list.indexOf(oldToken);

    if (index === -1) {
      return false;
    }

    list[index] = newToken;
    setDomTokenListTokens(this, list);
    return true;
  }

  /**
   * Returns an iterator over the tokens.
   */
  [Symbol.iterator](): ArrayIterator<string> {
    return getDomTokenListTokens(this).values();
  }

  /**
   * Returns the serialized string representation.
   */
  toString(): string {
    return this.value;
  }
}
