# Getting Started

Welcome to Slopcheck Agent! This guide will help you install and run your first scan.

## Installation

You can install and use Slopcheck Agent in several ways depending on your workflow.

### 1. Global Installation (Recommended for CLI usage)

To use the `slopcheck-agent` command anywhere on your system:

```bash
npm install -g slopcheck-agent
```

### 2. Run without installing (npx)

If you just want to run a quick scan without installing globally:

```bash
npx slopcheck-agent check <package-name>
```

### 3. Local Project Installation

To use Slopcheck as a dependency in your project (e.g., for scripts):

```bash
npm install --save-dev slopcheck-agent
```

You can then run it via npm scripts or `npx slopcheck-agent`.

### 4. GitHub Action

To run Slopcheck automatically in CI/CD, use our official GitHub Action. See [GitHub Action Documentation](github-action.md) for details.

```yaml
- uses: voodoowrez/slopcheck@v1
  with:
    path: package.json
```

### 5. MCP (Model Context Protocol)

Slopcheck can be integrated with AI coding assistants using MCP. See [Agent Integration](agent-integration.md) for setup details.

## Running Your First Scan

Once installed, you can check a specific package:

```bash
slopcheck-agent check express
```

Or scan your entire `package.json`:

```bash
slopcheck-agent scan package.json
```

To see a detailed breakdown of how the risk score was calculated:

```bash
slopcheck-agent explain express
```

## Next Steps

- Explore all [CLI Commands](cli.md).
- Learn how to [Configure Slopcheck](configuration.md) for your organization.
- Understand our [Security Model](security-model.md) and what a risk score means.
