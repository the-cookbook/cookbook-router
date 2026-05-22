# Releasing

Cookbook Router uses Changesets for versioning and npm publishing. Releases should be cut only from a clean checkout with the lockfile installed and all release gates passing.

## Table of contents

- [Release model](#release-model)
- [Package versions](#package-versions)
- [When to add a changeset](#when-to-add-a-changeset)
- [Creating a changeset](#creating-a-changeset)
- [Validating a release locally](#validating-a-release-locally)
- [Version packages](#version-packages)
- [Publishing](#publishing)
- [Dry runs](#dry-runs)
- [Release gates](#release-gates)
- [Common release failures](#common-release-failures)
- [Maintainer checklist](#maintainer-checklist)

## Release model

The repository publishes three public packages:

| Package                  | Purpose                                       |
| ------------------------ | --------------------------------------------- |
| `@cookbook/router`       | Framework-agnostic runtime.                   |
| `@cookbook/router-react` | React integration layer.                      |
| `@cookbook/router-cli`   | Contract generation and route validation CLI. |

Each package is published from its package directory. Package export maps expose only the root entrypoint and `./package.json`; deep package internals are intentionally not public API.

## Package versions

Changesets owns package version changes. Do not manually edit package versions for a normal release. Add changeset files under `.changeset/`; the versioning step converts those files into package version bumps and changelog entries.

## When to add a changeset

Add a changeset when a change affects a published package or how consumers use it. Examples:

- new public API
- changed runtime behavior
- fixed bug visible to package consumers
- generated contract output changes
- documentation that should appear in release notes
- dependency changes that affect published packages

A changeset is usually not needed for private-only test refactors, CI-only cleanup, or internal comments.

## Creating a changeset

Run:

```sh
pnpm changeset
```

Choose the affected packages and bump type:

| Bump    | Use for                                                          |
| ------- | ---------------------------------------------------------------- |
| `patch` | Bug fixes, docs corrections, non-breaking internal improvements. |
| `minor` | New backwards-compatible APIs or examples.                       |
| `major` | Breaking API, generated contract, or runtime behavior changes.   |

Write the summary for users. Prefer practical release notes:

```txt
Add route-level redirects for internal route targets and external absolute URLs.
```

Avoid implementation-only summaries:

```txt
Edit create-router.ts.
```

## Validating a release locally

Run the full release validation:

```sh
pnpm install --frozen-lockfile
pnpm test:ci
```

For release-specific checks without every CI phase, run:

```sh
pnpm validate:release
```

`pnpm test:ci` is stricter and includes example tests plus the full release validation set.

## Version packages

When preparing a release branch or version PR, run:

```sh
pnpm version-packages
```

This executes `changeset version`, updates package versions, updates changelogs, and consumes pending changeset files.

Review generated changes carefully before publishing.

## Publishing

Publishing uses:

```sh
pnpm release
```

The root release script runs:

```sh
pnpm validate:release
changeset publish
```

Published package metadata requires public access and npm provenance. The package manifests enforce:

```json
{
  "publishConfig": {
    "access": "public",
    "provenance": true
  }
}
```

## Dry runs

Run a publish dry run before a real publish:

```sh
pnpm build:packages
pnpm publish:dry-run
```

The dry run calls `npm publish --dry-run` for each public package directory. It verifies that package contents, export maps, declarations, and publish metadata are ready.

## Release gates

The main validation scripts are:

| Command                    | Purpose                                                                                                |
| -------------------------- | ------------------------------------------------------------------------------------------------------ |
| `pnpm validate:rc`         | Checks required release-candidate files, package exports, metadata, docs imports, and blocker markers. |
| `pnpm validate:publish`    | Checks package publishing metadata.                                                                    |
| `pnpm validate:exports`    | Checks package export maps.                                                                            |
| `pnpm validate:docs-api`   | Checks documented imports against package root exports.                                                |
| `pnpm publish:dry-run`     | Runs npm publish dry runs for public packages.                                                         |
| `pnpm test:consumer-trial` | Packs local packages and validates an app outside the workspace package source.                        |
| `pnpm test:ci`             | Runs the full CI validation sequence.                                                                  |

## Common release failures

### Missing changeset

Run:

```sh
pnpm changeset
```

Select every affected public package. A runtime change in `@cookbook/router` that changes React behavior may also require a `@cookbook/router-react` changeset if the React API or docs changed.

### Stale generated contracts

Regenerate app contracts with the CLI:

```sh
cookbook-router generate --routes src/routes.tsx --out-dir .cookbook-router
```

Commit generated contract changes for examples that keep generated files in source control.

### Stale package output in examples

Rebuild packages before running examples after runtime changes:

```sh
pnpm build:packages
```

### Documentation references a non-exported API

Run:

```sh
pnpm validate:docs-api
```

Import examples in docs must use package root exports. Do not document deep imports as public API.

### Publish dry run fails

Run:

```sh
pnpm build:packages
pnpm validate:publish
pnpm validate:exports
pnpm publish:dry-run
```

Check each package `files`, `exports`, `main`, `module`, `types`, `sideEffects`, and `publishConfig` fields.

## Maintainer checklist

Before merging a release PR:

1. Confirm every user-visible package change has a changeset.
2. Run `pnpm install --frozen-lockfile`.
3. Run `pnpm test:ci`.
4. Review generated changelog entries after `pnpm version-packages`.
5. Confirm package export maps still expose only supported public entrypoints.
6. Confirm examples build from package outputs, not source-only assumptions.
7. Confirm docs describe actual package-root APIs.
8. Publish through `pnpm release` only after validation passes.
