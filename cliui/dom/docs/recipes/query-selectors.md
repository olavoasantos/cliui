# Query Elements with CSS Selectors

Find, test, and traverse elements using the supported selector syntax.

Every example starts from a pre-built document:

```ts
import {Window} from '@cliui/dom';

const window = new Window();
const document = window.document;

document.body.innerHTML = `
  <header id="top">
    <h1 class="title">App</h1>
  </header>
  <main>
    <ul class="nav">
      <li class="nav-item active"><a href="/home">Home</a></li>
      <li class="nav-item"><a href="/about">About</a></li>
    </ul>
    <div class="content" role="region">
      <p>Welcome.</p>
      <p class="muted">Footer text.</p>
    </div>
  </main>
`;
```

## Find the first matching element

`querySelector` returns the first match, or `null`:

```ts
const title = document.querySelector('h1');
title; // → <h1 class="title">App</h1>
title?.textContent; // → 'App'

const missing = document.querySelector('.nonexistent');
missing; // → null
```

Scope the search to any element, not just the document:

```ts
const main = document.querySelector('main')!;
const paragraph = main.querySelector('p');
// → <p>Welcome.</p>  (only searches within <main>)
```

## Find all matching elements

`querySelectorAll` returns a plain `Element[]` — **not** a `NodeList`. This is a deliberate divergence: you get a real array with `.map()`, `.filter()`, and `.reduce()` — no `Array.from()` dance. The array is a snapshot; it won't update when the DOM changes.

```ts
const items = document.querySelectorAll('.nav-item');
// → [<li class="nav-item active">…</li>, <li class="nav-item">…</li>]

items.length; // → 2
Array.isArray(items); // → true
```

Results follow document order. When nothing matches, you get an empty array — never `null`.

## Test whether an element matches

```ts
const li = document.querySelector('li')!;

li.matches('.nav-item'); // → true
li.matches('.active'); // → true
li.matches('div'); // → false
```

A standalone `matches` function is also available for functional patterns:

```ts
import {matches} from '@cliui/dom';

const items = document.querySelectorAll('li');
items.filter((el) => matches(el, '.active'));
// → [<li class="nav-item active">…</li>]
```

## Walk up the tree with closest

```ts
const link = document.querySelector('a[href="/home"]')!;

link.closest('li'); // → <li class="nav-item active">…</li>
link.closest('main'); // → <main>…</main>
link.closest('footer'); // → null
```

## Write compound selectors

Combine element, class, ID, and attribute conditions. All conditions are ANDed:

```ts
document.querySelector('div.content[role="region"]');
// → <div class="content" role="region">…</div>

document.querySelector('li.nav-item.active');
// → <li class="nav-item active">…</li>

document.querySelector('#top');
// → <header id="top">…</header>
```

Attribute values must be quoted — `[role="region"]` works, `[role=region]` silently matches nothing.

## Use combinators for structural queries

```ts
// Descendant (space) — any depth
document.querySelectorAll('main p');
// → [<p>Welcome.</p>, <p class="muted">Footer text.</p>]

// Child (>) — direct parent only
document.querySelectorAll('main > p');
// → []  (the <p> elements are inside <div>, not direct children of <main>)

document.querySelectorAll('.content > p');
// → [<p>Welcome.</p>, <p class="muted">Footer text.</p>]

// Adjacent sibling (+) — immediately preceding element sibling
document.querySelector('h1 + main');
// → null  (<main> is not a sibling of <h1>)

document.querySelector('header + main');
// → <main>…</main>

// General sibling (~) — any preceding element sibling
document.querySelector('header ~ main');
// → <main>…</main>
```

## Use :not() and :has()

```ts
document.querySelectorAll('.nav-item:not(.active)');
// → [<li class="nav-item">…</li>]

document.querySelectorAll('p:not(.muted)');
// → [<p>Welcome.</p>]
```

> **⚠️ @cliui/dom divergence:** `:has()` tests the element itself against the inner selector — it does **not** search descendants like the W3C spec. `div:has(.active)` is functionally identical to `div.active`.

