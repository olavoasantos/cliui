# Milestone 9: CSS Animations & Transitions — Issues

## Working Summary

Phase 9 adds CSS transitions and `@keyframes` animations to terminal-dom. Several built-in components already implement animation imperatively via `TerminalFrameAware` (spinner frame cycling, progress bar spring physics, skeleton shimmer, button press flash, toast countdown). CSS animations make the common case — state-driven visual transitions — declarative.

**Four groups of work:**

1. **Foundation (M9T1–M9T5):** Easing functions, animatable property classification, value interpolation, `@keyframes` parsing, and transition/animation CSS property support.
2. **Baseline (M9T6):** Record performance before wiring animation into the frame loop — gate for the integration work.
3. **Controllers & integration (M9T7–M9T11):** Transition controller (detects computed value changes), animation controller (manages `@keyframes` playback), keyframe resolver, style engine integration, and frame loop wiring.
4. **Events & verification (M9T12–M9T13):** Animation/transition DOM events and performance overhead verification.

**Key context and design decisions:**

- **The frame loop already runs at configurable FPS.** `Terminal.renderFrame()` is called every frame. The animation system hooks into this — no new timer mechanism needed.
- **Color is the highest-value animation target.** RGB interpolation is smooth and visually compelling. `lerpColor()` already exists in `src/renderer/utilities/`. A button hover transitioning from `#333` to `#7c3aed` over 200ms is the canonical use case.
- **Cell-based values step, and that's fine.** A `width` transition from 10 to 20 cells steps through 11, 12, 13... The `steps()` easing function makes this intentional. For cell-based properties, `steps()` may be more natural than `ease`.
- **Hybrid architecture.** The animation system runs before style recomputation each frame (matching browser architecture), but only processes elements in an active animation/transition set (no full tree walk). Elements are added to the set when an animation/transition starts and removed when it ends.
- **Transition detection hooks into `recomputeDirty()`.** The style engine already compares old vs new computed values (via `hasLayoutChange()`). The transition controller uses the same comparison point: if a property changed and has a `transition` defined, start a transition from old → new instead of snapping to the new value.
- **Animation values participate in the cascade.** Per CSS spec: animation values override the normal cascade, transition values override animation values. The animation layer sits between cascade resolution and final computed values.
- **`@keyframes` requires nested at-rule parsing.** The current CSS parser handles `@identifier prelude { declarations }` — flat declarations inside an at-rule body. `@keyframes` has nested blocks: `@keyframes name { from { color: red; } 50% { color: blue; } to { color: green; } }`. The parser needs to support this structure.
- **Shorthand parsing is non-trivial.** Both `transition` and `animation` support comma-separated multi-value shorthands: `transition: color 200ms ease, background-color 300ms ease-in 100ms`. The component values have ambiguous types (duration vs delay are both time values, resolved by position).
- **`ComputedStyle` is `Map<string, string>`.** Animated values are string representations of CSS values, matching the existing computed style format. Interpolation operates on parsed values (numbers, colors) and serializes back to strings.
- **`TerminalFrameAware` is not replaced.** CSS animations handle the declarative 80% case. Complex imperative animations (spring physics, frame-based sequences, interactive gestures) still use `TerminalFrameAware`. Both systems coexist.

**Animatable property classification:**

| Interpolation type      | Properties                                                                                                                                                                                                                  | Method                                    |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| **Color**               | `color`, `background-color`, `border-color`, `text-decoration-color`                                                                                                                                                        | RGB channel lerp (existing `lerpColor`)   |
| **Number (cells)**      | `width`, `height`, `min-width`, `min-height`, `max-width`, `max-height`, `padding-*`, `margin-*`, `gap`, `row-gap`, `column-gap`, `top`, `left`, `flex-basis`                                                               | Linear interpolation, rounded to integers |
| **Number (continuous)** | `opacity`, `flex-grow`, `flex-shrink`, `z-index`                                                                                                                                                                            | Linear interpolation                      |
| **Discrete**            | `display`, `flex-direction`, `flex-wrap`, `border-style`, `font-weight`, `font-style`, `text-decoration`, `text-align`, `white-space`, `overflow`, `position`, `justify-content`, `align-items`, `align-self`, `box-sizing` | Snap at 50% progress                      |

**New CSS properties (14 total):**

