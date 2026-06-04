import type { RouteDefinition } from '@cookbook/router';
import { quote } from './render-types';

/** Renders generated hash contracts from URLKit-compatible static descriptors. */
export function renderRouteHash(hash: RouteDefinition['hash']): string {
  if (!hash) {
    return 'never';
  }

  if (Array.isArray(hash)) {
    return hash[0] ? hash.map(quote).join(' | ') : 'never';
  }

  const descriptor = hash as unknown as Record<string, unknown>;

  if (descriptor.type === 'string') {
    return 'default' in descriptor || descriptor.optional !== true
      ? 'string'
      : 'string | undefined';
  }

  const values = Array.isArray(descriptor.values)
    ? descriptor.values.map((value) => quote(String(value))).join(' | ') || 'never'
    : 'never';
  return 'default' in descriptor || descriptor.optional !== true ? values : `${values} | undefined`;
}
