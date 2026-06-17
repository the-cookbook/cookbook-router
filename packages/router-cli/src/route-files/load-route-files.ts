import { dirname, extname, join } from 'node:path';
import { defineRouteTree, registerPathConstraints, validateRoutes } from '@cookbook/router';
import type { DefineRoutesOptions, RouteDeclaration } from '@cookbook/router';
import type { CliFileSystem, CliRouteSource, LoadRouteFilesOptions, RouteFile } from '../contracts';
import { nodeFileSystem } from '../fs/node-file-system';
import { assertSafeRouteFilePaths } from '../security/safe-paths';
import { parseJsonRouteFile } from './parse-json-route-file';
import { parseStaticRouteModule } from './parse-static-route-module';
import { extractDefineRouteTreeLiteral } from './extract-define-route-tree-call';
import { extractRouteModuleLiterals } from './extract-define-routes-call';
import { extractStaticConstDeclarations } from './extract-static-constants';
import {
  extractDescriptorDeclarations,
  extractRouteDeclarationStatements,
  extractNamedExportMap,
  extractDefineRouteModuleLiterals,
} from './extract-define-route-calls';
import { sanitizeRoutesLiteral } from './sanitize-route-module';
import {
  isIdentifierPart,
  isIdentifierStart,
  isQuote,
  readBlockComment,
  readIdentifier,
  readLineComment,
  readQuoted,
  skipWhitespace,
  startsBlockComment,
  startsLineComment,
} from './static-source-scanner';

const defaultFs: CliFileSystem = nodeFileSystem;

/**
 * Loads route modules from disk and returns their route definitions plus any
 * discovered options. Cross-file validation happens after all route files are
 * loaded so modular child files can reference parents declared elsewhere.
 */
export async function loadRouteFiles(
  options: LoadRouteFilesOptions,
): Promise<readonly CliRouteSource[]> {
  assertSafeRouteFilePaths(options.routeFiles);
  const fs = options.fs ?? defaultFs;
  const sources: CliRouteSource[] = [];
  const staticModuleCache = new Map<string, StaticModuleRecord>();

  for (const path of options.routeFiles) {
    const parsed = await loadRouteFile(path, fs, staticModuleCache);

    if (!hasCompositionFields(parsed.routes) && !hasExternalInterceptTargets(parsed.routes)) {
      registerPathConstraints(parsed.routeOptions?.pathConstraints);
      validateRoutes(parsed.routes, parsed.routeOptions?.pathOptions);
    }

    sources.push({
      path,
      routes: parsed.routes,
      ...(parsed.routeOptions === undefined ? {} : { routeOptions: parsed.routeOptions }),
      ...(parsed.routeExports === undefined ? {} : { routeExports: parsed.routeExports }),
    });
  }

  return sources;
}

/** Validates all loaded route files as one route graph without writing artifacts. */
export async function validateRouteFiles(
  options: LoadRouteFilesOptions,
): Promise<readonly CliRouteSource[]> {
  const sources = await loadRouteFiles(options);
  const routeOptions = mergeLoadedRouteOptions(sources);
  const routes = sources.flatMap((source) => source.routes);

  registerPathConstraints(routeOptions?.pathConstraints);

  if (hasCompositionFields(routes)) {
    defineRouteTree({
      routes: routes as readonly RouteDeclaration[],
      ...(routeOptions?.pathOptions === undefined ? {} : { pathOptions: routeOptions.pathOptions }),
      ...(routeOptions?.pathConstraints === undefined
        ? {}
        : { pathConstraints: routeOptions.pathConstraints }),
    });
  } else {
    validateRoutes(routes, routeOptions?.pathOptions);
  }

  return sources;
}

interface ImportedStaticStatements {
  readonly constantStatements: readonly string[];
  readonly descriptorStatements: readonly string[];
  readonly routeDeclarationStatements: readonly string[];
}

interface StaticDeclarationRecord {
  readonly exportName: string;
  readonly statement: string;
}

interface StaticModuleRecord {
  readonly contents: string;
  readonly constants: readonly StaticDeclarationRecord[];
  readonly descriptors: readonly StaticDeclarationRecord[];
  readonly routes: readonly StaticDeclarationRecord[];
  readonly namedExports: ReadonlyMap<string, readonly string[]>;
}

