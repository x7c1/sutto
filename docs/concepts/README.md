# Concept Docs

## Overview

This directory contains Concept Docs that define the shared vocabulary for the product. By documenting what each term means, Concept Docs ensure that all team members—developers, designers, product managers, and stakeholders—understand product concepts in the same way.

## What is a Concept Doc?

A Concept Doc defines the core concepts and terminology of the product domain. Unlike technical documentation, it focuses on what concepts mean in the product context, not how they are implemented.

## Why It Matters

A Concept Doc is not just a glossary—it builds vocabulary for all communication about the product. For example:

- Defining requirements
- Designing user stories
- Planning new features
- Onboarding new team members
- Writing source code
- Defining API specifications
- Defining database schemas

## Writing Guidelines

Include Collocations (verbs used with each concept) to enable consistent communication.

When writing a Concept Doc, consider the following:

- **Consistency with product requirements**: Ensure concepts align with and do not contradict product requirements
- **No implementation details**: Focus on what the concept means, not how it is implemented in code
- **Future assumptions**: If a concept includes future considerations, clearly mark them as such
- **One word per concept**: Do not use the same word for different concepts
- **One concept per word**: Do not use different words for the same concept
- **Collocations**: Define which verbs are used with the concept
- **No undefined terms**: If unavoidable, add an annotation (e.g., "Layout Group (explained below)")

## Terminology

A concept defined by a Concept Doc is called a **Domain Model**. Domain Models should always be capitalized (e.g., Display, Space, Layout Group) to distinguish them from general terms.

When "Model" is used without qualification, it refers to a Domain Model.

## File Organization

Each Concept Doc is organized in its own directory with a `README.md` file:

```
docs/concepts/
├── README.md
├── display/
│   └── README.md
└── space/
    └── README.md
```

A Domain Model B can be nested under Domain Model A's directory **only when both conditions are met**:

1. **Semantic dependency: B → A** (B cannot be defined without understanding A)
2. **Structural dependency: A → B** (A contains B as a component)

```
docs/concepts/
└── layout/
    ├── README.md              # Layout
    ├── layout-position/
    │   └── README.md          # Layout Position (nested: Layout contains Layout Position)
    └── layout-size/
        └── README.md          # Layout Size (nested: Layout contains Layout Size)
```

When the dependency directions are the same (e.g., Space Collection → Space for both), the child should **not** be nested—it belongs at the top level.

See [Semantic vs Structural Dependency](./semantic-vs-structural-dependency.md) for details on this distinction.

## Document Format

Each Concept Doc should follow this structure:

```markdown
# Concept Name

## Definition

A clear explanation of what this concept means.

## Examples

Concrete examples that illustrate the concept.

## Collocations

Verbs that are used with this Domain Model:
- apply (a Layout Group to a Display)
- switch (between Spaces)

## Related Concepts

- Links to other Concept Docs that are related
```

## Notes for Developers

### Collocations

Names in source code should follow the Collocations defined in each Concept Doc.

Example for Collocation `apply (a Layout Group to a Display)`:

```typescript
// OK
function applyLayoutGroup(display: Display, group: LayoutGroup) { ... }

// NG
function setLayoutGroup(display: Display, group: LayoutGroup) { ... }
```
