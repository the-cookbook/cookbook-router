import { extname } from 'node:path';
import { createConstraint, registerUrlPathConstraints, validateRoutes } from '@cookbook/router';
import type { CliFileSystem, CliRouteSource, LoadRouteFilesOptions, RouteFile } from '../contracts';
import type { DefineRoutesOptions, RouterPathConstraints } from '@cookbook/router';
import { assertSafeRouteFilePaths } from '../security/safe-paths';
import { nodeFileSystem } from '../node-file-system';

const defaultFs: CliFileSystem = nodeFileSystem;

/**
 * Loads route modules from disk and returns their route definitions plus any
 * `defineRoutes` options discovered on the exported route array.
 */
export async function loadRouteFiles(
  options: LoadRouteFilesOptions,
): Promise<readonly CliRouteSource[]> {
  assertSafeRouteFilePaths(options.routeFiles);
  const fs = options.fs ?? defaultFs;
  const sources: CliRouteSource[] = [];

  for (const path of options.routeFiles) {
    const parsed = await loadRouteFile(path, fs);
    registerUrlPathConstraints(parsed.routeOptions?.pathConstraints);
    validateRoutes(parsed.routes, parsed.routeOptions?.pathOptions);
    sources.push({
      path,
      routes: parsed.routes,
      ...(parsed.routeOptions === undefined ? {} : { routeOptions: parsed.routeOptions }),
    });
  }

  return sources;
}

/** Validates all loaded route files without writing generated artifacts. */
export async function validateRouteFiles(
  options: LoadRouteFilesOptions,
): Promise<readonly CliRouteSource[]> {
  return loadRouteFiles(options);
}

