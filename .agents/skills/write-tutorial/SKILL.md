---
name: write-tutorial
description: Write a tutorial (Diataxis "tutorial") through structured brainstorming and outline speedrunning
user-invocable: true
---

# Write Tutorial

Write a tutorial for the `docs/tutorials/` or `packages/<module>/src/docs/tutorials/` directory. A tutorial is **learning-oriented** — the learner acquires skills by doing, not by reading about concepts or following a task checklist.

## Input

The user describes what the learner should be able to do or build by the end.

## Writing Standards

- **Concrete over abstract.** The learner does things, not reads about things.
- **Every step must work.** If they follow along, they succeed. No broken steps.
- **Match the learner.** Calibrate to their actual starting point.
- **Clarity is king.** Each instruction is unambiguous.
- **No filler.** Minimal explanation — only what's needed to proceed.
- **No fabrication.** If unsure, flag with `[VERIFY]`.

## Tutorial Principles (Diataxis)

- The learner learns by _doing_, not by reading.
- Every step should _work_ — success if they follow along.
- Keep explanations minimal and in service of the doing.
- Build confidence, not just transfer knowledge.
- The end state is concrete: "You built X" or "You can now do Y".
- Include checkpoints: "At this point, you should see..." — so the learner knows they're on track.

## Phase 1: Understand

_Mode: Learning designer — understand the learner and the learning goal._

Explore (one question at a time):

- Learning goal — what should they be able to do by the end?
- End state — what will they have built or accomplished?
- Target learner — who are they? What do they already know?
- Starting point — what can we assume? What must we not assume?
- Prerequisites — what must they have installed or understood?
- Environment — tools, platforms, setup required?
- Scope — what's in, what's out? How long should it take?
- Success moment — when do they feel "I did it!"?
- Friction points — where do learners typically get stuck?

**Gate:** Articulate the learning goal, learner, end state, and scope. **Do not proceed until confirmed.**

**Artifact:** Tutorial Scope Brief.

## Phase 2: Expand

_Mode: Instructional explorer — find ways to teach this._

**Calibration:** Ask how conventional vs. creative (Grounded / Adventurous / Experimental). Recommend based on topic.

Go wide across:

1. Project options — what could they build that teaches the concepts?
2. Teaching sequences — what order for concepts? Dependencies?
3. Analogies and mental models — what helps learners grasp this?
4. Scaffolding — how to break complex steps into digestible pieces?
5. "Aha moment" opportunities — where can we create satisfying realizations?
6. Failure recovery — where will learners make mistakes? How to help them recover?
7. Wild cards — creative hooks, ways to make it memorable

Aim for 2–4 ideas per category.

**Gate:** Human indicates which approaches fit.

**Artifact:** Teaching Approaches Bank.

## Phase 3: Curate

_Mode: Curriculum architect — design the learning path._

- Choose the best project for this learning goal and audience.
- Map the step sequence — what order, what dependencies.
- Determine step granularity for this learner level.
- Identify checkpoint placements ("pause and verify").
- Flag likely stumbling blocks and plan mitigation.
- Recommend a structure.

**Gate:** Human agrees on project, sequence, and structure.

**Artifact:** Learning Path Outline.

## Phase 4: Outline

_Mode: Outline engineer — structure the skeleton._

**Protocol:**

1. Present high-level outline — major sections/stages of the tutorial.
2. Wait for approval.
3. Break down one level deeper — steps within each stage.
4. Wait for approval.
5. Repeat until steps are atomic.
6. Mark checkpoint locations in the outline.
7. Present full outline.
8. Coherence check — does the learning progression make sense? Any dependency violations?
9. Wait for final approval.

**Artifact:** Full Recursive Outline.

## Phase 5: Speedrun

_Mode: Rapid drafter — fill the skeleton fast._

- Work through the outline in order.
- Write each step as a clear instruction with exact code/commands.
- Include checkpoints: "At this point, you should see X."
- Keep explanations minimal — just enough to proceed.
- Anticipate errors, include brief troubleshooting tips.
- **Do not polish.** That is Phase 6's job.
- If unsure, write `[VERIFY: ...]` and keep moving.

**Artifact:** Raw Draft.

## Phase 6: Polish

_Mode: Tutorial editor — tighten, test, ensure learner success._

1. **Spotlight:** Identify the 3–5 weakest spots (unclear steps, missing context, likely confusion).
2. **Learner simulation:** Walk through as a beginner. Where would you get stuck? Where would you lose confidence?
3. **Edit:**
   - Verify every step is clear and actionable.
   - Check code/commands are complete and correct.
   - Ensure checkpoints are at the right places.
   - Confirm the learning progression is logical.
   - Cut unnecessary explanation — keep only what serves the doing.
   - Verify troubleshooting covers likely issues.
   - Confirm the success moment is satisfying.
   - Resolve `[VERIFY]` flags.

**Artifact:** Final Tutorial, placed in the correct `docs/tutorials/` or `src/docs/tutorials/` directory.
