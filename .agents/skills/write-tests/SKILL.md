---
name: write-tests
description: Write tests following this project's testing conventions, file patterns, and placement rules
user-invocable: false
---

# Write Tests

When writing tests in this project, follow these conventions exactly.

## Test Types

| Type        | File pattern                             | Runner     | Purpose                       |
| ----------- | ---------------------------------------- | ---------- | ----------------------------- |
| Unit        | `*.unit.ts` / `*.unit.tsx`               | Vitest     | Isolated logic, single module |
| Integration | `*.integration.ts` / `*.integration.tsx` | Vitest     | Cross-module interaction      |
| E2E         | `*.e2e.ts` / `*.e2e.tsx`                 | Playwright | Full application user flows   |

## Test Location

Tests live in a `specs/` folder colocated with the code they test (inside each subdirectory of a module).

```
src/classes/
├── MyClass.ts
└── specs/
    └── MyClass.unit.ts

src/components/
└── MyComponent/
    ├── component.tsx
    └── specs/
        └── MyComponent.unit.tsx

src/services/
├── ThingService.ts
└── specs/
    └── ThingService.unit.ts
```

## What Needs Tests

- Every class, service, hook, utility, and data source must have unit tests.
- Components with non-trivial logic should have unit tests.
- Error classes only need tests if they implement custom methods.

## Test Utilities

Use the `testing/` directory within modules for shared mocks, factories, and test utilities.

```
src/testing/
├── mocks/
└── factories/
```

## Checklist

1. Identify the correct test type (unit, integration, or e2e)
2. Create the test file in the correct `specs/` folder with the correct suffix
3. Use shared test utilities from `src/testing/` where appropriate
4. Run `pnpm run check` to verify tests pass
