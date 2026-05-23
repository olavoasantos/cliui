# Parse HTML Strings into DOM Trees

Turn HTML strings into DOM nodes using the right parser for your situation.

Every example starts from a `Window`:

```ts
import {Window} from '@cliui/dom';

const window = new Window();
const document = window.document;
```

## Choose a parser

| Question                                        | `innerHTML` / `parseHtml`             | `parseDocument`                           |
| ----------------------------------------------- | ------------------------------------- | ----------------------------------------- |
| **What does it produce?**                       | `DocumentFragment` (or sets children) | Mutates an existing `Document` in place   |
| **Understands `<html>`, `<head>`, `<body>`?**   | No — creates them as regular elements | Yes — routes content to skeleton elements |
| **Recognizes void elements (`<br>`, `<img>`)?** | No — use explicit closing tags        | Yes — 14 void elements handled correctly  |
| **Whitespace-only text nodes?**                 | Preserved                             | Stripped                                  |
| **Strips `<!DOCTYPE>`?**                        | No                                    | Yes                                       |
| **Use case**                                    | Fragments, templates, dynamic content | Full HTML document hydration              |

**Rule of thumb:** if your HTML has `<html>`, `<head>`, or `<body>` tags, use `parseDocument`. For everything else, use `innerHTML` or `parseHtml`.

## Parse a fragment

### Set innerHTML

Assign an HTML string and the element's children are replaced:

```ts
const container = document.createElement('div');
container.innerHTML = '<h1>Title</h1><p>Body text.</p>';

container.children.length; // → 2  ← verify this before continuing
container.querySelector('h1')!.textContent; // → 'Title'
```

Setting `innerHTML` to `''`, `null`, or `undefined` clears the element's children without invoking the parser.

Malformed HTML is parsed best-effort — unclosed tags remain open until the end of the string.

> `innerHTML` uses `parseHtml` internally, which has no void element table. Always use explicit closing tags for void elements: `<br></br>`, not `<br>`. Self-closing syntax (`<br/>`) won't work either.

### Call parseHtml directly

If you need to inspect or modify nodes before inserting them, call `parseHtml` to get a `DocumentFragment`:

```ts
import {Window, parseHtml} from '@cliui/dom';

const window = new Window();
const document = window.document;

const fragment = parseHtml('<li>Item 1</li><li>Item 2</li><li>Item 3</li>', document.body);
```

The second argument provides the owning `Document` for element creation — it doesn't affect parsing behavior.

```ts
const items = fragment.querySelectorAll('li');
for (const item of items) {
  if (item.textContent === 'Item 2') {
    item.parentNode!.removeChild(item);
  }
}

const list = document.createElement('ul');
list.appendChild(fragment);
document.body.appendChild(list);

document.body.innerHTML;
// → '<ul><li>Item 1</li><li>Item 3</li></ul>'
```

## Parse a full document

`parseDocument` hydrates a complete HTML document into an existing `Document` skeleton:

```ts
import {Window, parseDocument} from '@cliui/dom';

const window = new Window();
const document = window.document;

parseDocument(
  `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="utf-8">
      <title>My App</title>
    </head>
    <body>
      <h1>Hello</h1>
      <p>Welcome.</p>
    </body>
  </html>`,
  document,
);

document.documentElement.getAttribute('lang'); // → 'en'
document.head.children.length; // → 2 (meta + title)
document.body.children.length; // → 2 (h1 + p)  ← verify this before continuing
```

Key behaviors:

- **Mutates in place.** Attributes from `<html>`, `<head>`, and `<body>` tags are applied to existing skeleton elements.
- **`<!DOCTYPE>` is stripped.** It doesn't appear in the tree.
- **Void elements work correctly.** `<meta>`, `<br>`, `<img>`, `<input>`, `<link>`, and 9 others never push onto the parser stack.
- **Whitespace-only text nodes are stripped.** Indentation between tags won't create empty text nodes.

### Handle missing structural tags

If the HTML has no `<html>`, `<head>`, or `<body>` tags, everything routes to `document.body`:

```ts
parseDocument('<h1>Just content</h1><p>No structural tags.</p>', document);

document.body.children.length; // → 2
```

Content between `</head>` and `<body>` also routes to the body:

```ts
parseDocument(
  `<head><title>App</title></head>
  <link rel="stylesheet" href="style.css">
  <body><p>Main content.</p></body>`,
  document,
);

document.body.querySelector('link'); // → <link rel="stylesheet" href="style.css">
```

## Decode entities in text content

Both parsers decode HTML entities in text nodes — named, decimal, and hexadecimal:

```ts
container.innerHTML = '<p>Tom &amp; Jerry &mdash; &copy; 2025</p>';
container.querySelector('p')!.textContent;
// → 'Tom & Jerry — © 2025'

container.innerHTML = '<p>&#123;braces&#125; &#x263A;</p>';
container.querySelector('p')!.textContent;
// → '{braces} ☺'
```

Named entity matching is case-insensitive. Supported named entities: `amp`, `lt`, `gt`, `quot`, `apos`, `nbsp`, `copy`, `reg`, `trade`, `mdash`, `ndash`, `laquo`, `raquo`, `bull`, `hellip`.

> Entities in attribute values are **not** decoded — this is a deliberate divergence from browsers. Decode them yourself after parsing if needed.

## Handle void elements with parseDocument

`parseDocument` recognizes 14 void elements that never need closing tags:

`area`, `base`, `br`, `col`, `embed`, `hr`, `img`, `input`, `link`, `meta`, `param`, `source`, `track`, `wbr`

```ts
parseDocument(
  `<body>
    <p>Line one<br>Line two</p>
    <img src="photo.png" alt="A photo">
    <input type="text" name="query">
  </body>`,
  document,
);

const p = document.querySelector('p')!;
p.childNodes.length; // → 3  (text, br, text)
p.childNodes[2].textContent; // → 'Line two'
```

`parseDocument` also honors self-closing syntax (`<tag />`) on any element. Use explicit closing tags for non-void elements: `<my-widget></my-widget>`, not `<my-widget />`.

## Where to go next

- **[HTML Parsing — What's Supported](../learn/html-parsing.md)** — for entity coverage, tokenizer behavior, and the full list of recognized void elements
- **[Serialize DOM Trees to HTML](./serialization.md)** — the reverse operation: turning DOM trees back into HTML strings
