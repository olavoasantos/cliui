---
name: create-error
description: Scaffold a new custom error class with the correct naming, optional tests, and docblocks
user-invocable: false
---

# Create Error

When creating a new custom error class in this project, follow these conventions exactly.

## File Placement

```
src/errors/
├── ValidationError.ts
└── specs/                        # Only if errors contain custom logic
    └── ValidationError.unit.ts
```

## Conventions

- **Naming**: PascalCase. Filename matches the error class name.
- **Export**: Single named export per file. No default exports.
- **Docblocks**: The error class must have JSDoc/TSDoc comments.
- **Tests**: Only required if the error class implements custom methods beyond the constructor.

## Checklist

1. Create `src/errors/<ErrorName>.ts` with a single named export
2. Add JSDoc/TSDoc to the class
3. If the error has custom logic, create `src/errors/specs/<ErrorName>.unit.ts`
4. Export from `src/index.ts` if the error is part of the public API
5. Run `pnpm run check` to verify