async function loadRouteFile(path: string, fs: CliFileSystem): Promise<RouteFile> {
  const extension = extname(path);
  const contents = await fs.readFile(path);

  if (extension === '.json' || !extension) {
    return parseJsonRouteFile(path, contents);
  }

  if (isStaticRouteModuleExtension(extension)) {
    return parseStaticRouteModule(path, contents);
  }

  throw new Error(
    `Route file "${path}" is not directly loadable by the CLI. Use a JSON, JavaScript, TypeScript, or TSX module that exports routes.`,
  );
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

function parseJsonRouteFile(path: string, contents: string): RouteFile {
  let parsed: unknown;

  try {
    parsed = JSON.parse(contents);
  } catch (error) {
    throw new Error(`Route file "${path}" contains invalid JSON.`, { cause: error });
  }

  return assertRouteFile(path, parsed);
}

function parseStaticRouteModule(path: string, contents: string): RouteFile {
  const literals = extractRouteModuleLiterals(path, contents);
  assertNoUnsupportedRuntimeUrlKitBuilders(path, literals.routesLiteral);
  const sanitized = sanitizeRoutesLiteral(literals.routesLiteral);
  let routes: unknown;

  try {
    routes = new Function(
      `"use strict"; const __cookbookRouteComponent = () => null; return (${sanitized});`,
    )() as unknown;
  } catch (error) {
    throw new Error(`Route file "${path}" could not be evaluated as a static route declaration.`, {
      cause: error,
    });
  }

  const routeOptions = extractRouteOptions(path, contents, literals.optionsLiteral);
  return assertRouteFile(path, {
    routes,
    ...(routeOptions === undefined ? {} : { routeOptions }),
  });
}

interface ExtractedRouteModuleLiterals {
  readonly routesLiteral: string;
  readonly optionsLiteral?: string;
}

function extractRouteModuleLiterals(path: string, contents: string): ExtractedRouteModuleLiterals {
  const defineRoutesCall = /\bdefineRoutes\s*\(/g;
  let defineRoutesMatch: RegExpExecArray | null;

  while ((defineRoutesMatch = defineRoutesCall.exec(contents)) !== null) {
    const callStart = defineRoutesMatch.index + defineRoutesMatch[0].length;
    const arrayStart = contents.indexOf('[', callStart);

    if (arrayStart >= 0) {
      const routesLiteral = extractBalancedArray(path, contents, arrayStart);
      const optionsLiteral = extractDefineRoutesOptionsLiteral(
        contents,
        arrayStart + routesLiteral.length,
      );
      return {
        routesLiteral,
        ...(optionsLiteral === undefined ? {} : { optionsLiteral }),
      };
    }
  }

  const routesAssignment = /(?:export\s+)?const\s+routes\s*=/.exec(contents);

  if (routesAssignment?.index !== undefined) {
    const arrayStart = contents.indexOf('[', routesAssignment.index);

    if (arrayStart >= 0) {
      return { routesLiteral: extractBalancedArray(path, contents, arrayStart) };
    }
  }

  throw new Error(
    `Route file "${path}" must export routes from defineRoutes([...]) or a static routes array.`,
  );
}

function extractDefineRoutesOptionsLiteral(
  contents: string,
  routesLiteralEnd: number,
): string | undefined {
  let index = skipWhitespace(contents, routesLiteralEnd);

  if (contents.slice(index, index + 8) === 'as const') {
    index = skipWhitespace(contents, index + 8);
  }

  if (contents[index] !== ',') {
    return undefined;
  }

  index = skipWhitespace(contents, index + 1);

  if (contents[index] === '{') {
    return extractBalancedObject('defineRoutes options', contents, index);
  }

  const identifierEnd = readIdentifierExpression(contents, index);

  if (identifierEnd > index) {
    const identifier = contents.slice(index, identifierEnd);
    const declaration = findStaticObjectDeclaration(contents, identifier);

    if (declaration !== undefined) {
      return declaration;
    }
  }

  throw new Error(
    [
      'The CLI could not statically evaluate defineRoutes options.',
      'Supported forms are defineRoutes(routes, { pathConstraints: constraints })',
      'and defineRoutes(routes, { pathConstraints: { slug: createConstraint(...) } }).',
    ].join(' '),
  );
}

function extractRouteOptions(
  path: string,
  contents: string,
  optionsLiteral: string | undefined,
): DefineRoutesOptions | undefined {
  if (optionsLiteral === undefined) {
    return undefined;
  }

  const pathOptions = extractPathOptions(path, optionsLiteral);
  const pathConstraints = extractPathConstraints(path, contents, optionsLiteral);

  if (pathOptions === undefined && pathConstraints === undefined) {
    return undefined;
  }

  return {
    ...(pathOptions === undefined ? {} : { pathOptions }),
    ...(pathConstraints === undefined ? {} : { pathConstraints }),
  };
}

function extractPathOptions(
  path: string,
  optionsLiteral: string,
): DefineRoutesOptions['pathOptions'] {
  const pathOptionsLiteral = extractObjectPropertyValue(optionsLiteral, 'pathOptions');

  if (pathOptionsLiteral === undefined) {
    return undefined;
  }

  try {
    return new Function(
      `"use strict"; return (${pathOptionsLiteral});`,
    )() as DefineRoutesOptions['pathOptions'];
  } catch (error) {
    throw new Error(
      [
        `Route file "${path}" uses pathOptions that the CLI cannot statically evaluate.`,
        'Use a static object literal for defineRoutes pathOptions.',
      ].join(' '),
      { cause: error },
    );
  }
}

function extractPathConstraints(
  path: string,
  contents: string,
  optionsLiteral: string,
): RouterPathConstraints | undefined {
  const pathConstraintsLiteral = extractObjectPropertyValue(optionsLiteral, 'pathConstraints');

  if (pathConstraintsLiteral === undefined) {
    return undefined;
  }

  const trimmed = pathConstraintsLiteral.trim();
  const constraintsObject = trimmed.startsWith('{')
    ? trimmed
    : findStaticObjectDeclaration(contents, trimmed);

  if (constraintsObject === undefined) {
    throw new Error(
      [
        `Route file "${path}" uses pathConstraints that the CLI cannot statically evaluate.`,
        'Supported forms are defineRoutes(routes, { pathConstraints: constraints })',
        'with a static object declaration and',
        'defineRoutes(routes, { pathConstraints: { slug: createConstraint(...) } }).',
      ].join(' '),
    );
  }

  return createCliPathConstraints(extractConstraintNames(path, constraintsObject));
}

function createCliPathConstraints(names: readonly string[]): RouterPathConstraints {
  const constraints: Record<string, ReturnType<typeof createConstraint>> = {};

  for (const name of names) {
    constraints[name] = createConstraint({
      parse: (paramName: string, value: unknown) => {
        if (typeof value !== 'string') {
          throw new Error(`Parameter "${paramName}" must be a string.`);
        }
      },
      verify: () => undefined,
      toRegExp: () => '[^/]+',
    });
  }

  return constraints;
}

function extractConstraintNames(path: string, objectLiteral: string): readonly string[] {
  const names: string[] = [];
  let index = skipTrivia(objectLiteral, 1);

  while (index < objectLiteral.length) {
    index = skipTrivia(objectLiteral, index);

    if (objectLiteral[index] === '}') {
      return names;
    }

    const key = readObjectPropertyKey(objectLiteral, index);

    if (!key) {
      throw new Error(
        [
          `Route file "${path}" has a pathConstraints object the CLI cannot statically evaluate.`,
          'Constraint entries must use static property names.',
        ].join(' '),
      );
    }

    names.push(key.name);
    index = skipTrivia(objectLiteral, key.end);

    if (objectLiteral[index] === ':') {
      index = readPropertyValue(objectLiteral, skipTrivia(objectLiteral, index + 1));
    }

    index = skipTrivia(objectLiteral, index);

    if (objectLiteral[index] === ',') {
      index += 1;
      continue;
    }

    if (objectLiteral[index] === '}') {
      return names;
    }
  }

  throw new Error(`Route file "${path}" contains an unterminated pathConstraints object.`);
}

function extractObjectPropertyValue(source: string, propertyName: string): string | undefined {
  let index = 0;

  while (index < source.length) {
    const char = source[index];

    if (!char) {
      return undefined;
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

    const key = readObjectPropertyKey(source, index);

    if (!key) {
      index += 1;
      continue;
    }

    const colonIndex = skipWhitespace(source, key.end);

    if (key.name === propertyName && source[colonIndex] === ':') {
      const valueStart = skipWhitespace(source, colonIndex + 1);
      const valueEnd = readPropertyValue(source, valueStart);
      return source.slice(valueStart, valueEnd);
    }

    index = key.end;
  }

  return undefined;
}

function readObjectPropertyKey(
  source: string,
  start: number,
): { readonly name: string; readonly end: number } | undefined {
  const char = source[start];

  if (!char) {
    return undefined;
  }

  if (isIdentifierStart(char)) {
    const end = readIdentifier(source, start);
    return { name: source.slice(start, end), end };
  }

  if (char === '"' || char === "'") {
    const end = readQuoted(source, start);
    return { name: source.slice(start + 1, end - 1), end };
  }

  return undefined;
}

function findStaticObjectDeclaration(contents: string, identifier: string): string | undefined {
  if (!/^[A-Za-z_$][\w$]*$/.test(identifier)) {
    return undefined;
  }

  const declaration = new RegExp(
    `(?:export\\s+)?(?:const|let|var)\\s+${escapeRegExp(identifier)}\\s*=`,
  ).exec(contents);

  if (declaration?.index === undefined) {
    return undefined;
  }

  const objectStart = skipWhitespace(contents, declaration.index + declaration[0].length);

  if (contents[objectStart] !== '{') {
    return undefined;
  }

  return extractBalancedObject(identifier, contents, objectStart);
}

function extractBalancedObject(label: string, contents: string, start: number): string {
  return extractBalancedDelimited(label, contents, start, '{', '}');
}

function readIdentifierExpression(source: string, start: number): number {
  const char = source[start];

  if (!char || !isIdentifierStart(char)) {
    return start;
  }

  return readIdentifier(source, start);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractBalancedDelimited(
  label: string,
  contents: string,
  start: number,
  open: string,
  close: string,
): string {
  let depth = 0;
  let quote: '"' | "'" | '`' | undefined;
  let escaped = false;

  for (let index = start; index < contents.length; index++) {
    const char = contents[index];

    if (!char) {
      continue;
    }

    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === '\\') {
        escaped = true;
        continue;
      }

      if (char === quote) {
        quote = undefined;
      }

      continue;
    }

    if (char === '"' || char === "'" || char === '`') {
      quote = char;
      continue;
    }

    if (char === open) {
      depth += 1;
      continue;
    }

    if (char === close) {
      depth -= 1;

      if (!depth) {
        return contents.slice(start, index + 1);
      }
    }
  }

  throw new Error(`Route file "${label}" contains an unterminated static object.`);
}

function extractBalancedArray(path: string, contents: string, start: number): string {
  let depth = 0;
  let quote: '"' | "'" | '`' | undefined;
  let escaped = false;

  for (let index = start; index < contents.length; index++) {
    const char = contents[index];

    if (!char) {
      continue;
    }

    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === '\\') {
        escaped = true;
        continue;
      }

      if (char === quote) {
        quote = undefined;
      }

      continue;
    }

    if (char === '"' || char === "'" || char === '`') {
      quote = char;
      continue;
    }

    if (char === '[') {
      depth += 1;
      continue;
    }

    if (char === ']') {
      depth -= 1;

      if (!depth) {
        return contents.slice(start, index + 1);
      }
    }
  }

  throw new Error(`Route file "${path}" contains an unterminated routes array.`);
}

