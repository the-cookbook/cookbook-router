import type { RouterNavigationState } from '@cookbook/router';
import { useRouterContext } from '../context/router-context';

export function useNavigation(): RouterNavigationState {
  return useRouterContext().state.navigation;
}
