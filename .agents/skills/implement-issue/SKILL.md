---
name: implement-issue
description: Implement a milestone issue following the project's phased workflow, conventions, and quality gates
user-invocable: true
---

# Implement Issue

Implement a milestone issue from `docs/issues/`. This skill defines the phased workflow for taking an issue from specification to tested, committed code.

## Input

The user provides an issue ID (e.g., `M1T17`, `M2T3`). Determine the milestone file from the prefix (e.g., `M1` = `docs/issues/milestone-1.md`).

## Phase 1: Understand

### Read all inputs

Read in this order:

1. The issue from its milestone file in `docs/issues/`
2. `docs/learn/architecture.md` — the design document
3. `CLAUDE.md` — project conventions
4. `docs/ROADMAP.md` — broader context
5. Dependency issues referenced in the current issue
6. Existing plan (`.ignore/plans/issue-{id}-plan.md`) — if resuming

### Explore the repository

- What directories, source files, and configurations exist?
- What code related to this issue is already implemented?
- What patterns do similar implementations follow in the codebase?
- Are the issue's dependencies actually completed?

### Pre-flight checks

Run `pnpm check` to establish a baseline. Record what passes and what is already broken. You are not responsible for pre-existing failures, but you must not make them worse.

### Ask questions

Ask focused questions one at a time to fill gaps in understanding. Periodically synthesize what you have understood. Skip dimensions already well-covered by the documents.

### Gate

Articulate your full understanding back to the human. **Do not proceed until the human confirms.**

## Phase 2: Plan

Draft an implementation plan covering:

- **Step sequence** following type-first TDD: types/interfaces, tests (red), stubs, implementation (green). Adapt to the task.
- **Files to create or modify** and why.
- **Testing approach** — unit, integration, performance benchmarks as appropriate.
- **Codebase analogs** — existing implementations to use as reference.
- **Risks or unknowns.**

Present the plan. Incorporate feedback. Once approved, persist to `.ignore/plans/issue-{id}-plan.md`.

**Gate: Do not proceed until the human approves the plan.**

### Cadence

Ask how the human wants to work:

- **Step-by-step:** Pause after each plan step for review.
- **Batch:** Pause after logical groups of steps.
- **Autonomous:** Execute the full plan, pausing only on blockers.

## Phase 3: Implement

### For each step

1. **Re-read before acting.** Re-read the issue, conventions, source files, and plan before each step. Never rely on memory of file contents.
2. **Pattern match.** Find the closest codebase analog. Follow conventions over analogs if they conflict.
3. **Execute.** Follow the type-first TDD progression adapted to the task.
4. **Verify.** After each meaningful change, run relevant tests, type checker, and linter. Fix issues immediately.
5. **Update the plan.** Mark steps complete in `.ignore/plans/issue-{id}-plan.md`.

### Hard rules

- **No code before alignment.** No implementation until understanding is confirmed and plan is approved.
- **Plan is the contract.** If you need to deviate, stop and renegotiate.
- **No faking.** Never mock, stub, or bypass functionality to make tests pass. Implement real logic.
- **No hallucination.** Verify every library, API, and pattern actually exists before using it.
- **No scope creep.** Implement what the issue describes. Leave out-of-scope discoveries as TODO comments.
- **No new dependencies without consent.**

### Error handling

| Tier           | What                                                                | Action                                   |
| -------------- | ------------------------------------------------------------------- | ---------------------------------------- |
| Self-repair    | Lint errors, typos, simple type mismatches you introduced           | Fix autonomously                         |
| Flag and offer | Test failures that resist a fix, unexpected dependency behavior     | Stop, explain, offer options             |
| Full stop      | Plan is structurally wrong, environmental failures, scope explosion | Stop, report clearly, ensure clean state |

If you find yourself layering fix on fix — stop. Roll back to the last known-good commit and try a different approach or escalate.

## Phase 4: Verify

1. **Expected Outcomes checklist.** Re-read the issue's Expected Outcomes from disk. Verify each one individually against the actual code.
2. **Anti-fake check.** Are there mocks/stubs that should not exist? Is every piece of logic actually implemented? Do tests verify real behavior?
3. **Full quality gate.** Run `pnpm check`. Compare against your pre-flight baseline — you must not have broken anything.
4. **Diff review.** Review your full diff for accidentally modified files, debug logging, commented-out code, or development artifacts.

## Phase 5: Clean Up

After the human approves the implementation:

1. **Fix lint and formatting.** Run `pnpm fix` to auto-fix lint and formatting issues.
2. **Final quality gate.** Run `pnpm check` one last time.
3. **Create a changeset.** Run `pnpm version:bump` or create a changeset file describing the changes.
4. **Commit.** Use the `commit` skill. One commit per issue unless the work naturally splits into meaningful atomic commits.
5. **Update the plan.** Mark the plan as complete with a final summary in the Progress Log.
6. **Convention updates.** If convention additions to `CLAUDE.md` were approved during the session, apply them now.

## Resuming an Interrupted Session

1. Read the plan from `.ignore/plans/issue-{id}-plan.md`
2. Check the Progress Log and git history
3. Run `pnpm check` to verify current state
4. Confirm with the human where to pick up
5. Ask for cadence preference
