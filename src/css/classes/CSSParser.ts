import {findClosingBrace} from '../utilities/findClosingBrace';
import {parseDeclarations} from '../utilities/parseDeclarations';
import {parseSelectorList} from '../utilities/parseSelectorList';
import {skipBlock} from '../utilities/skipBlock';
import {skipWhitespaceAndComments} from '../utilities/skipWhitespaceAndComments';

import type {CSSRule} from '../types';

/**
 * Hand-written CSS parser that takes CSS text and produces a list of rules.
 * Each rule contains parsed selector ASTs and a list of property declarations.
 */
export class CSSParser {
  /** Parses a CSS string into a list of rules. */
  parse(css: string): CSSRule[] {
    const rules: CSSRule[] = [];
    let pos = 0;
    const len = css.length;

    while (pos < len) {
      pos = skipWhitespaceAndComments(css, pos);
      if (pos >= len) break;

      const braceIdx = css.indexOf('{', pos);
      if (braceIdx === -1) break;

      const selectorText = css.slice(pos, braceIdx).trim();
      if (!selectorText) {
        pos = skipBlock(css, braceIdx + 1);
        continue;
      }

      const closeIdx = findClosingBrace(css, braceIdx + 1);
      if (closeIdx === -1) break;

      const bodyText = css.slice(braceIdx + 1, closeIdx);
      const declarations = parseDeclarations(bodyText);
      const selectors = parseSelectorList(selectorText);

      if (selectors.length > 0 && declarations.length > 0) {
        rules.push({selectors, declarations});
      }

      pos = closeIdx + 1;
    }

    return rules;
  }
}
