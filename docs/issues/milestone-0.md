# Milestone 0: Project Setup — Issues

## Working Summary

Phase 0 prepares the repository for implementation. The project was initialized from a template that includes artifacts not needed by this library (Playwright config, e2e scripts). These need to be removed. The source directory skeleton defined in the architecture document needs to be created so that Phase 1 contributors can immediately place code in the correct locations.

**Key context:**

- `src/index.ts` already exists and should be preserved — it will evolve as the library is implemented.
- `.config/scripts/generate-reference-docs.ts` is a template artifact but is intentionally left in place; it will be refactored in Phase 6 (Documentation) to generate reference docs from this codebase.
- The directory structure follows the architecture document's source structure section. It may be extended during implementation, but the initial skeleton should match what the architecture doc specifies.
- `pnpm run build` should succeed after both tasks. `pnpm run check` should be clean aside from possible test-related failures (no test files exist yet).

---

## Issues

### M0T1: Remove Playwright and template artifacts

**Summary**

The project was scaffolded from a template that includes Playwright for browser e2e testing, which is not applicable to a terminal UI library. Remove these artifacts to keep the project clean and avoid confusion for contributors. Leave `src/index.ts` (already useful) and `.config/scripts/generate-reference-docs.ts` (to be refactored in Phase 6) in place.

**Expected Outcomes**

- `playwright.config.ts` is removed from the project root
- The Playwright dependency is removed from `package.json`
- The e2e test script referencing Playwright is removed from `package.json`
- Any composite test scripts that reference the e2e script (e.g., `test:check`) are updated to remove the e2e reference so they continue to work
- No other existing scripts, dependencies, or configuration files are inadvertently removed
- `pnpm install` completes without errors
- `pnpm run build` succeeds

**Acceptance Criteria**

- No references to Playwright remain in `package.json` or any config file
- The lockfile (`pnpm-lock.yaml`) is regenerated cleanly after dependency removal
- Existing build and type-check scripts continue to work

---

### M0T2: Create source directory structure

**Summary**

Establish the module directory skeleton defined in the architecture document so that Phase 1 implementation tasks can place files in their correct locations immediately. Each module directory gets the conventional subdirectories appropriate to its role and a barrel `index.ts` file to serve as the module's public entry point.

**Expected Outcomes**

- The following module directories exist under `src/`, each with a barrel `index.ts` file:
  - `src/dom/` — with `classes/`, `constants/`, `types/`, `utilities/` subdirectories
  - `src/css/` — with `classes/`, `types/` subdirectories
  - `src/layout/` — with `classes/`, `types/`, `utilities/` subdirectories
  - `src/renderer/` — with `classes/`, `constants/`, `types/` subdirectories
  - `src/terminal/` — with `classes/`, `types/` subdirectories
  - `src/classes/` — for top-level classes (e.g., the `Terminal` class added in Phase 1)
- `pnpm run build` succeeds
- `pnpm run check` is clean (aside from possible test-related warnings due to no test files existing yet)

**Dependencies**

- M0T1: Template artifacts should be cleaned up before establishing the project's real structure, so the build pipeline is known-clean before adding new files.

---
