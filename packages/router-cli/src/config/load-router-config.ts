import { dirname, join } from 'node:path';
import type { DefineRoutesOptions } from '@cookbook/router';
import type {
  CliFileSystem,
  GeneratedRouteTreeRuntimeOptions,
  LoadedRouterConfig,
  RouterCliConfig,
} from '../contracts';
import { nodeFileSystem } from '../fs/node-file-system';
import { ROUTER_CONFIG_FILENAMES } from './router-config-filenames';
import {
  escapeRegExp,
  extractBalancedObject,
  isQuote,
  readBlockComment,
  readLineComment,
  readQuoted,
  startsBlockComment,
  startsLineComment,
  skipTrivia,
} from '../route-files/static-source-scanner';
import {
  createCliPathConstraints,
  extractConstraintNames,
  extractObjectPropertyValueOrShorthand,
  extractPathConstraints,
  extractPathOptions,
  findStaticObjectDeclaration,
} from '../route-files/extract-route-options';
import { assertSafeCliPath } from '../security/safe-paths';

const defaultFs: CliFileSystem = nodeFileSystem;

export interface LoadRouterConfigOptions {
  readonly configFile?: string;
  readonly cwd?: string;
  readonly fs?: CliFileSystem;
  readonly optional?: boolean;
}

/** Loads the project router config file. */
export async function loadRouterConfig(
  options: LoadRouterConfigOptions = {},
): Promise<LoadedRouterConfig | undefined> {
  const fs = options.fs ?? defaultFs;
  const configFile = options.configFile
    ? scopeConfigPath(assertSafeCliPath('configFile', options.configFile), options.cwd)
    : await findRouterConfigFile(options.cwd ?? '.', fs);

  if (configFile === undefined) {
    if (options.optional) {
      return undefined;
    }

    throw new Error(
      `No cookbook-router config file found. Expected one of: ${ROUTER_CONFIG_FILENAMES.join(', ')}.`,
    );
  }

  let contents: string;

  try {
    contents = await fs.readFile(configFile);
  } catch (error) {
    if (options.optional) {
      return undefined;
    }

    throw new Error(`Router config "${configFile}" could not be found or read.`, {
      cause: error,
    });
  }

  const rootDir = dirname(configFile) || '.';
  const parsed = await parseRouterConfigWithRuntimeOptions(configFile, contents, fs);

  return {
    config: parsed.config,
    configFile,
    rootDir,
    ...(parsed.runtimeRouteOptions === undefined
      ? {}
      : { runtimeRouteOptions: parsed.runtimeRouteOptions }),
  };
}

interface ParsedRouterConfigWithRuntimeOptions {
  readonly config: RouterCliConfig;
  readonly runtimeRouteOptions?: GeneratedRouteTreeRuntimeOptions;
}

async function parseRouterConfigWithRuntimeOptions(
  path: string,
  contents: string,
  fs: CliFileSystem,
): Promise<ParsedRouterConfigWithRuntimeOptions> {
  const configLiteral = extractRouterConfigLiteral(path, contents);
  const routeFiles = evaluateConfigValue(path, configLiteral, 'routeFiles', contents) as
    | string
    | readonly string[]
    | undefined;
  const outDir = evaluateConfigValue(path, configLiteral, 'outDir', contents) as string | undefined;
  const pathOptions = extractPathOptions(path, configLiteral, contents);
  const pathConstraints = await extractConfigPathConstraints(path, contents, configLiteral, fs);

  assertRouteFiles(path, routeFiles);

  if (outDir !== undefined && typeof outDir !== 'string') {
    throw new Error(`Router config "${path}" outDir must be a string when provided.`);
  }

  return {
    config: {
      ...(routeFiles === undefined ? {} : { routeFiles }),
      ...(outDir === undefined ? {} : { outDir }),
      ...(pathOptions === undefined ? {} : { pathOptions }),
      ...(pathConstraints?.constraints === undefined
        ? {}
        : { pathConstraints: pathConstraints.constraints }),
    },
    ...(pathConstraints?.runtimeImport === undefined
      ? {}
      : {
          runtimeRouteOptions: {
            pathConstraints: {
              path: pathConstraints.runtimeImport.path,
              exportName: pathConstraints.runtimeImport.exportName,
            },
          },
        }),
  };
}

