# ADR: Terminology for Dependency Types

## Status

Accepted

## Context

When organizing Concept Docs hierarchically, we needed to distinguish between two types of dependencies:

1. The dependency that determines whether a concept can be **meaningfully defined** without another concept
2. The dependency that determines whether a type/structure can be **technically defined** without another type

These dependencies often point in opposite directions, and using clear terminology is important for communication.

## Research

### Prior Art in Philosophy/Ontology

[Stanford Encyclopedia of Philosophy - Ontological Dependence](https://plato.stanford.edu/entries/dependence-ontological/) describes several varieties of ontological dependence:

- **Existential dependence**: Whether entity A can exist without entity B
- **Definitional dependence** (or **Identity-dependence**): Whether we can define what A is without reference to B

The concept we needed aligns with "definitional dependence" - for example, Layout Size cannot be defined without understanding what Layout means.

### Prior Art in Conceptual Modeling

[Existence Dependency in Conceptual Modeling](https://www.researchgate.net/publication/2919812_Existence_Dependency_The_key_to_semantic_integrity_between_Structural_and_Behavioral_Aspects_of_Object_Types) uses "existence dependency" to describe relationships where one object type cannot exist without another (e.g., ORDERLINE cannot exist without ORDER).

### Gap in Software Engineering Literature

No established terminology was found for the distinction we needed in mainstream software engineering literature. Class diagrams, dependency injection, and module systems focus primarily on structural/technical dependencies, not semantic ones.

## Decision

We adopt the following terminology:

### Semantic Dependency

A concept A has a **semantic dependency** on concept B when A cannot be meaningfully defined without understanding B.

**Why "semantic" instead of "definitional":**
- In software engineering, "definition" strongly connotes type definitions, function definitions, etc.
- "Semantic" clearly refers to meaning, avoiding confusion with code-level definitions
- "Semantic dependency" contrasts well with "structural dependency"

### Structural Dependency

A concept A has a **structural dependency** on concept B when the structure/type of A requires B to be defined first in code.

**Why "structural":**
- No clear prior terminology exists
- "Structural" accurately describes the nature of the dependency (composition, containment)
- It pairs naturally with "semantic"

## Consequences

- Concept Doc hierarchy uses **semantic dependency** (meaning-based)
- Class diagrams and code organization use **structural dependency** (structure-based)
- These terms are documented in [semantic-vs-structural-dependency.md](./semantic-vs-structural-dependency.md)
- Team members should understand that these dependencies often point in opposite directions