| Property                     | Values                                                                                                           |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `transition`                 | Shorthand: `property duration timing-function delay`, comma-separated                                            |
| `transition-property`        | Property name, `all`, `none`                                                                                     |
| `transition-duration`        | Time value (e.g., `200ms`, `0.5s`)                                                                               |
| `transition-timing-function` | `linear`, `ease`, `ease-in`, `ease-out`, `ease-in-out`, `cubic-bezier(x1,y1,x2,y2)`, `steps(n, start\|end)`      |
| `transition-delay`           | Time value                                                                                                       |
| `animation`                  | Shorthand: `name duration timing-function delay iteration-count direction fill-mode play-state`, comma-separated |
| `animation-name`             | `@keyframes` name, `none`                                                                                        |
| `animation-duration`         | Time value                                                                                                       |
| `animation-timing-function`  | Same as `transition-timing-function`                                                                             |
| `animation-delay`            | Time value                                                                                                       |
| `animation-iteration-count`  | Number, `infinite`                                                                                               |
| `animation-direction`        | `normal`, `reverse`, `alternate`, `alternate-reverse`                                                            |
| `animation-fill-mode`        | `none`, `forwards`, `backwards`, `both`                                                                          |
| `animation-play-state`       | `running`, `paused`                                                                                              |

---

## Issues

### M9T1: Easing functions

**Summary**

Implement the CSS easing functions as a standalone utility. These are pure math — given a progress value (0–1), return the eased value (0–1). Covers named keywords, `cubic-bezier()`, and `steps()`.

**Expected Outcomes**

- An `evaluateEasing` utility exists in `src/css/utilities/` that takes an easing function descriptor and a progress value (0–1), returns the eased value (0–1)
- Named keywords resolve to their cubic-bezier equivalents: `linear` (identity), `ease` (0.25, 0.1, 0.25, 1.0), `ease-in` (0.42, 0, 1.0, 1.0), `ease-out` (0, 0, 0.58, 1.0), `ease-in-out` (0.42, 0, 0.58, 1.0)
- `cubic-bezier(x1, y1, x2, y2)` implements the cubic bezier curve evaluation — finds `t` for a given `x` using Newton-Raphson iteration (or binary search fallback), returns the corresponding `y`
- `steps(count, position)` implements step easing — `jump-start` / `start`, `jump-end` / `end` (default), `jump-both`, `jump-none` positions
- Types for easing function descriptors are defined in `src/css/types/`
- Unit tests cover: all named keywords against known reference values, cubic-bezier with various control points (including edge cases like linear and near-linear curves), steps with each position variant, boundary values (0 and 1), and values outside 0–1 range

**Dependencies**

- None (standalone math utility)

---

### M9T2: Animatable property classification and value interpolation

**Summary**

Define which CSS properties are animatable, classify their interpolation type (color, number, discrete), and implement the interpolation dispatch. Given two CSS values and a progress (0–1), produce the interpolated value.

**Expected Outcomes**

- An animatable property registry exists in `src/css/constants/` — maps each animatable property name to its interpolation type (`'color'`, `'number'`, `'discrete'`)
- A `interpolateValue` utility exists in `src/css/utilities/` that takes a property name, a start value string, an end value string, and a progress (0–1), and returns the interpolated value string
- Color interpolation uses RGB channel lerp (delegates to the existing `lerpColor` from `src/renderer/utilities/`, with CSS color string parsing/serialization)
- Number interpolation uses linear interpolation, with integer rounding for cell-based properties (padding, width, gap, etc.) and continuous values for opacity, flex-grow, etc.
- Discrete interpolation snaps to the end value at 50% progress
- Properties not in the registry are treated as discrete (non-animatable)
- Unit tests cover: each interpolation type with representative properties, boundary values, string parsing/serialization round-trips, and unknown properties defaulting to discrete

**Dependencies**

- M9T1: Easing functions (the interpolation pipeline uses eased progress values)

---

### M9T3: @keyframes parser

**Summary**

Extend the CSS parser to handle `@keyframes` at-rules, which contain nested blocks instead of flat declarations. This is the only at-rule in terminal-dom's CSS subset that has nested structure.

**Expected Outcomes**