async function collectImportedStaticStatements(
  path: string,
  contents: string,
  fs: CliFileSystem,
  cache: Map<string, StaticModuleRecord>,
  seen: Set<string> = new Set(),
  requiredNames?: ReadonlySet<string>,
): Promise<ImportedStaticStatements> {
  const constantStatements: string[] = [];
  const descriptorStatements: string[] = [];
  const routeDeclarationStatements: string[] = [];
  const emittedStaticAliasStatements = new Set<string>();
  const neededNames = resolveRouteMetadataReferencedNames(path, contents, requiredNames);

  for (const importedModule of extractNamedValueImports(contents)) {
    const matchingSpecifiers = importedModule.specifiers.filter((specifier) =>
      neededNames.has(specifier.localName),
    );

    if (!matchingSpecifiers[0]) {
      continue;
    }

    if (isKnownRuntimeHelperImport(importedModule.source)) {
      continue;
    }

    assertStaticMetadataImportPath(path, importedModule.source);

    const importedPath = await resolveImportedModulePath(path, importedModule.source, fs);

    if (importedPath === undefined) {
      throw new Error(
        [
          `Route file "${path}" imports static route metadata from "${importedModule.source}", but the module could not be resolved.`,
          'Use a relative or absolute file path and check the file extension.',
        ].join(' '),
      );
    }

    const importedModuleRecord = await readStaticModuleRecord(importedPath, fs, cache);
    const { constants, descriptors, routes, namedExports } = importedModuleRecord;
    const importedContents = importedModuleRecord.contents;
    const importedNames = new Set<string>(
      matchingSpecifiers.map((specifier) => specifier.importedName),
    );
    const localRequiredNames = resolveImportedExportNames(importedNames, namedExports);
    const constantAliases = collectStaticExportAliases({
      declarations: constants,
      importedNames,
      namedExports,
    });
    const descriptorAliases = collectStaticExportAliases({
      declarations: descriptors,
      importedNames,
      namedExports,
    });
    const constantNames = new Set<string>([
      ...constants.map((constant) => constant.exportName),
      ...constantAliases.names,
    ]);
    const descriptorNames = new Set<string>([
      ...descriptors.map((descriptor) => descriptor.exportName),
      ...descriptorAliases.names,
    ]);
    const routeNames = new Set<string>(routes.map((route) => route.exportName));
    const hasMatchingConstant = hasMatchingImportedName(localRequiredNames, constantNames);
    const hasMatchingDescriptor = hasMatchingImportedName(localRequiredNames, descriptorNames);
    const hasMatchingRoute = routes.some((route) => localRequiredNames.has(route.exportName));

    if (!hasMatchingConstant && !hasMatchingDescriptor && !hasMatchingRoute) {
      continue;
    }

    if (!seen.has(importedPath)) {
      seen.add(importedPath);
      const nested = await collectImportedStaticStatements(
        importedPath,
        importedContents,
        fs,
        cache,
        seen,
        localRequiredNames,
      );
      constantStatements.push(...nested.constantStatements);
      descriptorStatements.push(...nested.descriptorStatements);
      routeDeclarationStatements.push(...nested.routeDeclarationStatements);

      // Keep currently needed static declarations from the imported module so
      // selected descriptors/routes can reference earlier local static consts.
      // Imports are still followed only from the route metadata dependency graph.
      constantStatements.push(...constants.map((constant) => constant.statement));
      descriptorStatements.push(...descriptors.map((descriptor) => descriptor.statement));
      routeDeclarationStatements.push(...routes.map((route) => route.statement));
    }

    pushUniqueStatements(
      constantStatements,
      constantAliases.statements,
      emittedStaticAliasStatements,
    );
    pushUniqueStatements(
      descriptorStatements,
      descriptorAliases.statements,
      emittedStaticAliasStatements,
    );

    appendImportAliases({
      importedModule: { ...importedModule, specifiers: matchingSpecifiers },
      constantNames,
      descriptorNames,
      routeNames,
      constantStatements,
      descriptorStatements,
      routeDeclarationStatements,
    });
  }

  return { constantStatements, descriptorStatements, routeDeclarationStatements };
}

