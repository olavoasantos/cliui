---
name: create-hook
description: Scaffold a new UI hook with the correct naming, tests, and docblocks
user-invocable: false
---

# Create Hook

When creating a new UI hook in this project, follow these conventions exactly.

## File Placement

```
src/ui-hooks/
├── useMyHook.ts
└── specs/
    └── useMyHook.unit.tsx
```

## Conventions

- **Naming**: camelCase with `use` prefix. Filename matches the hook name.
- **Export**: Single named export per file. No default exports.
- **Docblocks**: The hook and its parameters/return type must have JSDoc/TSDoc comments.
- **Tests**: Every hook must have a corresponding `*.unit.tsx` file.

## Checklist

1. Create `src/ui-hooks/use<HookName>.ts` with a single named export
2. Add JSDoc/TSDoc to the hook function
3. Create `src/ui-hooks/specs/use<HookName>.unit.tsx` with unit tests
4. Export from `src/index.ts` if the hook is part of the public API
5. Run `pnpm run check` to verify
