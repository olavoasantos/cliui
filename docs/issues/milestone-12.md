# Milestone 12: Monorepo Migration — Issues

## Working Summary

Phase 12 migrates the codebase from a single `@cliui/terminal` package into a `@cliui/*` monorepo with distinct packages that follow the architecture's natural boundaries. This is structural infrastructure work — all existing code and tests must continue to work, just organized across packages instead of one.

**Package structure:**

```
@cliui/dom           ← standalone DOM polyfill (Window, Document, Element, Event,
                       Performance, MutationObserver, etc.)
@cliui/terminal      ← the engine (CSS + Layout + Renderer + Terminal I/O + Terminal class)
                       depends on @cliui/dom, re-exports DOM types for convenience
@cliui/elements      ← all component tiers (HTML elements, primitives, styled)
                       depends on @cliui/terminal
@cliui/devtools      ← CDP bridge (M8 — scaffolded, implemented later)
                       peer depends on @cliui/terminal
@cliui/vite-plugin   ← Vite integration (M10 — scaffolded, implemented later)
                       peer depends on @cliui/terminal
```

**Workspace layout:**

```
cliui/                          ← workspace root
├── packages/
│   ├── dom/                    ← @cliui/dom
│   │   ├── src/                  (current src/dom/)
│   │   ├── package.json
│   │   ├── vite.config.ts        (extends shared base)
│   │   └── tsconfig.json         (extends shared base)
│   ├── terminal/               ← @cliui/terminal
│   │   ├── src/                  (current src/css/, src/layout/, src/renderer/,
│   │   │                          src/terminal/, src/classes/, src/utilities/, src/types/)
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   └── tsconfig.json
│   ├── elements/               ← @cliui/elements
│   │   ├── src/                  (current src/components/)
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   └── tsconfig.json
│   ├── devtools/               ← @cliui/devtools (scaffold only)
│   │   ├── src/
│   │   └── package.json
│   └── vite-plugin/            ← @cliui/vite-plugin (scaffold only)
│       ├── src/
│       └── package.json
├── examples/                   ← updated to use @cliui/* imports
├── docs/
├── .config/                    ← shared configs (vitest, oxlint, etc.)
├── package.json                ← workspace root
├── pnpm-workspace.yaml
└── turbo.json                  ← optional build orchestration
```

**Key context and design decisions:**

- **The DOM polyfill is genuinely standalone.** `@cliui/dom` has no internal dependencies. It's a complete DOM implementation for Node.js — usable by testing tools, SSR engines, or non-terminal renderers independently.
- **The engine layers move together.** CSS, Layout, Renderer, and Terminal I/O are a tightly coupled pipeline — a style engine change ripples through layout, rendering, and output. They belong in one package (`@cliui/terminal`) to avoid version coordination overhead.
- **`@cliui/terminal` re-exports `@cliui/dom`.** Most users interact with both DOM and engine APIs. Re-exporting means `import { Terminal, Document, Element } from '@cliui/terminal'` works without a separate `@cliui/dom` import. Users who only need the DOM polyfill import from `@cliui/dom` directly.
- **Subpath exports for advanced access.** `@cliui/terminal` exposes the engine's sub-modules via package.json `exports`: `@cliui/terminal/css`, `@cliui/terminal/layout`, `@cliui/terminal/renderer`. Most users never need these — they're for advanced use cases like the DevTools bridge.
- **`@cliui/elements` depends on `@cliui/terminal`.** Components use `cellWidth` from layout, DOM types, and CSS types. After M11 (component taxonomy), registration helpers are the primary public API.
- **Scaffolded packages for future milestones.** `@cliui/devtools` (M8) and `@cliui/vite-plugin` (M10) get empty package shells with correct dependency declarations. Actual implementation happens in their milestones.
- **pnpm workspaces with workspace protocol.** Internal dependencies use `"@cliui/dom": "workspace:*"` for linked development. Published packages resolve to real versions.
- **Shared config files.** Base Vite, TypeScript, and vitest configs live in `.config/` at the workspace root. Each package extends them. This avoids config duplication while allowing per-package overrides.
- **Examples are updated.** The existing examples (`basic`, `preact`, `react`, `solid`, `svelte`, `vanilla`, `vue`) update their imports from `@cliui/terminal` to `@cliui/terminal` and `@cliui/elements`.
- **The `polyfillEnvironment` side-effect import moves to `@cliui/terminal`.** The current main entry (`src/index.ts`) auto-polyfills globals. This behavior stays as `@cliui/terminal`'s default export, with `@cliui/terminal/core` as the side-effect-free alternative (matching the current `@cliui/terminal/core` pattern).
- **Performance benchmarks stay with their packages.** `*.bench.ts` files move alongside the source they benchmark. The root `pnpm test:performance:record` and `pnpm test:performance:compare` aggregate across packages.

**Execution order:**