async function readStaticModuleRecord(
  path: string,
  fs: CliFileSystem,
  cache: Map<string, StaticModuleRecord>,
): Promise<StaticModuleRecord> {
  const cached = cache.get(path);

  if (cached !== undefined) {
    return cached;
  }

  const contents = await fs.readFile(path);
  const record: StaticModuleRecord = {
    contents,
    constants: extractStaticConstDeclarations(contents),
    descriptors: extractDescriptorDeclarations(contents),
    routes: extractRouteDeclarationStatements(path, contents, { exportedOnly: true }),
    namedExports: extractNamedExportMap(contents),
  };
  cache.set(path, record);
  return record;
}

function resolveImportedExportNames(
  importedNames: ReadonlySet<string>,
  namedExports: ReadonlyMap<string, readonly string[]>,
): ReadonlySet<string> {
  const names = new Set(importedNames);

  for (const [localName, exportNames] of namedExports) {
    for (const exportName of exportNames) {
      if (importedNames.has(exportName)) {
        names.add(localName);
      }
    }
  }

  return names;
}

function pushUniqueStatements(
  target: string[],
  statements: readonly string[],
  seen: Set<string>,
): void {
  for (const statement of statements) {
    if (seen.has(statement)) {
      continue;
    }

    seen.add(statement);
    target.push(statement);
  }
}

function hasMatchingImportedName(
  importedNames: ReadonlySet<string>,
  knownNames: ReadonlySet<string>,
): boolean {
  for (const importedName of importedNames) {
    if (knownNames.has(importedName)) {
      return true;
    }
  }

  return false;
}

interface StaticExportAliasCollection {
  readonly names: readonly string[];
  readonly statements: readonly string[];
}

function collectStaticExportAliases(options: {
  readonly declarations: readonly { readonly exportName: string }[];
  readonly importedNames: ReadonlySet<string>;
  readonly namedExports: ReadonlyMap<string, readonly string[]>;
}): StaticExportAliasCollection {
  const names: string[] = [];
  const statements: string[] = [];

  for (const declaration of options.declarations) {
    for (const exportedName of options.namedExports.get(declaration.exportName) ?? []) {
      if (exportedName === declaration.exportName || !options.importedNames.has(exportedName)) {
        continue;
      }

      names.push(exportedName);
      statements.push(`const ${exportedName} = ${declaration.exportName};`);
    }
  }

  return { names, statements };
}

function appendImportAliases(options: {
  readonly importedModule: NamedImport;
  readonly constantNames: ReadonlySet<string>;
  readonly descriptorNames: ReadonlySet<string>;
  readonly routeNames: ReadonlySet<string>;
  readonly constantStatements: string[];
  readonly descriptorStatements: string[];
  readonly routeDeclarationStatements: string[];
}): void {
  for (const specifier of options.importedModule.specifiers) {
    if (specifier.importedName === specifier.localName) {
      continue;
    }

    if (options.constantNames.has(specifier.importedName)) {
      options.constantStatements.push(`const ${specifier.localName} = ${specifier.importedName};`);
    }

    if (options.descriptorNames.has(specifier.importedName)) {
      options.descriptorStatements.push(
        `const ${specifier.localName} = ${specifier.importedName};`,
      );
    }

    if (options.routeNames.has(specifier.importedName)) {
      options.routeDeclarationStatements.push(
        `const ${specifier.localName} = ${specifier.importedName};`,
      );
    }
  }
}

interface NamedImport {
  readonly source: string;
  readonly specifiers: readonly NamedImportSpecifier[];
}

interface NamedImportSpecifier {
  readonly importedName: string;
  readonly localName: string;
}

function extractNamedValueImports(contents: string): readonly NamedImport[] {
  const imports: NamedImport[] = [];
  const importPattern = /import\s+(type\s+)?{([^}]+)}\s+from\s+['"]([^'"]+)['"]/g;
  let match: RegExpExecArray | null;

  while ((match = importPattern.exec(contents)) !== null) {
    if (match[1] !== undefined) {
      continue;
    }

    const specifiers = (match[2] ?? '')
      .split(',')
      .map((specifier) => toNamedImportSpecifier(specifier.trim()))
      .filter((specifier): specifier is NamedImportSpecifier => specifier !== undefined);

    if (specifiers[0]) {
      imports.push({ source: match[3] ?? '', specifiers });
    }
  }

  return imports;
}

