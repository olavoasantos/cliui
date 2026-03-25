import type {CSSDeclaration} from '../types';

/** Parses a CSS declaration block body into declarations. */
export function parseDeclarations(body: string): CSSDeclaration[] {
  const declarations: CSSDeclaration[] = [];
  const parts = body.split(';');

  for (const part of parts) {
    const colonIndex = part.indexOf(':');

    if (colonIndex === -1) {
      continue;
    }

    const property = part.slice(0, colonIndex).trim();
    const value = part.slice(colonIndex + 1).trim();

    if (property.length > 0 && value.length > 0) {
      declarations.push({property, value});
    }
  }

  return declarations;
}
