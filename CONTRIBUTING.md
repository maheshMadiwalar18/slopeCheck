# Contributing

Thanks for your interest in contributing to Slopcheck Agent!

## 1. Repository Setup

1. Fork the repository on GitHub.
2. Clone your fork locally:
   ```bash
   git clone https://github.com/your-username/slopcheck-agent.git
   cd slopcheck-agent
   ```

## 2. Dependencies and Installation

This repository uses `pnpm` workspaces. Ensure you have `pnpm` installed (version 9+).

```bash
pnpm install
```

## 3. Development Commands

During development, you can run the CLI from source:

```bash
node packages/cli/dist/index.js check express
```

*Note: You must run `pnpm build` first to compile the source to `dist/`.*

## 4. Test Commands

We use `vitest` for fast, workspace-aware unit testing.

```bash
pnpm test
```

## 5. Build Commands

To build all packages in the workspace:

```bash
pnpm build
```

## 6. Benchmark Commands

To run deterministic benchmarks (using fixture data):

```bash
pnpm benchmark
```

To run live network benchmarks:

```bash
pnpm benchmark:live
```

## 7. Pull Request Expectations

- Ensure your branch is up to date with `main`.
- Write tests for new heuristic detectors or bug fixes.
- Run `pnpm typecheck`, `pnpm lint`, and `pnpm test` before submitting your PR.
- Ensure `pnpm benchmark` still passes without significant performance regression.
- Provide a clear description of the changes in the PR body.
