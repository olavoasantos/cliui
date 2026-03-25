import type {Element} from './Element';

const SPLIT_RE = /[\t\f\n\r ]+/;

/**
 * Returns the deduplicated token list from the attribute value.
 */
function getTokens(list: DOMTokenList): string[] {
  const value = list.ownerElement.getAttribute(list.attributeName) ?? '';
  if (!value.trim()) return [];
  const items: string[] = [];
  for (const item of value.trim().split(SPLIT_RE)) {
    if (!items.includes(item)) {
      items.push(item);
    }
  }
  return items;
}

/**
 * Sets the attribute on the owner element from the token array.
 */
function setTokens(list: DOMTokenList, tokens: string[]): void {
  list.ownerElement.setAttribute(list.attributeName, tokens.join(' '));
}

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
    return getTokens(this).length;
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
    return getTokens(this)[index] ?? null;
  }

  /**
   * Returns true if the list contains the given token.
   */
  contains(token: string): boolean {
    return getTokens(this).includes(token);
  }

  /**
   * Adds one or more tokens to the list.
   */
  add(...tokens: string[]): void {
    const list = getTokens(this);
    const existing = new Set(list);
    for (const token of tokens) {
      if (!existing.has(token)) {
        existing.add(token);
        list.push(token);
      }
    }
    setTokens(this, list);
  }

  /**
   * Removes one or more tokens from the list.
   */
  remove(...tokens: string[]): void {
    const toRemove = new Set(tokens);
    setTokens(
      this,
      getTokens(this).filter((t) => !toRemove.has(t)),
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
    const list = getTokens(this);
    const index = list.indexOf(oldToken);
    if (index === -1) return false;
    list[index] = newToken;
    setTokens(this, list);
    return true;
  }

  /**
   * Returns an iterator over the tokens.
   */
  [Symbol.iterator](): ArrayIterator<string> {
    return getTokens(this).values();
  }

  /**
   * Returns the serialized string representation.
   */
  toString(): string {
    return this.value;
  }
}
