# Test coverage audit checklist

Generated from `src/**`, existing spec files, and `.testing/coverage/coverage-summary.json`.

## Legend

- `unit`: unit spec file exists / missing
- `integration`: integration spec file exists / missing
- `bench`: performance bench file exists / missing
- Coverage values are from the current unit coverage summary
- File-specific checklist items are actionable next steps

## src/classes

### `src/classes/Terminal.ts`

- Status: unit exists; integration exists; bench exists
- Coverage: lines 0.00%, branches 0.00%, functions 0.00%
- Actions:
  - [x] replace todo-only specs with executable assertions
  - [x] add a performance benchmark if this file is part of a hot path
  - [x] raise line coverage with missing happy-path and edge-case scenarios
  - [x] raise branch coverage by exercising fallback, guard, and error paths
  - [x] exercise currently uncovered methods and constructor paths
  - [x] implement constructor tests for default streams, FPS normalization, and dimension fallback logic
  - [x] test `run()` idempotence, initial render, resize handling, and capability-driven renderer configuration
  - [x] test `exit()` cleanup for timers, input listeners, and terminal restoration

## src/css/classes

### `src/css/classes/CSSParser.ts`

- Status: unit exists; integration exists; bench exists
- Coverage: lines 100.00%, branches 91.66%, functions 100.00%
- Actions:
  - [x] keep the current test set and revisit only if behavior expands or performance regresses

### `src/css/classes/SelectorMatcher.ts`

- Status: unit exists; integration exists; bench exists
- Coverage: lines 100.00%, branches 90.00%, functions 100.00%
- Actions:
  - [x] keep the current test set and revisit only if behavior expands or performance regresses

### `src/css/classes/StyleEngine.ts`

- Status: unit exists; integration exists; bench exists
- Coverage: lines 93.79%, branches 68.96%, functions 96.77%
- Actions:
  - [x] raise branch coverage by exercising fallback, guard, and error paths
  - [x] cover hook wiring and unwiring through `attach()` and `detach()`
  - [x] cover stylesheet invalidation, dirty subtree recomputation, and inherited child updates
  - [x] verify layout-dirty behavior for layout-affecting vs non-layout-affecting style changes

### `src/css/classes/StyleResolver.ts`

- Status: unit exists; integration exists; bench missing
- Coverage: lines 100.00%, branches 83.33%, functions 100.00%
- Actions:
  - [x] add an integration spec if this file coordinates behavior with other modules

## src/css/utilities

### `src/css/utilities/applyDeclaration.ts`

- Status: unit exists; integration missing; bench missing
- Coverage: lines 100.00%, branches 100.00%, functions 100.00%
- Actions:
  - [x] keep the current test set and revisit only if behavior expands or performance regresses

### `src/css/utilities/collectStyleElements.ts`

- Status: unit exists; integration missing; bench missing
- Coverage: lines 93.33%, branches 50.00%, functions 100.00%
- Actions:
  - [x] raise branch coverage by exercising fallback, guard, and error paths
  - [x] cover empty document, missing head, and multiple style element ordering cases

### `src/css/utilities/compareSpecificity.ts`

- Status: unit exists; integration missing; bench missing
- Coverage: lines 100.00%, branches 100.00%, functions 100.00%
- Actions:
  - [x] keep the current test set and revisit only if behavior expands or performance regresses

### `src/css/utilities/computeSpecificity.ts`

- Status: unit exists; integration missing; bench missing
- Coverage: lines 81.25%, branches 62.50%, functions 100.00%
- Actions:
  - [x] raise line coverage with missing happy-path and edge-case scenarios
  - [x] raise branch coverage by exercising fallback, guard, and error paths
  - [x] cover wildcard, attribute, compound, and nested selector specificity cases

### `src/css/utilities/findClosingBrace.ts`

- Status: unit exists; integration missing; bench missing
- Coverage: lines 78.94%, branches 84.21%, functions 100.00%
- Actions:
  - [x] raise line coverage with missing happy-path and edge-case scenarios
  - [x] cover nested braces, braces inside strings, comments, and unterminated input

### `src/css/utilities/hasLayoutChange.ts`

- Status: unit exists; integration missing; bench missing
- Coverage: lines 100.00%, branches 100.00%, functions 100.00%
- Actions:
  - [x] keep the current test set and revisit only if behavior expands or performance regresses

### `src/css/utilities/matchesSelectorParts.ts`

