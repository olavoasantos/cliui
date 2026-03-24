---
name: implement-milestone
description: Plan and orchestrate implementation of all issues in a milestone, with dependency-aware sequencing and optional parallel execution
user-invocable: true
---

# Implement Milestone

Orchestrate the implementation of all issues in a milestone from `docs/issues/`. This skill handles dependency resolution, task sequencing, progress tracking, and optional parallel execution for issues explicitly tagged as parallelizable.

## Input

The user provides a milestone number (e.g., `1`, `3`). The milestone file is `docs/issues/milestone-{n}.md`.

## Phase 1: Analyze

### Read all inputs

1. The milestone file (`docs/issues/milestone-{n}.md`) — read every issue
2. `docs/learn/architecture.md` — the design document
3. `CLAUDE.md` — project conventions
4. `docs/ROADMAP.md` — broader context
5. Existing milestone plan (`.ignore/plans/milestone-{n}-plan.md`) — if resuming

### Build the dependency graph

For each issue in the milestone:

1. Extract its **ID**, **title**, and **Dependencies** section
2. Classify dependencies as:
   - **Internal** — depends on another issue in this milestone
   - **External** — depends on an issue from a prior milestone (must already be complete)
   - **None** — no dependencies within the project
3. Check for **parallel hints** — issues tagged with `_Can run in parallel with XXXX._` in the milestone file

### Verify external dependencies

Check that external dependencies are actually implemented. Look for the code artifacts they were supposed to produce. If an external dependency is missing, flag it as a blocker before proceeding.

### Build the execution sequence

Order issues by resolving the dependency graph into a sequential list. Issues that share the same set of satisfied dependencies are grouped together. Within a group, use the issue order from the milestone file.

Only issues explicitly tagged with `_Can run in parallel with XXXX._` are candidates for parallel execution. All other issues run sequentially — do not infer parallelism from the dependency graph alone.

### Pre-flight checks

Run `pnpm check` to establish a baseline. Record results.

### Present the plan

Present to the human:

1. **Execution sequence** — the ordered list of issues with dependency justification
2. **Parallel pairs** — which issues are tagged for parallel execution
3. **External dependency status** — what is already complete, what is missing
4. **Risks** — complex integration points, large issues, potential blockers

**Gate: Do not proceed until the human approves the plan.**

## Phase 2: Persist the Plan

Write the approved plan to `.ignore/plans/milestone-{n}-plan.md`:

```markdown
# Milestone Plan: Milestone {n} — {Title}

## Pre-flight Baseline

[Results of pnpm check]

## Execution Sequence

| Order | Issue | Title | Dependencies | Parallel With | Status |
| ----- | ----- | ----- | ------------ | ------------- | ------ |
| 1     | ...   | ...   | ...          | —             | ...    |
| 2a    | ...   | ...   | ...          | 2b            | ...    |
| 2b    | ...   | ...   | ...          | 2a            | ...    |
| 3     | ...   | ...   | ...          | —             | ...    |

## External Dependencies

[Status of each external dependency — verified present or missing]

## Risks

[Identified risks and mitigation]

## Progress Log

[Updated during execution]
```

Use `a`/`b` suffixes (e.g., `2a`, `2b`) for parallel pairs sharing the same sequence slot.

## Phase 3: Execute

### Cadence

Ask the human how they want to work:

- **Issue-by-issue:** Pause after each issue for review before moving to the next.
- **Autonomous:** Execute the full sequence, pausing only on blockers or at natural checkpoints (after parallel merges, after groups of related issues).

### Sequential issues (default)

For each issue, follow the `implement-issue` skill workflow:

1. Understand the issue (read inputs, explore, ask questions if needed)
2. Plan the implementation
3. Implement with type-first TDD
4. Verify against Expected Outcomes
5. Clean up: `pnpm fix`, `pnpm check`, create changeset, commit

### Parallel issues (tagged pairs only)

When reaching issues tagged with `_Can run in parallel_`:

1. **Ensure main is clean.** Previous issues must be committed and `pnpm check` must pass.
2. **Spawn parallel agents.** For each issue in the parallel group, launch an agent with `isolation: "worktree"`. Each agent receives:
   - The full issue description
   - The project conventions (`CLAUDE.md`)
   - The design document
   - Instructions to follow the `implement-issue` workflow autonomously
   - Instructions to commit their work on their worktree branch
3. **Review results.** When agents complete, review each result:
   - Does the implementation satisfy the Expected Outcomes?
   - Does `pnpm check` pass?
   - Are there conflicts between the branches?
4. **Merge to main.** For each approved result:
   - Merge the branch into the main working branch
   - If merge conflicts arise, resolve them
   - Run `pnpm check` after each merge to verify integration
5. **Clean up.** After successful merge, the worktree branch is no longer needed. Delete the branch to keep the repository clean.

### Between issues

After completing each issue (or parallel group):

1. Update the milestone plan: mark the issue complete in the execution sequence, add a note to the Progress Log
2. If cadence is issue-by-issue, pause for approval
3. If autonomous, continue unless a blocker or checkpoint is reached

### Handling failures

- **Issue fails in a parallel group:** The other issue is not affected. Report the failure, merge the successful one, and decide with the human whether to retry or skip the failed issue.
- **Merge conflict:** Resolve manually. If the conflict is substantial, it means the parallel tag was optimistic — note this for the human.
- **Integration failure:** If `pnpm check` fails after merging, investigate which merge introduced the failure. Roll back that merge and fix before proceeding.
- **Sequential issue fails:** Follow the error handling tiers from the `implement-issue` skill. Do not skip to the next issue without resolving or getting human approval.

## Phase 4: Completion

After all issues are complete:

1. **Final quality gate.** Run `pnpm check` and compare against the pre-flight baseline.
2. **Milestone review.** Present a summary:
   - Per-issue status (complete, partial, skipped)
   - Total changesets created
   - Any TODO comments added for out-of-scope discoveries
   - Any convention suggestions that arose
   - Quality gate comparison (before vs. after)
3. **Update the milestone plan.** Mark as complete with a final summary in the Progress Log.

## Resuming an Interrupted Session

1. Read the milestone plan from `.ignore/plans/milestone-{n}-plan.md`
2. Check the Progress Log and git history
3. Run `pnpm check` to verify current state
4. Identify which issue to resume from
5. Confirm with the human before continuing
