import type { MatchedRoute } from '@cookbook/router';
import { useRouterContext } from '../context/router-context';

export function useMatches(): readonly MatchedRoute[] {
  return useRouterContext().state.match?.branch ?? [];
}
