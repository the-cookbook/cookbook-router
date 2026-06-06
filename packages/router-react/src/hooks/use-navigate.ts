import type { Router } from '@cookbook/router';
import { useRouter } from './use-router';

/**
 * Returns the router's programmatic navigation API.
 *
 * The returned methods push, replace, or move through history and use generated
 * contracts for params/search/hash when available. Navigation options may include
 * `url` overrides such as `arrayFormat` and `defaults` for this navigation.
 */
export function useNavigate(): Router['navigate'] {
  return useRouter().navigate;
}
