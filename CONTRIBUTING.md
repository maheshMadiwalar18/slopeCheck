# Contributing to Slopcheck Agent

Thank you for your interest in contributing to Slopcheck Agent! The goal of this project is to protect developers from malicious, hallucinated, and typosquatted npm packages.

This guide will help you set up your development environment and understand the contribution workflow.

## 1. Repository Setup

1. Fork the repository on GitHub.
2. Clone your fork locally:
   ```bash
   git clone https://github.com/your-username/slopcheck-agent.git
   cd slopcheck-agent
   ```
3. Add the upstream remote:
   ```bash
   git remote add upstream https://github.com/voodoowrez/slopcheck-agent.git
   ```

## 2. Required Tools

- **Node.js**: Version 20 or higher.
- **pnpm**: Version 9 or higher (we use pnpm workspaces).

## 3. Development Commands (pnpm)

Install dependencies across all workspaces:
```bash
pnpm install
```

Build the project (required before running the CLI locally):
```bash
pnpm build
```

Run the local CLI during development:
```bash
node packages/cli/dist/index.js check express
```

## 4. Testing & Quality Checks

We enforce high code quality standards. Run these commands before submitting a PR:

- **Typecheck**: `pnpm typecheck`
- **Lint & Format**: `pnpm lint` (Fix issues with `pnpm format`)
- **Unit Tests**: `pnpm test` (Uses Vitest)

## 5. Benchmarks

Performance is critical for Slopcheck. We run benchmarks to ensure heuristics don't introduce severe latency.

- **Deterministic Benchmark**: `pnpm benchmark` (Uses local fixtures, safe for CI)
- **Live Network Benchmark**: `pnpm benchmark:live` (Hits real APIs, use carefully)

*Ensure your PR does not significantly degrade performance.*

## 6. Adding Detectors

Slopcheck's risk engine is modular. If you want to add a new heuristic:
1. Create a new detector class in `packages/heuristics/src/detectors/`.
2. Implement the `Detector` interface.
3. Write unit tests proving your heuristic works.
4. Update `slopcheck-agent explain` expectations if necessary.

## 7. Adding Datasets

To submit a new hallucinated package:
1. Open a PR modifying `packages/datasets/data/community.json`.
2. See [Datasets Documentation](docs/datasets.md) for the required evidence and format.

## 8. Submitting Pull Requests

1. Create a feature branch (`git checkout -b feature/my-new-idea`).
2. Commit your changes with clear, descriptive messages.
3. Run `pnpm release:check` to verify build, tests, and linter pass.
4. Push to your fork and open a Pull Request against the `main` branch.
5. Provide a clear description of the problem solved and link any relevant issues.
