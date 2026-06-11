import type { MatchedRoute } from '@cookbook/router';
import { useRouterContext } from '../provider/router-context';

/**
 * Subscribes to the active matched branch.
 *
 * Returned params are URLKit-parsed values for each branch entry. Built-in
 * numeric constraints such as `{id:int}` are exposed as numbers.
 */
export function useMatches(): readonly MatchedRoute[] {
  return useRouterContext().state.match?.branch ?? [];
}
