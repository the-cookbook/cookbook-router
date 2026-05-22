import { createMemoryRouter, createRouter, type Router } from '@cookbook/router';
import { RouterProvider } from '@cookbook/router-react';
import { routes } from './routes';

export function createAppRouter() {
  return createRouter({ routes });
}

export function createTestRouter(initialEntries: readonly string[] = ['/dashboard']) {
  return createMemoryRouter({ routes, initialEntries });
}

export function App({ router }: { readonly router: Router }) {
  return (
    <RouterProvider
      router={router}
      fallback={
        <main className="shell panel">
          <h1>Not found</h1>
        </main>
      }
    />
  );
}
