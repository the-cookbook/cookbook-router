# Release Candidate Checklist

This repository is prepared for a release candidate when the following commands pass in a clean checkout after dependency installation:

```sh
pnpm install --frozen-lockfile
pnpm test:ci
```

## Table of contents

- [Release gates](#release-gates)
- [Publish dry run](#publish-dry-run)
- [Changesets](#changesets)
- [Versioning](#versioning)
- [Expected release flow](#expected-release-flow)

## Release gates

The release candidate gate is enforced by `pnpm validate:rc` and CI. It checks:

- required documentation and governance files
- public package export maps
- npm publishing metadata
- tree-shaking metadata
- docs imports against actual package exports
- disabled or focused tests
- unfinished work markers

`pnpm test:ci` validates formatting, release metadata, type checking, linting, package tests with coverage, example tests, repository E2E tests, package builds, example builds, npm publish dry runs, and the external consumer trial app.

## Publish dry run

Run:

```sh
pnpm build:packages
pnpm publish:dry-run
```

The dry run executes `npm publish --dry-run` for each public package after package builds create `dist` output.

## Changesets

Every public package change should have a pending changeset before release validation is considered complete. Create one with:

```sh
pnpm changeset
```

Changeset summaries should describe the user-visible behavior, API, documentation, or compatibility change.

## Versioning

Package versions stay at `0.0.0` until Changesets creates the release version. Pending release notes live in `.changeset/` and are converted into package changelogs during the versioning workflow. Apply pending changesets with:

```sh
pnpm version-packages
```

Review generated package versions and changelog entries before publishing.

## Expected release flow

1. Merge only when CI passes.
2. Let the Changesets release workflow create the version PR.
3. Review generated changelog entries and package versions.
4. Confirm `pnpm test:ci` passes after versioning.
5. Merge the version PR.
6. Let the release workflow publish packages with npm provenance.