- The CSS parser recognizes `@keyframes name { ... }` and produces a structured keyframe list
- Each keyframe has a list of stop positions (percentages or `from`/`to` aliases: `from` = 0%, `to` = 100%) and a declaration list
- Supports multiple stops per block: `0%, 100% { opacity: 1; }`
- Supports any number of keyframe blocks within a single `@keyframes` rule
- Parsed keyframes are stored in a keyframe registry by name, accessible to the animation controller
- The existing at-rule handler system (`StyleEngine.onAtRule`) is extended or a new registration mechanism is used so the animation system receives parsed keyframes
- Unit tests cover: basic `from`/`to` keyframes, percentage keyframes, multiple stops, multiple properties per keyframe, multiple `@keyframes` rules, duplicate names (last wins), and malformed input

**Dependencies**

- M1T12: CSS parser (the parser being extended)

---

### M9T4: Transition and animation CSS properties

**Summary**

Add the 14 transition and animation CSS properties to terminal-dom's CSS property subset. This covers recognition in `CSSStyleDeclaration`, shorthand expansion, and propagation through the style resolver.

**Expected Outcomes**

- `CSSStyleDeclaration` recognizes all 14 properties: `transition`, `transition-property`, `transition-duration`, `transition-timing-function`, `transition-delay`, `animation`, `animation-name`, `animation-duration`, `animation-timing-function`, `animation-delay`, `animation-iteration-count`, `animation-direction`, `animation-fill-mode`, `animation-play-state`
- `transition` shorthand expands into its four component properties — handles comma-separated multiple transitions: `transition: color 200ms ease, background-color 300ms ease-in 100ms`
- `animation` shorthand expands into its eight component properties — handles comma-separated multiple animations: `animation: fadeIn 1s ease-out, pulse 2s linear infinite`
- Time values are parsed from CSS syntax (`200ms`, `0.5s`, `1s`) and stored in a normalized format (milliseconds)
- Easing function values are parsed from CSS syntax (`ease`, `cubic-bezier(0.4, 0, 0.2, 1)`, `steps(4, end)`) and stored as structured descriptors
- The style resolver propagates these properties through the cascade (they are not inherited)
- Unit tests cover: individual property get/set, shorthand expansion with single and multiple values, time value parsing, easing function parsing, and cascade propagation

**Dependencies**

- M1T9: CSSStyleDeclaration (the class being extended)
- M1T14: Style resolver (propagation)
- M9T1: Easing function types (for structured easing descriptors)

---

### M9T5: Keyframe resolver

**Summary**

Implement the keyframe resolution logic: given an animation's current progress (0–1) and a parsed set of keyframes, find the two bounding keyframes and interpolate between them using the value interpolation system.

**Expected Outcomes**

- A `resolveKeyframe` utility exists in `src/css/utilities/` (or a `KeyframeResolver` class in `src/css/classes/` if stateful)
- Given a set of sorted keyframe stops and a progress value, identifies the two bounding stops (e.g., at progress 0.6, bounding stops might be 50% and 75%)
- Computes the local progress between the bounding stops (0.6 between 50%–75% = 0.4 local)
- Applies the easing function (per-keyframe or animation-level) to the local progress
- Interpolates each animated property between the two keyframes using `interpolateValue` (M9T2)
- Returns a map of property → interpolated value string
- Handles edge cases: progress before first keyframe, progress after last keyframe, keyframes with different property sets (properties present in one stop but not another use the nearest defined value)
- Implicit `0%` and `100%` keyframes are synthesized from the element's computed style when not explicitly defined
- Unit tests cover: two-stop (from/to), multi-stop interpolation, local progress calculation, per-keyframe easing, missing properties in intermediate keyframes, and implicit start/end keyframes

**Dependencies**

- M9T1: Easing functions (applied to local progress)
- M9T2: Value interpolation (interpolates between keyframe values)

---

### M9T6: Record pre-animation performance baseline

**Summary**

Capture a performance baseline **before** the animation system is wired into the frame loop. This isolates the overhead of per-frame animation processing — even when no animations are active, the system checks the active animation set. This baseline is the "before" for M9T13.

**Expected Outcomes**

- `pnpm test:performance:record` is run and the reference snapshot is saved
- The existing benchmark suite passes (animation properties and parser changes from M9T1–M9T5 should not affect frame performance since they are not yet wired into the render loop)
- The baseline is committed alongside the foundation work

