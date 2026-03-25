/**
 * Determines the terminal cell width of a string.
 *
 * Uses `Intl.Segmenter` for grapheme segmentation and East Asian Width data
 * for width classification. Zero runtime dependencies — `Intl.Segmenter` is
 * native to Node 22+.
 *
 * Width rules per grapheme cluster:
 * 1. Non-printing clusters (Default_Ignorable, Control, Format, Mark, Surrogate) → 0
 * 2. Emoji sequences (pictographic with presentation or ZWJ sequences) → 2
 * 3. East Asian Fullwidth or Wide code points → 2
 * 4. Everything else → 1
 *
 * @param input - The string to measure.
 * @returns The total terminal cell width.
 */
export function cellWidth(input: string): number {
  if (input.length === 0) {
    return 0;
  }

  // Strip ANSI escape sequences before measuring
  if (input.includes('\u001B') || input.includes('\u009B')) {
    input = stripAnsi(input);
  }

  if (input.length === 0) {
    return 0;
  }

  // Fast path: printable ASCII (0x20–0x7E) needs no segmenter or EAW lookup
  if (PRINTABLE_ASCII_REGEX.test(input)) {
    return input.length;
  }

  let width = 0;

  for (const {segment} of segmenter.segment(input)) {
    if (isZeroWidthCluster(segment)) {
      continue;
    }

    if (isEmojiPresentation(segment)) {
      width += 2;
      continue;
    }

    // EAW of the cluster's first visible code point
    const visible = baseVisible(segment);
    const codePoint = visible.codePointAt(0);

    if (codePoint !== undefined) {
      width += isFullWidthOrWide(codePoint) ? 2 : 1;
    }

    // Add width for trailing Halfwidth and Fullwidth Forms (e.g., dakuten)
    width += trailingHalfwidthWidth(segment);
  }

  return width;
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

const segmenter = new Intl.Segmenter();

const PRINTABLE_ASCII_REGEX = /^[\u0020-\u007E]*$/;

/** Matches clusters composed entirely of non-printing characters. */
const ZERO_WIDTH_CLUSTER_REGEX =
  /^(?:\p{Default_Ignorable_Code_Point}|\p{Control}|\p{Format}|\p{Mark}|\p{Surrogate})+$/u;

/** Strips leading non-printing characters to find the base visible scalar. */
const LEADING_NON_PRINTING_REGEX =
  /^(?:\p{Default_Ignorable_Code_Point}|\p{Control}|\p{Format}|\p{Mark}|\p{Surrogate})+/u;

/** Matches Extended_Pictographic characters globally. */
const EXTENDED_PICTOGRAPHIC_REGEX = /\p{Extended_Pictographic}/gu;

/** Variation Selector 16 — forces emoji presentation. */
const VS16 = '\uFE0F';

/** Zero-Width Joiner. */
const ZWJ = '\u200D';

/** Matches keycap sequences (digit/hash/asterisk + combining enclosing keycap). */
const UNQUALIFIED_KEYCAP_REGEX = /^[\d#*]\u20E3$/;

/** Matches ANSI escape sequences (CSI sequences and OSC sequences). */
const ANSI_REGEX =
  // eslint-disable-next-line no-control-regex
  /[\u001B\u009B][[\]()#;?]*(?:(?:(?:;[-a-zA-Z\d/#&.:=?%@~_]+)*|[a-zA-Z\d]+(?:;[-a-zA-Z\d/#&.:=?%@~_]*)*)?\u0007|(?:\d{1,4}(?:;\d{0,4})*)?[\d<=>A-PR-Za-z])/g;

/** Regional indicator symbols range (U+1F1E6 – U+1F1FF). */
const REGIONAL_INDICATOR_START = 0x1f1e6;
const REGIONAL_INDICATOR_END = 0x1f1ff;

function stripAnsi(input: string): string {
  return input.replace(ANSI_REGEX, '');
}

function isZeroWidthCluster(segment: string): boolean {
  return ZERO_WIDTH_CLUSTER_REGEX.test(segment);
}

function baseVisible(segment: string): string {
  return segment.replace(LEADING_NON_PRINTING_REGEX, '');
}

/**
 * Determines if a grapheme cluster should be rendered as a double-width emoji.
 *
 * Covers:
 * - Extended_Pictographic with VS16 (emoji presentation)
 * - ZWJ sequences with 2+ Extended_Pictographic (family, skin tone combos)
 * - Unqualified keycap sequences (digit + combining enclosing keycap)
 * - Flag sequences (regional indicator pairs)
 * - Single Extended_Pictographic that are in the Wide EAW range
 */
function isEmojiPresentation(segment: string): boolean {
  // Guard against pathological input
  if (segment.length > 50) {
    return false;
  }

  // Keycap sequences: digit/hash/asterisk + combining enclosing keycap
  if (UNQUALIFIED_KEYCAP_REGEX.test(segment)) {
    return true;
  }

  // Flag sequences: two regional indicator symbols
  const firstCp = segment.codePointAt(0);
  if (
    firstCp !== undefined &&
    firstCp >= REGIONAL_INDICATOR_START &&
    firstCp <= REGIONAL_INDICATOR_END
  ) {
    return true;
  }

  // Check for Extended_Pictographic content
  const pictographics = segment.match(EXTENDED_PICTOGRAPHIC_REGEX);
  if (pictographics === null) {
    return false;
  }

  // ZWJ sequences with 2+ pictographics (family emoji, etc.)
  if (segment.includes(ZWJ) && pictographics.length >= 2) {
    return true;
  }

  // Extended_Pictographic + VS16 = emoji presentation
  if (segment.includes(VS16)) {
    return true;
  }

  // Single Extended_Pictographic that are inherently double-width
  // (those in the Wide EAW range, like common emoji)
  if (pictographics.length >= 1 && firstCp !== undefined) {
    // If the first code point is an Extended_Pictographic and is Wide, it's 2
    if (isWide(firstCp)) {
      return true;
    }

    // Multi-codepoint clusters with pictographics and modifiers (skin tones)
    if (segment.length > 2 && pictographics.length >= 1) {
      return true;
    }
  }

  return false;
}

function trailingHalfwidthWidth(segment: string): number {
  let extra = 0;

  if (segment.length > 1) {
    for (const char of segment.slice(1)) {
      if (char >= '\uFF00' && char <= '\uFFEF') {
        const cp = char.codePointAt(0)!;
        extra += isFullWidthOrWide(cp) ? 2 : 1;
      }
    }
  }

  return extra;
}

// ---------------------------------------------------------------------------
// East Asian Width lookup
// ---------------------------------------------------------------------------

/**
 * Returns `true` when the code point has East Asian Width category
 * Fullwidth (F) or Wide (W).
 */
function isFullWidthOrWide(codePoint: number): boolean {
  return isFullWidth(codePoint) || isWide(codePoint);
}

function isInRange(ranges: readonly number[], codePoint: number): boolean {
  let low = 0;
  let high = Math.floor(ranges.length / 2) - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const i = mid * 2;

    if (codePoint < ranges[i]!) {
      high = mid - 1;
    } else if (codePoint > ranges[i + 1]!) {
      low = mid + 1;
    } else {
      return true;
    }
  }

  return false;
}

// prettier-ignore
const FULLWIDTH_RANGES = [12288, 12288, 65281, 65376, 65504, 65510] as const;

// prettier-ignore
const WIDE_RANGES = [4352, 4447, 8986, 8987, 9001, 9002, 9193, 9196, 9200, 9200, 9203, 9203, 9725, 9726, 9748, 9749, 9776, 9783, 9800, 9811, 9855, 9855, 9866, 9871, 9875, 9875, 9889, 9889, 9898, 9899, 9917, 9918, 9924, 9925, 9934, 9934, 9940, 9940, 9962, 9962, 9970, 9971, 9973, 9973, 9978, 9978, 9981, 9981, 9989, 9989, 9994, 9995, 10024, 10024, 10060, 10060, 10062, 10062, 10067, 10069, 10071, 10071, 10133, 10135, 10160, 10160, 10175, 10175, 11035, 11036, 11088, 11088, 11093, 11093, 11904, 11929, 11931, 12019, 12032, 12245, 12272, 12287, 12289, 12350, 12353, 12438, 12441, 12543, 12549, 12591, 12593, 12686, 12688, 12773, 12783, 12830, 12832, 12871, 12880, 42124, 42128, 42182, 43360, 43388, 44032, 55203, 63744, 64255, 65040, 65049, 65072, 65106, 65108, 65126, 65128, 65131, 94176, 94180, 94192, 94198, 94208, 101589, 101631, 101662, 101760, 101874, 110576, 110579, 110581, 110587, 110589, 110590, 110592, 110882, 110898, 110898, 110928, 110930, 110933, 110933, 110948, 110951, 110960, 111355, 119552, 119638, 119648, 119670, 126980, 126980, 127183, 127183, 127374, 127374, 127377, 127386, 127488, 127490, 127504, 127547, 127552, 127560, 127568, 127569, 127584, 127589, 127744, 127776, 127789, 127797, 127799, 127868, 127870, 127891, 127904, 127946, 127951, 127955, 127968, 127984, 127988, 127988, 127992, 128062, 128064, 128064, 128066, 128252, 128255, 128317, 128331, 128334, 128336, 128359, 128378, 128378, 128405, 128406, 128420, 128420, 128507, 128591, 128640, 128709, 128716, 128716, 128720, 128722, 128725, 128728, 128732, 128735, 128747, 128748, 128756, 128764, 128992, 129003, 129008, 129008, 129292, 129338, 129340, 129349, 129351, 129535, 129648, 129660, 129664, 129674, 129678, 129734, 129736, 129736, 129741, 129756, 129759, 129770, 129775, 129784, 131072, 196605, 196608, 262141] as const;

const COMMON_CJK = 0x4e00;
const [WIDE_FAST_START, WIDE_FAST_END] = findWideFastPathRange(WIDE_RANGES);

function findWideFastPathRange(ranges: readonly number[]): [number, number] {
  let fastStart = ranges[0]!;
  let fastEnd = ranges[1]!;

  for (let i = 0; i < ranges.length; i += 2) {
    const start = ranges[i]!;
    const end = ranges[i + 1]!;

    if (COMMON_CJK >= start && COMMON_CJK <= end) {
      return [start, end];
    }

    if (end - start > fastEnd - fastStart) {
      fastStart = start;
      fastEnd = end;
    }
  }

  return [fastStart, fastEnd];
}

function isFullWidth(codePoint: number): boolean {
  if (codePoint < FULLWIDTH_RANGES[0] || codePoint > FULLWIDTH_RANGES.at(-1)!) {
    return false;
  }

  return isInRange(FULLWIDTH_RANGES, codePoint);
}

function isWide(codePoint: number): boolean {
  if (codePoint >= WIDE_FAST_START && codePoint <= WIDE_FAST_END) {
    return true;
  }

  if (codePoint < WIDE_RANGES[0] || codePoint > WIDE_RANGES.at(-1)!) {
    return false;
  }

  return isInRange(WIDE_RANGES, codePoint);
}
