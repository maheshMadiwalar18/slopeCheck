# Agent Integrations Architecture

Slopcheck Agent is designed to be embedded directly into AI coding assistants (like Cursor, Claude Code, and any system supporting MCP) to intercept package installations *before* they are executed on the host machine.

## The `AgentAdapter` Pattern

All integrations must implement the `AgentAdapter` architecture found in `@slopcheck/agent`. This ensures a single source of truth for:
- Command parsing (`parseInstallCommand`)
- Security policy evaluation (`SlopcheckGuard`)
- Risk engine execution

### Key Components

1. **`SlopcheckGuard`**: The core middleware class. It takes a normalized `InstallRequest` and evaluates it against the global `SecurityPolicy`.
2. **`parseInstallCommand`**: A robust, Regex-based parser that handles nested package manager calls (e.g. `npx`, `npm exec`, chaining with `&&`).
3. **The Adapter Lifecycle**:
    - **Receive**: The adapter receives a raw shell command or hook payload from the AI agent.
    - **Parse**: The adapter uses `parseInstallCommand` to extract `InstallRequest` objects.
    - **Evaluate**: The adapter passes the requests to `SlopcheckGuard.inspect()`.
    - **Respond**: The adapter translates the `SecurityDecision` back into the AI agent's native format (e.g. JSON output, exit codes, or MCP responses).

## Supported Integrations

- **Claude Code**: Native integration using `.claude.json` PreToolUse hook (Exit code based).
- **Cursor IDE**: Native integration using `.cursor/hooks.json` beforeShellExecution hook (JSON/stdout based).
- **Model Context Protocol (MCP)**: Native integration via stdio MCP server for universal AI agent support.

## Cross-Adapter Consistency Guarantee

All adapters are guaranteed to evaluate identical inputs to identical outputs. The `@slopcheck/benchmark` workspace contains cross-adapter consistency tests that assert that every adapter processes adversarial commands symmetrically.
