# Security Policy

If you discover a security vulnerability within this project, please report it following our responsible disclosure process.

## Reporting a Vulnerability

**Note: Currently, there is no dedicated security email address. Please report vulnerabilities by opening a private security advisory on GitHub if possible, or by opening an issue if the vulnerability is low risk.** (This is a manual release decision pending setup of a dedicated security channel).

When reporting a vulnerability, please include:
- A detailed description of the issue.
- Steps to reproduce the vulnerability.
- Potential impact of the vulnerability.

## Responsible Disclosure

We ask that you give us a reasonable amount of time to respond to and fix the issue before making any information public. 

## Scope and Security Model

Please understand that **Slopcheck Agent is a heuristic security assessment tool, not a guarantee of package safety.**

- A `SAFE` result means our specific heuristic detectors did not find a high-risk signal. It is **not** a guarantee that the package is free of malware or vulnerabilities.
- Slopcheck relies on public metadata which can be manipulated.
- It does not perform dynamic malware analysis or static code analysis of the package contents.

If you find a bypass in our heuristics, we welcome reports and pull requests to improve the risk engine, but such bypasses are considered feature limitations rather than security vulnerabilities in the tool itself, unless they lead to arbitrary code execution or compromise of the environment running `slopcheck-agent`.
