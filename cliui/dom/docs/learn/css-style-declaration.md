# CSSStyleDeclaration — Inline Styles and Attribute-Shaped Hooks

## Three surfaces, not one

Inline styles in @cliui/dom involve three distinct surfaces that look like they should be one thing but aren't:

1. **The declaration store** — `element.style`. A Proxy-backed object that stores CSS properties in an internal Map. This is where `element.style.color = 'red'` writes.
2. **The hook notification** — `hooks.setAttribute(element, 'style', cssText)`. When the declaration store changes, it serializes its contents and fires the same `setAttribute` hook used for `id`, `class`, and every other attribute. Renderers receive style changes as attribute-shaped mutations.
3. **The DOM attribute map** — `element.getAttribute('style')`, `element.outerHTML`. The actual attribute storage on the element. This is where `element.setAttribute('style', '...')` writes.

In a browser, these three surfaces are synchronized — setting `element.style.color` updates the `style` attribute, and setting the `style` attribute hydrates `element.style`. In @cliui/dom, **they are currently not synchronized**. The declaration store and the DOM attribute map are independent:

```ts
element.style.color = 'red';
element.style.cssText; // 'color: red'
element.getAttribute('style'); // null — the attribute was never set
element.outerHTML; // '<div></div>' — no style attribute

element.setAttribute('style', 'display: flex');
element.getAttribute('style'); // 'display: flex'
element.style.display; // '' — the declaration store wasn't updated
element.style.cssText; // 'color: red' — still the old value
```

This divergence reflects the current architecture of the hooks bridge: hook consumers receive a style-shaped attribute mutation, but that does not imply the DOM attribute map has been updated. A future version could synchronize these surfaces, but doing so would add complexity (bidirectional sync between the Map and the attribute store) for a benefit that renderers don't currently need — they read styles from hook notifications, not from `getAttribute`.

Understanding which surface you're interacting with matters when you're debugging why a style change isn't reaching your renderer, or why `outerHTML` doesn't show the styles you set. The rest of this document focuses on surface 1 (the declaration store) and surface 2 (the hook notification), since those are the path your styles take to reach the renderer.

### Browser vs. @cliui/dom

| Operation                              | Browser                                                                   | @cliui/dom                                                                               |
| -------------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `element.style.color = 'red'`          | Updates declaration store, syncs to `style` attribute, triggers rendering | Updates declaration store, fires `hooks.setAttribute`, does **not** update DOM attribute |
| `element.getAttribute('style')`        | Returns serialized inline styles                                          | Returns whatever was set via `setAttribute` (unrelated to declaration store)             |
| `element.outerHTML`                    | Includes `style` attribute with inline styles                             | Does **not** include declaration store contents                                          |
| `element.setAttribute('style', '...')` | Hydrates `element.style` declaration store                                | Updates DOM attribute only — does **not** hydrate declaration store                      |
| Renderer notification                  | Implicit (rendering engine observes all state)                            | Explicit via `hooks.setAttribute(element, 'style', cssText)`                             |

## Why a Proxy

The browser DOM exposes styles through camelCase properties — `element.style.backgroundColor`, `element.style.flexDirection`. These aren't real object properties. They're intercepted accesses that read from and write to an internal CSS property store.

The obvious alternative: define ~50 explicit getters and setters on `CSSStyleDeclaration.prototype`, one per CSS property. That would avoid Proxy overhead entirely. But custom properties (`--brand-color`, `--spacing-lg`) are open-ended — you can't pre-define getters for names that don't exist yet. As soon as one property requires dynamic interception, a Proxy becomes mandatory, and at that point you may as well route everything through it.

`CSSStyleDeclaration`'s internal state lives in a module-level `WeakMap`, not on the instance itself. Three reasons:

- **Collision avoidance.** CSS property names like `display` and `color` overlap with names you'd use for internal state. If internal bookkeeping used instance properties, a property named `display` would collide with the CSS longhand `display` and route through `setProperty` instead of storing internal state.
- **Enumeration hygiene.** Internal state shouldn't appear in `Object.keys(element.style)` or affect `length`. The WeakMap is invisible to reflection.
- **Consistency.** The library uses the same WeakMap pattern for `DOMTokenList` and other internal stores — keeping the approach uniform makes the codebase easier to navigate.

