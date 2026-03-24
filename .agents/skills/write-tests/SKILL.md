---
name: write-tests
description: Write tests following this project's testing conventions, file patterns, and placement rules
user-invocable: false
---

# Write Tests

When writing tests in this project, follow these conventions exactly.

## Test Types

| Type        | File pattern                             | Runner       | Purpose                              |
| ----------- | ---------------------------------------- | ------------ | ------------------------------------ |
| Unit        | `*.unit.ts` / `*.unit.tsx`               | Vitest       | Isolated logic, single module        |
| Integration | `*.integration.ts` / `*.integration.tsx` | Vitest       | Cross-module interaction             |
| Performance | `*.bench.ts` / `*.bench.tsx`             | Vitest Bench | Execution speed and regression guard |
| E2E         | `*.e2e.ts` / `*.e2e.tsx`                 | Playwright   | Full application user flows          |

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
- Performance-critical code paths (layout, rendering, diffing, parsing) should have benchmarks.

## Test Utilities

Use the `testing/` directory within modules for shared mocks, factories, and test utilities.

```
src/testing/
├── mocks/
└── factories/
```

## Performance Benchmarks

Performance benchmarks use Vitest's `bench` API. They live in `specs/` alongside other tests.

```
src/classes/
├── MyClass.ts
└── specs/
    ├── MyClass.unit.ts
    └── MyClass.bench.ts
```

### Writing a Benchmark

Benchmarks track the execution performance of specific operations. They run across many iterations automatically and report ops/sec, helping detect performance regressions as the library evolves.

```ts
import {bench, describe} from 'vitest';
import {MyClass} from '../MyClass';

const input = generateRealisticInput(); // Setup outside bench callback

describe('MyClass', () => {
  bench('processes a typical document tree', () => {
    const instance = new MyClass();
    instance.doWork(input);
  });

  bench('processes a large document tree', () => {
    const instance = new MyClass();
    instance.doWork(largeInput);
  });
});
```

### Guidelines

- **One concern per file.** Benchmark a single class, utility, or code path per `.bench.ts` file.
- **Use realistic inputs.** Benchmark with representative data sizes and shapes, not trivial cases. Include multiple scale tiers (small, typical, large) to surface scaling behavior.
- **Keep setup outside the bench callback.** Prepare data before the `bench()` call so setup cost is not measured.
- **Name benchmarks descriptively.** The name should describe the workload, not just the function — e.g., "lays out 100-node flex container" not "layout".
- **No assertions.** Benchmarks measure speed, not correctness — that is the job of unit tests.
- **Run with:** `pnpm test:performance`

## Checklist

1. Identify the correct test type (unit, integration, performance, or e2e)
2. Create the test file in the correct `specs/` folder with the correct suffix
3. Use shared test utilities from `src/testing/` where appropriate
4. Run `pnpm run check` to verify tests pass
