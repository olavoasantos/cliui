# Milestone 6: Documentation — Issues

## Working Summary

Phase 6 produces the higher-level documentation for the library, following the Diataxis framework: tutorials (learning-oriented), how-to guides (task-oriented), reference (information-oriented), and explanation (understanding-oriented). JSDoc/TSDoc docblocks on public exports are written alongside implementation in earlier phases — this milestone covers the standalone documentation that lives in `docs/`.

**Key context:**

- All library features are complete by this phase (Phases 0–5). Documentation can reference the full feature set.
- The project has a template script at `.config/scripts/generate-reference-docs.ts` that should be refactored to generate reference documentation from the actual codebase. This is relevant to M6C7 (CSS property reference).
- Framework examples already exist from M5T7 — the framework tutorial (M6C2) can build on those.
- The architecture document (`docs/learn/architecture.md`) already serves as an internal design reference. M6C8 (architecture overview) is a user-facing explanation that covers the same ground at a higher level, aimed at contributors and advanced users.

---

## Issues

### M6C1: Tutorial — Getting started

**Summary**

Write a step-by-step tutorial that takes a new user from zero to a working terminal application. Covers installation, creating a `Terminal` instance, adding styled elements, and handling keyboard input.

**Expected Outcomes**

- A tutorial document exists in `docs/`
- Covers: installing the package, creating a terminal app, creating and styling elements (inline styles and `<style>` blocks), handling keyboard events (`keydown`), and exiting the app
- The tutorial is self-contained — a user can follow it from start to finish and have a working app
- Code examples are complete and runnable

**Diataxis Category & Audience**

- Category: Tutorial
- Audience: New users with JavaScript/TypeScript experience who are exploring terminal UI development

**Dependencies**

- M1T29: Terminal class (the public API being documented)
- All Phase 1–2 features (styling, layout) must be complete

---

### M6C2: Tutorial — Using with a framework

**Summary**

Write a tutorial demonstrating how to use the library with a UI framework (Preact, Solid, or Vue). Shows how to integrate the terminal DOM with a framework's component model and render cycle.

**Expected Outcomes**

- A tutorial document exists in `docs/`
- Demonstrates integration with at least one framework (the tutorial can focus on one and mention others)
- Covers: setting up the framework with the terminal DOM, writing components that render to the terminal, handling events within the framework's model
- Code examples are complete and runnable
- References the framework examples in `examples/` for additional framework-specific demos

**Diataxis Category & Audience**

- Category: Tutorial
- Audience: Developers familiar with Preact, Solid, or Vue who want to use their preferred framework for terminal UIs

**Dependencies**

- M5T7: Framework examples (working examples to build on)
- M5S6: Framework adapter spike (determines integration patterns)

---

### M6C3: How-to guide — Styling

**Summary**

Write a practical guide covering the styling capabilities of the library: inline styles via `element.style`, `<style>` blocks with CSS selectors, the supported CSS property subset, the box model in terminal cells, and CSS custom properties for theming.

**Expected Outcomes**

- A how-to guide document exists in `docs/`
- Covers: setting inline styles, writing `<style>` blocks, selector syntax and specificity, the full CSS property subset (text styling, box model, layout properties), the terminal box model (padding, border, margin in cells), and CSS custom properties (`--var` / `var()`)
- Each section includes focused, task-oriented examples
- Property tables or summaries help users find the right property for their need

**Diataxis Category & Audience**

- Category: How-to guide
- Audience: Users who understand the basics and want to accomplish specific styling tasks

**Dependencies**

- M5T10: CSS custom properties (last styling feature)
- All Phase 1–2 styling and layout features must be complete

---

### M6C4: How-to guide — Layout

**Summary**

Write a practical guide covering layout capabilities: flexbox layout (row and column), alignment, wrapping, sizing and constraints, and absolute positioning.

**Expected Outcomes**

- A how-to guide document exists in `docs/`
- Covers: `display: block` vs `flex` vs `inline`, flex direction, `flex-grow`/`flex-shrink`/`flex-basis`, `justify-content` and `align-items`, `gap`, `flex-wrap`, explicit sizing (`width`/`height`/`min-*`/`max-*`), percentage values, and absolute positioning with `top`/`left`
- Each section includes focused, task-oriented examples showing common layout patterns
- Demonstrates how to build common UI patterns (sidebar + main content, centered content, header/footer layouts)

