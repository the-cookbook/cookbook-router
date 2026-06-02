---
'@cookbook/router-cli': minor
---

Prepare `@cookbook/router-cli` for the first public release with finalized v1-facing generation and validation workflows.

- improve contract, register, and manifest generation for typed router workflows
- add route generation watch workflows
- harden route validation coverage for CLI-discovered route files
- document static route-file extraction constraints and supported authoring patterns
- improve generated contract documentation and module augmentation guidance
- respect `defineRoutes(..., { pathConstraints })` during generation and validation
- harden release-readiness checks around package exports, generated files, docs, and repository validation
- add JSDoc across public and semi-public CLI APIs
