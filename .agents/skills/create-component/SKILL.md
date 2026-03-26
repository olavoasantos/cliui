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
    ├── component.ts(x)      # Single named export
    ├── styles.css           # Component styles
    ├── constants.ts         # Component-local constants when needed
    ├── types.ts             # Component-local explicit types when needed
    └── specs/
        └── MyComponent.unit.ts(x)  # Colocated unit test
```

## Conventions

- **Naming**: PascalCase folder name matching the component name.
- **Entry file**: Always `component.ts(x)` (not `index.ts(x)`).
- **Export**: Single named export. No default exports.
- **Docblocks**: The component and its props type must have JSDoc/TSDoc comments.
- **Tests**: Components with non-trivial logic must have a corresponding `*.unit.ts(x)` file.
- **Component-local support files**: If a component needs dedicated constants or types, place them in `constants.ts` and `types.ts` inside the same component folder instead of inlining them in `component.ts(x)`.
- **Styles**: Keep component styles in `styles.css`. In this project, components that need to own stylesheet text should import the file as a string via `?inline` and explicitly hand that CSS to the terminal DOM style system rather than relying on browser-style automatic CSS injection.
- **Layer separation**: UI components must not contain business logic. They receive read-only signals. Mutations go through services, event handlers, or tool/intent invocations.
- **Context providers**: Minimize usage. The application has its own context mechanisms (service container, configuration, environment). Only use UI context providers when there is no alternative.

## Checklist

1. Create `src/components/<ComponentName>/component.ts(x)` with a single named export
2. Create `src/components/<ComponentName>/styles.css` for styles
3. Add `constants.ts` and `types.ts` inside the component folder when the component needs dedicated constants or explicit types
4. Add JSDoc/TSDoc to the component and its props
5. Create `src/components/<ComponentName>/specs/<ComponentName>.unit.ts(x)` if the component has non-trivial logic
6. Export from `src/index.ts` if the component is part of the public API
7. Run `pnpm run check` to verify
