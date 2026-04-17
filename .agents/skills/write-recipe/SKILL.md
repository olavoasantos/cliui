---
name: write-recipe
description: Write a how-to guide (Diataxis "recipe") through structured brainstorming and outline speedrunning
user-invocable: true
---

# Write Recipe

Write a how-to guide for the `docs/recipes/` or `packages/<module>/src/docs/recipes/` directory. A recipe is **task-oriented** — the reader is here to accomplish a specific goal, not to learn or understand concepts.

## Input

The user describes what task the reader needs to accomplish.

## Writing Standards

- **Concrete over abstract.** Exact commands, exact code, exact steps.
- **Every sentence earns its place.** Cut anything that doesn't help complete the task.
- **Assume competence.** Don't over-explain basics. The reader knows what they want to do.
- **Clarity is king.** When in doubt, be more direct.
- **No filler.** No preamble, no "In order to...".
- **No fabrication.** If unsure, flag with `[VERIFY]`.

## Recipe Principles (Diataxis)

- The reader already knows what they want to do — help them do it.
- Focus on practical steps, not teaching or theory.
- Be direct and efficient — respect their time.
- Address real-world variations ("if X, then do Y").
- Scannable, not a wall of text — usable in the middle of work.
- **Structured as ordered steps** (1, 2, 3...) — each step is one action.
- End when the task is done. No fluff.

## Phase 1: Understand

_Mode: Task analyst — understand what the reader is trying to accomplish._

Explore (one question at a time):

- Task goal — what exactly does the reader want to accomplish?
- Success state — what does "done" look like? How do they know it worked?
- Reader context — who are they? What do they already know?
- Starting conditions — where are they starting from?
- Variations — multiple paths? Different environments, versions, configurations?
- Prerequisites — what must be true before they begin?
- Constraints — time-sensitive? Reversible? Risks?
- Common failure points — where do people get stuck?

**Gate:** Articulate the task, success state, and scope. **Do not proceed until confirmed.**

**Artifact:** Task Definition Brief.

## Phase 2: Expand

_Mode: Edge case explorer — surface variations and pitfalls._

**Calibration:** Ask how comprehensive vs. streamlined (Streamlined / Practical / Comprehensive). Recommend based on task complexity.

Go wide across:

1. Approach variations — different ways to accomplish the goal
2. Environment variations — different platforms, versions, configs
3. Prerequisite paths — different starting points
4. Common mistakes and how to avoid them
5. Edge cases — unusual but realistic scenarios
6. Troubleshooting — what goes wrong and how to fix it
7. Related tasks — natural "next step" links

Aim for 2–4 items per category.

**Gate:** Human indicates which variations to include.

**Artifact:** Approaches & Edge Cases Bank.

## Phase 3: Curate

_Mode: Documentation architect — design for usability._

- Identify the clearest primary path.
- Decide which variations to include (separate sections? inline conditionals?).
- Determine step granularity for this audience.
- Plan for scannability (headers, numbered steps, callouts).
- Flag what to exclude and whether to link elsewhere.

**Gate:** Human agrees on scope, variations, and structure.

**Artifact:** Guide Structure Outline.

## Phase 4: Outline

_Mode: Outline engineer — structure the skeleton._

**Protocol:**

1. Present high-level outline — major sections.
2. Wait for approval.
3. Break down one level deeper — individual steps within each section.
4. Wait for approval.
5. Repeat until steps are atomic (one action each).
6. Present full outline.
7. Coherence check — is the flow logical? Any gaps?
8. Wait for final approval.

**Key:** Each step in the outline should be a single, concrete action. The reader should never wonder "what do I actually do here?"

**Artifact:** Full Recursive Outline.

## Phase 5: Speedrun

_Mode: Rapid drafter — fill the skeleton fast._

- Work through the outline in order.
- Write each step as a clear, numbered instruction.
- Include exact commands, code, or configuration where applicable.
- Add brief context only when needed to complete the step.
- Handle variations with clear conditionals.
- Include warnings for destructive or irreversible actions.
- Add checkpoints: "At this point, you should see X."
- **Do not polish.** That is Phase 6's job.
- If unsure, write `[VERIFY: ...]` and keep moving.

**Artifact:** Raw Draft.

## Phase 6: Polish

_Mode: Documentation editor — tighten, verify, ensure readers succeed._

1. **Spotlight:** Identify the 3–5 weakest spots (unclear steps, missing info, ambiguity).
2. **Walk-through:** Read as the target reader. Could you complete the task from these steps alone?
3. **Edit:**
   - Verify every step is clear and actionable.
   - Check commands/code are complete and correct.
   - Confirm variations are clearly signaled.
   - Ensure warnings are visible and well-placed.
   - Cut unnecessary explanation — keep only what serves the task.
   - Verify troubleshooting covers likely issues.
   - Confirm success state is clear at the end.
   - Resolve `[VERIFY]` flags.

**Artifact:** Final Recipe, placed in the correct `docs/recipes/` or `src/docs/recipes/` directory.