**Dependencies**

- M9T1–M9T5: Foundation work must be complete
- M7T9: Performance instrumentation should be in place for accurate measurement

---

### M9T7: Transition controller

**Summary**

Implement the transition controller — detects when computed style values change and starts transitions for properties that have `transition` defined. Manages active transitions per element, computes interpolated values each frame, and handles cancellation when a new change occurs mid-transition.

**Expected Outcomes**

- A `TransitionController` class exists in `src/css/classes/`
- Maintains a set of active transitions: `{ element, property, startValue, endValue, startTime, duration, delay, easing }`
- **Detection:** When `StyleEngine.recomputeDirty()` produces a new computed value that differs from the old value for a property that has a `transition` defined → starts a transition from old → new
- **Per-frame update:** Given the current timestamp, computes the interpolated value for each active transition using elapsed time, delay, duration, and easing
- **Completion:** Removes the transition when progress reaches 1.0 and applies the target value
- **Cancellation:** If a new computed value change occurs mid-transition (e.g., mouse leaves during a hover transition), the transition reverses or starts a new transition from the current interpolated value
- **Multi-property:** An element can have multiple active transitions on different properties simultaneously
- `transition-property: all` triggers transitions on all animatable properties that change
- `transition-property: none` suppresses all transitions
- Unit tests cover: start on value change, interpolated value at various timestamps, completion, cancellation mid-transition, reversal, delay, multi-property, `all` keyword, and `none` suppression

**Dependencies**

- M9T1: Easing functions (applied per transition)
- M9T2: Value interpolation (computes intermediate values)
- M9T4: Transition CSS properties (parsed transition definitions)
- M9T6: Pre-animation baseline must be recorded first

---

### M9T8: Animation controller

**Summary**

Implement the animation controller — manages active `@keyframes` animations per element. Tracks animation state including iteration count, direction, fill mode, and play state. Computes current animated values each frame by delegating to the keyframe resolver.

**Expected Outcomes**

- An `AnimationController` class exists in `src/css/classes/`
- Maintains a set of active animations: `{ element, keyframes, startTime, duration, delay, easing, iterationCount, direction, fillMode, playState }`
- **Activation:** When an element's computed `animation-name` references a registered `@keyframes` name → starts that animation
- **Per-frame update:** Given the current timestamp, computes the overall progress considering delay, duration, iteration count, and direction, then delegates to the keyframe resolver (M9T5) for interpolated values
- **Iteration:** Supports `animation-iteration-count` (finite number or `infinite`), advances iteration counter at the end of each cycle
- **Direction:** `normal` (0→1), `reverse` (1→0), `alternate` (0→1→0→...), `alternate-reverse` (1→0→1→...)
- **Fill mode:** `none` (no styles before/after), `forwards` (retains last keyframe after completion), `backwards` (applies first keyframe during delay), `both` (forwards + backwards)
- **Play state:** `running` / `paused` — pausing freezes the animation at its current progress, resuming continues from where it left off
- **Removal:** When `animation-name` changes or becomes `none`, the animation is removed
- **Multiple animations:** An element can have multiple active animations (comma-separated `animation-name`). Later animations override earlier ones for the same property.
- Unit tests cover: basic playback, iteration counting, each direction mode, each fill mode, pause/resume, multiple animations on one element, animation removal, and delay behavior

**Dependencies**

- M9T3: @keyframes parser (provides keyframe definitions)
- M9T4: Animation CSS properties (parsed animation definitions)
- M9T5: Keyframe resolver (computes per-frame values from keyframes)
- M9T6: Pre-animation baseline must be recorded first

_Can run in parallel with M9T7._

---

### M9T9: Style engine integration

**Summary**

Wire the transition and animation controllers into the style resolution pipeline. Animated values participate in the cascade: animation values override the normal cascade, and transition values override animation values. The style engine queries both controllers during style resolution.

**Expected Outcomes**

