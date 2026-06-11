import {
  isIdentifierStart,
  isQuote,
  readBlockComment,
  readIdentifier,
  readLineComment,
  readObjectPropertyKey,
  readPropertyValue,
  readQuoted,
  skipWhitespace,
  startsBlockComment,
  startsLineComment,
} from './static-source-scanner';

export function assertNoUnsupportedRuntimeUrlKitBuilders(
  path: string,
  routesLiteral: string,
): void {
  const runtimeBuilderPattern = /\b(?:string|number|int|boolean|date|dateTime)\s*\(|\benumOf\s*\(/;

  if (!runtimeBuilderPattern.test(routesLiteral)) {
    return;
  }

  throw new Error(
    [
      `Route file "${path}" uses URLKit runtime builders in a static route declaration.`,
      "The CLI only supports cleaned static URL descriptors such as { type: 'int', default: 1 }, { type: 'string', many: true }, and object hash descriptors for generation.",
      'Move runtime URL builders out of CLI-consumed route files or replace them with static descriptors.',
    ].join(' '),
  );
}

export function sanitizeRoutesLiteral(source: string): string {
  return sanitizeRouteSlotShorthand(
    replaceStaticRouteProperties(source, {
      beforeEnter: 'undefined',
      afterEnter: 'undefined',
      beforeLeave: 'undefined',
      onError: 'undefined',
      beforeNavigate: 'undefined',
      afterNavigate: 'undefined',
      onNavigationError: 'undefined',
      view: '__cookbookRouteView',
      loading: '__cookbookRouteView',
      error: '__cookbookRouteView',
      middleware: '[]',
    }),
  );
}

export function sanitizeRouteSlotShorthand(source: string): string {
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

export function sanitizeSlotDefinitionsObject(source: string): string {
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
    output += shouldPreserveStaticSlotValue(trimmedValue) ? rawValue : '__cookbookRouteView';
    index = valueEnd;
  }

  return output;
}

export function shouldPreserveStaticSlotValue(value: string): boolean {
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

function trimTrailingWhitespace(source: string, start: number, end: number): number {
  let index = end;

  while (index > start && /\s/.test(source[index - 1] ?? '')) {
    index -= 1;
  }

  return index;
}

export function replaceStaticRouteProperties(
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
    const replacementEnd = trimTrailingWhitespace(source, valueStart, valueEnd);
    output += source.slice(keyStart, valueStart);
    output += replacement;
    output += source.slice(replacementEnd, valueEnd);
    index = valueEnd;
  }

  return output;
}
