# SSR

Server rendering uses `createStaticRouter()` from `@cookbook/router` and `StaticRouterProvider` from `@cookbook/router-react`. Client hydration uses `createRouter()` with `hydrationData`.

## Table of contents

- [Server render](#server-render)
- [Static router inputs](#static-router-inputs)
- [Serialize hydration state](#serialize-hydration-state)
- [Client hydration](#client-hydration)
- [Vite dev SSR](#vite-dev-ssr)
- [Styles](#styles)
- [Redirects and external URLs](#redirects-and-external-urls)
- [Security notes](#security-notes)
- [Troubleshooting SSR](#troubleshooting-ssr)

## Server render

```tsx
import { renderToString } from 'react-dom/server';
import { createStaticRouter, stringifyRouterState } from '@cookbook/router';
import { StaticRouterProvider } from '@cookbook/router-react';
import { routes } from './routes';

export async function renderRequest(url: string | Request) {
  const router = createStaticRouter({
    routes,
    url,
  });

  await router.resolveCurrent();

  const appHtml = renderToString(
    <StaticRouterProvider router={router} fallback={<h1>Not found</h1>} />,
  );
  const hydrationData = stringifyRouterState(router);

  return `<!doctype html>
<html>
  <head>
    <title>Cookbook Router SSR</title>
    <link rel="stylesheet" href="/src/styles.css" />
  </head>
  <body>
    <div id="root">${appHtml}</div>
    <script>window.__COOKBOOK_ROUTER__ = ${hydrationData}</script>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`;
}
```

## Static router inputs

`createStaticRouter()` accepts a URL-like input:

```ts
createStaticRouter({ routes, url: '/articles/typed-routing?preview=true#summary' });
createStaticRouter({ routes, url: new URL('https://example.test/articles/typed-routing') });
createStaticRouter({ routes, url: request });
createStaticRouter({ routes, request });
```

If both `url` and `request` are omitted, it throws.

## Serialize hydration state

```ts
import { serializeRouterState, stringifyRouterState } from '@cookbook/router';

const stateObject = serializeRouterState(router);
const stateJson = stringifyRouterState(router);
```

`stringifyRouterState()` validates and escapes serialized state for script embedding through the router's serialized-state helper.

## Client hydration

```tsx
import { hydrateRoot } from 'react-dom/client';
import { createRouter, deserializeRouterState } from '@cookbook/router';
import type { SerializedRouterState } from '@cookbook/router';
import { RouterProvider } from '@cookbook/router-react';
import { routes } from './routes';

declare global {
  interface Window {
    __COOKBOOK_ROUTER__: SerializedRouterState | string;
  }
}

const hydrationData = deserializeRouterState(window.__COOKBOOK_ROUTER__);

const router = createRouter({
  routes,
  hydrationData,
});

hydrateRoot(document.getElementById('root')!, <RouterProvider router={router} />);
```

The client location and hydration data should match. If they do not, the router records a hydration mismatch error in state.

## Vite dev SSR

The `examples/react-ssr` app uses a Vite plugin that intercepts document requests, calls the app server renderer, and lets Vite serve module and asset requests.

Run it with:

```sh
pnpm build:packages
pnpm --filter react-ssr dev
```

Then open a route such as:

```txt
http://localhost:5173/ssr/users/11?tab=settings
```

The response should include server-rendered HTML, not only an empty root div.

## Styles

Server HTML must include styles needed for the initial render. In the SSR example, `server.tsx` emits:

```html
<link rel="stylesheet" href="/src/styles.css" />
```

Apps with production asset manifests should emit built CSS asset URLs instead.

## Redirects and external URLs

Static history cannot mutate browser location. Internal redirects can still resolve router state during `resolveCurrent()`. External redirects should be represented in the server response by your server framework, because a static router cannot call `window.location`.

For browser runtime external redirects, the browser history implementation delegates to `window.location.assign()` or `window.location.replace()`.

## Security notes

- Use `Request` or URL values from trusted server request handling.
- Do not embed unvalidated arbitrary objects as hydration data.
- Use `stringifyRouterState()` instead of `JSON.stringify(router.serialize())` when embedding state.
- Keep route paths and generated state separate from user-generated HTML content.

## Troubleshooting SSR

### Dev server returns an empty root div

Your dev server is probably serving static `index.html` instead of calling the SSR renderer. Add a Vite middleware/plugin or framework SSR entry that calls `renderRequest()`.

### Text appears split by React comments

React can emit comment boundaries around adjacent text expressions. Use string interpolation for exact SSR text when tests or snapshots expect contiguous text:

```tsx
<h1>{`User ${params.id}`}</h1>
```

### Styles appear only after hydration

Make sure server HTML includes a stylesheet link for SSR-critical CSS.

### Hydration mismatch

Check that the server and client use the same `routes`, `basename`, `pathOptions`, and initial URL.
