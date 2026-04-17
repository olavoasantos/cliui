---
name: write-example
description: Write an example project that demonstrates package usage the way a real consumer would
user-invocable: true
---

# Write Example

Write an example project in `examples/` that demonstrates how to use `@ai.assistant/*` packages. Examples simulate a **real external consumer** — someone who installed the package from npm and is using it in their own project.

## The Core Rule

**Write the example as if you have never seen the source code.** You are a user who ran `pnpm install @ai.assistant/some-package` and is reading the public API docs. You do not know about internal file paths, unexported helpers, or implementation details. If something isn't exported from the package's public API, it does not exist to you.

## Rules

### Imports

- **Only import from the package scope.** Use `import {Button} from '@ai.assistant/ui'`, never `import {Button} from '../../packages/ui/src/components/Button/component'`.
- **Only import exported symbols.** If it's not re-exported from `src/index.ts`, you cannot use it. If you find yourself needing something that isn't exported, the package's public API has a gap — flag it, don't work around it.
- **Use subpath exports when available.** If the package exports `@ai.assistant/ui/button`, import from there, not the root.
- **No reaching into `src/`, `dist/`, or internal paths.** Ever.

### Setup

- **Scaffold first.** Always use `pnpm scaffold example <name>` to create the example project. Never create it manually.
- **Install packages as dependencies.** Add `@ai.assistant/*` packages to the example's `dependencies` in `package.json` using `workspace:*`. This is the monorepo equivalent of `pnpm install @ai.assistant/some-package`.
- **No manual configuration beyond what a real user would do.** If the package requires setup (e.g. a Vite plugin, a Preact config), include only what the package's documentation tells users to do.

### Content

- **One concept per example.** Each example demonstrates a single use case or feature. Don't combine unrelated features into one example.
- **Minimal code.** Only the code needed to demonstrate the concept. No extra abstractions, no utility wrappers, no elaborate file structures.
- **Working out of the box.** Running `pnpm dev` in the example directory must work. No missing steps, no broken imports, no placeholder code.
- **README explains the point.** The README should say what this example demonstrates, how to run it, and what the user should observe.

### What NOT to Do

- **No relative imports** to other workspace packages. If you write `../` to reach a package, it's wrong.
- **No importing from internal paths.** `@ai.assistant/ui/src/components/Button/component` is wrong. `@ai.assistant/ui` is right.
- **No mocking, stubbing, or polyfilling.** If the example needs a mock to work, the package has a problem — flag it.
- **No test infrastructure.** Examples are not test suites. They demonstrate usage for humans.
- **No build pipeline complexity.** Keep `vite.config.ts` minimal. If the package requires complex build setup from consumers, that's a package problem worth flagging.
- **No copying source code.** Don't copy types, utilities, or components from the package into the example. Import them.

## Process

1. **Scaffold.** Run `pnpm scaffold example <name> --description "<what it demonstrates>"`.
2. **Add dependencies.** Add the `@ai.assistant/*` packages being demonstrated to the example's `package.json` dependencies.
3. **Write the example.** Import only from the public API. Write the minimum code to demonstrate the concept.
4. **Test it.** Run `pnpm install` then `pnpm dev` from the example directory. It must work.
5. **Write the README.** Explain what it demonstrates, how to run it, and what to look for.
6. **Review imports.** Before considering it done, check every import statement. If any import uses a relative path to another workspace package or reaches into a `src/` directory, fix it.

## Example README Structure

````markdown
# Example: [What it demonstrates]

[One or two sentences about what this example shows.]

## Running

```bash
pnpm install
pnpm dev
```

## What to Look For

[What the user should observe when running the example — what appears on screen, what behavior to test, etc.]

## Packages Used

- `@ai.assistant/some-package` — [brief note on what's used from it]
````

## Import Self-Check

Before completing an example, run this mental checklist on every import:

- [ ] Does the import start with `@ai.assistant/`? If not, it's wrong (unless it's a third-party package or Node built-in).
- [ ] Is the imported symbol actually exported from the package's `src/index.ts`? If not, either the package needs to export it or you need a different approach.
- [ ] Does the import path have more than one segment after the package name (e.g. `@ai.assistant/ui/src/internal/thing`)? If so, it's probably reaching into internals — use the root or documented subpath export instead.
