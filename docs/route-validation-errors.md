# Router error reference

Use this catalog for route-definition validation, runtime navigation, histories, SSR, React integration, CLI extraction/generation, and build-plugin failures.

The route-definition entries use the detailed structure error message, symptom, cause, and fix. The later tables cover the remaining public and operational errors. Most messages include a route ID, field name, slot name, file path, or target ID; `...` marks the dynamic part. URLKit descriptor errors retain their URLKit code, path, and cause while Router adds route context.

Application-defined errors thrown by route views, middleware, lifecycle handlers, preload callbacks, custom constraints, or history implementations pass through unchanged and therefore are not enumerated here.

## Table of contents

- [Route-definition and descriptor validation](#route-definition-and-descriptor-validation)
- [Href, navigation, middleware, and router lifecycle errors](#href-navigation-middleware-and-router-lifecycle-errors)
- [URL descriptors, constraints, and serialization errors](#url-descriptors-constraints-and-serialization-errors)
- [History, SSR, and hydration errors](#history-ssr-and-hydration-errors)
- [Intercept errors](#intercept-errors)
- [React integration errors](#react-integration-errors)
- [CLI config and command errors](#cli-config-and-command-errors)
- [CLI route-file extraction errors](#cli-route-file-extraction-errors)
- [CLI output and build-plugin errors](#cli-output-and-build-plugin-errors)

## Route-definition and descriptor validation

## Router routes must be an array.

**Symptom**
Validation stops before route entries are checked.

**Cause**
The value passed to defineRoutes(), validateRoutes(), createRouter(), or CLI route loading is not an array.

**Fix**
Pass a readonly route array. For modular routes, make sure the generated or imported export is an array of route definitions.

## Every route must be an object.

**Symptom**
Validation fails while walking the route tree.

**Cause**
A route entry is null, undefined, a primitive, or another non-object value.

**Fix**
Replace the entry with a route object containing at least id plus path/index or valid pathless group children.

## Every route must define a non-empty string id.

**Symptom**
Validation cannot identify a route.

**Cause**
A route is missing id, has an empty id, or uses a non-string id.

**Fix**
Give every route a stable non-empty string id. Route IDs must be unique across primary and slot route trees.

## Duplicate route id "...".

**Symptom**
Validation fails after a repeated route ID is found.

**Cause**
Two primary routes, slot routes, generated declarations, or fallback/internal routes use the same id.

**Fix**
Rename one route. Prefer namespaced IDs such as users.index and users.details.

## Route "..." index must be a boolean when provided.

**Symptom**
Validation fails on the index field.

**Cause**
index was set to a non-boolean value such as "true", 1, or an object.

**Fix**
Use index: true for index routes or omit index for normal path routes.

## Route "..." path must be a string when provided.

**Symptom**
Validation fails on the path field.

**Cause**
path was provided but is not a string.

**Fix**
Use a string path, omit path for pathless layout/group routes, or use index: true for index routes.

## Route "..." is an index route and must not define path.

**Symptom**
An index route fails validation.

**Cause**
The route declares both index: true and path.

**Fix**
Remove path from the index route. Put the URL segment on the parent route.

## Route "..." is an index route and must not define children.

**Symptom**
An index route fails validation.

**Cause**
Index routes cannot have child routes because they do not add a path segment or layout branch.

**Fix**
Move children to the parent route or make the route a non-index path route.

## Route "..." children must be an array.

**Symptom**
Validation fails on children.

**Cause**
children was provided but is not an array.

**Fix**
Use children: [...] or omit children.

## Route "..." preload must be a function when provided.

**Symptom**
Validation fails on preload.

**Cause**
preload was provided with a non-function value.

**Fix**
Use preload: async (context) => { ... } or remove preload. Route preload is optional and is not a data loader.

## Route "..." modulePreload must be a function when provided.

**Symptom**
Validation fails on modulePreload.

**Cause**
modulePreload was provided with a non-function value.

**Fix**
Do not author modulePreload manually. It is an internal generated-route preload hook. Remove it or ensure generated artifacts are up to date.

## Route "..." declares errorFallback, but route errorFallback is no longer supported. Use error instead.

**Symptom**
A route using an old fallback API fails validation.

**Cause**
The removed route-level errorFallback field is still present.

**Fix**
Rename errorFallback to error.

## Route "..." layout must be an object.

**Symptom**
Validation fails on layout.

**Cause**
layout was provided but is null, an array, or another non-object value.

**Fix**
Use layout: { view, loading, error, slots } or remove layout.

## Route "..." search configuration must be an object.

**Symptom**
Validation fails on search before URLKit descriptor validation.

**Cause**
search was provided but is null, an array, or another non-object value.

**Fix**
Use a static search descriptor object, defineSearch(...), mergeSearch(...), or remove search.

## Routes "..." and "..." are duplicate index routes under parent "...".

**Symptom**
Validation fails for sibling routes.

**Cause**
The same parent has more than one child with index: true.

**Fix**
Keep only one index child per parent or give one child a path.

## Route "..." must define either path or index. Pathless routes are only supported as layout/group routes with children.

**Symptom**
Validation fails on a route with neither path nor index.

**Cause**
The route is pathless but is not a pure group/layout route with children, or it declares route-local render/navigation fields.

**Fix**
Add path, use index: true, or make it a pure pathless group with children and no route-local view, redirect, search, hash, intercepts, middleware, lifecycle, loading, or error.

## Route "..." defines redirect and must not define children.

**Symptom**
Validation fails on a redirect route.

**Cause**
Redirect routes are terminal and cannot also own child routes.

**Fix**
Move the children to a non-redirect parent or remove redirect.

## Route "..." redirect must be a non-empty string.

**Symptom**
Validation fails on string redirect.

**Cause**
redirect is an empty string.

**Fix**
Use a non-empty href string or a route target object.

## Route "..." redirect must be a string or route target object.

**Symptom**
Validation fails on redirect.

**Cause**
redirect is present but is neither a string nor an object.

**Fix**
Use redirect: "/target" or redirect: { route: "target.id", params, search, hash }.

## Route "..." redirect.route must be a non-empty string.

**Symptom**
Validation fails on object redirect.

**Cause**
Object-form redirect is missing route, has an empty route, or route is not a string.

**Fix**
Set redirect.route to the target route id.

## Route "..." redirect.params must be an object when provided.

**Symptom**
Validation fails on redirect params.

**Cause**
redirect.params is present but is not an object.

**Fix**
Use an object keyed by path param name or omit params.

## Route "..." redirect.search must be an object when provided.

**Symptom**
Validation fails on redirect search.

**Cause**
redirect.search is present but is not an object.

**Fix**
Use an object keyed by search param name or omit search.

## Route "..." redirect.hash must be a string or null when provided.

**Symptom**
Validation fails on redirect hash.

**Cause**
redirect.hash is present but is neither a string nor null.

**Fix**
Use a bare hash string without #, null to clear hash, or omit hash.

## Route "..." search contains unsafe key "...".

**Symptom**
Validation fails on a search descriptor key.

**Cause**
search contains **proto**, constructor, or prototype, which would be unsafe to merge into plain objects.

**Fix**
Rename the key. Do not use prototype-polluting object keys in URL state descriptors.

## Route "..." meta contains unsafe key "...".

**Symptom**
Validation fails on a metadata key.

**Cause**
meta contains **proto**, constructor, or prototype, which would be unsafe to merge into plain objects.

**Fix**
Rename the key. Do not use prototype-polluting object keys in route metadata.

## Route "..." meta must be an object.

**Symptom**
Validation fails on meta.

**Cause**
meta was provided but is null, an array, or another non-object value.

**Fix**
Use a plain metadata object or omit meta.

## Duplicate route path "..." declared by routes "..." and "...".

**Symptom**
Validation fails after path normalization.

**Cause**
Two routes in the same path scope normalize to the same full path.

**Fix**
Give one route a different path, make one an index route under a different parent, or move contextual UI into a slot route tree.

## Route "..." defines an empty path.

**Symptom**
Validation fails on path.

**Cause**
path is an empty string.

**Fix**
Use / for the root route, a non-empty child segment, or omit path for a valid pathless group.

## Invalid path pattern or unknown path constraint.

**Symptom**
Validation fails with a PathKit/URLKit path-pattern error, such as an unknown constraint type.

**Cause**
The route path is malformed or references a custom constraint that was not registered before validation.

**Fix**
Fix the path pattern or register the custom constraint through defineRoutes(..., { pathConstraints }), defineRouteTree(...), createRouter(...), or the CLI config.

## Route "..." declares duplicate inherited param "...".

**Symptom**
Validation fails while composing parent and child params.

**Cause**
A child route declares a path param with the same name as an inherited parent param.

**Fix**
Use distinct param names across a branch, such as teamId and userId instead of id and id.

## Invalid static search descriptor.

**Symptom**
Validation throws a URLKit descriptor error for route search.

**Cause**
search is not a valid static URLKit descriptor. Common causes include runtime builders, invalid defaults, invalid enum values, invalid optional/many combinations, or runtime date codec objects.

**Fix**
Use static descriptor objects only. Do not use runtime URLKit builders or runtime date codec objects in route definitions.

## Invalid static hash descriptor.

**Symptom**
Validation throws a URLKit descriptor error for route hash.

**Cause**
hash is not a valid static URLKit hash descriptor. Common causes include unsupported shorthand, empty enum values, defaults outside enum values, optional: false, or optional: true combined with default.

**Fix**
Use an object hash descriptor with valid values/default/optional combinations.

## Route "..." hash value "..." must not include a leading #.

**Symptom**
Validation fails on hash descriptor values or defaults.

**Cause**
A hash enum value or default includes the leading #.

**Fix**
Use bare hash values such as "comments". The router adds # when building URLs.

## Route "..." declares layout.errorFallback, but layout errorFallback is no longer supported. Use layout.error instead.

**Symptom**
A layout using an old fallback API fails validation.

**Cause**
The removed layout.errorFallback field is still present.

**Fix**
Rename layout.errorFallback to layout.error.

## Route "..." declares layout.loading/layout.error, but no active layout view exists. Use route.loading/route.error for route-local fallbacks, or declare layout.view.

**Symptom**
Validation fails on layout fallback fields.

**Cause**
layout.loading or layout.error is declared where neither the route nor an ancestor has layout.view.

**Fix**
Use route.loading/route.error for route-local fallbacks or declare layout.view on this route or an ancestor.

## Route "..." declares layout.slots, but no active layout view exists in its ancestor tree. Slot declarations require layout.view on the same route or an ancestor route.

**Symptom**
Validation fails on layout.slots.

**Cause**
Slots were declared without an active layout view to render them.

**Fix**
Declare layout.view on the same route or an ancestor route, or remove layout.slots.

## Route "..." layout.slots must be an object.

**Symptom**
Validation fails on layout.slots.

**Cause**
layout.slots was provided but is not an object.

**Fix**
Use layout.slots: { name: true } or layout.slots: { name: { view, meta, routes } }.

## Route "..." defines a slot with an empty name.

**Symptom**
Validation fails while reading slot entries.

**Cause**
layout.slots contains an empty-string key.

**Fix**
Use a non-empty slot name such as header, sidebar, or modal.

## Missing slot "..." for route "...".

**Symptom**
Validation fails on a child slot declaration.

**Cause**
A child route declares layout.slots.<name>, but no active ancestor layout declares that slot and the current route does not own a layout view.

**Fix**
Declare the slot on an active ancestor layout or remove the child slot declaration.

## Route "..." declares invalid configuration for slot "...".

**Symptom**
Validation fails on a slot value.

**Cause**
The slot is false, null, undefined, or otherwise not a supported slot declaration.

**Fix**
Use true, a slot view component, or an object with view, meta, and/or routes.

## Route "..." defines invalid configuration for slot "...".

**Symptom**
Validation fails on a slot config object.

**Cause**
The slot config is null, an array, or another invalid value where an object config was expected.

**Fix**
Use a valid slot config object.

## Route "..." declares "layout.slots....id", but slot IDs are no longer supported.

**Symptom**
Validation fails on a removed slot field.

**Cause**
The slot config still uses the removed id property.

**Fix**
Remove layout.slots.<name>.id. The slot key is the slot identity.

## Unsupported slot fallback: slot fallbacks are no longer supported on route "...".

**Symptom**
Validation fails on a removed slot field.

**Cause**
The slot config still uses the removed fallback property.

**Fix**
Remove layout.slots.<name>.fallback. Use the slot declaration itself and render fallback UI from the layout if needed.

## Unsupported slot key "..." on route "...".

**Symptom**
Validation fails on an unknown slot config key.

**Cause**
The slot config contains a key other than view, meta, or routes.

**Fix**
Remove the unsupported key or move that information into slot meta.

## Route "..." slot "..." routes must be an array.

**Symptom**
Validation fails on slot routes.

**Cause**
layout.slots.<name>.routes was provided but is not an array.

**Fix**
Use routes: [...] or omit routes.

## Route "..." intercepts must be an object.

**Symptom**
Validation fails on intercepts.

**Cause**
intercepts was provided but is not an object.

**Fix**
Use intercepts: { slotName: { to, view } } or remove intercepts.

## Route "..." defines an intercept with an empty slot name.

**Symptom**
Validation fails while reading intercept entries.

**Cause**
intercepts contains an empty-string key.

**Fix**
Use a non-empty slot name that matches a declared layout slot.

## Route "..." intercept for slot "..." must be an object.

**Symptom**
Validation fails on an intercept config.

**Cause**
The intercept slot value is missing, null, or not an object.

**Fix**
Use { to: "target.route", view: InterceptView }.

## Invalid intercept slot "..." on route "...".

**Symptom**
Validation fails because the intercept slot is not declared.

**Cause**
The route configures an intercept for a slot that is not declared on this route or an active ancestor layout.

**Fix**
Declare layout.slots.<name> on the source route layout or an active ancestor layout, or remove the intercept.

## Route "..." intercept for slot "..." must define view.

**Symptom**
Validation fails on an intercept config.

**Cause**
The intercept config does not provide a view.

**Fix**
Add the intercept view component.

## Route "..." intercept for slot "..." must define at least one target route id.

**Symptom**
Validation fails on intercept.to.

**Cause**
The intercept target list is empty.

**Fix**
Provide a target route id string or a non-empty array of target route ids.

## Route "..." intercept for slot "..." defines an empty target route id.

**Symptom**
Validation fails on intercept.to.

**Cause**
The intercept target string or one of the target array entries is empty.

**Fix**
Replace it with a valid target route id.

## Route "..." intercept "..." targets unknown route id "...".

**Symptom**
Validation fails after all routes have been collected.

**Cause**
The intercept points to a route id that does not exist in the route tree.

**Fix**
Fix the target route id or add the missing route.

## defineRouteTree routes must be an array.

**Symptom**
Modular route tree composition fails before route declarations are collected.

**Cause**
defineRouteTree({ routes }) received a non-array routes value.

**Fix**
Pass the array of defineRoute(...) declarations to defineRouteTree({ routes }).

## Every route declaration must be an object.

**Symptom**
Modular route tree composition fails while collecting declarations.

**Cause**
A defineRouteTree routes entry or inline child declaration is null, undefined, primitive, or otherwise not an object.

**Fix**
Export route declarations created with defineRoute({...}) and pass only those declarations to defineRouteTree.

## Every route declaration must define a non-empty string id.

**Symptom**
Modular route tree composition cannot identify a declaration.

**Cause**
A route declaration is missing id, has an empty id, or uses a non-string id.

**Fix**
Give every defineRoute declaration a stable non-empty string id.

## Route "..." parent must be a string when provided.

**Symptom**
defineRouteTree fails on parent.

**Cause**
parent was provided but is not a string.

**Fix**
Use parent: "parent.route.id" or omit parent for root declarations.

## Route "..." order must be a number when provided.

**Symptom**
defineRouteTree fails on order.

**Cause**
order was provided but is not a number.

**Fix**
Use a numeric order value or omit order.

## Route "..." is declared inline under "..." but declares parent "...".

**Symptom**
defineRouteTree fails while collecting inline children.

**Cause**
An inline child declares a parent different from the containing route id.

**Fix**
Omit parent on inline children or set it to the containing route id.

## Route "..." declares parent "...", but no route with id "..." exists.

**Symptom**
defineRouteTree fails while attaching parented routes.

**Cause**
A declaration references a parent id that was not included in the route declaration array.

**Fix**
Add the missing parent declaration or fix the parent id.

## Route "..." declares parent "...", but redirect routes cannot have children.

**Symptom**
defineRouteTree fails while attaching parented routes.

**Cause**
The declared parent route has redirect, and redirect routes cannot own children.

**Fix**
Move the child to a different parent or remove redirect from the parent.

## Route parent cycle found: ....

**Symptom**
defineRouteTree fails during parent cycle validation.

**Cause**
The parent graph contains a cycle, such as a -> b -> a.

**Fix**
Break the cycle by changing or removing one parent reference.

## Route "..." has parent "..." but uses absolute path "...". Child route paths must be relative.

**Symptom**
defineRouteTree fails during composition validation.

**Cause**
A route with parent uses an absolute path starting with /.

**Fix**
Use a relative child path such as "details" instead of "/details".

## Route "..." intercept "..." uses a slot that is not declared by the source route layout or an ancestor layout.

**Symptom**
defineRouteTree fails during intercept validation.

**Cause**
The source route configures an intercept for a slot that is not declared locally or by an ancestor layout.

**Fix**
Declare the slot in layout.slots on the source route or an ancestor route.

## Duplicate search descriptor key "..." passed to mergeSearch().

**Symptom**
Reusable search descriptor merging fails.

**Cause**
Two descriptors passed to mergeSearch() contain the same key.

**Fix**
Rename one key or merge the descriptors manually so the override is explicit.

## Router url.pathMatch.end: false is not supported yet.

**Symptom**
Router URL option validation fails.

**Cause**
pathMatch.end was set to false, but prefix matching is not supported by the current route match state.

**Fix**
Remove pathMatch.end: false. Use exact route matching until prefix matching is supported.

## Href, navigation, middleware, and router lifecycle errors

| Error message                                                                                                                 | Cause                                                                                                                                | Fix                                                                                                                                    |
| ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| `Cannot generate href because route "..." is not registered. Check the route id or regenerate .cookbook-router/contracts.ts.` | `router.href()`, navigation, or preload received an unknown route ID.                                                                | Fix the route ID and regenerate contracts after route changes.                                                                         |
| `Cannot generate href for route "..." because it does not resolve to a URL path.`                                             | The target is a pathless group/layout route rather than a concrete path or index route.                                              | Navigate to a concrete child route.                                                                                                    |
| `Route "..." expected param "..." to satisfy "...", but received ...`                                                         | A required param is missing or does not satisfy its path constraint chain.                                                           | Supply the generated param input type and satisfy every constraint.                                                                    |
| `Generated href "..." for route "..." does not satisfy route path "...".`                                                     | Generated params, basename, pruning, or custom constraints produced a pathname that the route cannot match.                          | Check params, basename, path options, and custom constraint `parse`/`toRegExp` behavior.                                               |
| `Resolved route "..." did not match its generated href.`                                                                      | Navigation resolved a route target, but the generated href did not match the same route.                                             | Check route constraints and URL options for asymmetric build/match behavior.                                                           |
| `Cannot navigate to internal href "..." with route option "...".`                                                             | An internal literal href was combined with route-only `params`, `search`, or `hash` options.                                         | Put those values directly in the href or navigate by route ID.                                                                         |
| `Middleware redirect target must be a non-empty string, but received ...`                                                     | Middleware returned or created an invalid redirect destination.                                                                      | Return `context.redirect('/path')`, a `Response`, or a valid non-empty redirect string.                                                |
| `Cannot run middleware without a matched route branch.`                                                                       | Middleware execution was requested without a route match.                                                                            | Run middleware through Router navigation/matching rather than calling the internal transition path directly.                           |
| `Router maxRedirectDepth must be a non-negative integer.`                                                                     | `maxRedirectDepth` is negative, fractional, or otherwise invalid.                                                                    | Use an integer `>= 0`.                                                                                                                 |
| `Navigation exceeded the maximum redirect count.`                                                                             | Redirects or middleware redirects formed a loop or exceeded `maxRedirectDepth`.                                                      | Break the redirect loop or raise `maxRedirectDepth` only when the chain is intentional.                                                |
| `History implementation cannot redirect to external URL "...".`                                                               | A route or middleware redirect resolved to an external URL, but the active history does not implement `redirectExternal`.            | Provide a history with `redirectExternal`, handle the external navigation at the application boundary, or redirect to an internal URL. |
| `Middleware cannot rewrite to external URL "...".`                                                                            | Middleware returned an external target from `rewrite()`. Rewrites are internal and do not perform browser-level external navigation. | Return an internal rewrite target or use `redirect()` with a history that supports external redirects.                                 |
| `Router has been disposed. Create a new router instance before starting, navigating, refreshing, or preloading.`              | An operation was called after `router.dispose()`.                                                                                    | Create a new router instance.                                                                                                          |
| `The route preload was aborted.` (`AbortError`)                                                                               | The preload signal was aborted.                                                                                                      | Treat it as cancellation or use a non-aborted signal.                                                                                  |

## URL descriptors, constraints, and serialization errors

| Error message                                                                                                                                  | Cause                                                                                     | Fix                                                                                                        |
| ---------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `Route "..." has an invalid URL descriptor. ...` / `Route URL descriptor has an invalid URL descriptor. ...`                                   | URLKit rejected path, search, hash, defaults, codecs, or custom-constraint configuration. | Use the included URLKit error code/path to fix the descriptor. The original error is available as `cause`. |
| `Router path constraint names must be non-empty strings.`                                                                                      | A custom constraint map contains an empty key.                                            | Register every constraint under a non-empty name.                                                          |
| `Duplicate search descriptor key "..." passed to mergeSearch().`                                                                               | Multiple search descriptors contain the same key.                                         | Rename the key or merge explicitly.                                                                        |
| `Router url.pathMatch.end: false is not supported yet. Prefix matching requires route match state to expose consumed and remaining pathnames.` | Prefix path matching was requested.                                                       | Remove `end: false`; Router currently requires complete route matches.                                     |
| `Serialized router state must be a non-empty JSON string.`                                                                                     | `deserializeRouterState()` received an empty/non-string value.                            | Pass output from `stringifyRouterState()`.                                                                 |
| `Serialized router state must be an object.`                                                                                                   | Parsed state is not an object.                                                            | Use Router serialization APIs without altering the JSON shape.                                             |
| `Serialized router state contains an invalid location.`                                                                                        | Serialized location fields are missing or invalid.                                        | Regenerate serialized state from a current Router instance.                                                |
| `Serialized router state contains an invalid navigation state.`                                                                                | Serialized navigation state is malformed.                                                 | Regenerate serialized state and avoid hand-editing it.                                                     |

## History, SSR, and hydration errors

| Error message                                                                                                           | Cause                                                     | Fix                                                                           |
| ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `Browser history requires a window-like environment. Use createMemoryRouter or createStaticRouter outside the browser.` | Browser history was created in Node/SSR without `window`. | Use memory/static routing or provide a browser-like window.                   |
| `Static history cannot push navigation entries.`                                                                        | Code attempted `push()` on static history.                | Redirect or return the final SSR response instead of mutating static history. |
| `Static history cannot replace navigation entries.`                                                                     | Code attempted `replace()` on static history.             | Redirect or construct the intended static URL before starting.                |
| `createStaticRouter requires either url or request.`                                                                    | Neither SSR input was supplied.                           | Pass `url` or `request`.                                                      |
| `Static router URL must be a string, URL, or Request.`                                                                  | The SSR input has an unsupported type.                    | Pass a string, `URL`, or `Request`.                                           |
| `Static router URL must use http, https, or a relative path, but received protocol "...".`                              | The URL uses an unsafe/unsupported protocol.              | Use `http:`, `https:`, or a relative URL.                                     |
| `Static router URL must resolve to an absolute pathname.`                                                               | The resolved pathname does not begin with `/`.            | Pass an absolute pathname or a valid absolute HTTP(S) URL.                    |
| `Hydration data was created for "...", but the client history is currently at "...".`                                   | Server hydration data and client location differ.         | Create the client router at the same location or omit hydration data.         |

## Intercept errors

| Error message                                                                                                           | Cause                                                     | Fix                                                                |
| ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------ |
| `Call-site intercept configuration must define a non-empty slot.`                                                       | A link/navigation intercept omitted `slot`.               | Provide the declared slot name.                                    |
| `Call-site intercept for slot "..." must define view.`                                                                  | The call-site intercept omitted its view.                 | Provide the intercept view component/value.                        |
| `Route "..." intercept for slot "..." targets unknown route id "...".`                                                  | An intercept target does not exist.                       | Fix the target ID or add the route.                                |
| `Cannot intercept route from "..." into slot "..." because the current route tree does not define or render that slot.` | The source branch has no active declaration for the slot. | Declare/render the slot in the source route or an ancestor layout. |

## React integration errors

| Error message                                                                                                                      | Cause                                                       | Fix                                                                     |
| ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------- |
| `<hookName> must be used inside <RouterProvider> or <StaticRouterProvider>.`                                                       | A React hook was called without Router context.             | Render the component under a live or static provider.                   |
| `Outlet context ... was requested in strict mode, but no context was provided by the parent Outlet or Slot.`                       | `useOutletContext(..., { strict: true })` found no context. | Provide `context` on the parent `Outlet`/`Slot` or disable strict mode. |
| `NavLink requires route, to, or href.`                                                                                             | `NavLink` has no destination.                               | Pass one destination prop.                                              |
| `Cookbook Router static rendering requires a started router. Call await router.start() before rendering <StaticRouterProvider />.` | Static rendering began before route resolution.             | Await `router.start()` first.                                           |

## CLI config and command errors

| Error message                                                                                                          | Cause                                                                        | Fix                                                                                      |
| ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `No cookbook-router config file found. Expected one of: ...`                                                           | A command requiring config could not find a supported filename.              | Run `cookbook-router init` or pass the config path.                                      |
| `Router config "..." could not be found or read.`                                                                      | The requested config cannot be opened.                                       | Fix the path/permissions; inspect `cause` for the filesystem error.                      |
| `Refusing to overwrite existing router config "...".`                                                                  | `init` found an existing config.                                             | Keep/edit it or remove it deliberately before rerunning init.                            |
| `Router config "..." could not be statically resolved.`                                                                | The default export is not a supported static object/config declaration.      | Export `defineRouterConfig({ ... })`, a static object, or a local static identifier.     |
| `Router config "..." outDir must be a string when provided.`                                                           | `outDir` is not a string.                                                    | Provide a path string.                                                                   |
| `Router config "..." property "..." must be a static string or string array.`                                          | A statically extracted config field is computed or has the wrong type.       | Use a literal string or literal string array.                                            |
| `Router config "..." routeFiles must not be empty.`                                                                    | `routeFiles` is empty.                                                       | Add at least one pattern.                                                                |
| `Router config "..." routeFiles must be a string or string array.`                                                     | `routeFiles` has the wrong type.                                             | Use one pattern or an array of patterns.                                                 |
| `Router config "..." routeFiles entries must be non-empty strings.`                                                    | A route-file pattern is empty/non-string.                                    | Remove or replace the invalid entry.                                                     |
| `Router config "..." uses pathConstraints that the CLI cannot statically evaluate.`                                    | Constraint configuration is computed or imported from an unsupported source. | Use an inline/local static object or a named relative import from a runtime-safe module. |
| `The identifier "..." must be a static object declared in the config file or a named import from a relative module.`   | A path-constraint identifier cannot be resolved statically.                  | Make the object static or use a supported named relative import.                         |
| `Router config "..." imports pathConstraints from "...", but the module could not be resolved.`                        | The relative constraint module is missing/unresolvable.                      | Fix the import path/extension.                                                           |
| `... export "..." is not a static object declaration.`                                                                 | The imported constraint export is computed or not an object.                 | Export a static constraint object.                                                       |
| `No routes or routeFiles were provided.`                                                                               | Generation received neither in-memory routes nor route patterns.             | Provide one source.                                                                      |
| `No route files matched routeFiles pattern ...`                                                                        | Glob expansion returned no files.                                            | Fix the pattern or create the route files.                                               |
| `routeFiles patterns must be non-empty strings.`                                                                       | A glob pattern is empty/non-string.                                          | Supply valid patterns.                                                                   |
| `Glob routeFiles require a file system with readdir and stat support.`                                                 | The custom filesystem cannot expand globs.                                   | Implement `readdir`/`stat` or pass concrete files.                                       |
| `Conflicting pathOptions were provided ...`                                                                            | Multiple sources define different path options.                              | Move options to config or make every source identical.                                   |
| `Duplicate path constraint name "..." was provided ...`                                                                | Config/route sources define the same custom constraint name.                 | Define each name once, preferably in config.                                             |
| `Generated routes.ts cannot safely preserve pathConstraints declared inside multiple or rewrapped route source files.` | Generation cannot reproduce the runtime constraint imports safely.           | Move constraints to config or generate from one directly re-exportable static tree.      |

## CLI route-file extraction errors

| Error message                                                                                                                                     | Cause                                                                     | Fix                                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `Route file "..." must export routes from defineRoutes([...]), defineRouteTree({ routes: [...] }), defineRoute({...}), or a static routes array.` | No supported static route export was found.                               | Use one of the listed static forms.                                                                   |
| `Route file "..." must provide a routes array.`                                                                                                   | The loaded export is not an array.                                        | Export a route array/tree.                                                                            |
| `Route file "..." defineRouteTree() must receive a static object literal.`                                                                        | The call argument is computed.                                            | Inline a static object.                                                                               |
| `Route file "..." defineRouteTree() must define a routes array.`                                                                                  | The static object lacks `routes`.                                         | Add `routes: [...]`.                                                                                  |
| `Route file "..." defineRouteTree() routes must be an inline static array for CLI generation.`                                                    | `routes` points to an unsupported computed value.                         | Inline the array or use a directly supported static export.                                           |
| `The CLI could not statically evaluate defineRoutes options.`                                                                                     | The second argument uses an unsupported expression.                       | Use supported static `pathConstraints`/`pathOptions` forms.                                           |
| `Route file "..." uses pathOptions that the CLI cannot statically evaluate.`                                                                      | `pathOptions` is computed.                                                | Use an inline/local static object.                                                                    |
| `Route file "..." uses pathConstraints that the CLI cannot statically evaluate.`                                                                  | Constraints use an unsupported expression.                                | Use a supported static object or config import.                                                       |
| `Route file "..." has a pathConstraints object the CLI cannot statically evaluate. Constraint entries must use static property names.`            | A constraint key is computed.                                             | Use literal property names.                                                                           |
| `Parameter "..." must be a string.`                                                                                                               | A statically evaluated custom constraint received a non-string parameter. | Pass the expected string argument.                                                                    |
| `Route file "..." contains an unterminated pathConstraints object.`                                                                               | Source parsing reached EOF before `}`.                                    | Fix the syntax.                                                                                       |
| `Route file "..." contains an unterminated static object.`                                                                                        | Static source scanning reached EOF.                                       | Fix the object syntax.                                                                                |
| `Route file "..." contains an unterminated routes array.`                                                                                         | Static source scanning reached EOF.                                       | Close the array.                                                                                      |
| `Route file "..." contains invalid JSON.`                                                                                                         | JSON parsing failed.                                                      | Fix the JSON; the original parser error is in `cause`.                                                |
| `Route file "..." could not be evaluated as a static route declaration.`                                                                          | Sanitized static evaluation failed.                                       | Remove runtime-only/computed metadata and inspect `cause`.                                            |
| `Route file "..." uses URLKit runtime builders in a static route declaration.`                                                                    | CLI-consumed routes use runtime descriptor builders/codecs.               | Replace them with static descriptors or move runtime builders outside CLI-consumed files.             |
| `Route file "..." imports static route metadata from "...", but the module could not be resolved.`                                                | A static metadata import is missing.                                      | Use a valid relative/absolute path and extension.                                                     |
| `... CLI static metadata imports must use relative or absolute file paths.`                                                                       | A path alias or bare import supplies static metadata.                     | Use relative/absolute imports for static metadata. Runtime-only component imports may remain aliased. |
| `Route file "..." is not directly loadable by the CLI.`                                                                                           | The extension/export form is unsupported.                                 | Use JSON, JS, TS, or TSX with a supported route export.                                               |

## CLI output and build-plugin errors

| Error message                                                                                   | Cause                                                                  | Fix                                                                                 |
| ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `CLI ... must be a non-empty path string.`                                                      | An input/output path is empty or non-string.                           | Supply a valid path.                                                                |
| `CLI ... contains a null byte and cannot be used as a file path.`                               | A path is unsafe.                                                      | Remove the null byte and validate external input.                                   |
| `Refusing to write generated router artifacts over route source file "...".`                    | `outDir` overlaps a route source.                                      | Use a separate generated-output directory.                                          |
| `Refusing to write generated router artifact outside outDir: "...".`                            | A generated path escapes `outDir`.                                     | Fix output names/configuration.                                                     |
| Aggregated compiler/build errors (`result.errors.join('\n')` or `formatRouterBuildErrors(...)`) | CLI generation/validation failed during a Vite, Bun, or compiler hook. | Read each included underlying error; fix the first source/config error and rebuild. |
| AJV schema text from `defineRouterConfig()`                                                     | Programmatic config does not satisfy the config schema.                | Correct the fields named by AJV.                                                    |
