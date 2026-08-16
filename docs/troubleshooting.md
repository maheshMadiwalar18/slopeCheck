# Troubleshooting

If you encounter issues using Slopcheck Agent, here are some common problems and their solutions.

## The CLI fails with Exit Code 2

**What happened:** Slopcheck could not complete its analysis. This is an operational error, not a security risk assessment.

**Why:** This usually happens when:
- The package name does not exist on npm (e.g., misspelled name).
- Network connectivity issues or corporate firewall blocking access to the npm registry.
- Rate limiting from the GitHub API when fetching repository metadata.

**What to do next:**
1. Verify the package name is correct.
2. Check your network connection.
3. Run `slopcheck-agent doctor` to diagnose connectivity and environment issues.
4. If rate limited by GitHub, configure the `SLOPCHECK_GITHUB_TOKEN` environment variable with a Personal Access Token.

## False Positives (High Risk on a Safe Package)

**What happened:** Slopcheck flagged a legitimate package as HIGH or CRITICAL risk.

**Why:** Heuristics are based on probability. A completely safe package might be very new, have no repository link, and few downloads, causing it to look suspicious.

**What to do next:**
1. Run `slopcheck-agent explain <package>` to see exactly which heuristics triggered the score.
2. Manually verify the package on npm.
3. If this is an internal package, ensure your CI is not treating it as a public package.

## Dataset Integrity Error

**What happened:** Slopcheck crashed with a dataset integrity checksum error.

**Why:** The local JSON dataset files do not match their cryptographically verified manifest, meaning they may be corrupted or tampered with.

**What to do next:**
1. Reinstall Slopcheck Agent (`npm install -g slopcheck-agent`).
2. Run `slopcheck-agent dataset verify` to confirm the fix.