function toNamedImportSpecifier(source: string): NamedImportSpecifier | undefined {
  if (!source || source.startsWith('type ')) {
    return undefined;
  }

  const [importedName, localName] = source.split(/\s+as\s+/).map((part) => part.trim());

  if (!importedName) {
    return undefined;
  }

  return { importedName, localName: localName || importedName };
}

function resolveRouteMetadataReferencedNames(
  path: string,
  contents: string,
  seedNames?: ReadonlySet<string>,
): ReadonlySet<string> {
  const declarations = collectLocalStaticDeclarationStatements(path, contents);
  const namedExports = extractNamedExportMap(contents);
  const names = new Set(seedNames ?? collectRouteMetadataSeedNames(path, contents));
  let changed = true;

  for (const seedName of [...names]) {
    for (const localName of resolveLocalExportNames(seedName, namedExports)) {
      names.add(localName);
    }
  }

  while (changed) {
    changed = false;

    for (const name of [...names]) {
      for (const localName of resolveLocalExportNames(name, namedExports)) {
        if (!names.has(localName)) {
          names.add(localName);
          changed = true;
        }
      }

      const declaration = declarations.get(name);

      if (declaration === undefined) {
        continue;
      }

      for (const referencedName of collectStaticIdentifiers(declaration)) {
        if (names.has(referencedName)) {
          continue;
        }

        names.add(referencedName);
        changed = true;
      }
    }
  }

  return names;
}

function resolveLocalExportNames(
  name: string,
  namedExports: ReadonlyMap<string, readonly string[]>,
): readonly string[] {
  const localNames: string[] = [];

  for (const [localName, exportNames] of namedExports) {
    if (exportNames.includes(name)) {
      localNames.push(localName);
    }
  }

  return localNames;
}

function collectLocalStaticDeclarationStatements(
  path: string,
  contents: string,
): ReadonlyMap<string, string> {
  const declarations = new Map<string, string>();

  for (const declaration of extractStaticConstDeclarations(contents)) {
    declarations.set(declaration.exportName, declaration.statement);
  }

  for (const declaration of extractDescriptorDeclarations(contents)) {
    declarations.set(declaration.exportName, declaration.statement);
  }

  for (const declaration of extractRouteDeclarationStatements(path, contents)) {
    declarations.set(declaration.exportName, declaration.statement);
  }

  return declarations;
}

function collectRouteMetadataSeedNames(path: string, contents: string): ReadonlySet<string> {
  const expressions: string[] = [];

  try {
    const literal = extractRouteModuleLiterals(path, contents);
    expressions.push(literal.routesLiteral);
    if (literal.optionsLiteral !== undefined) {
      expressions.push(literal.optionsLiteral);
    }
  } catch {
    // Not a defineRoutes module.
  }

  try {
    const literal = extractDefineRouteTreeLiteral(path, contents);
    expressions.push(literal.routesLiteral);
    expressions.push(literal.treeLiteral);
  } catch {
    // Not a defineRouteTree module.
  }

  try {
    const literal = extractDefineRouteModuleLiterals(path, contents);
    expressions.push(...literal.routeLiterals.map((routeLiteral) => routeLiteral.routeLiteral));
  } catch {
    // Not a defineRoute module.
  }

  const identifiers = new Set<string>();

  for (const expression of expressions) {
    for (const name of collectStaticIdentifiers(sanitizeRoutesLiteral(expression))) {
      identifiers.add(name);
    }
  }

  return identifiers;
}

const ignoredStaticIdentifiers = new Set([
  'undefined',
  'null',
  'true',
  'false',
  'const',
  'as',
  'satisfies',
  'readonly',
  'defineRoute',
  'defineRoutes',
  'defineRouteTree',
  'defineSearch',
  'defineHash',
  'mergeSearch',
  'mergeHash',
  '__cookbookRouteView',
]);

function collectStaticIdentifiers(source: string): ReadonlySet<string> {
  const identifiers = new Set<string>();
  let index = 0;

  while (index < source.length) {
    const char = source[index];

    if (!char) {
      break;
    }

    if (isQuote(char)) {
      index = readQuoted(source, index);
      continue;
    }

    if (startsLineComment(source, index)) {
      index = readLineComment(source, index);
      continue;
    }

    if (startsBlockComment(source, index)) {
      index = readBlockComment(source, index);
      continue;
    }

    if (!isIdentifierStart(char)) {
      index += 1;
      continue;
    }

    const end = readIdentifier(source, index);
    const identifier = source.slice(index, end);

    if (!ignoredStaticIdentifiers.has(identifier) && shouldCollectIdentifier(source, index, end)) {
      identifiers.add(identifier);
    }

    index = end;
  }

  return identifiers;
}

