# Code generation

`@cookbook/router-cli` generates TypeScript contracts, a registration declaration, and a route manifest from route definitions.

## Table of contents

- [Commands](#commands)
- [Route file formats](#route-file-formats)
- [Generate](#generate)
- [Validate](#validate)
- [Manifest only](#manifest-only)
- [Watch mode](#watch-mode)
- [Programmatic usage](#programmatic-usage)
- [Programmatic generation helpers](#programmatic-generation-helpers)
- [CLI runner helpers](#cli-runner-helpers)
- [Generated output](#generated-output)
- [Static extraction rules](#static-extraction-rules)
- [Safety checks](#safety-checks)
- [Common workflows](#common-workflows)
- [Troubleshooting](#troubleshooting)

## Commands

```sh
cookbook-router generate --routes src/routes.tsx --out-dir .cookbook-router
cookbook-router validate --routes src/routes.tsx
cookbook-router manifest --routes src/routes.tsx --out-dir .cookbook-router
cookbook-router generate --routes src/routes.tsx --out-dir .cookbook-router --watch
```

A shorter alias `cbr` is also available:

```sh
cbr generate --routes src/routes.tsx --out-dir .cookbook-router
```

## Route file formats

The CLI accepts:

- `.json`
- `.js`
- `.mjs`
- `.cjs`
- `.ts`
- `.tsx`
- `.mts`
- `.cts`
- extensionless JSON files

The common app shape is a static `defineRoutes([...])` export.

```tsx
import { defineRoutes } from '@cookbook/router';

export const routes = defineRoutes([{ id: 'home', path: '/', view: HomePage }] as const);
```

JSON files must provide a top-level `routes` array.

```json
{
  "routes": [{ "id": "home", "path": "/" }]
}
```

## Generate

```sh
cookbook-router generate --routes src/routes.tsx --out-dir .cookbook-router
```

Writes:

```txt
.cookbook-router/contracts.ts
.cookbook-router/manifest.json
.cookbook-router/register.d.ts
```

## Validate

```sh
cookbook-router validate --routes src/routes.tsx
```

Validates routes without writing files. It exits non-zero on errors.

## Manifest only

```sh
cookbook-router manifest --routes src/routes.tsx --out-dir .cookbook-router
```

Writes only `manifest.json`.

## Route file limitations

The CLI expects statically extractable route declarations. Keep codegen-relevant fields inline and literal when possible: `id`, `path`, `index`, `search`, `hash`, `meta`, `children`, `layout.slots`, and `redirect`. Imported views are supported because the extractor replaces view-bearing fields with placeholders, but imported constants for route IDs, search schemas, or metadata may not be understood by static extraction.

Generated contracts follow URLKit static descriptor semantics. Built-in parsed path constraints such as `{id:int}`, `{price:decimal}`, `{value:range(1,10)}`, `{value:min(1)}`, and `{value:max(10)}` generate `number` params. Built-in `uuid`, `minlength`, `maxlength`, `list`, and `regex` constraints generate `string` params. Custom path constraints declared through `defineRoutes(routes, { pathConstraints })` generate `string` params unless URLKit exposes typed static custom inference. See [Path routes and constraints](path-routes.md) for the complete path constraint surface.

Use static URL descriptors in CLI-consumed route files:

```tsx
export const routes = defineRoutes([
  {
    id: 'products.show',
    path: '/products/{price:int}',
    search: {
      page: { type: 'int', default: 1 },
      tags: { type: 'string', many: true },
      publishedOn: {
        type: 'date',
        format: 'dd-MM-yyyy',
        optional: true,
      },
      startsAt: {
        type: 'date-time',
        format: 'dd-MM-yyyy HH:mm:ss',
        optional: true,
      },
    },
    hash: { type: 'enum', values: ['details', 'reviews'], optional: true },
    url: { arrayFormat: 'comma' },
  },
] as const);
```

Do not use URLKit runtime builders such as `int().default(1)` or `date({ format: 'dd-MM-yyyy' })` in static route files unless the extractor explicitly supports them. Use static descriptors such as `{ type: 'int', default: 1 }` and `{ type: 'date', format: 'dd-MM-yyyy', optional: true }` instead. Route-level `url` options are included in `manifest.json` so manifest-based runtimes can preserve array-format and default-serialization behavior.

Router route descriptors support date and date-time format strings as plain static data. URLKit treats static date/date-time values as UTC: date-only formats use UTC calendar fields, date-time formats are UTC instants, and custom static format strings serialize from UTC fields. They do not support custom runtime parse/serialize codec functions in route definitions because the CLI must be able to analyze route files without executing arbitrary URLKit builders.

If generation fails on a complex route file, simplify the route declaration or move codegen-relevant values inline before rerunning `generate`.

## Watch mode

```sh
cookbook-router generate --routes src/routes.tsx --out-dir .cookbook-router --watch
```

Generates all files once, keeps the process alive, and regenerates them when route files change. Rapid file-system events are debounced before regeneration.

## Programmatic usage

```ts
import { generateCommand, validateCommand, watchCommand } from '@cookbook/router-cli';

await validateCommand({ routeFiles: ['src/routes.tsx'] });
await generateCommand({ routeFiles: ['src/routes.tsx'], outDir: '.cookbook-router' });

const watcher = watchCommand({
  routeFiles: ['src/routes.tsx'],
  outDir: '.cookbook-router',
  onChange(result) {
    if (!result.ok) {
      console.error(result.errors.join('\n'));
    }
  },
});

await watcher.initial;

// Later, when your integration is shutting down:
watcher.close();
```

You can also pass routes directly in programmatic code:

```ts
await generateCommand({ routes, outDir: '.cookbook-router' });
```

## Programmatic generation helpers

Use the generation helpers when embedding Cookbook Router codegen inside another build tool.

```ts
import {
  generateContracts,
  generateManifest,
  generateRegister,
  serializeManifest,
} from '@cookbook/router-cli';

const contractsSource = generateContracts(routes);
const registerSource = generateRegister();
const manifest = generateManifest(routes);
const manifestJson = serializeManifest(manifest);
```

Signatures:

```ts
function generateContracts(routes: readonly RouteDefinition[]): string;
function generateRegister(): string;
function generateManifest(routes: readonly RouteDefinition[]): RouteManifest;
function serializeManifest(manifest: RouteManifest): string;

interface RouteManifest {
  readonly routes: readonly ManifestRoute[];
}
```

See the [CLI API reference](api.md#programmatic-command-apis) for command APIs and [contract registration](api.md#contract-registration) for generated type registration.

## CLI runner helpers

`runCli()` and `shouldRunCli()` are public for tests and custom executable wrappers.

```ts
import { runCli, shouldRunCli } from '@cookbook/router-cli';

if (shouldRunCli()) {
  process.exitCode = await runCli(process.argv.slice(2));
}
```

Signatures:

```ts
interface CliRunnerOptions {
  readonly stdout?: (message: string) => void;
  readonly stderr?: (message: string) => void;
  readonly version?: string;
}

function runCli(argv: readonly string[], runnerOptions?: CliRunnerOptions): Promise<number>;
function shouldRunCli(moduleUrl?: string, argv?: readonly string[]): boolean;
```

## Generated output

### `contracts.ts`

Contains:

- `RouteParams`
- `RouteSearch`
- `RouteHash`
- `RouteMeta`
- `RoutePaths`
- `RouteOutletContext`
- `routeIds`
- `routePaths`
- `RouterContracts`

### `register.d.ts`

Registers generated contracts through `@cookbook/router` module augmentation.

### `manifest.json`

Contains route IDs, paths, and route-level URL options such as `arrayFormat`, `defaults`, `invalidSearch`, `invalidHash`, and `unknownSearch` when configured.

## Static extraction rules

The CLI statically extracts the array passed to `defineRoutes([...])` or a static `routes = [...]` array. View references are sanitized to placeholder functions during extraction.

Keep route files codegen-friendly:

- declare routes in a static array
- avoid computed IDs and computed paths
- avoid route arrays assembled through runtime loops
- keep route config serializable where possible
- use static URLKit-compatible `search`, `hash`, and `url` descriptors
- register custom path constraints in the second `defineRoutes` argument so the CLI can register them before validation and generation
- keep complex runtime logic outside route declarations

## Safety checks

The CLI validates:

- route file paths
- generated output paths
- route tree validity
- duplicate IDs
- duplicate full paths
- invalid path patterns
- unsupported URLKit runtime builders in static route files
- invalid slot definitions
- malformed redirects
- invalid configured intercept targets

It also refuses output layouts that would clobber route files.

## Common workflows

### App development

```json
{
  "scripts": {
    "routes:generate": "cookbook-router generate --routes src/routes.tsx --out-dir .cookbook-router",
    "routes:watch": "cookbook-router generate --routes src/routes.tsx --out-dir .cookbook-router --watch",
    "routes:validate": "cookbook-router validate --routes src/routes.tsx"
  }
}
```

### CI

```sh
pnpm routes:generate
pnpm routes:validate
pnpm typecheck
pnpm test
pnpm build
```

## Troubleshooting

### `Route file must export routes`

Make sure the file contains `defineRoutes([...])` or a static `routes = [...]` array.

### Generated contracts do not update

Run `generate` manually once to check diagnostics, then use either `watch` or `generate --watch` during development. Watch mode prints the initial generation result and each later regeneration result.

### View imports fail during generation

The CLI does not need to execute views, but the route declaration still needs to be statically extractable. Keep view values as identifiers directly in the route array.

### TypeScript does not see generated types

Include the generated `.cookbook-router` (or your custom name) directory in `tsconfig.json`.

```json
{
  "include": ["src", ".cookbook-router"]
}
```

Once `.cookbook-router` is included in your TypeScript program, it augments `@cookbook/router` with the generated route contracts.

Router APIs can then infer valid route IDs, exact route paths, path params, search values, hash values, and route metadata from the generated public types. Path params follow the generated constraint contract: numeric built-in constraints such as `{id:int}`, `{price:decimal}`, `{value:range(1,10)}`, `{value:min(1)}`, and `{value:max(10)}` become `number`; unconstrained params, wildcards, string-shaped constraints such as `uuid`, `regex`, `list`, `minlength`, `maxlength`, and custom constraints are exposed as `string` unless combined with a numeric built-in constraint.
