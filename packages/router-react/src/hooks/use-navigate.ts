import type { Router } from '@cookbook/router';
import { useRouter } from './use-router';

export function useNavigate(): Router['navigate'] {
  return useRouter().navigate;
}
