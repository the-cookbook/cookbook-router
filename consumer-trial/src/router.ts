import {
  createMemoryRouter,
  createRouter,
  createStaticRouter,
  type Middleware,
  type Router,
  type SerializedRouterState,
} from '@cookbook/router';
import { lifecycleEvents, routes } from './routes';

export interface TrialRouterOptions {
  readonly authenticated?: boolean;
  readonly hydrationData?: SerializedRouterState;
}

export const authMiddleware =
  (options: TrialRouterOptions = {}): Middleware =>
  ({ route, redirect }) => {
    if (route.route.route.meta?.requiresAuth && !options.authenticated) {
      return redirect('/login');
    }
  };

export function createTrialRouter(options: TrialRouterOptions = {}): Router {
  return createRouter({
    routes,
    ...(options.hydrationData === undefined ? {} : { hydrationData: options.hydrationData }),
    middleware: [authMiddleware(options)],
    lifecycle: createLifecycle(),
  });
}

export function createTrialMemoryRouter(
  initialEntries: readonly string[] = ['/'],
  options: TrialRouterOptions = {},
): Router {
  return createMemoryRouter({
    routes,
    initialEntries,
    middleware: [authMiddleware(options)],
    lifecycle: createLifecycle(),
  });
}

export function createTrialStaticRouter(
  url: string | URL | Request,
  options: TrialRouterOptions = {},
): Router {
  return createStaticRouter({
    routes,
    url,
    middleware: [authMiddleware(options)],
    lifecycle: createLifecycle(),
  });
}

function createLifecycle() {
  return {
    beforeNavigate: () => {
      lifecycleEvents.push('global.beforeNavigate');
    },
    afterNavigate: () => {
      lifecycleEvents.push('global.afterNavigate');
    },
    onNavigationError: (error: unknown) => {
      lifecycleEvents.push(error instanceof Error ? `error:${error.message}` : 'error:unknown');
    },
  };
}
