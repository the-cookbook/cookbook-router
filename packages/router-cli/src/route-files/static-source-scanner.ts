export function readObjectPropertyKey(
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

export function extractBalancedObject(label: string, contents: string, start: number): string {
  return extractBalancedDelimited(label, contents, start, '{', '}');
}

export function readIdentifierExpression(source: string, start: number): number {
  const char = source[start];

  if (!char || !isIdentifierStart(char)) {
    return start;
  }

  return readIdentifier(source, start);
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function extractBalancedDelimited(
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

export function extractBalancedArray(path: string, contents: string, start: number): string {
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

export function readPropertyValue(source: string, start: number): number {
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

export function readQuoted(source: string, start: number): number {
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

export function readLineComment(source: string, start: number): number {
  const end = source.indexOf('\n', start + 2);
  return end === -1 ? source.length : end;
}

export function readBlockComment(source: string, start: number): number {
  const end = source.indexOf('*/', start + 2);
  return end === -1 ? source.length : end + 2;
}

export function readIdentifier(source: string, start: number): number {
  const char = source[start];

  if (!char || !isIdentifierStart(char)) {
    return start;
  }

  let index = start + 1;

  while (index < source.length && isIdentifierPart(source[index] ?? '')) {
    index += 1;
  }

  return index;
}

export function skipWhitespace(source: string, start: number): number {
  let index = start;

  while (index < source.length && /\s/.test(source[index] ?? '')) {
    index += 1;
  }

  return index;
}

export function skipTrivia(source: string, start: number): number {
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

export function isQuote(char: string): boolean {
  return char === '"' || char === "'" || char === '`';
}

export function isIdentifierStart(char: string): boolean {
  return /[A-Za-z_$]/.test(char);
}

export function isIdentifierPart(char: string): boolean {
  return /[\w$]/.test(char);
}

export function startsLineComment(source: string, index: number): boolean {
  return source[index] === '/' && source[index + 1] === '/';
}

export function startsBlockComment(source: string, index: number): boolean {
  return source[index] === '/' && source[index + 1] === '*';
}
