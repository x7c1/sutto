# ADR: UI Component Sharing Between Extension and Preferences

## Status

Accepted

## Context

The Space toggle visibility feature requires displaying Miniature Space visualizations in both:
1. The main panel (runs in GNOME Shell process, uses Clutter/St)
2. The Preferences window (runs in separate GTK process, uses GTK4/Adwaita)

We investigated whether UI components could be shared between these contexts to avoid code duplication.

## Investigation Findings

### Process Separation

- **Extension main code**: Runs in the GNOME Shell process
- **Preferences window**: Runs in a separate GTK process via `gnome-extensions prefs`

These are completely separate processes with no shared memory or widget context.

### Rendering System Incompatibility

| Aspect | GNOME Shell | Preferences |
|--------|-------------|-------------|
| Toolkit | Clutter/St | GTK4 |
| Rendering | OpenGL via Cogl | GSK (GTK Scene Graph Kit) |
| Widgets | St.Widget, St.Button | Gtk.Widget, Gtk.Button |
| Layout | Clutter.FixedLayout | Gtk.Box, Gtk.Grid |

These are fundamentally different rendering pipelines with no common abstraction.

### Embedding Options Evaluated

1. **GTK in Clutter (GtkClutter.Actor)**: Not viable for GNOME Shell extensions because Shell uses internal Clutter copies, and process separation prevents widget passing.

2. **Clutter in GTK**: Not possible - Clutter actors cannot be instantiated outside the Shell process.

3. **Gtk.DrawingArea in both contexts**: Not possible - St containers cannot embed GTK widgets.

### What CAN Be Shared

The following framework-independent code can be shared:

- **Type definitions** (`src/app/types/`)
- **Constants** (`src/app/constants.ts`)
- **Repository layer** (`src/app/repository/`)
- **Layout calculation logic** (`src/app/ui/space-dimensions.ts`)
- **Layout expression evaluator** (`src/app/layout-expression/`)

### What CANNOT Be Shared

- Widget instantiation (St.Widget vs Gtk.Widget)
- Event handling (Clutter events vs GTK signals)
- Styling (St CSS strings vs GTK CSS providers)
- Shell APIs (global.display, Meta.Cursor, Main.layoutManager)

## Options

### Option A: Share business logic, separate UI implementations

Create parallel UI implementations:
- Keep existing Clutter/St-based `miniature-space.ts` for main panel
- Create new GTK-based `gtk-miniature-space.ts` for Preferences
- Both import shared types, constants, and calculation logic

**Pros:**
- Follows GNOME Shell extension best practices
- Each UI optimized for its native toolkit
- Clear separation of concerns
- Shared data layer ensures consistency

**Cons:**
- Two UI implementations to maintain
- Visual differences possible between implementations

### Option B: Custom rendering abstraction layer

Create an abstract rendering interface with Clutter and GTK implementations.

**Pros:**
- Single "source of truth" for rendering logic

**Cons:**
- High complexity for minimal benefit
- Must reinvent event handling, styling, layout management
- Performance overhead from abstraction
- Harder to leverage toolkit-specific features

### Option C: Simplified Preferences UI

Use simple text/icon representation in Preferences instead of visual preview.

**Pros:**
- Minimal implementation effort
- No duplication

**Cons:**
- Poor user experience
- Inconsistent with main panel appearance

## Decision

**Option A: Share business logic, separate UI implementations**

This is the industry-standard pattern used by successful GNOME Shell extensions. The codebase already demonstrates correct separation with framework-independent types and data models.

## Implementation

### Directory Structure

```
src/app/
├── types/                    (shared)
├── constants.ts              (shared)
├── repository/               (shared)
├── ui/                       (Shell-specific)
│   ├── miniature-space.ts
│   ├── miniature-display.ts
│   └── space-dimensions.ts   (calculation logic, shared)
src/settings/
├── preferences.ts
└── gtk-miniature-space.ts    (GTK-specific, NEW)
```

### GTK Implementation Approach

The GTK Miniature Space will use:
- `Gtk.DrawingArea` with Cairo for custom rendering
- Same color constants from `constants.ts`
- Same dimension calculations from `space-dimensions.ts`
- Layout data from shared repository

## Consequences

- Preferences will have its own GTK-based Miniature Space implementation
- Both implementations share types, constants, and calculation logic
- Visual appearance may have minor differences due to toolkit rendering
- Future UI changes may require updates in both implementations
