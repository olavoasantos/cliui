---
name: create-data-source
description: Scaffold a new signal-based reactive data source with optional migrations, tests, and docblocks
user-invocable: false
---

# Create Data Source

When creating a new data source in this project, follow these conventions exactly.

## What is a Data Source?

Data sources are signal-based reactive stores. They are the single source of truth for application state within a domain.

- Expose **read-only computed signals** for consumption by UI and other services.
- Mutations are performed through associated service classes, not directly.
- If persistence is needed, data sources must implement **versioning** and a **migration mechanism**.

## File Placement

### Simple data source (no migrations)

```
src/data-sources/
├── ThingDataSource.ts
└── specs/
    └── ThingDataSource.unit.ts
```

### Data source with migrations

```
src/data-sources/
├── ComplexDataSource/
│   ├── index.ts
│   └── migrations/
│       ├── v1-initial.ts
│       └── v2-add-field.ts
└── specs/
    └── ComplexDataSource.unit.ts
```

## Conventions

- **Naming**: PascalCase with `DataSource` suffix.
- **Export**: Single named export. No default exports.
- **Signals**: Expose read-only computed signals. Never expose writable signals directly.
- **Mutations**: Always go through an associated service class.
- **Migrations**: Live in a `migrations/` subfolder. Named with version prefix (`v1-`, `v2-`, etc.).
- **Docblocks**: The data source class and all public signals must have JSDoc/TSDoc comments.
- **Tests**: Every data source must have a corresponding `*.unit.ts` file.

## Checklist

1. Create the data source file or folder with the correct naming
2. Expose only read-only computed signals
3. Add JSDoc/TSDoc to the class and all public members
4. Create `src/data-sources/specs/<DataSourceName>.unit.ts` with unit tests
5. If persistence is needed, add versioning and migration files
6. Create or update the associated service class for mutations
7. Export from `src/index.ts` if the data source is part of the public API
8. Register types in `src/register.d.ts` if applicable
9. Run `pnpm run check` to verify
