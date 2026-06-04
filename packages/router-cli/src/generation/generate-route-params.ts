import type { RouteParamDefinition } from '@cookbook/router';
import { quoteProperty, renderObject } from './render-types';

/** Renders generated path param contracts using URLKit parsed-param semantics. */
export function renderRouteParams(params: readonly RouteParamDefinition[]): string {
  const entries = params.map((param) => `${quoteProperty(param.name)}: ${renderParamType(param)}`);
  return renderObject(entries);
}

/** Maps a PathKit/URLKit path constraint name to its generated parsed value type. */
export function renderParamType(param: RouteParamDefinition): string {
  if (param.constraint === 'int' || param.constraint === 'number') {
    return 'number';
  }

  return 'string';
}
