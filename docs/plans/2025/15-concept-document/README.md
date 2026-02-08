# Concept Documentation - Ubiquitous Language

Status: Completed

## Overview

Create hierarchical concept documentation (`docs/concepts/`) that defines the ubiquitous language for the Snappa project. This documentation will establish core domain concepts and terminology used consistently across code, documentation, and discussions, following Domain-Driven Design (DDD) principles.

## Background

### Current Situation
- The codebase has evolved through multiple refactorings
- Terminology has changed over time (e.g., "snap menu" → "main panel", "preset" → "layout")
- Historical planning documents in `docs/issues/` preserve old terminology as records
- New contributors (including AI assistants) may learn outdated terms from historical documents
- No central reference for current, canonical terminology

### Problem Statement
Without a concept document defining ubiquitous language:
- New team members are confused by inconsistent terminology
- Code reviews may use different terms for the same concept
- AI assistants learn outdated terminology from historical documents
- Refactoring decisions lack clear terminology guidelines
- Domain knowledge is scattered across codebase and individual understanding

## Requirements

### Functional Requirements
- **Core Concepts Definition**: Define each major domain concept with:
  - Clear, precise definition
  - Code locations (files, classes, functions)
  - Relationships to other concepts
  - User-facing manifestation
- **Terminology Consistency**: Establish canonical terms for all key concepts
- **Historical Context**: Document renamed/deprecated terms with migration history
- **Code Mapping**: Link concepts to actual code locations
- **Living Document**: Easy to update as domain evolves

### Technical Requirements
- Format: Markdown files in hierarchical structure
- Location: `docs/concepts/` directory (organized by topic)
- Entry point: `docs/concepts/README.md` (top page with navigation)
- Version controlled: Track terminology evolution via Git
- DRY principle: Reference from other docs, don't duplicate
- Scalability: Support future growth of concepts through subdirectories

### Documentation Structure Requirements
- **Conceptual Organization**: Group by domain area, not alphabetically
- **Relationships**: Show how concepts relate to each other
- **Examples**: Include code snippets and user scenarios where helpful
- **Navigation**: Easy to scan and find specific concepts

## Implementation Plan

### Phase 1: Directory Structure and Index Page

**Goal**: Create the hierarchical concept documentation structure

#### Directory Structure

```
docs/concepts/
├── README.md              # Top page with overview and navigation
├── core/                 # Core domain concepts
│   ├── main-panel.md
│   ├── layout.md
│   ├── layout-group.md
│   └── category.md
├── ui/                   # UI component concepts
│   ├── layout-button.md
│   ├── miniature-display.md
│   └── footer.md
├── repository/                 # Data layer concepts
│   ├── layout-expression.md
│   ├── layout-repository.md
│   └── layout-history.md
└── historical/           # Deprecated terminology
    └── terminology-changes.md
```

#### Tasks
- Create `docs/concepts/` directory
- Create subdirectories: `core/`, `ui/`, `repository/`, `historical/`
- Create `README.md` as entry point with navigation
- Define README.md structure:
  - Introduction explaining purpose and DDD context
  - Navigation to concept categories
  - Quick reference table
  - How to use this documentation

#### Index Page Template (`docs/concepts/README.md`)

```markdown
# Concepts - Ubiquitous Language

## Introduction

This documentation defines the core concepts and terminology used throughout the Snappa codebase, documentation, and team discussions. These terms form our **ubiquitous language** - the shared vocabulary that ensures consistent communication between domain experts, developers, and documentation.

### Purpose
- Establish canonical terminology for domain concepts
- Provide clear definitions accessible to all team members
- Link abstract concepts to concrete code implementations
- Document terminology evolution (historical terms)
- Serve as reference for code reviews and discussions

### Using This Documentation
- **Writing Code**: Use these exact terms for variables, classes, and functions
- **Code Reviews**: Check terminology consistency against these concepts
- **Documentation**: Reference these concepts, don't redefine them
- **Discussions**: Use this vocabulary in issues, PRs, and planning

---

## Concept Categories

### [Core Concepts](core/)
Fundamental domain entities that form the backbone of the system.

- **[Main Panel](core/main-panel.md)** - The primary UI component displaying layout options
- **[Layout](core/layout.md)** - Window position and size configuration
- **[Layout Group](core/layout-group.md)** - Collection of related layouts
- **[Category](core/category.md)** - High-level grouping of layout groups

### [UI Concepts](ui/)
User interface components and visual elements.

- **[Layout Button](ui/layout-button.md)** - Clickable button representing a layout option
- **[Miniature Display](ui/miniature-display.md)** - Visual preview of layout group
- **[Footer](ui/footer.md)** - Bottom section with branding and settings

### [Repository Concepts](repository/)
Data structures, persistence, and state management.

- **[Layout Expression](repository/layout-expression.md)** - Expression language for positions/sizes
- **[Layout Repository](repository/layout-repository.md)** - Persistence layer for layouts
- **[Layout History](repository/layout-history.md)** - Per-application layout selection tracking

### [Historical Terms](historical/)
Deprecated terminology and migration context.

- **[Terminology Changes](historical/terminology-changes.md)** - Evolution of terms over time

---

## Quick Reference

| Current Term | Code Location | Old Term(s) |
|-------------|---------------|-------------|
| Main Panel | `src/app/main-panel/` | Snap Menu |
| Layout | `src/app/types/layout.ts` | Preset |
| Layout Group | `src/app/types/layout.ts` | - |
| Layout Button | `src/app/ui/layout-button.ts` | - |

---

## Next Steps

New to the project? Start with:
1. [Main Panel](core/main-panel.md) - understand the primary UI
2. [Layout](core/layout.md) - understand window configurations
3. [Historical Terms](historical/terminology-changes.md) - learn what changed
```

