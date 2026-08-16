# Basic CLI Example

This example demonstrates how to use the Slopcheck Agent CLI to analyze npm packages before installation.

## Prerequisites

- Node.js >= 20
- Slopcheck Agent installed (`npm install -g slopcheck-agent`)

## Checking a Package

You can check a specific package before adding it to your project:

```bash
slopcheck-agent check react
```

## Scanning Dependencies

If you have an existing `package.json`, you can scan all of its dependencies:

```bash
slopcheck-agent scan package.json
```

## Explainability

If a package is flagged, you can see a detailed breakdown of the heuristics:

```bash
slopcheck-agent explain <package-name>
```

## JSON Output for Scripts

You can use the `--json` flag to parse the output in a bash script or CI job:

```bash
slopcheck-agent check react --json
```
