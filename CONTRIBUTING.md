# Contributing

## Table of contents

- [Development setup](#development-setup)
- [Git hooks](#git-hooks)
- [Project structure](#project-structure)
- [Test policy](#test-policy)
- [Coverage](#coverage)
- [API changes](#api-changes)
- [Naming](#naming)
- [Router behavior changes](#router-behavior-changes)
- [Documentation changes](#documentation-changes)
- [Release notes](#release-notes)
- [Changesets](#changesets)
- [Release process](#release-process)
- [Local release validation](#local-release-validation)
- [Package publishing requirements](#package-publishing-requirements)

## Development setup

```sh
pnpm install
pnpm build
pnpm test
pnpm test:e2e
```

The repository uses a pnpm workspace. Packages live under `packages/`, examples live under `examples/`, and repository-level integration tests live under `e2e/`.

For the day-to-day contributor workflow, including targeted validation commands and changeset timing during PR work, see [Developing](docs/developing.md).

## Git hooks

Husky is installed through the root `prepare` script during `pnpm install`. The pre-commit hook uses `lint-staged` to keep staged-file linting and formatting fast. The committed hook files call visible package scripts:

| Hook         | Script                  | Checks                                                                         |
| ------------ | ----------------------- | ------------------------------------------------------------------------------ |
| `pre-commit` | `pnpm hooks:pre-commit` | Staged-file lint/format checks, docs API validation, and release blocker scan. |
| `pre-push`   | `pnpm hooks:pre-push`   | Full `pnpm test:ci` validation.                                                |

Run a hook manually when debugging:

```sh
pnpm hooks:pre-commit
pnpm hooks:pre-push
```

See [Git hooks](docs/git-hooks.md) for installation details, skipping, and troubleshooting.

## Project structure

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
e2e/
docs/
```

## Test policy

Every implementation file must have a colocated test file unless it only exports TypeScript interfaces. Public type behavior must still be covered by type tests.

Required style:

```txt
src/navigation/run-middleware.ts
src/navigation/run-middleware.test.ts
```

Do not add central package-level behavior tests for source coverage. Repository-level E2E tests are allowed under `e2e/` because they verify integration across packages and examples.

## Coverage

Vitest coverage thresholds are set to:

```txt
statements: 80,
branches: 75,
functions: 80,
lines: 80,
```

Do not exclude implementation files from coverage silently. Any ignored branch must include a local explanation describing why it is unreachable or defensive.

## API changes

Before changing public APIs, update all of the following:

- package exports
- tests and type tests
- examples
- generated contract output if affected
- documentation
- diagnostics
- changesets

Prefer backwards-compatible overloads over breaking changes. Remove noisy generics and inconsistent naming only when a compatibility path exists or the change is explicitly planned for a major release.

## Naming

- Use kebab-case file names.
- Use `contracts.ts` for shared TypeScript interfaces and generated contracts.
- Prefer descriptive interface names like `RouteDefinition`, `RouterContracts`, and `RouteParams`.
- Do not use `types.ts`, `TRoute`, `TParams`, or `IRouter` naming.

## Router behavior changes

Do not mock core router behavior in package tests. Matching, validation, href generation, middleware, lifecycle, slot resolution, and intercept resolution must be tested directly.

## Documentation changes

Documentation examples must match actual APIs. When editing docs, check examples against current exports from:

- `@cookbook/router`
- `@cookbook/router-react`
- `@cookbook/router-cli`

Run the docs API validator when changing imports in docs:

```sh
pnpm validate:docs-api
```

## Release notes

Use Changesets for user-visible changes. A changeset should explain the practical effect of the change, not only the files edited.

## Changesets

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

Use user-facing summaries. For example, prefer `Add route-level redirects for internal and external targets` over `Edit create-router.ts`.

## Release process

Releases are managed with Changesets.

1. Add a changeset for any public package change with `pnpm changeset`.
2. Open a pull request and pass CI.
3. After merge to `main`, the release workflow opens a version PR when unreleased changesets exist.
4. Review generated package versions and changelog entries.
5. Merging the version PR publishes packages to npm with provenance enabled.

See [Releasing](docs/releasing.md) for the full maintainer workflow.

## Local release validation

Before publishing or asking for release review, run:

```sh
pnpm install --frozen-lockfile
pnpm test:ci
```

For release-specific validation without every CI phase, run:

```sh
pnpm validate:release
```

Before publishing, CI validates formatting, linting, type checking, package tests with coverage, E2E tests, package builds, example builds, package export maps, documentation API references, publish dry runs, and the external consumer trial app.

## Package publishing requirements

Every published package must provide:

- ESM output through `exports["."].import`
- CommonJS output through `exports["."].require`
- Type declarations through `exports["."].types`
- `sideEffects: false` for tree-shaking
- `publishConfig.access: public`
- npm provenance enabled
- repository, bugs, homepage, license, and engine metadata
