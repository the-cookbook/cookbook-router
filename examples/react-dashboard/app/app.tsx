import {
  createMemoryRouter,
  createRouter,
  type Router,
} from '@cookbook/router';
import { RouterProvider } from '@cookbook/router-react';
import { NotFound } from './pages/not-found/page';
import { routes } from './routes';
import { ErrorPage } from './pages/error';

import './app.css';

export function createAppRouter() {
  return createRouter({ routes });
}

export function createTestRouter(
  initialEntries: readonly string[] = ['/overview']
) {
  return createMemoryRouter({ routes, initialEntries });
}

export function App({ router }: { readonly router: Router }) {
  return (
    <RouterProvider
      router={router}
      fallback={<NotFound />}
      errorFallback={ErrorPage}
      scrollBehavior="smooth"
      scrollRestoration
    />
  );
}