- Status: unit exists; integration missing; bench missing
- Coverage: lines 66.66%, branches 50.00%, functions 100.00%
- Actions:
  - [x] raise line coverage with missing happy-path and edge-case scenarios
  - [x] raise branch coverage by exercising fallback, guard, and error paths
  - [x] cover matching and non-matching ancestor/sibling selector chains

### `src/css/utilities/parseDeclarations.ts`

- Status: unit exists; integration missing; bench missing
- Coverage: lines 100.00%, branches 100.00%, functions 100.00%
- Actions:
  - [x] keep the current test set and revisit only if behavior expands or performance regresses

### `src/css/utilities/parseSelectorList.ts`

- Status: unit exists; integration missing; bench missing
- Coverage: lines 100.00%, branches 83.33%, functions 100.00%
- Actions:
  - [x] keep the current test set and revisit only if behavior expands or performance regresses

### `src/css/utilities/serializeSelectorParts.ts`

- Status: unit exists; integration missing; bench missing
- Coverage: lines 84.00%, branches 64.70%, functions 100.00%
- Actions:
  - [x] raise line coverage with missing happy-path and edge-case scenarios
  - [x] raise branch coverage by exercising fallback, guard, and error paths
  - [x] cover serialization of wildcard, attribute, function, and mixed combinator selectors

### `src/css/utilities/skipBlock.ts`

- Status: unit exists; integration missing; bench missing
- Coverage: lines 100.00%, branches 100.00%, functions 100.00%
- Actions:
  - [x] keep the current test set and revisit only if behavior expands or performance regresses

### `src/css/utilities/skipString.ts`

- Status: unit exists; integration missing; bench missing
- Coverage: lines 100.00%, branches 100.00%, functions 100.00%
- Actions:
  - [x] keep the current test set and revisit only if behavior expands or performance regresses

### `src/css/utilities/skipWhitespaceAndComments.ts`

- Status: unit exists; integration missing; bench missing
- Coverage: lines 100.00%, branches 100.00%, functions 100.00%
- Actions:
  - [x] keep the current test set and revisit only if behavior expands or performance regresses

### `src/css/utilities/walkAndCollectStyle.ts`

- Status: unit exists; integration missing; bench missing
- Coverage: lines 100.00%, branches 100.00%, functions 100.00%
- Actions:
  - [x] keep the current test set and revisit only if behavior expands or performance regresses

### `src/css/utilities/walkElements.ts`

- Status: unit exists; integration missing; bench missing
- Coverage: lines 100.00%, branches 100.00%, functions 100.00%
- Actions:
  - [x] keep the current test set and revisit only if behavior expands or performance regresses

## src/dom/classes

### `src/dom/classes/Attr.ts`

- Status: unit exists; integration exists; bench missing
- Coverage: lines 95.23%, branches 75.00%, functions 83.33%
- Actions:
  - [x] add an integration spec if this file coordinates behavior with other modules
  - [x] raise branch coverage by exercising fallback, guard, and error paths
  - [x] cover namespace-aware attribute construction and value update edge cases

### `src/dom/classes/CSSStyleDeclaration.ts`

- Status: unit exists; integration exists; bench missing
- Coverage: lines 98.50%, branches 85.10%, functions 100.00%
- Actions:
  - [x] add an integration spec if this file coordinates behavior with other modules

### `src/dom/classes/CharacterData.ts`

- Status: unit exists; integration exists; bench missing
- Coverage: lines 100.00%, branches 66.66%, functions 100.00%
- Actions:
  - [x] add an integration spec if this file coordinates behavior with other modules
  - [x] raise branch coverage by exercising fallback, guard, and error paths
  - [x] cover no-op text updates and parent-notification edge cases

### `src/dom/classes/ChildNode.ts`

- Status: unit exists; integration exists; bench missing
- Coverage: lines 100.00%, branches 100.00%, functions 100.00%
- Actions:
  - [x] add an integration spec if this file coordinates behavior with other modules

### `src/dom/classes/ClipboardEvent.ts`

- Status: unit exists; integration exists; bench missing
- Coverage: lines 100.00%, branches 66.66%, functions 100.00%
- Actions:
  - [x] add an integration spec if this file coordinates behavior with other modules
  - [x] raise branch coverage by exercising fallback, guard, and error paths
  - [x] cover omitted `clipboardData` and default init dictionary behavior

### `src/dom/classes/Comment.ts`

- Status: unit exists; integration exists; bench missing
- Coverage: lines 100.00%, branches 100.00%, functions 100.00%
- Actions:
  - [x] add an integration spec if this file coordinates behavior with other modules

