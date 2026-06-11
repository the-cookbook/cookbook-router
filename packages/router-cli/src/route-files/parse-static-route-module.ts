import type { RouteFile } from '../contracts';
import { evaluateStaticRouteModule } from './evaluate-static-route-module';
import { extractRouteModuleLiterals } from './extract-define-routes-call';
import { extractRouteOptions } from './extract-route-options';
import { assertRouteFile } from './route-file-assertions';
import {
  assertNoUnsupportedRuntimeUrlKitBuilders,
  sanitizeRoutesLiteral,
} from './sanitize-route-module';

export function parseStaticRouteModule(path: string, contents: string): RouteFile {
  const literals = extractRouteModuleLiterals(path, contents);
  assertNoUnsupportedRuntimeUrlKitBuilders(path, literals.routesLiteral);
  const routes = evaluateStaticRouteModule(path, sanitizeRoutesLiteral(literals.routesLiteral));
  const routeOptions = extractRouteOptions(path, contents, literals.optionsLiteral);

  return assertRouteFile(path, {
    routes,
    ...(routeOptions === undefined ? {} : { routeOptions }),
  });
}
