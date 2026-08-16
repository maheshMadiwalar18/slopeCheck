#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { SlopcheckGuard } from '@slopcheck/agent';

// Initialize the guard
const guard = new SlopcheckGuard();

// Initialize the server
const server = new Server(
  {
    name: 'slopcheck-mcp',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'slopcheck_check_install',
        description: 'Inspect a package before installation to determine if it is safe, suspicious, or malicious.',
        inputSchema: {
          type: 'object',
          properties: {
            package: {
              type: 'string',
              description: 'The name of the package to check.',
            },
            version: {
              type: 'string',
              description: 'Optional version string.',
            },
            packageManager: {
              type: 'string',
              description: 'The package manager being used (npm, pnpm, yarn, bun).',
            },
          },
          required: ['package'],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === 'slopcheck_check_install') {
    const pkg = request.params.arguments?.package as string;
    const version = request.params.arguments?.version as string | undefined;
    const packageManager = request.params.arguments?.packageManager as string | undefined;

    if (!pkg || typeof pkg !== 'string') {
      throw new Error('Package name is required and must be a string.');
    }

    try {
      const inspectRequest: import('@slopcheck/agent').InstallRequest = { package: pkg };
      if (version) inspectRequest.version = version;
      if (packageManager) inspectRequest.packageManager = packageManager;

      const decision = await guard.inspect(inspectRequest);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                decision: decision.decision,
                package: pkg,
                riskLevel: decision.assessment?.level || 'UNKNOWN',
                score: decision.assessment?.score ?? null,
                reasons: decision.reasons,
                recommendation: decision.decision === 'ALLOW' ? 'Safe to install.' : 'Do not install this package.'
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                decision: 'ERROR',
                package: pkg,
                message: `An unexpected error occurred during inspection: ${message}`,
              },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }
  }

  throw new Error(`Tool not found: ${request.params.name}`);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Slopcheck MCP Server running on stdio');
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error in main():', error);
    process.exit(1);
  });
}

// Export for testing
export { server, guard };
