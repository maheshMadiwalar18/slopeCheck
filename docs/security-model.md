# Security Model and Trust Signals

Slopcheck Agent is designed to catch AI-hallucinated packages before they cause harm. It is crucial to understand what Slopcheck can and cannot do.

## Heuristic Nature

**Slopcheck is a heuristic tool.** It does not analyze package code or look for malware payloads. Instead, it evaluates metadata and context signals (such as package age, repository links, download activity, and similarity to known packages) to determine the likelihood of a supply chain attack.

## Understanding Statuses

- **SAFE**: This indicates that our heuristic detectors did not find high-risk signals. It does **not** guarantee that a package is free of malware or vulnerabilities. Always review critical dependencies.
- **SUSPICIOUS**: The package exhibits some anomalies (e.g., missing metadata, very new) but hasn't tripped critical thresholds. Proceed with caution.
- **HIGH / CRITICAL (BLOCK)**: This means the security policy recommends preventing installation. The package matches known hallucination datasets, is a direct typosquat of a popular package, or exhibits multiple high-risk anomalies.

## Explainability

Security decisions should not be a black box. Slopcheck's results are fully explainable. By using the `slopcheck-agent explain <package>` command, you can see exactly which detectors contributed to the final risk score.

## Dataset Versioning

Our hallucination detection relies on datasets that are cryptographically verified and versioned. This ensures that you can definitively prove which intelligence state was used to evaluate a specific package at any given time.

## Limitations

- **No Malware Analysis**: Slopcheck does not perform static or dynamic malware analysis.
- **No CVE Scanning**: Slopcheck is not a replacement for tools like `npm audit`. It does not detect known vulnerabilities in legitimate packages.
