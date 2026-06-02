---
'@cookbook/router': minor
'@cookbook/router-react': minor
'@cookbook/router-cli': minor
---

Prepare Cookbook Router for its first public release with finalized v1-facing APIs, stronger validation, improved React integration, CLI workflow hardening, and expanded developer documentation.

## Core router

- finalize route definition, matching, href generation, navigation, middleware, lifecycle, history, SSR, slot, intercept, redirect, search, hash, and generated contract behavior for the initial public API
- strengthen route validation diagnostics for malformed route records, invalid scalar fields, duplicate ids, invalid paths, index route misuse, malformed search/hash schemas, invalid slots, invalid intercepts, invalid redirects, and path constraint failures
- add focused route validation unit coverage for public diagnostic paths and edge cases
- improve typed route contract support for route ids, params, search, hash, metadata, outlet context, href generation, and navigation options
- clarify URL-faithful search parameter parsing behavior, including single-value and repeated query key handling
- clarify custom path constraint registration through `defineRoutes(..., { pathConstraints })` and router creation
- preserve explicit catch-all route behavior for not-found UI and missing parameter diagnostics
- improve router runtime documentation for blockers, serialization, hydration, redirects, middleware, lifecycle, histories, slots, and intercepts

## React integration

- improve React routing primitives, including providers, links, nav links, outlets, slots, route fallbacks, and hooks
- add router-managed navigation blockers for unsaved-change flows
- document browser unload limitations and clarify that custom unload messages are controlled by the browser
- improve `Link` and `NavLink` behavior for href-based navigation and active matching, including same-origin hrefs
- clarify route-level versus layout-level loading behavior in public JSDoc and docs
- clarify route-level versus layout-level error handling behavior in public JSDoc and docs
- apply provider and route fallback behavior consistently across primary route rendering, slots, and intercepted routes where supported
- improve typed React hooks for route params, search, hash, href generation, navigation, matches, outlet context, and router state access

## CLI

- improve contract, register, and manifest generation for typed router workflows
- add or harden route validation coverage for CLI-discovered route files
- support route generation watch workflows
- document static route-file extraction constraints and supported authoring patterns
- improve generated contract documentation and module augmentation guidance
- harden release-readiness checks around package exports, generated files, docs, and repository validation

## Documentation and DX

- add JSDoc across public and semi-public APIs in `@cookbook/router`, `@cookbook/router-react`, and `@cookbook/router-cli`
- document important implementation semantics directly in IntelliSense, including route-local loading versus layout-owned loading
- update README links for API documentation and the live Cookbook Router demo
- expand troubleshooting guidance for validation errors, missing params, generated contracts, hydration mismatches, intercept behavior, and JSDoc hover limitations
- clarify that `@cookbook/pathkit` is an external dependency used by `@cookbook/router`, not a package in this repository
- trim and clarify public exports before the first public release
