import { extractDefineRoutesOptionsLiteral } from './extract-route-options';
import { extractNamedExportMap, resolveRouteExportNames } from './extract-define-route-calls';
import { extractBalancedArray, skipTrivia } from './static-source-scanner';

export interface ExtractedRouteModuleLiterals {
  readonly routesLiteral: string;
  /** Internal parser metadata. Kept non-enumerable so public extractor tests only see the documented literal fields. */
  readonly kind: 'defineRoutes' | 'staticArray';
  readonly optionsLiteral?: string;
  readonly exportName?: string;
}

export function extractRouteModuleLiterals(
  path: string,
  contents: string,
): ExtractedRouteModuleLiterals {
  const namedExports = extractNamedExportMap(contents);
  const defineRoutesCall =
    /(?:(export)\s+)?const\s+([A-Za-z_$][\w$]*)(?:\s*:\s*[^=]+)?\s*=\s*defineRoutes\s*\(/g;
  let defineRoutesMatch: RegExpExecArray | null;

  while ((defineRoutesMatch = defineRoutesCall.exec(contents)) !== null) {
    const localName = defineRoutesMatch[2] ?? 'routes';
    const exportNames = resolveRouteExportNames({
      localName,
      directExport: defineRoutesMatch[1] === 'export',
      exportedOnly: true,
      namedExports,
    });

    if (!exportNames[0]) {
      continue;
    }

    const callStart = defineRoutesMatch.index + defineRoutesMatch[0].length;
    const arrayStart = contents.indexOf('[', callStart);

    if (arrayStart >= 0) {
      const routesLiteral = extractBalancedArray(path, contents, arrayStart);
      const optionsLiteral = extractDefineRoutesOptionsLiteral(
        contents,
        arrayStart + routesLiteral.length,
      );

      return withInternalKind(
        {
          routesLiteral,
          exportName: exportNames[0],
          ...(optionsLiteral === undefined ? {} : { optionsLiteral }),
        },
        'defineRoutes',
      );
    }
  }

  const routesAssignment = /(?:(export)\s+)?const\s+([A-Za-z_$][\w$]*)(?:\s*:\s*[^=]+)?\s*=/g;
  let routesAssignmentMatch: RegExpExecArray | null;

  while ((routesAssignmentMatch = routesAssignment.exec(contents)) !== null) {
    const localName = routesAssignmentMatch[2] ?? 'routes';
    const exportNames = resolveRouteExportNames({
      localName,
      directExport: routesAssignmentMatch[1] === 'export',
      exportedOnly: true,
      namedExports,
    });

    if (!exportNames[0]) {
      continue;
    }

    if (localName !== 'routes' && !exportNames.includes('routes')) {
      continue;
    }

    const valueStart = skipTrivia(
      contents,
      routesAssignmentMatch.index + routesAssignmentMatch[0].length,
    );

    if (contents[valueStart] !== '[') {
      continue;
    }

    return withInternalKind(
      {
        routesLiteral: extractBalancedArray(path, contents, valueStart),
        exportName: exportNames[0],
      },
      'staticArray',
    );
  }

  throw new Error(
    `Route file "${path}" must export routes from defineRoutes([...]), defineRouteTree({ routes: [...] }), defineRoute({...}), or a static routes array.`,
  );
}

function withInternalKind<T extends Omit<ExtractedRouteModuleLiterals, 'kind'>>(
  literal: T,
  kind: ExtractedRouteModuleLiterals['kind'],
): ExtractedRouteModuleLiterals {
  const literalWithKind = literal as T & Pick<ExtractedRouteModuleLiterals, 'kind'>;

  Object.defineProperty(literalWithKind, 'kind', {
    value: kind,
    enumerable: false,
    configurable: false,
    writable: false,
  });

  return literalWithKind;
}