### `src/dom/classes/CustomElementRegistry.ts`

- Status: unit exists; integration exists; bench missing
- Coverage: lines 90.62%, branches 72.22%, functions 100.00%
- Actions:
  - [x] add an integration spec if this file coordinates behavior with other modules
  - [x] raise branch coverage by exercising fallback, guard, and error paths
  - [x] cover duplicate registration, invalid constructors, and lookup failure paths

### `src/dom/classes/CustomEvent.ts`

- Status: unit exists; integration exists; bench missing
- Coverage: lines 0.00%, branches 100.00%, functions 0.00%
- Actions:
  - [x] replace todo-only specs with executable assertions
  - [x] add an integration spec if this file coordinates behavior with other modules
  - [x] raise line coverage with missing happy-path and edge-case scenarios
  - [x] exercise currently uncovered methods and constructor paths
  - [x] replace todo-only tests with executable constructor and `initCustomEvent()` assertions

### `src/dom/classes/DOMTokenList.ts`

- Status: unit exists; integration exists; bench missing
- Coverage: lines 100.00%, branches 91.66%, functions 100.00%
- Actions:
  - [x] add an integration spec if this file coordinates behavior with other modules

### `src/dom/classes/Document.ts`

- Status: unit exists; integration exists; bench exists
- Coverage: lines 93.61%, branches 73.68%, functions 100.00%
- Actions:
  - [x] raise branch coverage by exercising fallback, guard, and error paths
  - [x] cover focus transitions, creation edge cases, and fragment/template interactions

### `src/dom/classes/DocumentFragment.ts`

- Status: unit exists; integration exists; bench missing
- Coverage: lines 100.00%, branches 100.00%, functions 100.00%
- Actions:
  - [x] add an integration spec if this file coordinates behavior with other modules

### `src/dom/classes/Element.ts`

- Status: unit exists; integration exists; bench exists
- Coverage: lines 89.58%, branches 87.50%, functions 87.50%
- Actions:
  - [x] raise line coverage with missing happy-path and edge-case scenarios
  - [x] cover namespace attribute mutations and synchronization between attributes, style, and classList

### `src/dom/classes/ErrorEvent.ts`

- Status: unit exists; integration exists; bench missing
- Coverage: lines 100.00%, branches 100.00%, functions 100.00%
- Actions:
  - [x] add an integration spec if this file coordinates behavior with other modules

### `src/dom/classes/Event.ts`

- Status: unit exists; integration exists; bench missing
- Coverage: lines 100.00%, branches 100.00%, functions 100.00%
- Actions:
  - [x] add an integration spec if this file coordinates behavior with other modules

### `src/dom/classes/EventTarget.ts`

- Status: unit exists; integration exists; bench missing
- Coverage: lines 100.00%, branches 90.90%, functions 100.00%
- Actions:
  - [x] add an integration spec if this file coordinates behavior with other modules

### `src/dom/classes/FocusEvent.ts`

- Status: unit exists; integration exists; bench missing
- Coverage: lines 100.00%, branches 100.00%, functions 100.00%
- Actions:
  - [x] add an integration spec if this file coordinates behavior with other modules

### `src/dom/classes/HTMLBodyElement.ts`

- Status: unit exists; integration exists; bench missing
- Coverage: lines 100.00%, branches 100.00%, functions 100.00%
- Actions:
  - [x] add an integration spec if this file coordinates behavior with other modules

### `src/dom/classes/HTMLElement.ts`

- Status: unit exists; integration exists; bench missing
- Coverage: lines 100.00%, branches 100.00%, functions 100.00%
- Actions:
  - [x] add an integration spec if this file coordinates behavior with other modules

### `src/dom/classes/HTMLHeadElement.ts`

- Status: unit exists; integration exists; bench missing
- Coverage: lines 100.00%, branches 100.00%, functions 100.00%
- Actions:
  - [x] add an integration spec if this file coordinates behavior with other modules

### `src/dom/classes/HTMLHtmlElement.ts`

- Status: unit exists; integration exists; bench missing
- Coverage: lines 100.00%, branches 100.00%, functions 100.00%
- Actions:
  - [x] add an integration spec if this file coordinates behavior with other modules

### `src/dom/classes/HTMLStyleElement.ts`

