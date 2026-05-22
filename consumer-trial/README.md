# Cookbook Router Consumer Trial

The consumer trial app validates the package experience from outside package source. It installs package surfaces, avoids deep imports, generates contracts through the CLI, and builds as a normal React application.

## Table of contents

- [Purpose](#purpose)
- [What it proves](#what-it-proves)
- [Commands](#commands)
- [Generated contracts](#generated-contracts)
- [Release validation](#release-validation)
- [Troubleshooting](#troubleshooting)

## Purpose

This app catches issues that package-level tests can miss:

- broken package exports
- missing declaration files
- incorrect generated contracts
- deep-import dependency leaks
- consumer install failures
- React/SSR integration problems

## What it proves

- Fresh install flow through packed local packages.
- Public package root imports are enough.
- Generated contracts drive route IDs, params, search values, hash values, paths, and metadata.
- React setup uses `RouterProvider`, `Link`, `Outlet`, `Slot`, and hooks.
- SSR setup uses `createStaticRouter`, serialized router state, and client hydration.
- Middleware redirects unauthenticated private navigation.
- Lifecycle hooks run during navigation.
- Blog route interception opens a modal from `/blog` while direct visits render the canonical page.

## Commands

```sh
pnpm install
pnpm generate
pnpm validate:routes
pnpm typecheck
pnpm test
pnpm build
pnpm validate:trial
```

## Generated contracts

The app generates contracts from `src/route-config.json`:

```sh
cookbook-router generate --routes ./src/route-config.json --out-dir ./.cookbook-router
```

The generated `register.d.ts` is included in the app TypeScript program so route APIs are typed from generated contracts.

## Release validation

The repository-level script copies this app to an isolated temporary directory, packs local packages, installs the tarballs, and runs validation:

```sh
pnpm test:consumer-trial
```

This verifies that the app does not rely on workspace-only internals.

## Troubleshooting

- If install fails, check package export maps and packed files.
- If generated contracts differ, rerun `pnpm generate` inside the trial app.
- If type inference fails, check `.cookbook-router/register.d.ts` inclusion.
- If deep imports are detected, import only from package roots.
