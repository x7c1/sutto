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
- Maintain or improve test coverage

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
│   ├── main-panel/
│   │   └── main-panel.ts
│   ├── settings/
│   │   └── license-settings-page.ts
│   └── controller.ts
│
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

- `domain/` must not import from other layers
- `domain/` contexts may import from other contexts following the dependency diagram above
- `usecase/` may only import from `domain/`
- `infra/` may import from `domain/` and `usecase/` (for interfaces)
- `ui/` may import from `usecase/` and `domain/`
- `libs/` may be imported from any layer (layer-independent utilities)

## Implementation Plan

### Phase 0: Project References Verification

Verify that TypeScript project references work with the current build setup.

- Create minimal proof-of-concept with 2 projects:
  - `domain/` (no girs dependency)
  - `infra/` (with girs dependency)
- Verify esbuild can bundle the multi-project setup
- Verify incremental build works (change in domain/ doesn't recompile girs)
- Measure build time improvement
- If verification fails, fall back to single-project with directory conventions

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

- Extract `LicenseApiClient` (HTTP only, returns raw responses)
- Create `LicenseRepository` (converts API responses to domain objects)
- Refactor `LicenseStorage` to `GSettingsLicenseRepository`
- Update `LicenseManager` to use domain objects
- Add validation in infrastructure layer

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
