import {
  isQuote,
  readBlockComment,
  readLineComment,
  readQuoted,
  skipTrivia,
  startsBlockComment,
  startsLineComment,
} from './static-source-scanner';

export interface ExtractedStaticConstDeclaration {
  readonly exportName: string;
  readonly statement: string;
}

const unsupportedStaticConstCallPattern =
  /\b(?:defineRoute|defineRoutes|defineRouteTree|defineSearch|defineHash|mergeSearch|createPathConstraint)\s*\(/;
const unsupportedRuntimePattern = /(?:=>|\bfunction\b|\bclass\b|\bnew\s+)/;

/**
 * Extracts local static constants that route declarations can safely reference.
 *
 * This intentionally supports only data literals. Runtime declarations such as
 * views, middleware, constraints, URLKit builders, and route helper calls are
 * left out so unsupported dynamic references still fail during static
 * evaluation with an actionable diagnostic.
 */
export function extractStaticConstDeclarations(
  contents: string,
): readonly ExtractedStaticConstDeclaration[] {
  const declarations: ExtractedStaticConstDeclaration[] = [];
  const declarationPattern = /(?:export\s+)?const\s+([A-Za-z_$][\w$]*)(?:\s*:\s*[^=]+)?\s*=/g;
  let match: RegExpExecArray | null;

  while ((match = declarationPattern.exec(contents)) !== null) {
    const exportName = match[1] ?? '';

    if (!exportName || exportName === 'routes') {
      continue;
    }

    const valueStart = skipTrivia(contents, match.index + match[0].length);
    const valueEnd = readConstInitializer(contents, valueStart);
    const rawValue = contents.slice(valueStart, valueEnd).trim();
    const value = stripTypeScriptStaticSyntax(rawValue).trim();

    if (!isSupportedStaticConstValue(value)) {
      continue;
    }

    declarations.push({
      exportName,
      statement: `const ${exportName} = ${value};`,
    });
  }

  return declarations;
}

function isSupportedStaticConstValue(value: string): boolean {
  if (!value) {
    return false;
  }

  if (unsupportedStaticConstCallPattern.test(value) || unsupportedRuntimePattern.test(value)) {
    return false;
  }

  if (value.startsWith('`') && value.includes('${')) {
    return false;
  }

  if (value.startsWith('{') || value.startsWith('[')) {
    return true;
  }

  if (value.startsWith('"') || value.startsWith("'") || value.startsWith('`')) {
    return true;
  }

  if (/^(?:true|false|null|undefined)$/.test(value)) {
    return true;
  }

  return /^-?\d+(?:\.\d+)?(?:e[+-]?\d+)?$/i.test(value);
}

function readConstInitializer(source: string, start: number): number {
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
      if (parenDepth === 0 && squareDepth === 0 && braceDepth === 0) {
        return trimTrailingWhitespace(source, start, index);
      }

      parenDepth -= 1;
      index += 1;
      continue;
    }

    if (
      (char === ';' || char === ',') &&
      squareDepth === 0 &&
      braceDepth === 0 &&
      parenDepth === 0
    ) {
      return trimTrailingWhitespace(source, start, index);
    }

    if (char === '\n' && squareDepth === 0 && braceDepth === 0 && parenDepth === 0) {
      return trimTrailingWhitespace(source, start, index);
    }

    index += 1;
  }

  return trimTrailingWhitespace(source, start, index);
}

function trimTrailingWhitespace(source: string, start: number, end: number): number {
  let index = end;

  while (index > start && /\s/.test(source[index - 1] ?? '')) {
    index -= 1;
  }

  return index;
}

function stripTypeScriptStaticSyntax(source: string): string {
  let output = source.replace(/\s+as\s+const\b/g, '');

  output = output.replace(
    /\s+satisfies\s+[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)?(?:<[^>]+>)?\s*$/g,
    '',
  );

  return output;
}
