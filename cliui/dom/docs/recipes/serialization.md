# Serialize DOM Trees to HTML

Convert DOM trees back into HTML strings.

Every example starts from a `Window`:

```ts
import {Window} from '@cliui/dom';

const window = new Window();
const document = window.document;
```

## Get an element as HTML

Use `outerHTML` for the element and its descendants, `innerHTML` for children only:

```ts
const el = document.createElement('div');
el.setAttribute('class', 'card');
el.appendChild(document.createTextNode('Hello'));

el.outerHTML; // → '<div class="card">Hello</div>'
el.innerHTML; // → 'Hello'
```

Nested structures serialize recursively:

```ts
const list = document.createElement('ul');
const item = document.createElement('li');
item.appendChild(document.createTextNode('First'));
list.appendChild(item);

list.outerHTML; // → '<ul><li>First</li></ul>'
list.innerHTML; // → '<li>First</li>'
```

> **Checkpoint.** If `outerHTML` includes the wrapping tag and `innerHTML` omits it, serialization is working correctly.

## Serialize any node

`serializeNode` handles elements, text nodes, and comments. `serializeChildren` handles fragments and parent nodes.

```ts
import {Window, serializeNode, serializeChildren} from '@cliui/dom';

const window = new Window();
const document = window.document;
```

| Node type        | Function            | Output                                     |
| ---------------- | ------------------- | ------------------------------------------ |
| Element          | `serializeNode`     | `<tag attrs>children</tag>`                |
| Text             | `serializeNode`     | Entity-encoded text content                |
| Comment          | `serializeNode`     | `<!--comment text-->`                      |
| DocumentFragment | `serializeChildren` | Concatenated serialization of all children |
| Any parent       | `serializeChildren` | Same result as `innerHTML`                 |

```ts
// Element
const el = document.createElement('div');
el.setAttribute('id', 'root');
el.appendChild(document.createTextNode('Content'));
serializeNode(el); // → '<div id="root">Content</div>'

// Text node
const text = document.createTextNode('Tom & Jerry');
serializeNode(text); // → 'Tom &amp; Jerry'

// Comment
const comment = document.createComment('TODO: fix this');
serializeNode(comment); // → '<!--TODO: fix this-->'
```

For fragments, `serializeNode` returns `''` — use `serializeChildren` instead:

```ts
import {parseHtml} from '@cliui/dom';

const fragment = parseHtml('<li>Item 1</li><li>Item 2</li>', document.body);
serializeChildren(fragment); // → '<li>Item 1</li><li>Item 2</li>'
```

`serializeChildren` on an element produces the same result as `innerHTML`:

```ts
const ul = document.createElement('ul');
ul.appendChild(document.createElement('li'));
ul.appendChild(document.createElement('li'));

serializeChildren(ul); // → '<li></li><li></li>'
ul.innerHTML; // → '<li></li><li></li>'
```

## Understand what gets escaped

Serialization escapes special characters automatically. The rules differ by context:

| Context          | Characters escaped | Example input → output                          |
| ---------------- | ------------------ | ----------------------------------------------- |
| Text nodes       | `&` `<` `>` `"`    | `<div>` → `&lt;div&gt;`                         |
| Attribute values | `&` `"`            | `Tom & "Jerry"` → `Tom &amp; &quot;Jerry&quot;` |

You never need to escape manually — `serializeNode`, `outerHTML`, and `innerHTML` all apply these rules.

## Handle void elements and boolean attributes

**Boolean attributes** with an empty string value serialize as bare names, without `=""`:

```ts
const input = document.createElement('input');
input.setAttribute('disabled', '');
input.setAttribute('type', 'text');

serializeNode(input);
// → '<input disabled type="text"></input>'
```

Set the value to `''` for the bare attribute form (`disabled`, `open`, `checked`, `hidden`, etc.).

**Void elements** always get a closing tag — @cliui/dom does not special-case them:

```ts
const br = document.createElement('br');
serializeNode(br); // → '<br></br>'

const img = document.createElement('img');
img.setAttribute('src', 'photo.png');
serializeNode(img); // → '<img src="photo.png"></img>'
```

> **Sharp edge.** The output `<br></br>` is valid for re-parsing with `parseHtml` (which also treats void elements as normal elements), but it won't match browser-style self-closing output like `<br>` or `<br />`. If you're comparing against browser-generated HTML, expect this difference.

## Round-trip parse and serialize

`parseHtml` → `serializeNode` preserves element structure, comments, text content, and nesting:

```ts
import {Window, parseHtml, serializeNode} from '@cliui/dom';

const window = new Window();
const document = window.document;

const html = '<article data-id="42"><!--note--><h1>Title &amp; More</h1></article>';

const fragment = parseHtml(html, document.body);
const article = fragment.firstChild!;

serializeNode(article);
// → '<article data-id="42"><!--note--><h1>Title &amp; More</h1></article>'
```

> **Checkpoint.** The round-trip output should match the input for element names, nesting, comments, and decoded text entities.

> **Warning: attribute entities don't round-trip faithfully.** `parseHtml` does not decode entities inside attribute values, but `serializeNode` escapes ampersands. An attribute like `title="Tom &amp; Jerry"` becomes `title="Tom &amp;amp; Jerry"` after re-serialization. If your HTML relies on entities inside attributes, verify the round-trip output manually.

## Where to go next

- **[Parse HTML Strings into DOM Trees](./parse-html.md)** — for the reverse operation: turning HTML strings back into DOM trees, with parser selection guidance
- **[HTML Parsing — What's Supported](../learn/html-parsing.md)** — for the full parsing model, entity support details, and which HTML constructs are and aren't handled
