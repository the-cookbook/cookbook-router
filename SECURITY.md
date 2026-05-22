# Security Policy

## Table of contents

- [Supported versions](#supported-versions)
- [Reporting a vulnerability](#reporting-a-vulnerability)
- [Response process](#response-process)
- [Security boundaries](#security-boundaries)
- [Security-sensitive areas](#security-sensitive-areas)

## Supported versions

Security fixes are released for the current major version of the published packages:

- `@cookbook/router`
- `@cookbook/router-react`
- `@cookbook/router-cli`

Pre-1.0 releases may receive security fixes as patch releases when the vulnerable API still exists.

## Reporting a vulnerability

Do not open a public GitHub issue for suspected security vulnerabilities.

Report vulnerabilities through GitHub private vulnerability reporting for `the-cookbook/cookbook-router`, or email the maintainers listed on the npm package metadata once packages are published.

Include:

- affected package and version
- reproduction steps
- impact assessment
- whether the issue affects runtime routing, SSR, generated contracts, or CLI file writes

## Response process

1. The report is triaged privately.
2. A maintainer confirms the affected package and severity.
3. A fix is prepared with regression tests.
4. A patched release is published through the release workflow.
5. A security advisory is published when appropriate.

## Security boundaries

Cookbook Router does not execute route components by itself outside the host framework. The CLI reads user-provided route files during generation, so route files must be treated as trusted project code. Do not run `cookbook-router generate` on untrusted repositories.

## Security-sensitive areas

Pay extra attention to:

- SSR request URL handling
- serialized hydration data embedded into HTML
- CLI route file and output path validation
- browser history state, which must remain structured-cloneable
- external redirects, which intentionally leave the app
