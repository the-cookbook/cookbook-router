# React dashboard example

`examples/react-dashboard` is a production-style dashboard app that uses Cookbook Router with React, generated route contracts, preloadable lazy route views, layout-level loading and error fallbacks, layout slots, custom path constraints, search params, provider middleware, configured and link-level route interception, link prefetching, and navigation blocking.

## What it demonstrates

- Shared shell layout across the overview, users, documents, reports, create, messages, broken-page, login, policy, and not-found demo routes.
- Preloadable async page views declared with `lazyRouteView()`.
- Route module generation from colocated `app/**/*.route.tsx` files.
- Route prefetching from sidebar navigation with `prefetch="interaction"`.
- Eager user-detail prefetching from the users table with `prefetch="mount"`.
- `layout.loading` fallbacks rendered inside shared layout outlets.
- `layout.error` boundaries rendered inside the shared layout when a child route throws.
- Route-specific layout slots for headers, sidebars, and modals.
- Configured route interception from `/overview` to `/create` through the `modal` slot.
- Configured route interception from shell-backed routes to `/messages/new` through the `modal` slot.
- Link-level route interception from `/documents` to `/documents/{documentId}` through the `modal` slot.
- Explicit canonical navigation opt-out with `intercept={false}`, such as login redirect navigation.
- Sheet-based document previews rendered inside the `modal` slot.
- Direct rendering of `/create` as a full page when visited directly.
- Direct rendering of `/documents/{documentId}` as a full document detail page when visited directly.
- Navigation blocking on `/messages/new` with `useBlocker()` when the message form has unsaved changes.
- Custom sidebar rendering on `/reports`.
- Document library with contextual preview behavior for intercepted document detail routes.
- Generated TypeScript route contracts from colocated `app/**/*.route.tsx` files.
- Custom `slug` path constraint for `/users/{slug:slug}` and `/documents/{documentId:slug}`.
- Search-param handling on `/overview?visitors=...`.
- Reusable pagination search descriptors merged into overview and users routes.
- `NavLink` matching that keeps the overview item active while ignoring search params.
- Auth middleware through `RouterProvider middleware`.
- Public-route metadata through `meta.access = 'public'`.
- User-detail not-found handling for missing user records.
- Document-detail not-found handling for missing document records.
- Route error handling through the broken-page demo route.
- Fake policy pages for terms of service and privacy policy routes.

## Run it

From the repository root:

```sh
pnpm install
pnpm build:packages
pnpm --filter react-dashboard dev
```

## Route generation model

The dashboard uses the modular route standard:

- `cookbook-router.config.ts` declares `routeFiles: 'app/**/*.route.{ts,tsx}'`.
- each feature owns a local `*.route.tsx` file with `defineRoute({...})`.
- child routes attach explicitly with `parent`, not by file path or route-id prefix.
- shared route helpers live under `app/lib/routes`.
- custom path constraints live in `app/lib/routes/path-constraints.ts` and are imported by the config so generated runtime routes preserve the same constraints.
- reusable search descriptors live under `app/lib/routes/filters`.
- Vite runs `cookbookRouterVitePlugin()` so route artifacts regenerate during dev/build.

Application code imports the generated route tree:

```ts
import { routes } from '../.cookbook-router/routes';
```

## Validate generated route contracts

```sh
pnpm --filter react-dashboard routes:generate
pnpm --filter react-dashboard routes:validate
```

The generated files live in `.cookbook-router/` and are committed so type inference can be tested without requiring a generation step first.

## Test it

```sh
pnpm --filter react-dashboard test
pnpm --filter react-dashboard typecheck
pnpm --filter react-dashboard build
```

The unit tests cover entry redirects, recovered malformed search params, async layout loading behavior, search-preserving active navigation, configured route interception, link-level route interception, canonical full-page rendering, sheet-based document previews, navigation blocking for dirty forms, custom slug params, missing-record handling, auth middleware redirects, broken-page error fallback rendering, and generated contract inference.

## Preloadable lazy route views

Dashboard pages are loaded with `lazyRouteView()` instead of plain `React.lazy()`.

```ts
import { defineRoute } from '@cookbook/router';
import { lazyRouteView } from '@cookbook/router-react';

const AsyncUsersPage = lazyRouteView(() =>
  import('./page').then(async ({ UsersPage }) => {
    await new Promise((resolve) => setTimeout(resolve, LAZY_PAGE_DELAY_MS));

    return {
      default: UsersPage,
    };
  })
);

export const usersRoute = defineRoute({
  id: 'users',
  parent: 'root',
  path: 'users',
  view: AsyncUsersPage,
} as const);
```

