import { extractDefineRoutesOptionsLiteral } from './extract-route-options';
import { extractBalancedArray } from './static-source-scanner';

export interface ExtractedRouteModuleLiterals {
  readonly routesLiteral: string;
  readonly optionsLiteral?: string;
}

export function extractRouteModuleLiterals(
  path: string,
  contents: string,
): ExtractedRouteModuleLiterals {
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
