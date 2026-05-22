import type { Router } from '@cookbook/router';
import { useRouterContext } from '../context/router-context';

export function useRouter(): Router {
  return useRouterContext().router;
}
