import {HOOKS} from '../constants';
import {LONGHAND_PROPERTIES, SHORTHAND_PROPERTIES} from '../constants/cssProperties';
import {camelToKebab} from '../utilities/camelToKebab';
import {expandShorthand} from '../utilities/expandShorthand';

import type {Element} from './Element';
import type {Hooks} from '../types';

const store = new WeakMap<
  CSSStyleDeclaration,
  {properties: Map<string, string>; element: Element | null}
>();

function getStore(declaration: CSSStyleDeclaration) {
  return store.get(declaration)!;
}

function notify(declaration: CSSStyleDeclaration) {
  const state = getStore(declaration);
  if (!state.element) return;
  const hooks = (state.element as unknown as {[HOOKS]: Partial<Hooks>})[HOOKS];
  hooks?.setAttribute?.(state.element, 'style', declaration.cssText);
}

/**
 * A CSSStyleDeclaration-like object that stores CSS property values
 * and notifies the hooks bridge when properties change.
 */
export class CSSStyleDeclaration {
  [property: string]: unknown;

  constructor(element?: Element) {
    store.set(this, {properties: new Map(), element: element ?? null});

    return new Proxy(this, {
      get(target, property) {
        if (typeof property === 'string' && property !== 'constructor') {
          const existing = (target as Record<string | symbol, unknown>)[property];
          if (typeof existing === 'function') return existing.bind(target);
          if (existing !== undefined) return existing;

          const kebabProperty = camelToKebab(property);
          if (LONGHAND_PROPERTIES.has(kebabProperty)) {
            return target.getPropertyValue(kebabProperty);
          }
        }

        return (target as Record<string | symbol, unknown>)[property];
      },
      set(target, property, value) {
        if (typeof property === 'string') {
          const kebabProperty = camelToKebab(property);
          if (LONGHAND_PROPERTIES.has(kebabProperty) || SHORTHAND_PROPERTIES.has(kebabProperty)) {
            target.setProperty(kebabProperty, String(value));
            return true;
          }
        }

        (target as Record<string | symbol, unknown>)[property] = value;
        return true;
      },
    });
  }

  /** Returns the number of explicitly set properties. */
  get length(): number {
    return getStore(this).properties.size;
  }

  /** Gets and sets the text of the style declaration. */
  get cssText(): string {
    const parts: string[] = [];
    for (const [key, value] of getStore(this).properties) {
      parts.push(`${key}: ${value}`);
    }
    return parts.join('; ');
  }

  set cssText(value: string) {
    const state = getStore(this);
    state.properties.clear();

    if (!value) {
      notify(this);
      return;
    }

    const declarations = value.split(';');
    for (const declaration of declarations) {
      const colonIndex = declaration.indexOf(':');
      if (colonIndex === -1) continue;

      const property = declaration.slice(0, colonIndex).trim();
      const propertyValue = declaration.slice(colonIndex + 1).trim();
      if (property && propertyValue) {
        this.setProperty(property, propertyValue, true);
      }
    }

    notify(this);
  }

  /** Returns the property name at the given index. */
  item(index: number): string {
    const keys = Array.from(getStore(this).properties.keys());
    return keys[index] ?? '';
  }

  /** Returns the value of a CSS property. */
  getPropertyValue(property: string): string {
    const kebabProperty = camelToKebab(property);
    return getStore(this).properties.get(kebabProperty) ?? '';
  }

  /** Sets a CSS property value, expanding shorthands as needed. */
  setProperty(property: string, value: string, batch = false): void {
    const kebabProperty = camelToKebab(property);
    const state = getStore(this);

    if (value === '' || value == null) {
      this.removeProperty(kebabProperty);
      return;
    }

    const expanded = expandShorthand(kebabProperty, value);
    if (expanded) {
      for (const [key, expandedValue] of Object.entries(expanded)) {
        state.properties.set(key, expandedValue);
      }
    } else if (LONGHAND_PROPERTIES.has(kebabProperty)) {
      state.properties.set(kebabProperty, value);
    }

    if (!batch) notify(this);
  }

  /** Removes a CSS property. */
  removeProperty(property: string): string {
    const kebabProperty = camelToKebab(property);
    const state = getStore(this);
    const shorthandLonghands = expandShorthand(kebabProperty, 'dummy');

    if (shorthandLonghands) {
      let oldValue = '';
      for (const key of Object.keys(shorthandLonghands)) {
        const value = state.properties.get(key);
        if (value) oldValue = value;
        state.properties.delete(key);
      }
      notify(this);
      return oldValue;
    }

    const oldValue = state.properties.get(kebabProperty) ?? '';
    state.properties.delete(kebabProperty);
    notify(this);
    return oldValue;
  }
}
