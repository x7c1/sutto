# Architecture

## Overview

sutto separates concerns into layers with dependencies pointing inward toward the domain. This is closer to Clean Architecture or Onion Architecture than traditional layered architecture, as outer layers (ui, infra) can access inner layers (operations, domain) directly.

## Layers

```
┌───────────────────────────────────────────────────┐
│                   composition                     │
│  Wiring, event listeners, dependency injection    │
└───────────────────────────────────────────────────┘
        │                            │
        ▼                            ▼
┌─────────────────┐      ┌─────────────────────────┐
│       ui        │      │          infra          │
│  Panels, menus  │      │  API, file I/O, DB      │
└────────┬────────┘      └────────────┬────────────┘
         │                            │
         └──────────┬─────────────────┘
                    ▼
┌───────────────────────────────────────────────────┐
│                   operations                      │
│  Business logic, defines interfaces               │
└───────────────────────────────────────────────────┘
                    │
                    ▼
┌───────────────────────────────────────────────────┐
│                     domain                        │
│  Pure domain models, no external dependencies     │
└───────────────────────────────────────────────────┘
```

ui and infra can also access domain directly (not shown for simplicity).

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

Coordinates domain to execute business logic. Defines interfaces that infra implements.

- Executes business operations using domain models
- Notifies state changes to observers
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
                       ↑
                     infra (implements operations interfaces)
```

- **domain**: depends on nothing
- **operations**: depends on domain, defines interfaces
- **infra**: depends on domain and operations (for interface definitions)
- **ui**: depends on operations
- **composition**: depends on everything (wiring only)

## Operations Layer Pattern

The operations layer may:
- Execute multiple related operations (activate, validate, etc.)
- Notify observers when state changes

Domain state is stored in repositories (infra layer). Operations only hold callback subscriptions for notification purposes.