function shouldCollectIdentifier(source: string, start: number, end: number): boolean {
  const previous = previousNonWhitespace(source, start - 1);

  if (previous === '.') {
    return false;
  }

  const next = skipWhitespace(source, end);

  if (source[next] === ':' && source[next + 1] !== ':') {
    return false;
  }

  return !isIdentifierPart(source[end] ?? '');
}

function previousNonWhitespace(source: string, start: number): string | undefined {
  let index = start;

  while (index >= 0) {
    const char = source[index];

    if (char !== undefined && !/\s/.test(char)) {
      return char;
    }

    index -= 1;
  }

  return undefined;
}

function isKnownRuntimeHelperImport(source: string): boolean {
  return (
    source === '@cookbook/router' ||
    source === '@cookbook/router/path' ||
    source === '@cookbook/router/route-config' ||
    source === '@cookbook/router/url-state' ||
    source === '@cookbook/urlkit'
  );
}

async function resolveModuleCandidate(
  basePath: string,
  fs: CliFileSystem,
): Promise<string | undefined> {
  const candidates = [
    basePath,
    `${basePath}.ts`,
    `${basePath}.tsx`,
    `${basePath}.mts`,
    `${basePath}.cts`,
    `${basePath}.js`,
    `${basePath}.jsx`,
    `${basePath}.mjs`,
    `${basePath}.cjs`,
    join(basePath, 'index.ts'),
    join(basePath, 'index.tsx'),
    join(basePath, 'index.js'),
    join(basePath, 'index.jsx'),
    join(basePath, 'index.mts'),
    join(basePath, 'index.cts'),
    join(basePath, 'index.mjs'),
    join(basePath, 'index.cjs'),
  ];

  for (const candidate of candidates) {
    try {
      await fs.readFile(candidate);
      return candidate;
    } catch {
      continue;
    }
  }

  return undefined;
}

function assertStaticMetadataImportPath(routeFilePath: string, source: string): void {
  if (isRelativeImport(source) || isAbsoluteLike(source)) {
    return;
  }

  throw new Error(
    [
      `Route file "${routeFilePath}" imports static route metadata from "${source}", but CLI static metadata imports must use relative or absolute file paths.`,
      'Path aliases such as "@/" and bare package imports are not supported for static route metadata.',
    ].join(' '),
  );
}

async function resolveImportedModulePath(
  importerPath: string,
  source: string,
  fs: CliFileSystem,
): Promise<string | undefined> {
  if (isRelativeImport(source)) {
    return resolveModuleCandidate(join(dirname(importerPath), source), fs);
  }

  if (isAbsoluteLike(source)) {
    return resolveModuleCandidate(source, fs);
  }

  return undefined;
}

async function loadRouteFile(
  path: string,
  fs: CliFileSystem,
  staticModuleCache: Map<string, StaticModuleRecord>,
): Promise<RouteFile> {
  const extension = extname(path);
  const contents = await fs.readFile(path);

  if (extension === '.json' || !extension) {
    return parseJsonRouteFile(path, contents);
  }

  if (isStaticRouteModuleExtension(extension)) {
    const importedStatements = await collectImportedStaticStatements(
      path,
      contents,
      fs,
      staticModuleCache,
    );
    return parseStaticRouteModule(path, contents, importedStatements);
  }

  throw new Error(
    `Route file "${path}" is not directly loadable by the CLI. Use a JSON, JavaScript, TypeScript, or TSX module that exports routes.`,
  );
}

function isRelativeImport(source: string): boolean {
  return source.startsWith('./') || source.startsWith('../') || source === '.' || source === '..';
}

function isAbsoluteLike(path: string): boolean {
  return path.startsWith('/') || /^[A-Za-z]:[\\/]/.test(path);
}

