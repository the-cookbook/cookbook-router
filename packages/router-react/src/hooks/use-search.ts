import { useMemo } from 'react';
import { useRouterContext } from '../context/router-context';
import type { RouteId, RouteSearch } from '@cookbook/router';

export function useSearch<Route extends RouteId>(routeId: Route): RouteSearch<Route>;
export function useSearch(): RouteSearch<RouteId>;
export function useSearch<Route extends RouteId>(
  _routeId?: Route,
): RouteSearch<Route> | RouteSearch<RouteId> {
  const search = useRouterContext().state.location.search;
  return useMemo(() => parseSearch(search) as RouteSearch<Route>, [search]);
}

function parseSearch(search: string): Record<string, string | readonly string[]> {
  const params = new URLSearchParams(search);
  const values: Record<string, string | string[]> = {};

  for (const [key, value] of params) {
    const existing = values[key];

    if (existing === undefined) {
      values[key] = value;
      continue;
    }

    if (Array.isArray(existing)) {
      existing.push(value);
      continue;
    }

    values[key] = [existing, value];
  }

  return values;
}
