# HTML Parsing — How Strings Become Trees

## The gap between markup and DOM

Frameworks build DOM trees programmatically — `createElement`, `appendChild`, `setAttribute`, one call at a time. But applications regularly need to go the other direction: take an HTML string and produce a tree from it. The `innerHTML` setter is the most visible case. Document hydration — bootstrapping a full `Document` from a server-rendered string — is another.

These two operations look similar from the outside (string in, tree out), but they serve different masters and make different trade-offs. A fragment parser for `innerHTML` should reproduce the input faithfully — every whitespace node, every bare `<br>`, every entity. A document parser should understand structure — route `<head>` content to the right place, skip layout-disrupting whitespace, recognize void elements without explicit closing tags.

@cliui/dom ships two parsers for exactly this reason. They use identical regex tokenizer and attribute parser patterns (defined independently in each parser, not imported from a shared module), but they diverge on every decision where faithfulness and pragmatism conflict.

Most developers never call these parsers directly. If you're writing `element.innerHTML = '...'` and debugging unexpected results, `parseHtml`'s behaviors are what affect you — especially its handling of void elements and whitespace. If you're hydrating a server-rendered document into a `Document` instance, `parseDocument` is the parser you need to understand. The sections that follow explain both, but you can focus on whichever column of the comparison table matches your situation.

## The tokenizer — shared foundation

Both parsers are powered by identical regex-based tokenizers — the same pattern defined independently in each parser's source file. Each tokenizer scans the input string and produces four kinds of tokens:

- **Opening tags** — element name, attributes, and an optional self-closing slash
- **Closing tags** — just the element name
- **Comments** — the content between `<!--` and `-->`
- **Text** — everything between tags

Tag names must start with an ASCII letter, followed by any combination of letters, digits, hyphens, and colons. The match is case-insensitive — `<DIV>` and `<div>` both produce an `Element` with the same `tagName` (`"DIV"`), but the stored `localName` preserves the original case from the input. In practice, framework-generated HTML uses lowercase tag names, so casing rarely matters. Hyphens enable custom elements (`<my-component>`). Colons enable namespaced names (`<ns:tag>`).

When a tag name doesn't match one of the built-in element classes, `createElement` checks the custom element registry. If a constructor is registered for that name, parsing instantiates the registered class — not a generic `Element`. The registry lookup uses the exact case from the input, so `<MY-WIDGET>` won't match a registration for `'my-widget'`. This also means custom element lifecycle callbacks can fire during parsing: `connectedCallback` triggers during `parseDocument` (elements are appended to the connected document tree) but not during `parseHtml` (elements are appended to a disconnected `DocumentFragment` and only connect when the fragment is later inserted into the live DOM).

The attribute parser handles three forms: quoted (`name="value"` or `name='value'`), unquoted (`name=value`), and boolean (`disabled`). Boolean attributes receive an empty string value.

This is not a spec-compliant HTML parser. The HTML5 parsing algorithm is a state machine with over 80 states, an adoption agency algorithm, implied tag insertion, and complex error recovery. That machinery exists to handle the wild markup the open web produces. Framework-generated HTML is well-formed by construction — React and Preact don't emit mismatched tags. A simpler parser that handles well-formed HTML reliably is smaller, faster, and easier to reason about than a spec-compliant one that handles edge cases no framework produces.

## Two parsers, one purpose each

Both parsers are exported from `@cliui/dom` and serve distinct roles:

```ts
// Fragment parsing — powers the innerHTML setter
const fragment = parseHtml('<div class="card">hello</div>', contextElement);
host.append(fragment); // fragment children move into host; fragment is now empty

element.innerHTML = '<div>hello</div>'; // calls parseHtml internally

// Document parsing — powers hydration
parseDocument('<!DOCTYPE html><html><body><div>hello</div></body></html>', document);
```

