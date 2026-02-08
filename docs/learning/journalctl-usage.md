# journalctl Usage for GNOME Shell Extension Development

## Overview

This document explains how to monitor logs for GNOME Shell extensions using `journalctl`.

## Basic Commands

### View Past Logs

View logs from the current boot session:

```bash
journalctl -b | grep -i "sutto" | grep -i "prefs" | tail -20
```

Options:
- `-b`: Show logs from current boot only
- `tail -20`: Show last 20 lines

### Real-time Log Monitoring

Monitor new logs as they appear (like `tail -f`):

```bash
# Method 1: Using journalctl's built-in grep (RECOMMENDED - most reliable)
journalctl -b -f --grep="sutto"

# Method 2: Using grep with --line-buffered (if you need multiple filters)
journalctl -b -f | grep --line-buffered -i sutto | grep --line-buffered -i prefs

# Method 3: Using stdbuf to disable buffering
journalctl -b -f | stdbuf -o0 grep -i sutto | stdbuf -o0 grep -i prefs
```

**Important**: Regular `grep` without `--line-buffered` will buffer output and NOT show logs in real-time!

Options:
- `-f`: Follow mode (like `tail -f`)
- `-n 20`: Start from last 20 lines
- `--grep`: Filter inside journalctl (most efficient and reliable)
- `-i`: Case-insensitive search
- `--line-buffered`: Force grep to output each line immediately
- `stdbuf -o0`: Disable output buffering

### Combined Approach

Show existing logs first, then monitor new ones:

```bash
# Terminal 1: View existing logs
journalctl -b | grep -i sutto | grep -i prefs | tail -20

# Terminal 2: Monitor new logs (use --line-buffered!)
journalctl -b -f | grep --line-buffered -i sutto | grep --line-buffered -i prefs
```

## Why Different Commands Show Different Results

### Real-time Monitoring (`journalctl -f`)

```bash
# WITHOUT --line-buffered (WRONG - logs won't appear in real-time!)
journalctl -f -o cat | grep -i sutto

# WITH --line-buffered (CORRECT - logs appear immediately)
journalctl -f -o cat | grep --line-buffered -i sutto
```

- Only shows **new logs** generated after the command starts
- Misses logs that were already written
- **Critical**: `grep` buffers output by default, use `--line-buffered` or `--grep` option

### Historical Search (`journalctl -b`)

```bash
journalctl -b | grep -i sutto
```

- Shows **all logs** from current boot session
- Includes logs generated before the command was run
- Better for debugging issues that already occurred

## Process-specific Logging

GNOME Shell extensions may log to different processes:

- **Extension runtime**: `gnome-shell` process
- **Preferences UI**: `gjs` process (separate)

To see both:

```bash
journalctl -b -f | grep -i sutto
```

## Recommended Workflow

1. **During development**: Use real-time monitoring with --grep
   ```bash
   journalctl -b -f --grep="sutto"
   ```

2. **Debugging issues**: Check historical logs first
   ```bash
   journalctl -b | grep -i sutto | tail -50
   ```

3. **Testing preferences**: Monitor with multiple filters
   ```bash
   journalctl -b -f | grep --line-buffered -i sutto | grep --line-buffered -i prefs
   ```

## Tips

- Use `-o cat` to remove metadata and show only log messages
- Use `--since "5 minutes ago"` to limit time range
- Use `--unit=gnome-shell` to filter by systemd unit (if available)
- Press `Ctrl+C` to stop following logs
- **Always use `--line-buffered` with `grep` when following logs**, or use `journalctl --grep` instead
- If logs still don't appear, try `stdbuf -o0 grep` instead of `grep --line-buffered`

## Common Pitfalls

### Logs Not Appearing in Real-time

❌ **Wrong** (logs are buffered):
```bash
journalctl -b -f | grep -i sutto
```

✅ **Correct** (use one of these):
```bash
# Option 1: Use journalctl's --grep
journalctl -b -f --grep="sutto"

# Option 2: Use grep --line-buffered
journalctl -b -f | grep --line-buffered -i sutto

# Option 3: Use stdbuf
journalctl -b -f | stdbuf -o0 grep -i sutto
```
