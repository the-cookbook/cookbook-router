import React from 'react';
import {
  createMemoryRouter,
  createRouter,
  type Middleware,
  type Router,
} from '@cookbook/router';
import { RouterProvider } from '@cookbook/router-react';
import { routes } from './routes';
import { ErrorPage } from './pages/error';
import { auth } from './state/auth';

import './app.css';

const basePath = import.meta.env.VITE_BASE_PATH ?? '/';

const authMiddleware: Middleware = ({ route, location, redirect }) => {
  if (route.route.meta?.access === 'public' || auth.isAuthenticated()) {
    return;
  }

  return redirect(`/login?redirect=${encodeURIComponent(location.href)}`);
};

export function createAppRouter() {
  return createRouter({
    routes,
    basename: basePath,
    url: {
      arrayFormat: 'repeat',
      invalidSearch: 'recover',
      invalidHash: 'recover',
    },
  });
}

export function createTestRouter(
  initialEntries: readonly string[] = ['/overview']
) {
  return createMemoryRouter({
    routes,
    initialEntries,
    url: { arrayFormat: 'repeat', invalidSearch: 'recover' },
  });
}

export function App({ router }: { readonly router: Router }) {
  const middleware = React.useMemo(() => [authMiddleware], []);

  return (
    <RouterProvider
      router={router}
      errorFallback={ErrorPage}
      middleware={middleware}
      scrollBehavior="smooth"
      scrollRestoration
    />
  );
}
