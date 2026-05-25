import { extname } from 'node:path';
import { validateRoutes } from '@cookbook/router';
import type { CliFileSystem, CliRouteSource, LoadRouteFilesOptions, RouteFile } from '../contracts';
import { assertSafeRouteFilePaths } from '../security/safe-paths';
import { nodeFileSystem } from '../node-file-system';

const defaultFs: CliFileSystem = nodeFileSystem;

export async function loadRouteFiles(
  options: LoadRouteFilesOptions,
): Promise<readonly CliRouteSource[]> {
  assertSafeRouteFilePaths(options.routeFiles);
  const fs = options.fs ?? defaultFs;
  const sources: CliRouteSource[] = [];

  for (const path of options.routeFiles) {
    const parsed = await loadRouteFile(path, fs);
    validateRoutes(parsed.routes);
    sources.push({ path, routes: parsed.routes });
  }

  return sources;
}

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
  const routesLiteral = extractRoutesLiteral(path, contents);
  const sanitized = sanitizeRoutesLiteral(routesLiteral);

  try {
    const routes = new Function(
      `"use strict"; const __cookbookRouteComponent = () => null; return (${sanitized});`,
    )() as unknown;
    return assertRouteFile(path, { routes });
  } catch (error) {
    throw new Error(`Route file "${path}" could not be evaluated as a static route declaration.`, {
      cause: error,
    });
  }
}

function extractRoutesLiteral(path: string, contents: string): string {
  const defineRoutesCall = /\bdefineRoutes\s*\(/g;
  let defineRoutesMatch: RegExpExecArray | null;

  while ((defineRoutesMatch = defineRoutesCall.exec(contents)) !== null) {
    const callStart = defineRoutesMatch.index + defineRoutesMatch[0].length;
    const arrayStart = contents.indexOf('[', callStart);

    if (arrayStart >= 0) {
      return extractBalancedArray(path, contents, arrayStart);
    }
  }

  const routesAssignment = /(?:export\s+)?const\s+routes\s*=/.exec(contents);

  if (routesAssignment?.index !== undefined) {
    const arrayStart = contents.indexOf('[', routesAssignment.index);

    if (arrayStart >= 0) {
      return extractBalancedArray(path, contents, arrayStart);
    }
  }

  throw new Error(
    `Route file "${path}" must export routes from defineRoutes([...]) or a static routes array.`,
  );
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

function sanitizeRoutesLiteral(source: string): string {
  return replaceStaticRouteProperties(source, {
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
    errorFallback: '__cookbookRouteComponent',
    notFound: '__cookbookRouteComponent',
    middleware: '[]',
  });
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
