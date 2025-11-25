# Debugging and Logging Guide

This guide covers debugging techniques and logging methods for GNOME Shell extension development.

## Table of Contents

- [Using log() Function](#using-log-function)
- [Viewing Logs](#viewing-logs)
- [Log Filtering](#log-filtering)
- [Best Practices](#best-practices)

## Using log() Function

GNOME Shell provides a global `log()` function that outputs messages to the system journal.

### Basic Usage

```typescript
// Declare the log function in your TypeScript file
declare function log(message: string): void;

// Use it anywhere in your code
log('[MyExtension] Extension enabled');
log(`[MyExtension] Processing window: ${windowTitle}`);
```

### TypeScript Declaration

Add this declaration at the top of files that use logging:

```typescript
declare function log(message: string): void;
```

Or add it to your global type definitions file (e.g., `src/types/gnome-shell-42.d.ts`):

```typescript
declare function log(message: string): void;
```

## Viewing Logs

### Method 1: journalctl (Recommended)

View all GNOME Shell logs:

```bash
journalctl -f /usr/bin/gnome-shell
```

The `-f` flag follows the log (like `tail -f`), showing new messages in real-time.

### Method 2: journalctl with Filtering

Filter logs to show only your extension's messages:

```bash
journalctl -f /usr/bin/gnome-shell | grep "\[MyExtension\]"
```

Filter multiple components:

```bash
journalctl -f /usr/bin/gnome-shell | grep -E "\[WindowSnapManager\]|\[SnapMenu\]"
```

### Method 3: Looking Glass (Built-in Debugger)

GNOME Shell has a built-in debugger called "Looking Glass":

1. Press `Alt+F2`
2. Type `lg` and press Enter
3. Go to the "Errors" tab to see recent errors

### Method 4: View Recent Logs

View logs from the last hour:

```bash
journalctl --since "1 hour ago" /usr/bin/gnome-shell | grep "\[MyExtension\]"
```

View logs from a specific time:

```bash
journalctl --since "2025-11-24 13:00:00" /usr/bin/gnome-shell
```

## Log Filtering

### Basic Grep Patterns

Show only lines containing "error" or "Error":

```bash
journalctl -f /usr/bin/gnome-shell | grep -i "error"
```

Show lines matching multiple patterns:

```bash
journalctl -f /usr/bin/gnome-shell | grep -E "ERROR|WARNING|CRITICAL"
```

### Excluding Unwanted Messages

Exclude certain messages:

```bash
journalctl -f /usr/bin/gnome-shell | grep "\[MyExtension\]" | grep -v "debug"
```

### Saving Logs to File

Save logs to a file for later analysis:

```bash
journalctl /usr/bin/gnome-shell > gnome-shell.log
```

Save only your extension's logs:

```bash
journalctl /usr/bin/gnome-shell | grep "\[MyExtension\]" > my-extension.log
```

## Best Practices

### 1. Use Consistent Prefixes

Always use the same prefix format for easy filtering:

```typescript
// Good: Consistent prefix
log('[WindowSnapManager] Event occurred');
log('[WindowSnapManager] Processing data');

// Bad: Inconsistent
log('WindowSnapManager: Event occurred');
log('[WinSnap] Processing data');
```

### 2. Log Important Events

Log significant events in your extension:

```typescript
// Extension lifecycle
log('[Extension] Enabled');
log('[Extension] Disabled');

// User interactions
log('[SnapMenu] Menu shown at x=100, y=200');
log('[SnapMenu] Preset selected: Left Half');

// State changes
log('[WindowSnapManager] Drag started');
log('[WindowSnapManager] Drag ended');
```

### 3. Include Context in Logs

Provide enough context to understand what's happening:

```typescript
// Good: Context included
log(`[WindowSnapManager] Moving window to x=${x}, y=${y}, w=${width}, h=${height}`);

// Bad: Not enough context
log('[WindowSnapManager] Moving window');
```

### 4. Log Errors with Details

When catching errors, log detailed information:

```typescript
try {
    // Some operation
} catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    log(`[Extension] Error occurred: ${message}`);
}
```

### 5. Use Different Log Levels (Conceptually)

While `log()` doesn't have built-in levels, you can use prefixes:

```typescript
log('[Extension] DEBUG: Variable value = ' + value);
log('[Extension] INFO: Extension started');
log('[Extension] WARNING: Deprecated method used');
log('[Extension] ERROR: Failed to load configuration');
```

Then filter by level:

```bash
journalctl -f /usr/bin/gnome-shell | grep "\[Extension\] ERROR"
```

### 6. Remove Debug Logs Before Release

Comment out or remove verbose debug logs before releasing:

```typescript
// Development
log('[Extension] DEBUG: Internal state = ' + JSON.stringify(state));

// Production - remove or comment out debug logs
// log('[Extension] DEBUG: Internal state = ' + JSON.stringify(state));
```

## Troubleshooting

### Logs Not Appearing

If your logs don't appear in journalctl:

1. Check that GNOME Shell is running: `ps aux | grep gnome-shell`
2. Verify the extension is enabled: `gnome-extensions list --enabled`
3. Try restarting GNOME Shell: `Alt+F2` → `r` → Enter (X11 only)
4. Check for JavaScript errors in Looking Glass: `Alt+F2` → `lg`

## See Also

- [Development Workflow](./03-development-workflow.md) - Hot-reload and development setup
- [GNOME Shell Restart](./04-gnome-shell-restart.md) - When to restart GNOME Shell
- [GJS Guide - Logging](https://gjs.guide/guides/gjs/debugging.html) - Official GJS debugging guide
