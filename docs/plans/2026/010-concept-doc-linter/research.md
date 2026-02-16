# Research: Lemmatization Libraries for Rust

## Overview

This document records research findings on Rust lemmatization libraries, specifically regarding multi-word expression (MWE) support.

## nlprule

- Repository: https://github.com/bminixhofer/nlprule
- Documentation: https://docs.rs/nlprule/latest/nlprule/

### Features

- Fast, low-resource NLP library written in Rust
- Uses LanguageTool resources
- Supports English, German, and Spanish
- Provides: sentence segmentation, part-of-speech tagging, lemmatization, chunking, disambiguation

### Limitations

- No obvious support for custom multi-word expression dictionaries
- Tokenizer splits text into individual words before lemmatization
- "Layout Group" would be split into "Layout" and "Group" separately

### Conclusion (Tentative)

Based on initial research, nlprule may require custom pre-processing for multi-word expressions. However, **this needs verification**:

- Multi-word expressions are extremely common in natural language
- A mature NLP library likely has some form of MWE support
- Need to investigate: custom dictionary, phrase chunking, or gazetteer features
- Check LanguageTool documentation (nlprule's upstream) for MWE handling

**Action required:** Verify MWE support before implementing custom handling.

## Alternative Approaches

### Option 1: Pre-processing with regex

Match multi-word expressions before lemmatization:

1. Build a list of multi-word Domain Models from directory names
2. Use regex to find and mark these phrases
3. Process remaining text with nlprule

Pros:
- Simple to implement
- No additional dependencies

Cons:
- Need to generate plural forms ourselves (e.g., "Layout Groups")
- Maintenance overhead

### Option 2: Find a library with MWE support

Look for NLP libraries that natively support custom multi-word expressions.

Candidates to investigate:
- rust-bert (transformer-based, may be overkill)
- Custom tokenizer with phrase dictionary

### Option 3: Use a different language

Python's spaCy has excellent MWE support with custom phrase matching. Could be used as a subprocess or via PyO3 bindings.

## Related Crates

### decompound

- https://docs.rs/decompound/latest/decompound/
- Handles German-style compound words (e.g., "railroad" → "rail" + "road")
- Opposite of what we need (we need to detect phrases, not split compounds)

### symspell

- https://crates.io/crates/symspell
- Has `lookup_compound` for compound word suggestions
- Focused on spell-checking, not NLP

## Recommendation

**Priority: Investigate MWE support first.**

1. Verify if nlprule supports custom multi-word expressions (check LanguageTool docs)
2. If yes: use built-in support (no custom implementation needed)
3. If no: evaluate alternatives or implement Option 1 (regex pre-processing)

## Open Questions

- How to handle plural forms of multi-word expressions? (e.g., "Layout Groups")
- Should we use a simple rule-based approach (add "s") or a more sophisticated method?
- Are there edge cases with irregular plurals in our Domain Models?
