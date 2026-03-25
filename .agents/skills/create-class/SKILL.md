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
- **Class-file scope**: A class file must define the class only. Do not colocate unrelated utilities, constants, guards, helper exports, or domain types in the same file.
- **Helpers**: If the class needs reusable helpers, place them in the correct sibling layer instead of inside the class file:
  - utilities in `utilities/`
  - constants in `constants/`
  - guards in `guards/`
  - types/interfaces in `types/`
- **No extra exports**: Do not export non-class symbols from a class file.
- **Docblocks**: Every public method and the class itself must have JSDoc/TSDoc comments.
- **Tests**: Every class must have a corresponding `*.unit.ts` file in a `specs/` sibling folder.

## Checklist

1. Create `src/classes/<ClassName>.ts` with a single named class export
2. Verify the file does not also introduce helper utilities, constants, guards, or extra exported symbols
3. Add JSDoc/TSDoc to the class and all public members
4. Create `src/classes/specs/<ClassName>.unit.ts` with unit tests for the class itself
5. If reusable helpers are needed, create separate files in the correct layer
6. Export from `src/index.ts` if the class is part of the public API
7. If the class provides services or configuration, register types in `src/register.d.ts`
8. Run `pnpm run check` to verify
