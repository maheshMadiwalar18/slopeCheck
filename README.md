# Slopcheck Agent

An AI-native supply chain security tool that detects hallucinated, slopsquatted, typosquatted, suspicious, and malicious npm packages BEFORE installation.

## Features
- Scans packages for known hallucinations (official and community datasets).
- Detects typosquatting against popular packages.
- Analyzes package age, popularity, and metadata to compute a risk score (0-100).
- Categorizes packages into risk levels: SAFE, SUSPICIOUS, HIGH, and CRITICAL.
- Scans your entire `package.json` for potential supply-chain risks.
- Provides a detailed breakdown of risk factors with weighted scores.

## Installation

```bash
npm install -g slopcheck-agent
```

## Usage

Check a specific package:
```bash
slopcheck-agent check react-codeshift
```

Scan all dependencies in a `package.json`:
```bash
slopcheck-agent scan package.json
```

Get a detailed explanation of risk scoring for a package:
```bash
slopcheck-agent explain react-codeshift
```

Diagnose your environment (checks Node.js version, datasets, risk engine, and network connectivity):
```bash
slopcheck-agent doctor
```

## JSON Output

You can output the results as a machine-readable JSON object by appending the `--json` flag to `check` and `scan` commands:

```bash
slopcheck-agent check express --json
slopcheck-agent scan package.json --json
```

## Exit Codes

The CLI uses deterministic exit codes to facilitate CI automation:
- **0**: Successful analysis with no blocking risk (SAFE or SUSPICIOUS).
- **1**: HIGH or CRITICAL risk detected.
- **2**: Analysis error, unavailable metadata, or package not found (assessment cannot be trusted).

## Architecture

This tool is built using a highly decoupled, plugin-based architecture. For more details, see [docs/architecture.md](docs/architecture.md).
