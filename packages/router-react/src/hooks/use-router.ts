import type { Router } from '@cookbook/router';
import { useRouterContext } from '../context/router-context';

/** Returns the router instance from context. */
export function useRouter(): Router {
  return useRouterContext().router;
}