#### Concept File Template (`docs/concepts/core/main-panel.md`)

```markdown
# Main Panel

### Main Panel
The primary UI component that displays layout options to the user.

**Definition**: A modal panel that appears at the cursor position when a user drags a window to a screen edge. It presents available layout options grouped by category, allowing users to snap the window to a predefined position and size.

**Code Locations**:
- Directory: `src/app/main-panel/`
- Main class: `MainPanel` (src/app/main-panel/index.ts)
- Renderer: `createPanelContainer()` (src/app/main-panel/renderer.ts)

**Key Responsibilities**:
- Display when window is dragged to screen edge
- Present layout options organized by category
- Apply selected layout to current window
- Auto-hide when user clicks outside or selects layout

**Related Concepts**: Layout, Category, Layout Button, Footer

**User Experience**: The visual menu that pops up during window dragging, showing miniature screen previews with clickable layout options.

---

### Layout
A window position and size configuration.

**Definition**: A specification defining where and how large a window should be positioned on screen. Layouts use expression-based coordinates and dimensions relative to the work area, enabling flexible positioning that adapts to different screen sizes.

**Data Structure**:
```typescript
interface Layout {
  id: string;        // Unique identifier (UUID)
  hash: string;      // Coordinate-based hash for duplicate detection
  label: string;     // Human-readable name (e.g., "Left Half")
  x: string;         // X position expression (e.g., "0")
  y: string;         // Y position expression (e.g., "0")
  width: string;     // Width expression (e.g., "50%")
  height: string;    // Height expression (e.g., "100%")
}
```

**Code Locations**:
- Type definition: `src/app/types/layout.ts`
- Repository: `src/app/repository/layouts.ts`
- Storage: `~/.local/share/gnome-shell/extensions/.../imported-layouts.json`

**Key Properties**:
- **Unique ID**: UUID generated when imported to repository
- **Hash**: Deterministic hash from coordinates (x, y, width, height) for duplicate detection
- **Expressions**: Position/size use expression language supporting percentages, arithmetic

**Related Concepts**: Layout Group, Layout Expression, Layout Button

**Lifecycle**:
1. Defined in settings (JSON or UI)
2. Imported to repository (ID and hash assigned)
3. Loaded into Main Panel
4. Applied to window when selected

---

### Layout Group
A collection of related layouts displayed together.

**Definition**: A set of layouts that share a common theme or positioning strategy (e.g., "Halves", "Thirds", "Corners"). Layout groups are visualized as a miniature screen preview with layout buttons positioned to match their actual screen locations.

**Data Structure**:
```typescript
interface LayoutGroup {
  name: string;       // Group name (e.g., "Halves")
  layouts: Layout[];  // Layouts in this group
}
```

**Code Locations**:
- Type: `src/app/types/layout.ts`
- UI rendering: `src/app/ui/miniature-display.ts`

**Visual Representation**: Miniature screen mockup showing multiple layout options with buttons positioned where windows would appear.

**Related Concepts**: Category, Layout, Miniature Display

**Examples**:
- "Halves": Left Half, Right Half
- "Corners": Top-Left, Top-Right, Bottom-Left, Bottom-Right
- "Thirds": Left Third, Center Third, Right Third

---

(Continue with other concepts...)
```

### Phase 2: Core Concept Files

**Goal**: Create individual files for core domain concepts

#### Files to Create
- `docs/concepts/core/main-panel.md`
- `docs/concepts/core/layout.md`
- `docs/concepts/core/layout-group.md`
- `docs/concepts/core/category.md`

Each file follows the same structure:
- Definition
- Data structure (if applicable)
- Code locations
- Key responsibilities/properties
- Related concepts
- User experience
- Examples/diagrams (if helpful)

### Phase 3: UI Concept Files

**Goal**: Create files for user interface component concepts