function assertNoUnsupportedRuntimeUrlKitBuilders(path: string, routesLiteral: string): void {
  const runtimeBuilderPattern =
    /\b(?:string|number|int|boolean|date|dateTime|enumOf)\s*\(\s*\)(?:\s*\.\s*(?:optional|required|default)\s*\([^)]*\))*|\benumOf\s*\(/;

  if (!runtimeBuilderPattern.test(routesLiteral)) {
    return;
  }

  throw new Error(
    [
      `Route file "${path}" uses URLKit runtime builders in a static route declaration.`,
      "The CLI only supports static URL descriptors such as { value: 'int', default: 1 } for search and hash generation.",
      'Move runtime URL builders out of CLI-consumed route files or replace them with static descriptors.',
    ].join(' '),
  );
}

function sanitizeRoutesLiteral(source: string): string {
  return sanitizeRouteSlotShorthand(
    replaceStaticRouteProperties(source, {
      beforeEnter: 'undefined',
      afterEnter: 'undefined',
      beforeLeave: 'undefined',
      onError: 'undefined',
      beforeNavigate: 'undefined',
      afterNavigate: 'undefined',
      onNavigationError: 'undefined',
      component: '__cookbookRouteComponent',
      element: '__cookbookRouteComponent',
      loading: '__cookbookRouteComponent',
      error: '__cookbookRouteComponent',
      middleware: '[]',
    }),
  );
}