Every reference to `element.style` is a reference to this Proxy. The underlying object is never directly accessible.

### How the get trap resolves property access

When you read `element.style.backgroundColor`, the Proxy's get trap runs through this sequence:

1. Check if the property exists on the target object (prototype methods like `setProperty`, `getPropertyValue`, `removeProperty`, `item`, or getters like `length`, `cssText`).
2. If it's a **function**, return it bound to the unproxied target. This binding means every method on `element.style` is a first-class function — you can destructure it, pass it around, or partially apply it without losing `this`.
3. If it exists and isn't `undefined`, return it directly (handles `length`, `cssText` getters, and the silent-fallthrough read path for unrecognized properties stored as plain JS values).
4. Convert to kebab-case (`backgroundColor` → `background-color`). If the result is a known **longhand** or **custom property** (`--*`), read from the Map via `getPropertyValue()`.
5. Otherwise, return `undefined`.

### How the set trap routes assignments

When you write `element.style.padding = '1 2 3 4'`, the set trap:

1. Converts to kebab-case and checks if the property is a known **longhand**, **shorthand**, or **custom property**.
2. If yes — routes through `setProperty()`, which handles expansion, storage, and notification.
3. If no — stores the value as a plain JS property on the underlying object. No CSS storage, no Map entry, no hook notification.

This "silent fallthrough" is a deliberate choice. It matches browser behavior — browsers accept any property assignment on `element.style` without throwing, even for nonsensical names. The difference is that browsers recognize all standard CSS properties; @cliui/dom recognizes a curated subset.

The cost of accepting everything gracefully is that mistakes are invisible. If you typo `element.style.bordreRadius`, nothing complains — the value is stored as a JS property, but it never enters `cssText` and the renderer never sees it. No error. No console warning. No type error. The renderer just doesn't render it. In development, a TypeScript type with a narrow CSS property union catches these at compile time. The library itself will not tell you.

```ts
element.style.transform = 'rotate(45deg)';

element.style.transform; // 'rotate(45deg)' — reads from the JS object
element.style.getPropertyValue('transform'); // '' — not in the CSS Map
element.style.cssText; // '' — transform never entered CSS storage
```

## Tracing a missing style

If a style isn't reaching your renderer, trace the chain:

```ts
element.style.borderRadius = '4px';
element.style.color = 'red';

// The renderer updates color. It never touches borderRadius. Why?
```

Walk the set trap: `borderRadius` → `camelToKebab` → `border-radius` → check `LONGHAND_PROPERTIES` → `border-radius` is not in the curated set → silent fallthrough → stored as a plain JS property. Meanwhile, `color` is in the curated set → `setProperty` → Map → `notifyCSSStyleDeclaration` → `hooks.setAttribute(element, 'style', 'color: red')`. The hook fires with `cssText` that contains `color` but not `border-radius`.

The trace reveals the answer: `border-radius` is not in the curated property set. The value is stored on the JS object (readable via `element.style.borderRadius`), but it never entered the CSS Map, never appeared in `cssText`, and never fired a hook. The renderer didn't ignore it — the renderer never received it.

## The curated property set

The alternative to a curated set is what browsers do: accept every CSS property. In a browser, that works because the rendering engine and the DOM are co-located — the engine can filter irrelevant properties internally. In @cliui/dom, every recognized property becomes an instruction the renderer receives through the hooks bridge. Accepting arbitrary property names would mean every typo and every browser-only property silently enters the style attribute, cluttering the renderer's input with data it can't act on.

