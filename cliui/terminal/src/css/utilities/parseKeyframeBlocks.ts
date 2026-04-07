import {findClosingBrace} from './findClosingBrace';
import {parseDeclarations} from './parseDeclarations';
import {skipWhitespaceAndComments} from './skipWhitespaceAndComments';

import type {KeyframeBlock} from '../types';

/**
 * Parses the body of a `@keyframes` rule into a list of keyframe blocks.
 *
 * Each block has one or more stop offsets (percentages) and a declaration list.
 * `from` is an alias for `0%`, `to` is an alias for `100%`.
 *
 * @param body - The text between the outer braces of a `@keyframes` rule.
 * @returns Sorted keyframe blocks.
 */
export function parseKeyframeBlocks(body: string): KeyframeBlock[] {
  const blocks: KeyframeBlock[] = [];
  let pos = 0;
  const len = body.length;

  while (pos < len) {
    pos = skipWhitespaceAndComments(body, pos);
    if (pos >= len) break;

    const braceIdx = body.indexOf('{', pos);
    if (braceIdx === -1) break;

    const selectorText = body.slice(pos, braceIdx).trim();
    if (!selectorText) {
      pos = braceIdx + 1;
      continue;
    }

    const closeIdx = findClosingBrace(body, braceIdx + 1);
    if (closeIdx === -1) break;

    const declarations = parseDeclarations(body.slice(braceIdx + 1, closeIdx));
    const offsets = parseOffsets(selectorText);

    if (offsets.length > 0 && declarations.length > 0) {
      blocks.push({offsets, declarations});
    }

    pos = closeIdx + 1;
  }

  blocks.sort((a, b) => a.offsets[0]! - b.offsets[0]!);
  return blocks;
}

function parseOffsets(selectorText: string): number[] {
  return selectorText.split(',').flatMap((part) => {
    const trimmed = part.trim().toLowerCase();

    if (trimmed === 'from') return [0];
    if (trimmed === 'to') return [100];

    if (trimmed.endsWith('%')) {
      const value = parseFloat(trimmed);
      if (!Number.isNaN(value)) return [value];
    }

    return [];
  });
}
