# CLI Commands

The Slopcheck Agent CLI provides several commands to check packages and dependencies.

## `check`

Analyze a single npm package for risks.

**Usage:**
```bash
slopcheck-agent check <package>
```

**Options:**
- `--json`: Output results in JSON format.

**Example:**
```bash
slopcheck-agent check react
```

## `scan`

Scan all dependencies declared in a `package.json` file.

**Usage:**
```bash
slopcheck-agent scan <path-to-package.json>
```

**Options:**
- `--json`: Output results in JSON format.

**Example:**
```bash
slopcheck-agent scan ./package.json
```

## `explain`

Get a detailed breakdown of how the risk score was calculated for a specific package.

**Usage:**
```bash
slopcheck-agent explain <package>
```

**Example:**
```bash
slopcheck-agent explain suspicious-package
```

## `doctor`

Check your environment connectivity, Node.js version, dataset availability, and risk engine configuration.

**Usage:**
```bash
slopcheck-agent doctor
```

## Exit Codes

The CLI uses strict exit codes:
- **0**: Successful analysis with no blocking risk (SAFE or SUSPICIOUS).
- **1**: HIGH or CRITICAL risk detected.
- **2**: Analysis error, unavailable metadata, or package not found.
