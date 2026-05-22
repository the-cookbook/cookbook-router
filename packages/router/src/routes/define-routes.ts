import { validateRoutes } from '../validation/validate-routes';
import type { RouteDefinition } from './contracts';

export function defineRoutes<const Routes extends readonly RouteDefinition[]>(
  routes: Routes,
): Routes {
  validateRoutes(routes);
  return routes;
}
