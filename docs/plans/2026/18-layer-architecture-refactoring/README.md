# Layer Architecture Refactoring

## Overview

This plan addresses the lack of clear layer separation in the snappa codebase. Currently, external data (from APIs, GSettings, JSON files) flows into the application with minimal validation and no explicit conversion to domain objects. The goal is to introduce clear layer boundaries where:

- External data is validated and converted at the boundary (Infrastructure layer)
- Domain objects enforce invariants in their constructors
- Validated data is expressed through dedicated types
- UI layer remains thin, delegating to UseCase layer

## Background

### Current Problems

- **No boundary validation**: `as T` type assertions used without runtime checks
- **Mixed concerns in Service layer**: Services handle orchestration, business logic, and data access
- **Scattered validation**: Some files have good predicates (`isValidSpaceCollectionArray`), others have none
- **Unclear data flow**: API response models, storage models, and domain models are not distinguished
- **Hard to test**: Business logic is tightly coupled with I/O (GSettings, file system, HTTP), making unit tests difficult without mocking external dependencies
- **Desktop freeze risk**: When backward compatibility of stored data is unintentionally broken, invalid data can cause the entire GNOME Shell to freeze (not just snappa). This is arguably a GNOME Shell design issue, but we must handle it defensively by validating all external data at boundaries

### Files with Unsafe Type Assertions

| File | Line | Issue |
|------|------|-------|
| `license-client.ts` | 131, 134 | `JSON.parse(responseText) as T` |
| `license-storage.ts` | 74 | `get_string(...) as LicenseStatus` |
| `history.ts` | 157 | `JSON.parse(line) as LayoutEvent` |

### Existing Good Patterns

- `space-collection.ts`: `isValidSpaceCollectionArray()` predicate with type guard
- `custom-import.ts`: `isValidLayoutConfiguration()` predicate

## Goals

- Establish clear layer boundaries: Infrastructure → Domain → UseCase → UI
- Validate all external data at the boundary
- Create domain objects with constructor-based validation
- Define types that represent validated IDs and constrained values
- Keep UI layer thin (signal handlers delegate to UseCase layer)
- Enable unit testing of business logic without I/O mocking (domain layer is pure)
- Prevent desktop freezes by catching invalid data at infrastructure boundaries before it propagates

## Non-Goals

- Unifying naming conventions across different APIs (snake_case vs camelCase is acceptable at API boundary)
- Adding external validation libraries (Zod, Valibot, etc.)
- Rewriting the entire codebase at once

## Target Architecture

Layer dependency diagram (arrows indicate "depends on"):

```
┌───────────────────────────────────────────────────┐
│              Composition Root                     │
│                                                   │
│  extension.ts, prefs.ts                           │
│  - Instantiates all layers                        │
│  - Wires dependencies                             │
│  - Knows about everything                         │
└───────────────────────────────────────────────────┘
        │ instantiates & wires
        ▼
┌────────────────┐      ┌────────────────────────┐
│    UI Layer    │      │  Infrastructure Layer  │
└───────┬────────┘      └───────────┬────────────┘
        │                           │
        └───────────┬───────────────┘
                    ▼
┌───────────────────────────────────────────────────┐
│                  UseCase Layer                    │
│                                                   │
│  ActivateLicense, ValidateLicense, etc.           │
│  + Interfaces (LicenseRepository, LicenseApi)     │
└─────────────────────────┬─────────────────────────┘
                          │
                          ▼
┌───────────────────────────────────────────────────┐
│                   Domain Layer                    │
│                                                   │
│  License, Trial, ActivationResult, SpaceCollection│
│  Validated types: LicenseKey, ActivationId, etc.  │
│  - Pure business logic                            │
│  - Constructor-based validation                   │
│  - No I/O dependencies                            │
└───────────────────────────────────────────────────┘
```

Composition Root is the only layer that knows about all other layers. It instantiates Infrastructure and UseCase, then injects them into UI.

## Directory Structure