This milestone executes after M0–M5 (core implementation) and before M7–M11 (features and restructuring). Doing structural migration first means feature milestones work with clean package boundaries from the start. M11 (component taxonomy rename) is particularly easier when components are already isolated in `@cliui/elements`.

---

## Issues

### M12T1: Monorepo workspace setup

**Summary**

Initialize the monorepo structure: create package directories, set up pnpm workspace configuration, and scaffold all packages with their `package.json` files. This establishes the workspace before any code is moved.

**Expected Outcomes**

- `pnpm-workspace.yaml` is updated to include `packages/*` alongside `examples/*`
- Package directories created: `packages/dom/`, `packages/terminal/`, `packages/elements/`, `packages/devtools/`, `packages/vite-plugin/`
- Each package has a `package.json` with: correct `name` (`@cliui/dom`, `@cliui/terminal`, etc.), `version`, `type: "module"`, `exports` field, `dependencies`/`peerDependencies` declarations using `workspace:*` protocol
- `@cliui/dom` — no internal dependencies
- `@cliui/terminal` — depends on `@cliui/dom`
- `@cliui/elements` — depends on `@cliui/terminal`
- `@cliui/devtools` — peer depends on `@cliui/terminal` (scaffold only, empty `src/`)
- `@cliui/vite-plugin` — peer depends on `@cliui/terminal` (scaffold only, empty `src/`)
- `pnpm install` completes successfully with the workspace linking

**Dependencies**

- None (first task)

---

### M12T2: Shared build and test configuration

**Summary**

Set up shared base configurations that all packages extend. This avoids duplicating Vite, TypeScript, and vitest config across packages while allowing per-package overrides.

**Expected Outcomes**

- A base `tsconfig.json` in the workspace root (or `.config/`) with shared compiler options — packages extend it with their own `include`/`exclude` and path mappings
- A base Vite config (`.config/vite.base.ts` or similar) with shared build settings (sourcemaps, library mode, DTS plugin, rollup externals for `@cliui/*`) — packages extend with their own entry points
- Base vitest configs for unit, integration, and bench tests — packages extend with their own include patterns
- Each package has a `vite.config.ts`, `tsconfig.json`, and inherits vitest configs
- A package can override any shared setting (e.g., `@cliui/dom` has no external `@cliui/*` dependencies to externalize)
- `pnpm run build` from a package directory builds that package
- `pnpm run test:unit` from a package directory runs that package's tests

**Dependencies**

- M12T1: Workspace structure (package directories must exist)

---

### M12T3: Extract @cliui/dom

**Summary**

Move `src/dom/` into `packages/dom/src/`. This is the first extraction and sets the pattern for subsequent ones. The DOM package has no internal dependencies — all imports are self-contained.

**Expected Outcomes**

- All files from `src/dom/` are moved to `packages/dom/src/`
- The package's `src/index.ts` exports the public DOM API (same as current `src/dom/index.ts`)
- Internal imports within the package are updated (relative paths adjusted for new directory structure)
- No `@cliui/*` imports within this package — it is self-contained
- `@cliui/dom` builds successfully: `cd packages/dom && pnpm build`
- All DOM unit tests pass: `cd packages/dom && pnpm test:unit`
- All DOM benchmarks pass: `cd packages/dom && pnpm test:performance`
- The remaining code in `src/` that imports from `./dom` or `../dom` is temporarily updated to import from `@cliui/dom` (workspace link) — these files move in M12T4
- Type declarations are generated correctly

**Dependencies**

- M12T2: Shared configs (build/test configs must be ready)

---

### M12T4: Extract @cliui/terminal

**Summary**

Move the engine layers into `packages/terminal/src/`. This includes CSS, Layout, Renderer, Terminal I/O, the Terminal class, shared utilities, and shared types. The package depends on `@cliui/dom` and re-exports its types.

**Expected Outcomes**

- The following directories move to `packages/terminal/src/`:
  - `src/css/` → `packages/terminal/src/css/`
  - `src/layout/` → `packages/terminal/src/layout/`
  - `src/renderer/` → `packages/terminal/src/renderer/`
  - `src/terminal/` → `packages/terminal/src/terminal/`
  - `src/classes/` → `packages/terminal/src/classes/`
  - `src/utilities/` → `packages/terminal/src/utilities/`
  - `src/types/` → `packages/terminal/src/types/`
  - `src/constants/` → `packages/terminal/src/constants/`
- All imports from `../dom` or `../../dom` are updated to `@cliui/dom`
- The package's `src/index.ts` exports the `Terminal` class and re-exports key DOM types (`Document`, `Element`, `Window`, `Event`, `KeyboardEvent`, `MouseEvent`, `ClipboardEvent`, etc.) for user convenience
- `src/core.ts` is replicated as a side-effect-free entry point
- Subpath exports are configured in `package.json`: `@cliui/terminal/css`, `@cliui/terminal/layout`, `@cliui/terminal/renderer` for advanced access
- The `polyfillEnvironment` side-effect behavior is preserved in the default entry point
- `@cliui/terminal` builds successfully
- All CSS, layout, renderer, terminal, and Terminal class tests pass
- All benchmarks pass
- Type declarations are generated correctly, including re-exported DOM types

