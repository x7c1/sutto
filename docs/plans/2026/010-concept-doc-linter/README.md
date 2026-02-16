# Concept Doc Linter

Status: Draft

## Overview

A build-time tool that validates Concept Docs and automatically converts Domain Model terms to markdown links.

## Background

Concept Docs define the shared vocabulary (Domain Models) for the product. To maintain consistency:
- All Domain Models should be capitalized and linked
- Undefined terms should be detected and flagged
- Links should be created automatically to reduce manual effort and token consumption

## Goals

- Detect Domain Model terms (capitalized words matching `docs/concepts/*/` directories)
- Automatically convert detected terms to markdown links
- Flag undefined terms (capitalized words not matching any Domain Model)
- Minimize token consumption by making the process mechanical

## Requirements

### Multi-word Expression Handling

Domain Models can be multi-word (e.g., "Layout Group").

**Investigation required first:**
- Verify whether nlprule (or alternative libraries) supports custom multi-word expression dictionaries
- Multi-word expressions are extremely common; mature NLP libraries likely support them
- If supported, simply provide our Domain Model list to the library

**Fallback approach (only if library doesn't support MWE):**

1. Generate multi-word expression list from directory names (e.g., `layout-group/` → "Layout Group", "Layout Groups")
2. Match multi-word expressions first (using regex or string matching)
3. Then process remaining single words with lemmatization

See [research.md](./research.md) for details on library limitations.

### Undefined Term Detection

- Capitalized words are treated as Domain Model candidates
- Lowercase words are treated as general terms (skipped)
- Use lemmatization to normalize words to base forms (e.g., "Displays" → "Display")
- Build a dictionary from `docs/concepts/*/` directory names
- Flag capitalized words whose lemma does not match any Domain Model

Example output:
```
Warning: "Monitor" in space/README.md:7 is not a defined Domain Model
```

### Automatic Link Conversion

- Detect Domain Model terms via lemmatization (e.g., "Display", "Displays" → links to display/)
- Convert to markdown links: `Display` → `[Display](../display/)`
- Process all markdown files in `docs/concepts/`
- Support both `--check` mode (validate only) and `--fix` mode (auto-convert)

## Technical Approach

- Language: Rust
- Lemmatization: [nlprule](https://github.com/bminixhofer/nlprule) (LanguageTool-based, English support)
- Dictionary: Auto-generated from `docs/concepts/*/` directory names
- Integration: Binary executable, called via npm script

## Implementation Steps

- **Investigate nlprule's multi-word expression support first**
  - If supported: use library's built-in MWE handling
  - If not: evaluate alternative libraries or implement fallback
- Set up Rust project with chosen library
- Create module to scan `docs/concepts/*/` for Domain Model names
- Implement lemmatization-based term detection
- Implement undefined term detection
- Implement automatic link conversion for Domain Model terms
- Build binary and add npm script for integration
- Add to CI pipeline

## Out of Scope

- Synonym/alias detection (e.g., detecting "monitor" should be "Display")
- Cross-referencing with code to ensure types match Domain Models
- Collocation validation (checking correct verb usage with Domain Models)
  - Future extension: AI reads relevant Concept Docs and validates collocations contextually
