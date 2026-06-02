---
'@cookbook/router': minor
---

Prepare `@cookbook/router` for the first public release with finalized v1-facing core routing APIs.

- finalize route definition, validation, matching, href generation, navigation, middleware, lifecycle, history, SSR, slot, intercept, redirect, search, hash, and generated contract behavior
- strengthen route validation diagnostics for malformed route records, invalid scalar fields, duplicate ids, invalid paths, index route misuse, malformed schemas, invalid slots, invalid intercepts, invalid redirects, and path constraint failures
- improve typed route contract support for route ids, params, search, hash, metadata, outlet context, href generation, and navigation options
- clarify URL-faithful search parameter parsing behavior for single-value and repeated query keys
- clarify custom path constraint registration through `defineRoutes(..., { pathConstraints })`
- improve runtime documentation for blockers, serialization, hydration, redirects, middleware, lifecycle, histories, slots, and intercepts
- add JSDoc across public and semi-public core router APIs