- Status: unit exists; integration exists; bench missing
- Coverage: lines 100.00%, branches 50.00%, functions 100.00%
- Actions:
  - [x] add an integration spec if this file coordinates behavior with other modules
  - [x] raise branch coverage by exercising fallback, guard, and error paths
  - [x] cover empty and populated stylesheet text paths

### `src/dom/classes/HTMLTemplateElement.ts`

- Status: unit exists; integration exists; bench missing
- Coverage: lines 100.00%, branches 100.00%, functions 75.00%
- Actions:
  - [x] add an integration spec if this file coordinates behavior with other modules
  - [x] exercise currently uncovered methods and constructor paths
  - [x] cover template content/document fragment behavior beyond constructor defaults

### `src/dom/classes/KeyboardEvent.ts`

- Status: unit exists; integration exists; bench missing
- Coverage: lines 100.00%, branches 100.00%, functions 100.00%
- Actions:
  - [x] add an integration spec if this file coordinates behavior with other modules

### `src/dom/classes/MouseEvent.ts`

- Status: unit exists; integration exists; bench missing
- Coverage: lines 94.44%, branches 96.42%, functions 100.00%
- Actions:
  - [x] add an integration spec if this file coordinates behavior with other modules

### `src/dom/classes/MutationObserver.ts`

- Status: unit exists; integration exists; bench exists
- Coverage: lines 87.50%, branches 72.13%, functions 95.00%
- Actions:
  - [x] raise line coverage with missing happy-path and edge-case scenarios
  - [x] raise branch coverage by exercising fallback, guard, and error paths
  - [x] cover batching, subtree observation, attribute filters, disconnect, and takeRecords edge cases

### `src/dom/classes/NamedNodeMap.ts`

- Status: unit exists; integration exists; bench missing
- Coverage: lines 96.77%, branches 87.50%, functions 100.00%
- Actions:
  - [x] add an integration spec if this file coordinates behavior with other modules

### `src/dom/classes/Node.ts`

- Status: unit exists; integration exists; bench missing
- Coverage: lines 84.90%, branches 73.07%, functions 60.71%
- Actions:
  - [x] add an integration spec if this file coordinates behavior with other modules
  - [x] raise line coverage with missing happy-path and edge-case scenarios
  - [x] raise branch coverage by exercising fallback, guard, and error paths
  - [x] exercise currently uncovered methods and constructor paths
  - [x] cover orphan operations, relationship updates, and unexercised node mutation/navigation methods

### `src/dom/classes/NodeList.ts`

- Status: unit exists; integration exists; bench missing
- Coverage: lines 100.00%, branches 100.00%, functions 100.00%
- Actions:
  - [x] add an integration spec if this file coordinates behavior with other modules

### `src/dom/classes/ParentNode.ts`

- Status: unit exists; integration exists; bench missing
- Coverage: lines 97.77%, branches 91.30%, functions 100.00%
- Actions:
  - [x] add an integration spec if this file coordinates behavior with other modules

### `src/dom/classes/PromiseRejectionEvent.ts`

- Status: unit exists; integration exists; bench missing
- Coverage: lines 0.00%, branches 100.00%, functions 0.00%
- Actions:
  - [x] replace todo-only specs with executable assertions
  - [x] add an integration spec if this file coordinates behavior with other modules
  - [x] raise line coverage with missing happy-path and edge-case scenarios
  - [x] exercise currently uncovered methods and constructor paths
  - [x] replace todo-only tests with executable constructor assertions for `promise` and `reason`

### `src/dom/classes/SVGElement.ts`

- Status: unit exists; integration exists; bench missing
- Coverage: lines 100.00%, branches 100.00%, functions 100.00%
- Actions:
  - [x] add an integration spec if this file coordinates behavior with other modules

### `src/dom/classes/Text.ts`

- Status: unit exists; integration exists; bench missing
- Coverage: lines 100.00%, branches 100.00%, functions 100.00%
- Actions:
  - [x] add an integration spec if this file coordinates behavior with other modules

### `src/dom/classes/ToggleEvent.ts`

- Status: unit exists; integration exists; bench missing
- Coverage: lines 0.00%, branches 100.00%, functions 0.00%
- Actions:
  - [x] replace todo-only specs with executable assertions
  - [x] add an integration spec if this file coordinates behavior with other modules
  - [x] raise line coverage with missing happy-path and edge-case scenarios
  - [x] exercise currently uncovered methods and constructor paths
  - [x] replace todo-only tests with executable constructor assertions for `oldState` and `newState`

### `src/dom/classes/UIEvent.ts`

