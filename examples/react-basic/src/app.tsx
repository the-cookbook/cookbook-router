import { RouterProvider } from '@cookbook/router-react';
import type { Router } from '@cookbook/router';

export interface AppProps {
  readonly router: Router;
}

export function App({ router }: AppProps) {
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
