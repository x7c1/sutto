# Claude AI Guidelines

## Documentation

**DRY Principle**: Write each piece of information in ONE place only.

- **README.md**: Overview and command reference only
- **docs/guides/**: Detailed explanations

Never duplicate content across files.

### Markdown Files (100+ lines)
- Always include an Overview section at the beginning
- The Overview should summarize the document's purpose and key points
- This is critical because automated tools may read only the beginning of .md files
- Without an Overview at the top, tools cannot understand the document's content

## Code Quality

After making code changes, always run:

```bash
npm run build && npm run check && npm run test:run
```

Fix any issues before considering the task complete.

## Code Structure

**Declaration Order**: Place important and public declarations first, private ones below.

1. **Public API first** (exported functions, classes)
2. **Internal helpers below** (private functions, utilities)

This makes the code easier to understand - readers see the public interface immediately.

## Comments

**Avoid Obvious Comments**: Don't write comments that merely restate what the code does.

❌ **Bad** (obvious comment):
```typescript
// Initialize monitor manager
this.monitorManager = new MonitorManager();
```

✅ **Good** (explains WHY):
```typescript
// Load history lazily to avoid I/O until the panel is actually used
this.ensureHistoryLoaded();
```

✅ **Better** (self-documenting code needs no comment):
```typescript
this.monitorManager = new MonitorManager();
```

**When to comment**:
- Explain WHY something is done (rationale, constraints, gotchas)
- Document non-obvious behavior or side effects
- Add context that isn't clear from code alone

**When NOT to comment**:
- Don't explain WHAT the code does (the code itself shows that)
- Don't add comments that duplicate the code in natural language

