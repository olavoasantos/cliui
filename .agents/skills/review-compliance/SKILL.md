---
name: review-compliance
description: Audit code against repo conventions and optionally fix violations
user-invocable: true
---

# Review Compliance

Audit source code against this project's conventions defined in `AGENTS.md`. Can be run in **report mode** (check and report only) or **fix mode** (check and fix violations).

## Input

The user specifies:

- **Scope:** Specific files, directories, packages, or `all` for the full repo.
- **Mode:** `report` (default) or `fix`.

If no scope is specified, audit all files changed since the last commit (`git diff --name-only HEAD`). If there are no changes, audit all tracked files.

## Checklist

### File Placement & Naming

- [ ] Classes are in `classes/` with `PascalCase` filenames matching the class name.
- [ ] Utilities are in `utilities/` with `camelCase` filenames matching the function name.
- [ ] Guards are in `guards/` with `PascalCase` + `Guard` suffix.
- [ ] Errors are in `errors/` with `PascalCase` filenames.
- [ ] Services are in `services/` with `PascalCase` + `Service` suffix.
- [ ] Data sources are in `data-sources/` with `PascalCase` + `DataSource` suffix.
- [ ] Hooks are in `hooks/` with `camelCase` + `use` prefix.
- [ ] Primitives, components, blocks, and layouts are in their respective directories.
- [ ] Component folders use `component.tsx` as the entry file (not `index.tsx`).
- [ ] Component styles are in `styles.css`, types in `types.ts`.
- [ ] No directory nesting beyond one level (typically `specs/`).
- [ ] New workspace entries were created via `pnpm scaffold` — check for expected config files (`.prettierrc.mjs`, `oxlint.json`, `tsconfig.json`, vitest configs, branded README).
- [ ] Example projects import only from `@ai.assistant/*` scope — no relative imports to other workspace packages, no reaching into `src/` or `dist/` paths.

### One Concern Per File

- [ ] Class files define only the class — no colocated utilities, constants, guards, or extra exports.
- [ ] **Utility files contain exactly one function declaration** — no unexported helpers, no private functions, no companion utilities. If a function needs a helper, the helper gets its own file. Check with `grep -c "^function \|^export function " <file>` — the count must be 1.
- [ ] **Avoid inner/closure function declarations in utilities.** Inner functions should be extracted to their own utility file.
- [ ] **No constant declarations in utility files, class files, or guard files.** Constants belong in `constants/`. Check with `grep -c "^const \|^export const " <file>` on non-constant files — the count must be 0.
- [ ] **No circular dependencies between utility files.** If two utilities import each other, refactor to break the cycle.
- [ ] Guard files contain exactly one guard.
- [ ] Error files contain exactly one error class.
- [ ] Runtime type-narrowing predicates (`isThing`, `hasThing`) are in guard files, not utility files.

### Exports

- [ ] All exports are named exports. No default exports.
- [ ] Public exports are re-exported from `src/index.ts`.

### Imports

- [ ] No duplicate import statements from the same module. Use inline `type` qualifiers (`import {type Foo, bar}`) to consolidate type and value imports from the same path.
- [ ] No `/index` in import paths.
- [ ] No file extensions in import paths.
- [ ] No inline `import('...')` type references. All type imports use `import type` or inline `type` qualifier.

### Types & Guards

- [ ] Types are defined explicitly in TypeScript, not inferred from runtime objects (no `z.infer`).
- [ ] No type inference from runtime values — no `keyof typeof`, `(typeof X)[number]`, or `as const` used to generate types from data. Types are the source of truth; constants are typed against them.
- [ ] Guard files do not export inferred types.
- [ ] Types live in `types/` — not inline in utility, class, or any other non-types file.
- [ ] `register.d.ts` files are present when a module provides services, environment variables, configurations, or type registrations.
- [ ] `register.d.ts` is exposed as `./register` submodule in `package.json` exports.
- [ ] Build script copies `src/register.d.ts` to `dist/register.d.ts`.

### TypeScript Style

- [ ] No `T` prefix on generic parameter names. Use descriptive names (`Details`, `Handler`, `ApiType`).
- [ ] No `Impl` suffix on class names.
- [ ] All exported generics have `@template` docblock tags.
- [ ] No commented-out code — not even "reserved for future" placeholders.
- [ ] No `console.*` usage in library code (outside the logger package’s own fallback path).

### Testing

- [ ] Every class, service, hook, utility, and data source has a corresponding test file in `specs/`.
- [ ] Test files map 1:1 to production files (no grouped specs).
- [ ] Test files use the correct suffix (`.unit.ts`, `.integration.ts`, `.bench.ts`, `.e2e.ts`).
- [ ] Test files are in `specs/` colocated with the code they test.

### Documentation

- [ ] All public exports have JSDoc/TSDoc comments.

### Code Artifacts

- [ ] No issue/milestone IDs in docblocks, comments, commit messages, or changeset descriptions.
- [ ] No AI attribution comments.
- [ ] No debug logging or `console.log` left behind.
- [ ] No commented-out code or "reserved for future" placeholders.

## Process

### Report Mode

1. Read `AGENTS.md` from disk.
2. Identify files in scope.
3. Run through the checklist for each file.
4. Present a structured report:
   - **Violations** grouped by category (file placement, imports, exports, etc.).
   - **File path** and **line number** for each violation.
   - **Severity**: `error` (must fix) or `warning` (should fix).
   - **Summary** with counts per category.
5. If no violations are found, report "All files compliant."

### Fix Mode

1. Follow the report mode process first to identify all violations.
2. Present the report and ask for confirmation before fixing.
3. Fix violations that can be automated:
   - Consolidate duplicate imports.
   - Remove `/index` from import paths.
   - Remove file extensions from imports.
   - Convert default exports to named exports.
   - Move inline `import()` type references to top-level `import type` statements.
   - Remove debug logging and commented-out code.
   - Remove issue IDs from comments and docblocks.
4. Flag violations that require manual intervention:
   - Files in the wrong directory.
   - Multiple concerns in one file (requires splitting).
   - Missing tests (requires writing).
   - Missing docblocks (requires writing).
5. Run `pnpm run check` after fixes to verify nothing broke.
