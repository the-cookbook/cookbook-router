# Git Hooks

Husky installs repository Git hooks after dependency installation. The hooks run the same package scripts that developers and CI use, so local failures match repository validation rather than a separate hidden toolchain.

## Table of contents

- [Install hooks](#install-hooks)
- [Hook commands](#hook-commands)
- [Pre-commit](#pre-commit)
- [Lint-staged](#lint-staged)
- [Pre-push](#pre-push)
- [Skipping hooks](#skipping-hooks)
- [Troubleshooting](#troubleshooting)

## Install hooks

Run dependency installation from the repository root:

```sh
pnpm install
```

The root `prepare` script runs Husky:

```sh
pnpm prepare
```

You normally do not need to run it manually unless the `.git/hooks` directory was deleted or the repository was copied without Git metadata.

## Hook commands

The root package exposes explicit scripts for hook behavior:

```sh
pnpm hooks:pre-commit
pnpm hooks:pre-push
```

The committed hook files call those scripts:

```txt
.husky/pre-commit
.husky/pre-push
```

Keeping the hook logic in package scripts makes the commands visible, testable, and easy to run outside Git.

## Pre-commit

`pnpm hooks:pre-commit` runs:

```sh
pnpm lint-staged
pnpm validate:docs-api
pnpm validate:no-blockers
```

The hook intentionally checks only staged file formatting and lint issues through `lint-staged`, then runs the repository-wide documentation API and release-blocker guards. Full package type checks still run on pre-push and CI. This keeps commits fast while preventing stale docs and accidental committed blockers.

## Lint-staged

`lint-staged` runs commands only against files staged for commit. The root package configures it with:

```json
{
  "*.{js,jsx,ts,tsx,mjs,cjs}": ["eslint --max-warnings=0", "prettier --check"],
  "*.{json,md,css,yml,yaml}": ["prettier --check"]
}
```

Run it manually with:

```sh
pnpm lint-staged
```

Use `pnpm format` when you want Prettier to rewrite files instead of only checking staged files.

## Pre-push

`pnpm hooks:pre-push` runs:

```sh
pnpm test:ci
```

This is intentionally strict. It covers formatting, release validation, type checks, linting, package coverage tests, example tests, E2E tests, builds, publish dry runs, and the consumer trial app.

## Skipping hooks

Use skipping only when you have a specific reason, such as creating a work-in-progress branch while offline:

```sh
HUSKY=0 git commit -m "work in progress"
HUSKY=0 git push
```

Skipped hooks do not skip CI. Run the same scripts locally before requesting review.

## Troubleshooting

### Hooks do not run

Run:

```sh
pnpm prepare
```

Then verify the hook files exist:

```sh
ls .husky
```

### `pnpm install --frozen-lockfile` fails after adding tooling

Update both `package.json` and `pnpm-lock.yaml` together. Husky and lint-staged are development dependencies and must be present in the root lockfile.

### Pre-push takes a long time

The pre-push hook runs the full CI script. For a faster inner loop, run targeted commands while developing:

```sh
pnpm typecheck
pnpm test
pnpm test:e2e
```

Run `pnpm test:ci` before pushing release-sensitive work.