- Status: unit exists; integration exists; bench missing
- Coverage: lines 100.00%, branches 100.00%, functions 100.00%
- Actions:
  - [x] add an integration spec if this file coordinates behavior with other modules

### `src/dom/classes/WheelEvent.ts`

- Status: unit exists; integration exists; bench missing
- Coverage: lines 100.00%, branches 100.00%, functions 100.00%
- Actions:
  - [x] add an integration spec if this file coordinates behavior with other modules

### `src/dom/classes/Window.ts`

- Status: unit exists; integration exists; bench missing
- Coverage: lines 100.00%, branches 92.85%, functions 100.00%
- Actions:
  - [x] add an integration spec if this file coordinates behavior with other modules

## src/dom/guards

### `src/dom/guards/CharacterDataGuard.ts`

- Status: unit exists; integration missing; bench missing
- Coverage: lines 100.00%, branches 100.00%, functions 100.00%
- Actions:
  - [x] keep the current test set and revisit only if behavior expands or performance regresses

### `src/dom/guards/CommentNodeGuard.ts`

- Status: unit exists; integration missing; bench missing
- Coverage: lines 100.00%, branches 100.00%, functions 100.00%
- Actions:
  - [x] keep the current test set and revisit only if behavior expands or performance regresses

### `src/dom/guards/DocumentFragmentNodeGuard.ts`

- Status: unit exists; integration missing; bench missing
- Coverage: lines 0.00%, branches 100.00%, functions 0.00%
- Actions:
  - [x] replace todo-only specs with executable assertions
  - [x] raise line coverage with missing happy-path and edge-case scenarios
  - [x] exercise currently uncovered methods and constructor paths
  - [x] replace todo-only tests with executable positive and negative guard assertions

### `src/dom/guards/ElementNodeGuard.ts`

- Status: unit exists; integration missing; bench missing
- Coverage: lines 100.00%, branches 100.00%, functions 100.00%
- Actions:
  - [x] keep the current test set and revisit only if behavior expands or performance regresses

### `src/dom/guards/ParentNodeGuard.ts`

- Status: unit exists; integration missing; bench missing
- Coverage: lines 100.00%, branches 100.00%, functions 100.00%
- Actions:
  - [x] keep the current test set and revisit only if behavior expands or performance regresses

### `src/dom/guards/TextNodeGuard.ts`

- Status: unit exists; integration missing; bench missing
- Coverage: lines 100.00%, branches 100.00%, functions 100.00%
- Actions:
  - [x] keep the current test set and revisit only if behavior expands or performance regresses

## src/dom/utilities

### `src/dom/utilities/adoptNode.ts`

- Status: unit exists; integration missing; bench missing
- Coverage: lines 100.00%, branches 50.00%, functions 100.00%
- Actions:
  - [x] raise branch coverage by exercising fallback, guard, and error paths
  - [x] cover already-adopted nodes and ownerDocument propagation through subtrees

### `src/dom/utilities/camelToKebab.ts`

- Status: unit exists; integration missing; bench missing
- Coverage: lines 100.00%, branches 100.00%, functions 100.00%
- Actions:
  - [x] keep the current test set and revisit only if behavior expands or performance regresses

### `src/dom/utilities/cloneNode.ts`

- Status: unit exists; integration missing; bench missing
- Coverage: lines 56.52%, branches 60.00%, functions 100.00%
- Actions:
  - [x] raise line coverage with missing happy-path and edge-case scenarios
  - [x] raise branch coverage by exercising fallback, guard, and error paths
  - [x] cover shallow/deep cloning for text, comment, element, fragment, and fallback custom node paths
  - [x] cover cloning into an alternate owner document and preserving namespaced attributes

### `src/dom/utilities/createElement.ts`

- Status: unit exists; integration missing; bench missing
- Coverage: lines 100.00%, branches 100.00%, functions 100.00%
- Actions:
  - [x] keep the current test set and revisit only if behavior expands or performance regresses

### `src/dom/utilities/createNode.ts`

- Status: unit exists; integration missing; bench missing
- Coverage: lines 100.00%, branches 100.00%, functions 100.00%
- Actions:
  - [x] keep the current test set and revisit only if behavior expands or performance regresses

### `src/dom/utilities/descendants.ts`

- Status: unit exists; integration missing; bench missing
- Coverage: lines 100.00%, branches 100.00%, functions 100.00%
- Actions:
  - [x] keep the current test set and revisit only if behavior expands or performance regresses

