---
'@cookbook/router-react': minor
---

Prepare `@cookbook/router-react` for the first public release with finalized v1-facing React integration APIs.

- improve React routing primitives, including providers, links, nav links, outlets, slots, route fallbacks, and hooks
- add router-managed navigation blockers for unsaved-change flows
- document browser unload limitations and clarify that custom unload messages are controlled by the browser
- improve `Link` and `NavLink` behavior for href-based navigation and active matching, including same-origin hrefs
- clarify route-level versus layout-level loading behavior in public JSDoc
- clarify route-level versus layout-level error handling behavior in public JSDoc
- improve typed React hooks for route params, search, hash, href generation, navigation, matches, outlet context, and router state access
- add JSDoc across public and semi-public React APIs
- forward URLKit `defaults` build options through React href/link APIs while keeping state-reading hooks tied to resolved router state
