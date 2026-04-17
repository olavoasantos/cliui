# CSS Selectors — Finding Nodes in the Tree

## The problem selectors solve

A DOM without queries is a linked list you have to walk by hand. `firstChild` → `nextSibling` → `nextSibling` gets you through the tree, but it forces calling code to know the exact shape of the tree it's searching. Selectors invert that: describe _what_ you're looking for, and the engine finds it regardless of where it sits.

Frameworks depend on this. `querySelector` and `querySelectorAll` are how application code finds elements after a render — by class, by attribute, by structural relationship. A style engine depends on it even more heavily: every CSS rule is a selector matched against every element in the tree, potentially hundreds of times per frame.

@cliui/dom implements a regex-based selector engine. Not a full CSS Selectors Level 4 parser — a focused engine that covers what UI frameworks and terminal-bound applications actually query for. The boundary is deliberate: every selector added is a selector to parse, match, cache, and maintain. What's included handles real application patterns. What's excluded is either rarely used, requires layout information the DOM doesn't have, or would add parsing complexity disproportionate to its value.

## How a selector becomes a match

Before diving into what's supported, it helps to see the full pipeline. A selector starts as a string and ends as a boolean — "does this element match?" The engine turns that string into a structured representation, then walks the DOM to answer the question.

Take `"div.active > .item:hover"`. Here's what happens:

**Step 1 — Parse.** The regex tokenizer in `parseSelector` scans the string left to right, extracting tokens. Each token is classified by type (element, class, pseudo, etc.) and grouped into _parts_. A new part starts whenever a combinator appears. The result is a `SelectorPart[]` array:

```
"div.active > .item:hover"

→ parts[0]: { combinator: Child,  matchers: [{Element, "div"}, {Class, "active"}] }
→ parts[1]: { combinator: Inner,  matchers: [{Class, "item"}, {Pseudo, "hover"}] }
```

The combinator on a part describes its relationship to the _next_ part (to its right). `Child` on `parts[0]` means "parts[1] must be a child of whatever matches parts[0]." The rightmost part always has `Inner` — it matches the target element directly, with no combinator to traverse.

Multiple matchers within a single part are ANDed together. `div.active` means the element must be a `div` _and_ have the class `active` — both conditions must hold.

**Step 2 — Match right-to-left.** The `matches` function iterates the parts array from right to left. It starts with the target element and the rightmost part:

1. Does the element match `.item:hover`? Check class attribute for `item`, check `hoveredElement` chain for hover state. If either fails, return `false` — done.
2. The combinator on the previous part is `Child`. Walk to the element's parent.
3. Does the parent match `div.active`? Check `localName === 'div'`, check class attribute for `active`. If both pass, return `true`.

Right-to-left matching is more efficient than left-to-right. The rightmost part is typically the most specific — there are far fewer elements matching `.item:hover` than `div.active` in a typical tree. Starting from the specific end rejects non-candidates immediately, avoiding parent-chain walks for elements that were never going to match. This is the same direction browsers use, for the same reason.

One important limitation: the matching loop always passes the original target element to each part — it doesn't chain traversal state from the previously matched ancestor. This means selectors with two or more child (`>`), adjacent (`+`), or sibling (`~`) combinators don't match correctly. `div > .item` works (one combinator). `body > div > .item` does not — the engine checks the target's parent for both `div` and `body`, instead of checking the parent and then the grandparent. Descendant (whitespace) combinators are unaffected because they walk the full ancestor chain, which naturally reaches all ancestors regardless of chaining. In practice, most real-world selectors use at most one direct combinator, or use only descendant combinators, which work at any depth.

**Step 3 — Query.** `querySelector` walks the subtree depth-first (document order) and returns the first element where `matches` returns `true`. `querySelectorAll` does the same walk and collects all matches. The depth-first order means results always follow document order — a guarantee application code can rely on.

The parse result is cached. The match is a tree walk. Everything in between is comparison and traversal — no string manipulation, no allocation in the hot path. The class-matching code (`hasClassName`) is optimized to avoid splitting the class attribute into an array, using `indexOf` with word-boundary checks instead.

## What the engine understands

