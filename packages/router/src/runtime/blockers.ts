import type { RouterLocation } from '../history/memory-history';
import type { RouteMatch } from '../route-config/contracts';
import type { RouterBlocker } from './contracts';

export interface RunNavigationBlockersOptions {
  readonly blockers: ReadonlySet<RouterBlocker>;
  readonly from: RouteMatch | null;
  readonly to: RouteMatch | null;
  readonly location: RouterLocation;
}

export interface NavigationBlockerRegistry {
  readonly add: (blocker: RouterBlocker) => () => void;
  readonly run: (context: Omit<RunNavigationBlockersOptions, 'blockers'>) => Promise<boolean>;
}

export function createNavigationBlockerRegistry(): NavigationBlockerRegistry {
  const blockers = new Set<RouterBlocker>();

  return {
    add(blocker) {
      blockers.add(blocker);
      return () => blockers.delete(blocker);
    },
    run(context) {
      return runNavigationBlockers({ blockers, ...context });
    },
  };
}

export async function runNavigationBlockers(
  options: RunNavigationBlockersOptions,
): Promise<boolean> {
  for (const blocker of options.blockers) {
    const result = await blocker({
      from: options.from,
      to: options.to,
      location: options.location,
    });

    if (result === false) {
      return true;
    }
  }

  return false;
}
