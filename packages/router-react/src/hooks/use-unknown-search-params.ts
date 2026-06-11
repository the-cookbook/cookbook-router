import type { RouterUnknownSearchParams } from '@cookbook/router';
import { useRouterContext } from '../provider/router-context';

/**
 * Returns undeclared query-string values preserved by URLKit.
 *
 * This hook only returns values when the active route was resolved with
 * `unknownSearch: 'preserve'`. Declared, typed search values remain available
 * through `useSearchParams()`.
 */
export function useUnknownSearchParams(): RouterUnknownSearchParams {
  return useRouterContext().state.match?.unknownSearch ?? {};
}
