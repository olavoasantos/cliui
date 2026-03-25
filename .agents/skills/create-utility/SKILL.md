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
- **One utility per file**: A utility file must contain exactly one utility export.
- **No mixed concerns**: Utility files must not define unrelated constants, guards, classes, or extra utilities.
- **Guard separation**: If a runtime predicate narrows a type, it belongs in a guard file, not a utility file.
- **Constants/types separation**: If a utility needs shared constants or types, place them in `constants/` or `types/`, not in the utility file unless they are strictly local and unexported implementation details.
- **Docblocks**: The function must have JSDoc/TSDoc comments.
- **Tests**: Every utility must have a corresponding `*.unit.ts` file.
- **Test mapping**: Utility tests are 1:1 with the production file. Do not group multiple utilities into a shared spec file.

## Checklist

1. Create `src/utilities/<functionName>.ts` with a single named export
2. Verify the file contains exactly one utility concern
3. If a runtime type predicate is needed, use the `create-guard` pattern instead of placing it here
4. Add JSDoc/TSDoc to the function
5. Create `src/utilities/specs/<functionName>.unit.ts` with tests for that utility only
6. Export from `src/index.ts` if the utility is part of the public API
7. Run `pnpm run check` to verify