```ts
// In a browser, this would find any <li> that CONTAINS an .active descendant.
// In @cliui/dom, it matches the <li> itself against .active:
document.querySelector('li:has(.active)');
// → <li class="nav-item active">…</li>  ← matches because the <li> IS .active

// The surprise: this returns null, NOT the <ul> containing an .active child:
document.querySelector('ul:has(.active)');
// → null  ← browser would return <ul class="nav">, @cliui/dom returns null
```

## Use pseudo-classes for state queries

```ts
// :focus — matches document.activeElement
const button = document.createElement('button');
document.body.appendChild(button);
document.setActiveElement(button);
document.querySelector(':focus');
// → <button></button>

// :disabled / :enabled — checks the disabled attribute
button.setAttribute('disabled', '');
button.matches(':disabled'); // → true
button.matches(':enabled'); // → false

// :active — checks for a `pressed` attribute
button.setAttribute('pressed', '');
button.matches(':active'); // → true

// :hover — walks the document.hoveredElement parent chain
// Set by your input layer:
// document.hoveredElement = someElement;

// :root — matches document.documentElement
document.querySelector(':root');
// → <html>…</html>
```

## Supported selectors — quick reference

| Category           | Syntax            | Notes                                            |
| ------------------ | ----------------- | ------------------------------------------------ |
| Element            | `div`, `span`     | Matches `localName`                              |
| ID                 | `#myid`           | Via `getAttribute('id')`                         |
| Class              | `.active`         | Whitespace-boundary match, no array split        |
| Universal          | `*`               | Matches any element                              |
| Attribute presence | `[disabled]`      | `hasAttribute` check                             |
| Attribute exact    | `[role="button"]` | Quoted values only — no `~=`, `^=`, `$=`, `*=`   |
| `:root`            | `:root`           | `documentElement` identity check                 |
| `:focus`           | `:focus`          | `activeElement` identity check                   |
| `:active`          | `:active`         | Checks `pressed` attribute                       |
| `:hover`           | `:hover`          | Walks `hoveredElement` parent chain              |
| `:disabled`        | `:disabled`       | Any element with `disabled` attribute            |
| `:enabled`         | `:enabled`        | Any element without `disabled` attribute         |
| `:not()`           | `:not(.hidden)`   | Negated match — recursive                        |
| `:has()`           | `:has(.active)`   | Matches the element itself, not descendants      |
| Descendant         | `div .item`       | Any ancestor                                     |
| Child              | `div > .item`     | Direct parent                                    |
| Adjacent sibling   | `h1 + p`          | Immediately preceding element (skips text nodes) |
| General sibling    | `h1 ~ p`          | Any preceding element sibling                    |

## What's not supported

| What                 | Examples                                      | What happens              |
| -------------------- | --------------------------------------------- | ------------------------- |
| Selector lists       | `div, span`                                   | **Wrong results**         |
| Positional pseudos   | `:nth-child()`, `:first-child`, `:last-child` | Silent no-match or throws |
| Structural pseudos   | `:empty`, `:checked`                          | Silent no-match           |
| Forgiving selectors  | `:where()`, `:is()`                           | **Throws**                |
| Attribute substring  | `[href^="/"]`, `[class*="btn"]`               | Silent no-match           |
| Pseudo-elements      | `::before`, `::after`                         | Silently ignored          |
| Unquoted attr values | `[type=button]`                               | Silent no-match           |

For comma-separated selectors, run separate queries:

```ts
// ✘ Wrong — produces incorrect results
document.querySelectorAll('div, span');

// ✔ Run each selector separately
const divs = document.querySelectorAll('div');
const spans = document.querySelectorAll('span');
```

## Where to go next

- **[Supported CSS Selectors](../learn/css-selectors.md)** — for the complete list of what the selector engine parses, caches, and rejects — including edge cases not covered in the quick reference above
- **[Scope and Boundaries](../learn/scope-and-boundaries.md)** — if you're unsure whether a specific browser API is implemented, this covers the full scope of @cliui/dom and its deliberate omissions
