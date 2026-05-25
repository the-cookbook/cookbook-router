---
'@cookbook/router': minor
'@cookbook/router-react': minor
'@cookbook/router-cli': minor
---

Prepare the packages for the first public release with finalized v1 API behavior, stronger React integration, CLI watch support, and release-readiness validation.

- add router-managed navigation blockers
- add scroll restoration with configurable scroll behavior
- add route-level loading and errorFallback support for React rendering
- apply provider loadingFallback and errorFallback consistently across primary routes, slots, and intercepted routes
- support CLI route generation watch mode through both `generate --watch`
- clarify URL-faithful search parameter parsing for `type: 'one'` and `type: 'many'`
- document static CLI route-file extraction constraints
- prefer RouterProvider fallback and explicit catch-all routes for not-found UI
- trim or clarify internal APIs before public release
- add release-readiness validation for docs, package exports, and repository hardening
