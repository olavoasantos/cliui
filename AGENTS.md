# AGENTS.md

This document defines the core conventions and contribution guidelines for this project. All AI agents and human contributors should follow these conventions strictly.

Detailed scaffolding recipes for each code type (classes, components, data sources, services, hooks, utilities, errors, guards) are defined as skills. The agent will automatically use the appropriate `create-*` skill when scaffolding new code, and the `write-tests` / `write-docs` skills when writing tests or documentation.

---

## Key Conventions

| Element           | Naming                             | Export style | Notes                                                      |
| ----------------- | ---------------------------------- | ------------ | ---------------------------------------------------------- |
| Classes           | `PascalCase`                       | Named export | Filename matches class name                                |
| Components        | `PascalCase`                       | Named export | Folder per component, entry file is `component.tsx`        |
| Constants         | `MACRO_CASE`                       | Named export | Grouped by concern if folder                               |
| Context providers | `PascalCase`                       | Named export | Minimize usage                                             |
| Data sources      | `PascalCase` + `DataSource` suffix | Named export | File or folder depending on migrations                     |
| Errors            | `PascalCase`                       | Named export | One per file                                               |
| Guards            | `PascalCase` + `Guard` suffix      | Named export | Wraps type guards; never exposes inferred type guard types |
| Hooks             | `camelCase` + `use` prefix         | Named export | Standard UI hook conventions                               |
| Services          | `PascalCase` + `Service` suffix    | Named export | Mediates data source mutations                             |
| Utilities         | `camelCase`                        | Named export | One function per file                                      |

### Entry Points

- **`src/index.ts`**: Main exports. Must be environment-agnostic.
- **`src/index.css`**: Central stylesheet for the module's critical styles (if applicable).
- **`src/register.d.ts`**: Global type declarations. Extends global namespaces, declares services, environment variables, and configurations the module provides.

### Nesting Rules

**No deep nesting.** Each directory supports at most one level of subdirectory (typically `specs/` or an asset-type grouping). Do not create nested folder hierarchies.

---

## Agent Contribution Guidelines

When contributing to this project, AI agents must:

0. **Run pre-flight checks.** Before starting to work and after completing tasks, run `pnpm run check` to ensure code quality, formatting, and type safety.

1. **Follow the file structure exactly.** Place files in the correct directory with the correct naming convention. One export per file for classes, utilities, hooks, errors, and guards. Use the appropriate `create-*` skill when scaffolding new code.

2. **Never use type guards for type inference.** Types are defined in TypeScript. Type guards (e.g. Zod schemas) implement runtime validation only and must not leak into the type system via `z.infer`.

3. **Keep layers separate.** UI code must not contain business logic. Data layer code must not import from UI-specific modules (components, hooks, context providers).

4. **Signals are read-only in the UI.** UI components receive computed/read-only signals. Mutations go through services, event handlers, or tool/intent invocations.

5. **Write tests.** Every new class, service, utility, hook, and data source needs unit tests. Follow the naming conventions for test files.

6. **Write docblocks.** Every public export needs JSDoc/TSDoc documentation. Reference docs are generated from these.

7. **Use named exports.** Default exports are not used in this project unless absolutely necessary.

8. **Minimize context providers.** The application has its own context mechanisms (service container, configuration, environment). UI context providers should only be used when there is no alternative.

9. **Register types in `register.d.ts`.** When a module provides services, environment variables, or configurations, declare them in the module's `register.d.ts` via global namespace extension.

10. **No deep nesting.** Module subdirectories support at most one level of nesting (typically `specs/` or asset-type grouping).

11. **Commit messages.** No conventional commit prefixes (`feat:`, `fix:`, `docs:`, etc.). No AI attribution. Use imperative mood, keep the subject under 72 characters, and focus on the "why". Use the `commit` skill when committing.
