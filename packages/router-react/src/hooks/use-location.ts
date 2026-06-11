import type { RouterLocation } from '@cookbook/router';
import { useRouterContext } from '../provider/router-context';

/**
 * Subscribes to and returns the current router location. Parsed route URL state
 * is available through `useParams`, `useSearchParams`, `useHashParams`, and
 * `useMatches`.
 */
export function useLocation(): RouterLocation {
  return useRouterContext().state.location;
}