**`parseHtml`** creates a `DocumentFragment` from an HTML string. It takes two arguments: the HTML string and a context node. The context node is used only to obtain the owning `Document` for element creation — it does not affect parsing behavior. This is a significant departure from browser fragment parsing, where the context element determines which elements are valid (parsing `<td>` inside a `<table>` context differs from parsing it inside a `<div>`). In @cliui/dom, the context is irrelevant — the same tree is produced regardless of which node you pass.

`parseHtml` powers the `innerHTML` setter. When you write `element.innerHTML = '<div>hello</div>'`, the setter calls `parseHtml`, gets a fragment back, and replaces the element's children with that fragment. Setting `innerHTML` to `null`, `undefined`, or `''` clears the element's children without invoking `parseHtml`.

`HTMLTemplateElement.innerHTML` also uses `parseHtml` — but writes to the template's `.content` DocumentFragment rather than the element's own children, matching browser behavior. `HTMLTemplateElement.innerHTML` does not share the null guard — setting `template.innerHTML = null` produces a text node `"null"` in the content fragment rather than clearing it.

There is a subtlety when `<template>` appears inside HTML being parsed by `parseHtml` (e.g., as part of a larger `innerHTML` assignment on another element). In that case, `parseHtml` appends children directly to the template element — not to its `.content` DocumentFragment. The parser has no special template handling; it treats `<template>` like any other element. This means `template.innerHTML` returns `''` (it reads from the uninitialized `.content`) while `template.outerHTML` includes the parsed children (it serializes the element's own child list). This differs from browser behavior, where the HTML parser always routes template children to `.content`.

**`parseDocument`** populates an existing `Document` skeleton. It recognizes structural tags (`<html>`, `<head>`, `<body>`), routes content to the correct pre-existing elements, handles void elements, strips `<!DOCTYPE>` declarations, and skips whitespace-only text nodes. It's the parser you use when hydrating a full HTML document string into a `Document` instance.

## Side-by-side comparison

| Behavior                                     | `parseHtml`                                         | `parseDocument`                                          |
| -------------------------------------------- | --------------------------------------------------- | -------------------------------------------------------- |
| **Returns**                                  | `DocumentFragment`                                  | `void` (mutates a `Document`)                            |
| **Used by**                                  | `innerHTML` setter, `HTMLTemplateElement.innerHTML` | Document hydration                                       |
| **Void elements**                            | Treated as regular opening tags                     | Recognized — 14 void elements never push onto the stack  |
| **Self-closing syntax** (`<tag />`)          | Ignored — slash is captured but never checked       | Honored — any `<tag />` is treated as self-closing       |
| **Structural tags** (`html`, `head`, `body`) | Created as normal elements                          | Routed to existing skeleton elements; attributes applied |
| **DOCTYPE**                                  | Not handled                                         | Stripped before tokenizing                               |
| **Whitespace-only text nodes**               | Preserved                                           | Skipped                                                  |
| **Comments**                                 | Preserved                                           | Preserved                                                |
| **Entity decoding**                          | Text nodes only                                     | Text nodes only                                          |
| **Attribute parsing**                        | Quoted, unquoted, and boolean                       | Quoted, unquoted, and boolean                            |

The asymmetries in this table aren't inconsistencies — they reflect the different contexts each parser operates in. `parseHtml` serves `innerHTML`, where the caller controls the input and expects literal reproduction. `parseDocument` serves hydration, where the input is a full HTML document and the parser must understand document-level conventions. The following sections unpack the most consequential differences — the places where the faithfulness-vs-pragmatism tension produces surprising behavior.

## Void elements — the biggest behavioral split

This is the most likely source of surprise when using `parseHtml`. Consider this fragment:

```html
<p>Hello<br />World</p>
```

In a browser, `<br>` is a void element — it can't have children. `World` is a sibling text node inside `<p>`. But `parseHtml` has no void element table. It treats `<br>` as a regular opening tag, so `World` becomes a _child_ of `<br>`:

```
parseHtml result:          What you expected:
<p>                        <p>
  "Hello"                    "Hello"
  <br>                       <br></br>
    "World"  ← nested!       "World"
  </br>                    </p>
</p>
```

The workaround is explicit closing tags: `<p>Hello<br></br>World</p>`. Note that self-closing syntax (`<br/>`) won't help — `parseHtml` ignores the trailing slash.

This is a deliberate design choice, not a bug. `parseHtml` processes fragments typically generated by framework code that already produces well-formed markup with explicit closing tags. Adding void element handling would increase complexity for a case that framework output rarely triggers.

`parseDocument` takes the opposite stance. Full HTML documents are full of void elements — `<meta>`, `<link>`, `<br>`, `<input>`. Getting these wrong would corrupt the entire document tree. So `parseDocument` recognizes these 14 void elements, which never push onto the parent stack regardless of whether they use self-closing syntax:

`area`, `base`, `br`, `col`, `embed`, `hr`, `img`, `input`, `link`, `meta`, `param`, `source`, `track`, `wbr`

## Whitespace — faithful vs. practical

This is one of the few places where @cliui/dom makes a rendering-aware decision in what is otherwise a renderer-agnostic layer. The two parsers handle whitespace-only text nodes differently, and the difference is deliberate.

`parseHtml` preserves every text token, including whitespace-only nodes like the newlines and indentation between tags. This matches what you'd expect from a fragment parser — the input is reproduced faithfully.

`parseDocument` skips whitespace-only text nodes entirely. Only tokens whose full content is whitespace are dropped — whitespace inside a text node with any non-whitespace content is preserved (`"  Hello World  "` stays intact). The reason is terminal-specific: @cliui/dom's rendering layer uses flex layout where all children are block-level. Whitespace-only text nodes between elements would each occupy a row, producing large visual gaps. Dropping them produces the layout developers expect:

```html
<!-- This indented document... -->
<body>
  <div>A</div>
  <div>B</div>
</body>

<!-- ...produces 2 child nodes in the body, not 5 -->
<!-- Without whitespace stripping, each newline/indent would be a text node -->
```

This differs from browser behavior, where whitespace between inline elements is significant. The trade-off is intentional: the alternative — preserving whitespace and requiring every document consumer to filter it out — would push complexity into every rendering backend for a text pattern that's never meaningful in the terminal context this library was built for.

While void elements represent the most visible parsing split, whitespace handling is where the two parsers' philosophies produce the most structural difference in the resulting tree — `parseHtml` output routinely contains text nodes that `parseDocument` output never will.

## Self-closing syntax

The self-closing slash (`<tag />`) is another place where the two parsers diverge — and where `parseDocument`'s pragmatism introduces a subtle footgun.

`parseDocument` checks for the trailing `/` in `<tag />` and treats any such element as self-closing — not just void elements or custom elements, but *any* tag. `<div />` would fail to wrap its intended children just as `<my-widget />` would. This differs from browser behavior, where self-closing syntax is ignored on non-void elements. The custom element case is the most common footgun, but the rule is broader:

```html
<!-- In parseDocument, the slash makes this self-closing -->
<my-layout />
  <p>This is NOT a child of my-layout — it's a sibling</p>

<!-- Use an explicit closing tag instead -->
<my-layout>
  <p>This IS a child of my-layout</p>
</my-layout>
```

`parseHtml` ignores the self-closing slash. `<br />` and `<br>` behave identically — both are treated as opening tags.

## How structural tags find their home

When `parseDocument` encounters `<html>`, `<head>`, or `<body>`, it doesn't create new elements. Instead, it applies any attributes from those tags to the document's pre-existing skeleton elements (`document.documentElement`, `document.head`, `document.body`) and routes subsequent content to the correct parent.

The [Document skeleton](./dom-architecture.md#the-document-skeleton) already exists when `parseDocument` runs — `Window` construction creates `<html>`, `<head>`, and `<body>` automatically. Creating duplicates would break the document's invariants. So `parseDocument` treats structural tags as routing directives, not element constructors.

The parser tracks a context state — `'none'`, `'html'`, `'head'`, or `'body'` — to determine where content belongs:

- Content inside `<head>` goes to `document.head`.
- Content inside `<body>` goes to `document.body`.
- Content between `</head>` and `<body>` is appended to `document.body`.
- When no structural tags are present, everything goes to `document.body`.

Structural tags appearing out of place (e.g., `<body>` inside existing body content) don't create new elements — they reapply attributes to the existing skeleton element and reset the parser's context. In contrast, `parseHtml` has no structural tag awareness — `<html>`, `<head>`, and `<body>` inside a fragment are created as ordinary elements.

Entering `<head>` or `<body>` resets the parser stack, preventing unclosed elements inside one section from leaking into the next. This is a robustness decision — an unclosed `<meta>` inside `<head>` won't cause body content to nest incorrectly.

## Entity decoding

Both parsers share one behavior that departs from browsers in a way worth understanding: entity decoding is limited to text content only. Entities in attribute values are not decoded. If your HTML contains `data-label="Tom &amp; Jerry"`, the attribute value will be the literal string `Tom &amp; Jerry`, not `Tom & Jerry`. This differs from browser behavior, where attribute entities are decoded.

The supported entity set is intentionally limited to the 15 most commonly encountered entities — `&amp;`, `&lt;`, `&gt;`, `&quot;`, `&apos;`, `&nbsp;`, and typographic entities like `&copy;`, `&reg;`, `&trade;`, `&mdash;`, `&ndash;`, `&laquo;`, `&raquo;`, `&bull;`, and `&hellip;` — not the full HTML5 list of ~2,200 named entries. The full list would add weight for entities that framework-generated markup almost never contains.

Named entity matching is case-insensitive: `&AMP;` and `&amp;` both decode to `&`.

### Numeric references

- **Decimal:** `&#123;` decodes via `String.fromCodePoint(Number.parseInt('123', 10))`.
- **Hexadecimal:** `&#x7B;` decodes via `String.fromCodePoint(Number.parseInt('7B', 16))`, case-insensitive.

### What doesn't decode

- **Attribute values** — entity decoding applies to text nodes only, not attribute values.
- **Unrecognized named entities** are left as-is: `&unknown;` stays `&unknown;`.
- **Bare ampersands** pass through: `a & b` stays `a & b` (the pattern requires a `;` terminator).

## Serialization

The output side of the parsing story is serialization — turning the DOM tree back into an HTML string.

Serialization — the `outerHTML` and `innerHTML` getters — always produces explicit closing tags for every element, including void elements like `<br>`. The output is `<br></br>`, not `<br>` or `<br />`. See [Scope and Boundaries](./scope-and-boundaries.md#void-elements-always-get-closing-tags) for details.

Text content is escaped on output: `&`, `"`, `<`, `>` are encoded as `&amp;`, `&quot;`, `&lt;`, `&gt;`. Attribute values encode `&` and `"`. Boolean attributes (empty string value) serialize without `=` — e.g., `disabled` rather than `disabled=""`.

## Round-trip fidelity

Parse → serialize round-trips work reliably for well-formed HTML — with one important caveat about attribute values.

For text content, entities survive the round trip: `&amp;` is decoded to `&` during parsing and re-encoded to `&amp;` during serialization.

For attribute values, round-trips can silently corrupt entity-containing data. Because attribute entities are not decoded during parsing but `&` is escaped during serialization, any entity in an attribute value double-encodes on each round-trip:

```
data-label="Tom &amp; Jerry"  →  parse  →  stored as "Tom &amp; Jerry"
                              →  serialize  →  data-label="Tom &amp;amp; Jerry"
                                                          ↑ double-encoded
```

This affects any attribute value containing `&` that was already escaped in the source HTML. If you need to round-trip HTML that contains entity-encoded attribute values, decode them before re-serializing or avoid passing serialized output back through `innerHTML`.

Round-trip fidelity depends on which parser produced the tree. Since `parseHtml` doesn't handle void elements but serialization always produces closing tags, a fragment containing `<br>` will round-trip with different structure than expected:

```
parseHtml('<p>A<br>B</p>')  →  serialize  →  '<p>A<br>B</br></p>'
                                               ↑ B is now a child of <br>

parseDocument('...<br>...')  →  serialize  →  '<br></br>'
                                               ↑ correct — void element, no children
```

`parseDocument` handles void elements correctly, so its round-trips are faithful for standard HTML.

## What happens with malformed markup

Neither parser does spec-compliant error recovery. No auto-closing of unclosed tags, no adoption agency algorithm, no fostering, no optional tag omission. This is the cost of the simpler regex approach — and it's acceptable because the primary input source (framework-generated HTML) is well-formed by construction.

Both parsers treat closing tags as anonymous stack pops — any closing tag pops one level regardless of whether it matches the currently open element. This works well for well-formed HTML but produces unexpected results with mismatched tags:

```html
<!-- Input -->
<div><span>text</div>

<!-- Resulting tree -->
<div>
  <span>text</span>
</div>
```

The `</div>` doesn't match `<span>`, but it pops the stack anyway. The `<span>` ends up implicitly closed.

If there are more closing tags than opening tags, the parser handles it gracefully. In `parseHtml`, excess closing tags return to the root fragment. In `parseDocument`, they return to the current structural parent (`document.head` or `document.body` depending on context). Neither parser throws an error.

`parseDocument` has an additional safety mechanism: structural tag boundaries (`<head>`, `<body>`) reset the parser stack entirely. An unclosed element inside `<head>` can't leak into `<body>` content. This limits how far mismatched tags can cascade.

## Raw text elements — a tokenizer limitation

The regex tokenizer treats `<` and `>` as tag delimiters everywhere in the input. It has no concept of "raw text elements" — elements like `<script>` and `<style>` that can contain these characters as literal text rather than markup.

```html
<!-- This will break both parsers -->
<script>
  if (a < b) {
    doThing();
  }
</script>
```

The `<` before `b` will be interpreted as the start of a new tag, corrupting the parse tree. The HTML5 spec handles this with dedicated raw-text element states in its state machine. The regex tokenizer has no such mechanism — it's the most practical cost of the simpler approach.

Framework-generated HTML rarely triggers this: bundlers extract scripts into separate files, and CSS preprocessors handle style content. If you need inline scripts or styles with these characters, escape them (`&lt;`, `&gt;`) or restructure to avoid the conflict.

## When the DOM looks wrong

The most common parsing surprises, their causes, and how to fix them:

| Symptom | Cause | Fix |
| --- | --- | --- |
| Text after `<br>` is nested inside it | `parseHtml` doesn't recognize void elements — `<br>` pushes onto the stack | Use explicit closing tags: `<br></br>` |
| Attribute `data-x="Tom &amp; Jerry"` becomes `Tom &amp;amp; Jerry` after a round-trip | Attribute entities aren't decoded on parse, but `&` is escaped on serialize | Avoid entity-encoded `&` in attributes, or decode before re-serializing |
| `<my-widget />` in a hydrated doc has no children | `parseDocument` treats `/>` as self-closing for any element | Use `<my-widget></my-widget>` with an explicit closing tag |
| `template.innerHTML` returns `''` after parsing | `parseHtml` appends template children to the element, not `.content` | Access children via `template.childNodes` or `template.outerHTML` instead |
| Whitespace gaps appear between elements in `parseHtml` output | `parseHtml` preserves whitespace-only text nodes between tags | Expected behavior — `parseDocument` strips them; `parseHtml` doesn't |
| `<script>if (a < b) {}</script>` corrupts the parse tree | The regex tokenizer interprets `<` as a tag delimiter everywhere | Move scripts to external files, or escape as `&lt;` |
| Custom element's `connectedCallback` doesn't fire during `parseHtml` | Elements are appended to a disconnected `DocumentFragment` | `connectedCallback` fires when the fragment is inserted into the live DOM |

## Where to go next

- **[Scope and Boundaries](./scope-and-boundaries.md)** — serialization behavior, entity encoding limits, and the full boundary inventory
- **[Parse HTML Strings into DOM Trees](../recipes/parse-html.md)** — practical usage patterns for `innerHTML` and `parseDocument`