### `src/dom/utilities/expandShorthand.ts`

- Status: unit exists; integration missing; bench missing
- Coverage: lines 89.47%, branches 89.47%, functions 100.00%
- Actions:
  - [x] raise line coverage with missing happy-path and edge-case scenarios
  - [x] cover 1/2/3/4-token shorthand expansion and malformed values

### `src/dom/utilities/fireEvent.ts`

- Status: unit exists; integration missing; bench missing
- Coverage: lines 84.61%, branches 100.00%, functions 50.00%
- Actions:
  - [x] raise line coverage with missing happy-path and edge-case scenarios
  - [x] exercise currently uncovered methods and constructor paths
  - [x] cover all invocation forms and canceled-dispatch return behavior

### `src/dom/utilities/getCSSStyleDeclarationStore.ts`

- Status: unit exists; integration missing; bench missing
- Coverage: lines 100.00%, branches 100.00%, functions 100.00%
- Actions:
  - [x] keep the current test set and revisit only if behavior expands or performance regresses

### `src/dom/utilities/getDomTokenListTokens.ts`

- Status: unit exists; integration missing; bench missing
- Coverage: lines 100.00%, branches 100.00%, functions 100.00%
- Actions:
  - [x] keep the current test set and revisit only if behavior expands or performance regresses

### `src/dom/utilities/getEventTimeStamp.ts`

- Status: unit exists; integration missing; bench missing
- Coverage: lines 100.00%, branches 50.00%, functions 100.00%
- Actions:
  - [x] raise branch coverage by exercising fallback, guard, and error paths
  - [x] cover native timestamp and fallback timestamp generation paths

### `src/dom/utilities/matches.ts`

- Status: unit exists; integration missing; bench missing
- Coverage: lines 76.92%, branches 69.23%, functions 100.00%
- Actions:
  - [x] raise line coverage with missing happy-path and edge-case scenarios
  - [x] raise branch coverage by exercising fallback, guard, and error paths
  - [x] cover child, descendant, adjacent, and sibling combinators
  - [x] cover attribute selectors plus `:has()` / `:not()` and unsupported pseudo/function failures

### `src/dom/utilities/notifyCSSStyleDeclaration.ts`

- Status: unit exists; integration missing; bench missing
- Coverage: lines 100.00%, branches 100.00%, functions 100.00%
- Actions:
  - [x] keep the current test set and revisit only if behavior expands or performance regresses

### `src/dom/utilities/parseHtml.ts`

- Status: unit exists; integration exists; bench exists
- Coverage: lines 100.00%, branches 72.72%, functions 100.00%
- Actions:
  - [x] raise branch coverage by exercising fallback, guard, and error paths
  - [x] cover malformed markup recovery and mixed text/comment/template/style parsing cases

### `src/dom/utilities/parseSelector.ts`

- Status: unit exists; integration missing; bench missing
- Coverage: lines 100.00%, branches 93.33%, functions 100.00%
- Actions:
  - [x] keep the current test set and revisit only if behavior expands or performance regresses

### `src/dom/utilities/querySelector.ts`

- Status: unit exists; integration exists; bench missing
- Coverage: lines 100.00%, branches 75.00%, functions 100.00%
- Actions:
  - [x] add an integration spec if this file coordinates behavior with other modules
  - [x] raise branch coverage by exercising fallback, guard, and error paths
  - [x] cover no-match behavior and first-match ordering semantics

### `src/dom/utilities/querySelectorAll.ts`

- Status: unit exists; integration exists; bench exists
- Coverage: lines 100.00%, branches 90.00%, functions 100.00%
- Actions:
  - [x] add an integration spec if this file coordinates behavior with other modules

### `src/dom/utilities/removeEventTargetListener.ts`

- Status: unit exists; integration missing; bench missing
- Coverage: lines 100.00%, branches 85.71%, functions 100.00%
- Actions:
  - [x] keep the current test set and revisit only if behavior expands or performance regresses

### `src/dom/utilities/selfAndDescendants.ts`

- Status: unit exists; integration missing; bench missing
- Coverage: lines 100.00%, branches 100.00%, functions 100.00%
- Actions:
  - [x] keep the current test set and revisit only if behavior expands or performance regresses

### `src/dom/utilities/serializeChildren.ts`

- Status: unit exists; integration missing; bench missing
- Coverage: lines 100.00%, branches 100.00%, functions 100.00%
- Actions:
  - [x] keep the current test set and revisit only if behavior expands or performance regresses

