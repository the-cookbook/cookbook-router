import type { RouterNavigationState } from '@cookbook/router';
import { useRouterContext } from '../context/router-context';

/**
 * Subscribes to the current navigation state such as idle, pending, blocked,
 * redirecting, or error.
 */
export function useNavigation(): RouterNavigationState {
  return useRouterContext().state.navigation;
}