/** Parses a supported static cookbook-router config module. */
export function parseRouterConfig(path: string, contents: string): RouterCliConfig {
  const configLiteral = extractRouterConfigLiteral(path, contents);
  const routeFiles = evaluateConfigValue(path, configLiteral, 'routeFiles', contents) as
    | string
    | readonly string[]
    | undefined;
  const outDir = evaluateConfigValue(path, configLiteral, 'outDir', contents) as string | undefined;
  const pathOptions = extractPathOptions(path, configLiteral, contents);
  const pathConstraints = extractPathConstraints(path, contents, configLiteral);

  assertRouteFiles(path, routeFiles);

  if (outDir !== undefined && typeof outDir !== 'string') {
    throw new Error(`Router config "${path}" outDir must be a string when provided.`);
  }

  return {
    ...(routeFiles === undefined ? {} : { routeFiles }),
    ...(outDir === undefined ? {} : { outDir }),
    ...(pathOptions === undefined ? {} : { pathOptions }),
    ...(pathConstraints === undefined ? {} : { pathConstraints }),
  };
}

async function findRouterConfigFile(cwd: string, fs: CliFileSystem): Promise<string | undefined> {
  let current = cwd || '.';

  while (true) {
    const root = current === '.' ? '' : current;

    for (const filename of ROUTER_CONFIG_FILENAMES) {
      const candidate = root ? join(root, filename) : filename;

      try {
        await fs.readFile(candidate);
        return candidate;
      } catch {
        continue;
      }
    }

    const parent = dirname(current);

    if (parent === current || (current === '.' && parent === '.')) {
      return undefined;
    }

    current = parent;
  }
}

