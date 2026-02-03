# ADR-2: Error Handling Strategy

## Status

Revised (originally accepted Result types, changed to exceptions)

## Context

TypeScript exceptions are untyped and invisible in function signatures. Callers can easily forget to handle errors. We considered using Rust-style `Result<T, E>` types for safer error handling.

However, a conflict emerged with ADR-1 (nominal typing):

- Result types at UseCase boundary require primitive parameters (for error conversion)
- Primitive parameters lose the type safety benefit of nominal typing (ADR-1)
- Using domain types at the boundary while returning Result requires complex patterns

## Options Considered

### Option 1: Exceptions with Domain Types at Boundary

```typescript
// UseCase: receives domain types, throws exceptions
class ActivateLicense {
  async execute(key: LicenseKey, deviceId: DeviceId): Promise<License> {
    const response = await this.apiClient.activate(key, deviceId);
    return new License(...);
  }
}

// UI: creates domain types, uses try-catch
try {
  const key = new LicenseKey(rawKey);
  const deviceId = new DeviceId(rawDeviceId);
  const license = await activateLicense.execute(key, deviceId);
  showSuccess(license);
} catch (e) {
  showError(e);
}
```

**Pros:**
- Domain types at UseCase boundary (type safety from ADR-1)
- Simple, conventional pattern
- Ecosystem compatible

**Cons:**
- Caller can forget `try/catch`
- Error types not visible in signature

### Option 2: Result Types Everywhere

```typescript
class LicenseKey {
  private constructor(readonly value: string) {}

  static create(value: string): Result<LicenseKey, ValidationError> {
    if (!/.../.test(value)) {
      return { ok: false, error: new ValidationError('...') };
    }
    return { ok: true, value: new LicenseKey(value) };
  }
}
```

**Cons:**
- Verbose in Domain layer
- Doesn't match ecosystem conventions
- Every operation needs Result unwrapping

### Option 3: Exceptions in Domain, Result at UseCase Boundary

```typescript
class ActivateLicense {
  async execute(rawKey: string, rawDeviceId: string): Promise<Result<License, ActivationError>> {
    try {
      const key = new LicenseKey(rawKey);
      const deviceId = new DeviceId(rawDeviceId);
      // ...
      return { ok: true, value: license };
    } catch (e) {
      return { ok: false, error: toActivationError(e) };
    }
  }
}
```

**Cons:**
- UseCase receives primitives, losing nominal typing benefits
- Conflicting arguments can't be detected at compile time:
  ```typescript
  // Compiles but wrong - arguments swapped!
  activateLicense.execute(rawDeviceId, rawKey);
  ```

## Decision

Use **Option 1: Exceptions with Domain Types at Boundary**.

## Rationale

- **Preserves ADR-1 benefits**: Domain types at UseCase boundary prevent argument mix-ups
- **Simple**: Standard try-catch pattern, no new abstractions
- **Ecosystem compatible**: Works naturally with exception-throwing libraries (Soup, GLib, etc.)
- **Pragmatic trade-off**: The risk of forgetting try-catch is mitigated by:
  - Async operations naturally remind developers to handle errors
  - Code review catches missing error handling
  - Consistent patterns across the codebase

## Layer Responsibilities

| Layer | Error Handling |
|-------|----------------|
| Domain | Throw exceptions for invariant violations |
| UseCase | Throw exceptions (or let them propagate) |
| Infrastructure | Throw exceptions (wrapped if needed) |
| UI | Always use try-catch when calling UseCase |

## Example

```typescript
// Domain layer
class LicenseKey {
  #brand: void;
  constructor(readonly value: string) {
    if (!/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(value)) {
      throw new ValidationError('Invalid license key format');
    }
  }
}

// UseCase layer
class ActivateLicense {
  constructor(
    private repository: LicenseRepository,
    private apiClient: LicenseApiClient,
  ) {}

  async execute(key: LicenseKey, deviceId: DeviceId): Promise<License> {
    const response = await this.apiClient.activate(key, deviceId);
    const license = new License(key, response.status, response.validUntil);
    await this.repository.save(license);
    return license;
  }
}

// UI layer
async function onActivateClicked() {
  try {
    const key = new LicenseKey(rawKeyInput.value);
    const deviceId = new DeviceId(rawDeviceIdInput.value);
    const license = await activateLicense.execute(key, deviceId);
    showSuccess(`Activated until ${license.validUntil}`);
  } catch (e) {
    if (e instanceof ValidationError) {
      showError('Invalid input format');
    } else if (e instanceof NetworkError) {
      showError('Network error. Please try again.');
    } else {
      showError('Unknown error occurred');
    }
  }
}
```
