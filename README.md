# Slopcheck Agent

An AI-native supply chain security tool that detects hallucinated, slopsquatted, typosquatted, suspicious, and malicious npm packages BEFORE installation.

## Features
- Scans packages for known hallucinations.
- Detects typosquatting against popular packages.
- Analyzes package age, popularity, and metadata to compute a risk score.
- Scans your entire `package.json`.

## Installation

```bash
npm install -g slopcheck-agent
```

## Usage

Check a specific package:
```bash
slopcheck-agent check react-codeshift
```

Scan a project:
```bash
slopcheck-agent scan package.json
```