`lazyRouteView()` behaves like a lazy React component, but it also exposes a preload hook that Cookbook Router can call during route prefetch. This lets links warm route views before navigation without requiring each route to define a manual `preload` callback.

Some routes intentionally delay their lazy imports with `LAZY_PAGE_DELAY_MS` so loading states are visible during development and tests.

## Link prefetching

The dashboard uses link prefetching in two places.

Sidebar navigation uses interaction-based prefetching:

```tsx
<NavLink {...item.link} prefetch="interaction">
  {({ isActive }) => (
    <SidebarMenuButton isActive={isActive}>
      {item.icon}
      <span>{item.title}</span>
    </SidebarMenuButton>
  )}
</NavLink>
```

This preloads the destination on hover or focus.

The users table uses eager mount prefetching for high-value user-detail links:

```tsx
<Link
  to="users.details"
  params={{ slug: user.username.replace('.', '-') }}
  prefetch="mount"
>
  {user.name}
</Link>
```

This warms the route as soon as the link is rendered. It is useful here because the table renders a small set of likely next destinations.

Available prefetch modes are:

```ts
false
'hover'
'focus'
'interaction'
'mount'
```

`prefetch={false}` is the default. Prefetching is explicit because it can trigger dynamic imports and application-defined route preload work.

## Async loading and route errors

Several dashboard routes use delayed `lazyRouteView()` imports so route-level async rendering is easy to see during development and tests.

Shell-backed routes use layout loading fallbacks, so the sidebar, header area, and layout chrome stay mounted while the route outlet shows loading UI.

The `/broken-page` route intentionally throws from its page view:

```ts
export const brokenPageRoute = defineRoute({
  id: 'broken-page',
  parent: 'root',
  path: 'broken-page',
  view: AsyncBrokenPage,
  layout: {
    view: LayoutPage,
    error: ErrorPage,
  },
} as const);
```

This demonstrates `layout.error`: the fallback is owned by the route layout and renders inside the same layout shell instead of replacing the whole application.

Because the example uses delayed lazy imports, tests that assert page body content use a timeout longer than `LAZY_PAGE_DELAY_MS`.

## Provider middleware and public routes

The app registers authentication middleware through `RouterProvider`:

```tsx
export function App({ router }: { readonly router: Router }) {
  const middleware = React.useMemo(() => [authMiddleware], []);

  return (
    <RouterProvider
      router={router}
      errorFallback={ErrorPage}
      middleware={middleware}
      scrollBehavior="smooth"
      scrollRestoration
    />
  );
}
```

The middleware allows routes marked as public:

```ts
meta: {
  access: 'public',
}
```

Private routes redirect to login:

```ts
const authMiddleware: Middleware = ({ route, location, redirect }) => {
  if (route.route.meta?.access === 'public' || auth.isAuthenticated()) {
    return;
  }

  return redirect(`/login?redirect=${encodeURIComponent(location.href)}`);
};
```

The login form navigates back to the requested destination with interception disabled:

```ts
navigate.replace(redirectTo, { intercept: false });
```

This ensures the redirect resolves to the canonical route, even if the destination has a configured intercept from the current route context.

## Configured route interception

The app demonstrates configured route interception for common dashboard modal flows.

The root route configures `/messages/new` to render through the `modal` slot when reached from shell-backed pages:

```ts
export const entryRoute = defineRoute({
  id: 'root',
  path: '/',
  layout: {
    view: RootLayoutPage,
    loading: LoadingSkeleton,
    slots: {
      header: true,
      sidebar: true,
      modal: true,
    },
  },
  intercepts: {
    modal: {
      to: ['new-message'],
      view: AsyncSendMessageModalPage,
    },
  },
} as const);
```

The overview route configures `/create` to render through the `modal` slot when navigating from overview:

```ts
export const overviewRoute = defineRoute({
  id: 'overview',
  parent: 'root',
  path: 'overview',
  view: AsyncOverviewPage,
  layout: {
    view: LayoutPage,
    slots: {
      header: AsyncOverviewLayoutHeader,
    },
  },
  intercepts: {
    modal: {
      to: 'create',
      view: AsyncOverviewCreateModal,
    },
  },
} as const);
```

