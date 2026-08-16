# Security Policy

If you discover a security vulnerability within this project, please report it following our responsible disclosure process.

## Security Vulnerabilities vs. Bug Reports

Please do not report security vulnerabilities through public GitHub issues.

- **Security Vulnerabilities:** Anything that could lead to arbitrary code execution on the user's machine, bypasses that allow malicious packages to silently bypass the blocklist entirely without explanation, or other severe security flaws.
- **Bug Reports:** Inaccurate risk scores, false positives, false negatives due to simple heuristics, or UI bugs. These should be reported as standard [GitHub Issues](https://github.com/voodoowrez/slopcheck-agent/issues).

## Reporting a Vulnerability

**Please report vulnerabilities by opening a private security advisory on GitHub.** We do not currently use a dedicated email address for security reports.

When reporting a vulnerability, please include:
- A detailed description of the issue.
- Affected versions of the Slopcheck Agent.
- Detailed steps to reproduce the vulnerability (including `package.json` fixtures if applicable).
- The potential impact of the vulnerability.

## Expected Response Process

- We aim to acknowledge your report within 48 hours.
- We will provide an estimated timeline for the fix and coordinate public disclosure with you once the patch is released.
- We ask that you give us a reasonable amount of time to respond to and fix the issue before making any information public. 

## Scope and Security Model

Please understand that **Slopcheck Agent is a heuristic security assessment tool, not a guarantee of package safety.**

- A `SAFE` result means our specific heuristic detectors did not find a high-risk signal. It is **not** a guarantee that the package is free of malware or vulnerabilities.
- A `BLOCK` or `HIGH` result means the security policy recommends preventing installation due to high-risk signals (e.g., hallucinated names, extreme recency combined with no repository).
- Slopcheck relies on public metadata which can be manipulated. It does not perform dynamic malware analysis or static code analysis of the package contents.

If you find a bypass in our heuristics, we welcome reports and pull requests to improve the risk engine. Such bypasses are considered feature limitations rather than severe security vulnerabilities in the tool itself, unless they lead to a complete breakdown of the intended security guardrails.
