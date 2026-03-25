import type {Element} from './Element';
import type {Hooks} from '../types/index';
import {HOOKS} from '../constants/index';

/**
 * Converts a camelCase property name to kebab-case.
 */
function camelToKebab(name: string): string {
  return name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
}

/** All supported longhand CSS property names (kebab-case). */
const LONGHAND_PROPERTIES = new Set([
  // Text styling
  'color',
  'background-color',
  'font-weight',
  'font-style',
  'text-decoration',
  'text-decoration-style',
  'text-decoration-color',
  'text-align',
  'vertical-align',
  'text-overflow',
  'white-space',
  'overflow',
  'opacity',
  // Box model
  'width',
  'height',
  'min-width',
  'min-height',
  'max-width',
  'max-height',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'margin-top',
  'margin-right',
  'margin-bottom',
  'margin-left',
  'border-style',
  'border-color',
  'border-width',
  'box-sizing',
  // Layout
  'display',
  'flex-direction',
  'flex-wrap',
  'flex-grow',
  'flex-shrink',
  'flex-basis',
  'row-gap',
  'column-gap',
  'justify-content',
  'align-items',
  'align-self',
  'position',
  'top',
  'left',
  'z-index',
]);

const SHORTHANDS = new Set(['padding', 'margin', 'gap', 'flex']);

/**
 * Expands a shorthand property into its longhand equivalents.
 * Returns null if the property is not a shorthand.
 */
export function expandShorthand(property: string, value: string): Record<string, string> | null {
  const parts = value.trim().split(/\s+/);

  switch (property) {
    case 'padding':
    case 'margin': {
      const [top, right = top, bottom = top, left = right] = parts as [string, ...string[]];
      return {
        [`${property}-top`]: top!,
        [`${property}-right`]: right!,
        [`${property}-bottom`]: bottom!,
        [`${property}-left`]: left!,
      };
    }
    case 'gap': {
      const [row, col = row] = parts as [string, ...string[]];
      return {
        'row-gap': row!,
        'column-gap': col!,
      };
    }
    case 'flex': {
      if (parts.length === 1) {
        const v = parts[0]!;
        if (v === 'none') {
          return {'flex-grow': '0', 'flex-shrink': '0', 'flex-basis': 'auto'};
        }
        if (v === 'auto') {
          return {'flex-grow': '1', 'flex-shrink': '1', 'flex-basis': 'auto'};
        }
        return {'flex-grow': v, 'flex-shrink': '1', 'flex-basis': '0'};
      }
      if (parts.length === 2) {
        return {
          'flex-grow': parts[0]!,
          'flex-shrink': parts[1]!,
          'flex-basis': '0',
        };
      }
      if (parts.length === 3) {
        return {
          'flex-grow': parts[0]!,
          'flex-shrink': parts[1]!,
          'flex-basis': parts[2]!,
        };
      }
      return null;
    }
    default:
      return null;
  }
}

// WeakMap-based storage to avoid private field issues with Proxy
const store = new WeakMap<
  CSSStyleDeclaration,
  {properties: Map<string, string>; element: Element | null}
>();

function getStore(decl: CSSStyleDeclaration) {
  return store.get(decl)!;
}

function notify(decl: CSSStyleDeclaration) {
  const s = getStore(decl);
  if (!s.element) return;
  const hooks = (s.element as unknown as {[HOOKS]: Partial<Hooks>})[HOOKS];
  hooks?.setAttribute?.(s.element, 'style', decl.cssText);
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
      get(target, prop) {
        if (typeof prop === 'string' && prop !== 'constructor') {
          const existing = (target as Record<string | symbol, unknown>)[prop];
          if (typeof existing === 'function') {
            return existing.bind(target);
          }
          if (existing !== undefined) {
            return existing;
          }
          const kebab = camelToKebab(prop);
          if (LONGHAND_PROPERTIES.has(kebab)) {
            return target.getPropertyValue(kebab);
          }
        }
        return (target as Record<string | symbol, unknown>)[prop];
      },
      set(target, prop, value) {
        if (typeof prop === 'string') {
          const kebab = camelToKebab(prop);
          if (LONGHAND_PROPERTIES.has(kebab) || SHORTHANDS.has(kebab)) {
            target.setProperty(kebab, String(value));
            return true;
          }
        }
        (target as Record<string | symbol, unknown>)[prop] = value;
        return true;
      },
    });
  }

  /**
   * Returns the number of explicitly set properties.
   */
  get length(): number {
    return getStore(this).properties.size;
  }

  /**
   * Gets and sets the text of the style declaration.
   */
  get cssText(): string {
    const parts: string[] = [];
    for (const [key, val] of getStore(this).properties) {
      parts.push(`${key}: ${val}`);
    }
    return parts.join('; ');
  }

  set cssText(value: string) {
    const s = getStore(this);
    s.properties.clear();
    if (!value) {
      notify(this);
      return;
    }
    const declarations = value.split(';');
    for (const decl of declarations) {
      const colonIdx = decl.indexOf(':');
      if (colonIdx === -1) continue;
      const prop = decl.slice(0, colonIdx).trim();
      const val = decl.slice(colonIdx + 1).trim();
      if (prop && val) {
        this.setProperty(prop, val, true);
      }
    }
    notify(this);
  }

  /**
   * Returns the property name at the given index.
   */
  item(index: number): string {
    const keys = Array.from(getStore(this).properties.keys());
    return keys[index] ?? '';
  }

  /**
   * Returns the value of a CSS property.
   */
  getPropertyValue(property: string): string {
    const kebab = camelToKebab(property);
    return getStore(this).properties.get(kebab) ?? '';
  }

  /**
   * Sets a CSS property value, expanding shorthands as needed.
   */
  setProperty(property: string, value: string, batch = false): void {
    const kebab = camelToKebab(property);
    const s = getStore(this);

    if (value === '' || value == null) {
      this.removeProperty(kebab);
      return;
    }

    const expanded = expandShorthand(kebab, value);
    if (expanded) {
      for (const [k, v] of Object.entries(expanded)) {
        s.properties.set(k, v);
      }
    } else if (LONGHAND_PROPERTIES.has(kebab)) {
      s.properties.set(kebab, value);
    }

    if (!batch) {
      notify(this);
    }
  }

  /**
   * Removes a CSS property.
   */
  removeProperty(property: string): string {
    const kebab = camelToKebab(property);
    const s = getStore(this);

    const shorthandLonghands = expandShorthand(kebab, 'dummy');
    if (shorthandLonghands) {
      let old = '';
      for (const key of Object.keys(shorthandLonghands)) {
        const val = s.properties.get(key);
        if (val) old = val;
        s.properties.delete(key);
      }
      notify(this);
      return old;
    }

    const old = s.properties.get(kebab) ?? '';
    s.properties.delete(kebab);
    notify(this);
    return old;
  }
}