function extractRouterConfigLiteral(path: string, contents: string): string {
  const defineConfigCall = /export\s+default\s+defineRouterConfig\s*\(/g.exec(contents);

  if (defineConfigCall?.index !== undefined) {
    const objectStart = skipTrivia(contents, defineConfigCall.index + defineConfigCall[0].length);

    if (contents[objectStart] === '{') {
      return extractBalancedObject(path, contents, objectStart);
    }
  }

  const objectExport = /export\s+default\s+{/g.exec(contents);

  if (objectExport?.index !== undefined) {
    return extractBalancedObject(path, contents, objectExport.index + 'export default '.length);
  }

  const identifierExport = /export\s+default\s+([A-Za-z_$][\w$]*)\s*;?/g.exec(contents);

  if (identifierExport?.index !== undefined) {
    const identifier = identifierExport[1];
    const declaration =
      identifier === undefined
        ? undefined
        : findStaticConfigDeclaration(path, contents, identifier);

    if (declaration !== undefined) {
      return declaration;
    }
  }

  throw new Error(
    [
      `Router config "${path}" could not be statically resolved.`,
      'Use `export default defineRouterConfig({ ... })`, `export default { ... }`, or export a local static config identifier.',
    ].join(' '),
  );
}

function findStaticConfigDeclaration(
  path: string,
  contents: string,
  identifier: string,
): string | undefined {
  const declaration = new RegExp(
    `(?:export\\s+)?(?:const|let|var)\\s+${escapeRegExp(identifier)}(?:\\s*:\\s*[^=]+)?\\s*=`,
  ).exec(contents);

  if (declaration?.index === undefined) {
    return undefined;
  }

  const valueStart = skipTrivia(contents, declaration.index + declaration[0].length);

  if (contents.startsWith('defineRouterConfig', valueStart)) {
    const callStart = contents.indexOf('(', valueStart);
    const objectStart = callStart === -1 ? -1 : skipTrivia(contents, callStart + 1);

    if (objectStart !== -1 && contents[objectStart] === '{') {
      return extractBalancedObject(path, contents, objectStart);
    }
  }

  if (contents[valueStart] === '{') {
    return extractBalancedObject(path, contents, valueStart);
  }

  return undefined;
}

function evaluateConfigValue(
  path: string,
  configLiteral: string,
  propertyName: string,
  contents = '',
): unknown {
  const rawValueLiteral = extractObjectPropertyValueOrShorthand(configLiteral, propertyName);

  if (rawValueLiteral === undefined) {
    return undefined;
  }

  const valueLiteral = resolveStaticConfigValue(contents, rawValueLiteral);

  if (valueLiteral === undefined) {
    throw new Error(
      `Router config "${path}" property "${propertyName}" must be a static string or string array.`,
    );
  }

  const parsed = parseStaticStringOrStringArray(valueLiteral);

  if (parsed === undefined) {
    throw new Error(
      `Router config "${path}" property "${propertyName}" must be a static string or string array.`,
    );
  }

  return parsed;
}

function parseStaticStringOrStringArray(source: string): string | readonly string[] | undefined {
  const trimmed = stripTypeScriptConstAssertions(source).trim();
  const stringValue = parseStringLiteral(trimmed);

  if (stringValue !== undefined) {
    return stringValue;
  }

  if (!trimmed.startsWith('[') || !trimmed.endsWith(']')) {
    return undefined;
  }

  const items = parseStringArrayLiteral(trimmed);
  return items ?? undefined;
}

function parseStringArrayLiteral(source: string): readonly string[] | undefined {
  const values: string[] = [];
  let index = 1;

  while (index < source.length - 1) {
    index = skipTrivia(source, index);

    if (source[index] === ',') {
      index += 1;
      continue;
    }

    if (source[index] === ']') {
      return values;
    }

    const parsed = readStringLiteral(source, index);

    if (parsed === undefined) {
      return undefined;
    }

    values.push(parsed.value);
    index = skipTrivia(source, parsed.end);

    if (source[index] === ',') {
      index += 1;
      continue;
    }

    if (source[index] === ']') {
      return values;
    }

    return undefined;
  }

  return values;
}

function parseStringLiteral(source: string): string | undefined {
  const parsed = readStringLiteral(source, 0);

  if (parsed === undefined || skipTrivia(source, parsed.end) !== source.length) {
    return undefined;
  }

  return parsed.value;
}

function readStringLiteral(
  source: string,
  start: number,
): { readonly value: string; readonly end: number } | undefined {
  const quote = source[start];

  if (quote !== "'" && quote !== '"') {
    return undefined;
  }

  let value = '';
  let index = start + 1;

  while (index < source.length) {
    const char = source[index];

    if (char === quote) {
      return { value, end: index + 1 };
    }

    if (char === '\\') {
      const escaped = source[index + 1];

      if (escaped === undefined) {
        return undefined;
      }

      value += decodeEscapedCharacter(escaped);
      index += 2;
      continue;
    }

    if (char === '\n' || char === '\r' || char === undefined) {
      return undefined;
    }

    value += char;
    index += 1;
  }

  return undefined;
}

function decodeEscapedCharacter(char: string): string {
  switch (char) {
    case 'n':
      return '\n';
    case 'r':
      return '\r';
    case 't':
      return '\t';
    case 'b':
      return '\b';
    case 'f':
      return '\f';
    case 'v':
      return '\v';
    case '0':
      return '\0';
    default:
      return char;
  }
}

function resolveStaticConfigValue(contents: string, valueLiteral: string): string | undefined {
  const trimmed = stripTypeScriptConstAssertions(valueLiteral).trim();

  if (!/^[A-Za-z_$][\w$]*$/.test(trimmed)) {
    return trimmed;
  }

  return findStaticValueDeclaration(contents, trimmed);
}

function findStaticValueDeclaration(contents: string, identifier: string): string | undefined {
  const declaration = new RegExp(
    `(?:export\\s+)?(?:const|let|var)\\s+${escapeRegExp(identifier)}(?:\\s*:\\s*[^=]+)?\\s*=`,
  ).exec(contents);

  if (declaration?.index === undefined) {
    return undefined;
  }

  const valueStart = skipTrivia(contents, declaration.index + declaration[0].length);
  const valueEnd = readStaticDeclarationValue(contents, valueStart);

  return trimTrailingStatementTerminator(contents.slice(valueStart, valueEnd));
}

function readStaticDeclarationValue(source: string, start: number): number {
  let index = start;
  let squareDepth = 0;
  let braceDepth = 0;
  let parenDepth = 0;

  while (index < source.length) {
    const char = source[index];

    if (!char) {
      return index;
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

    if (char === '[') {
      squareDepth += 1;
      index += 1;
      continue;
    }

    if (char === ']') {
      squareDepth -= 1;
      index += 1;
      continue;
    }

    if (char === '{') {
      braceDepth += 1;
      index += 1;
      continue;
    }

    if (char === '}') {
      braceDepth -= 1;
      index += 1;
      continue;
    }

    if (char === '(') {
      parenDepth += 1;
      index += 1;
      continue;
    }

    if (char === ')') {
      parenDepth -= 1;
      index += 1;
      continue;
    }

    if (char === ';' && squareDepth === 0 && braceDepth === 0 && parenDepth === 0) {
      return index;
    }

    index += 1;
  }

  return index;
}

function trimTrailingStatementTerminator(source: string): string {
  const trimmed = source.trim();
  return trimmed.endsWith(';') ? trimmed.slice(0, -1).trimEnd() : trimmed;
}

interface ConfigPathConstraintsResult {
  readonly constraints: DefineRoutesOptions['pathConstraints'];
  readonly runtimeImport?: {
    readonly path: string;
    readonly exportName: string;
  };
}

async function extractConfigPathConstraints(
  path: string,
  contents: string,
  configLiteral: string,
  fs: CliFileSystem,
): Promise<ConfigPathConstraintsResult | undefined> {
  const rawValue = extractObjectPropertyValueOrShorthand(configLiteral, 'pathConstraints');

  if (rawValue === undefined) {
    return undefined;
  }

  const value = rawValue.trim();

  if (value.startsWith('{')) {
    return {
      constraints: createCliPathConstraints(extractConstraintNames(path, value)),
    };
  }

  const identifier = stripTypeScriptConstAssertions(value).trim();

  if (!/^[A-Za-z_$][\w$]*$/.test(identifier)) {
    throw new Error(
      [
        `Router config "${path}" uses pathConstraints that the CLI cannot statically evaluate.`,
        'Use an inline static object, a local static object declaration, or a named import from a runtime-safe module.',
      ].join(' '),
    );
  }

  const localObject = findStaticObjectDeclaration(contents, identifier);

  if (localObject !== undefined) {
    return {
      constraints: createCliPathConstraints(extractConstraintNames(path, localObject)),
    };
  }

  const namedImport = findNamedImport(contents, identifier);

  if (namedImport === undefined) {
    throw new Error(
      [
        `Router config "${path}" uses pathConstraints that the CLI cannot statically evaluate.`,
        `The identifier "${identifier}" must be a static object declared in the config file or a named import from a relative module.`,
      ].join(' '),
    );
  }

  const importedPath = await resolveImportedModulePath(path, namedImport.source, fs);

  if (importedPath === undefined) {
    throw new Error(
      `Router config "${path}" imports pathConstraints from "${namedImport.source}", but the module could not be resolved.`,
    );
  }

  const importedContents = await fs.readFile(importedPath);
  const importedObject = findStaticObjectDeclarationByExportName(
    importedContents,
    namedImport.importedName,
  );

  if (importedObject === undefined) {
    throw new Error(
      [
        `Router config "${path}" imports pathConstraints from "${namedImport.source}",`,
        `but export "${namedImport.importedName}" is not a static object declaration.`,
      ].join(' '),
    );
  }

  return {
    constraints: createCliPathConstraints(extractConstraintNames(importedPath, importedObject)),
    runtimeImport: {
      path: importedPath,
      exportName: namedImport.importedName,
    },
  };
}

interface NamedImportReference {
  readonly source: string;
  readonly importedName: string;
}

function findStaticObjectDeclarationByExportName(
  contents: string,
  exportName: string,
): string | undefined {
  const direct = findStaticObjectDeclaration(contents, exportName);

  if (direct !== undefined) {
    return direct;
  }

  const exportPattern = /export\s*{([^}]+)}/g;
  let match: RegExpExecArray | null;

  while ((match = exportPattern.exec(contents)) !== null) {
    if (isReExport(contents, match.index + match[0].length)) {
      continue;
    }

    for (const specifier of (match[1] ?? '').split(',')) {
      const named = toNamedExportSpecifier(specifier.trim());

      if (named?.exportName === exportName) {
        return findStaticObjectDeclaration(contents, named.localName);
      }
    }
  }

  return undefined;
}

function isReExport(contents: string, exportEnd: number): boolean {
  const semicolonIndex = contents.indexOf(';', exportEnd);
  const statementEnd = semicolonIndex === -1 ? contents.length : semicolonIndex + 1;
  const afterExport = contents.slice(exportEnd, statementEnd);
  return /\bfrom\s+['"]/.test(afterExport);
}

function toNamedExportSpecifier(
  source: string,
): { readonly localName: string; readonly exportName: string } | undefined {
  if (!source || source.startsWith('type ')) {
    return undefined;
  }

  const [localName, exportName] = source.split(/\s+as\s+/).map((part) => part.trim());

  if (!localName) {
    return undefined;
  }

  return { localName, exportName: exportName || localName };
}

function findNamedImport(contents: string, localName: string): NamedImportReference | undefined {
  const importPattern = /import\s+{([^}]+)}\s+from\s+['"](\.[^'"]+)['"]/g;
  let match: RegExpExecArray | null;

  while ((match = importPattern.exec(contents)) !== null) {
    for (const specifier of (match[1] ?? '').split(',')) {
      const named = toNamedImportSpecifier(specifier.trim());

      if (named?.localName === localName) {
        return {
          source: match[2] ?? '',
          importedName: named.importedName,
        };
      }
    }
  }

  return undefined;
}

function toNamedImportSpecifier(
  source: string,
): { readonly importedName: string; readonly localName: string } | undefined {
  if (!source || source.startsWith('type ')) {
    return undefined;
  }

  const [importedName, localName] = source.split(/\s+as\s+/).map((part) => part.trim());

  if (!importedName) {
    return undefined;
  }

  return { importedName, localName: localName || importedName };
}

async function resolveImportedModulePath(
  importerPath: string,
  source: string,
  fs: CliFileSystem,
): Promise<string | undefined> {
  const basePath = join(dirname(importerPath), source);
  const candidates = [
    basePath,
    `${basePath}.ts`,
    `${basePath}.tsx`,
    `${basePath}.mts`,
    `${basePath}.cts`,
    `${basePath}.js`,
    `${basePath}.mjs`,
    `${basePath}.cjs`,
    join(basePath, 'index.ts'),
    join(basePath, 'index.tsx'),
    join(basePath, 'index.js'),
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

function scopeConfigPath(path: string, cwd: string | undefined): string {
  if (cwd === undefined || cwd === '.' || isAbsoluteLike(path)) {
    return path;
  }

  return join(cwd, path);
}

function isAbsoluteLike(path: string): boolean {
  return path.startsWith('/') || /^[A-Za-z]:[\\/]/.test(path);
}

function assertRouteFiles(path: string, routeFiles: string | readonly string[] | undefined): void {
  if (routeFiles === undefined) {
    return;
  }

  if (typeof routeFiles === 'string') {
    if (!routeFiles.trim()) {
      throw new Error(`Router config "${path}" routeFiles must not be empty.`);
    }
    return;
  }

  if (!Array.isArray(routeFiles)) {
    throw new Error(`Router config "${path}" routeFiles must be a string or string array.`);
  }

  for (const routeFile of routeFiles) {
    if (typeof routeFile !== 'string' || !routeFile.trim()) {
      throw new Error(`Router config "${path}" routeFiles entries must be non-empty strings.`);
    }
  }
}

function stripTypeScriptConstAssertions(source: string): string {
  return source.replace(/\s+as\s+const\b/g, '');
}
