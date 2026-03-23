---
name: commit
description: Create a git commit following this project's commit message conventions
disable-model-invocation: true
---

# Commit

Create a git commit following these conventions.

## Rules

- **No conventional commit prefixes.** Do not use `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, etc.
- **No AI attribution.** Never include `Co-Authored-By` or any other AI attribution lines.
- **Start with a verb in imperative mood.** E.g., "Add search to the sidebar", not "Added search" or "Adds search".
- **First line under 72 characters.** This is the subject line.
- **Focus on the "why", not the "what".** The diff shows what changed — the message should explain why.
- **Use a blank line before the body** if additional context is needed. Body lines should wrap at 72 characters.
- **No trailing period** on the subject line.

## Examples

```
Add workspace setup for examples

Examples are treated as workspace packages so they can consume
the library via pnpm link, simulating a real install.
```

```
Remove legacy auth middleware

Legal flagged the session token storage as non-compliant.
```

```
Speed up test suite by parallelizing integration tests
```
