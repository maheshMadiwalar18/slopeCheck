# Custom Policy Example

Slopcheck Agent is designed to be configurable so you can adapt the security policy to your organization's risk tolerance.

*(Note: Custom policy files via `slopcheck.config.json` are currently under active development. This example shows the upcoming structure).*

## Future Configuration File

When supported, you will be able to place a `slopcheck.config.json` in your project root:

```json
{
  "policy": {
    "blockOn": ["CRITICAL", "HIGH"],
    "warnOn": ["SUSPICIOUS"]
  },
  "allowlist": [
    "my-internal-package-*"
  ],
  "thresholds": {
    "ageDays": 14,
    "minDownloads": 100
  }
}
```

This will allow you to bypass checks for known internal packages or strictify the download count required for a package to be considered safe.
