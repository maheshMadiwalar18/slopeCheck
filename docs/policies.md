# Enterprise Policy & Governance

Slopcheck provides an Enterprise Policy layer designed for explicit, configuration-driven security decisions without compromising the local-first execution model.

## Configuration Discovery

Slopcheck will automatically discover your policy configuration in the following order of precedence:

1. CLI flag: `slopcheck-agent check react --policy strict-policy.yml`
2. `.github/slopcheck-policy.yml`
3. `slopcheck.config.json`
4. `.slopcheck.yml`
5. Default Secure Policy

## Policy Schema

The policy allows you to configure specific detector rules, risk thresholds, and registry behaviors.
You can define the policy in either JSON or YAML.

### Example YAML Policy (`.slopcheck.yml`)

```yaml
rules:
  - detector: hallucination
    action: block
  - detector: similarity
    severity: strong
    action: warn

thresholds:
  critical: block
  high: warn
  suspicious: allow
  safe: allow

behavior:
  unavailable: block
  notFound: block
  partial: warn
```

### Schema Details

- **Action**: Can be `allow`, `warn`, or `block`. 
  - `block` will cause the CLI and Action to fail (Exit Code 1).
  - `warn` will allow the check to pass but output warnings.

- **rules**: List of specific detector overrides. Overrides take precedence over general thresholds.
  - `detector`: The name of the factor (e.g., `hallucination`, `similarity`).
  - `severity`: (Optional) specifically target a severity class (`hard`, `strong`, `heuristic`).

- **thresholds**: General actions based on the computed overall `RiskLevel`.

- **behavior**: Operational behaviors:
  - `unavailable`: Action to take if the registry is unreachable.
  - `notFound`: Action to take if the package does not exist.
  - `partial`: Action to take if only partial evidence was collected (e.g., github repo deleted).

## CLI Integration

You can validate your policy using the built-in validator:

```bash
slopcheck-agent policy validate .slopcheck.yml
```

## GitHub Action Integration

To enforce a policy in CI, simply provide the path to your policy file. The action will automatically use it instead of the legacy `fail-on` flag:

```yaml
steps:
  - uses: slopcheck/agent-action@v0.1.0
    with:
      path: 'package.json'
      policy: '.github/slopcheck-policy.yml'
```
