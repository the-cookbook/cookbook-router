import { extractObjectPropertyValue } from './extract-route-options';
import { extractNamedExportMap, resolveRouteExportNames } from './extract-define-route-calls';
import { extractBalancedArray, extractBalancedObject, skipTrivia } from './static-source-scanner';

export interface ExtractedDefineRouteTreeLiteral {
  readonly exportName: string;
  readonly localName: string;
  readonly treeLiteral: string;
  readonly routesLiteral: string;
}

export function extractDefineRouteTreeLiteral(
  path: string,
  contents: string,
): ExtractedDefineRouteTreeLiteral {
  const namedExports = extractNamedExportMap(contents);
  const defineRouteTreeCall =
    /(?:(export)\s+)?const\s+([A-Za-z_$][\w$]*)(?:\s*:\s*[^=]+)?\s*=\s*defineRouteTree\s*\(/g;
  let match: RegExpExecArray | null;

  while ((match = defineRouteTreeCall.exec(contents)) !== null) {
    const localName = match[2] ?? 'routes';
    const exportNames = resolveRouteExportNames({
      localName,
      directExport: match[1] === 'export',
      exportedOnly: true,
      namedExports,
    });

    if (!exportNames[0]) {
      continue;
    }

    const objectStart = skipTrivia(contents, match.index + match[0].length);

    if (contents[objectStart] !== '{') {
      throw new Error(
        `Route file "${path}" defineRouteTree() must receive a static object literal.`,
      );
    }

    const treeLiteral = extractBalancedObject(path, contents, objectStart);
    const routesLiteral = extractRoutesLiteral(path, treeLiteral);

    return {
      exportName: exportNames[0],
      localName,
      treeLiteral,
      routesLiteral,
    };
  }

  throw new Error(
    `Route file "${path}" must export routes from defineRoutes([...]), defineRouteTree({ routes: [...] }), defineRoute({...}), or a static routes array.`,
  );
}

function extractRoutesLiteral(path: string, treeLiteral: string): string {
  const routesValue = extractObjectPropertyValue(treeLiteral, 'routes');

  if (routesValue === undefined) {
    throw new Error(`Route file "${path}" defineRouteTree() must define a routes array.`);
  }

  const routesStart = skipTrivia(routesValue, 0);

  if (routesValue[routesStart] !== '[') {
    throw new Error(
      `Route file "${path}" defineRouteTree() routes must be an inline static array for CLI generation.`,
    );
  }

  return extractBalancedArray(path, routesValue, routesStart);
}
