# Pretext-Inspired Text Layout Improvements

> Issues derived from studying the [pretext](https://github.com/chenglou/pretext) library — a pure JS/TS multiline text measurement & layout engine with 100% browser accuracy across Chrome, Safari, and Firefox.
>
> **Reference location:** `.ignore/references/pretext/`
>
> Pretext's core insight is a two-phase model: `prepare()` does expensive text analysis + measurement once, `layout()` is then pure arithmetic on cached widths. While pretext targets pixel-based browser rendering, many of its text segmentation, line-breaking, and whitespace-handling techniques directly improve our terminal cell-based text layout.
>
> ### Implementation order rationale
>
> The first attempted implementation of this milestone applied `Intl.Segmenter` word segmentation directly in the `TextLayout.measure()` hot path, producing a **70–80% regression** on LayoutEngine benchmarks. The segmenter is far more expensive than `string.split(' ')` and was re-running on every text node every frame.
>
> The corrected order below follows pretext's actual architecture: **caching infrastructure first, then expensive analysis**. PTX-1 (the two-phase prepare/layout split) must land before any segmentation changes so that `Intl.Segmenter` runs once per text change, not once per frame. PTX-2 adds an ASCII fast-path so the common case pays zero segmenter cost. Only then do the remaining issues layer on correctness improvements that execute exclusively in the prepare phase.

---

## PTX-1: Two-phase text measurement architecture (prepare/layout split)

**Priority:** Critical — must land first  
**Depends on:** —  
**Files to study:** `.ignore/references/pretext/src/layout.ts` (entire file — the `prepare`/`layout` architecture), `.ignore/references/pretext/src/line-break.ts` (the arithmetic-only line walker)

### Problem

`TextLayout.measure()` re-splits, re-iterates, and re-measures text via `cellWidth()` on every call. `LayoutEngine` calls `measure()` for every text node on every frame. On resize, every text node is re-measured from scratch even though only the available width changed — the text content, word boundaries, and per-word widths are all identical.

Pretext proves that separating the expensive work (`prepare()` — segmentation + measurement) from the cheap work (`layout()` — pure arithmetic on cached widths) makes the resize hot path ~200x faster.

### Approach

1. Create a `PreparedText` type that stores parallel arrays: segment texts, pre-measured cell widths, break-kind classifications, and per-grapheme widths for breakable segments.
2. Create a `prepareText(text, options)` utility that produces a `PreparedText` by running the current `measureNormal` logic (split on spaces, measure with `cellWidth`, classify segments) but storing the results instead of immediately line-breaking.
3. Create a `layoutPreparedText(prepared, width)` utility that walks the cached widths with pure arithmetic — no `cellWidth` calls, no `Intl.Segmenter`, no string splitting.
4. Refactor `TextLayout.measure()` to call `prepareText` then `layoutPreparedText` internally.
5. Wire `LayoutEngine` to cache `PreparedText` per text node (keyed by text content + options), invalidating only when `setText` fires through the hooks bridge. On resize, the cached `PreparedText` is reused and only `layoutPreparedText` runs.

**Critical constraint:** the initial prepare phase must use the existing `split(' ')` approach — do NOT introduce `Intl.Segmenter` in this issue. The goal is pure caching infrastructure with zero behavior change and zero performance regression. The segmenter comes in PTX-3.

### Files to create or modify

- `src/layout/types/PreparedText.ts` — new type for cached measurement data.
- `src/layout/utilities/prepareText.ts` — new utility: split, measure, cache widths.
- `src/layout/utilities/layoutPreparedText.ts` — new utility: arithmetic-only line breaking.
- `src/layout/classes/TextLayout.ts` — refactor to use prepare/layout internally.
- `src/layout/classes/LayoutEngine.ts` — add `PreparedText` cache keyed by text content, invalidate on text changes.
- `src/layout/classes/specs/TextLayout.unit.ts` — all existing tests must pass unchanged (behavior-preserving refactor).
- `src/layout/classes/specs/TextLayout.bench.ts` — add benchmarks comparing `measure()` with cold vs warm cache.
- `src/layout/utilities/specs/prepareText.unit.ts` — test preparation invariants.
- `src/layout/utilities/specs/layoutPreparedText.unit.ts` — test arithmetic-only layout produces identical results to `measure()`.

### Expected outcomes

- All existing `TextLayout` tests pass with identical results (zero behavior change).
- First `measure()` call: same performance as before (prepare + layout).
- Subsequent `measure()` calls with same text but different width: dramatically faster (arithmetic-only, no `cellWidth`, no splitting).
- `LayoutEngine` benchmarks show improvement on re-layout scenarios.
- Performance baseline established before any segmentation changes land.

---

## PTX-2: ASCII fast-path detection

**Priority:** Critical — must land before any segmentation changes  
**Depends on:** PTX-1  
**Files to study:** `.ignore/references/pretext/src/analysis.ts` (lines 57–60: `needsWhitespaceNormalizationRe` fast-path check)

### Problem

Most terminal UI text is ASCII. The upcoming segmentation improvements (PTX-3+) will introduce `Intl.Segmenter`, which is orders of magnitude slower than `string.split(' ')`. Without a fast-path, every text node pays the segmenter cost even when `split(' ')` produces correct results.

### Approach

1. Add an `isAsciiText(text)` utility that returns `true` when the text contains only printable ASCII characters and spaces (code points `0x20`–`0x7E`).
2. In `prepareText()`, check `isAsciiText` first. If true, use the existing `split(' ')` + `cellWidth` path (each ASCII char is 1 cell, so width = length). If false, fall through to the full segmentation pipeline (added in PTX-3+).
3. The ASCII path should also skip `cellWidth()` entirely for pure-ASCII words, since each character is exactly 1 cell wide — width is just `word.length`.

### Files to create or modify

- `src/layout/utilities/isAsciiText.ts` — new utility.
- `src/layout/utilities/prepareText.ts` — add ASCII fast-path branch.
- `src/layout/utilities/specs/isAsciiText.unit.ts` — tests.
- `src/layout/classes/specs/TextLayout.bench.ts` — verify ASCII text benchmarks stay at baseline or improve.

### Expected outcomes

- ASCII-only text follows the fast `split(' ')` path with zero overhead.
- Non-ASCII text (CJK, emoji, Thai, Arabic) falls through to the full pipeline.
- Dashboard benchmarks (overwhelmingly ASCII) show no regression from any subsequent issue.

---

## PTX-3: Word-aware line breaking with `Intl.Segmenter` word boundaries

**Priority:** High  
**Depends on:** PTX-1, PTX-2  
**Files to study:** `.ignore/references/pretext/src/analysis.ts` (lines 74–97: `buildMergedSegmentation`, word segmenter usage)

### Problem

Our `split(' ')` approach in `prepareText()` produces incorrect line breaks for non-ASCII scripts:

- **CJK text** — Chinese/Japanese/Korean characters should break between *any* two characters, not only at spaces.
- **Thai/Khmer/Myanmar** — these scripts have no spaces between words; `Intl.Segmenter` with `granularity: 'word'` is required.
- **Mixed-script text** — e.g. `"Hello 世界 test"` should allow breaks around CJK characters.

### Approach

Add a non-ASCII segmentation path in `prepareText()` that only runs when `isAsciiText()` returns false (PTX-2 gate):

1. Segment text using `Intl.Segmenter(undefined, { granularity: 'word' })`.
2. Classify each segment as `text`, `space`, etc.
3. Split CJK segments into per-grapheme break units (pretext splits CJK words into individual graphemes in `measureAnalysis()` — see `.ignore/references/pretext/src/layout.ts`, lines 166–197).
4. Measure each segment with `cellWidth()` and store in the `PreparedText`.
5. `layoutPreparedText()` needs no changes — it already walks widths with pure arithmetic.

Because this only runs in the prepare phase, and only for non-ASCII text, the hot resize path and ASCII-dominant dashboards are unaffected.

### Files to create or modify

- `src/layout/utilities/isCJK.ts` — new utility ported from pretext's `isCJK()` (`.ignore/references/pretext/src/analysis.ts`, lines 98–119).
- `src/layout/constants/wordSegmenter.ts` — shared `Intl.Segmenter` instance.
- `src/layout/utilities/prepareText.ts` — add non-ASCII segmentation branch.
- `src/layout/utilities/specs/isCJK.unit.ts` — tests.
- `src/layout/classes/specs/TextLayout.unit.ts` — add tests for CJK, Thai, mixed-script word breaking.

### Expected outcomes

- CJK text wraps correctly at character boundaries.
- Thai/Khmer text wraps at word boundaries.
- Mixed-script paragraphs wrap correctly at natural break points.
- ASCII-only dashboard benchmarks show zero regression (fast-path from PTX-2).

---

## PTX-4: Punctuation attachment rules (kinsoku, sticky punctuation)

**Priority:** High  
**Depends on:** PTX-3  
**Files to study:** `.ignore/references/pretext/src/analysis.ts` (lines 121–216: kinsoku sets, sticky punctuation sets, `leftStickyPunctuation`, `kinsokuStart`, `kinsokuEnd`)

### Problem

Text layout has no concept of punctuation attachment. Closing punctuation can start a new line, CJK punctuation like `。` or `、` can appear at the start of a line (kinsoku-shori violation), and opening quotes like `「` can appear at the end of a line.

### Approach

Implement punctuation attachment as a post-segmentation merge pass inside `prepareText()`, following pretext's approach. This only runs in the prepare phase for non-ASCII text.

1. **Left-sticky punctuation** (`.ignore/references/pretext/src/analysis.ts`, `leftStickyPunctuation` set, line 163): merge closing punctuation with the preceding segment.
2. **Kinsoku start prohibition** (`kinsokuStart` set, line 121): merge CJK closing marks with the preceding segment.
3. **Kinsoku end / forward-sticky** (`kinsokuEnd` set, line 148): merge opening brackets/quotes with the following segment.

### Files to create or modify

- `src/layout/constants/kinsoku.ts` — new file with `KINSOKU_START`, `KINSOKU_END`, `LEFT_STICKY_PUNCTUATION` character sets.
- `src/layout/utilities/prepareText.ts` — add merge pass after segmentation.
- `src/layout/classes/specs/TextLayout.unit.ts` — tests for punctuation attachment (Latin, CJK, Arabic, Devanagari).

### Expected outcomes

- `"hello."` stays together — period never starts a new line.
- `「下人` stays together — CJK opening quote attached to next character.
- `文，` stays together — CJK comma attached to preceding character.
- Arabic punctuation `،` and `؟` attach to the preceding word.

---

## PTX-5: Special Unicode break characters (ZWSP, NBSP, soft hyphen)

**Priority:** Medium  
**Depends on:** PTX-3  
**Files to study:** `.ignore/references/pretext/src/analysis.ts` (lines 228–248: `classifySegmentBreakChar`), `.ignore/references/pretext/src/line-break.ts` (soft hyphen handling, `discretionaryHyphenWidth`)

### Problem

Text layout has no support for zero-width space (`U+200B`), non-breaking space (`U+00A0`), soft hyphen (`U+00AD`), or word joiner (`U+2060`).

### Approach

Add break-character classification to the non-ASCII segmentation path in `prepareText()`:

1. **NBSP / narrow NBSP / word joiner** → classify as `glue`, merge with adjacent text in `PreparedText` (never break here).
2. **Zero-width space** → zero-width break opportunity segment in `PreparedText`.
3. **Soft hyphen** → discretionary break point in `PreparedText`, `layoutPreparedText()` adds visible hyphen width when choosing this break.

### Files to create or modify

- `src/layout/types/SegmentBreakKind.ts` — new type: `'text' | 'space' | 'glue' | 'zero-width-break' | 'soft-hyphen' | 'hard-break'`.
- `src/layout/utilities/classifyBreakKind.ts` — new utility for character classification.
- `src/layout/utilities/prepareText.ts` — classify segments during preparation.
- `src/layout/utilities/layoutPreparedText.ts` — handle break kinds during arithmetic walk.
- `src/layout/classes/specs/TextLayout.unit.ts` — tests for ZWSP, NBSP, soft hyphen.

### Expected outcomes

- `"alpha\u200Bbeta"` can break between alpha and beta.
- `"10\u00A0000"` never breaks at the NBSP.
- `"trans\u00ADatlantic"` shows as `"transatlantic"` when it fits, or `"trans-\natlantic"` when broken.

---

## PTX-6: Whitespace normalization alignment with CSS spec

**Priority:** Medium  
**Depends on:** —  
**Files to study:** `.ignore/references/pretext/src/analysis.ts` (lines 37–67: `normalizeWhitespaceNormal`, `normalizeWhitespacePreWrap`)

### Problem

`TextLayout.collapseWhitespace()` uses `text.replace(/\s+/g, ' ').trim()` which doesn't precisely match the CSS spec. Tabs, carriage returns, and form feeds should collapse to spaces in normal mode. In pre-wrap mode, `\r\n` should normalize to `\n` while preserving ordinary spaces.

### Approach

Extract whitespace normalization into standalone utilities ported from pretext. These are pure string transforms with no performance-sensitive dependencies — safe to land at any point.

### Files to create or modify

- `src/layout/utilities/normalizeWhitespaceNormal.ts` — CSS `white-space: normal` normalization.
- `src/layout/utilities/normalizeWhitespacePreWrap.ts` — CSS `white-space: pre-wrap` normalization.
- `src/layout/classes/TextLayout.ts` — replace `collapseWhitespace()` with the new utilities.
- `src/layout/utilities/specs/normalizeWhitespaceNormal.unit.ts` — tests.
- `src/layout/utilities/specs/normalizeWhitespacePreWrap.unit.ts` — tests.

### Expected outcomes

- Tab characters in normal mode collapse to spaces.
- `\r\n` in pre-wrap mode normalizes to `\n`.
- Whitespace normalization matches CSS spec behavior.
- No performance impact (these are string transforms, not segmentation).

---

## PTX-7: Trailing whitespace hanging (CSS-compliant space handling)

**Priority:** Medium  
**Depends on:** PTX-1  
**Files to study:** `.ignore/references/pretext/src/line-break.ts` (the `lineEndFitAdvances` / `lineEndPaintAdvances` distinction)

### Problem

In CSS, trailing whitespace at the end of a line "hangs" — it doesn't count toward the line's width for break decisions. Our line-breaking may count trailing spaces toward line width, causing premature breaks.

### Approach

In `layoutPreparedText()`, when checking if a segment fits, use "fit width" which excludes trailing spaces. When reporting the line's width, use "paint width" which reflects visible content only. This maps to pretext's `lineEndFitAdvances` vs `lineEndPaintAdvances` distinction, but implemented in the arithmetic layout walk.

### Files to create or modify

- `src/layout/utilities/layoutPreparedText.ts` — modify line-breaking arithmetic.
- `src/layout/classes/specs/TextLayout.unit.ts` — tests verifying trailing space doesn't trigger premature breaks.

### Expected outcomes

- `"Hello "` in a container exactly as wide as `"Hello"` renders on one line.
- Trailing spaces don't force line breaks.

---

## PTX-8: `overflow-wrap: break-word` CSS property support

**Priority:** Medium  
**Depends on:** PTX-1  
**Files to study:** `.ignore/references/pretext/src/line-break.ts` (lines 77–100: `appendBreakableSegmentFrom`)

### Problem

Word-breaking is always on. CSS `overflow-wrap: break-word` and `word-break: break-all` should be explicit opt-ins.

### Approach

1. Add `overflow-wrap` and `word-break` to the CSS property infrastructure.
2. Store per-grapheme widths in `PreparedText.breakableWidths` for segments that can be broken (already pre-computed during prepare phase).
3. `layoutPreparedText()` checks `overflowWrap` option: with `normal`, oversized words overflow; with `break-word`, they break at pre-computed grapheme boundaries using cached widths (no re-measurement).

### Files to create or modify

- `src/dom/constants/cssProperties.ts` — add properties.
- `src/css/constants/initialValues.ts` — add initial values.
- `src/css/constants/inheritableProperties.ts` — add to inherited set.
- `src/layout/types/index.ts` — extend `TextLayoutOptions`.
- `src/layout/utilities/layoutPreparedText.ts` — conditional breaking logic.
- `src/layout/classes/LayoutEngine.ts` — pass properties from computed style.
- `src/layout/classes/specs/TextLayout.unit.ts` — test both modes.

### Expected outcomes

- `overflow-wrap: normal` — long words overflow their container.
- `overflow-wrap: break-word` — long words break at grapheme boundaries.
- `word-break: break-all` — all text breaks between any two characters.

---

## PTX-9: `pre-wrap` tab stop support

**Priority:** Medium  
**Depends on:** PTX-1  
**Files to study:** `.ignore/references/pretext/src/line-break.ts` (lines 48–54: `getTabAdvance`), `.ignore/references/pretext/src/layout.test.ts` (pre-wrap tab tests)

### Problem

`measurePreWrap()` treats tabs as regular characters. CSS `tab-size` defines tab stops for `pre-wrap` mode.

### Approach

1. Add `tab-size` CSS property (default 8).
2. In `measurePreWrap()`, calculate tab advance to the next tab stop from the current line position. In terminal cells, tab stops are at every `tabSize` columns.

### Files to create or modify

- `src/dom/constants/cssProperties.ts` — add `'tab-size'`.
- `src/css/constants/initialValues.ts` — add `'tab-size': '8'`.
- `src/css/constants/inheritableProperties.ts` — add `'tab-size'`.
- `src/layout/types/index.ts` — extend `TextLayoutOptions` with `tabSize`.
- `src/layout/classes/TextLayout.ts` — tab stop calculation in `measurePreWrap()`.
- `src/layout/classes/LayoutEngine.ts` — pass `tab-size` from computed style.
- `src/layout/classes/specs/TextLayout.unit.ts` — tab stop tests.

### Expected outcomes

- `"a\tb"` in pre-wrap advances to the correct tab stop.
- Consecutive tabs advance to successive tab stops.
- Tab stops restart after hard breaks.

---

## PTX-10: URL and numeric run merging

**Priority:** Low  
**Depends on:** PTX-3  
**Files to study:** `.ignore/references/pretext/src/analysis.ts` (lines 302–430: `mergeUrlLikeRuns`, `mergeNumericRuns`, `mergeAsciiPunctuationChains`)

### Problem

URLs and numeric expressions break at awkward points (`/`, `.`, `-`).

### Approach

After word segmentation in `prepareText()`, apply merge passes that keep URLs and numeric expressions together as single breakable units. Only runs in the prepare phase for non-ASCII text.

### Files to create or modify

- `src/layout/utilities/mergeUrlRuns.ts` — URL detection and merging.
- `src/layout/utilities/mergeNumericRuns.ts` — numeric expression merging.
- `src/layout/utilities/prepareText.ts` — apply merge passes.
- Tests for each utility.

### Expected outcomes

- URLs stay together as one breakable unit.
- Numeric expressions like `7:00-9:00` don't break mid-expression.

---

## PTX-11: Bidi text metadata for mixed LTR/RTL rendering

**Priority:** Low (forward-looking)  
**Depends on:** PTX-1  
**Files to study:** `.ignore/references/pretext/src/bidi.ts` (entire file — simplified Unicode Bidi Algorithm)

### Problem

No support for bidirectional text. Arabic and Hebrew render left-to-right, which is incorrect.

### Approach

This is a forward-looking issue. The approach would be:

1. Port pretext's `computeBidiLevels()` to produce per-segment bidi levels during `prepareText()`.
2. When painting text lines, reorder segments within each line according to bidi levels.
3. Only affects paint order, not logical text storage.

### Files to create or modify

- `src/layout/utilities/computeBidiLevels.ts` — port of pretext's simplified bidi algorithm.
- `src/renderer/classes/Painter.ts` — apply bidi reordering when painting text.
- Tests for bidi level computation and visual reordering.

### Expected outcomes

- Arabic/Hebrew text renders right-to-left within its run.
- Mixed LTR/RTL text reorders correctly on each visual line.