The curated set acts as a contract between the DOM and the rendering layer: these are the properties the system understands end-to-end. The [Scope and Boundaries](./scope-and-boundaries.md#inline-styles--curated-property-set) doc lists the complete set of ~50 longhands and 4 shorthands.

Both camelCase and kebab-case work through the method API:

```ts
element.style.setProperty('background-color', 'red'); // ✔ kebab-case
element.style.setProperty('backgroundColor', 'red'); // ✔ camelCase — converted automatically
element.style.backgroundColor = 'red'; // ✔ Proxy converts to kebab-case
```

The DOM does not validate CSS values. `element.style.color = 'banana'` stores `'banana'` without error. Value validation is a rendering-layer concern — the DOM stores what you give it, and the renderer decides what it means. This follows the same Layer 1 / Layer 2 separation described in [What Is @cliui/dom?](./what-is-cliui-dom.md#two-layers-state-and-rendering): the DOM is state storage, not interpretation.

## Custom properties

Any property starting with `--` is accepted without validation:

```ts
element.style.setProperty('--brand-color', '#0066cc'); // ✔ stored, hooks notified
element.style.getPropertyValue('--brand-color'); // '#0066cc'
```

Custom properties bypass the longhand/shorthand check entirely. They're stored directly and trigger notification like any other property. This makes them the escape hatch — if you need a property the curated set doesn't include, a custom property gets it into `cssText` and through the hooks bridge.

## Shorthand expansion

When a shorthand is set, it's expanded into longhands before storage. The Map never contains a shorthand key — only the expanded longhands. The alternative — storing the shorthand and expanding on read — would make the Map an unreliable source of truth, since the same longhand could exist both as a direct entry and as part of an unexpanded shorthand. Expanding at write time means the Map is always the canonical state. `padding: 1 2 3 4` doesn't exist as a single stored value. It's four longhands wearing a trench coat.

### Proxy-accessible shorthands

These four shorthands are in `SHORTHAND_PROPERTIES`, so the Proxy's set trap routes them through `setProperty`:

**padding / margin** — Standard CSS box model expansion:

| Input values | Expansion                                |
| ------------ | ---------------------------------------- |
| `1`          | top=`1`, right=`1`, bottom=`1`, left=`1` |
| `1 2`        | top=`1`, right=`2`, bottom=`1`, left=`2` |
| `1 2 3`      | top=`1`, right=`2`, bottom=`3`, left=`2` |
| `1 2 3 4`    | top=`1`, right=`2`, bottom=`3`, left=`4` |

**gap** — Expands to `row-gap` and `column-gap`:

| Input values | Expansion                   |
| ------------ | --------------------------- |
| `1`          | row-gap=`1`, column-gap=`1` |
| `1 2`        | row-gap=`1`, column-gap=`2` |

**flex** — Three keyword modes plus positional values:

| Input        | flex-grow | flex-shrink | flex-basis |
| ------------ | --------- | ----------- | ---------- |
| `none`       | `0`       | `0`         | `auto`     |
| `auto`       | `1`       | `1`         | `auto`     |
| `2` (number) | `2`       | `1`         | `0`        |
| `2 3`        | `2`       | `3`         | `0`        |
| `2 3 100px`  | `2`       | `3`         | `100px`    |

Four or more values is treated as malformed and ignored — the expansion returns `null` and no new values are stored. Previous `flex-grow`, `flex-shrink`, and `flex-basis` values are left untouched — a malformed `flex` value is not the same as a clear. The notification still fires, but with unchanged `cssText`.

### Two CSS surfaces

The library has two CSS surfaces: **inline styles** (`element.style`, routed through the curated property set) and **stylesheet content** (`<style>` element text, parsed by the rendering layer's CSS engine). They have different rules — the inline surface drops unknown properties, the stylesheet surface passes them through to its own rule system.

`expandShorthand` serves both surfaces. Three additional shorthands — `transition`, `animation`, and `container` — are handled by `expandShorthand` but are **not** in `SHORTHAND_PROPERTIES`. The rendering layer's stylesheet parser uses `expandShorthand` to decompose shorthand declarations in stylesheets. The Proxy's camelCase surface excludes them because their longhand targets (e.g., `transition-duration`, `animation-name`) aren't in the curated property set either.

```ts
// ✘ Proxy doesn't recognize 'transition' — stores on JS object, not CSS
element.style.transition = 'color 200ms ease';

// ✔ setProperty calls expandShorthand directly, bypassing the Proxy check
element.style.setProperty('transition', 'color 200ms ease');
```

Expanding them through inline styles produces longhands that the Proxy won't recognize for reads — you'd need `getPropertyValue('transition-duration')` to read them back, not `element.style.transitionDuration`.

**transition** — Multi-layer (comma-separated). Each layer parsed by token type:

- Time values: first = duration, second = delay
- Easing keywords (`ease`, `linear`, `ease-in`, `ease-out`, `ease-in-out`) or functions (`cubic-bezier(...)`, `steps(...)`) → timing function
- Everything else → property name
- Defaults: property=`all`, duration=`0ms`, timing=`ease`, delay=`0ms`

```ts
element.style.setProperty('transition', 'color 200ms ease 100ms, opacity 300ms');
// Expands to:
//   transition-property: color, opacity
//   transition-duration: 200ms, 300ms
//   transition-timing-function: ease, ease
//   transition-delay: 100ms, 0ms
```

**animation** — Multi-layer, 8 component properties. Token disambiguation uses keyword sets (direction, fill-mode, play-state, timing). First unmatched token becomes the animation name. Defaults: name=`none`, duration=`0ms`, timing=`ease`, delay=`0ms`, iteration-count=`1`, direction=`normal`, fill-mode=`none`, play-state=`running`.

**container** — Split on `/`. Name before slash, type after. No slash means the value is the type, name defaults to `none`.

```ts
element.style.setProperty('container', 'sidebar / inline-size');
// Expands to:
//   container-name: sidebar
//   container-type: inline-size
```

## The notification flow

Every `setProperty` call (unless batched) triggers a notification chain. The write path flows from user code through the declaration store to the renderer via hook notification. The read path is shorter — user code reads from the Map directly, without involving the renderer. The renderer cannot push styles back through this path; it can only receive.

```
  Write path (user → declaration store → renderer):

  element.style.color = 'red'
        │
        ▼
     Proxy ──▶ setProperty ──▶ Map (store) ──▶ serialize cssText
      set           │                                │
      trap          │                                ▼
                    └─────────────────────▶ hooks.setAttribute(
                                              element,
                                              'style',
                                              'color: red'
                                           )
                                                │
                                                ▼
                                           Renderer

  Read path (user → Map, no renderer):

  element.style.color
        │
        ▼
     Proxy ──▶ getPropertyValue('color') ──▶ Map.get('color')
      get                                        │
      trap                                       ▼
                                              'red'
```

Note that the `hooks.setAttribute` call is a **hook notification**, not an update to the element's DOM attribute map. The renderer receives a style-shaped attribute mutation, but `element.getAttribute('style')` does not change. This is the three-surface split described in the [opening section](#three-surfaces-not-one).

Three consequences follow from this design:

**Full cssText every time.** Each property change serializes the entire Map into a `cssText` string and sends it through the [hooks bridge](./hooks-bridge.md). Setting 3 properties means 3 full serializations and 3 hook calls — not 3 deltas. The cost is O(n) per mutation where n is the total number of properties currently in the Map, not the number being set. An element with 50 properties that has one property changed still serializes all 50. This is simpler and more predictable than delta-based notification (the renderer always gets the complete current state), but it means tight loops with many property changes benefit from batching with `cssText`.

**Standalone declarations are silent.** If you construct a `CSSStyleDeclaration` directly (`new CSSStyleDeclaration()`) with no element argument, mutations update the Map but no hook fires — there's no element to notify about. This is distinct from elements that have been created but not yet appended to the tree: those elements carry an owner document whose window holds the hooks, so their style mutations _do_ fire hooks even before the element is connected.

**`Element.style` is lazy.** The `CSSStyleDeclaration` is created on first access and cached on subsequent reads. Elements that never have their `style` property accessed never pay the cost of Proxy construction or WeakMap allocation.

## Batching — one notification for many changes

For multiple property changes in a tight loop, `cssText` collapses the notification cost:

```ts
// ✘ 3 serializations, 3 hook notifications
element.style.color = 'red';
element.style.display = 'flex';
element.style.padding = '1 2 3 4';

// ✔ 1 serialization, 1 hook notification
element.style.cssText = 'color: red; display: flex; padding: 1 2 3 4';
```

The `cssText` setter uses an internal `batch` parameter on `setProperty`. It:

1. Clears the entire Map.
2. Parses the CSS text, calling `setProperty(property, value, true)` for each declaration — `batch = true` suppresses per-property notification.
3. Fires a single `notifyCSSStyleDeclaration()` at the end.

Without batching, three individual property assignments produce 3 serializations and 3 hook calls. With `cssText`, a single assignment handles all of them in one notification. The savings grow linearly — setting 10 properties in a loop means 10 notifications without batching, 1 with `cssText`.

The standard DOM `setProperty(property, value, priority)` uses the third parameter for `priority` (for `!important`). @cliui/dom does not support `!important` — the third parameter is repurposed internally for batch suppression. Passing any truthy third argument — including the string `'important'` — silently suppresses the hook notification. Code ported from a browser context that calls `setProperty('color', 'red', 'important')` will update the Map but the renderer will never learn about the change. Omit the third argument unless you are intentionally batching.

### Appending to cssText

Appending works but triggers a full clear-and-reparse:

```ts
element.style.cssText += '; font-weight: bold';
```

This reads the existing `cssText`, concatenates the new declaration, then sets the result — which clears the Map and re-parses everything. Each `+=` triggers a full serialize (on the read side) plus a clear and full reparse (on the set side), making it more expensive than a single `cssText = '...'` assignment with all declarations included. For performance-sensitive code paths, set `cssText` once with all declarations rather than appending incrementally.

## Choosing the right API

| You want to...                              | Use                                                  | Why                                                                                                                                                   |
| ------------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Set one property                            | `element.style.color = 'red'`                        | Simplest syntax. Works for any property in the curated set.                                                                                           |
| Set a property not in the curated set       | `element.style.setProperty('transition', '...')`     | `setProperty` calls `expandShorthand` directly, bypassing the Proxy's curated-set gate.                                                               |
| Set many properties at once                 | `element.style.cssText = '...'`                      | One notification instead of N. Clears and re-parses.                                                                                                  |
| Read a property                             | `element.style.color` or `getPropertyValue('color')` | Both read from the Map. `getPropertyValue` works for kebab-case and properties outside the curated set that were stored via `setProperty`.            |
| Remove a property                           | `element.style.removeProperty('color')`              | Also works: `element.style.color = ''` or `setProperty('color', '')`.                                                                                 |
| Set the `style` attribute for serialization | `element.setAttribute('style', '...')`               | Updates the DOM attribute map and `outerHTML` — **not** the declaration store. Does not trigger hook notification through the declaration-store path. |

Avoid using `setAttribute('style', ...)` to drive renderer updates — it writes to the DOM attribute map, but the renderer listens to hook notifications from the declaration store. The two paths don't converge.

## Removing properties

Removing a property is a single conceptual operation — clear the Map entry and fire notification — with three surface syntaxes:

```ts
element.style.removeProperty('color'); // explicit removal, returns the old value
element.style.setProperty('color', ''); // setting to empty string triggers removal
element.style.color = ''; // same effect through the Proxy
```

All three clear the property from the Map and fire a single notification with the updated `cssText`. The design unifies them because, from the renderer's perspective, there's no meaningful difference between "removed" and "set to empty" — both mean "this property no longer has a value."

`removeProperty` also handles shorthands — `removeProperty('padding')` expands to find `padding-top`, `padding-right`, `padding-bottom`, and `padding-left`, then removes all four.

The `cssText` getter serializes the Map as `key: value` pairs joined by `; `, in Map insertion order, with no trailing semicolon.

## What this doc covered

Inline styles in @cliui/dom are three things pretending to be one: a structured property store, an attribute-shaped notification channel, and a DOM attribute that doesn't know about either. Understanding which surface you're touching — and which surface the renderer is listening to — is the whole game.

The Proxy exists because custom properties make static getters impossible. The curated set exists because a renderer deserves clean input. The hook fires the full `cssText` because a style is delivered as an attribute mutation, even though it isn't stored as one. Every other behavior — the silent fallthrough, the write-time expansion, the lazy getter, the batch parameter — follows from those three commitments.

If a style isn't reaching your renderer, trace the declaration-store path: is the property in the curated set? Was the `CSSStyleDeclaration` created from an element with an owner document? Is the third argument to `setProperty` truthy? The chain is short, and the answer is always in it.

## Where to go next

- **[The Hooks Bridge](./hooks-bridge.md)** — how `setAttribute` notifications reach renderers, the chaining contract, and timing guarantees
- **[Scope and Boundaries](./scope-and-boundaries.md)** — the full list of supported CSS properties, what's excluded, and why
- **[Work with Inline Styles](../recipes/inline-styles.md)** — practical how-to for common style operations
