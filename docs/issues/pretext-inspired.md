# Pretext-Inspired Text Layout Improvements

> Issues derived from studying the [pretext](https://github.com/chenglou/pretext) library — a pure JS/TS multiline text measurement & layout engine with 100% browser accuracy across Chrome, Safari, and Firefox.
>
> **Reference location:** `.ignore/references/pretext/`
>
> Pretext's core insight is a two-phase model: `prepare()` does expensive text analysis + measurement once, `layout()` is then pure arithmetic on cached widths. While pretext targets pixel-based browser rendering, many of its text segmentation, line-breaking, and whitespace-handling techniques directly improve our terminal cell-based text layout.

---

## PTX-1: Word-aware line breaking with `Intl.Segmenter` word boundaries

**Priority:** High  
**Depends on:** —  
**Files to study:** `.ignore/references/pretext/src/analysis.ts` (lines 74–97: `buildMergedSegmentation`, word segmenter usage)

### Problem

Our `TextLayout.measureNormal()` (`src/layout/classes/TextLayout.ts`, lines 48–100) splits text on ASCII spaces only (`collapsed.split(' ')`). This produces incorrect line breaks for:

- **CJK text** — Chinese/Japanese/Korean characters should break between *any* two characters, not only at spaces.
- **Thai/Khmer/Myanmar** — these scripts have no spaces between words; `Intl.Segmenter` with `granularity: 'word'` is required.
- **Mixed-script text** — e.g. `"Hello 世界 test"` should allow breaks around CJK characters.

### Approach

Replace the naive `split(' ')` approach in `TextLayout.measureNormal()` with `Intl.Segmenter` word-boundary segmentation, similar to pretext's `buildMergedSegmentation()`.

1. Segment text using `Intl.Segmenter(undefined, { granularity: 'word' })`.
2. Classify each segment as `text`, `space`, etc.
3. Walk segments accumulating cell widths; break lines when accumulated width exceeds `availableWidth`.
4. CJK graphemes should each be their own break unit (pretext splits CJK words into individual graphemes in `measureAnalysis()` — see `.ignore/references/pretext/src/layout.ts`, lines 166–197).

### Files to create or modify

- `src/layout/classes/TextLayout.ts` — rewrite `measureNormal()` to use word-segmented line breaking.
- `src/layout/utilities/isCJK.ts` — new utility ported from pretext's `isCJK()` (`.ignore/references/pretext/src/analysis.ts`, lines 98–119).
- `src/layout/types/index.ts` — add a `TextSegment` type if needed for the internal segment representation.
- `src/layout/classes/specs/TextLayout.unit.ts` — add tests for CJK, Thai, mixed-script word breaking.

### Expected outcomes

- CJK text wraps correctly at character boundaries.
- Thai/Khmer text wraps at word boundaries using `Intl.Segmenter`.
- Mixed-script paragraphs wrap correctly at natural break points.

---

## PTX-2: Punctuation attachment rules (kinsoku, sticky punctuation)

**Priority:** High  
**Depends on:** PTX-1  
**Files to study:** `.ignore/references/pretext/src/analysis.ts` (lines 121–216: kinsoku sets, sticky punctuation sets, `leftStickyPunctuation`, `kinsokuStart`, `kinsokuEnd`)

### Problem

Our text layout has no concept of punctuation attachment. This means:

- A closing comma or period can start a new line: `"Hello\n,"` — ugly and wrong in every typographic tradition.
- CJK punctuation like `。` or `、` can appear at the start of a line (kinsoku-shori violation).
- Opening quotes like `"` or `「` can appear at the end of a line, separated from the word they introduce.

### Approach

Implement punctuation attachment as a post-segmentation merge pass, following pretext's approach:

1. **Left-sticky punctuation** (`.ignore/references/pretext/src/analysis.ts`, `leftStickyPunctuation` set, line 163): attach closing punctuation (`.`, `,`, `!`, `)`, `"`, Arabic comma `،`, Devanagari danda `।`, etc.) to the preceding segment.
2. **Kinsoku start prohibition** (`kinsokuStart` set, line 121): CJK closing marks that must not start a line — attach to preceding segment.
3. **Kinsoku end / forward-sticky** (`kinsokuEnd` set, line 148): opening brackets/quotes that must not end a line — attach to the following segment.

### Files to create or modify

- `src/layout/constants/kinsoku.ts` — new file with `KINSOKU_START`, `KINSOKU_END`, `LEFT_STICKY_PUNCTUATION` character sets, ported from pretext's analysis.ts.
- `src/layout/classes/TextLayout.ts` — add a segment-merging pass after word segmentation that applies punctuation attachment.
- `src/layout/classes/specs/TextLayout.unit.ts` — add tests for punctuation attachment (Latin, CJK, Arabic, Devanagari).

### Expected outcomes

- `"hello."` stays together — period never starts a new line.
- `「下人` stays together — CJK opening quote attached to next character.
- `文，` stays together — CJK comma attached to preceding character.
- Arabic punctuation `،` and `؟` attach to the preceding word.

---

## PTX-3: `overflow-wrap: break-word` support

**Priority:** High  
**Depends on:** PTX-1  
**Files to study:** `.ignore/references/pretext/src/line-break.ts` (lines 77–100: `appendBreakableSegmentFrom`), `.ignore/references/pretext/src/measurement.ts` (`getSegmentGraphemeWidths`)

### Problem

Our `TextLayout.breakWord()` (`src/layout/classes/TextLayout.ts`, lines 193–213) already breaks long words at grapheme boundaries, but there's no CSS property to control this. The break-word behavior is always on for words that exceed the line width. CSS `overflow-wrap: break-word` and `word-break: break-all` should be explicit opt-ins.

### Approach

1. Add `overflow-wrap` and `word-break` to the supported CSS property list.
2. In `TextLayout`, only break mid-word when `overflow-wrap: break-word` (or `word-break: break-all`) is set. With `overflow-wrap: normal`, long words should overflow rather than break.
3. Pre-compute per-grapheme widths for breakable segments (as pretext does with `breakableWidths`), so break positions are calculated in O(1) per grapheme.

### Files to create or modify

- `src/dom/constants/cssProperties.ts` — add `'overflow-wrap'` and `'word-break'` to `LONGHAND_PROPERTIES`.
- `src/css/constants/initialValues.ts` — add `'overflow-wrap': 'normal'` and `'word-break': 'normal'`.
- `src/css/constants/inheritableProperties.ts` — add both (they are inherited).
- `src/layout/types/index.ts` — extend `TextLayoutOptions` with `overflowWrap` and `wordBreak`.
- `src/layout/classes/TextLayout.ts` — conditionally enable word breaking based on options.
- `src/layout/classes/LayoutEngine.ts` — pass new properties from computed style to `TextLayout.measure()`.
- `src/layout/classes/specs/TextLayout.unit.ts` — test both modes.

### Expected outcomes

- Default behavior (`overflow-wrap: normal`): long words overflow their container.
- `overflow-wrap: break-word`: long words break at grapheme boundaries (current behavior, now opt-in).
- `word-break: break-all`: all text breaks between any two characters.

---

## PTX-4: Trailing whitespace hanging (CSS-compliant space handling)

**Priority:** Medium  
**Depends on:** PTX-1  
**Files to study:** `.ignore/references/pretext/src/line-break.ts` (the `lineEndFitAdvances` / `lineEndPaintAdvances` distinction throughout)

### Problem

In CSS, trailing whitespace at the end of a line "hangs" — it doesn't contribute to the line's width for line-breaking purposes, but it may be painted. Our `TextLayout.measureNormal()` treats spaces as having width during line-break decisions, which can cause premature line breaks.

Pretext solves this by maintaining separate `lineEndFitAdvances` (width for break decisions — excludes trailing space) and `lineEndPaintAdvances` (visible width — includes trailing space for paint).

### Approach

During line-breaking, when checking if a segment fits, use the "fit width" which excludes trailing spaces. When reporting the line's width, use the "paint width" which reflects what's actually visible.

### Files to create or modify

- `src/layout/classes/TextLayout.ts` — modify line-breaking to not count trailing spaces toward the line width limit.
- `src/layout/classes/specs/TextLayout.unit.ts` — add tests verifying trailing space doesn't trigger a premature break.

### Expected outcomes

- `"Hello "` in a container exactly as wide as `"Hello"` renders on one line, not two.
- Trailing spaces are preserved in the text content but don't force line breaks.

---

## PTX-5: Special Unicode break characters (ZWSP, NBSP, soft hyphen)

**Priority:** Medium  
**Depends on:** PTX-1  
**Files to study:** `.ignore/references/pretext/src/analysis.ts` (lines 228–248: `classifySegmentBreakChar`), `.ignore/references/pretext/src/line-break.ts` (soft hyphen handling throughout, `discretionaryHyphenWidth`)

### Problem

Our text layout has no support for:

- **Zero-width space** (`U+200B`) — explicit break opportunity with no visible width.
- **Non-breaking space** (`U+00A0`) — glue that prevents line breaks.
- **Soft hyphen** (`U+00AD`) — break opportunity that shows a hyphen when used.
- **Word joiner** (`U+2060`) — prevents breaks (like NBSP but zero width).

### Approach

Port pretext's break-character classification into our segment analysis:

1. **NBSP / narrow NBSP / word joiner** → classify as `glue`, merge with adjacent text (never break here).
2. **Zero-width space** → classify as `zero-width-break`, allow line break with 0 width.
3. **Soft hyphen** → classify as `soft-hyphen`, allow break with visible hyphen added to the line.

### Files to create or modify

- `src/layout/types/SegmentBreakKind.ts` — new type: `'text' | 'space' | 'glue' | 'zero-width-break' | 'soft-hyphen' | 'hard-break'`.
- `src/layout/utilities/classifyBreakKind.ts` — new utility that classifies characters into break kinds.
- `src/layout/classes/TextLayout.ts` — update line-breaking to handle each break kind.
- `src/layout/classes/specs/TextLayout.unit.ts` — add tests for ZWSP, NBSP, soft hyphen.

### Expected outcomes

- `"alpha\u200Bbeta"` can break between alpha and beta (zero width break).
- `"10\u00A0000"` never breaks (non-breaking space).
- `"trans\u00ADatlantic"` shows as `"transatlantic"` when it fits, or `"trans-\natlantic"` when broken.

---

## PTX-6: Whitespace normalization alignment with CSS spec

**Priority:** Medium  
**Depends on:** —  
**Files to study:** `.ignore/references/pretext/src/analysis.ts` (lines 37–67: `normalizeWhitespaceNormal`, `normalizeWhitespacePreWrap`)

### Problem

Our `TextLayout.collapseWhitespace()` (`src/layout/classes/TextLayout.ts`, line 186) uses a simple `text.replace(/\s+/g, ' ').trim()`. This doesn't match the CSS spec:

- `\t`, `\r`, `\f` should be collapsed to spaces in `white-space: normal` mode.
- In `pre-wrap` mode, `\r\n` should normalize to `\n`, `\r` and `\f` should normalize to `\n`, but ordinary spaces should be preserved.
- Leading/trailing whitespace collapsing has edge cases with inter-element boundaries.

Pretext's `normalizeWhitespaceNormal()` and `normalizeWhitespacePreWrap()` handle these correctly.

### Files to create or modify

- `src/layout/utilities/normalizeWhitespace.ts` — new utility with `normalizeWhitespaceNormal()` and `normalizeWhitespacePreWrap()`, ported from pretext.
- `src/layout/classes/TextLayout.ts` — replace `collapseWhitespace()` with the new utility.
- `src/layout/utilities/specs/normalizeWhitespace.unit.ts` — tests for edge cases.

### Expected outcomes

- Tab characters in normal mode collapse to spaces.
- `\r\n` in pre-wrap mode normalizes to `\n`.
- Whitespace normalization matches CSS spec behavior.

---

## PTX-7: `pre-wrap` tab stop support

**Priority:** Medium  
**Depends on:** PTX-1  
**Files to study:** `.ignore/references/pretext/src/line-break.ts` (lines 48–54: `getTabAdvance`), `.ignore/references/pretext/src/layout.test.ts` (pre-wrap tab tests)

### Problem

Our `TextLayout.measurePreWrap()` treats tabs as regular characters. CSS `tab-size` defines tab stops, and in `pre-wrap` mode, tabs should advance to the next tab stop position. This matters for code display, terminal output, and any textarea-like component.

Pretext calculates tab advance as: advance to the next multiple of `spaceWidth * tabSize` from the current line position.

### Approach

1. Add `tab-size` CSS property support (default: 8, matching browser default).
2. In `pre-wrap` mode, when encountering a `\t`, calculate the advance to the next tab stop.
3. Tabs should hang at line end (like trailing spaces) — they're whitespace.

### Files to create or modify

- `src/dom/constants/cssProperties.ts` — add `'tab-size'` to `LONGHAND_PROPERTIES`.
- `src/css/constants/initialValues.ts` — add `'tab-size': '8'`.
- `src/css/constants/inheritableProperties.ts` — add `'tab-size'` (inherited).
- `src/layout/types/index.ts` — extend `TextLayoutOptions` with `tabSize`.
- `src/layout/classes/TextLayout.ts` — implement tab stop calculation in `measurePreWrap()`.
- `src/layout/classes/LayoutEngine.ts` — pass `tab-size` from computed style.
- `src/layout/classes/specs/TextLayout.unit.ts` — tab stop tests.

### Expected outcomes

- `"a\tb"` in pre-wrap mode advances to the correct tab stop.
- Consecutive tabs advance to successive tab stops.
- Tab stops restart after hard breaks.

---

## PTX-8: URL and numeric run merging

**Priority:** Low  
**Depends on:** PTX-1  
**Files to study:** `.ignore/references/pretext/src/analysis.ts` (lines 302–430: `mergeUrlLikeRuns`, `mergeNumericRuns`, `mergeAsciiPunctuationChains`)

### Problem

Our naive space-splitting breaks URLs and numeric expressions at awkward points:

- `"https://example.com/path"` could break at every `/` or `.`
- `"7:00-9:00"` could break between `7:00` and `9:00`
- `"SSN 420-69-8008"` could break at each `-`
- `"foo;bar"` (no-space punctuation chains) could break at `;`

### Approach

After word segmentation, apply merge passes that keep these constructs together as single breakable units:

1. **URL runs:** detect `scheme://` or `www.` prefixes, merge following segments until whitespace.
2. **Numeric runs:** merge digit-joiner sequences (`7:00-9:00`, `२४×७`).
3. **ASCII punctuation chains:** merge `foo;bar`, `foo:bar` patterns.

### Files to create or modify

- `src/layout/utilities/mergeUrlRuns.ts` — URL detection and merging.
- `src/layout/utilities/mergeNumericRuns.ts` — numeric expression merging.
- `src/layout/classes/TextLayout.ts` — apply merge passes after segmentation.
- Tests for each merge utility.

### Expected outcomes

- URLs are kept together as one breakable unit.
- Numeric expressions like `7:00-9:00` don't break mid-expression.

---

## PTX-9: Two-phase text measurement architecture (prepare/layout split)

**Priority:** Low  
**Depends on:** PTX-1, PTX-2, PTX-3, PTX-5  
**Files to study:** `.ignore/references/pretext/src/layout.ts` (entire file — the `prepare`/`layout` architecture)

### Problem

Our `TextLayout.measure()` re-segments, re-classifies, and re-measures text on every call. In terminal UI, resize events can trigger full relayout of every text node. Currently this means re-running `Intl.Segmenter` and `cellWidth()` for every piece of text on every resize.

Pretext's architecture proves that separating the expensive work (`prepare()` — segmentation + measurement) from the cheap work (`layout()` — pure arithmetic on cached widths) produces ~200x speedup on the layout hot path.

### Approach

Adopt the two-phase pattern for terminal text:

1. **`prepareText(text, options)`** — segment, classify break kinds, measure per-segment cell widths, cache. Returns an opaque `PreparedText` handle.
2. **`layoutText(prepared, width)`** — pure arithmetic walk over cached widths. No `cellWidth()` calls, no `Intl.Segmenter` calls.

This is an internal refactor — the `TextLayout` class API can stay the same but internally cache prepared text and re-layout cheaply on resize.

### Files to create or modify

- `src/layout/types/PreparedText.ts` — new type for the cached measurement data.
- `src/layout/utilities/prepareText.ts` — new utility: segment, classify, measure, cache.
- `src/layout/utilities/layoutPreparedText.ts` — new utility: arithmetic-only line breaking.
- `src/layout/classes/TextLayout.ts` — refactor to use prepare/layout internally.
- `src/layout/classes/LayoutEngine.ts` — cache `PreparedText` per text node, invalidate on text change.
- Benchmarks in `src/layout/classes/specs/TextLayout.bench.ts`.

### Expected outcomes

- First render: same performance (segmentation + measurement happens once).
- Subsequent relayouts (resize): dramatically faster (arithmetic only, no re-measurement).
- Layout engine can cache prepared text per text node and only re-prepare when content changes.

---

## PTX-10: Bidi text metadata for mixed LTR/RTL rendering

**Priority:** Low  
**Depends on:** PTX-9  
**Files to study:** `.ignore/references/pretext/src/bidi.ts` (entire file — simplified Unicode Bidi Algorithm)

### Problem

Our renderer has no support for bidirectional text. Arabic, Hebrew, and other RTL scripts render left-to-right, which is incorrect. In mixed-direction text like `"Hello مرحبا World"`, the Arabic portion should render right-to-left while the Latin portions render left-to-right.

Pretext includes a simplified bidi implementation (forked from pdf.js) that classifies characters into bidi types, computes embedding levels, and maps them onto prepared segments.

### Approach

This is a forward-looking issue. Terminal bidi is complex because cell-based rendering doesn't natively support RTL reordering. The approach would be:

1. Port pretext's `computeBidiLevels()` to produce per-segment bidi levels.
2. When painting text lines, reorder segments within each line according to bidi levels.
3. This only affects the paint order, not the logical text storage.

### Files to create or modify

- `src/layout/utilities/computeBidiLevels.ts` — port of pretext's simplified bidi algorithm.
- `src/renderer/classes/Painter.ts` — apply bidi reordering when painting text.
- Tests for bidi level computation and visual reordering.

### Expected outcomes

- Arabic/Hebrew text renders right-to-left within its run.
- Mixed LTR/RTL text reorders correctly on each visual line.
- Logical text order is preserved in the DOM; only visual rendering changes.