#### Files to Create
- `docs/concepts/ui/layout-button.md`
- `docs/concepts/ui/miniature-display.md`
- `docs/concepts/ui/footer.md`

### Phase 4: Data Concept Files

**Goal**: Create files for repository layer concepts

#### Files to Create
- `docs/concepts/repository/layout-expression.md`
- `docs/concepts/repository/layout-repository.md`
- `docs/concepts/repository/layout-history.md`

### Phase 5: Historical Terms Documentation

**Goal**: Document deprecated terminology and migration history in dedicated file

#### File: `docs/concepts/historical/terminology-changes.md`

```markdown
# Terminology Changes

## Overview

This document tracks the evolution of terminology in the Snappa project. When reading historical planning documents or old code, use this guide to understand deprecated terms.

---

## Historical Terms

These terms were used in earlier versions but have been superseded. They appear in historical planning documents (issues #1-#13) and old code comments.

### Snap Menu → Main Panel
**Timeline**: Used until November 2025

**Reason for Change**: "Main Panel" better reflects the component's role as the primary UI panel, not just a "menu". The term "snap" is specific to window snapping, while "main panel" is more generic and future-proof.

**Commit**: Renamed in 8a6b033 "refactor: rename snappa to app and snap-menu to main-panel"

**Where You'll See It**:
- Historical issues: #3, #4, #10, #11
- Commit messages before November 2025
- Old planning documents in `docs/issues/2025/`

**Migration**: When reading historical documents, mentally substitute "main panel" for "snap menu".

---

### Preset → Layout
**Timeline**: Used until October 2025

**Reason for Change**: "Layout" is more widely understood in window management contexts. "Preset" implies pre-configured only, while "layout" better conveys spatial arrangement.

**Commit**: Renamed in a042438 "refactor(snap): rename 'preset' to 'layout' for better clarity"

**Where You'll See It**:
- Early commits and issue #3
- Original design discussions

**Migration**: Direct 1:1 mapping - "preset" means "layout"
```

### Phase 6: Cross-References and Integration

**Goal**: Integrate concept documentation into existing documentation

#### Tasks
- Add link to `docs/concepts/` from `README.md`
- Update `docs/guides/` to reference concepts instead of redefining
- Add reference to new issue planning template
- Update CLAUDE.md to mention concept documentation

#### README.md Update

```markdown
## Documentation

- **[Concepts](docs/concepts/)** - Core domain concepts and ubiquitous language
- **[Architecture](docs/architecture/)** - System architecture documentation
- **[Guides](docs/guides/)** - Development guides and tutorials
```

#### CLAUDE.md Update

```markdown
## Documentation

**Ubiquitous Language**: Refer to `docs/concepts/` for canonical terminology. Use these exact terms in code, comments, and documentation.

- Index: [docs/concepts/README.md](../concepts/README.md)
- Quick reference for finding the right term
```

## File Modification Summary

**New Directory Structure**:
```
docs/concepts/
├── README.md                           # Entry point with navigation
├── core/
│   ├── main-panel.md
│   ├── layout.md
│   ├── layout-group.md
│   └── category.md
├── ui/
│   ├── layout-button.md
│   ├── miniature-display.md
│   └── footer.md
├── repository/
│   ├── layout-expression.md
│   ├── layout-repository.md
│   └── layout-history.md
└── historical/
    └── terminology-changes.md
```

**Modified Files (2)**:
- `README.md` - Add link to concepts documentation
- `CLAUDE.md` - Reference concepts for terminology consistency

**Total**: 12 new files (1 index + 11 concept files), 2 modified files

## Testing Plan

### Content Review
- Review each concept file for clarity and accuracy
- Verify code location references point to actual files
- Check that relationships between concepts are correctly described
- Ensure historical terms section is complete and accurate

### Navigation Testing
- Verify all links in `README.md` work correctly
- Test navigation between concept files
- Check relative links between related concepts
- Ensure quick reference table is accurate

### Cross-Reference Validation
- Verify all file paths and code references are valid
- Check that concept names match actual code (class names, variable names)
- Confirm commit hashes for historical renames are correct
- Validate internal links between concept files

### Usability Testing
- **New Contributor Perspective**: Can someone unfamiliar with the codebase understand core concepts?
- **Navigation**: Can specific concepts be found quickly via index?
- **Completeness**: Are all major domain concepts documented?
- **Structure**: Is the hierarchical organization intuitive?

### Integration Testing
- Verify links from `README.md` work
- Check links from `CLAUDE.md` work
- Verify concept documentation doesn't conflict with other docs
- Ensure DRY principle - no duplicate definitions in other docs

## Implementation Timeline

### Phase 1: Directory Structure and Index (Estimated: 2 points)
- Create `docs/concepts/` directory structure
- Create subdirectories: `core/`, `ui/`, `repository/`, `historical/`
- Write `README.md` with introduction, navigation, and quick reference
- Define templates for concept files