| Category            | Syntax            | How it matches                                                                                                             |
| ------------------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Element             | `div`, `span`     | `element.localName === name`                                                                                               |
| ID                  | `#myid`           | `getAttribute('id') === 'myid'`                                                                                            |
| Class               | `.active`         | Word-boundary match in `class` attribute (whitespace-delimited, no array split)                                            |
| Universal           | `*`               | Always matches — `*.active` is equivalent to `.active`                                                                     |
| Attribute presence  | `[disabled]`      | `hasAttribute('disabled')`                                                                                                 |
| Attribute exact     | `[role="button"]` | `getAttribute('role') === 'button'`                                                                                        |
| Pseudo `:root`      | `:root`           | `ownerDocument.documentElement === element`                                                                                |
| Pseudo `:focus`     | `:focus`          | `ownerDocument.activeElement === element`                                                                                  |
| Pseudo `:active`    | `:active`         | `element.hasAttribute('pressed')`                                                                                          |
| Pseudo `:hover`     | `:hover`          | Walks `ownerDocument.hoveredElement` up the parent chain                                                                   |
| Pseudo `:disabled`  | `:disabled`       | `element.hasAttribute('disabled')`                                                                                         |
| Pseudo `:enabled`   | `:enabled`        | `!element.hasAttribute('disabled')`                                                                                        |
| Functional `:not()` | `:not(.hidden)`   | Recursive — negates `matches(element, innerSelector)`                                                                      |
| Functional `:has()` | `:has(.active)`   | Tests whether **the element itself** matches the inner selector — [see below](#has-is-not-the-w3c-relational-pseudo-class) |

Compound selectors work by combining these. `div.active[role="button"]:hover` matches an element that satisfies all four conditions — element name, class, attribute, and pseudo-class are ANDed within the same selector part.

### Combinators — structural relationships

Combinators connect selector parts by describing how matched elements relate to each other in the tree. Each combinator translates to a specific DOM traversal direction:

| Combinator       | Syntax        | Traversal direction                                     |
| ---------------- | ------------- | ------------------------------------------------------- |
| Descendant       | `div .item`   | Walks the `PARENT` chain upward — any ancestor          |
| Child            | `div > .item` | Checks the immediate `PARENT` — direct parent only      |
| General sibling  | `h1 ~ p`      | Walks the `PREV` chain leftward — any preceding sibling |
| Adjacent sibling | `h1 + p`      | Checks the immediate `PREV` sibling (skips text nodes)  |

The adjacent sibling combinator skips non-element nodes. Text nodes between element siblings don't prevent a match:

```ts
parent.append(title, document.createTextNode(' '), paragraph);
matches(paragraph, 'h1 + p'); // true — text node is skipped
```

## Where the engine stops

Not every selector syntax is handled, and the failure modes vary. The most dangerous entries are the ones that produce wrong results silently — they're listed first.

| Category                  | Examples                                                        | What happens                                                   |
| ------------------------- | --------------------------------------------------------------- | -------------------------------------------------------------- |
| Selector lists            | `div, span`                                                     | **Parsed incorrectly — produces wrong results**, no error      |
| Attribute substring       | `[href^="/"]`, `[class*="btn"]`, `[lang\|="en"]`                | Silently fails to match                                        |
| Nested functional pseudos | `:has(:not(.foo))`                                              | Malformed parse — the regex stops at the first `)`             |
| Unquoted attribute values | `[type=button]`                                                 | Fails to parse — the regex requires quotes (`[type="button"]`) |
| Positional pseudos        | `:nth-child()`, `:nth-of-type()`, `:first-child`, `:last-child` | Simple ones return false silently; functional ones **throw**   |
| Structural pseudos        | `:empty`, `:checked`                                            | Silently return false                                          |
| Pseudo-elements           | `::before`, `::after`                                           | Silently ignored — the tokenizer only matches single `:`       |
| Forgiving selectors       | `:where()`, `:is()`                                             | **Throws** `Error("Function :where(...) not implemented")`     |
| Case-insensitive attr     | `[type="text" i]`                                               | Not supported                                                  |
| Namespaced selectors      | `svg\|rect`                                                     | Not supported                                                  |

## Pseudo-classes as queries over application-managed state

Every pseudo-class in this engine is a read-only query over state that something else manages. The selector engine never _produces_ state — it only _reads_ it. Your input layer sets `pressed`, sets `hoveredElement`, calls `setActiveElement`. The selector engine asks the questions; your code provides the answers.

This design follows the same principle as the rest of the library: the DOM stores state, the rendering/input layer decides what that state means. In a browser, the engine and the input system are fused — `:hover` implicitly tracks the mouse cursor. In @cliui/dom, that coupling is broken deliberately. The pseudo-class is the query; the application wires the data source.

**`:active` checks a `pressed` attribute**, not mouse-button state. The terminal input layer sets this attribute when the user holds a mouse button or key on an element. If you're building your own input handler, set the `pressed` attribute on the target element to make `:active` selectors work.

**`:hover` walks the parent chain**, not just the hovered element. When `document.hoveredElement` is set to a deeply nested element, every ancestor up to `documentElement` also matches `:hover`. This mirrors how browser `:hover` works — hovering a child means hovering the parent too.

**`:disabled` and `:enabled` apply to all elements**, not just form controls. Any element with a `disabled` attribute matches `:disabled`. Any element without one matches `:enabled`. This is a simplification — browsers restrict these pseudo-classes to form-associated elements.

**`:focus` reads `document.activeElement`** — whichever element the document considers focused.

**`:root` matches `document.documentElement`** — there's exactly one.

Pseudo-classes that query `ownerDocument` — `:root`, `:focus`, and `:hover` — silently return `false` on detached elements (elements not connected to a document). The code uses optional chaining to handle the missing document reference gracefully. If you're creating elements off-document and testing them with selectors, these pseudo-classes won't match until the element is connected.

## `:has()` is not the W3C relational pseudo-class

This is the most significant semantic divergence from the spec, and it's worth understanding why.

In CSS Selectors Level 4, `:has(span)` means "an element that contains a descendant matching `span`." Implementing that requires a downward tree search from the candidate element — for every candidate, walk its subtree looking for matches. In a style engine evaluating thousands of selector-element pairs per frame, that cost multiplies fast.

In @cliui/dom, `:has()` calls `matches(element, innerSelector)` — it tests whether **the element itself** matches the inner selector. This makes `:has()` equivalent to compound matching:

```ts
import {matches} from '@cliui/dom';

const el = document.createElement('div'); // no children

matches(el, 'div:has(div)'); // true — the div itself is a div
matches(el, 'div:has(span)'); // false — the div is not a span
```

`div:has(.active)` is functionally identical to `div.active`. This is a deliberate scope decision — it avoids the subtree-search cost while preserving the functional pseudo-class syntax for the cases where it overlaps.

## Selector lists (commas) belong to the rendering layer

`parseSelector` does not handle comma-separated selectors. Calling `querySelector('div, span')` will produce wrong results — the comma and second selector get absorbed into the regex in unexpected ways.

This isn't an oversight — it reflects a layer boundary. The DOM's selector engine handles individual selectors. The `@cliui/terminal` layer, where CSS stylesheets use comma-separated selectors constantly, provides `parseSelectorList` which splits on commas before passing individual selectors down. The split happens where it's needed, not where it isn't.

At the DOM layer, use separate queries:

```ts
// ✘ Wrong — produces incorrect results
const results = document.querySelectorAll('div, span');

// ✔ Correct — query each selector separately
const divs = document.querySelectorAll('div');
const spans = document.querySelectorAll('span');
```

## Attribute values require quotes

The tokenizer regex requires quotes around attribute values. This is a parsing simplification — unquoted attribute values in CSS can contain characters that make regex tokenization ambiguous.

```ts
document.querySelector('[role="button"]'); // ✔ works
document.querySelector("[role='button']"); // ✔ works — single quotes too
document.querySelector('[role=button]'); // ✘ fails to match anything
```

Both single and double quotes are accepted. No error is thrown for unquoted values — the tokenizer simply doesn't recognize the pattern as an attribute selector, and the query matches nothing.

## The `matches` API — a standalone function

Unlike browsers, `element.matches(selector)` is **not** available as an instance method. The matching API is a standalone function:

```ts
import {matches} from '@cliui/dom';

if (matches(element, 'div.active')) {
  // ...
}
```

Why a function instead of an instance method? Instance methods on `Element` become part of the public API surface — they show up in autocompletion, in type definitions, in every element's prototype. A standalone function keeps the selector engine decoupled from the node classes. It can be imported only where needed, tree-shaken where it isn't, and tested independently.

`querySelector` and `querySelectorAll` _are_ instance methods (via `ParentNode`), because frameworks expect to call them on elements and documents directly. But `matches` is not. There is no `closest` implementation — `closest` requires walking the ancestor chain with matching at each step, which a manual `parentNode` loop with `matches` already provides.

## Pre-parsed matching for hot paths

`matchesParts(element, parts)` accepts pre-parsed `SelectorPart[]` arrays, bypassing the parse step entirely. This exists for one consumer above all others: style engines.

A style engine evaluates the same selectors against many elements per frame. Parsing a selector string, even with caching, adds overhead that multiplies across hundreds of rules and hundreds of elements. `matchesParts` eliminates the parse-and-cache-lookup step entirely — you hold the `SelectorPart[]` in memory and match against it directly.

```ts
import {parseSelector, matchesParts} from '@cliui/dom';

// Parse once
const parts = parseSelector('div.container > .item');

// Match many times — no re-parsing
for (const element of elements) {
  if (matchesParts(element, parts)) {
    // ...
  }
}
```

The `@cliui/terminal` style engine uses this pattern: CSS text is parsed once into `CSSRule[]` with pre-parsed `SelectorPart[][]` arrays (one per selector in a comma-separated list). During style resolution, `matchesParts` is called directly — no string parsing per element per frame.

### The AST types

The types were introduced in the [pipeline walkthrough](#how-a-selector-becomes-a-match), but here's the full shape for reference:

```ts
interface SelectorMatcher {
  type: SelectorMatcherType; // Element=1, Id=2, Class=3, Attribute=4, Pseudo=5, Function=6
  name: string; // the token value: tag name, class name, attribute name, pseudo name
  value?: string; // attribute value, function argument, or element name echo
}

interface SelectorPart {
  combinator: SelectorCombinator; // Descendant=0, Child=1, Sibling=2, Adjacent=3, Inner=4
  matchers: SelectorMatcher[]; // conditions ANDed together within this part
}
```

The `combinator` on a part describes the relationship between that part and the next part to its right. `Inner` means "no combinator — this part's matchers apply directly to the target element." For a concrete parse example:

```
"ul > li.selected"

→ parts[0]: { combinator: Child, matchers: [{Element, "ul"}] }
              ↑ "I am the child-combinator ancestor"
→ parts[1]: { combinator: Inner, matchers: [{Element, "li"}, {Class, "selected"}] }
              ↑ "I match the target element directly"
```

Understanding this structure matters if you're consuming the AST — the combinator lives on the _left_ part, not the right.

Both `parseSelector` and `matchesParts` are exported from `@cliui/dom`, along with the `SelectorPart`, `SelectorMatcher`, `SelectorCombinator`, and `SelectorMatcherType` types and enums.

## The selector cache

`parseSelector` caches results in a `Map<string, SelectorPart[]>`. The same selector string always returns the same parsed array without re-executing the regex.

The cache evicts when its size exceeds 1,000 entries — it deletes the oldest entry (FIFO, since `Map` preserves insertion order) and then inserts the new one, so the practical maximum is 1,001 entries. Frequently-used selectors are not promoted on access — `Map.get()` doesn't reorder keys. In practice this means a hot selector could be evicted if it was parsed early and 1,000 other selectors were parsed after it.

For most applications this doesn't matter — the cache miss just means one extra regex execution. Style engines that hold pre-parsed `SelectorPart[]` arrays via `matchesParts` bypass the cache entirely.

## Error behavior — silence vs. throwing

The engine distinguishes between two kinds of unsupported selectors, and the distinction is intentional.

| Scenario                                                | Result                                                          |
| ------------------------------------------------------- | --------------------------------------------------------------- |
| Unrecognized simple pseudo (`:visited`, `:first-child`) | Returns `false` — no error                                      |
| Unrecognized functional pseudo (`:where()`, `:is()`)    | **Throws** `Error("Function :name(value) not implemented")`     |
| No matching ancestor/sibling for combinator             | Returns `false`                                                 |
| Empty selector string                                   | `querySelector` returns `null`, `querySelectorAll` returns `[]` |
| Malformed selector string                               | Likely produces no tokens — matches nothing                     |

Unknown simple pseudo-classes are harmless — they add one condition that never matches, affecting only the elements selected. Unknown functional pseudo-classes are different: they contain nested selector logic that would be silently swallowed. `:is(.foo, .bar)` looks like it should match two classes, but if the engine silently ignores it, the selector means something completely different than what the author intended. Throwing surfaces the problem immediately rather than producing subtly wrong results.

## Where to go next

- **[Scope and Boundaries](./scope-and-boundaries.md)** — full boundary inventory, including where selectors fit in the broader design
- **[DOM Architecture](./dom-architecture.md)** — the class hierarchy and how `ParentNode` exposes `querySelector`/`querySelectorAll`
- **[Query Elements with CSS Selectors](../recipes/query-selectors.md)** — practical how-to for common selector patterns
