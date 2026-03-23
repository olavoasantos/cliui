---
name: create-component
description: Scaffold a new UI component with the correct folder structure, styles, tests, and docblocks
user-invocable: false
---

# Create Component

When creating a new UI component in this project, follow these conventions exactly.

## File Placement

```
src/components/
└── MyComponent/
    ├── component.tsx        # Single named export
    ├── styles.css           # Component styles
    └── specs/
        └── MyComponent.unit.tsx  # Colocated unit test
```

## Conventions

- **Naming**: PascalCase folder name matching the component name.
- **Entry file**: Always `component.tsx` (not `index.tsx`).
- **Export**: Single named export. No default exports.
- **Docblocks**: The component and its props type must have JSDoc/TSDoc comments.
- **Tests**: Components with non-trivial logic must have a corresponding `*.unit.tsx` file.
- **Layer separation**: UI components must not contain business logic. They receive read-only signals. Mutations go through services, event handlers, or tool/intent invocations.
- **Context providers**: Minimize usage. The application has its own context mechanisms (service container, configuration, environment). Only use UI context providers when there is no alternative.

## Checklist

1. Create `src/components/<ComponentName>/component.tsx` with a single named export
2. Create `src/components/<ComponentName>/styles.css` for styles
3. Add JSDoc/TSDoc to the component and its props
4. Create `src/components/<ComponentName>/specs/<ComponentName>.unit.tsx` if the component has non-trivial logic
5. Export from `src/index.ts` if the component is part of the public API
6. Run `pnpm run check` to verify
