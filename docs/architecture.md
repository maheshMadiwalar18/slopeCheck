# SlopCheck Architecture

SlopCheck is an AI-native supply chain security tool designed to detect hallucinated, slopsquatted, typosquatted, suspicious, and malicious npm packages.

## Monorepo Structure (pnpm workspaces)

We employ a highly decoupled, plugin-based Clean Architecture distributed across several packages:

- `@slopcheck/core`: Contains the fundamental abstractions, error handling ADTs (`Result<T, E>`), and the plugin interface. This package has zero dependencies and is the domain layer.
- `@slopcheck/registry`: Handles external I/O with npm and GitHub registries. Includes built-in TTL caching and schema validation using `Zod` to prevent runtime malformed data panics.
- `@slopcheck/heuristics`: Implements all security detection logic as self-contained plugins. Detectors include Age, Popularity, Repository Existence, Metadata Completeness, AI Hallucinations, and Typosquatting/Similarity.
- `@slopcheck/datasets`: A high-performance, asynchronous dataset loader for official and community-curated hallucination data. Uses direct File System reads instead of synchronous imports to ensure constant memory footprint.
- `@slopcheck/cli`: The presentation layer. Integrates picocolors and cli-progress for an exceptional Developer Experience (DX). Implements a highly concurrent scanning engine using `p-limit`.

## Design Principles

- **SOLID & Clean Architecture**: Hard boundaries between packages.
- **Composition over Inheritance**: Heuristics are plugins registered into a `RiskEngine`.
- **Dependency Injection**: The core engine takes a `PluginRegistry`.
- **Immutable Domain Models**: Context passed between detectors is readonly.
- **Strict TypeScript**: `verbatimModuleSyntax`, `exactOptionalPropertyTypes`, and `strict: true`.

## Data Flow

1. The CLI reads the workspace `package.json` and extracts dependencies.
2. The CLI uses `p-limit` to execute up to 10 concurrent requests to the `RiskEngine`.
3. `RiskEngine` calls the `registry` package to fetch NPM and GitHub metadata.
4. The resolved metadata (`PackageContext`) is passed to all registered `DetectorPlugin`s.
5. Plugins independently analyze the package and return `RiskFactor[]` via a strongly-typed `Result` ADT.
6. The engine aggregates factors, applies scoring weights, and determines the final `RiskLevel`.
7. The CLI presents the formatted results to the user.
