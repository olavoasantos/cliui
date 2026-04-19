---
'@cliui/dom': minor
---

Add `document.getElementById()`, `element.matches()`, `element.closest()`, and `Node` static type constants (`Node.ELEMENT_NODE`, etc.)

Fix linked-list pointer corruption when inserting before a non-first child

Fix `textContent = ''` leaving an empty text node instead of clearing children

Fix `replaceWith()` with no arguments inserting an `"undefined"` text node

Fix `nodeName` returning uppercase for non-element nodes (`#TEXT` → `#text`)

Fix `Event.returnValue` getter/setter to match DOM spec semantics

Fix cross-document insertion not propagating `ownerDocument` to descendants

Fix `insertBefore` detaching node from old parent before validating the reference node

Guard against cyclic DOM insertion (self-append and ancestor-append)

Wrap lifecycle callbacks (`connectedCallback`, `disconnectedCallback`, `attributeChangedCallback`) in try/catch so errors no longer skip remaining subtree nodes or starve hooks

Optimize `querySelector`/`querySelectorAll` to parse selector once instead of per-element

Optimize `selfAndDescendants` to avoid O(n) `unshift`

Fix `cloneNode` dropping SVG namespace
