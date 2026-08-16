# Programmatic Agent Integration Example

This example demonstrates how to integrate the Slopcheck Agent programmatically into a custom Node.js application, such as a custom AI coding agent framework.

## Setup

1. Install the core agent package:
```bash
npm install @slopcheck/agent
```

2. Run the example script:
```bash
node index.js
```

## How it Works

The example instantiates the `SlopcheckGuard` and calls `.inspect()` on a target package. It then examines the `result.decision` (which can be `ALLOW`, `WARN`, or `BLOCK`) and handles the logic appropriately before deciding whether to actually install the package using `child_process`.
