# Testing

Tests should verify actual router behavior: matching, href generation, middleware, lifecycle, React rendering, SSR, CLI generation, generated contracts, and package exports.

## Table of contents

- [Package tests](#package-tests)
- [Example tests](#example-tests)
- [E2E tests](#e2e-tests)
- [Testing routers](#testing-routers)
- [Testing React integration](#testing-react-integration)
- [Testing generated contracts](#testing-generated-contracts)
- [Testing SSR](#testing-ssr)
- [Testing CLI generation](#testing-cli-generation)
- [Coverage expectations](#coverage-expectations)
- [Mocking guidance](#mocking-guidance)

## Package tests

Implementation tests live beside the file they cover.

```txt
src/matching/match-routes.ts
src/matching/match-routes.test.ts
```

Package tests run with:

```sh
pnpm test
```

## Example tests

Examples test real app flows and type inference.

```sh
pnpm test:examples
```

Each example also supports:

```sh
pnpm --filter react-blog test
pnpm --filter react-blog typecheck
pnpm --filter react-blog build
```

## E2E tests

Repository E2E tests live under `e2e/` and cover cross-package behavior:

- package exports
- workspace builds
- CLI integration in temporary workspaces
- release readiness
- example applications
- browser-like navigation
- consumer trial behavior

Run them with:

```sh
pnpm test:e2e
```

## Testing routers

Use real routes and memory routers.

```ts
const router = createMemoryRouter({
  routes,
  initialEntries: ['/'],
});

await router.resolveCurrent();
await router.navigate.to({ route: 'users.show', params: { id: 42 } });

expect(router.state.location.href).toBe('/users/42');
```

## Testing React integration

Render a real provider.

```tsx
const router = createMemoryRouter({ routes, initialEntries: ['/users/42'] });
await router.resolveCurrent();

const view = render(<RouterProvider router={router} fallback={<h1>Not found</h1>} />);
expect(view.getByText('User 42')).toBeTruthy();
```

When a test triggers navigation through router methods directly, wrap updates with React Testing Library helpers when needed.

## Testing generated contracts

Use `expectTypeOf` from Vitest.

```ts
import { expectTypeOf, test } from 'vitest';
import type { RouteParams, RouteSearch, RouteHash } from '@cookbook/router';

test('contracts infer article route inputs', () => {
  expectTypeOf<RouteParams<'blog.articles.show'>>().toEqualTypeOf<{ slug: string }>();
  expectTypeOf<RouteSearch<'blog.articles'>>().toEqualTypeOf<{ query?: string }>();
  expectTypeOf<RouteHash<'blog.articles.show'>>().toEqualTypeOf<'comments' | 'share'>();
});
```

## Testing SSR

Test server-rendered HTML and hydration data.

```ts
const html = await renderRequest('/ssr/users/11?tab=settings');

expect(html).toContain('User 11');
expect(html).toContain('window.__COOKBOOK_ROUTER__');
```

Test client hydration separately with `createRouter({ hydrationData })` and `RouterProvider`.

## Testing CLI generation

Use temporary directories or in-memory file systems for CLI tests. Cover:

- `generate`
- `validate`
- `manifest`
- `watch`
- invalid route files
- duplicate IDs
- malformed redirects
- output path safety

## Coverage expectations

Vitest coverage thresholds are set to:

```txt
statements: 80,
branches: 75,
functions: 80,
lines: 80,
```

Coverage exclusions should explain why a branch is impossible or defensive.

## Mocking guidance

Prefer real router behavior. Avoid mocking:

- route matching
- href generation
- route validation
- middleware pipelines
- lifecycle pipelines
- slot or intercept resolution

Appropriate mocks include:

- browser APIs missing in the test environment
- timers
- file system write failures for CLI tests
- external redirect handoff through custom history hooks