This keeps `/create` and `/messages/new` canonical while still allowing contextual modal rendering during client navigation.

Direct visits still render the canonical full-page route.

## Link-level route interception

The documents section demonstrates link-level route interception.

The document title links directly to the canonical document details page:

```tsx
<Link
  to="documents.details"
  params={{ documentId: document.id }}
  className="hover:underline"
>
  {document.title}
</Link>
```

The preview action navigates to the same canonical route, but asks the router to render the destination through the `modal` slot:

```tsx
<Link
  to="documents.details"
  params={{ documentId: document.id }}
  intercept={{
    slot: 'modal',
    view: DocumentPreview,
  }}
  preventScrollReset={true}
  className="inline-flex items-center text-sm font-medium text-foreground hover:underline"
>
  Preview document
  <ArrowUpRight className="ml-1 size-4" />
</Link>
```

Client navigation from `/documents` to `/documents/{documentId}` opens a document preview sheet and preserves the document library page behind it.

Direct visits to `/documents/{documentId}` render the full document detail page.

## Interception opt-out

Links and navigation calls can opt out of configured intercepts with:

```tsx
intercept={false}
```

or:

```ts
navigate.replace(to, { intercept: false });
```

Use this when the route should render canonically even if a configured intercept would normally apply.

The dashboard uses this in the login flow so returning to the original destination after authentication does not accidentally render through an active intercept context.

## Navigation blocking

The `/messages/new` route demonstrates navigation blocking with `useBlocker()`.

The message composer tracks form state locally and blocks navigation when any field has a value.
The blocker warns users before they leave with an unsent message draft.

```tsx
function NewMessage() {
  const navigate = useNavigate();

  const [formData, setFormData] = React.useState<MessageFormData>({
    name: '',
    email: '',
    message: '',
  });

  useBlocker({
    when: Boolean(formData.name || formData.email || formData.message),
    message: 'Your message has not been sent. Leave this page and discard your draft?',
  });

  const handleOnClose = React.useCallback(() => {
    navigate.back();
  }, [navigate]);

  // ...
}
```

This applies both when `/messages/new` is rendered as an intercepted modal and when it is visited directly as a canonical route.

## Documents preview behavior

The documents section demonstrates a common dashboard pattern:

- `/documents` renders a document library.
- document title links navigate canonically to `/documents/{documentId}`.
- preview action links navigate to `/documents/{documentId}` with link-level interception enabled.
- the intercepted navigation renders the document preview as a sheet inside the `modal` slot.
- visiting `/documents/{documentId}` directly renders the full document detail page.
- closing the preview sheet returns to `/documents`.

This shows how the same route can support both contextual preview UI and canonical direct rendering.

## Search params

The overview route defines its own search params and merges pagination search params:

```ts
export const overviewSearch = defineSearch({
  visitors: { type: 'string', optional: true },
} as const);

export const overviewRoute = defineRoute({
  id: 'overview',
  parent: 'root',
  path: 'overview',
  search: mergeSearch(overviewSearch, paginationSearch),
} as const);
```

The users index route follows the same pattern for table filters:

```ts
const usersSearch = defineSearch({
  status: { type: 'string', default: 'all' },
  role: { type: 'string', optional: true },
  q: { type: 'string', optional: true },
} as const);
```

The app configures URL recovery for malformed search/hash values:

```ts
url: {
  arrayFormat: 'repeat',
  invalidSearch: 'recover',
  invalidHash: 'recover',
  unknownSearch: 'strip',
}
```

## Route model

```txt
/                           -> redirects to /overview
/overview                   -> dashboard overview
/create                     -> create page, intercepted as modal from overview
/users                      -> users layout
/users                      -> users index
/users/{slug:slug}          -> user details
/documents                  -> documents layout
/documents                  -> document library
/documents/{documentId:slug} -> document details
/reports                    -> reports dashboard with custom sidebar slot
/messages/new               -> message composer with dirty-form navigation blocking
/broken-page                -> intentionally throwing route rendered through layout.error
/login                      -> login page
/policies                   -> public policies layout
/policies/terms-of-service  -> fake terms of service page
/policies/privacy-policy    -> fake privacy policy page
/*                          -> not found page
```

## Generated route artifacts

This example uses colocated `app/**/*.route.tsx` files and imports the generated route tree from `.cookbook-router/routes`.

The `.cookbook-router` files are committed here only so the example is inspectable in the repository. In an application, regenerate them with `cbr generate` or the Vite plugin.
