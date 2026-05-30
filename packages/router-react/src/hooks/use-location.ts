import type { RouterLocation } from '@cookbook/router';
import { useRouterContext } from '../context/router-context';

/**
 * Subscribes to and returns the current router location.
 */
export function useLocation(): RouterLocation {
  return useRouterContext().state.location;
}