function sanitizeRouteSlotShorthand(source: string): string {
  let output = '';
  let index = 0;

  while (index < source.length) {
    const char = source[index];

    if (!char) {
      break;
    }

    if (isQuote(char)) {
      const end = readQuoted(source, index);
      output += source.slice(index, end);
      index = end;
      continue;
    }

    if (startsLineComment(source, index)) {
      const end = readLineComment(source, index);
      output += source.slice(index, end);
      index = end;
      continue;
    }

    if (startsBlockComment(source, index)) {
      const end = readBlockComment(source, index);
      output += source.slice(index, end);
      index = end;
      continue;
    }

    const key = readObjectPropertyKey(source, index);

    if (!key || key.name !== 'slots') {
      output += char;
      index += 1;
      continue;
    }

    const colonIndex = skipWhitespace(source, key.end);

    if (source[colonIndex] !== ':') {
      output += source.slice(index, key.end);
      index = key.end;
      continue;
    }

    const valueStart = skipWhitespace(source, colonIndex + 1);

    if (source[valueStart] !== '{') {
      output += source.slice(index, valueStart);
      output += '{}';
      index = readPropertyValue(source, valueStart);
      continue;
    }

    const valueEnd = readPropertyValue(source, valueStart);
    output += source.slice(index, valueStart);
    output += sanitizeSlotDefinitionsObject(source.slice(valueStart, valueEnd));
    index = valueEnd;
  }

  return output;
}

function sanitizeSlotDefinitionsObject(source: string): string {
  let output = source[0] ?? '';
  let index = 1;

  while (index < source.length) {
    const char = source[index];

    if (!char) {
      break;
    }

    if (isQuote(char)) {
      const end = readQuoted(source, index);
      output += source.slice(index, end);
      index = end;
      continue;
    }

    if (startsLineComment(source, index)) {
      const end = readLineComment(source, index);
      output += source.slice(index, end);
      index = end;
      continue;
    }

    if (startsBlockComment(source, index)) {
      const end = readBlockComment(source, index);
      output += source.slice(index, end);
      index = end;
      continue;
    }

    if (char === '}') {
      output += char;
      index += 1;
      continue;
    }

    const key = readObjectPropertyKey(source, index);

    if (!key) {
      output += char;
      index += 1;
      continue;
    }

    const colonIndex = skipWhitespace(source, key.end);

    if (source[colonIndex] !== ':') {
      output += source.slice(index, key.end);
      index = key.end;
      continue;
    }

    const valueStart = skipWhitespace(source, colonIndex + 1);
    const valueEnd = readPropertyValue(source, valueStart);
    const rawValue = source.slice(valueStart, valueEnd);
    const trimmedValue = rawValue.trim();

    output += source.slice(index, valueStart);
    output += shouldPreserveStaticSlotValue(trimmedValue) ? rawValue : '__cookbookRouteComponent';
    index = valueEnd;
  }

  return output;
}

