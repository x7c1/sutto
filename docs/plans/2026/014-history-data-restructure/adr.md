# Architecture Decision Record

## ADR-1: Compaction Trigger Strategy

### Context

The event log (JSONL) file needs periodic compaction to prevent unbounded growth. We needed to decide when to trigger compaction.

### Options Considered

#### Option A: Count-based only

Compact when event count exceeds a threshold (chosen: 5000 events).

**Pros:**
- Simple to implement and understand
- Predictable behavior

**Cons:**
- File may contain many invalid entries (deleted layoutIds) without triggering compaction

#### Option B: Count-based + Garbage ratio

Compact when either:
- Event count exceeds threshold, OR
- \>50% of events are invalid (layoutId no longer exists)

This is a pattern used in log-structured storage systems (LSM-trees, LevelDB, RocksDB) where "tombstone ratio" triggers compaction.

**Pros:**
- Keeps file clean even when small
- Well-known pattern in database systems

**Cons:**
- Added complexity
- Minimal benefit for small files (a few KB of "garbage" doesn't matter)
- Filtering already happens in memory during load(), so file cleanliness doesn't affect runtime performance

### Decision

**Chose Option A: Count-based only**

### Rationale

- Simplicity outweighs the marginal benefit of garbage-ratio triggering
- For a small JSONL file (typical usage: hundreds of events), keeping invalid entries until the 1000-event threshold is acceptable
- The filtering of invalid entries happens in memory during load(), so the "dirty" file doesn't impact functionality
- The garbage-ratio pattern is valuable for large-scale databases but overkill for this use case
