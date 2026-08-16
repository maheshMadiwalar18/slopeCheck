# Slopcheck GitHub Action

The Slopcheck Agent GitHub Action allows you to automatically scan your `package.json` for hallucinated, typosquatted, and suspicious packages directly in your CI/CD pipelines.

## Installation

Add the following step to your GitHub Actions workflow file (e.g., `.github/workflows/security.yml`):

```yaml
name: Slopcheck Security Scan
on: [pull_request]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Scan Dependencies
        uses: voodoowrez/slopcheck@v1
        with:
          path: package.json
          fail-on: high
```

## Inputs

| Input | Default | Description |
|-------|---------|-------------|
| `path` | `package.json` | Path to the package.json file you want to scan. |
| `fail-on` | `high` | The minimum severity level that will cause the CI job to fail. Valid options: `safe`, `suspicious`, `high`, `critical`. |
| `version` | `0.1.0` | The version of the `slopcheck-agent` CLI to use. |

## Outputs

The action sets the following step outputs which you can use in subsequent steps:

| Output | Description |
|--------|-------------|
| `status` | The highest overall risk status found during the scan (e.g., `SAFE`, `HIGH`). |
| `packages-scanned` | The total number of packages evaluated. |
| `high-risk-count` | The number of HIGH risk packages discovered. |
| `critical-count` | The number of CRITICAL risk packages discovered. |

## Exit Behavior

The action respects the standard exit codes of the underlying CLI:
- **0**: Successful scan, and the highest risk found was below the `fail-on` threshold.
- **1**: Security threshold exceeded. The scan completed successfully but found packages meeting or exceeding the `fail-on` risk level.
- **2**: Infrastructure or operational failure (e.g., network timeout, missing `package.json`, missing package metadata on npm).

## Permissions

This action is extremely lightweight and requires only standard read permissions:
```yaml
permissions:
  contents: read
```
It does **not** require `contents: write` or `pull-requests: write`. Instead of polluting PR comments, it generates a native, rich GitHub Actions Job Summary.

## Security Model

- **No Execution**: The action only analyzes package metadata. It does **not** install or execute the target packages via `npm install`.
- **Injection Safe**: All CLI commands are executed via strict argument arrays, preventing shell interpolation and command injection attacks.
- **Deterministic Output**: The action relies exclusively on the deterministic JSON contract from the CLI, isolating the CI environment from unhandled logs.

## Troubleshooting

- **"Operational Error (Exit code 2)"**: This means the Slopcheck CLI could not fetch metadata for a package. Check your network connectivity, GitHub API rate limits, or ensure that the package actually exists on npm.
- **"Failed to parse JSON"**: Ensure you are using a stable `version` of the agent that upholds the JSON contract.
