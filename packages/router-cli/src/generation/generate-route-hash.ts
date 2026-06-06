import type { RouteDefinition } from '@cookbook/router';
import { quote } from './render-types';

/** Renders generated hash contracts from URLKit v2 static descriptors. */
export function renderRouteHash(hash: RouteDefinition['hash']): string {
  if (!hash) {
    return 'never';
  }

  const descriptor = hash as unknown as Record<string, unknown>;

  if (descriptor.type === 'string') {
    return 'default' in descriptor || descriptor.optional !== true
      ? 'string'
      : 'string | undefined';
  }

  if (descriptor.type !== 'enum') {
    return 'never';
  }

  const values = Array.isArray(descriptor.values)
    ? descriptor.values.map((value) => quote(String(value))).join(' | ') || 'never'
    : 'never';

  return 'default' in descriptor || descriptor.optional !== true ? values : `${values} | undefined`;
}