**Dependencies**

- M12T3: `@cliui/dom` must be extracted (this package imports from it)

---

### M12T5: Extract @cliui/elements

**Summary**

Move `src/components/` into `packages/elements/src/`. The elements package depends on `@cliui/terminal` (for DOM types, layout utilities like `cellWidth`, and CSS types).

**Expected Outcomes**

- All files from `src/components/` move to `packages/elements/src/`
- All imports from `../../dom`, `../../layout`, `../../css`, `../../terminal` are updated to `@cliui/terminal` (or `@cliui/dom` where appropriate)
- The package's `src/index.ts` exports all component classes (same as current `src/components/index.ts`)
- `@cliui/elements` builds successfully
- All component unit and integration tests pass
- All component benchmarks pass (if any)
- The `src/` directory at the workspace root is now empty (or contains only workspace-level files) — all source code lives in `packages/`

**Dependencies**

- M12T4: `@cliui/terminal` must be extracted (this package imports from it)

---

### M12T6: Workspace scripts and quality gates

**Summary**

Set up root-level workspace scripts that run across all packages. The `pnpm check` command must verify the entire monorepo, and individual packages must be independently buildable and testable.

**Expected Outcomes**

- Root `package.json` scripts:
  - `pnpm build` — builds all packages in dependency order
  - `pnpm check` — runs build, type check, lint, and tests across all packages
  - `pnpm fix` — runs auto-fix across all packages
  - `pnpm test:unit` — runs unit tests across all packages
  - `pnpm test:integration` — runs integration tests across all packages
  - `pnpm test:performance` — runs benchmarks across all packages
  - `pnpm test:performance:record` — records benchmark baselines across all packages
  - `pnpm test:performance:compare` — compares against baselines across all packages
- Build order respects the dependency graph: `@cliui/dom` → `@cliui/terminal` → `@cliui/elements`
- Each package can independently: `cd packages/dom && pnpm build && pnpm test:unit`
- `pnpm check` from the workspace root passes — the full quality gate works
- Consider `turbo.json` for build caching and parallel execution (optional — pnpm's `--filter` and `run-p` may suffice)

**Dependencies**

- M12T3–M12T5: All package extractions must be complete

---

### M12T7: Update examples

**Summary**

Update all existing example applications to use `@cliui/*` imports instead of `@cliui/terminal`. Each example should work with the monorepo's workspace linking.

**Expected Outcomes**

- All examples (`basic`, `preact`, `react`, `solid`, `svelte`, `vanilla`, `vue`) update their `package.json` dependencies from `@cliui/terminal` to `@cliui/terminal` and `@cliui/elements`
- All source imports in examples are updated: `@cliui/terminal` → `@cliui/terminal`, `@cliui/terminal/components` → `@cliui/elements`
- Each example builds and runs correctly with workspace-linked packages
- Example `pnpm-workspace.yaml` references are maintained

**Dependencies**

- M12T5: All packages extracted (examples need to import from them)

---

### M12T8: Publishing and versioning configuration

**Summary**

Configure the monorepo for npm publishing with independent package versioning. Set up changesets for coordinated releases.

**Expected Outcomes**

- Changesets configuration (`.changeset/config.json`) is set up for the monorepo with independent versioning per package
- Each package's `package.json` has correct: `publishConfig` (registry, access), `files` (dist only), `main`, `module`, `types` fields
- `pnpm version:bump` (or equivalent) creates changesets that track which packages changed
- `pnpm publish` publishes changed packages with correct versions and resolved `workspace:*` dependencies (pnpm replaces `workspace:*` with real versions on publish)
- `.npmrc` or workspace config ensures the `@cliui` scope is configured for the target registry
- A dry-run publish is verified for at least one package

**Dependencies**

- M12T6: Workspace scripts (build must work before publish)

---

### M12T9: Update documentation and conventions

**Summary**

Update all documentation, conventions, and project references to reflect the `@cliui/*` monorepo structure. This includes code examples, import paths, architecture references, and the agent contribution guidelines.

**Expected Outcomes**

- `AGENTS.md` (now `CLAUDE.md` per convention) is updated: file paths reference `packages/` structure, import examples use `@cliui/*`
- `docs/learn/architecture.md` — source structure section updated to reflect the monorepo layout and package boundaries
- `docs/ROADMAP.md` — any references to `@cliui/terminal` updated to `@cliui/*`
- All milestone files in `docs/issues/` — import examples and package references updated
- `README.md` — installation and usage examples updated
- Skill files (`.agents/skills/`) — any file path references updated for the monorepo structure
- `register.d.ts` — global type declarations updated if namespace changes
- No stale references to `@cliui/terminal` remain in documentation (except historical context)

**Dependencies**

- M12T7: Examples updated (docs should reference working examples)

---
