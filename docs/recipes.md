# Recipes

Use these recipes as production patterns, not isolated tricks. Cookbook Router is the source of truth for route contracts, URL parsing, navigation lifecycle, metadata, slots, interception, preloading, and rendering shape. Your app stays in charge of the business of the product: data fetching, caching, invalidation, mutations, and server framework integration.

## Table of contents

- [React app bootstrap](#react-app-bootstrap)
- [Provider middleware and protected routes](#provider-middleware-and-protected-routes)
- [Login redirect with return URL](#login-redirect-with-return-url)
- [Public routes with metadata](#public-routes-with-metadata)
- [Breadcrumbs from route metadata](#breadcrumbs-from-route-metadata)
- [Page titles and app frame from route metadata](#page-titles-and-app-frame-from-route-metadata)
- [URL-backed filters and pagination](#url-backed-filters-and-pagination)
- [Preserve unknown search params](#preserve-unknown-search-params)
- [Hash-backed tabs and sections](#hash-backed-tabs-and-sections)
- [Code splitting and link prefetch](#code-splitting-and-link-prefetch)
- [Userland query cache warming](#userland-query-cache-warming)
- [Configured modal routes](#configured-modal-routes)
- [Link-level previews](#link-level-previews)
- [Bypass configured interception](#bypass-configured-interception)
- [Navigation blocking for dirty forms](#navigation-blocking-for-dirty-forms)
- [Route-driven slots and layout UI](#route-driven-slots-and-layout-ui)
- [Current-route re-resolution](#current-route-re-resolution)
- [Memory-router component tests](#memory-router-component-tests)
- [SSR response mapping](#ssr-response-mapping)
- [Generated contracts in TypeScript projects](#generated-contracts-in-typescript-projects)
- [Custom path constraints](#custom-path-constraints)

## React app bootstrap

Let `RouterProvider` open the door. In a standard React browser app, it initializes the router for you. Do not call `router.start()` before rendering unless your app deliberately controls startup order.

```tsx
import { createRoot } from 'react-dom/client';
import { createRouter } from '@cookbook/router';
import { RouterProvider } from '@cookbook/router-react';
import { routes } from '../.cookbook-router/routes';

const router = createRouter({ routes });

createRoot(document.getElementById('root')!).render(<RouterProvider router={router} />);
```

Use manual startup only when the provider is not responsible for startup, or when the app has a real reason to run setup before React renders:

```tsx
router.useMiddleware([authMiddleware]);
await router.start();

createRoot(document.getElementById('root')!).render(
  <RouterProvider router={router} autoStart={false} />,
);
```

## Provider middleware and protected routes

Put access rules where routing can see them. Attach authorization hints to route metadata, then enforce them with middleware registered through `RouterProvider`. Provider middleware runs as part of provider-owned startup, so protected routes are guarded from the first resolution.

```ts
import type { Middleware } from '@cookbook/router';

const authMiddleware: Middleware = ({ route, location, redirect }) => {
  if (!route.route.meta?.requiresAuth || session.isAuthenticated()) {
    return;
  }

  return redirect(`/login?redirect=${encodeURIComponent(location.href)}`);
};
```

```tsx
const middleware = React.useMemo(() => [authMiddleware], []);

return <RouterProvider router={router} middleware={middleware} />;
```

Read metadata from the normalized matched route:

```ts
route.route.meta;
```

Reach for `route.route.route` only when you need the original authored `RouteDefinition`.

## Login redirect with return URL

A login redirect should remember the user’s destination, not make them start over. Model the return URL as typed search state.

```ts
export const loginRoute = defineRoute({
  id: 'login',
  path: '/login',
  search: {
    redirect: { type: 'string', optional: true },
  },
  meta: {
    access: 'public',
  },
} as const);
```

Redirect unauthenticated users with the current href:

```ts
const authMiddleware: Middleware = ({ route, location, redirect }) => {
  if (route.route.meta?.access === 'public' || session.isAuthenticated()) {
    return;
  }

  return redirect(`/login?redirect=${encodeURIComponent(location.href)}`);
};
```

After login, replace the current entry with the requested destination. Pass `intercept: false` so the return trip lands on the canonical page, not inside a contextual intercept that happened to be active.

```tsx
import { useNavigate, useSearchParams } from '@cookbook/router-react';

function LoginForm() {
  const navigate = useNavigate();
  const search = useSearchParams('login');

  async function submit() {
    await session.login();

    const redirectTo = search.redirect ?? '/overview';
    await navigate.replace(redirectTo, { intercept: false });
  }

  // ...
}
```

## Public routes with metadata

Make public access a route property, not a growing list of exceptions. Metadata keeps the policy visible where the route is defined.

```ts
export const privacyPolicyRoute = defineRoute({
  id: 'policies.privacy',
  parent: 'policies',
  path: 'privacy-policy',
  view: PrivacyPolicyPage,
  meta: {
    access: 'public',
  },
} as const);
```

Then middleware can skip public routes without hard-coding route ids:

```ts
const authMiddleware: Middleware = ({ route, redirect, location }) => {
  if (route.route.meta?.access === 'public' || session.isAuthenticated()) {
    return;
  }

  return redirect(`/login?redirect=${encodeURIComponent(location.href)}`);
};
```

## Breadcrumbs from route metadata

A breadcrumb is a convention your app owns. The router carries the metadata; your UI decides how to tell the story.

```ts
defineRoute({
  id: 'users',
  path: '/users',
  meta: {
    breadcrumb: { label: 'Users', to: 'users' },
  },
} as const);
```

Read ancestor metadata and append breadcrumb values into one trail:

```tsx
import { Link, useRouteMeta } from '@cookbook/router-react';

function Breadcrumbs() {
  const meta = useRouteMeta({
    includeAncestors: true,
    merge: {
      keys: {
        breadcrumb: 'append',
      },
    },
  });

  const breadcrumbs = meta.breadcrumb ?? [];

  return (
    <nav>
      {breadcrumbs.map((item) => (
        <Link key={item.label} to={item.to}>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
```

Use `merge: false` when you want the raw metadata chain instead of one merged object:

```ts
const metaChain = useRouteMeta({
  includeAncestors: true,
  merge: false,
});
```

`merge: false` returns metadata objects only. Use `useMatches()` when you also need route ids, params, or match internals.

## Page titles and app frame from route metadata

Page metadata should do visible work. Use it to set the document title, then merge ancestors when the surrounding app frame needs inherited configuration.

`useRouteMeta()` returns local metadata by default.

```tsx
function PageTitle() {
  const meta = useRouteMeta();

  React.useEffect(() => {
    if (typeof meta.title === 'string') {
      document.title = meta.title;
    }
  }, [meta.title]);

  return null;
}
```

Use ancestor merging for the app frame and inherited page configuration:

```tsx
const meta = useRouteMeta({
  includeAncestors: true,
  merge: {
    default: 'shallow',
    keys: {
      layout: 'deep',
      breadcrumb: 'append',
      title: 'leaf',
    },
  },
});
```

For a simpler leaf-wins merge:

```tsx
const meta = useRouteMeta({
  includeAncestors: true,
  merge: 'leaf',
});
```

`merge: 'leaf'` works key by key. Parent keys stay in place unless a child route defines the same key.

## URL-backed filters and pagination

Filters belong in the URL when users need links, refreshes, and browser history to keep their place. Define search params once and let navigation stay typed.

```ts
import { defineRoute, defineSearch, mergeSearch } from '@cookbook/router';

const paginationSearch = defineSearch({
  page: { type: 'int', default: 1 },
  pageSize: { type: 'int', default: 25 },
} as const);

const usersSearch = defineSearch({
  status: { type: 'string', default: 'all' },
  role: { type: 'string', optional: true },
  q: { type: 'string', optional: true },
} as const);

export const usersRoute = defineRoute({
  id: 'users',
  path: '/users',
  search: mergeSearch(usersSearch, paginationSearch),
} as const);
```

Update filters by navigating to the same route with new search state:

```tsx
function UsersFilters() {
  const search = useSearchParams('users');
  const navigate = useNavigate();

  return (
    <button
      onClick={() =>
        navigate.to('users', {
          search: {
            ...search,
            role: 'admin',
            page: 1,
          },
        })
      }
    >
      Admins
    </button>
  );
}
```

Use `NavLink` `end` options when active matching should ignore selected URL parts, such as search params used for filters.

## Preserve unknown search params

Sometimes the URL carries value your route contract does not own. Preserve unknown search params when UTM tags, attribution keys, or partner parameters need to survive navigation.

```ts
const router = createRouter({
  routes,
  url: {
    unknownSearch: 'preserve',
  },
});
```

Read undeclared keys separately from typed declared search:

```tsx
import { useSearchParams, useUnknownSearchParams } from '@cookbook/router-react';

function Attribution() {
  const search = useSearchParams('landing');
  const unknownSearch = useUnknownSearchParams();

  analytics.track('landing-view', {
    campaign: search.campaign,
    utmSource: unknownSearch.utm_source,
  });

  return null;
}
```

If unknown keys should not survive routing, keep the default `'strip'` behavior or configure `unknownSearch: 'strip'` explicitly.

## Hash-backed tabs and sections

Use the hash for lightweight page state that feels local to the page, such as active tabs or jump sections.

```ts
export const settingsRoute = defineRoute({
  id: 'settings',
  path: '/settings',
  hash: {
    type: 'enum',
    values: ['profile', 'billing', 'security'],
    optional: true,
  },
} as const);
```

```tsx
function SettingsTabs() {
  const navigate = useNavigate();
  const activeTab = useHashParams('settings') ?? 'profile';

  return (
    <Tabs
      value={activeTab}
      onValueChange={(hash) => {
        void navigate.to('settings', { hash });
      }}
    />
  );
}
```

`useHashParams()` returns the parsed hash value without the leading `#`, or `null` when no hash is present.

## Code splitting and link prefetch

Make the route view lazy once, then let links create intent before the click. `lazyRouteView()` lets the same route view be rendered and preloaded without duplicating imports.

```tsx
import { lazyRouteView } from '@cookbook/router-react';

const UsersPage = lazyRouteView(() => import('./users-page'));

export const usersRoute = defineRoute({
  id: 'users',
  path: '/users',
  view: UsersPage,
} as const);
```

Prefetch route views or generated route modules from links:

```tsx
<Link to="users" prefetch="interaction">
  Users
</Link>
```

Available prefetch modes are:

```ts
false;
('hover');
('focus');
('interaction');
('mount');
```

Use `prefetch="interaction"` for hover/focus intent. Use `prefetch="mount"` only for high-value links where eager work is worth the cost.

For generated or file-based routes, generated runtime route modules attach internal module preloaders. Link prefetch can warm the route module without an authored route-level `preload` callback.

## Userland query cache warming

Preloading should prepare your app, not move ownership into the router. Use route-level `preload` when a route should warm application-owned systems before navigation.

```ts
export const userDetailsRoute = defineRoute({
  id: 'users.details',
  path: '/users/{id:int}',
  preload: async ({ params, signal }) => {
    await queryClient.prefetchQuery({
      queryKey: ['user', params.id],
      queryFn: () => fetchUser(params.id, { signal }),
    });
  },
} as const);
```

This does not put data into the router. The query client still owns caching, invalidation, mutations, rendering state, and SSR data hydration.

You can also preload explicitly:

```ts
await router.preload('users.details', {
  params: { id: 123 },
});
```

or by href:

```ts
await router.preloadHref('/users/123');
```

## Configured modal routes

Use configured intercepts when a source route should consistently open a target route in a slot during client navigation.

```tsx
const CreateModal = lazyRouteView(() => import('./create-modal'));

export const overviewRoute = defineRoute({
  id: 'overview',
  parent: 'root',
  path: 'overview',
  view: OverviewPage,
  intercepts: {
    modal: {
      to: 'create',
      view: CreateModal,
    },
  },
} as const);
```

The source layout must define and render the slot:

```tsx
function DashboardLayout() {
  return (
    <>
      <Outlet />
      <Slot name="modal" />
    </>
  );
}
```

Client navigation from the configured source route renders the target through the slot. Direct visits to the target route render the canonical page.

## Link-level previews

Two links can point to the same truth and still create different experiences. Use link-level interception when only selected links should show a canonical destination through contextual UI.

```tsx
<Link to="documents.details" params={{ documentId: document.id }}>
  {document.title}
</Link>
```

```tsx
<Link
  to="documents.details"
  params={{ documentId: document.id }}
  intercept={{
    slot: 'modal',
    view: DocumentPreview,
  }}
  preventScrollReset
>
  Preview document
</Link>
```

Both links target the same canonical route. The second link asks the router to render that route through the `modal` slot for this navigation only.

## Bypass configured interception

Sometimes the full page is the point. Use `intercept={false}` when a route should render canonically even if the active route has a configured intercept for the target.

```tsx
<Link to="create" intercept={false}>
  Open full create page
</Link>
```

The same opt-out is available for programmatic navigation:

```ts
await router.navigate.replace('/create', { intercept: false });
```

Use this in login redirects, deep-link recovery flows, and actions where contextual modal rendering would be surprising.

## Navigation blocking for dirty forms

Protect unfinished work at the navigation layer. `useBlocker()` covers unsaved changes and other client-side leave guards.

```tsx
function NewMessage() {
  const [formData, setFormData] = React.useState({
    name: '',
    email: '',
    message: '',
  });

  useBlocker({
    when: Boolean(formData.name || formData.email || formData.message),
    message: 'Your message has not been sent. Leave and discard your draft?',
  });

  // ...
}
```

The blocker applies whether the route is rendered canonically or through an intercepted slot.

## Route-driven slots and layout UI

Give the layout named places to work with. Use slots for dashboard UI such as sidebars, headers, modals, and panels.

```ts
export const rootRoute = defineRoute({
  id: 'root',
  path: '/',
  layout: {
    view: DashboardLayout,
    slots: {
      header: true,
      sidebar: true,
      modal: true,
    },
  },
} as const);
```

Render slots from the layout view:

```tsx
function DashboardLayout() {
  return (
    <>
      <aside>
        <Slot name="sidebar" />
      </aside>
      <header>
        <Slot name="header" />
      </header>
      <main>
        <Outlet />
      </main>
      <Slot name="modal" />
    </>
  );
}
```

Route children can provide route-specific slot content through their layout config.

## Current-route re-resolution

Startup happens once. Reality changes. Use `refresh()` when the current location should be resolved again after startup.

```ts
await router.refresh();
```

Use `refresh()` after runtime conditions change and should affect the current route, for example:

- auth state changed
- runtime middleware changed
- feature flags changed
- client-only URL state became available

`start()` initializes the router once. `refresh()` re-runs the current-location resolution.

## Memory-router component tests

A component test should not need a browser to prove routing behavior. Use `createMemoryRouter()` for React component tests.

```tsx
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, defineRoutes } from '@cookbook/router';
import { RouterProvider } from '@cookbook/router-react';

it('renders user details', async () => {
  const router = createMemoryRouter({
    initialEntries: ['/users/42'],
    routes: defineRoutes([
      {
        id: 'users.details',
        path: '/users/{id:int}',
        view: UserDetailsPage,
      },
    ] as const),
  });

  render(<RouterProvider router={router} />);

  expect(await screen.findByText('User 42')).toBeInTheDocument();
});
```

Do not call `router.start()` first when testing through `RouterProvider`; the provider starts the router.

## SSR response mapping

On the server, resolve first and respond with intent. A static router resolves the request URL before rendering.

```tsx
const router = createStaticRouter({
  routes,
  url: request.url,
});

const state = await router.start();
```

Map router state to your server framework response before rendering or sending headers:

```ts
if (!state.match) {
  return new Response(renderNotFoundHtml(), { status: 404 });
}

if (state.error) {
  return new Response(renderErrorHtml(state.error), { status: 500 });
}
```

Cookbook Router does not force an HTTP server framework. Keep redirect, status, and header mapping in your SSR adapter.

Client hydration uses serialized router state:

```tsx
const hydrationData = stringifyRouterState(router);
```

## Generated contracts in TypeScript projects

Generated contracts only help TypeScript when TypeScript can see them. Include the generated contract and registration files in `tsconfig.json`.

```json
{
  "include": ["src", ".cookbook-router/contracts.ts", ".cookbook-router/register.d.ts"]
}
```

If your app source root is not `src`, include that root instead:

```json
{
  "include": ["app", ".cookbook-router/contracts.ts", ".cookbook-router/register.d.ts"]
}
```

The route tree module can still be imported normally from application code:

```ts
import { routes } from '../.cookbook-router/routes';
```

The explicit `contracts.ts` and `register.d.ts` includes make route ids, params, search, hash, metadata, and hook narrowing visible to TypeScript.

## Custom path constraints

Use custom path constraints when a route parameter has a product rule worth naming and reusing.

```ts
import { createPathConstraint } from '@cookbook/router';

export const pathConstraints = {
  slug: createPathConstraint({
    parse: (paramName, value) => {
      if (typeof value !== 'string' || !/^[a-z0-9-]+$/.test(value)) {
        throw new Error(`Parameter "${paramName}" must be a valid slug`);
      }
    },
    verify: (paramName, params) => {
      if (params.trim().length) {
        throw new Error(`Constraint 'slug' for '${paramName}' does not accept parameters.`);
      }
    },
    toRegExp: () => '[a-z0-9-]+',
  }),
};
```

Register custom constraints in router config so generation and runtime matching agree:

```ts
import { defineRouterConfig } from '@cookbook/router-cli';
import { pathConstraints } from './app/lib/routes/path-constraints';

export default defineRouterConfig({
  routeFiles: 'app/**/*.route.{ts,tsx}',
  pathConstraints,
});
```

Then use the constraint in route paths:

```ts
export const userDetailsRoute = defineRoute({
  id: 'users.details',
  path: '/users/{slug:slug}',
  view: UserDetailsPage,
} as const);
```

Custom constraints currently produce string params in generated contracts unless they are composed with built-in numeric constraints.