```
src/
├── domain/                     # Domain Layer
│   ├── tsconfig.json           # composite: true, no references
│   ├── licensing/
│   │   ├── license.ts          # License entity
│   │   ├── license-key.ts      # LicenseKey value object
│   │   ├── device-id.ts        # DeviceId value object
│   │   ├── activation-id.ts    # ActivationId value object
│   │   ├── trial.ts            # Trial entity
│   │   └── trial-days.ts       # TrialDays value object (0-30 range)
│   ├── layout/
│   │   ├── space-collection.ts
│   │   ├── collection-id.ts    # CollectionId value object (UUID)
│   │   ├── space.ts
│   │   ├── layout.ts
│   │   ├── layout-id.ts        # LayoutId value object (UUID)
│   │   └── layout-group.ts
│   ├── history/
│   │   └── layout-event.ts
│   └── monitor/
│       ├── monitor.ts
│       └── monitor-environment.ts
│
├── usecase/                    # UseCase Layer
│   ├── tsconfig.json           # references: [domain]
│   ├── licensing/
│   │   ├── activate-license.ts      # ActivateLicense usecase
│   │   ├── validate-license.ts      # ValidateLicense usecase
│   │   ├── license-repository.ts    # LicenseRepository interface
│   │   └── license-api-client.ts    # LicenseApiClient interface
│   ├── layout/
│   │   ├── load-space-collection.ts
│   │   ├── save-space-collection.ts
│   │   └── space-collection-repository.ts  # SpaceCollectionRepository interface
│   └── monitor/
│       ├── switch-environment.ts
│       └── monitor-detector.ts      # MonitorDetector interface
│
├── infra/                      # Infrastructure Layer
│   ├── tsconfig.json           # references: [domain, usecase], with girs types
│   ├── api/
│   │   └── http-license-api-client.ts      # implements LicenseApiClient
│   ├── gsettings/
│   │   ├── gsettings-license-repository.ts # implements LicenseRepository
│   │   └── gsettings-extension-settings.ts
│   ├── file/
│   │   ├── file-space-collection-repository.ts  # implements SpaceCollectionRepository
│   │   └── file-history-repository.ts
│   └── monitor/
│       └── gnome-monitor-detector.ts  # implements MonitorDetector
│
├── ui/                         # UI Layer
│   ├── tsconfig.json           # references: [domain, usecase], with girs types
│   ├── main-panel/
│   │   └── main-panel.ts
│   ├── settings/
│   │   └── license-settings-page.ts
│   └── controller.ts
│
├── tsconfig.json               # root: references all layer projects
├── extension.ts                # Composition Root (extension entry)
├── prefs.ts                    # Composition Root (preferences entry)
└── app/                        # (existing, migrate gradually)
```

### Domain Context Dependencies

```
licensing     layout
                ↑
         ┌─────┴─────┐
      history     monitor
```

- `licensing` and `layout` are independent
- `history` depends on `layout`
- `monitor` depends on `layout`

### Naming Conventions

- **Domain**: Nouns (`License`, `SpaceCollection`, `LayoutEvent`)
- **UseCase**: Verb + Noun (`ActivateLicense`, `LoadSpaceCollection`)
- **Infrastructure**: Technology + Role (`HttpLicenseApiClient`, `GnomeMonitorDetector`)

### Import Rules

These rules are **enforced by TypeScript Project References** (compile error on violation):

- `domain/` must not import from other layers
- `domain/` contexts may import from other contexts following the dependency diagram above
- `usecase/` may only import from `domain/`
- `infra/` may import from `domain/` and `usecase/` (for interfaces)
- `ui/` may import from `usecase/` and `domain/`
- `libs/` may be imported from any layer (layer-independent utilities)

### Layer Responsibilities

| Layer | Responsibility |
|-------|----------------|
| Domain | Define validation rules in constructors. Pure business logic, no I/O. |
| UseCase | Orchestrate domain objects. Receive and return domain types only. |
| Infrastructure | Convert external data (JSON, GSettings, API responses) to domain objects by invoking domain constructors. This is where domain validation is **applied**. |
| UI | Create domain objects from user input (invoking validation), call UseCase methods, handle exceptions with try-catch. |

**Key principle**: UseCase layer never sees raw external data formats. Infrastructure implementations (repositories, API clients) are responsible for all data conversion.

## Implementation Plan

### Phase 0: Project References Setup

Set up TypeScript Project References for layer separation.

**Why Project References:**

1. **Dependency enforcement**: TypeScript compiler rejects imports that violate layer boundaries
   - domain/ cannot import from infra/ (compile error, not just convention)
   - Enforced by `references` in tsconfig.json
2. **Incremental build**: Changes in domain/ don't recompile infra's girs types
   - Measured improvement: 3.2s → 0.6s for implementation-only changes

**Verification results (completed):**

