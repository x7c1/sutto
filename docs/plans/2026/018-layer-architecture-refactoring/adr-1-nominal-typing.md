# Architecture Decision Record

## ADR-1: Use `#` Private Fields for Nominal Typing

### Status

Accepted

### Context

TypeScript uses structural subtyping, which means two types with the same structure are considered compatible. This poses a problem when creating distinct types that wrap the same underlying value (similar to Rust's newtype pattern).

For example, we want `LicenseKey` and `DeviceId` to be incompatible types, even though both wrap a `string`.

### Options Considered

#### Option 1: Branded Types

```typescript
type LicenseKey = string & { readonly __brand: 'LicenseKey' };
type DeviceId = string & { readonly __brand: 'DeviceId' };

function createLicenseKey(value: string): LicenseKey {
  if (!value) throw new Error('Invalid');
  return value as LicenseKey;
}
```

**Pros:**
- Zero runtime cost (brand exists only at compile time)
- Value remains a primitive string at runtime

**Cons:**
- Can be bypassed with `as` cast
- Validation is not enforced by the type system

#### Option 2: Class with TypeScript `private`

```typescript
class LicenseKey {
  private value: string;
  constructor(value: string) {
    this.value = value;
  }
}

class DeviceId {
  private value: string;
  constructor(value: string) {
    this.value = value;
  }
}
```

**Pros:**
- Familiar syntax

**Cons:**
- `private` is compile-time only
- Structurally equivalent classes are still compatible:
  ```typescript
  const key = new LicenseKey('abc');
  const device: DeviceId = key;  // No error!
  ```

#### Option 3: Class with JavaScript `#` Private Fields

```typescript
class LicenseKey {
  #brand: void;
  constructor(readonly value: string) {
    if (!value || value.trim() === '') {
      throw new Error('Invalid license key');
    }
  }
}

class DeviceId {
  #brand: void;
  constructor(readonly value: string) {
    if (!value) {
      throw new Error('Invalid device id');
    }
  }
}
```

**Pros:**
- True nominal typing (each class's `#brand` is a distinct field)
- Cannot be bypassed with `as` cast
- Validation is enforced (must go through constructor)
- Runtime enforcement (ES2022 feature)
- Concise syntax using `readonly` parameter property

**Cons:**
- Runtime object allocation (not a primitive)

### Decision

Use **Option 3: Class with JavaScript `#` private fields**.

### Rationale

- The primary goal is to guarantee that values entering the domain layer have been validated
- `#` private fields make each class nominally distinct, preventing accidental type confusion
- The constructor enforces validation—there is no way to create an instance without passing validation
- The runtime cost (object allocation) is acceptable for domain objects that are not created in high volume

### Comparison Table

| Approach | Nominal Typing | Validation Enforced | Runtime Cost |
|----------|---------------|---------------------|--------------|
| Branded Types | Weak (bypassable) | No | None |
| `private` keyword | No | Yes | Object |
| `#` private fields | Yes | Yes | Object |

### Example Usage

```typescript
// Domain layer
class LicenseKey {
  #brand: void;
  constructor(readonly value: string) {
    if (!/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(value)) {
      throw new Error('Invalid license key format');
    }
  }

  equals(other: LicenseKey): boolean {
    return this.value === other.value;
  }
}

class DeviceId {
  #brand: void;
  constructor(readonly value: string) {
    if (!value) {
      throw new Error('Invalid device id');
    }
  }
}

// Domain entity with multiple fields
class License {
  #brand: void;
  constructor(
    readonly key: LicenseKey,
    readonly status: LicenseStatus,
    readonly validUntil: Date,
  ) {}

  isValid(): boolean {
    return this.status === 'active' && this.validUntil > new Date();
  }
}

// UseCase layer (interface)
interface LicenseApiClient {
  activate(key: LicenseKey, deviceId: DeviceId): Promise<...>;
}

// Cannot compile:
const key = new LicenseKey('VALID-KEY1-HERE');
const device = new DeviceId('device-123');
client.activate(device, key);  // Error: argument types are swapped
```
