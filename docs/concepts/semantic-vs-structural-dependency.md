# Semantic vs Structural Dependency

## Overview

There are two types of dependency relationships between concepts. Understanding this distinction is important because they often point in **opposite directions**, and each is relevant in different contexts.

For the rationale behind this terminology, see [ADR: Terminology for Dependency Types](./adr.md).

## Semantic Dependency

A concept A has a **semantic dependency** on concept B when A cannot be meaningfully defined without understanding B.

**Example: Layout Size → Layout**

- "Layout Size" cannot be defined without first understanding what a "Layout" is
- The meaning of Layout Size is derived from its relationship to Layout
- Layout Size describes an aspect of Layout

**Direction:** Layout Size depends on Layout

## Structural Dependency

A concept A has a **structural dependency** on concept B when the structure/definition of A requires B to be defined first.

**Example: Layout → Layout Size**

- To define the Layout type, you must first define the Layout Size type
- Layout contains Layout Size as a component
- In code: `interface Layout { size: LayoutSize; ... }`

**Direction:** Layout depends on Layout Size

## The Directions Are Reversed

| Relationship | Semantic | Structural |
|--------------|----------|------------|
| Layout ↔ Layout Size | Layout Size → Layout | Layout → Layout Size |
| Space ↔ Space Collection | Space Collection → Space | Space Collection → Space |

Note that for Layout/Layout Size, the directions are **opposite**. For Space/Space Collection, they happen to be the **same**.

## When to Use Which

| Context | Use |
|---------|-----|
| **Concept Docs hierarchy** | Semantic dependency |
| **Class diagrams** | Structural dependency |
| **Database schema** | Structural dependency |
| **Import statements in code** | Structural dependency |
| **Explaining concepts to newcomers** | Semantic dependency |

## Why This Matters

In modern software development, structural dependency is well understood—it's what determines compilation order, import graphs, and architectural diagrams.

However, semantic dependency is often overlooked. Yet it's crucial for:
- Organizing documentation in an intuitive way
- Onboarding new team members
- Communicating with non-technical stakeholders
- Building a shared vocabulary (ubiquitous language)

When organizing Concept Docs, we use semantic dependency because we're concerned with **meaning and understanding**, not with code structure.