### Phase 2: Core Concept Files (Estimated: 2 points)
- Create `core/main-panel.md`
- Create `core/layout.md`
- Create `core/layout-group.md`
- Create `core/category.md`

### Phase 3: UI Concept Files (Estimated: 1 point)
- Create `ui/layout-button.md`
- Create `ui/miniature-display.md`
- Create `ui/footer.md`

### Phase 4: Data Concept Files (Estimated: 1 point)
- Create `repository/layout-expression.md`
- Create `repository/layout-repository.md`
- Create `repository/layout-history.md`

### Phase 5: Historical Terms Documentation (Estimated: 1 point)
- Create `historical/terminology-changes.md`
- Research terminology changes from Git history
- Document each rename with rationale and timeline
- Link to relevant commits and issues

### Phase 6: Cross-References and Integration (Estimated: 1 point)
- Update `README.md` with link to concepts
- Update `CLAUDE.md` with concepts reference
- Review existing guides for redundant definitions
- Add cross-references between concept files

**Total Estimated Effort**: 8 points

## Success Criteria

- All major domain concepts are documented with clear definitions
- Each concept has its own file for easy maintenance
- Code locations are accurate and up-to-date
- Historical terms are documented with migration context
- New contributors can understand domain concepts from the documentation
- Index page provides clear navigation to all concepts
- Documentation is referenced from `README.md` and `CLAUDE.md`
- No terminology duplication in other documentation (DRY principle)
- Terminology used matches actual code
- Hierarchical structure supports future growth

## Benefits

### For New Contributors
- Quick ramp-up on domain terminology
- Clear understanding of codebase concepts
- Reference for unfamiliar terms

### For Existing Team Members
- Shared vocabulary for discussions
- Reference during code reviews
- Guidance for naming new concepts

### For AI Assistants
- Learn current, accurate terminology
- Avoid outdated terms from historical documents
- Consistent language in generated code and documentation

### For Project Maintenance
- Track terminology evolution
- Inform refactoring decisions
- Preserve institutional knowledge

## Future Enhancements

### Additional Concept Categories
- `docs/concepts/workflows/` - Common user workflows
- `docs/concepts/technical/` - Implementation patterns
- `docs/concepts/architecture/` - System design concepts

### Visual Diagrams
- Add concept relationship diagrams in each file
- Create visual taxonomy of concepts in index
- Include UI screenshots with labeled components
- Add architecture diagrams for complex concepts

### Interactive Examples
- Link to live code examples from concept files
- Add runnable snippets demonstrating concepts
- Include test cases showing concept usage
- Cross-reference to `docs/guides/` for tutorials

### Concept Validation
- Add automated checks for terminology consistency
- Lint code for deprecated term usage
- Verify documentation references valid concepts
- Check for broken internal links

### Search and Discovery
- Add tags/keywords to concept files
- Create alphabetical index
- Add "related concepts" sections to each file
- Consider full-text search integration

## Notes

### Relationship to Planning Documents

**Historical Planning Documents** (`docs/issues/`):
- Purpose: Historical record of development decisions
- Status: Frozen, never updated after completion
- Terminology: May contain outdated terms (preserved as-is)

**Concept Documentation** (`docs/concepts/`):
- Purpose: Current, authoritative terminology reference
- Status: Living documentation, updated as domain evolves
- Terminology: Always reflects current codebase
- Structure: Hierarchical for scalability

**Complementary Roles**:
- Planning documents explain "what was done and why"
- Concept documentation explains "what things are called now"
- Together they provide historical context + current understanding

**Navigation Flow**:
```
Historical Issue (#3) uses "snap menu"
         ↓
User consults docs/concepts/historical/terminology-changes.md
         ↓
Learns "snap menu" → "main panel"
         ↓
Reads docs/concepts/core/main-panel.md for current definition
```

### DDD Principles Applied

This concept document embodies Domain-Driven Design principles:

1. **Ubiquitous Language**: Shared vocabulary used everywhere
2. **Bounded Context**: Clear scope (Snappa domain)
3. **Domain Model**: Concepts represent domain entities
4. **Continuous Refinement**: Document evolves with understanding
5. **Explicit Knowledge**: Domain knowledge made visible and shared

### Maintenance Responsibilities

**When to Update**:
- Adding new major features (new concepts)
- Renaming existing concepts (add to historical terms)
- Refactoring domain model (update definitions)
- Discovering ambiguities (clarify definitions)

**Who Updates**:
- Feature author: Updates when introducing new concepts
- Refactoring lead: Updates when changing terminology
- Maintainers: Periodic reviews for accuracy

**Review Process**:
- Concept additions/changes reviewed in PRs
- Terminology changes require explicit justification
- Breaking changes (renames) documented in historical terms section
