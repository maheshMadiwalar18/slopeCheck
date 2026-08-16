# AI Agent Integration

Slopcheck Agent provides a generic interception layer that allows AI tools (like Claude Code, Cursor, or custom agents) to proactively inspect packages *before* executing `npm install` or running arbitrary code.

The middleware is available programmatically via `@slopcheck/agent` and natively as an MCP Server via `@slopcheck/mcp`.

## Architecture & Security Boundary

The middleware operates purely statically. It fetches metadata from registry APIs and applies local risk heuristics. 
**Crucially, it never executes shell commands or installs packages itself.** The AI agent is responsible for calling the inspection tool, parsing the structured `SecurityDecision`, and deciding whether to proceed with the actual installation.

## Model Context Protocol (MCP) Server

The MCP server exposes a `slopcheck_check_install` tool to any compatible AI agent.

### Starting the Server

```bash
npx @slopcheck/mcp
```
*(Ensure you are running Node 20+)*

### Using the Tool

**Input:**
```json
{
  "package": "react-codeshift",
  "packageManager": "npm"
}
```

**Output Example:**
```json
{
  "decision": "BLOCK",
  "package": "react-codeshift",
  "riskLevel": "CRITICAL",
  "score": 100,
  "reasons": [
    {
      "code": "HALLUCINATION",
      "message": "Package appears in the hallucinated-package dataset."
    }
  ],
  "recommendation": "Do not install this package."
}
```

## Programmatic API (`@slopcheck/agent`)

If you are building your own Node.js-based agent framework, you can use the guard programmatically:

```typescript
import { SlopcheckGuard } from '@slopcheck/agent';

const guard = new SlopcheckGuard();

const result = await guard.inspect({
  package: 'express',
  packageManager: 'npm'
});

if (result.decision === 'BLOCK') {
  console.error('Installation blocked for security reasons:', result.reasons);
} else {
  // Proceed with executing child_process.execSync('npm install express')
}
```

## Security Policy

The default policy is deliberately strict:
- `CRITICAL` or `HIGH` risks → **BLOCK**
- Registry `UNAVAILABLE` or `NOT_FOUND` → **BLOCK**
- `SUSPICIOUS` or `PARTIAL` assessments → **WARN**
- `SAFE` → **ALLOW**

Errors in assessment or network failures degrade safely to `BLOCK` rather than silently allowing potentially compromised packages.
