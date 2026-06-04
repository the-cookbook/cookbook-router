import { createMemoryRouter, createRouter, type Middleware } from '@cookbook/router';
import { routes, lifecycleEvents } from './routes';

export const authMiddleware: Middleware = ({ route, redirect }) => {
  if (route.id === 'blocked') {
    return redirect('/');
  }
};

export function createAppRouter() {
  return createRouter({
    routes,
    middleware: [authMiddleware],
    url: {
      arrayFormat: 'repeat',
    },
    lifecycle: {
      beforeNavigate: () => {
        lifecycleEvents.push('global.beforeNavigate');
      },
      afterNavigate: () => {
        lifecycleEvents.push('global.afterNavigate');
      },
    },
  });
}

export function createTestRouter(initialEntries: readonly string[] = ['/']) {
  return createMemoryRouter({
    routes,
    initialEntries,
    middleware: [authMiddleware],
    url: {
      arrayFormat: 'repeat',
    },
    lifecycle: {
      beforeNavigate: () => {
        lifecycleEvents.push('global.beforeNavigate');
      },
      afterNavigate: () => {
        lifecycleEvents.push('global.afterNavigate');
      },
    },
  });
}
