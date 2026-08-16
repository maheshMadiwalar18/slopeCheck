# Lockfile Intelligence & Dependency Graph Analysis

Slopcheck Agent supports deep scanning of your natively resolved lockfiles (`package-lock.json` and `pnpm-lock.yaml`). By analyzing the lockfile, Slopcheck guarantees it assesses the *exact* dependency graph your application will install, including deep transitive dependencies that might be vulnerable to supply chain attacks or typosquatting.

## Supported Formats

Currently supported lockfiles:
- **npm** (`package-lock.json` v2 and v3)
- **pnpm** (`pnpm-lock.yaml` v6, v9)

*Yarn lockfiles (`yarn.lock`) are currently unsupported natively. If you need to scan a yarn project, consider exporting to a compatible format or scanning the `package.json`.*

## CLI Usage

Use the `scan-lockfile` command followed by the path to your lockfile:

```bash
slopcheck-agent scan-lockfile package-lock.json
```

Output includes the exact resolution path of a risk. For example:
```
Critical/High findings:
- react-codeshift@1.0.0
  Path: project → build-tool → react-codeshift
  * [hallucination] Package is not found on the npm registry and might be hallucinated.
```

## How It Works

1. **Parser**: The lockfile is parsed into a normalized `DependencyGraph`.
2. **Resolution Path**: A Breadth-First Search (BFS) computes the shortest resolution path from the root node to each dependency.
3. **Local/Workspace Skip**: Workspace packages and local linked files are excluded from registry validation to prevent false positives.
4. **Risk Engine**: Each resolved dependency is evaluated against the `RiskEngine` using the exact version defined in the lockfile.

## CI Integration

In GitHub Actions, you can pass the `lockfile` parameter to utilize the new scanner:

```yaml
steps:
  - uses: slopcheck/agent-action@v0.1.0
    with:
      lockfile: 'package-lock.json'
```
*(If `lockfile` is provided, it takes precedence over `path`)*
