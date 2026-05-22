import { RouterProvider, StaticRouterProvider } from '@cookbook/router-react';
import type { Router } from '@cookbook/router';

export interface AppProps {
  readonly router: Router;
  readonly staticRender?: boolean;
}

export function App({ router, staticRender }: AppProps) {
  const Provider = staticRender ? StaticRouterProvider : RouterProvider;
  return (
    <Provider
      router={router}
      fallback={
        <main className="shell panel">
          <h1>Not found</h1>
        </main>
      }
    />
  );
}
