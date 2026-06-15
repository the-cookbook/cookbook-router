import type { RouteParamDefinition } from '@cookbook/router';
import { quoteProperty, renderObject } from './render-types';

const NUMERIC_PATH_CONSTRAINTS = new Set(['int', 'decimal', 'range', 'min', 'max']);

/** Renders generated parsed path param contracts using URLKit parsed-param semantics. */
export function renderRouteParams(params: readonly RouteParamDefinition[]): string {
  const entries = params.map((param) => {
    const optional = param.optional ? '?' : '';
    return `${quoteProperty(param.name)}${optional}: ${renderParamType(param)}`;
  });
  return renderObject(entries);
}

/** Renders generated path param input contracts used by href/navigation APIs. */
export function renderRouteParamsInput(params: readonly RouteParamDefinition[]): string {
  const entries = params.map((param) => {
    const optional = param.optional ? '?' : '';
    return `${quoteProperty(param.name)}${optional}: ${renderParamInputType(param)}`;
  });
  return renderObject(entries);
}

/** Maps a PathKit constraint chain to its generated parsed value type. */
export function renderParamType(param: RouteParamDefinition): string {
  if (param.wildcard) {
    return 'readonly string[]';
  }

  if (hasNumericPathConstraint(param.constraints)) {
    return 'number';
  }

  return 'string';
}

/** Maps a PathKit constraint chain to its generated href/navigation input type. */
export function renderParamInputType(param: RouteParamDefinition): string {
  if (param.wildcard) {
    return 'string | readonly string[]';
  }

  return renderParamType(param);
}

function hasNumericPathConstraint(constraints: readonly { readonly type: string }[]): boolean {
  return constraints.some((constraint) => NUMERIC_PATH_CONSTRAINTS.has(constraint.type));
}
