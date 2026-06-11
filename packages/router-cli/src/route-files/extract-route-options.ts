import {
  createConstraint,
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
      'and defineRoutes(routes, { pathConstraints: { slug: createConstraint(...) } }).',
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

export function extractPathOptions(
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

export function extractPathConstraints(
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

export function createCliPathConstraints(names: readonly string[]): RouterPathConstraints {
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

export function findStaticObjectDeclaration(
  contents: string,
  identifier: string,
): string | undefined {
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
