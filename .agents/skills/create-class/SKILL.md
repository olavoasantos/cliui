---
name: create-class
description: Scaffold a new class with the correct file structure, naming, tests, and docblocks
user-invocable: false
---

# Create Class

When creating a new class in this project, follow these conventions exactly.

## File Placement

```
src/classes/
├── MyClass.ts          # PascalCase filename matching class name
└── specs/
    └── MyClass.unit.ts # Colocated unit test
```

## Conventions

- **Naming**: PascalCase. Filename must match the class name.
- **Export**: Single named export per file. No default exports.
- **Docblocks**: Every public method and the class itself must have JSDoc/TSDoc comments.
- **Tests**: Every class must have a corresponding `*.unit.ts` file in a `specs/` sibling folder.

## Checklist

1. Create `src/classes/<ClassName>.ts` with a single named export
2. Add JSDoc/TSDoc to the class and all public members
3. Create `src/classes/specs/<ClassName>.unit.ts` with unit tests
4. Export from `src/index.ts` if the class is part of the public API
5. If the class provides services or configuration, register types in `src/register.d.ts`
6. Run `pnpm run check` to verify
