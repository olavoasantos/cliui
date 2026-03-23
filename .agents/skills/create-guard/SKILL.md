---
name: create-guard
description: Scaffold a new runtime type guard with the correct naming and docblocks
user-invocable: false
---

# Create Guard

When creating a new runtime type guard in this project, follow these conventions exactly.

## File Placement

```
src/guards/
├── ThingGuard.ts
└── ConfigGuard.ts
```

## Conventions

- **Naming**: PascalCase with `Guard` suffix.
- **Export**: Single named export per file. No default exports.
- **Type inference**: Guards implement runtime validation only. Never expose inferred type guard types. Types are defined in TypeScript, not derived from guards (e.g. never use `z.infer`).
- **Docblocks**: The guard must have JSDoc/TSDoc comments.

## Checklist

1. Create `src/guards/<Name>Guard.ts` with a single named export
2. Add JSDoc/TSDoc to the guard
3. Ensure no types are inferred from the guard — types must be defined separately in `src/types/`
4. Export from `src/index.ts` if the guard is part of the public API
5. Run `pnpm run check` to verify
