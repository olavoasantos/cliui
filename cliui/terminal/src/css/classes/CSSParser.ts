import {findClosingBrace} from '../utilities/findClosingBrace';
import {parseDeclarations} from '../utilities/parseDeclarations';
import {parseSelectorList} from '../utilities/parseSelectorList';
import {skipBlock} from '../utilities/skipBlock';
import {skipWhitespaceAndComments} from '../utilities/skipWhitespaceAndComments';

import type {CSSParseResult} from '../types';

/**
 * Hand-written CSS parser that takes CSS text and produces a list of rules.
 * Each rule contains parsed selector ASTs and a list of property declarations.
 *
 * At-rules (`@identifier prelude { declarations }`) are collected generically
 * into `atRules` — the parser has no knowledge of specific at-rule semantics.
 * Consumers decide what to do with each identifier.
 */
export class CSSParser {
  /** Parses a CSS string into rules and at-rules. */
  parse(css: string): CSSParseResult {
    const result: CSSParseResult = {rules: [], atRules: []};
    let pos = 0;
    const len = css.length;

    while (pos < len) {
      pos = skipWhitespaceAndComments(css, pos);
      if (pos >= len) break;

      const braceIdx = css.indexOf('{', pos);
      if (braceIdx === -1) break;

      const prelude = css.slice(pos, braceIdx).trim();
      if (!prelude) {
        pos = skipBlock(css, braceIdx + 1);
        continue;
      }

      const closeIdx = findClosingBrace(css, braceIdx + 1);
      if (closeIdx === -1) break;

      const bodyText = css.slice(braceIdx + 1, closeIdx);

      if (prelude.charCodeAt(0) === 0x40 /* @ */) {
        const spaceIdx = prelude.indexOf(' ');
        const identifier = spaceIdx === -1 ? prelude.slice(1) : prelude.slice(1, spaceIdx);
        const atPrelude = spaceIdx === -1 ? '' : prelude.slice(spaceIdx + 1).trim();
        const declarations = parseDeclarations(bodyText);

        result.atRules.push({identifier, prelude: atPrelude, declarations});
      } else {
        const declarations = parseDeclarations(bodyText);
        const selectors = parseSelectorList(prelude);

        if (selectors.length > 0 && declarations.length > 0) {
          result.rules.push({selectors, declarations});
        }
      }

      pos = closeIdx + 1;
    }

    return result;
  }
}
