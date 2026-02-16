# Architecture Decision Record: TypeScript Target Configuration

## Status
Accepted

## Context

When setting up TypeScript for GNOME Shell extension development, we need to choose an appropriate ECMAScript target version that:
- Matches the JavaScript runtime capabilities of GJS/SpiderMonkey in GNOME Shell 42
- Provides access to modern JavaScript features for better developer experience
- Ensures compiled code runs without compatibility issues
- Balances between feature availability and maximum compatibility

GNOME Shell 42 uses GJS with SpiderMonkey 91 (based on Firefox ESR 91, released August 2021). Different ECMAScript target versions offer different feature sets and compatibility levels.

## Decision

We will use **ES2020** as the TypeScript compilation target.

**Key Configuration:**
- `target`: "ES2020"
- `lib`: ["ES2020"]
- `module`: "commonjs" (for GNOME 42 compatibility with old imports system)

## Rationale

### SpiderMonkey 91 Capabilities

According to the [SpiderMonkey Newsletter (Firefox 90-91)](https://spidermonkey.dev/blog/2021/07/19/newsletter-firefox-90-91.html), SpiderMonkey 91 provides:
- **Full ES2020 support** - All ES2020 features are completely supported
- **Most ES2021 features** - Including Private Fields, .at(), Error Cause, Object.hasOwn
- **Some ES2022 features** - Partial support for newer features

### Why ES2020 is Optimal

**Advantages of ES2020:**
- Guaranteed full compatibility with SpiderMonkey 91
- Access to modern features:
  - Optional Chaining (`?.`)
  - Nullish Coalescing (`??`)
  - Promise.allSettled
  - BigInt
  - globalThis
  - String.prototype.matchAll
  - Dynamic import()
- Well-tested and stable feature set
- No risk of using unsupported features

## Alternatives Considered

### Alternative 1: ES2019
**Pros:**
- Maximum compatibility with older SpiderMonkey versions
- Conservative, safe choice

**Cons:**
- Missing important modern features (Optional Chaining, Nullish Coalescing)
- Unnecessarily restrictive for GNOME 42's capabilities
- Less developer-friendly

**Verdict:** Rejected - Too conservative and leaves modern features unused

### Alternative 2: ES2021
**Pros:**
- Access to additional features (Private Fields, .at(), String.prototype.replaceAll)
- More modern feature set

**Cons:**
- Not all ES2021 features are guaranteed to work
- Potential compatibility issues with edge cases
- Less predictable behavior

**Verdict:** Rejected - Unnecessary risk when ES2020 provides excellent feature set

### Alternative 3: ES2022
**Pros:**
- Most modern features available
- Latest ECMAScript standard at time of decision

**Cons:**
- SpiderMonkey 91 only has partial ES2022 support
- High risk of runtime errors with unsupported features
- May require polyfills or workarounds

**Verdict:** Rejected - Too aggressive, significant compatibility risks

## Consequences

### Positive
- TypeScript can compile using all ES2020 features without issues
- Developers can use modern JavaScript syntax (optional chaining, nullish coalescing, etc.)
- No runtime compatibility issues with GNOME Shell 42
- Clear, well-defined feature boundary
- Good balance between modern features and stability

### Negative
- Cannot use some ES2021+ features without manual verification
- May need to update target if migrating to newer GNOME Shell versions
- Developers need to be aware of target limitations

### Neutral
- Need to document which features are available
- May need to lint/warn when using features beyond ES2020

## References
- [GNOME 42 to depend on SpiderMonkey 91](https://discourse.gnome.org/t/gnome-42-to-depend-on-spidermonkey-91/8665) - Official announcement
- [SpiderMonkey Newsletter (Firefox 90-91)](https://spidermonkey.dev/blog/2021/07/19/newsletter-firefox-90-91.html) - Feature documentation
- [ECMAScript 2016+ compatibility table](https://compat-table.github.io/compat-table/es2016plus/) - Compatibility reference
- [Firefox 91 for developers - MDN](https://developer.mozilla.org/en-US/docs/Mozilla/Firefox/Releases/91) - Firefox 91 features

## Notes
- This decision is specific to GNOME Shell 42
- Future versions (e.g., GNOME Shell 45+) may use newer SpiderMonkey versions
- When upgrading GNOME Shell target version, revisit this decision
- The module system decision (CommonJS vs ESM) is separate and based on GNOME Shell 42's imports mechanism