**Diataxis Category & Audience**

- Category: How-to guide
- Audience: Users building terminal UI layouts who need to achieve specific arrangements

**Dependencies**

- M4T1: Absolute positioning (last layout feature)
- All Phase 1–2 layout features must be complete

---

### M6C5: How-to guide — Interactivity

**Summary**

Write a practical guide covering interactive features: keyboard and mouse events, focus management, scrollable content, and custom border styles.

**Expected Outcomes**

- A how-to guide document exists in `docs/`
- Covers: keyboard event handling (`keydown`/`keyup`), mouse events (`click`, `mousemove`, etc.), focus management (`tabindex`, Tab cycling, `focus`/`blur` events), scrollable containers (`overflow: scroll`), and defining/registering custom border styles
- Each section includes focused, task-oriented examples
- Demonstrates building interactive patterns (navigable menus, scrollable lists, focusable buttons)

**Diataxis Category & Audience**

- Category: How-to guide
- Audience: Users adding interactivity to their terminal applications

**Dependencies**

- M5T8: Custom border style definitions (last interactivity/customization feature covered)
- All Phase 3–4 interactivity features must be complete

---

### M6C6: How-to guide — Custom elements

**Summary**

Write a practical guide covering how to create and register custom terminal components using the `CustomElementRegistry`. Shows the lifecycle callbacks, attribute observation, and how to build self-contained reusable components.

**Expected Outcomes**

- A how-to guide document exists in `docs/`
- Covers: defining a custom element class, registering with `CustomElementRegistry`, lifecycle callbacks (`connectedCallback`, `disconnectedCallback`, `attributeChangedCallback`), observed attributes, and composing custom elements with standard elements
- Includes a complete example of building a reusable custom component from scratch
- References the built-in components (spinner, progress, text input) as examples of the pattern

**Diataxis Category & Audience**

- Category: How-to guide
- Audience: Component authors who want to build reusable terminal UI components

**Dependencies**

- M5T1: Custom element lifecycle
- M5T3–M5T5: Built-in components (referenced as examples)

---

### M6C7: Reference — CSS property reference

**Summary**

Write (or generate) a complete reference document listing all supported CSS properties, their accepted values, terminal mappings, inheritance behavior, and default values. This serves as the definitive lookup resource for users working with styles.

**Expected Outcomes**

- A reference document exists in `docs/`
- Lists every supported CSS property organized by category (text styling, box model, layout)
- For each property: accepted values, default value, whether it inherits, terminal mapping/behavior, and any terminal-specific notes
- Covers CSS custom properties (`--var` / `var()`)
- Covers all border styles (built-in and custom)
- The `.config/scripts/generate-reference-docs.ts` template script is refactored to generate reference documentation from the actual codebase (JSDoc/TSDoc annotations on public exports)

**Diataxis Category & Audience**

- Category: Reference
- Audience: All users — the primary lookup resource during development

**Dependencies**

- All phases (0–5) must be complete (references the full property set)

---

### M6C8: Explanation — Architecture overview

**Summary**

Write an explanation document covering the pipeline architecture, design decisions, and trade-offs for contributors and advanced users. This is the user-facing counterpart to the internal architecture document (`docs/learn/architecture.md`), written at a higher level and focused on understanding rather than specification.

**Expected Outcomes**

- An explanation document exists in `docs/`
- Covers: the five-layer pipeline (DOM → Style → Layout → Render → Terminal), why a DOM polyfill was chosen as the document model, why flexbox is the only layout algorithm, how the frame loop works (dirty-marking → style → layout → paint → diff → ANSI), and key trade-offs (zero dependencies, terminal cell units, CSS subset scope)
- Written for understanding, not for task completion — helps readers build a mental model of the system
- Does not duplicate the internal architecture document — focuses on "why" rather than "what"

**Diataxis Category & Audience**

- Category: Explanation
- Audience: Contributors, advanced users, and anyone wanting to understand the library's design philosophy

**Dependencies**

- All phases (0–5) must be complete (explains the full architecture)

---
