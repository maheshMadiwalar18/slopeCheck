# GitHub Action Example

This example demonstrates how to integrate Slopcheck Agent into a GitHub Actions CI/CD pipeline to block malicious packages from being merged into your repository.

## Files

- `.github/workflows/security.yml`: A sample workflow that runs Slopcheck on every Pull Request.

## How it Works

The workflow uses the `voodoowrez/slopcheck` action to scan the `package.json` file. If any dependency is flagged as `HIGH` or `CRITICAL` risk (based on the `fail-on: high` configuration), the CI job will fail and prevent the PR from being merged.

You can customize the `fail-on` threshold to `safe`, `suspicious`, `high`, or `critical`.
