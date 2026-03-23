---
name: create-utility
description: Scaffold a new utility function with the correct naming, tests, and docblocks
user-invocable: false
---

# Create Utility

When creating a new utility function in this project, follow these conventions exactly.

## File Placement

```
src/utilities/
├── formatDate.ts
└── specs/
    └── formatDate.unit.ts
```

## Conventions

- **Naming**: camelCase. Filename matches the function name.
- **Export**: Single named export per file. No default exports.
- **Docblocks**: The function must have JSDoc/TSDoc comments.
- **Tests**: Every utility must have a corresponding `*.unit.ts` file.

## Checklist

1. Create `src/utilities/<functionName>.ts` with a single named export
2. Add JSDoc/TSDoc to the function
3. Create `src/utilities/specs/<functionName>.unit.ts` with unit tests
4. Export from `src/index.ts` if the utility is part of the public API
5. Run `pnpm run check` to verify