### `src/dom/utilities/serializeNode.ts`

- Status: unit exists; integration exists; bench exists
- Coverage: lines 95.00%, branches 66.66%, functions 100.00%
- Actions:
  - [x] add an integration spec if this file coordinates behavior with other modules
  - [x] raise branch coverage by exercising fallback, guard, and error paths
  - [x] cover fragment, comment, empty-element, and escaping edge cases

### `src/dom/utilities/setDomTokenListTokens.ts`

- Status: unit exists; integration missing; bench missing
- Coverage: lines 100.00%, branches 100.00%, functions 100.00%
- Actions:
  - [x] keep the current test set and revisit only if behavior expands or performance regresses

### `src/dom/utilities/setupElement.ts`

- Status: unit exists; integration missing; bench missing
- Coverage: lines 100.00%, branches 100.00%, functions 100.00%
- Actions:
  - [x] keep the current test set and revisit only if behavior expands or performance regresses

### `src/dom/utilities/toNode.ts`

- Status: unit exists; integration missing; bench missing
- Coverage: lines 100.00%, branches 100.00%, functions 100.00%
- Actions:
  - [x] keep the current test set and revisit only if behavior expands or performance regresses

### `src/dom/utilities/updateElementAttribute.ts`

- Status: unit exists; integration missing; bench missing
- Coverage: lines 100.00%, branches 100.00%, functions 100.00%
- Actions:
  - [x] keep the current test set and revisit only if behavior expands or performance regresses

## src/layout/classes

### `src/layout/classes/FlexLayout.ts`

- Status: unit exists; integration exists; bench exists
- Coverage: lines 91.86%, branches 88.33%, functions 94.28%
- Actions:
  - [x] add an integration spec if this file coordinates behavior with other modules

### `src/layout/classes/LayoutEngine.ts`

- Status: unit exists; integration exists; bench exists
- Coverage: lines 86.14%, branches 73.78%, functions 84.21%
- Actions:
  - [x] raise line coverage with missing happy-path and edge-case scenarios
  - [x] raise branch coverage by exercising fallback, guard, and error paths
  - [x] cover incremental cache reuse, dirty subtree invalidation, and cached box localization
  - [x] cover `display: none`, percentage resolution, auto sizing, scroll clamping, and absolute positioning

### `src/layout/classes/TextLayout.ts`

- Status: unit exists; integration exists; bench exists
- Coverage: lines 95.69%, branches 86.00%, functions 100.00%
- Actions:
  - [x] keep the current test set and revisit only if behavior expands or performance regresses

## src/layout/guards

### `src/layout/guards/EmojiPresentationGuard.ts`

- Status: unit exists; integration missing; bench missing
- Coverage: lines 70.00%, branches 72.00%, functions 100.00%
- Actions:
  - [ ] raise line coverage with missing happy-path and edge-case scenarios
  - [ ] raise branch coverage by exercising fallback, guard, and error paths
  - [ ] cover negative, boundary, and ambiguous emoji presentation code point cases

### `src/layout/guards/FullWidthGuard.ts`

- Status: unit exists; integration missing; bench missing
- Coverage: lines 100.00%, branches 100.00%, functions 100.00%
- Actions:
  - [ ] keep the current test set and revisit only if behavior expands or performance regresses

### `src/layout/guards/FullWidthOrWideGuard.ts`

- Status: unit exists; integration missing; bench missing
- Coverage: lines 100.00%, branches 100.00%, functions 100.00%
- Actions:
  - [ ] keep the current test set and revisit only if behavior expands or performance regresses

### `src/layout/guards/WideGuard.ts`

- Status: unit exists; integration missing; bench missing
- Coverage: lines 100.00%, branches 100.00%, functions 100.00%
- Actions:
  - [ ] keep the current test set and revisit only if behavior expands or performance regresses

### `src/layout/guards/ZeroWidthClusterGuard.ts`

- Status: unit exists; integration missing; bench missing
- Coverage: lines 100.00%, branches 100.00%, functions 100.00%
- Actions:
  - [ ] keep the current test set and revisit only if behavior expands or performance regresses

## src/layout/utilities

### `src/layout/utilities/baseVisible.ts`

- Status: unit exists; integration missing; bench missing
- Coverage: lines 100.00%, branches 100.00%, functions 100.00%
- Actions:
  - [ ] keep the current test set and revisit only if behavior expands or performance regresses

### `src/layout/utilities/cellWidth.ts`

