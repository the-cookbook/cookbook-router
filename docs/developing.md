# Developing

This guide describes the day-to-day development workflow for Cookbook Router contributors. It complements [Contributing](../CONTRIBUTING.md), [Testing](testing.md), [Git hooks](git-hooks.md), and [Releasing](releasing.md).

Use this document for normal feature and bug-fix work. Use [Releasing](releasing.md) only when preparing package versions and publishing.

## Table of contents

- [Development model](#development-model)
- [Set up the workspace](#set-up-the-workspace)
- [Daily workflow](#daily-workflow)
- [Choosing the right validation command](#choosing-the-right-validation-command)
- [Generated contracts](#generated-contracts)
- [Testing expectations](#testing-expectations)
- [Documentation expectations](#documentation-expectations)
- [Changesets during development](#changesets-during-development)
- [Pull request checklist](#pull-request-checklist)
- [What not to do during development](#what-not-to-do-during-development)
- [Troubleshooting](#troubleshooting)

## Development model

Cookbook Router is a pnpm monorepo with three public packages:

| Package                  | Role                                      |
| ------------------------ | ----------------------------------------- |
| `@cookbook/router`       | Framework-agnostic runtime.               |
| `@cookbook/router-react` | React integration and hooks.              |
| `@cookbook/router-cli`   | Route validation, codegen, and manifests. |

Repository-level examples and E2E tests verify that the packages work together like a real consumer project.

The expected flow is:

1. Create a branch.
2. Make the smallest coherent change.
3. Add or update colocated tests.
4. Update examples, generated contracts, and docs when behavior changes.
5. Add a changeset when a public package or consumer-facing behavior changes.
6. Run targeted checks locally while iterating.
7. Run broader validation before opening or updating a PR.

## Set up the workspace

From the repository root:

```sh
pnpm install
pnpm build:packages
pnpm test
```

The root `prepare` script installs Husky hooks during `pnpm install`. If hooks are missing after copying or recloning the repo, run:

```sh
pnpm prepare
```

Verify the workspace packages are visible:

```sh
pnpm verify:workspace
```

## Daily workflow

Use targeted commands while changing code. Do not start with the full CI command unless the change is already close to done.

### Runtime or core router work

```sh
pnpm --filter @cookbook/router test
pnpm --filter @cookbook/router typecheck
```

### React integration work

```sh
pnpm --filter @cookbook/router-react test
pnpm --filter @cookbook/router-react typecheck
```

### CLI work

```sh
pnpm --filter @cookbook/router-cli test
pnpm --filter @cookbook/router-cli typecheck
```

### Example work

```sh
pnpm build:packages
pnpm --filter react-blog test
pnpm --filter react-blog typecheck
pnpm --filter react-blog build
```

Replace `react-blog` with the example package you are editing.

### Repository-level integration work

```sh
pnpm test:e2e
```

Run E2E tests when a change crosses package boundaries, affects generated contracts, changes browser navigation behavior, changes SSR behavior, or updates package exports.

## Choosing the right validation command

| Command                  | Use when                                             |
| ------------------------ | ---------------------------------------------------- |
| `pnpm format:check`      | Checking Markdown, JSON, and source formatting.      |
| `pnpm lint`              | Checking source style and lint rules.                |
| `pnpm typecheck`         | Checking all package TypeScript projects.            |
| `pnpm typecheck:all`     | Checking packages and examples.                      |
| `pnpm test`              | Running package tests only.                          |
| `pnpm test:coverage`     | Checking package tests with coverage thresholds.     |
| `pnpm test:examples`     | Running example tests.                               |
| `pnpm test:e2e`          | Running repository-level integration tests.          |
| `pnpm build:packages`    | Rebuilding package outputs consumed by examples.     |
| `pnpm build:examples`    | Validating example production builds.                |
| `pnpm validate:docs-api` | Checking documented imports against public exports.  |
| `pnpm validate:release`  | Checking release-readiness gates without publishing. |
| `pnpm test:ci`           | Running the full local CI sequence.                  |

Before requesting review, run at least the targeted package checks plus any relevant example or E2E checks. Before merging release-sensitive work, run:

```sh
pnpm test:ci
```

## Generated contracts

The examples intentionally keep generated contract files in source control where they are part of the test surface.

Regenerate contracts whenever you change:

- route IDs
- route paths
- path params
- search schemas
- hash values
- route metadata contracts
- outlet context contracts
- CLI contract generation behavior

The CLI package is part of this monorepo. Do not assume `cookbook-router` is installed globally while developing the repository.

Build the package outputs first:

```sh
pnpm build:packages
```

Then run the built CLI with Node.

From an example directory:

```sh
node ../../packages/router-cli/dist/index.js generate --routes src/routes.tsx --out-dir .cookbook-router
```

From the repository root, pass paths relative to the root:

```sh
node packages/router-cli/dist/index.js generate --routes examples/react-blog/src/routes.tsx --out-dir examples/react-blog/.cookbook-router
```

There are no root-level or example-level package scripts for regenerating contracts. After editing route files in an example, rerun `generate` manually with the built CLI.

The built CLI source exposes `generate`, `manifest`, `validate`, and `watch`, but the documented development workflow should use `generate` and `validate` unless a package script explicitly wraps another command. Do not assume a global `cookbook-router` binary exists in examples.

The `cookbook-router` binary is available only in a workspace or app that actually depends on `@cookbook/router-cli`. For example, `consumer-trial` declares `@cookbook/router-cli`, so its package scripts can use the binary directly:

```sh
pnpm --dir consumer-trial generate
pnpm --dir consumer-trial validate:routes
```

For package-level CLI tests, prefer the package scripts instead of manually invoking the binary:

```sh
pnpm --filter @cookbook/router-cli test
pnpm --filter @cookbook/router-cli typecheck
```

After regenerating contracts, commit the route source and generated files together when the generated files are already tracked by that example or trial app.

## Testing expectations

Every behavior change needs a test that would fail without the change.

Use colocated tests for package source files:

```txt
src/router/create-router.ts
src/router/create-router.test.ts
```

Use repository-level E2E tests only for package integration behavior. Do not move package behavior coverage into `e2e/` just to avoid colocated tests.

Add type tests when a change affects inference, generated contracts, route IDs, params, search, hash, metadata, or public hook signatures.

For regressions, keep the test focused on the bug:

1. Reproduce the broken behavior.
2. Assert the public behavior that should hold.
3. Avoid mocking matching, validation, href generation, middleware, lifecycle, slots, or intercept internals.

## Documentation expectations

Update docs in the same branch as the behavior change. Documentation is not a follow-up task.

Update docs when changing:

- public APIs
- route configuration shape
- generated contract output
- CLI commands or output
- error messages users may see
- SSR setup
- release or development workflow
- examples copied by users

Run this when docs include package imports:

```sh
pnpm validate:docs-api
```

Keep examples in docs aligned with package-root exports. Do not document deep imports as public API.

## Changesets during development

Changesets are part of the development workflow, not only the final release workflow.

A changeset records release intent for public packages. It answers three questions:

1. Which published packages are affected?
2. What semver bump is needed?
3. What should users read in the changelog?

### When to add a changeset

Add a changeset when the change affects a published package or consumer-visible behavior:

| Change type                                       | Changeset? | Typical bump      |
| ------------------------------------------------- | ---------- | ----------------- |
| Bug fix visible to consumers                      | Yes        | `patch`           |
| New backwards-compatible public API               | Yes        | `minor`           |
| Breaking public API or generated contract change  | Yes        | `major`           |
| Runtime behavior change                           | Yes        | `patch` or higher |
| CLI output or validation behavior change          | Yes        | `patch` or higher |
| Documentation that should appear in release notes | Usually    | `patch`           |
| Internal-only test refactor                       | No         | None              |
| Private CI cleanup                                | No         | None              |
| Comment-only implementation cleanup               | No         | None              |

When in doubt, add the changeset. A maintainer can remove or adjust it during review.

### When to run `pnpm changeset`

Run it after the change is coherent enough to summarize. In practice, that usually means after tests and docs are updated, before opening the PR.

You do not need to run `pnpm changeset` after every commit. One changeset per coherent user-facing change is usually enough, even if the branch contains several commits.

For large PRs with unrelated user-facing changes, create multiple changesets. Each changeset should describe one release-note-worthy change.

### Changesets and commits

A changeset is committed like any other source file:

```txt
.changeset/descriptive-name.md
```

Commit it in the same branch as the implementation. It can be in the same commit as the code or in a follow-up commit before the PR is ready. The important rule is that the PR must include the changeset before it is merged.

### Changesets and PRs

PRs should include changesets for public package changes. Reviewers should be able to read the changeset and understand the user-visible impact without reading the implementation.

Good summary:

```txt
Allow route search schemas to describe repeated query parameters and generate array-capable search contracts.
```

Weak summary:

```txt
Update generate-contracts.ts.
```

### Selecting packages

Select every published package whose users are affected.

Examples:

| Change                                                                        | Packages                                                                           |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Core href generation bug fix                                                  | `@cookbook/router`                                                                 |
| React hook type fix only                                                      | `@cookbook/router-react`                                                           |
| CLI generated contract output change                                          | `@cookbook/router-cli`                                                             |
| Generated contracts change that affects runtime docs and React hook inference | `@cookbook/router`, `@cookbook/router-react`, `@cookbook/router-cli` as applicable |

Do not select the private root workspace package.

### Selecting bump types

Use the smallest bump that honestly communicates user impact.

| Bump    | Use for                                                                                             |
| ------- | --------------------------------------------------------------------------------------------------- |
| `patch` | Bug fixes, docs corrections, diagnostics improvements, and non-breaking internal improvements.      |
| `minor` | New backwards-compatible APIs, new supported configuration, or new examples that expand capability. |
| `major` | Breaking APIs, removed behavior, or generated contract changes that require consumer code changes.  |

Generated contract changes deserve special care. If existing consumer code must change because generated types changed, treat it as breaking unless the current version is still pre-1.0 and the repository release policy explicitly says otherwise.

### What not to do with Changesets

Do not run this during normal feature development:

```sh
pnpm version-packages
```

`pnpm version-packages` consumes pending changesets and edits package versions and changelogs. That belongs in the version PR or explicit release-preparation work, not in ordinary feature branches.

Do not manually edit package versions for normal changes. Changesets owns version updates.

Do not add a changeset for changes that cannot affect published users unless a maintainer asks for one.

## Pull request checklist

Before marking a PR ready for review:

- Tests cover the behavior change.
- Type tests are updated when inference changes.
- Examples are updated when user-facing APIs change.
- Generated contracts are regenerated where tracked.
- Documentation is updated in the same branch.
- A changeset is added when published packages or consumer behavior changed.
- Targeted package checks pass.
- Relevant example or E2E checks pass.
- No release blocker markers are present.

Useful final checks:

```sh
pnpm hooks:pre-commit
pnpm typecheck:all
pnpm test:coverage
pnpm test:examples
pnpm test:e2e
```

For broad changes, run:

```sh
pnpm test:ci
```

## What not to do during development

- Do not run `pnpm version-packages` for a normal feature branch.
- Do not manually edit package versions or changelogs for ordinary changes.
- Do not skip generated contract updates when route contracts changed.
- Do not put package behavior tests only in `e2e/`.
- Do not document deep imports as public API.
- Do not leave docs, examples, and generated outputs stale.
- Do not bypass hooks and rely on CI to catch expected local failures.

## Troubleshooting

### The pre-commit hook fails on docs imports

Run:

```sh
pnpm validate:docs-api
```

Then update the docs to use package-root exports only.

### The pre-push hook takes too long

Use targeted package and example commands while iterating. Keep `pnpm test:ci` for final validation or release-sensitive changes.

### A PR is missing a changeset

Run:

```sh
pnpm changeset
```

Select the affected public packages, write a user-facing summary, and commit the generated `.changeset/*.md` file.

### Generated contract tests fail

Regenerate the relevant contracts and commit the generated output with the route or CLI changes that caused it.

For examples that do not depend on `@cookbook/router-cli`, build the packages and invoke the built CLI directly:

```sh
pnpm build:packages
cd examples/react-blog
node ../../packages/router-cli/dist/index.js generate --routes src/routes.tsx --out-dir .cookbook-router
```

For `consumer-trial`, use its package scripts:

```sh
pnpm --dir consumer-trial generate
```

### Example tests fail after package changes

Rebuild packages first:

```sh
pnpm build:packages
```

Examples consume package outputs and generated contracts, so stale package builds can cause misleading failures.
