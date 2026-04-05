import {findClosingBrace} from '../utilities/findClosingBrace';
import {parseDeclarations} from '../utilities/parseDeclarations';
import {parseKeyframeBlocks} from '../utilities/parseKeyframeBlocks';
import {parseSelectorList} from '../utilities/parseSelectorList';
import {skipBlock} from '../utilities/skipBlock';
import {skipWhitespaceAndComments} from '../utilities/skipWhitespaceAndComments';

import type {CSSParseResult} from '../types';
import type {CSSConditionalRule} from '../types/CSSConditionalRule';
import type {KeyframeRule} from '../types/KeyframeRule';

/** Set of at-rule identifiers that contain nested CSS rules. */
const CONDITIONAL_AT_RULES = new Set(['media', 'container']);

/**
 * Hand-written CSS parser that takes CSS text and produces a list of rules.
 * Each rule contains parsed selector ASTs and a list of property declarations.
 *
 * At-rules (`@identifier prelude { declarations }`) are collected generically
 * into `atRules` — the parser has no knowledge of specific at-rule semantics.
 * Consumers decide what to do with each identifier.
 *
 * Conditional at-rules (`@media`, `@container`) contain nested CSS rules and
 * are collected into `conditionalRules`. Multiple levels of nesting are
 * supported (e.g. `@media` wrapping `@container`).
 */
export class CSSParser {
  /** Parses a CSS string into rules, at-rules, keyframe rules, and conditional rules. */
  parse(css: string): CSSParseResult {
    const result: CSSParseResult = {
      rules: [],
      atRules: [],
      keyframeRules: [],
      conditionalRules: [],
    };
    this.parseBlock(
      css,
      result.rules,
      result.atRules,
      result.keyframeRules,
      result.conditionalRules,
    );
    return result;
  }

  /**
   * Parses a CSS block body, populating the provided output arrays.
   * Shared between top-level parsing and recursive nested at-rule parsing.
   */
  private parseBlock(
    css: string,
    rules: CSSParseResult['rules'],
    atRules: CSSParseResult['atRules'],
    keyframeRules: KeyframeRule[],
    conditionalRules: CSSConditionalRule[],
  ): void {
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
        // Find the end of the identifier: first space or '(' (for minified CSS
        // where @media(... has no space between identifier and condition).
        const afterAt = prelude.slice(1);
        const spaceIdx = afterAt.indexOf(' ');
        const parenIdx = afterAt.indexOf('(');

        let splitIdx: number;
        if (spaceIdx === -1 && parenIdx === -1) {
          splitIdx = -1;
        } else if (spaceIdx === -1) {
          splitIdx = parenIdx;
        } else if (parenIdx === -1) {
          splitIdx = spaceIdx;
        } else {
          splitIdx = Math.min(spaceIdx, parenIdx);
        }

        const identifier = splitIdx === -1 ? afterAt : afterAt.slice(0, splitIdx);
        const atPrelude =
          splitIdx === -1 ? '' : afterAt.slice(splitIdx === parenIdx ? splitIdx : splitIdx + 1).trim();

        if (identifier === 'keyframes') {
          this.parseKeyframes(atPrelude, bodyText, keyframeRules);
        } else if (CONDITIONAL_AT_RULES.has(identifier)) {
          const nested = this.parseConditionalRule(identifier, atPrelude, bodyText);
          conditionalRules.push(nested);
        } else {
          const declarations = parseDeclarations(bodyText);
          atRules.push({identifier, prelude: atPrelude, declarations});
        }
      } else {
        const declarations = parseDeclarations(bodyText);
        const selectors = parseSelectorList(prelude);

        if (selectors.length > 0 && declarations.length > 0) {
          rules.push({selectors, declarations});
        }
      }

      pos = closeIdx + 1;
    }
  }

  /**
   * Parses a conditional at-rule body into nested rules and sub-conditional rules.
   * Supports arbitrary nesting depth (`@media` inside `@container` inside `@media`).
   */
  private parseConditionalRule(
    identifier: string,
    prelude: string,
    body: string,
  ): CSSConditionalRule {
    const result: CSSConditionalRule = {
      identifier,
      prelude,
      rules: [],
      conditionalRules: [],
    };

    // Re-use parseBlock to recursively parse the nested body.
    // Flat at-rules and keyframes inside conditionals are ignored (not valid CSS).
    const ignoredAtRules: CSSParseResult['atRules'] = [];
    const ignoredKeyframes: KeyframeRule[] = [];
    this.parseBlock(body, result.rules, ignoredAtRules, ignoredKeyframes, result.conditionalRules);

    return result;
  }

  private parseKeyframes(name: string, body: string, output: KeyframeRule[]): void {
    if (!name) return;

    const blocks = parseKeyframeBlocks(body);

    if (blocks.length > 0) {
      output.push({name, blocks});
    }
  }
}