- Status: unit exists; integration missing; bench exists
- Coverage: lines 100.00%, branches 94.44%, functions 100.00%
- Actions:
  - [ ] keep the current test set and revisit only if behavior expands or performance regresses

### `src/layout/utilities/codePointInRange.ts`

- Status: unit exists; integration missing; bench missing
- Coverage: lines 100.00%, branches 100.00%, functions 100.00%
- Actions:
  - [ ] keep the current test set and revisit only if behavior expands or performance regresses

### `src/layout/utilities/findWideFastPathRange.ts`

- Status: unit exists; integration missing; bench missing
- Coverage: lines 100.00%, branches 100.00%, functions 100.00%
- Actions:
  - [ ] keep the current test set and revisit only if behavior expands or performance regresses

### `src/layout/utilities/stripAnsi.ts`

- Status: unit exists; integration missing; bench missing
- Coverage: lines 100.00%, branches 100.00%, functions 100.00%
- Actions:
  - [ ] keep the current test set and revisit only if behavior expands or performance regresses

### `src/layout/utilities/trailingHalfwidthWidth.ts`

- Status: unit exists; integration missing; bench missing
- Coverage: lines 100.00%, branches 87.50%, functions 100.00%
- Actions:
  - [ ] keep the current test set and revisit only if behavior expands or performance regresses

## src/renderer/classes

### `src/renderer/classes/ANSIWriter.ts`

- Status: unit exists; integration missing; bench missing
- Coverage: lines 91.39%, branches 87.71%, functions 100.00%
- Actions:
  - [ ] add an integration spec if this file coordinates behavior with other modules

### `src/renderer/classes/CellBuffer.ts`

- Status: unit exists; integration missing; bench missing
- Coverage: lines 100.00%, branches 100.00%, functions 100.00%
- Actions:
  - [ ] add an integration spec if this file coordinates behavior with other modules

### `src/renderer/classes/Differ.ts`

- Status: unit exists; integration exists; bench exists
- Coverage: lines 95.83%, branches 93.10%, functions 75.00%
- Actions:
  - [ ] exercise currently uncovered methods and constructor paths
  - [ ] cover unchanged-frame fast path and full-frame change extremes

### `src/renderer/classes/Painter.ts`

- Status: unit exists; integration exists; bench exists
- Coverage: lines 92.30%, branches 87.37%, functions 100.00%
- Actions:
  - [ ] keep the current test set and revisit only if behavior expands or performance regresses

### `src/renderer/classes/Renderer.ts`

- Status: unit exists; integration exists; bench exists
- Coverage: lines 78.78%, branches 71.42%, functions 88.88%
- Actions:
  - [ ] raise line coverage with missing happy-path and edge-case scenarios
  - [ ] raise branch coverage by exercising fallback, guard, and error paths
  - [ ] cover invalidation behavior when sync output or color profile changes
  - [ ] cover resize reset behavior and consecutive render buffer swapping

## src/terminal/classes

### `src/terminal/classes/EventDispatcher.ts`

- Status: unit exists; integration exists; bench missing
- Coverage: lines 80.18%, branches 60.41%, functions 100.00%
- Actions:
  - [ ] add a performance benchmark if this file is part of a hot path
  - [ ] raise line coverage with missing happy-path and edge-case scenarios
  - [ ] raise branch coverage by exercising fallback, guard, and error paths
  - [ ] cover hit testing by z-index and document order
  - [ ] cover mouse press/release/click normalization, wheel scrolling, focus events, and `dispatchAll()`
  - [ ] cover active-element targeting for keyboard and paste events

### `src/terminal/classes/InputReader.ts`

- Status: unit exists; integration exists; bench exists
- Coverage: lines 87.02%, branches 77.37%, functions 100.00%
- Actions:
  - [x] add a performance benchmark if this file is part of a hot path
  - [ ] raise line coverage with missing happy-path and edge-case scenarios
  - [ ] raise branch coverage by exercising fallback, guard, and error paths
  - [ ] cover incomplete CSI buffering, SS3 fallback, focus sequences, mode responses, and bracketed paste across chunks
  - [ ] cover mouse motion/release/wheel decoding plus alt/ctrl/shift modifier parsing

### `src/terminal/classes/TerminalManager.ts`

- Status: unit exists; integration exists; bench missing
- Coverage: lines 95.94%, branches 83.78%, functions 100.00%
- Actions:
  - [ ] cover repeated start/stop calls and capability negotiation edge cases
