import type { RouterLocation } from '@cookbook/router';
import { useRouterContext } from '../context/router-context';

export function useLocation(): RouterLocation {
  return useRouterContext().state.location;
}
