# Cursor IDE Integration

Slopcheck Agent integrates seamlessly with the Cursor IDE to protect your machine from malicious packages hallucinated by the Cursor AI.

## How it works

Cursor provides a `beforeShellExecution` lifecycle hook configured via `.cursor/hooks.json`. When the Cursor AI attempts to run a shell command, the hook is invoked.

The Slopcheck Cursor Adapter (`@slopcheck/cursor`) runs as a CLI tool that:
1. Receives a JSON payload via `stdin` from Cursor.
2. Parses the intended command to identify any package installation attempts (`npm install`, `pnpm add`, etc.).
3. Evaluates identified packages using the Slopcheck RiskEngine.
4. Outputs a JSON response to `stdout` telling Cursor whether to `allow` or `deny` the execution, along with a user-facing explanation.

## Installation

Run the following command in your project workspace:

```bash
pnpm add -D @slopcheck/cursor
```

Then, configure the hook in your project by creating or modifying `.cursor/hooks.json`:

```json
[
  {
    "event": "beforeShellExecution",
    "command": "npx slopcheck-cursor"
  }
]
```

## Behavior

- **SAFE**: The command executes transparently without interruption.
- **SUSPICIOUS (WARN)**: The command executes, but Slopcheck sends a warning message back to Cursor.
- **MALICIOUS (BLOCK)**: Slopcheck sends a `deny` signal to Cursor. The execution is blocked, and Cursor displays a clear explanation of why the package was blocked.
