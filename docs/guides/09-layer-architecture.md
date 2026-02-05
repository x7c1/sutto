# Layer Architecture

## Overview

snappa uses a layered architecture to separate concerns. Each layer has a specific responsibility and clear dependency rules.

## Layers

```
┌─────────────────────────────────────────────────┐
│ composition                                     │
│   Wiring, event listeners, dependency injection │
├─────────────────────────────────────────────────┤
│ ui                                              │
│   Screen objects, user interaction              │
├─────────────────────────────────────────────────┤
│ operations                                      │
│   Business logic, coordinates domain and infra  │
├─────────────────────────────────────────────────┤
│ infra                                           │
│   External interactions (API, file I/O, DB)     │
├─────────────────────────────────────────────────┤
│ domain                                          │
│   Pure domain models, no external dependencies  │
└─────────────────────────────────────────────────┘
```

## Layer Responsibilities

### domain

Pure domain models and business rules. No dependencies on other layers.

- Entities and value objects
- Domain logic that doesn't require external resources

### infra

Handles all external interactions. Implements interfaces defined by the operations layer.

- API clients
- File system operations
- Database access
- System information providers

### operations

Coordinates domain and infra to execute business logic. Defines interfaces that infra implements.

- Executes use cases by combining domain and infra
- May hold state and notify state changes
- Entry point for UI layer

### ui

Objects that affect the screen. Calls operations layer.

- UI components (panels, buttons, menus)
- Responds to user interactions
- Observes state changes from operations

### composition

Wires everything together. Instantiates objects and injects dependencies.

- Creates instances of each layer
- Sets up event listeners
- Manages lifecycle (enable/disable)

## Dependency Rules

```
composition → ui → operations → domain
                       ↓
                     infra
```

- **domain**: depends on nothing
- **infra**: depends on domain, implements operations interfaces
- **operations**: depends on domain, defines interfaces for infra
- **ui**: depends on operations
- **composition**: depends on everything (wiring only)

## Operations Layer Pattern

The operations layer may:
- Execute multiple related operations (activate, validate, etc.)
- Hold internal state
- Notify observers when state changes

This differs from a pure "use case" (single action, stateless) but is practical for GUI applications where the UI needs to react to state changes.