function isStaticRouteModuleExtension(extension: string): boolean {
  return (
    extension === '.js' ||
    extension === '.mjs' ||
    extension === '.cjs' ||
    extension === '.ts' ||
    extension === '.tsx' ||
    extension === '.mts' ||
    extension === '.cts'
  );
}

function mergeLoadedRouteOptions(sources: readonly CliRouteSource[]): RouteFile['routeOptions'] {
  let pathOptions: DefineRoutesOptions['pathOptions'];
  let pathOptionsSignature: string | undefined;
  const pathConstraints: Record<
    string,
    NonNullable<DefineRoutesOptions['pathConstraints']>[string]
  > = {};

  for (const source of sources) {
    const options = source.routeOptions;

    if (options === undefined) {
      continue;
    }

    if (options.pathOptions !== undefined) {
      const nextSignature = JSON.stringify(options.pathOptions);

      if (pathOptionsSignature !== undefined && pathOptionsSignature !== nextSignature) {
        throw new Error(
          [
            'Conflicting pathOptions were provided by route source files.',
            'Move pathOptions to cookbook-router.config.ts or use the same pathOptions everywhere.',
          ].join(' '),
        );
      }

      pathOptions = options.pathOptions;
      pathOptionsSignature = nextSignature;
    }

    for (const [name, constraint] of Object.entries(options.pathConstraints ?? {})) {
      const existing = pathConstraints[name];

      if (existing !== undefined && !Object.is(existing, constraint)) {
        throw new Error(
          [
            `Duplicate path constraint name "${name}" was provided by route source files.`,
            'Define each custom path constraint name once, preferably in a runtime-safe module imported by cookbook-router.config.ts.',
          ].join(' '),
        );
      }

      pathConstraints[name] = constraint;
    }
  }

  const hasPathConstraints = Boolean(Object.keys(pathConstraints)[0]);

  if (pathOptions === undefined && !hasPathConstraints) {
    return undefined;
  }

  return {
    ...(pathOptions === undefined ? {} : { pathOptions }),
    ...(hasPathConstraints ? { pathConstraints } : {}),
  };
}

function hasExternalInterceptTargets(routes: readonly RouteFile['routes'][number][]): boolean {
  const localRouteIds = new Set<string>();

  for (const route of routes) {
    collectRouteIds(route, localRouteIds);
  }

  for (const route of routes) {
    if (hasInterceptTargetOutsideRouteSet(route, localRouteIds)) {
      return true;
    }
  }

  return false;
}

function collectRouteIds(route: RouteFile['routes'][number], routeIds: Set<string>): void {
  if (typeof route.id === 'string') {
    routeIds.add(route.id);
  }

  const declaration = route as RouteFile['routes'][number] & {
    readonly children?: readonly RouteFile['routes'][number][];
  };

  for (const child of declaration.children ?? []) {
    collectRouteIds(child, routeIds);
  }
}

function hasInterceptTargetOutsideRouteSet(
  route: RouteFile['routes'][number],
  routeIds: ReadonlySet<string>,
): boolean {
  const declaration = route as RouteFile['routes'][number] & {
    readonly intercepts?: Record<string, { readonly to?: string | readonly string[] }>;
    readonly children?: readonly RouteFile['routes'][number][];
  };

  const intercepts: readonly { readonly to?: string | readonly string[] }[] = Object.values(
    declaration.intercepts ?? {},
  );

  for (const intercept of intercepts) {
    const targets = Array.isArray(intercept.to) ? intercept.to : [intercept.to];

    for (const target of targets) {
      if (typeof target === 'string' && !routeIds.has(target)) {
        return true;
      }
    }
  }

  for (const child of declaration.children ?? []) {
    if (hasInterceptTargetOutsideRouteSet(child, routeIds)) {
      return true;
    }
  }

  return false;
}

function hasCompositionFields(routes: readonly RouteFile['routes'][number][]): boolean {
  for (const route of routes) {
    if (hasCompositionField(route)) {
      return true;
    }
  }

  return false;
}

function hasCompositionField(route: RouteFile['routes'][number]): boolean {
  const declaration = route as RouteFile['routes'][number] & {
    readonly parent?: string;
    readonly order?: number;
  };

  if (declaration.parent !== undefined || declaration.order !== undefined) {
    return true;
  }

  for (const child of declaration.children ?? []) {
    if (hasCompositionField(child)) {
      return true;
    }
  }

  return false;
}
