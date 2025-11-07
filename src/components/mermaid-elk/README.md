# Mermaid ELK Layout Engine

This directory contains code adapted from `@mermaid-js/layout-elk` v0.2.0.

## Source

The code in this directory is taken from the official Mermaid.js ELK layout package:

- **Package**: `@mermaid-js/layout-elk`
- **Version**: 0.2.0
- **Repository**: https://github.com/mermaid-js/mermaid
- **License**: MIT

## Why Bundled?

Instead of installing `@mermaid-js/layout-elk` as a separate package, we've integrated the essential code directly into the design system for the following reasons:

1. **Single ELK instance**: Uses our bundled `elkjs` 0.11.0 (compatible with the original 0.9.3)
2. **No duplication**: Console repo already has `elkjs` for react-flow layouts
3. **Simplicity**: Everything bundled together
4. **Full control**: Direct access to the sophisticated mermaid-specific ELK layout logic

## Files

- **`layouts.ts`**: ELK layout loader definitions for mermaid registration
- **`render.ts`**: Main rendering logic with mermaid-specific ELK optimizations (1090+ lines)
- **`geometry.ts`**: Node/edge intersection and boundary calculations
- **`find-common-ancestor.ts`**: Tree traversal utilities for subgraph handling

## Modifications

The code has been adapted to:

- Use our bundled `elkjs` 0.11.0 from the design system
- Follow our TypeScript and formatting conventions
- Remove package-specific build configurations

## Updates

This code is relatively stable. If updating to a newer version of `@mermaid-js/layout-elk`:

1. Download the new version's source
2. Copy the relevant files from `src/`
3. Ensure imports point to our bundled `elkjs`
4. Run formatting/linting to match our conventions
