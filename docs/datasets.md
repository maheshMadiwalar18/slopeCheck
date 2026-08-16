# Security Intelligence & Datasets

The Slopcheck Agent uses local security datasets to provide offline intelligence, hallucination detection, and fast security checks. To ensure reliability, safety, and reproducibility, the dataset system is designed with a versioned, integrity-protected architecture.

## Overview

Datasets in Slopcheck are distributed as static JSON files in `packages/datasets/data/`. They are loaded locally during package evaluation. The dataset system guarantees that:

1. **Integrity is protected:** All loaded datasets are verified against cryptographic SHA-256 checksums in a `manifest.json`.
2. **Versioned definitions:** The datasets are versioned so that agents and users can definitively prove which intelligence state evaluated a specific package.
3. **Poisoning resistance:** Protected canonicalization and precedence mechanisms ensure malicious actors cannot trick the detector by submitting corrupted data.

## Manifest and Integrity Verification

Every dataset distribution ships with a `manifest.json` that contains cryptographic hashes of all supported datasets. When `@slopcheck/datasets` loads a dataset file, it dynamically hashes the file and asserts it against the manifest. If a checksum fails, the system immediately crashes and throws an integrity error. **A dataset failure will never silently evaluate a package as SAFE.**

## Community Dataset Contribution

We welcome community contributions to help identify hallucinated packages. However, to maintain trust, **community data does not automatically become trusted.** All entries require validation by maintainers.

### How to Submit a Hallucination Entry

To submit a new hallucinated package to the community dataset, please open a PR modifying `packages/datasets/data/community.json`.

Your PR description **must** include the following required information:

- **Package Name:** The exact name of the hallucinated package.
- **Evidence:** A screenshot, chat log, or link showing an AI agent generating this package name.
- **Source:** Which AI model or tool generated the hallucination (e.g., Claude 3.5 Sonnet, GPT-4o, Cursor).
- **Date:** When the hallucination was observed.
- **Reasoning:** Why you believe this is a hallucination and not just a typo.

### Normalization & Protection Rules

To prevent adversarial bypasses and community poisoning, Slopcheck enforces several strict invariants:

1. **Canonicalization:** All package names in datasets are canonicalized prior to matching. Spaces are trimmed, and names are lowercased.
2. **The Precedence Rule (`official > community`):** If a package appears in both datasets, the official entry definitively overrides the community entry.
3. **Protected Core Packages:** Packages defined in `protected.json` (such as `react` or `npm`) can **never** be classified as a hallucination or an impersonation target by dataset logic.

## Commands

Users can inspect the dataset status using the Slopcheck CLI:

- `slopcheck-agent dataset info`: Displays the loaded dataset versions and metadata.
- `slopcheck-agent dataset verify`: Triggers a full integrity scan of all local datasets against their SHA-256 checksums.
- `slopcheck-agent doctor`: Runs environmental checks, including a dataset integrity verification.
