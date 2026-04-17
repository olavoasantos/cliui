---
name: create-changeset
description: Create a changeset entry describing changes to workspace packages
user-invocable: true
---

# Create Changeset

Create a changeset entry for the current changes. This project uses [@changesets/cli](https://github.com/changesets/changesets) to manage versioning and changelogs.

## When to Create a Changeset

A changeset is required when changes affect the **public API or behavior** of any publishable package in `packages/*`. Changes to `apps/*`, `examples/*`, `local.pkg/*`, tests, or internal-only code do **not** need changesets.

## Rules

1. **One changeset per logical change.** If a single issue touches multiple packages, create one changeset that lists all affected packages.
2. **Version bump level:**
   - `patch` — Bug fixes, internal refactors that don't change the public API.
   - `minor` — New features, new exports, non-breaking additions.
   - `major` — Breaking changes to the public API (removed exports, changed signatures, renamed types).
3. **Description is for humans reading the changelog.** Write it from the consumer's perspective — what changed _for them_, not what you did internally.
4. **No issue IDs.** Never reference milestone or issue identifiers in changeset descriptions.
5. **No AI attribution.** No `Co-Authored-By` or similar.

## Process

1. Identify which `packages/*` packages have public-facing changes.
2. Run `pnpm changeset` and select the affected packages and bump level.
3. Edit the generated `.changeset/*.md` file with a clear, consumer-facing description.

## Description Examples

Good:

```
Add `useTheme` hook for runtime theme switching
```

```
Fix button focus ring not appearing in Firefox
```

```
Remove deprecated `variant` prop from Card — use `tone` instead
```

Bad:

```
M001I003T: Implement useTheme hook as specified in the design doc
```

```
Refactor internal signal wiring in ThingDataSource
```

(Internal refactor with no public API change — no changeset needed)
