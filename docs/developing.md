# Developing

This guide describes the day-to-day development workflow for this monorepo. Broader contribution policy is covered in [Contributing](../CONTRIBUTING.md), and release publishing is covered separately in [Releasing](releasing.md).

## Table of contents

- [Prerequisites](#prerequisites)
- [Repository layout](#repository-layout)
- [Common workflow](#common-workflow)
- [Git hooks](#git-hooks)
- [Working with generated contracts](#working-with-generated-contracts)
- [Watch mode expectations](#watch-mode-expectations)
- [Route-file extraction limits](#route-file-extraction-limits)
- [Tests and coverage](#tests-and-coverage)
- [Public API changes](#public-api-changes)
- [Documentation changes](#documentation-changes)
- [Naming conventions](#naming-conventions)
- [Changesets during development](#changesets-during-development)
- [PR checklist](#pr-checklist)
- [Clean release validation](#clean-release-validation)

## Prerequisites

Use the Node and pnpm versions declared by the repository root:

```sh
corepack enable
pnpm install --frozen-lockfile
```

The root workspace uses Node `>=22.22.2` for tooling. The published runtime packages may support a lower Node engine, but local development follows the root engine.

## Repository layout

The repository is a pnpm workspace:

```txt
packages/
  router/
  router-react/
  router-cli/
examples/
  react-basic/
  react-ssr/
  react-slots/
  react-intercepts/
  react-blog/
  react-dashboard/
e2e/
docs/
```

Use `packages/` for published packages, `examples/` for runnable example apps, `e2e/` for repository-level integration tests, and `docs/` for contributor and user-facing documentation.

## Common workflow

Start from a clean dependency install, then build and validate the workspace:

```sh
pnpm install --frozen-lockfile
pnpm build:packages
pnpm typecheck:all
pnpm test:coverage
pnpm test:e2e
```

For a faster inner loop, run package-specific commands:

```sh
pnpm --filter @cookbook/router test
pnpm --filter @cookbook/router-react test
pnpm --filter @cookbook/router-cli test
```

Run the full CI script before opening or updating a release-bound PR:

```sh
pnpm test:ci
```

## Git hooks

Husky is installed through the root `prepare` script during `pnpm install`. The committed hook files call visible package scripts, so run those scripts directly when debugging hook failures:

```sh
pnpm hooks:pre-commit
pnpm hooks:pre-push
```

The pre-commit hook runs staged-file linting and formatting, docs API validation, and the release blocker scan. The pre-push hook runs the full `pnpm test:ci` validation.

See [Git hooks](git-hooks.md) for installation details, skipping, and troubleshooting.

## Working with generated contracts

The CLI package is part of the monorepo. Inside examples, the package binary is not globally installed unless that example depends on `@cookbook/router-cli` directly. When working from source, build the packages and execute the built CLI with Node.

From an example directory:

```sh
pnpm build:packages
node ../../packages/router-cli/dist/index.js generate --routes src/routes.tsx --out-dir .cookbook-router
```

From the repository root:

```sh
pnpm build:packages
node packages/router-cli/dist/index.js generate --routes examples/react-blog/src/routes.tsx --out-dir examples/react-blog/.cookbook-router
```

Use watch mode while editing route declarations. The recommended development form is `generate --watch`:

```sh
node ../../packages/router-cli/dist/index.js generate --routes src/routes.tsx --out-dir .cookbook-router --watch
```

`consumer-trial` installs the CLI as an app dependency, so use its package scripts there:

```sh
pnpm --dir consumer-trial generate
pnpm --dir consumer-trial validate:routes
```

## Watch mode expectations

Watch mode:

- generates once immediately;
- watches every file passed with `--routes`;
- debounces rapid file-system events;
- regenerates contracts, register declarations, and manifests after route changes;
- reports validation errors without closing the watcher.

Watch mode requires route files. It cannot watch route arrays passed directly through the programmatic API.

## Route-file extraction limits

The CLI currently expects **statically extractable route declarations**. Keep codegen-relevant fields **inline** and **literal** when possible:

```tsx
export const routes = defineRoutes([
  {
    id: 'articles.show',
    path: '/articles/{slug}',
    search: {
      ref: { type: 'one', optional: true },
      filters: { type: 'many', optional: true },
    },
    component: ArticlePage,
  },
] as const);
```

Avoid relying on imported constants or computed expressions for fields the generator must read, such as `id`, `path`, `index`, `search`, `hash`, `meta`, `children`, `layout.slots`, and `redirect`.

## Tests and coverage

Every implementation file must have a colocated test file unless it only exports TypeScript interfaces. Public type behavior must still be covered by type tests.

Use this colocated style:

```txt
src/router/create-router.ts
src/router/create-router.test.ts
```

Use real router behavior where possible. Do not mock matching, validation, href generation, middleware, lifecycle, slot resolution, or intercept resolution in package tests.

Repository-level E2E tests are allowed under `e2e/` because they verify integration across packages and examples. Do not add central package-level behavior tests just to satisfy source coverage.

Vitest coverage thresholds are set to:

```txt
statements: 80,
branches: 75,
functions: 80,
lines: 80,
```

Do not exclude implementation files from coverage silently. Any ignored branch must include a local explanation describing why it is unreachable or defensive.

## Public API changes

Before changing public APIs, update every affected area:

- package exports;
- tests and type tests;
- examples;
- generated contract output;
- documentation;
- diagnostics;
- changesets.

Prefer backwards-compatible overloads over breaking changes. Remove noisy generics or inconsistent naming only when a compatibility path exists or the change is explicitly planned for a major release.

## Documentation changes

Documentation examples must match actual APIs. When editing docs, check examples against current exports from:

- `@cookbook/router`
- `@cookbook/router-react`
- `@cookbook/router-cli`

Run the docs API validator when changing imports or public API examples in docs:

```sh
pnpm validate:docs-api
```

## Naming conventions

Use consistent names across packages, examples, generated contracts, and docs:

- Use kebab-case file names.
- Use `contracts.ts` for shared TypeScript interfaces and generated contracts.
- Prefer descriptive interface names like `RouteDefinition`, `RouterContracts`, and `RouteParams`.
- Do not use `types.ts`, `TRoute`, `TParams`, or `IRouter` naming.

## Changesets during development

Do not run `pnpm changeset` after every commit. Add a changeset once the user-facing change is coherent enough to summarize, usually before opening the PR or before marking it ready for review.

Create a changeset with:

```sh
pnpm changeset
```

Select every public package affected by the change and choose the semver bump:

| Bump    | Use for                                                        |
| ------- | -------------------------------------------------------------- |
| `patch` | Bug fixes, docs fixes, and non-breaking internal improvements. |
| `minor` | New backwards-compatible APIs or examples.                     |
| `major` | Breaking API, generated contract, or runtime behavior changes. |

Use user-facing summaries. Prefer `Add route-level redirects for internal and external targets` over `Edit create-router.ts`.

Commit the generated `.changeset/*.md` file with the implementation branch.

Use one changeset per coherent user-facing change. Do not run `pnpm version-packages` during normal development; that belongs to release/version PR work.

Changesets are only required for changes that affect published packages. Internal-only docs, tests, or repository maintenance may not need one unless they affect release notes.

## PR checklist

Before asking for review, verify:

```sh
pnpm format:check
pnpm typecheck:all
pnpm lint
pnpm test:coverage
pnpm test:e2e
pnpm build:packages
pnpm build:examples
```

For release-bound work, run:

```sh
pnpm test:ci
```

## Clean release validation

Before a public release, validate from a clean workspace:

```sh
git clean -fdX
pnpm install --frozen-lockfile
pnpm test:ci
```

This prevents stale ignored artifacts such as `dist`, `coverage`, or local generated files from hiding release problems.
