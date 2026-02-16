# Expand Test Coverage: LicenseOperations

Status: Completed

## Overview

Add unit tests for `LicenseOperations` to cover the operations layer's license validation logic. Currently all tests are concentrated in the domain layer (11 test files) and infra layer (1 test file), while the operations layer has zero test coverage. This plan focuses on `LicenseOperations` only, as scoped in the proposal — other operations classes are thin wrappers where testing cost outweighs benefit.

## Background

`LicenseOperations` is the central coordinator for license management. It orchestrates domain objects, repository persistence, and API communication to handle:

- License activation and validation
- Trial period tracking
- Offline grace period logic
- State change notifications

This class contains non-trivial business logic (state transitions, error handling, network-aware behavior) that is currently untested.

## Scope

- Add unit tests for `LicenseOperations` (`src/operations/licensing/license-operations.ts`)
- Create mock implementations for its 5 dependencies
- Out of scope: `MonitorEnvironmentOperations`, `LayoutApplicator`, other layers

## Technical Approach

### Test File Location

Co-located with source, following existing convention:

```
src/operations/licensing/license-operations.test.ts
```

### Mocking Strategy

Create simple object literals implementing interfaces — no `vi.mock()` or `vi.spyOn()`, consistent with existing test style. All 5 constructor dependencies need mocks:

- `LicenseRepository` — in-memory state store
- `LicenseApiClient` — configurable success/failure responses
- `DateProvider` — fixed date/time
- `NetworkStateProvider` — configurable network state
- `DeviceInfoProvider` — fixed device info

Helper functions will create pre-configured mocks for common scenarios (e.g., `createMockRepository({ status: 'trial' })`).

### Test Cases

**`initialize()`**
- When status is `valid` with license: validates license via API
- When status is `trial`: records trial usage
- When status is `trial` but backend unreachable: skips trial usage recording
- Notifies state change callbacks after initialization

**`getState()`**
- Returns correct state combining repository data, network state, and license info
- Returns null validUntil when no license exists

**`shouldExtensionBeEnabled()`**
- Trial mode: returns true when trial not expired
- Trial mode: returns false when trial expired
- Valid mode, online: returns true
- Valid mode, offline within grace period: returns true
- Valid mode, offline beyond grace period (7+ days): returns false
- Expired/invalid status: returns false

**`activate(licenseKey)`**
- Success: saves license, sets status to valid, notifies state change, returns deactivatedDevice
- Network error: returns retryable error, does not change status
- Backend unreachable: returns retryable error, does not change status
- Invalid key: sets status to invalid, notifies state change
- Expired license: sets status to invalid, notifies state change

**`validateLicense()`**
- No license exists: returns false
- Success: updates license with new validUntil and lastValidated, returns true
- License expired: sets status to expired, returns false
- License cancelled: sets status to expired, returns false
- Device deactivated: sets status to expired, returns false
- Network error: keeps cached status, returns based on current status
- Invalid license key: sets status to invalid, returns false

**`clearLicense()`**
- Delegates to repository.clearLicense()
- Notifies state change callbacks

**`recordTrialUsage()`**
- Records usage when not yet recorded today, returns true
- Skips when already recorded today, returns false
- Sets status to expired when trial period ends
- Notifies state change after recording

**State change callbacks**
- `onStateChange()` registers callback that receives state updates
- `clearCallbacks()` removes all registered callbacks
- Callback errors are caught and do not propagate

## Tasks

- Create mock helper functions for the 5 dependencies
- Implement tests for `initialize()`
- Implement tests for `getState()`
- Implement tests for `shouldExtensionBeEnabled()`
- Implement tests for `activate()`
- Implement tests for `validateLicense()`
- Implement tests for `clearLicense()` and `recordTrialUsage()`
- Implement tests for state change callback behavior
- Run `npm run build && npm run check && npm run test:run` to verify
