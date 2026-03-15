# Phase 2: Game File Extraction

This phase will add direct extraction of Fortnite game assets (.pak/.ucas/.utoc files) using AES keys tracked by Phase 1.

## Planned Approach

1. **AES Keys** — Already tracked in `data/aes/current.json` by the automated fetch script
2. **Asset Extraction** — Use [FModel](https://fmodel.app/) or a CUE4Parse-based tool to decrypt and extract game files
3. **Asset Processing** — Export textures, meshes, data tables, and other assets for diffing

## Requirements

- Windows with Fortnite installed (for .pak file access)
- [FModel](https://github.com/4sval/FModel) for interactive extraction
- Or a programmatic approach using CUE4Parse

## Current Status

Stubs are in `scripts/` — implementation pending.
