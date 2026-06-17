import { describe, expect, expectTypeOf, it } from 'vitest';
import type {
  BlockerState,
  OutletContextOptions,
  UseBlockerOptions,
  UseRouteMetaOptions,
} from './index';

describe('hooks entrypoint', () => {
  it('exports the complete public hook surface without unrelated values', async () => {
    const module = await import('./index');

    expect(Object.keys(module).sort()).toEqual([
      'useBlocker',
      'useHashParams',
      'useHref',
      'useLocation',
      'useMatches',
      'useNavigate',
      'useNavigation',
      'useOutletContext',
      'useParams',
      'useRouteMeta',
      'useRouter',
      'useSearchParams',
      'useUnknownSearchParams',
    ]);
  });

  it('exports every public hook option and state type', () => {
    expectTypeOf<BlockerState>().toEqualTypeOf<{ readonly blocked: boolean }>();
    expectTypeOf<UseBlockerOptions>().toEqualTypeOf<{
      readonly when: boolean;
      readonly message?: string;
    }>();
    expectTypeOf<OutletContextOptions>().toEqualTypeOf<{ readonly strict?: boolean }>();
    expectTypeOf<UseRouteMetaOptions>().toHaveProperty('includeAncestors');
    expectTypeOf<UseRouteMetaOptions>().toHaveProperty('merge');
  });
});
