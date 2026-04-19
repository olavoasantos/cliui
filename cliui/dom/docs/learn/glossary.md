# Glossary

Definitions for terms used throughout the @cliui/dom documentation — covering DOM tree structure, events, styling, selectors, custom elements, observation, parsing, Web APIs, performance instrumentation, and concepts specific to this library such as the [hooks bridge](#hooks-bridge), [handler pattern](#handler-pattern), and [upgrade](#upgrade) mechanism. Standard DOM terms are included when @cliui/dom's behavior diverges from browsers. Each entry links to the companion doc where the concept is covered in depth.

## By topic

**DOM tree:** [Attr](#attr), [Attribute](#attribute), [CharacterData](#characterdata), [ChildNode](#childnode), [Comment node](#comment-node), [Connected / disconnected](#connected--disconnected), [Document](#document), [Document fragment](#document-fragment), [Document skeleton](#document-skeleton), [Element](#element), [HTMLDialogElement](#htmldialogelement), [HTMLElement](#htmlelement), [HTMLTemplateElement](#htmltemplateelement), [Named node map](#named-node-map), [Namespace](#namespace), [Node](#node), [NodeList](#nodelist), [Owner document](#owner-document), [ParentNode](#parentnode), [SVGElement](#svgelement), [Text node](#text-node), [Void element](#void-element), [Window](#window)

**Events:** [Event](#event), [Event phase](#event-phase), [EventTarget](#eventtarget)

**CSS and styling:** [CSSStyleDeclaration](#cssstyledeclaration), [cssText](#csstext), [Curated property set](#curated-property-set), [Custom property](#custom-property), [Declaration store](#declaration-store), [DOM token list](#dom-token-list), [Shorthand expansion](#shorthand-expansion)

**Hooks and observation:** [Chaining contract](#chaining-contract), [Hooks bridge](#hooks-bridge), [Mutation record](#mutation-record), [MutationObserver](#mutationobserver), [Slot-and-chain model](#slot-and-chain-model)

**Custom elements:** [Custom element](#custom-element), [CustomElementRegistry](#customelementregistry), [Light-DOM style injection](#light-dom-style-injection), [Upgrade](#upgrade)

**Selectors:** [Combinator](#combinator), [matches / matchesParts](#matches--matchesparts), [Selector part](#selector-part)

**Parsing and serialization:** [parseDocument](#parsedocument), [parseHtml](#parsehtml)

**Performance:** [Performance](#performance), [PerformanceEntry](#performanceentry), [PerformanceObserver](#performanceobserver), [Recording surface](#recording-surface)

**Web APIs:** [Clipboard](#clipboard), [Handler pattern](#handler-pattern), [Location](#location), [MediaQueryList](#mediaquerylist), [Navigator](#navigator), [Notification](#notification)

**Architecture:** [Minimum viable DOM](#minimum-viable-dom), [polyfillEnvironment](#polyfillenvironment), [Two-layer architecture](#two-layer-architecture)

---

### Attr

The `Attr` class represents an attribute node (`nodeType = 2`). Attr nodes live inside an element's [Named node map](#named-node-map) rather than in the main DOM tree. See [DOM Architecture](./dom-architecture.md#outside-the-fork-attr).

### Attribute

A name-value pair on an element, set via `setAttribute()` and read via `getAttribute()`. Distinct from the [Attr](#attr) node class — most code interacts with attributes through the string-based `Element` methods, not through `Attr` objects directly.

### Chaining contract

The requirement that each [hooks bridge](#hooks-bridge) consumer saves the previous hook function and calls it, forming a forwarding chain. Breaking the chain silently disconnects downstream consumers — including [MutationObserver](#mutationobserver), which is implemented on top of hooks. See [The Hooks Bridge](./hooks-bridge.md#the-chaining-contract).

### CharacterData

Base class for nodes that carry text data rather than children. [Text](#text-node) and [Comment](#comment-node) extend it. See [DOM Architecture](./dom-architecture.md#the-characterdata-branch--data-carriers).

### ChildNode

The class in the hierarchy that adds self-removal and replacement methods: `remove()`, `replaceWith()`, `before()`, `after()`. Sits between [Node](#node) and the [fork](#parentnode) that separates containers from data carriers. Both [ParentNode](#parentnode) and [CharacterData](#characterdata) extend it. See [DOM Architecture](./dom-architecture.md#childnode--detaching-yourself).

### Clipboard

The `Clipboard` class, accessible via `navigator.clipboard`. Provides `writeText()` and `readText()` backed by static `Clipboard.writeHandler` and `Clipboard.readHandler` callbacks — the environment layer wires the actual I/O. With no handler installed, `writeText()` resolves silently and `readText()` returns `''`. See [Web APIs](./web-apis.md#clipboard).

### Combinator

The relationship between segments of a CSS selector. @cliui/dom supports four: descendant (` `), child (`>`), adjacent sibling (`+`), and general sibling (`~`). See [CSS Selectors](./css-selectors.md#combinators--structural-relationships).

### Comment node

A node with `nodeType = 8` that holds a comment string. Created via `document.createComment()` and serialized as `<!--content-->`. See [DOM Architecture](./dom-architecture.md#the-characterdata-branch--data-carriers).

### Connected / disconnected

A node is _connected_ when it is part of a document-rooted tree (`node.isConnected === true`). [Custom elements](#custom-element) receive `connectedCallback` on connection and `disconnectedCallback` on removal — both fire synchronously, depth-first for subtrees, and only when the node transitions between connected and disconnected states. See [Custom Elements](./custom-elements.md#when-callbacks-fire).

### CSSStyleDeclaration

The Proxy-based object returned by `element.style`. Stores inline CSS properties in a [declaration store](#declaration-store) backed by a WeakMap — not in the element's attribute map. Only properties from the [curated property set](#curated-property-set) and [custom properties](#custom-property) enter the CSS system; unsupported properties fall through to plain JS property storage (readable via dot access, but invisible to `cssText`, `getPropertyValue()`, and hook notifications). Changes notify the [hooks bridge](#hooks-bridge) as `setAttribute` calls with the full [cssText](#csstext) value, but `element.getAttribute('style')` is _not_ updated. See [CSSStyleDeclaration](./css-style-declaration.md).

### cssText

The serialized string representation of an element's inline styles, accessible via `element.style.cssText`. Setting `cssText` replaces all inline styles at once. Style mutations are delivered to the [hooks bridge](#hooks-bridge) as `setAttribute(element, 'style', cssText)` — but this is a hook-level notification only. The element's DOM `style` attribute is not synchronized, so `element.getAttribute('style')` does not reflect inline style changes. See [CSSStyleDeclaration](./css-style-declaration.md#the-notification-flow).

### Curated property set

The set of 50 CSS longhand properties that [CSSStyleDeclaration](#cssstyledeclaration) recognizes as CSS values. Properties in this set are stored in the [declaration store](#declaration-store), appear in [cssText](#csstext), and trigger hook notifications. Properties outside the set are not rejected — assigning them via `element.style.transform = '...'` stores the value as a plain JavaScript property on the declaration object, readable via dot access but excluded from the CSS system entirely. This means a property can appear to "work" (it's readable) while being invisible to renderers. See [CSSStyleDeclaration](./css-style-declaration.md#the-curated-property-set).

### Custom element

A user-defined element class registered via `customElements.define()`. Receives lifecycle callbacks (`connectedCallback`, `disconnectedCallback`, `attributeChangedCallback`) and can be [upgraded](#upgrade) in place. The `attributeChangedCallback` only fires for attributes listed in the class's static `observedAttributes` array. See [Custom Elements](./custom-elements.md).

### Custom property

A CSS property prefixed with `--` (e.g., `--accent-color`). Custom properties are always accepted by [CSSStyleDeclaration](#cssstyledeclaration), bypassing the [curated property set](#curated-property-set).

### CustomElementRegistry

The registry that manages [custom element](#custom-element) definitions, accessible via `window.customElements`. Provides `define()` to register classes, `get()` and `getName()` to query registrations, `whenDefined()` to await registration, and `upgrade()` to manually upgrade a subtree. Calling `define()` auto-upgrades all matching elements already in the document. See [Custom Elements](./custom-elements.md#the-registry--define-query-wait).

### Declaration store

The internal `Map<string, string>` backing a [CSSStyleDeclaration](#cssstyledeclaration) instance. Stores CSS property names (kebab-case) to their values. Only properties from the [curated property set](#curated-property-set) and [custom properties](#custom-property) enter this store. The store is accessed through a WeakMap keyed by the declaration object — it is not the same as the element's DOM attribute map. See [CSSStyleDeclaration](./css-style-declaration.md#three-surfaces-not-one).

### Document

The root node of a DOM tree (`nodeType = 9`). Provides factory methods (`createElement`, `createTextNode`, `createComment`, `createDocumentFragment`, and others), owns all nodes via [owner document](#owner-document), and tracks focus (`activeElement`, `setActiveElement()`, `focusNext()`) and hover state. See [DOM Architecture](./dom-architecture.md#document--a-special-parentnode).

### Document fragment

A lightweight container (`nodeType = 11`) that holds a subtree without appearing in the DOM itself. When appended to an element, its children are moved individually — the fragment stays empty. See [DOM Architecture](./dom-architecture.md#the-parentnode-branch--containers).

### Document skeleton

The initial `html > head + body` structure created automatically when a [Window](#window) is instantiated. All nodes in the skeleton are [connected](#connected--disconnected) from birth. Hooks installed after Window construction observe future mutations only — if a renderer needs the existing tree, traverse it once after installation. See [DOM Architecture](./dom-architecture.md#the-document-skeleton).

### DOM token list

The `DOMTokenList` object returned by `element.classList`. Provides `add()`, `remove()`, `toggle()`, `contains()`, and `replace()` for managing space-separated class names on an element.

### Element

A node with `nodeType = 1` that represents a tagged element in the DOM tree. Provides attributes (`element.attributes`), inline styles (`element.style`), class management (`element.classList`), namespace, innerHTML serialization, and CSS selector queries. See [DOM Architecture](./dom-architecture.md#the-parentnode-branch--containers).

### Event

The `Event` base class, created via `new Event(type, init)`. Carries `type`, `target`, `currentTarget`, `bubbles`, `cancelable`, `defaultPrevented`, and `eventPhase`. Subclasses include `KeyboardEvent`, `MouseEvent`, `FocusEvent`, `InputEvent`, `CustomEvent`, and others. Note that `dispatchEvent()` returns `event.defaultPrevented` directly — the inverse of browser behavior, where it returns `!defaultPrevented`. See [Event Propagation](./event-propagation.md#preventdefault-and-the-inverted-return-value).

### Event phase

The stages of event propagation: capture (root → target, phase 1), at-target (listeners on the event's own target, phase 2), and bubble (target → root, phase 3). Before dispatch, the phase is NONE (0). In @cliui/dom, capture and bubble are separate loops — at-target capture listeners always run before at-target bubble listeners, which differs from some browser implementations. See [Event Propagation](./event-propagation.md#three-phases--capture-target-bubble).

### EventTarget

The base class of the entire DOM hierarchy. Provides `addEventListener()`, `removeEventListener()`, and `dispatchEvent()`. Every [Node](#node), the [Document](#document), and the [Window](#window) inherit from it. See [DOM Architecture](./dom-architecture.md#eventtarget--everything-listens).

### Handler pattern

The extension mechanism used by @cliui/dom's Web API classes ([Clipboard](#clipboard), [Notification](#notification), [Location](#location), [MediaQueryList](#mediaquerylist)). The DOM provides the standard API shape with sensible defaults; the environment layer wires actual behavior through static handler properties or instance callbacks. This is the second extension surface alongside the [hooks bridge](#hooks-bridge) — hooks observe DOM state changes, handlers provide platform capabilities. See [Web APIs](./web-apis.md#three-ways-to-wire-an-environment).

### Hooks bridge

The synchronous notification system connecting the DOM to rendering backends. Accessed via `window[HOOKS]`, it exposes eleven callback slots covering DOM mutations (element/text creation, attribute changes, tree insertions and removals), event listener registration, and focus/hover state transitions. Not all slots are DOM mutations — `addEventListener`, `removeEventListener`, `focusChange`, and `hoverChange` observe non-tree state. Tree hooks (`insertChild`, `removeChild`) only fire when the parent is an [Element](#element). See [The Hooks Bridge](./hooks-bridge.md).

### HTMLDialogElement

The specialized element class for `<dialog>`. Supports non-modal display via `show()` and modal display via `showModal()` — modal dialogs trap Tab focus within descendants, close on Escape (dispatching a cancelable `cancel` event), and restore previous focus on close. `close(returnValue?)` closes the dialog and dispatches a `close` event. Used internally by `window.alert()`, `window.confirm()`, and `window.prompt()`, which are async (Promise-returning) in @cliui/dom. See [Scope and Boundaries](./scope-and-boundaries.md#dedicated-element-classes).

### HTMLElement

An empty class extending [Element](#element). Exists as the spec-mandated base class for [custom elements](#custom-element). Adds no methods or properties. See [DOM Architecture](./dom-architecture.md#htmlelement--the-extension-point).

### HTMLTemplateElement

The specialized element class for `<template>`. Provides a `.content` property holding a `DocumentFragment`. Setting `template.innerHTML` writes into that content fragment, not the template's live child tree. However, parsing `<template>` via an outer `innerHTML` setter does not special-case template content — parsed children land on the template element itself rather than in `.content`. See [Scope and Boundaries](./scope-and-boundaries.md#template-parsing-is-partially-browser-like).

### Light-DOM style injection

@cliui/dom's alternative to Shadow DOM for delivering component styles. When a [custom element](#custom-element) class defines a static `styles` property, `ensureCustomElementStyles` inserts a single `<style>` element into `<head>` per tag name, idempotently. This provides style delivery without encapsulation — styles can leak in both directions. See [Custom Elements](./custom-elements.md#styles-without-shadow-dom).

### Location

The `Location` class, accessible via `window.location`. Parses URLs correctly via the `URL` constructor — `protocol`, `hostname`, `pathname`, `search`, `hash` all work. But no navigation occurs: `assign()` and `replace()` update the internal URL only, and `reload()` is a no-op. The `onPathnameChange` callback lets environment layers react to URL changes. See [Web APIs](./web-apis.md#location).

### MediaQueryList

The object returned by `window.matchMedia(query)`. Provides `matches` and dispatches `change` events. Only `(prefers-color-scheme: dark)` and `(prefers-color-scheme: light)` are actually evaluated — all other media queries return `{ matches: false }` silently. See [Web APIs](./web-apis.md#mediaquerylist).

### matches / matchesParts

The standalone selector-matching functions exported from `@cliui/dom`. `matches(element, selector)` parses a CSS selector string and tests whether the element matches. `matchesParts(element, parts)` does the same with pre-parsed `SelectorPart[]` arrays, avoiding repeated parsing in hot paths like style engines. Unlike browsers, where `matches` is an instance method on `Element.prototype`, these are standalone functions — `element.matches()` does not exist. See [CSS Selectors](./css-selectors.md#the-matches-api--a-standalone-function).

### Minimum viable DOM

@cliui/dom's core design concept: the smallest DOM implementation that real UI frameworks (React, Preact, Solid, Vue, Svelte) can mount, render, and reconcile on without patches. Built on the [two-layer architecture](#two-layer-architecture) — the DOM stores state, and renderers observe it through the [hooks bridge](#hooks-bridge). See [What Is @cliui/dom?](./what-is-cliui-dom.md#what-minimum-viable-dom-means).

### Mutation record

A plain object describing a single DOM change, delivered by [MutationObserver](#mutationobserver) in batched microtasks. Contains the mutation `type` (`attributes`, `characterData`, or `childList`), the `target` node, and change-specific fields like `addedNodes`, `removedNodes`, `attributeName`, and `oldValue`.

### MutationObserver

An asynchronous observation API that batches [mutation records](#mutation-record) and delivers them in the next microtask via `queueMicrotask`. Implemented by wrapping five [hooks bridge](#hooks-bridge) slots (`setAttribute`, `removeAttribute`, `setText`, `insertChild`, `removeChild`). `disconnect()` stops new records from being collected but does not clear already-queued deliveries. See [MutationObserver](./mutation-observer.md).

### Named node map

The `NamedNodeMap` collection returned by `element.attributes`. Stores [Attr](#attr) nodes keyed by name, providing `getNamedItem()`, `setNamedItem()`, and `removeNamedItem()`.

### Namespace

A URI identifying the XML vocabulary an [element](#element) belongs to. @cliui/dom uses two: XHTML (`http://www.w3.org/1999/xhtml`, the default) and SVG (`http://www.w3.org/2000/svg`, set via `createElementNS`). See [DOM Architecture](./dom-architecture.md#the-parentnode-branch--containers).

### Navigator

The `Navigator` class, accessible via `window.navigator`. A static data container with terminal-appropriate defaults. Provides `navigator.clipboard` (a [Clipboard](#clipboard) instance) and `navigator.userAgent`. Properties like `permissions` and `geolocation` are `null`. See [Web APIs](./web-apis.md#navigator).

### Node

The base class for all objects in the DOM tree. Provides identity (`nodeType`, `nodeName`), ownership ([owner document](#owner-document)), connectivity (`isConnected`), and traversal (`parentNode`, `firstChild`, `nextSibling`). Extends [EventTarget](#eventtarget). See [DOM Architecture](./dom-architecture.md#node--existing-in-the-tree).

### NodeList

The collection returned by `childNodes` and `children`. In @cliui/dom, `NodeList` extends `Array<Node>` — a deliberate divergence from browsers, where `NodeList` is not a true array. This means `childNodes.map()`, `childNodes.filter()`, and other array methods work directly without conversion. `childNodes` contains all child node types; `children` contains only [elements](#element).

### Notification

The `Notification` class. `Notification.permission` is always `'granted'` and `requestPermission()` resolves immediately. Creating `new Notification(title, options)` triggers `Notification.handler` — a static callback the environment layer sets to wire the delivery mechanism. See [Web APIs](./web-apis.md#notification).

### Owner document

The [Document](#document) a node belongs to, accessible via `node.ownerDocument`. Assigned at creation and used to reach the document's factory methods and [hooks bridge](#hooks-bridge).

### ParentNode

The class in the hierarchy that adds tree mutation methods (`appendChild`, `removeChild`, `insertBefore`, `replaceChildren`) and selector queries (`querySelector`, `querySelectorAll`). [Element](#element), [Document](#document), and [Document fragment](#document-fragment) extend it. Note that `querySelector` lives on `ParentNode`, not on `Element` — meaning `Document` and `DocumentFragment` also support selector queries. See [DOM Architecture](./dom-architecture.md#the-parentnode-branch--containers).

### parseDocument

The document-hydration parser, exported as `parseDocument(html, document)`. Mutates an existing [Document](#document) by routing content to the [document skeleton](#document-skeleton)'s structural elements (`<html>`, `<head>`, `<body>`). Unlike [parseHtml](#parsehtml), it has a void-element table, skips whitespace-only text nodes, and strips `<!DOCTYPE>`. See [HTML Parsing](./html-parsing.md#two-parsers-one-purpose-each).

### parseHtml

The fragment parser, exported as `parseHtml(html, contextNode)`. Returns a [Document fragment](#document-fragment) containing the parsed nodes. Used internally by the `innerHTML` setter. Unlike [parseDocument](#parsedocument), it has no void-element table (so `<br>` is not self-closing), preserves whitespace-only text nodes, and does not special-case `<template>` content. See [HTML Parsing](./html-parsing.md#two-parsers-one-purpose-each).

### Performance

The `Performance` class, accessible via `window.performance`. Provides `now()` (high-resolution timing via Node's `perf_hooks`), `mark()`, `measure()`, entry queries (`getEntries`, `getEntriesByName`, `getEntriesByType`), and `recordEntry()` for external instrumentation. This is a [recording surface](#recording-surface) — it stores entries but doesn't measure rendering performance itself. See [Performance API](./performance-api.md).

### PerformanceEntry

The base class for all performance timeline entries. Read-only properties: `name`, `entryType`, `startTime`, `duration`. Subclasses include `PerformanceMark`, `PerformanceMeasure`, `PerformanceEventTiming`, `PerformancePaintTiming`, and `LargestContentfulPaint`. Self-recorded entries (`mark`, `measure`) are created via [Performance](#performance) methods; instrumented entries (paint, event timing, LCP) are pushed by the rendering layer via `recordEntry()`. See [Performance API](./performance-api.md#the-entry-type-system).

### PerformanceObserver

An asynchronous observation API for the [Performance](#performance) timeline. Batches entries and delivers them in a microtask, similar to [MutationObserver](#mutationobserver). Supports `observe()` with `entryTypes` or `type` options, `disconnect()`, and `takeRecords()`. Supported entry types: `mark`, `measure`, `paint`, `event`, `first-input`, `largest-contentful-paint`. See [Performance API](./performance-api.md#observing-the-timeline).

### polyfillEnvironment

The exported utility `polyfillEnvironment(window)`. Installs a [Window](#window) instance's properties onto `globalThis` so frameworks expecting browser globals (`document`, `window`, `navigator`) find them. Installs instance properties and bound `EventTarget` methods, but _not_ `Window.prototype` methods — `alert`, `confirm`, `prompt`, `matchMedia`, `requestAnimationFrame`, and `requestIdleCallback` remain on the window instance only. See [Scope and Boundaries](./scope-and-boundaries.md#polyfillenvironment-is-a-partial-global-installer).

### Recording surface

The [Performance API](#performance)'s design concept: the DOM provides the recording infrastructure (`mark()`, `measure()`, `recordEntry()`, [PerformanceObserver](#performanceobserver)) but not the measurement engine. The rendering layer records domain-specific entries (paint timing, event timing, LCP) into the Performance timeline via `recordEntry()`. The DOM stores and delivers them — it doesn't produce them. See [Performance API](./performance-api.md#the-instrumentation-bridge).

### Selector part

A segment of a parsed CSS selector, represented by the `SelectorPart` type. Combines a [combinator](#combinator) with an array of matchers — conditions like element name, ID, class, attribute presence/value, or pseudo-class. See [CSS Selectors](./css-selectors.md#the-ast-types).

### Shorthand expansion

The process of converting a CSS shorthand property into its longhand equivalents. The `expandShorthand` utility supports seven shorthands: `padding`, `margin`, `gap`, `flex`, `transition`, `animation`, and `container`. Of these, only `padding`, `margin`, `gap`, and `flex` are recognized by the [CSSStyleDeclaration](#cssstyledeclaration) Proxy's property-assignment path (`element.style.padding = '8 16'`). The remaining three (`transition`, `animation`, `container`) work through `setProperty()` and `cssText`. See [CSSStyleDeclaration](./css-style-declaration.md#shorthand-expansion).

### Slot-and-chain model

The [hooks bridge](#hooks-bridge) architecture where each hook name is a mutable slot holding one function. Consumers splice into the chain by saving the previous occupant and forwarding calls. See [The Hooks Bridge](./hooks-bridge.md#how-hooks-work--the-slot-and-chain-model).

### SVGElement

The specialized element class for SVG namespace elements, created via `document.createElementNS('http://www.w3.org/2000/svg', tagName)`. Extends [Element](#element) directly — not [HTMLElement](#htmlelement). Provides `ownerSVGElement`, which walks ancestors to find the outermost SVG element. See [DOM Architecture](./dom-architecture.md#elements-that-extend-element-directly--the-instanceof-surprise).

### Text node

A node with `nodeType = 3` that holds visible text content. Created via `document.createTextNode()`. Its content is stored in the `data` property. See [DOM Architecture](./dom-architecture.md#the-characterdata-branch--data-carriers).

### Two-layer architecture

@cliui/dom's fundamental design separation. Layer 1 (the DOM) stores state — tree structure, attributes, styles, text, event listeners, focus. Layer 2 (a renderer) reads that state and produces output — terminal cells, pixels, test assertions. Most polyfills couple these layers; @cliui/dom keeps the seam explicit via the [hooks bridge](#hooks-bridge). See [What Is @cliui/dom?](./what-is-cliui-dom.md#two-layers-state-and-rendering).

### Upgrade

The process of swapping a plain [Element](#element)'s prototype to a [custom element](#custom-element) class after `customElements.define()` is called. Uses `Object.setPrototypeOf` — the object identity is preserved, but the constructor does not re-run and existing observed attributes are not replayed via `attributeChangedCallback`. If the element is already [connected](#connected--disconnected), `connectedCallback` fires during upgrade. See [Custom Elements](./custom-elements.md#the-upgrade-mechanism).

### Void element

An HTML element that cannot have children (e.g., `<br>`, `<img>`, `<input>`, `<hr>`). @cliui/dom serializes void elements with explicit closing tags (`<br></br>`) rather than as self-closing. The two parsers handle void elements differently: [parseDocument](#parsedocument) treats them as self-closing (matching browser behavior), but [parseHtml](#parsehtml) does not — `<br>` in an `innerHTML` assignment is not self-closing and may absorb subsequent content. See [HTML Parsing](./html-parsing.md#void-elements--the-biggest-behavioral-split).

### Window

The top-level object that owns a [Document](#document), a [CustomElementRegistry](#customelementregistry), and the [hooks bridge](#hooks-bridge). Extends [EventTarget](#eventtarget) but is not a [Node](#node) — it cannot appear in the DOM tree. Also provides [Performance](#performance), [Navigator](#navigator), [Location](#location), and async dialog methods (`alert`, `confirm`, `prompt`). See [DOM Architecture](./dom-architecture.md#window--outside-the-tree).
