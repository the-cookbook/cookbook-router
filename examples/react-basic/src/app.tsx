import { RouterProvider } from '@cookbook/router-react';
import type { Middleware, Router } from '@cookbook/router';

export interface AppProps {
  readonly router: Router;
  readonly middleware?: readonly Middleware[];
}

export function App({ router, middleware }: AppProps) {
  return (
    <RouterProvider
      router={router}
      {...(middleware === undefined ? {} : { middleware })}
      fallback={
        <main className="shell panel">
          <h1>Not found</h1>
        </main>
      }
    />
  );
}
