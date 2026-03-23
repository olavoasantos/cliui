---
name: write-docs
description: Write documentation following this project's Diataxis framework and docblock conventions
user-invocable: false
---

# Write Documentation

Documentation in this project follows the [Diataxis framework](https://diataxis.fr/) and uses Markdown files.

## Documentation Structure

```
docs/                          # Root-level project documentation
├── README.md
├── CHANGELOG.md
├── learn/                     # Explanation guides (understanding-oriented)
├── recipes/                   # How-to guides (task-oriented)
├── tutorials/                 # Tutorial guides (learning-oriented)
└── references/                # Reference docs (information-oriented, auto-generated from docblocks)

packages/<module>/src/docs/    # Module-specific documentation
├── learn/
├── recipes/
├── tutorials/
└── references/
```

## Diataxis Categories

| Category   | Purpose                | Orientation        |
| ---------- | ---------------------- | ------------------ |
| Learn      | Explain concepts       | Understanding      |
| Recipes    | Step-by-step how-to    | Task completion    |
| Tutorials  | Guided learning        | Learning by doing  |
| References | API/type documentation | Information lookup |

## Docblock Policy

All public types, interfaces, classes, functions, and methods must have well-written JSDoc/TSDoc comments. Reference documentation is **generated from these docblocks** — so the quality of docblocks directly determines the quality of reference docs.

## Checklist

1. Determine the correct Diataxis category for the documentation
2. Place the file in the correct directory (`learn/`, `recipes/`, `tutorials/`, or `references/`)
3. For reference docs, ensure the underlying code has complete JSDoc/TSDoc docblocks
4. For module-specific docs, use `src/docs/` within the module
