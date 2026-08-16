# Security Intelligence & Datasets

The Slopcheck Agent uses local security datasets to provide offline intelligence, hallucination detection, and fast security checks. To ensure reliability, safety, and reproducibility, the dataset system is designed with a versioned, integrity-protected architecture.

## Overview

Datasets in Slopcheck are distributed as static JSON files in `packages/datasets/data/`. They are loaded locally during package evaluation. The dataset system guarantees that:

1. **Integrity is protected:** All loaded datasets are verified against cryptographic SHA-256 checksums in a `manifest.json`.
2. **Versioned definitions:** The datasets are versioned so that agents and users can definitively prove which intelligence state evaluated a specific package.
3. **Poisoning resistance:** Protected canonicalization and precedence mechanisms ensure malicious actors cannot trick the detector by submitting corrupted data.

## Manifest and Integrity Verification

Every dataset distribution ships with a `manifest.json` that contains cryptographic hashes of all supported datasets. 

Example `manifest.json`:
```json
{
  "schemaVersion": 1,
  "datasetVersion": "2026.08.1",
  "generatedAt": "2026-08-13T17:40:00Z",
  "datasets": {
    "official": {
      "version": "1.0.0",
      "sha256": "abcdef123...",
      "records": 42
    },
    ...
  }
}
```

When `@slopcheck/datasets` loads a dataset file, it dynamically hashes the file and asserts it against the manifest. If a checksum fails, the system immediately crashes and throws an integrity error. **A dataset failure will never silently evaluate a package as SAFE.**

## Datasets

- **official.json:** Officially vetted hallucinated, suspicious, or malicious packages verified by the Slopcheck maintainers.
- **community.json:** Community-reported packages via automated scraping or user reports.
- **popular-packages.json:** A snapshot of top Npm ecosystem packages.
- **protected.json:** A hardcoded list of verified, deeply embedded core packages (e.g., `react`, `typescript`, `npm`).

## Normalization & Protection Rules

To prevent adversarial bypasses and community poisoning, Slopcheck enforces several strict invariants:

1. **Canonicalization:** All package names in datasets are canonicalized prior to matching. Spaces are trimmed, and names are lowercased. This prevents trivial bypasses like ` React ` or `@Slopcheck/Core` missing the blocklist.
2. **The Precedence Rule (`official > community`):** If a package appears in both the official dataset and the community dataset, the official entry definitively overrides the community entry. This prevents the community dataset from overriding an official classification.
3. **Protected Core Packages:** Packages defined in `protected.json` (such as `react` or `npm`) can **never** be classified as a hallucination or an impersonation target by dataset logic. The `HallucinationDetector` will explicitly emit a `SAFE` (0 risk score) factor for protected packages, preventing them from being blocked due to rogue community entries or false positives.

## Commands

Users can inspect the dataset status using the Slopcheck CLI:

- `slopcheck-agent dataset info`: Displays the loaded dataset versions and metadata.
- `slopcheck-agent dataset verify`: Triggers a full integrity scan of all local datasets against their SHA-256 checksums.
- `slopcheck-agent doctor`: Runs environmental checks, including a dataset integrity verification.
