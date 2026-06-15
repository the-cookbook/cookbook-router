import {
  createPathConstraint,
  type DefineRoutesOptions,
  type RouterPathConstraints,
} from '@cookbook/router';
import {
  escapeRegExp,
  extractBalancedObject,
  isQuote,
  readBlockComment,
  readIdentifierExpression,
  readLineComment,
  readObjectPropertyKey,
  readPropertyValue,
  readQuoted,
  skipTrivia,
  skipWhitespace,
  startsBlockComment,
  startsLineComment,
} from './static-source-scanner';

export function extractDefineRoutesOptionsLiteral(
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
      'and defineRoutes(routes, { pathConstraints: { slug: createPathConstraint(...) } }).',
    ].join(' '),
  );
}

export function extractRouteOptions(
  path: string,
  contents: string,
  optionsLiteral: string | undefined,
): DefineRoutesOptions | undefined {
  if (optionsLiteral === undefined) {
    return undefined;
  }

  const pathOptions = extractPathOptions(path, optionsLiteral, contents);
  const pathConstraints = extractPathConstraints(path, contents, optionsLiteral);

  if (pathOptions === undefined && pathConstraints === undefined) {
    return undefined;
  }

  return {
    ...(pathOptions === undefined ? {} : { pathOptions }),
    ...(pathConstraints === undefined ? {} : { pathConstraints }),
  };
}

export function extractPathOptions(
  path: string,
  optionsLiteral: string,
  contents = '',
): DefineRoutesOptions['pathOptions'] {
  const pathOptionsLiteral = extractObjectPropertyValueOrShorthand(optionsLiteral, 'pathOptions');

  if (pathOptionsLiteral === undefined) {
    return undefined;
  }

  const pathOptionsObject = resolveStaticObjectValue(contents, pathOptionsLiteral);

  if (pathOptionsObject === undefined) {
    throw new Error(
      [
        `Route file "${path}" uses pathOptions that the CLI cannot statically evaluate.`,
        'Use an inline static object literal or a static object declaration for pathOptions.',
      ].join(' '),
    );
  }

  try {
    return new Function(
      `"use strict"; return (${stripTypeScriptConstAssertions(pathOptionsObject)});`,
    )() as DefineRoutesOptions['pathOptions'];
  } catch (error) {
    throw new Error(
      [
        `Route file "${path}" uses pathOptions that the CLI cannot statically evaluate.`,
        'Use an inline static object literal or a static object declaration for pathOptions.',
      ].join(' '),
      { cause: error },
    );
  }
}

export function extractPathConstraints(
  path: string,
  contents: string,
  optionsLiteral: string,
): RouterPathConstraints | undefined {
  const pathConstraintsLiteral = extractObjectPropertyValueOrShorthand(
    optionsLiteral,
    'pathConstraints',
  );

  if (pathConstraintsLiteral === undefined) {
    return undefined;
  }

  const constraintsObject = resolveStaticObjectValue(contents, pathConstraintsLiteral);

  if (constraintsObject === undefined) {
    throw new Error(
      [
        `Route file "${path}" uses pathConstraints that the CLI cannot statically evaluate.`,
        'Supported forms are defineRoutes(routes, { pathConstraints })',
        'with a static object declaration,',
        'defineRoutes(routes, { pathConstraints: constraints }), and',
        'defineRoutes(routes, { pathConstraints: { slug: createPathConstraint(...) } }).',
      ].join(' '),
    );
  }

  return createCliPathConstraints(extractConstraintNames(path, constraintsObject));
}

export function createCliPathConstraints(names: readonly string[]): RouterPathConstraints {
  const constraints: Record<string, ReturnType<typeof createPathConstraint>> = {};

  for (const name of names) {
    constraints[name] = createPathConstraint({
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

export function extractConstraintNames(path: string, objectLiteral: string): readonly string[] {
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

export function extractObjectPropertyValueOrShorthand(
  source: string,
  propertyName: string,
): string | undefined {
  const explicitValue = extractObjectPropertyValue(source, propertyName);

  if (explicitValue !== undefined) {
    return explicitValue;
  }

  let index = 0;

  while (index < source.length) {
    index = skipTrivia(source, index);
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

    const token = source.slice(index, index + propertyName.length);
    const before = index === 0 ? '' : (source[index - 1] ?? '');
    const afterIndex = index + propertyName.length;
    const after = source[afterIndex] ?? '';

    if (
      token === propertyName &&
      !/[\w$]/.test(before) &&
      !/[\w$]/.test(after) &&
      source[skipTrivia(source, afterIndex)] !== ':'
    ) {
      return propertyName;
    }

    index += 1;
  }

  return undefined;
}

export function extractObjectPropertyValue(
  source: string,
  propertyName: string,
): string | undefined {
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

export function resolveStaticObjectValue(
  contents: string,
  valueLiteral: string,
): string | undefined {
  const trimmed = stripTypeScriptConstAssertions(valueLiteral).trim();

  if (trimmed.startsWith('{')) {
    return trimmed;
  }

  return findStaticObjectDeclaration(contents, trimmed);
}

export function findStaticObjectDeclaration(
  contents: string,
  identifier: string,
): string | undefined {
  if (!/^[A-Za-z_$][\w$]*$/.test(identifier)) {
    return undefined;
  }

  const declaration = new RegExp(
    `(?:export\\s+)?(?:const|let|var)\\s+${escapeRegExp(identifier)}(?:\\s*:\\s*[^=]+)?\\s*=`,
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

function stripTypeScriptConstAssertions(source: string): string {
  return source.replace(/\s+as\s+const\b/g, '');
}
