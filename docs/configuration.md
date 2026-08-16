# Configuration

Slopcheck Agent is designed to work with sensible defaults, but it can be configured to match your organization's security policies.

## Environment Variables

You can configure Slopcheck using the following environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `SLOPCHECK_REGISTRY_URL` | The npm registry URL to fetch metadata from. | `https://registry.npmjs.org` |
| `SLOPCHECK_GITHUB_TOKEN` | GitHub Personal Access Token to increase rate limits for repository metadata checks. | *none* |
| `SLOPCHECK_CACHE_DIR` | Directory to store cached metadata and datasets. | `~/.slopcheck/cache` |
| `SLOPCHECK_LOG_LEVEL` | Logging verbosity (`debug`, `info`, `warn`, `error`). | `info` |
| `SLOPCHECK_TIMEOUT_MS` | Network timeout for registry requests in milliseconds. | `10000` |

## Future Configuration (Coming Soon)

We are actively working on a `slopcheck.config.json` file to allow overriding default heuristics, defining organization-specific allowed packages, and setting custom risk thresholds.