- esbuild can bundle multi-project setup ✓
- Incremental build works correctly ✓
- Layer boundary violations cause compile errors ✓

**Tasks:**

- Create `tsconfig.json` for each layer (domain, usecase, infra, ui)
- Update root `tsconfig.json` to use project references
- Update build scripts to use `tsc --build`

**Estimated effort**: 2 points

### Phase 1: Domain Layer Foundation

Create domain layer with validated types and domain models.

- Create `src/domain/` directory structure
- Define validated types:
  - `LicenseKey` (non-empty string validation)
  - `ActivationId` (UUID format)
  - `DeviceId` (machine-id format)
  - `TrialDays` (0-30 range)
  - `LayoutId` (UUID format)
  - `CollectionId` (UUID format)
- Define domain models:
  - `License` (aggregates license state with validation)
  - `Trial` (trial period logic)

**Estimated effort**: 3 points

### Phase 2: License Module Refactoring

Refactor the license module as a reference implementation.

- Extract `LicenseApiClient` interface in UseCase layer (returns domain objects)
- Implement `HttpLicenseApiClient` in Infrastructure layer (converts HTTP responses to domain objects by invoking domain constructors)
- Refactor `LicenseStorage` to `GSettingsLicenseRepository` (converts stored data to domain objects)
- Update `LicenseManager` to use domain objects
- Establish GObject property synchronization pattern (how/when to sync mutable GObject properties with immutable domain objects)

**Estimated effort**: 5 points

### Phase 3: History Module Refactoring

Apply the pattern to history/event storage.

- Refactor `LayoutHistoryRepository` to validate events on load
- Create `LayoutEvent` domain object with constructor validation
- Update compaction logic to work with domain objects

**Estimated effort**: 3 points

### Phase 4: SpaceCollection Module Refactoring

Apply the pattern to space collection storage.

- Refactor `SpaceCollectionRepository` as a class
- Move existing validation predicates into domain object constructors
- Create proper domain models for `Space`, `SpacesRow`, `LayoutGroup`

**Estimated effort**: 5 points

### Phase 5: UI Layer Thinning

Ensure UI layer only delegates to UseCase layer.

- Review Controller for business logic leakage
- Extract any domain logic to appropriate services
- Ensure signal handlers are thin (delegate only)
- Apply GObject synchronization pattern established in Phase 2 to other UI components

**Estimated effort**: 3 points

### Phase 6: Test Coverage

Add tests for new domain objects and repositories.

- Unit tests for all validated types
- Unit tests for domain model constructors (validation)
- Integration tests for infrastructure layer

**Estimated effort**: 3 points

## Test Impact Assessment

### Existing Tests (4 files)

| Test File | Impact | Notes |
|-----------|--------|-------|
| `history-compaction.test.ts` | Medium | May need updates for domain objects |
| `trial-manager.test.ts` | Medium | Will use new Trial domain object |
| `evaluator.test.ts` | None | Layout expressions unchanged |
| `parser.test.ts` | None | Layout expressions unchanged |

### Mitigation

- Refactor incrementally, ensuring tests pass at each step
- Add new tests before modifying existing code
- Use the existing validation predicates as reference for domain object validation

## Risks

- **GObject integration complexity**: Signal handlers and property bindings may require careful handling
- **Incremental migration**: Some transitional states may have mixed patterns
- **Hidden dependencies**: Services may have undocumented dependencies on current data shapes
- **Entity identity**: Need to define how entities are compared (by ID vs structural equality)

## Success Criteria

- All external data passes through validation before entering domain layer
- No `as T` assertions on external data without prior validation
- Domain objects are testable without I/O mocking
- UI layer contains no business logic
- Test coverage maintained or improved

## Timeline

This work begins after PR #35 (subscription licensing) is merged.

| Phase | Points | Dependencies |
|-------|--------|--------------|
| Phase 0: Project References Verification | 2 | None |
| Phase 1: Domain Layer Foundation | 3 | Phase 0 |
| Phase 2: License Module | 5 | Phase 1 |
| Phase 3: History Module | 3 | Phase 1 |
| Phase 4: SpaceCollection | 5 | Phase 1 |
| Phase 5: UI Thinning | 3 | Phases 2-4 |
| Phase 6: Test Coverage | 3 | Phases 2-4 |

**Total estimated effort**: 24 points

Phases 2, 3, 4 can be parallelized after Phase 1 is complete.
