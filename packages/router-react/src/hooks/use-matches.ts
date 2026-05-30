import type { MatchedRoute } from '@cookbook/router';
import { useRouterContext } from '../context/router-context';

/**
 * Subscribes to the active matched branch.
 *
 * Returned params are raw string params for each branch entry. Use `useParams`
 * when you want generated contract-aware params.
 */
export function useMatches(): readonly MatchedRoute[] {
  return useRouterContext().state.match?.branch ?? [];
}
