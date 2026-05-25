import { createMemoryRouter, createRouter, type Router } from '@cookbook/router';
import { RouterProvider } from '@cookbook/router-react';
import { routes } from './routes';

export interface CreateBlogRouterOptions {
  readonly basename?: string;
}

export function createAppRouter(options: CreateBlogRouterOptions = {}) {
  return createRouter({ routes, ...options });
}

export function createTestRouter(
  initialEntries: readonly string[] = ['/blog'],
  options: CreateBlogRouterOptions = {},
) {
  return createMemoryRouter({ routes, initialEntries, ...options });
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
      scrollBehavior="smooth"
      scrollRestoration
    />
  );
}
