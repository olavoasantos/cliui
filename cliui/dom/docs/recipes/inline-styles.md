# Work with Inline Styles

Set, read, remove, and batch inline styles on elements.

Every example starts from a Window and Document:

```ts
import {Window} from '@cliui/dom';

const window = new Window();
const document = window.document;
const el = document.createElement('div');
document.body.appendChild(el);
```

> The DOM stores strings as-is — there is no unit validation. Terminal renderers typically use unitless values (`'8'`, not `'8px'`), but the DOM accepts whatever you pass.

## Set a style

Assign directly on `element.style` with the camelCase property name:

```ts
el.style.display = 'flex';
el.style.backgroundColor = 'red';
el.style.flexDirection = 'column';

el.style.cssText;
// → 'display: flex; background-color: red; flex-direction: column'
```

If the property name is in a variable or in kebab-case, use `setProperty`:

```ts
el.style.setProperty('background-color', 'red');

const prop = 'flex-direction';
el.style.setProperty(prop, 'column');
```

Both paths write to the same store. Pick whichever matches how you have the name.

## Read a style back

```ts
el.style.color; // camelCase
el.style.getPropertyValue('color'); // kebab-case
```

Both return the stored value, or `''` if the property hasn't been set. Never `undefined`, never `null`.

## Remove a style

Call `removeProperty` to delete a property and get its old value back:

```ts
const old = el.style.removeProperty('color'); // 'red'
```

Assigning `''` has the same effect:

```ts
el.style.color = '';
```

If the property is a shorthand, removal expands — removing `padding` clears all four longhands:

```ts
el.style.padding = '8';
el.style.removeProperty('padding');

el.style.getPropertyValue('padding-top'); // '' — gone
```

## Set many styles at once

Each individual property change fires a hook notification. If you're setting several properties, use `cssText` to pay that cost once:

```ts
el.style.cssText = 'color: red; display: flex; padding: 8';

el.style.cssText;
// → 'color: red; display: flex; padding-top: 8; padding-right: 8; padding-bottom: 8; padding-left: 8'
```

`cssText` clears all existing properties, parses the new value, and fires one notification. It's a full replacement, not an append.

If the notification cost doesn't matter to your use case, setting properties individually is simpler and more readable.

## Handle shorthand expansion

Shorthand properties are expanded into longhands at write time. `padding`, `margin`, `gap`, `flex`, `transition`, `animation`, and `container` all expand — the store never holds a shorthand key.

```ts
el.style.padding = '1 2 3 4';

el.style.getPropertyValue('padding'); // '' — no such key
el.style.getPropertyValue('padding-top'); // '1'
el.style.getPropertyValue('padding-right'); // '2'
el.style.getPropertyValue('padding-bottom'); // '3'
el.style.getPropertyValue('padding-left'); // '4'
```

The standard CSS value expansion rules apply:

| Values written | top | right | bottom | left |
| -------------- | --- | ----- | ------ | ---- |
| `'8'`          | 8   | 8     | 8      | 8    |
| `'4 8'`        | 4   | 8     | 4      | 8    |
| `'1 2 3'`      | 1   | 2     | 3      | 2    |
| `'1 2 3 4'`    | 1   | 2     | 3      | 4    |

`gap` expands to `row-gap` and `column-gap`. `flex` expands to `flex-grow`, `flex-shrink`, and `flex-basis` — with keyword handling for `none` (0 0 auto) and `auto` (1 1 auto).

If you set a shorthand and can't read it back, you're reading the shorthand name instead of the longhand. Always read the longhands individually.

## Use custom properties

Custom properties (`--*`) bypass all validation. Set and read them through `setProperty` and `getPropertyValue`:

```ts
el.style.setProperty('--brand-color', '#0066cc');
el.style.setProperty('--spacing', '16');

el.style.getPropertyValue('--brand-color'); // '#0066cc'
```

CamelCase dot access doesn't work for `--`-prefixed names. Use the method API.

## Understand how styles reach the renderer

Style changes don't update the DOM attribute map. The `style` declaration store and the `style` attribute are independent — changing one doesn't touch the other:

```ts
el.style.color = 'red';

el.getAttribute('style'); // → null
el.outerHTML; // → '<div></div>'  — no style attribute anywhere
```

Renderers observe style changes through [hook notifications](../learn/hooks-bridge.md), not through attributes. Every declaration store mutation fires `hooks.setAttribute(element, 'style', cssText)` — delivering the full serialized state, not a delta.

If you need styles in serialized HTML (for export, SSR, or debugging), sync manually:

```ts
el.setAttribute('style', el.style.cssText);
el.outerHTML; // '<div style="color: red"></div>'
```

In normal rendering workflows, this is unnecessary — the hooks bridge handles it.

## Where to go next

- **[CSSStyleDeclaration — Inline Styles and Attribute-Shaped Hooks](../learn/css-style-declaration.md)** — if you need to understand why every property change fires the full `cssText` to the renderer — not a delta — this explains the Proxy internals, notification flow, and the three-surface architecture
- **[The Hooks Bridge](../learn/hooks-bridge.md)** — if you need to intercept style mutations at the renderer level, this explains how they arrive as `setAttribute` notifications
- **[Scope and Boundaries](../learn/scope-and-boundaries.md)** — if you're unsure which CSS properties the DOM accepts, this covers the curated property set and what's outside it
