---
name: create-service
description: Scaffold a new service class for data source interaction with tests and docblocks
user-invocable: false
---

# Create Service

When creating a new service in this project, follow these conventions exactly.

## File Placement

```
src/services/
├── ThingService.ts
└── specs/
    └── ThingService.unit.ts
```

## Conventions

- **Naming**: PascalCase with `Service` suffix.
- **Export**: Single named export per file. No default exports.
- **Role**: Services mediate mutations on data sources. They are the only layer that should write to data source state.
- **Layer separation**: Services must not import from UI-specific modules (components, hooks, context providers).
- **Docblocks**: The service class and all public methods must have JSDoc/TSDoc comments.
- **Tests**: Every service must have a corresponding `*.unit.ts` file.

## Checklist

1. Create `src/services/<ServiceName>Service.ts` with a single named export
2. Add JSDoc/TSDoc to the class and all public methods
3. Create `src/services/specs/<ServiceName>Service.unit.ts` with unit tests
4. Export from `src/index.ts` if the service is part of the public API
5. Register types in `src/register.d.ts` if applicable
6. Run `pnpm run check` to verify
