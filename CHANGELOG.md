# Changelog

All notable changes to this project will be documented in this file.

## [0.2.0] - Unreleased

### Added
- Official GitHub Action (`slopcheck-agent/action`) for scanning dependencies in CI/CD.
- Action supports configurable `fail-on` thresholds and native GitHub Actions Job Summaries.


## [0.1.0] - 2026-08-13

### Added
- Core Risk Engine for calculating supply chain security signals.
- Support for JSON output (`--json`) for automation and CI/CD.
- Configurable environment diagnostics via `doctor` command.
- Explanation engine via `explain` command for interpreting risk scores.

### Security
- Explicit assessment states (COMPLETE, PARTIAL, NOT_FOUND, UNAVAILABLE).
- Detector failure handling indicating PARTIAL or UNAVAILABLE states.
- Hard security signals that cannot be diluted by weak heuristic signals.
- Missing repository metadata heuristic.
- Package age and download activity heuristic.
- Registry retries and timeouts to prevent hanging on network failures.
- Security regression tests.

### Detection
- Hallucinated package detection against official and community datasets.
- Typosquatting and similarity detection.
- Scoped-package impersonation detection.

### CLI
- Native `slopcheck-agent` command-line application.
- `check` command to analyze individual packages.
- `scan` command to analyze an entire `package.json`.
- `explain` command to break down scoring mechanics.
- `doctor` command to diagnose environment health.
- Strict exit codes (0 = SAFE/SUSPICIOUS, 1 = HIGH/CRITICAL, 2 = ERROR).

### Performance
- Concurrent detection pipeline for faster heuristics execution.
- Memory optimizations for parsing large hallucination datasets.
- Bounded caching for registry metadata to minimize network overhead.

### Testing
- Deterministic benchmark infrastructure using fixture data.
- Live network benchmark capabilities.
- Fast workspace testing setup with `vitest`.

### Documentation
- Explanations of security model and anti-dilution mechanics.
- Development and architecture guide for contributors.