- An `AnimationLayer` (or equivalent integration point) is added to the style engine that queries both controllers for current animated values during `recomputeDirty()`
- **Cascade priority order:** transition values > animation values > normal cascade (specificity + source order)
- **Transition detection point:** Inside `recomputeDirty()`, after computing the new cascaded value but before storing it — the old and new values are compared, and if a transition is defined, the transition controller is notified
- **Animation override point:** After cascade resolution, the animation controller's current values override the cascaded values for properties being animated
- **Transition override point:** After animation override, the transition controller's current values override for properties being transitioned
- Elements with active animations or transitions are marked style-dirty each frame (so their computed styles are recomputed with updated animated values)
- When no animations or transitions are active on an element, there is zero overhead for that element during style resolution
- Integration tests verify: a class change triggers a transition on a transitioned property, an animation overrides a cascaded value, a transition overrides an animation, and computed styles reflect animated values at various timestamps

**Dependencies**

- M9T7: Transition controller
- M9T8: Animation controller
- M1T15: StyleEngine (the engine being extended)

---

### M9T10: Frame loop integration

**Summary**

Wire the animation system into `Terminal.renderFrame()`. The animation controllers run before style recomputation each frame, updating their active animation/transition sets and marking animated elements as style-dirty. Only elements with active animations/transitions are processed — the hybrid approach.

**Expected Outcomes**

- `Terminal.renderFrame()` calls the animation system's `tick(timestamp)` before `styleEngine.recomputeDirty()`
- The tick method iterates only the active animation/transition set — no full tree walk
- Elements with active animations/transitions are marked style-dirty so their values update
- When the active set is empty, the tick is a no-op (check a set size, return — near-zero overhead)
- Animations and transitions integrate with the existing change detection in `renderFrame()` — active animations/transitions count as "has changes" so the frame is not skipped
- The render loop's FPS cap naturally limits animation updates (at 60fps, animations update every ~16ms)
- Integration tests verify: element with transition re-renders across multiple frames with interpolated values, element with animation cycles through keyframes, settled frame (no animations) has no overhead

**Dependencies**

- M9T9: Style engine integration (the animated values must feed into computed styles)
- M1T29: Terminal class (the frame loop being extended)

---

### M9T11: Animation and transition DOM events

**Summary**

Dispatch standard DOM events for animation and transition lifecycle. These enable application code to respond to animation state changes — showing content after a fade-in completes, chaining animations, or cleaning up after transitions.

**Expected Outcomes**

- `TransitionEvent` class exists in `src/dom/classes/` with `propertyName`, `elapsedTime`, `pseudoElement` properties
- `AnimationEvent` class exists in `src/dom/classes/` with `animationName`, `elapsedTime`, `pseudoElement` properties
- Transition events dispatched on the element: `transitionrun` (transition created, including during delay), `transitionstart` (delay ends, interpolation begins), `transitionend` (transition completes), `transitioncancel` (transition cancelled mid-flight)
- Animation events dispatched on the element: `animationstart` (animation begins, after delay), `animationend` (animation completes all iterations), `animationiteration` (each iteration boundary), `animationcancel` (animation removed before completion)
- All events bubble
- Unit tests verify: event dispatch timing, event properties (`propertyName`, `animationName`, `elapsedTime`), bubbling, and that cancellation events fire when transitions/animations are interrupted

**Dependencies**

- M9T7: Transition controller (fires transition events)
- M9T8: Animation controller (fires animation events)
- M1T6: DOM event classes (base `Event` class)

_Can run in parallel with M9T9 and M9T10._

---

### M9T12: Record baseline and verify animation overhead

**Summary**

Compare the animation-enabled system's performance against the pre-animation baseline from M9T6. The key question: when no animations or transitions are active, what is the per-frame cost of the animation system's existence? The hybrid approach (check set size, return if empty) should make this near-zero.

**Expected Outcomes**

- `pnpm test:performance:compare` is run against the baseline from M9T6
- The overhead is documented with concrete numbers for each benchmark scenario, with focus on the "no animations active" case (the common case for most frames)
- If overhead is within acceptable bounds: update the baseline with `pnpm test:performance:record` and commit
- If overhead is unacceptable: optimize the hot path (the active set check) or add a mechanism to fully disable the animation system
- Benchmarks are added for animation-specific scenarios: element with active color transition, element with active multi-property animation, 50 elements with simultaneous transitions (e.g., a list re-ordering)

**Dependencies**

- M9T10: Frame loop integration (the animation system must be fully wired)
- M9T11: Animation and transition events (complete system)
- M9T6: Pre-animation baseline

---