function shouldPreserveStaticSlotValue(value: string): boolean {
  return (
    value === 'true' ||
    value === 'false' ||
    value === 'null' ||
    value.startsWith('{') ||
    value.startsWith('[') ||
    value.startsWith('"') ||
    value.startsWith("'") ||
    value.startsWith('`')
  );
}

function replaceStaticRouteProperties(
  source: string,
  replacements: Record<string, string>,
): string {
  let output = '';
  let index = 0;

  while (index < source.length) {
    const char = source[index];

    if (!char) {
      break;
    }

    if (isQuote(char)) {
      const end = readQuoted(source, index);
      output += source.slice(index, end);
      index = end;
      continue;
    }

    if (startsLineComment(source, index)) {
      const end = readLineComment(source, index);
      output += source.slice(index, end);
      index = end;
      continue;
    }

    if (startsBlockComment(source, index)) {
      const end = readBlockComment(source, index);
      output += source.slice(index, end);
      index = end;
      continue;
    }

    if (!isIdentifierStart(char)) {
      output += char;
      index += 1;
      continue;
    }

    const keyStart = index;
    const keyEnd = readIdentifier(source, keyStart);
    const key = source.slice(keyStart, keyEnd);
    const colonIndex = skipWhitespace(source, keyEnd);
    const replacement = replacements[key];

    if (replacement === undefined || source[colonIndex] !== ':') {
      output += source.slice(keyStart, keyEnd);
      index = keyEnd;
      continue;
    }

    const valueStart = skipWhitespace(source, colonIndex + 1);
    const valueEnd = readPropertyValue(source, valueStart);
    output += source.slice(keyStart, valueStart);
    output += replacement;
    index = valueEnd;
  }

  return output;
}

function readPropertyValue(source: string, start: number): number {
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
      if (squareDepth === 0 && braceDepth === 0 && parenDepth === 0) {
        return index;
      }

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
      if (squareDepth === 0 && braceDepth === 0 && parenDepth === 0) {
        return index;
      }

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

    if (char === ',' && squareDepth === 0 && braceDepth === 0 && parenDepth === 0) {
      return index;
    }

    index += 1;
  }

  return index;
}

function readQuoted(source: string, start: number): number {
  const quote = source[start];
  let index = start + 1;
  let escaped = false;

  while (index < source.length) {
    const char = source[index];

    if (!char) {
      return index;
    }

    if (escaped) {
      escaped = false;
      index += 1;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      index += 1;
      continue;
    }

    if (char === quote) {
      return index + 1;
    }

    index += 1;
  }

  return index;
}

function readLineComment(source: string, start: number): number {
  const end = source.indexOf('\n', start + 2);
  return end === -1 ? source.length : end;
}

function readBlockComment(source: string, start: number): number {
  const end = source.indexOf('*/', start + 2);
  return end === -1 ? source.length : end + 2;
}

function readIdentifier(source: string, start: number): number {
  let index = start + 1;

  while (index < source.length && isIdentifierPart(source[index] ?? '')) {
    index += 1;
  }

  return index;
}

function skipWhitespace(source: string, start: number): number {
  let index = start;

  while (index < source.length && /\s/.test(source[index] ?? '')) {
    index += 1;
  }

  return index;
}

function skipTrivia(source: string, start: number): number {
  let index = skipWhitespace(source, start);

  while (index < source.length) {
    if (startsLineComment(source, index)) {
      index = skipWhitespace(source, readLineComment(source, index));
      continue;
    }

    if (startsBlockComment(source, index)) {
      index = skipWhitespace(source, readBlockComment(source, index));
      continue;
    }

    return index;
  }

  return index;
}

function isQuote(char: string): boolean {
  return char === '"' || char === "'" || char === '`';
}

function isIdentifierStart(char: string): boolean {
  return /[A-Za-z_$]/.test(char);
}

function isIdentifierPart(char: string): boolean {
  return /[\w$]/.test(char);
}

function startsLineComment(source: string, index: number): boolean {
  return source[index] === '/' && source[index + 1] === '/';
}

function startsBlockComment(source: string, index: number): boolean {
  return source[index] === '/' && source[index + 1] === '*';
}

function assertRouteFile(path: string, value: unknown): RouteFile {
  if (!isRouteFile(value)) {
    throw new Error(`Route file "${path}" must provide a routes array.`);
  }

  return value;
}

function isRouteFile(value: unknown): value is RouteFile {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as { routes?: unknown }).routes)
  );
}
